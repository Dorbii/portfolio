#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
  NINJAONE_MVP_FIXED_CAMERAS,
  createNinjaOneEnvironmentFoliageIsolationBindings,
} from "./lib/ninjaone-environment-mvp-verification.mjs";

const DEFAULT_URL =
  "http://127.0.0.1:4173/?view=ninjaone-environment";
const DEFAULT_OUTPUT =
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/runtime-capture-r1/evidence.json";
const DEFAULT_VIEWPORT = Object.freeze({ height: 900, width: 1440 });
const CAMERA_TOLERANCE = 1e-8;
const FOLIAGE_ISOLATION_PRODUCER_ID =
  "ninjaone-environment-foliage-isolation-browser-capture-r1";

function usage() {
  return [
    "Usage: node scripts/capture-ninjaone-environment-mvp.mjs [options]",
    "",
    "Options:",
    "  --browser-executable <file>  Chrome/Edge executable (auto-detected by default).",
    "  --artifact-prefix <name>      Foliage-isolation PNG prefix.",
    "  --cdp <url>                  Attach to an existing browser CDP endpoint.",
    "  --output <file>              Evidence JSON output path.",
    "  --proof-dir <directory>      PNG output directory (defaults beside JSON).",
    "  --root <directory>           Repository root (default: current directory).",
    "  --url <url>                  Running preview URL.",
    "  --viewport <width>x<height>  Browser viewport (default: 1440x900).",
  ].join("\n");
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value.`);
    result[argument.slice(2)] = value;
    index += 1;
  }
  return result;
}

function parseViewport(value = `${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height}`) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error("--viewport must use <width>x<height>.");
  const viewport = { width: Number(match[1]), height: Number(match[2]) };
  if (
    !Number.isSafeInteger(viewport.width)
    || !Number.isSafeInteger(viewport.height)
    || viewport.width < 800
    || viewport.height < 600
  ) throw new Error("Capture viewport must be at least 800x600.");
  return Object.freeze(viewport);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}

function classifyBrowserDiagnostics(consoleErrors, networkErrors, automationDiagnostics) {
  const navigationDiagnostics = networkErrors.filter(({ url }) => {
    try {
      return new URL(url).pathname === "/favicon.ico";
    } catch {
      return false;
    }
  });
  const applicationNetworkErrors = networkErrors.filter(
    (entry) => !navigationDiagnostics.includes(entry),
  );
  const applicationConsoleErrors = [...consoleErrors];
  let removableResourceErrors = navigationDiagnostics.length;
  for (let index = applicationConsoleErrors.length - 1; index >= 0; index -= 1) {
    if (
      removableResourceErrors > 0
      && applicationConsoleErrors[index]
        === "Failed to load resource: the server responded with a status of 404 (Not Found)"
    ) {
      applicationConsoleErrors.splice(index, 1);
      removableResourceErrors -= 1;
    }
  }
  for (const diagnostic of navigationDiagnostics) {
    automationDiagnostics.push(Object.freeze({
      kind: "browser-navigation-favicon",
      status: diagnostic.status,
      url: diagnostic.url,
    }));
  }
  return Object.freeze({
    consoleErrors: Object.freeze(applicationConsoleErrors),
    networkErrors: Object.freeze(applicationNetworkErrors),
  });
}

class CdpConnection {
  constructor(socket) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.socket = socket;
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(typeof data === "string" ? data : data.toString());
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("Browser CDP connection closed."));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpConnection(socket);
  }

  close() {
    this.socket.close();
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

function browserCandidates() {
  if (process.platform === "win32") {
    return [
      path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
      path.join(process.env.PROGRAMFILES ?? "", "Microsoft/Edge/Application/msedge.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft/Edge/Application/msedge.exe"),
    ];
  }
  return [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

async function firstAccessible(paths) {
  for (const candidate of paths.filter(Boolean)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through deterministic candidates.
    }
  }
  return null;
}

async function waitForFile(file, timeoutMilliseconds = 15_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    try {
      return await readFile(file, "utf8");
    } catch {
      await delay(50);
    }
  }
  throw new Error(`Timed out waiting for ${file}.`);
}

async function launchBrowser({ executable, viewport }) {
  const profile = await mkdtemp(path.join(os.tmpdir(), "ninjaone-mvp-capture-"));
  const child = spawn(executable, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const activePortFile = path.join(profile, "DevToolsActivePort");
  try {
    const [port, browserPath] = (await waitForFile(activePortFile)).trim().split(/\r?\n/);
    return {
      child,
      profile,
      websocketUrl: `ws://127.0.0.1:${port}${browserPath}`,
    };
  } catch (error) {
    child.kill();
    await rm(profile, { force: true, recursive: true });
    throw error;
  }
}

async function resolveCdpWebSocket(cdpUrl) {
  const response = await fetch(new URL("/json/version", cdpUrl));
  if (!response.ok) throw new Error(`CDP discovery failed with ${response.status}.`);
  const version = await response.json();
  if (typeof version.webSocketDebuggerUrl !== "string") {
    throw new Error("CDP discovery did not return a browser WebSocket URL.");
  }
  return version.webSocketDebuggerUrl;
}

async function evaluate(connection, sessionId, expression, awaitPromise = true) {
  const result = await connection.send("Runtime.evaluate", {
    awaitPromise,
    expression,
    returnByValue: true,
    userGesture: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text
      ?? "Browser evaluation failed.");
  }
  return result.result?.value;
}

const RUNTIME_SAMPLE_EXPRESSION = `(() => {
  const native = document.querySelector('.ninjaone-environment-native-detail');
  const water = document.querySelector('canvas[data-layer="ocean"]');
  if (!native || !water) return null;
  return {
    cohortPhase: native.dataset.environmentNativeCohortPhase,
    nativeState: native.dataset.environmentNativeState,
    nativeVisible: native.dataset.environmentNativeVisible === 'true',
    supplementalState: native.dataset.environmentNativeSupplementalState,
    terrainTileCount: Number(native.dataset.environmentNativeTileCount ?? 0),
    waterRenderState: water.dataset.renderState,
  };
})()`;

const CAMERA_EXPRESSION = `(() => {
  const viewport = document.querySelector('.career-world__viewport');
  if (!viewport) return null;
  return {
    origin: viewport.dataset.cameraOrigin.split(',').map(Number),
    span: viewport.dataset.cameraSpan.split(',').map(Number),
    rect: (() => {
      const value = viewport.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    })(),
  };
})()`;

async function waitFor(connection, sessionId, predicate, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await predicate();
    if (last) return last;
    await delay(20);
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(last)}.`);
}

function cameraMatches(actual, expected) {
  return actual
    && actual.origin.every((value, axis) => (
      Math.abs(value - expected.origin[axis]) <= CAMERA_TOLERANCE
    ))
    && actual.span.every((value, axis) => (
      Math.abs(value - expected.span[axis]) <= CAMERA_TOLERANCE
    ));
}

async function readCamera(connection, sessionId) {
  return evaluate(connection, sessionId, CAMERA_EXPRESSION);
}

async function dispatchWheel(connection, sessionId, x, y, deltaY) {
  await connection.send("Input.dispatchMouseEvent", {
    deltaX: 0,
    deltaY,
    type: "mouseWheel",
    x,
    y,
  }, sessionId);
  await delay(35);
}

async function setCameraSpan(connection, sessionId, targetSpan, anchor) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const camera = await readCamera(connection, sessionId);
    const current = camera.span[0];
    if (Math.abs(current - targetSpan) <= CAMERA_TOLERANCE) return camera;
    const requestedScale = targetSpan / current;
    const scale = Math.min(1.28, Math.max(1 / 1.28, requestedScale));
    const deltaY = Math.log(scale) / 0.00135;
    await dispatchWheel(
      connection,
      sessionId,
      camera.rect.x + camera.rect.width * anchor[0],
      camera.rect.y + camera.rect.height * anchor[1],
      deltaY,
    );
  }
  throw new Error(`Unable to reach camera span ${targetSpan}.`);
}

async function panCamera(connection, sessionId, targetOrigin) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const camera = await readCamera(connection, sessionId);
    const remaining = camera.origin.map((value, axis) => value - targetOrigin[axis]);
    if (remaining.every((value) => Math.abs(value) <= CAMERA_TOLERANCE)) return camera;
    const maximumX = camera.rect.width * 0.35;
    const maximumY = camera.rect.height * 0.35;
    const deltaX = Math.min(maximumX, Math.max(
      -maximumX,
      remaining[0] / camera.span[0] * camera.rect.width,
    ));
    const deltaY = Math.min(maximumY, Math.max(
      -maximumY,
      remaining[1] / camera.span[1] * camera.rect.height,
    ));
    const x = camera.rect.x + camera.rect.width * 0.5;
    const y = camera.rect.y + camera.rect.height * 0.5;
    await connection.send("Input.dispatchMouseEvent", {
      button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x, y,
    }, sessionId);
    await connection.send("Input.dispatchMouseEvent", {
      button: "left", buttons: 1, type: "mouseMoved", x: x + deltaX, y: y + deltaY,
    }, sessionId);
    await connection.send("Input.dispatchMouseEvent", {
      button: "left", buttons: 0, clickCount: 1, type: "mouseReleased",
      x: x + deltaX, y: y + deltaY,
    }, sessionId);
    await delay(40);
  }
  throw new Error(`Unable to reach camera origin ${targetOrigin.join(",")}.`);
}

async function setCamera(connection, sessionId, target) {
  const initial = await readCamera(connection, sessionId);
  const targetCenter = target.origin.map((value, axis) => value + target.span[axis] * 0.5);
  const anchor = targetCenter.map((value, axis) => {
    const denominator = initial.span[axis] - target.span[axis];
    if (Math.abs(denominator) < 1e-12) return 0.5;
    return Math.min(0.98, Math.max(
      0.02,
      (value - initial.origin[axis] - target.span[axis] * 0.5) / denominator,
    ));
  });
  await setCameraSpan(connection, sessionId, target.span[0], anchor);
  await panCamera(connection, sessionId, target.origin);
  return waitFor(
    connection,
    sessionId,
    async () => {
      const camera = await readCamera(connection, sessionId);
      return cameraMatches(camera, target) ? camera : null;
    },
    `camera ${JSON.stringify(target)}`,
  );
}

async function runtimeSample(connection, sessionId) {
  const sample = await evaluate(connection, sessionId, RUNTIME_SAMPLE_EXPRESSION);
  if (!sample) throw new Error("Runtime telemetry DOM is unavailable.");
  return sample;
}

async function waitForNativeReady(connection, sessionId, expectedTerrainTileCount = 4) {
  return waitFor(connection, sessionId, async () => {
    const sample = await runtimeSample(connection, sessionId);
    return sample.nativeState === "ready"
      && sample.nativeVisible === true
      && sample.cohortPhase === "active"
      && sample.terrainTileCount === expectedTerrainTileCount
      && sample.waterRenderState === "ready"
      && (sample.supplementalState === "ready" || sample.supplementalState === "idle")
      ? sample
      : null;
  }, "ready native cohort", 30_000);
}

async function screenshot(connection, sessionId, file, clip) {
  const result = await connection.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    clip,
    format: "png",
    fromSurface: true,
  }, sessionId);
  await writeFile(file, Buffer.from(result.data, "base64"));
}

function relativePath(fromDirectory, file) {
  return path.relative(fromDirectory, file).replaceAll(path.sep, "/");
}

async function navigate(connection, sessionId, url) {
  await connection.send("Page.navigate", { url }, sessionId);
  await waitFor(connection, sessionId, async () => (
    evaluate(connection, sessionId, `Boolean(document.querySelector('.career-world__viewport'))`)
  ), "environment preview DOM", 30_000);
  await waitFor(connection, sessionId, async () => {
    const sample = await runtimeSample(connection, sessionId);
    return sample.waterTextureBudgetBytes > 0 ? sample : null;
  }, "water telemetry", 30_000);
}

async function foliageRects(connection, sessionId, clip) {
  return evaluate(connection, sessionId, `(() => {
    const clip = ${JSON.stringify(clip)};
    return [...document.querySelectorAll('[data-environment-foliage-group]')]
      .map((node) => ({ id: node.dataset.environmentFoliageGroup, rect: node.getBoundingClientRect() }))
      .map(({ id, rect }) => {
        const x = Math.max(0, Math.floor(rect.x - clip.x - 10));
        const y = Math.max(0, Math.floor(rect.y - clip.y - 10));
        return {
          id,
          x,
          y,
          width: Math.min(clip.width - x, Math.ceil(rect.width + 20)),
          height: Math.min(clip.height - y, Math.ceil(rect.height + 20)),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0);
  })()`);
}

async function writeMotionMask(file, clip, rectangles) {
  const rects = rectangles.map(({ x, y, width, height }) => (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>`
  )).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${clip.width}" height="${clip.height}">${rects}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function writeFoliageCrops({
  frames,
  outputDirectory,
  proofDirectory,
  rectangles,
}) {
  const crops = [];
  for (const frame of frames) {
    for (const rectangle of rectangles) {
      const suffix = rectangle.id.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
      const file = path.join(
        proofDirectory,
        `${frame.id}-${suffix}-crop.png`,
      );
      await sharp(frame.file).extract({
        height: rectangle.height,
        left: rectangle.x,
        top: rectangle.y,
        width: rectangle.width,
      }).png().toFile(file);
      crops.push(Object.freeze({
        bounds: Object.freeze({
          height: rectangle.height,
          width: rectangle.width,
          x: rectangle.x,
          y: rectangle.y,
        }),
        frameId: frame.id,
        groupId: rectangle.id,
        imagePath: relativePath(outputDirectory, file),
        resampling: "none-native-screenshot-pixels",
      }));
    }
  }
  return Object.freeze(crops);
}

async function maskedDiffMetrics(firstFile, secondFile, maskFile) {
  const [first, second, mask] = await Promise.all([
    sharp(firstFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(secondFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(maskFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const dimensions = [first, second, mask].map(({ info }) => (
    `${info.width}x${info.height}`
  ));
  if (new Set(dimensions).size !== 1) throw new Error("Motion diff dimensions differ.");
  let changedInsideMask = 0;
  let changedOutsideMask = 0;
  let changedPixels = 0;
  let maskPixels = 0;
  for (let index = 0; index < first.data.length; index += 4) {
    const insideMask = mask.data[index + 3] >= 16;
    if (insideMask) maskPixels += 1;
    const difference = (
      Math.abs(first.data[index] - second.data[index])
      + Math.abs(first.data[index + 1] - second.data[index + 1])
      + Math.abs(first.data[index + 2] - second.data[index + 2])
    ) / 3;
    if (difference < 6) continue;
    changedPixels += 1;
    if (insideMask) changedInsideMask += 1;
    else changedOutsideMask += 1;
  }
  const pixels = first.info.width * first.info.height;
  return Object.freeze({
    changedInsideMask,
    changedOutsideMask,
    changedPixelPct: changedPixels / pixels * 100,
    changedPixels,
    confinementPct: changedPixels === 0 ? 0 : changedInsideMask / changedPixels * 100,
    maskCoveragePct: maskPixels / pixels * 100,
    totalPixels: pixels,
  });
}

async function forceFoliageProgress(connection, sessionId, progress) {
  return evaluate(connection, sessionId, `(() => {
    const progress = ${progress};
    const nodes = [...document.querySelectorAll(
      '.ninjaone-environment-native-detail__canopy-sway'
    )];
    for (const node of nodes) {
      const style = getComputedStyle(node);
      const bend = style.getPropertyValue(
        progress === 0 ? '--ninjaone-foliage-bend-start' : '--ninjaone-foliage-bend-peak'
      ).trim();
      const lag = style.getPropertyValue(
        progress === 0 ? '--ninjaone-foliage-lag-start' : '--ninjaone-foliage-lag-peak'
      ).trim();
      node.dataset.ninjaoneCaptureExpectedTransform = 'rotate(' + bend + ') skewX(' + lag + ')';
      node.style.setProperty('animation', 'none', 'important');
      node.style.setProperty(
        'transform', node.dataset.ninjaoneCaptureExpectedTransform, 'important'
      );
    }
    void document.documentElement.getBoundingClientRect();
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve(nodes.map((node) => ({
        animation: getComputedStyle(node).animationName,
        appliedTransform: node.style.getPropertyValue('transform'),
        instanceId: node.dataset.environmentFoliageInstance,
        opacity: getComputedStyle(node).opacity,
        progress,
        transform: getComputedStyle(node).transform,
        transformOrigin: getComputedStyle(node).transformOrigin,
        expectedTransform: node.dataset.ninjaoneCaptureExpectedTransform,
      })));
    })));
  })()`);
}

async function readFoliageNodeStates(connection, sessionId) {
  return evaluate(connection, sessionId, `(() => (
    [...document.querySelectorAll('.ninjaone-environment-native-detail__canopy-sway')]
      .map((node) => ({
        animation: getComputedStyle(node).animationName,
        instanceId: node.dataset.environmentFoliageInstance,
        opacity: getComputedStyle(node).opacity,
        transform: getComputedStyle(node).transform,
        transformOrigin: getComputedStyle(node).transformOrigin,
      }))
  ))()`);
}

async function captureFoliageIsolationProof({
  artifactPrefix,
  connection,
  outputDirectory,
  proofDirectory,
  sessionId,
  viewport,
}) {
  if (viewport.width !== 1440 || viewport.height !== 900) {
    throw new Error("Foliage isolation proof requires the fixed 1440x900 viewport.");
  }
  await setCamera(connection, sessionId, NINJAONE_MVP_FIXED_CAMERAS.C2);
  await waitForNativeReady(connection, sessionId);
  await evaluate(connection, sessionId, `(() => {
    const style = document.createElement('style');
    style.dataset.ninjaoneFoliageIsolation = 'true';
    style.textContent = '* { animation-play-state: paused !important; } '
      + '.ninjaone-environment-native-detail__canopy-sway { animation-play-state: running !important; } '
      + '.ninjaone-environment-proof__hud { display: none !important; } '
      + '.career-world__interface { display: none !important; } '
      + '.career-world__header, .career-world__footer { visibility: hidden !important; } '
      + '[data-environment-layer="wildlife"] { display: none !important; } '
      + '[data-environment-seam-integration-state] { visibility: hidden !important; } '
      + 'canvas[data-layer="ocean"] { visibility: hidden !important; }';
    document.head.append(style);
  })()`);
  const clip = Object.freeze({
    height: viewport.height,
    scale: 1,
    width: viewport.width,
    x: 0,
    y: 0,
  });
  const normalFrames = [];
  const normalStates = [];
  for (let index = 0; index < 3; index += 1) {
    if (index > 0) await delay(650);
    const file = path.join(
      proofDirectory,
      `${artifactPrefix}-normal-${index + 1}.png`,
    );
    await screenshot(connection, sessionId, file, clip);
    normalFrames.push(file);
    normalStates.push(await readFoliageNodeStates(connection, sessionId));
  }
  const rectangles = await foliageRects(connection, sessionId, clip);
  const maskFile = path.join(
    proofDirectory,
    `${artifactPrefix}-mask.png`,
  );
  await writeMotionMask(maskFile, clip, rectangles);
  const normalMotionDiff = await maskedDiffMetrics(
    normalFrames[0], normalFrames[2], maskFile,
  );
  const forcedStates = [];
  for (const [id, progress] of [["0", 0], ["37", 0.37]]) {
    const nodeStates = await forceFoliageProgress(connection, sessionId, progress);
    const file = path.join(
      proofDirectory,
      `${artifactPrefix}-forced-${id}.png`,
    );
    await screenshot(connection, sessionId, file, clip);
    forcedStates.push(Object.freeze({
      imagePath: relativePath(outputDirectory, file),
      nodeStates: Object.freeze(nodeStates),
      progress,
    }));
  }
  const forcedDiff = await maskedDiffMetrics(
    path.resolve(outputDirectory, forcedStates[0].imagePath),
    path.resolve(outputDirectory, forcedStates[1].imagePath),
    maskFile,
  );
  const crops = await writeFoliageCrops({
    frames: [
      ...normalFrames.map((file, index) => ({
        file,
        id: `${artifactPrefix}-normal-${index + 1}`,
      })),
      ...forcedStates.map((state) => ({
        file: path.resolve(outputDirectory, state.imagePath),
        id: `${artifactPrefix}-forced-${Math.round(state.progress * 100)}`,
      })),
    ],
    outputDirectory,
    proofDirectory,
    rectangles,
  });
  const [camera, telemetry] = await Promise.all([
    readCamera(connection, sessionId),
    evaluate(connection, sessionId, `(() => {
       const native = document.querySelector('.ninjaone-environment-native-detail');
       const foliage = document.querySelector('.ninjaone-environment-foliage-r3');
       const seams = document.querySelector('[data-environment-seam-integration-state]');
       if (!native || !foliage || !seams) return null;
      const csv = (value) => value ? value.split(',').filter(Boolean) : [];
      const number = (value) => Number.isFinite(Number(value)) ? Number(value) : -1;
       const terrainNodes = [...native.querySelectorAll('image[data-environment-native-tile]')];
       const foliageNodes = [...foliage.querySelectorAll('image[data-shared-resource]')];
       const seamNodes = [
         ...seams.querySelectorAll('image[data-environment-seam-integration-resource]'),
         ...seams.querySelectorAll('path[data-environment-seam-integration-tonal-resource]'),
       ];
       return {
         applicationOwnedDecodedBytes: number(
           native.dataset.environmentNativeApplicationOwnedDecodedBytes
         ),
         applicationOwnedResourceIds: csv(
           native.dataset.environmentNativeApplicationOwnedResourceIds
         ).sort(),
        cohortEpoch: number(foliage.dataset.environmentFoliageCohortEpoch),
        cohortKey: foliage.dataset.environmentFoliageCohortKey,
        foliageInstanceCount: number(foliage.dataset.environmentFoliageInstanceCount),
        foliageMountedNodeCount: foliageNodes.length,
        foliageMountedResourceIds: [...new Set(
          foliageNodes.map((node) => node.dataset.sharedResource)
        )].sort(),
        foliageSelectedDecodedBytes: number(
          foliage.dataset.environmentFoliageSelectedDecodedBytes
        ),
        foliageSelectedNodeCount: number(
          foliage.dataset.environmentFoliageSelectedImageNodeCount
        ),
        foliageSelectedResourceIds: csv(
          foliage.dataset.environmentFoliageSelectedResourceIds
        ).sort(),
        foliageState: foliage.dataset.environmentFoliageState,
        foliageVisible: foliage.dataset.environmentFoliageVisible === 'true',
        legacyFoliageNodeCount: document.querySelectorAll(
          '[data-environment-layer="shared-animated-foliage"], .ninjaone-environment-proof__shared-foliage'
        ).length,
         nativeState: native.dataset.environmentNativeState,
         nativeVisible: native.dataset.environmentNativeVisible === 'true',
         seamDecodedBytes: number(native.dataset.environmentNativeSeamDecodedBytes),
         seamNodeCount: seamNodes.length,
         seamResourceIds: [...new Set(seamNodes.map((node) => (
           node.dataset.environmentSeamIntegrationResource
             ?? node.dataset.environmentSeamIntegrationTonalResource
         )))].sort(),
         selectedSupplementalResourceIds: csv(
           native.dataset.environmentNativeSupplementalResourceIds
         ).sort(),
        terrainDecodedBytes: number(
          native.dataset.environmentNativeTerrainMountedDecodedBytes
        ),
        terrainIds: terrainNodes.map(
          (node) => node.dataset.environmentNativeTile
        ).sort(),
        terrainNodeCount: terrainNodes.length,
      };
    })()`),
  ]);
  if (!telemetry) throw new Error("Foliage isolation telemetry is unavailable.");
  return Object.freeze({
    clip,
    crops,
    fixedCamera: Object.freeze({ origin: camera.origin, span: camera.span }),
    forcedDiff,
    forcedStates: Object.freeze(forcedStates),
    isolation: Object.freeze({
      animation: "all paused except canopy sway during normal trio; disabled during forced states",
      cameraPreserved: true,
      hud: "proof HUD and world interface display:none; page header/footer visibility:hidden",
      seams: "visibility:hidden!important",
      terrain: "preserved",
      water: "visibility:hidden!important",
      wildlife: "display:none!important",
    }),
    maskPath: relativePath(outputDirectory, maskFile),
    normalFrames: Object.freeze(normalFrames.map((file) => (
      relativePath(outputDirectory, file)
    ))),
    normalMotionDiff,
    normalStates: Object.freeze(normalStates),
    rectangles: Object.freeze(rectangles),
    runtime: Object.freeze(telemetry),
  });
}

export async function captureNinjaOneEnvironmentMvp(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const output = path.resolve(root, options.output ?? DEFAULT_OUTPUT);
  const outputDirectory = path.dirname(output);
  const proofDirectory = path.resolve(
    root,
    options["proof-dir"] ?? outputDirectory,
  );
  const viewport = parseViewport(options.viewport);
  const url = options.url ?? DEFAULT_URL;
  const mode = "foliage-isolation";
  const artifactPrefix = options["artifact-prefix"] ?? "foliage-isolated";
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(artifactPrefix)) {
    throw new Error("--artifact-prefix must be a bounded lowercase filename stem.");
  }
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(proofDirectory, { recursive: true });

  let launched = null;
  let connection = null;
  let targetId = null;
  try {
    const websocketUrl = options.cdp
      ? await resolveCdpWebSocket(options.cdp)
      : await (async () => {
        const executable = options["browser-executable"]
          ?? await firstAccessible(browserCandidates());
        if (!executable) throw new Error("Chrome/Edge executable not found.");
        launched = await launchBrowser({ executable, viewport });
        return launched.websocketUrl;
      })();
    connection = await CdpConnection.connect(websocketUrl);
    ({ targetId } = await connection.send("Target.createTarget", { url: "about:blank" }));
    const { sessionId } = await connection.send("Target.attachToTarget", {
      flatten: true,
      targetId,
    });
    await Promise.all([
      connection.send("Page.enable", {}, sessionId),
      connection.send("Runtime.enable", {}, sessionId),
      connection.send("Debugger.enable", {}, sessionId),
      connection.send("Log.enable", {}, sessionId),
      connection.send("Network.enable", {}, sessionId),
      connection.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      }, sessionId),
      connection.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1,
        height: viewport.height,
        mobile: false,
        width: viewport.width,
      }, sessionId),
    ]);
    const automationDiagnostics = [];
    const consoleErrors = [];
    const networkErrors = [];
    const stopEvents = connection.on((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Runtime.exceptionThrown") {
        consoleErrors.push(message.params.exceptionDetails?.text ?? "runtime exception");
      }
      if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
        const entry = message.params.entry;
        if (entry.text.includes("Unable to preventDefault inside passive event listener")) {
          automationDiagnostics.push(Object.freeze({
            kind: "trusted-wheel-passive-listener",
            text: entry.text,
          }));
        } else {
          consoleErrors.push(entry.text);
        }
      }
      if (
        message.method === "Runtime.consoleAPICalled"
        && message.params.type === "error"
      ) consoleErrors.push(message.params.args?.map((argument) => (
        argument.value ?? argument.description ?? argument.type
      )).join(" ") || "console.error");
      if (
        message.method === "Network.responseReceived"
        && message.params.response?.status >= 400
      ) {
        const response = message.params.response;
        networkErrors.push(Object.freeze({
          status: response.status,
          type: message.params.type,
          url: response.url,
        }));
      }
    });
    await navigate(connection, sessionId, url);

    const foliageProof = await captureFoliageIsolationProof({
        artifactPrefix,
        connection,
        outputDirectory,
        proofDirectory,
        sessionId,
        viewport,
      });
      stopEvents();
      const diagnostics = classifyBrowserDiagnostics(
        consoleErrors,
        networkErrors,
        automationDiagnostics,
      );
      const evidence = Object.freeze({
        bindings: await createNinjaOneEnvironmentFoliageIsolationBindings(root),
        consoleErrors: diagnostics.consoleErrors,
        foliageProof,
        networkErrors: diagnostics.networkErrors,
        producer: Object.freeze({
          automation: "browser-dom-screenshot",
          automationDiagnostics: Object.freeze(automationDiagnostics),
          capturedAt: new Date().toISOString(),
          id: FOLIAGE_ISOLATION_PRODUCER_ID,
          mode,
          scriptPath: NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
          scriptSha256: await sha256(path.join(
            root,
            NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
          )),
          url,
          viewport,
        }),
        schemaVersion: 1,
      });
      await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
    return Object.freeze({ evidence, output, proofDirectory });

  } finally {
    if (connection && targetId) {
      try { await connection.send("Target.closeTarget", { targetId }); } catch {}
    }
    if (connection) {
      if (launched) {
        try { await connection.send("Browser.close"); } catch {}
      }
      connection.close();
    }
    if (launched) {
      if (launched.child.exitCode === null) launched.child.kill();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await delay(150 * (attempt + 1));
          await rm(launched.profile, { force: true, recursive: true });
          break;
        } catch {
          // Chrome can briefly retain first-party-set journals on Windows.
        }
      }
    }
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  try {
    const result = await captureNinjaOneEnvironmentMvp(options);
    process.stdout.write(`${JSON.stringify({
      output: result.output,
      proofDirectory: result.proofDirectory,
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
