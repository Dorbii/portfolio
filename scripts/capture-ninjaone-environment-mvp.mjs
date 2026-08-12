#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  NINJAONE_MVP_CAPTURE_PRODUCER_ID,
  NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
  NINJAONE_MVP_CHECKPOINT_REFERENCES,
  NINJAONE_MVP_FIXED_CAMERAS,
  NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION,
  NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION,
  NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN,
  NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES,
  NINJAONE_MVP_HYDROLOGY_FEATURE_ISOLATION,
  NINJAONE_MVP_HYDROLOGY_OCCLUSION_ISOLATION,
  NINJAONE_MVP_LIMITS,
  NINJAONE_MVP_LOD_SEQUENCE,
  NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION,
  NINJAONE_MVP_WATER_TEXTURE_LIMITS,
  createNinjaOneEnvironmentCaptureBindings,
  createNinjaOneEnvironmentFoliageIsolationBindings,
  deriveNinjaOneHydrologyMotionContract,
} from "./lib/ninjaone-environment-mvp-verification.mjs";

const DEFAULT_URL =
  "http://127.0.0.1:4173/?view=ninjaone-environment";
const DEFAULT_OUTPUT =
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/runtime-capture-r1/evidence.json";
const DEFAULT_VIEWPORT = Object.freeze({ height: 900, width: 1440 });
const CAMERA_TOLERANCE = 1e-8;
const NATIVE_DECODED_BUDGET_BYTES = NINJAONE_MVP_LIMITS.maximumDecodedBytes;
const WATER_TEXTURE_BUDGET_BYTES = NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes;
const WATER_TEXTURE_CONSTRUCTOR_SHARED_BYTES =
  NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes;
const WATER_TEXTURE_TRANSIENT_PEAK_BYTES =
  NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes;
const WATER_TEXTURE_DETAIL_WITHOUT_HYDROLOGY_BYTES =
  NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes;
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
    "  --mode <full|foliage-isolation> Capture contract (default: full).",
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

function waitForCdpEvent(connection, predicate, label, timeout = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`Timed out waiting for CDP event ${label}.`));
    }, timeout);
    const stop = connection.on((message) => {
      if (!predicate(message)) return;
      clearTimeout(timer);
      stop();
      resolve(message);
    });
  });
}

async function createRequiredImageRequestGate(connection, sessionId) {
  const pausedRequests = new Map();
  const activeContinuations = new Set();
  let releasing = false;
  let releaseError = null;
  const continueRequest = (requestId) => {
    const continuation = connection.send("Fetch.continueRequest", { requestId }, sessionId)
      .catch((error) => {
        releaseError ??= error;
      })
      .finally(() => activeContinuations.delete(continuation));
    activeContinuations.add(continuation);
  };
  const stop = connection.on((message) => {
    if (
      message.sessionId !== sessionId
      || message.method !== "Fetch.requestPaused"
      || message.params.resourceType !== "Image"
    ) return;
    const { requestId, request } = message.params;
    pausedRequests.set(requestId, request.url);
    if (releasing) continueRequest(requestId);
  });
  await connection.send("Fetch.enable", {
    patterns: [
      { requestStage: "Request", resourceType: "Image", urlPattern: "*ninjaone*coast*" },
      { requestStage: "Request", resourceType: "Image", urlPattern: "*ninjaone*seam*" },
    ],
  }, sessionId);
  return Object.freeze({
    async release() {
      releasing = true;
      for (const requestId of pausedRequests.keys()) continueRequest(requestId);
      await delay(40);
      await Promise.all([...activeContinuations]);
      await connection.send("Fetch.disable", {}, sessionId);
      stop();
      if (releaseError) throw releaseError;
    },
    requestPaths() {
      return [...new Set([...pausedRequests.values()].map((value) => (
        new URL(value).pathname
      )))].sort();
    },
    async waitForRequest() {
      return waitFor(
        connection,
        sessionId,
        async () => pausedRequests.size > 0 ? pausedRequests.size : null,
        "required presentation image request",
        10_000,
      );
    },
  });
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

async function evaluateOnCallFrame(connection, sessionId, callFrameId, expression) {
  const result = await connection.send("Debugger.evaluateOnCallFrame", {
    callFrameId,
    expression,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text
      ?? "Paused browser evaluation failed.");
  }
  return result.result?.value;
}

const RUNTIME_SAMPLE_EXPRESSION = `(() => {
  const viewport = document.querySelector('.career-world__viewport');
  const native = document.querySelector('.ninjaone-environment-native-detail');
  const foliage = document.querySelector('.ninjaone-environment-foliage-r3');
  const seams = document.querySelector('[data-environment-seam-integration-state]');
  const coast = document.querySelector('[data-environment-coast-transition-state]');
  const water = document.querySelector(
    'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]'
  );
  if (!viewport || !native || !foliage || !seams || !water) return null;
  const csv = (value) => value ? value.split(',').filter(Boolean) : [];
  const jsonArray = (value) => {
    try {
      const parsed = JSON.parse(value ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : -1;
  const boolean = (value) => value === 'true';
  const cameraOrigin = (viewport.dataset.cameraOrigin ?? '').split(',').map(Number);
  const cameraSpan = (viewport.dataset.cameraSpan ?? '').split(',').map(Number);
  const validCamera = cameraOrigin.length === 2
    && cameraSpan.length === 2
    && cameraOrigin.every(Number.isFinite)
    && cameraSpan.every((value) => Number.isFinite(value) && value > 0);
  const waterHydrologyRequested = validCamera
    && Math.max(...cameraSpan) <= ${NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN}
    && cameraOrigin[0] < 0.375
    && cameraOrigin[0] + cameraSpan[0] > 0.125
    && cameraOrigin[1] < ${1 / 3}
    && cameraOrigin[1] + cameraSpan[1] > 0;
  const terrainNodes = [...native.querySelectorAll('image[data-environment-native-tile]')]
    .map((node) => ({
      kind: 'terrain',
      nodeId: 'terrain:' + node.dataset.environmentNativeTile,
      resourceId: node.dataset.environmentNativeTile,
    }));
  const foliageNodes = [...foliage.querySelectorAll('image[data-shared-resource]')]
    .map((node, index) => ({
      kind: 'supplemental',
      nodeId: 'foliage:' + node.dataset.sharedResource + ':' + index,
      resourceId: node.dataset.sharedResource,
    }));
  const seamImageNodes = [
    ...seams.querySelectorAll('image[data-environment-seam-integration-resource]'),
  ].map((node, index) => ({
    kind: 'supplemental',
    nodeId: 'seam:image:' + node.dataset.environmentSeamIntegrationResource + ':' + index,
    resourceId: node.dataset.environmentSeamIntegrationResource,
  }));
  const seamTonalNodes = [
    ...seams.querySelectorAll('path[data-environment-seam-integration-tonal-resource]'),
  ].map((node, index) => ({
    kind: 'supplemental',
    nodeId: 'seam:tonal:' + node.dataset.environmentSeamIntegrationTonalResource + ':' + index,
    resourceId: node.dataset.environmentSeamIntegrationTonalResource,
  }));
  const coastImageNodes = coast ? [
    ...coast.querySelectorAll('image[data-environment-coast-transition-resource]'),
  ].map((node, index) => ({
    kind: 'supplemental',
    nodeId: 'coast:image:' + node.dataset.environmentCoastTransitionResource + ':' + index,
    resourceId: node.dataset.environmentCoastTransitionResource,
  })) : [];
  const supplementalNodes = [
    ...foliageNodes,
    ...seamImageNodes,
    ...seamTonalNodes,
    ...coastImageNodes,
  ];
  const mountedNodes = [...terrainNodes, ...supplementalNodes];
  const mountedResourceIds = [...new Set(mountedNodes.map(({ resourceId }) => resourceId))]
    .sort();
  const lowerDetailGroup = native.parentElement;
  const lowerDetailTerrain = lowerDetailGroup?.querySelector(
    'image[data-environment-layer="terrain-geology"][data-environment-source]'
  );
  const lowerDetailAvailable = Boolean(
    lowerDetailTerrain
    && Number(lowerDetailGroup?.dataset.environmentOpacity ?? 0) > 0
    && lowerDetailTerrain.getAttribute('href')
    && getComputedStyle(lowerDetailTerrain).display !== 'none'
    && getComputedStyle(lowerDetailTerrain).visibility !== 'hidden'
  );
  const selectedSupplementalResourceIds = csv(
    native.dataset.environmentNativeSupplementalResourceIds
  );
  const foliageState = foliage.dataset.environmentFoliageState;
  const seamState = seams.dataset.environmentSeamIntegrationState;
  const coastState = coast?.dataset.environmentCoastTransitionState ?? 'idle';
  const supplementalStates = [foliageState, seamState, coastState]
    .filter((state) => state !== 'idle');
  const mountedSupplementalIds = [...new Set(
    supplementalNodes.map(({ resourceId }) => resourceId)
  )];
  const supplementalState = selectedSupplementalResourceIds.length === 0
    ? 'idle'
    : supplementalStates.includes('error')
      ? 'error'
      : supplementalStates.length > 0
        && supplementalStates.every((state) => state === 'ready')
        && selectedSupplementalResourceIds.every((id) => mountedSupplementalIds.includes(id))
        ? 'ready'
        : 'loading';
  const applicationOwnedDecodedBytes = number(
    native.dataset.environmentNativeApplicationOwnedDecodedBytes
  );
  const waterHydrologyAssetBytes = number(water.dataset.hydrologyAssetBytes ?? 0);
  const lowerWaterSurfaces = [...document.querySelectorAll('canvas[data-layer="water-surface"]')]
    .filter((node) => node !== water);
  const lowerWaterVisibleCount = lowerWaterSurfaces.filter((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) > 0
      && rect.width > 0
      && rect.height > 0;
  }).length;
  const nativeVisible = boolean(native.dataset.environmentNativeVisible);
  const foliageSelectedIds = csv(foliage.dataset.environmentFoliageSelectedResourceIds);
  const foliageMountedIds = csv(foliage.dataset.environmentFoliageMountedResourceIds);
  const seamSelectedIds = csv(seams.dataset.environmentSeamIntegrationResourceIds);
  const coastSelectedIds = coast
    ? csv(coast.dataset.environmentCoastTransitionSelectedResourceIds).length > 0
      ? csv(coast.dataset.environmentCoastTransitionSelectedResourceIds)
      : csv(coast.dataset.environmentCoastTransitionResource)
    : [];
  const foliageVisible = boolean(foliage.dataset.environmentFoliageVisible);
  const seamVisible = boolean(seams.dataset.environmentSeamIntegrationVisible);
  const requiredChildren = [{
    epoch: number(seams.dataset.environmentSeamIntegrationPresentationEpoch),
    hiddenPaintedFrames: number(
      seams.dataset.environmentSeamIntegrationHiddenPaintedFrames ?? 0
    ),
    key: seams.dataset.environmentSeamIntegrationCohortKey ?? '',
    kind: 'seam',
    mountedNodeCount: seamImageNodes.length + seamTonalNodes.length,
    mountedResourceIds: [...new Set(
      [...seamImageNodes, ...seamTonalNodes].map(({ resourceId }) => resourceId)
    )],
    selectedResourceIds: seamSelectedIds,
    state: seamState,
    svgLoadedCount: number(seams.dataset.environmentSeamIntegrationSvgLoadedCount),
    visible: seamVisible,
  }, {
    epoch: number(coast?.dataset.environmentCoastTransitionPresentationEpoch),
    hiddenPaintedFrames: number(
      coast?.dataset.environmentCoastTransitionHiddenPaintedFrames ?? 0
    ),
    key: coast?.dataset.environmentCoastTransitionCohortKey ?? '',
    kind: 'coast',
    mountedNodeCount: coastImageNodes.length,
    mountedResourceIds: [...new Set(
      coastImageNodes.map(({ resourceId }) => resourceId)
    )],
    selectedResourceIds: coastSelectedIds,
    state: coastState,
    svgLoadedCount: number(coast?.dataset.environmentCoastTransitionSvgLoadedCount ?? 0),
    visible: boolean(coast?.dataset.environmentCoastTransitionVisible),
  }];
  return {
    applicationOwnedDecodedBytes,
    applicationOwnedResourceIds: csv(native.dataset.environmentNativeApplicationOwnedResourceIds),
    cohortEpoch: number(native.dataset.environmentNativeCohortEpoch),
    cohortPhase: native.dataset.environmentNativeCohortPhase,
    foliageMountedDecodedBytes: number(
      foliage.dataset.environmentFoliageMountedDecodedBytes ?? 0
    ),
    foliageMountedImageNodeCount: number(
      foliage.dataset.environmentFoliageMountedImageNodeCount ?? 0
    ),
    foliageMountedResourceIds: foliageMountedIds,
    foliageResidencyCohortKey:
      native.dataset.environmentNativeFoliageResidencyCohortKey ?? '',
    foliageResidencyEpoch: number(
      native.dataset.environmentNativeFoliageResidencyEpoch
    ),
    foliageResidencyPhase:
      native.dataset.environmentNativeFoliageResidencyPhase ?? 'idle',
    foliageSelectedDecodedBytes: number(
      foliage.dataset.environmentFoliageSelectedDecodedBytes ?? 0
    ),
    foliageSelectedImageNodeCount: number(
      foliage.dataset.environmentFoliageSelectedImageNodeCount ?? 0
    ),
    foliageSelectedResourceIds: foliageSelectedIds,
    foliageState,
    foliageVisible,
    lodTier: viewport.dataset.detailTier,
    lowerWaterSurfaceCount: lowerWaterSurfaces.length,
    lowerWaterVisibleCount,
    lowerDetailAvailable,
    mountedNodes,
    mountedResourceIds,
    nativeDecodedUnionBytes: applicationOwnedDecodedBytes + waterHydrologyAssetBytes,
    nativeDemand: boolean(native.dataset.environmentNativeDemand),
    nativeHydrologyAdmissionCurrentResources: jsonArray(
      native.dataset.environmentNativeHydrologyAdmissionCurrentResources
    ),
    nativeHydrologyAdmissionCurrentDecodedBytes: number(
      native.dataset.environmentNativeHydrologyAdmissionCurrentDecodedBytes
    ),
    nativeHydrologyAdmissionEpoch: number(
      native.dataset.environmentNativeHydrologyAdmissionEpoch
    ),
    nativeHydrologyAdmissionPresentationReady: boolean(
      native.dataset.environmentNativeHydrologyAdmissionPresentationReady
    ),
    nativeHydrologyAdmissionReservedDecodedBytes: number(
      native.dataset.environmentNativeHydrologyAdmissionReservedDecodedBytes
    ),
    nativeHydrologyAdmissionTargetResources: jsonArray(
      native.dataset.environmentNativeHydrologyAdmissionTargetResources
    ),
    nativeHydrologyAdmissionTargetDecodedBytes: number(
      native.dataset.environmentNativeHydrologyAdmissionTargetDecodedBytes
    ),
    nativeState: native.dataset.environmentNativeState,
    nativeVisible,
    noVisibleGap: boolean(native.dataset.environmentNativeNoVisibleGap),
    requiredCohortEpoch: number(native.dataset.environmentNativeRequiredCohortEpoch),
    requiredCohortKey: native.dataset.environmentNativeRequiredCohortKey ?? '',
    requiredDecodedBytes: number(native.dataset.environmentNativeRequiredDecodedBytes),
    requiredFailedKeys: jsonArray(native.dataset.environmentNativeRequiredFailedKeys),
    requiredChildren,
    requiredNoVisibleGap: boolean(native.dataset.environmentNativeRequiredNoVisibleGap),
    requiredNodeCount: number(native.dataset.environmentNativeRequiredNodeCount),
    requiredPreloadActive: boolean(native.dataset.environmentNativeRequiredPreloadActive),
    requiredReady: boolean(native.dataset.environmentNativeRequiredReady),
    requiredReadyKeys: jsonArray(native.dataset.environmentNativeRequiredReadyKeys),
    requiredResourceIds: csv(native.dataset.environmentNativeRequiredResourceIds),
    requiredResourceKeys: jsonArray(native.dataset.environmentNativeRequiredResourceKeys),
    requiredState: native.dataset.environmentNativeRequiredState,
    retiringResourceIds: csv(native.dataset.environmentNativeRetiringResourceIds),
    selectedSupplementalResourceIds,
    supplementalNodeCount: supplementalNodes.length,
    supplementalState,
    supplementalVisible: nativeVisible
      && selectedSupplementalResourceIds.length > 0
      && selectedSupplementalResourceIds.every((id) => (
        foliageSelectedIds.includes(id)
          ? foliageVisible
          : seamSelectedIds.includes(id)
            ? seamVisible
            : coastSelectedIds.includes(id)
              ? boolean(coast?.dataset.environmentCoastTransitionVisible)
              : false
      )),
    terrainApplicationOwnedDecodedBytes: number(native.dataset.environmentNativeTerrainApplicationOwnedDecodedBytes),
    terrainMountedDecodedBytes: number(native.dataset.environmentNativeTerrainMountedDecodedBytes),
    terrainRetiringDecodedBytes: number(native.dataset.environmentNativeTerrainRetiringDecodedBytes),
    terrainState: native.dataset.environmentNativeTerrainState,
    terrainTileCount: terrainNodes.length,
    waterDetailState: water.dataset.detailAssetState ?? 'base',
    waterForegroundMode: water.dataset.foregroundWaterMode ?? null,
    waterHydrologyAssetBytes,
    waterHydrologyAssetConstraint: water.dataset.hydrologyAssetConstraint ?? null,
    waterHydrologyAssetRegionIds: csv(water.dataset.hydrologyAssetRegionIds),
    waterHydrologyAssetResourceIds: csv(water.dataset.hydrologyAssetResourceIds),
    waterHydrologyAssetResourcePaths: csv(water.dataset.hydrologyAssetResourcePaths),
    waterHydrologyAssetResourcePath: water.dataset.hydrologyAssetResourcePath ?? null,
    waterHydrologyAssetState: water.dataset.hydrologyAssetState ?? 'disabled',
    waterHydrologyAssetTier: water.dataset.hydrologyAssetTier ?? 'none',
    waterHydrologyBudgetOwner: water.dataset.hydrologyBudgetOwner ?? null,
    waterHydrologyNativeUnionMaximumBytes: number(
      water.dataset.hydrologyNativeUnionMaximumBytes
    ),
    waterHydrologyNativeAdmissionEpoch: number(
      water.dataset.hydrologyNativeAdmissionEpoch
    ),
    waterHydrologyNativeUnionCurrentBytes: number(
      water.dataset.hydrologyNativeUnionCurrentBytes
    ),
    waterHydrologyNativeUnionPlannedBytes: number(
      water.dataset.hydrologyNativeUnionPlannedBytes
    ),
    waterHydrologyNativeUnionReservedBytes: number(
      water.dataset.hydrologyNativeUnionReservedBytes
    ),
    waterHydrologyNativeUnionTransitionPeakBytes: number(
      water.dataset.hydrologyNativeUnionTransitionPeakBytes
    ),
    waterHydrologyRequested,
    waterHydrologyRequestedRegionIds: csv(water.dataset.hydrologyRequestedRegionIds),
    waterHydrologyRequestedResourceIds: csv(water.dataset.hydrologyRequestedResourceIds),
    waterHydrologyRequestedResourcePaths: csv(water.dataset.hydrologyRequestedResourcePaths),
    waterHydrologyRequestedTier: water.dataset.hydrologyRequestedTier ?? 'none',
    waterHydrologySamplerSlotCount: number(water.dataset.hydrologySamplerSlotCount),
    waterHydrologyTransitionOpacity: number(water.dataset.hydrologyTransitionOpacity),
    waterHydrologyTransitionState: water.dataset.hydrologyTransitionState ?? null,
    waterRenderState: water.dataset.renderState ?? null,
    waterSharedTextureBytes: number(water.dataset.sharedWaterTextureBytes),
    waterSharedTransientPeakBytes: number(
      water.dataset.sharedWaterTextureTransientPeakBytes
    ),
    waterTextureBudgetBytes: number(water.dataset.textureBudgetBytes),
    waterTextureBytes: number(water.dataset.textureBytes),
    waterTransientPeakBytes: number(water.dataset.textureTransientPeakBytes),
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

async function dispatchSinglePan(connection, sessionId, targetOrigin) {
  const camera = await readCamera(connection, sessionId);
  const deltaX = (camera.origin[0] - targetOrigin[0])
    / camera.span[0] * camera.rect.width;
  const deltaY = (camera.origin[1] - targetOrigin[1])
    / camera.span[1] * camera.rect.height;
  const x = camera.rect.x + camera.rect.width * (deltaX < 0 ? 0.9 : 0.1);
  const y = camera.rect.y + camera.rect.height * (deltaY < 0 ? 0.9 : 0.1);
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

function strictWaterTelemetryReady(sample) {
  const sameStringSet = (left, right) => left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
  const mountedIds = sample.waterHydrologyAssetResourceIds ?? [];
  const mountedPaths = sample.waterHydrologyAssetResourcePaths ?? [];
  const mountedRegions = sample.waterHydrologyAssetRegionIds ?? [];
  const requestedIds = sample.waterHydrologyRequestedResourceIds ?? [];
  const requestedPaths = sample.waterHydrologyRequestedResourcePaths ?? [];
  const requestedRegions = sample.waterHydrologyRequestedRegionIds ?? [];
  if (
    typeof sample.waterHydrologyRequested !== "boolean"
    || sample.waterTextureBudgetBytes !== WATER_TEXTURE_BUDGET_BYTES
    || sample.waterForegroundMode !== "registered-overlay"
    || sample.waterHydrologyBudgetOwner !== "native-application-union"
    || sample.waterHydrologyNativeUnionMaximumBytes !== NATIVE_DECODED_BUDGET_BYTES
    || sample.waterHydrologyTransitionState !== "stable"
    || sample.waterHydrologyTransitionOpacity !== 1
    || sample.waterRenderState !== "ready"
    || sample.waterSharedTextureBytes > sample.waterTextureBudgetBytes
    || sample.waterSharedTransientPeakBytes < sample.waterSharedTextureBytes
    || sample.waterSharedTransientPeakBytes > sample.waterTextureBudgetBytes
    || sample.waterTextureBytes !== sample.waterSharedTextureBytes
    || sample.waterTransientPeakBytes !== sample.waterSharedTransientPeakBytes
    || sample.nativeDecodedUnionBytes
      !== sample.applicationOwnedDecodedBytes + sample.waterHydrologyAssetBytes
    || sample.nativeDecodedUnionBytes > NATIVE_DECODED_BUDGET_BYTES
    || mountedIds.length !== mountedPaths.length
    || mountedIds.length !== mountedRegions.length
    || requestedIds.length !== requestedPaths.length
    || requestedIds.length !== requestedRegions.length
    || mountedIds.length > 2
    || requestedIds.length > 2
    || new Set(mountedIds).size !== mountedIds.length
    || new Set(requestedIds).size !== requestedIds.length
  ) return false;
  if (sample.waterDetailState === "base") {
    return sample.lodTier === "world"
      && sample.waterHydrologyRequested === false
      && sample.waterHydrologyAssetTier === "none"
      && ["disabled", "idle"].includes(sample.waterHydrologyAssetState)
      && sample.waterHydrologyAssetBytes === 0
      && mountedIds.length === 0
      && requestedIds.length === 0
      && sample.waterHydrologyNativeUnionPlannedBytes === 0
      && sample.waterSharedTextureBytes === WATER_TEXTURE_CONSTRUCTOR_SHARED_BYTES
      && sample.waterSharedTransientPeakBytes === WATER_TEXTURE_CONSTRUCTOR_SHARED_BYTES;
  }
  const hydrologyBytes = sample.waterHydrologyAssetBytes;
  if (
    sample.waterDetailState !== "ready"
    || sample.waterSharedTextureBytes !== WATER_TEXTURE_DETAIL_WITHOUT_HYDROLOGY_BYTES
    || sample.waterSharedTransientPeakBytes !== WATER_TEXTURE_TRANSIENT_PEAK_BYTES
  ) return false;
  if (!sample.waterHydrologyRequested) {
    return sample.waterHydrologyAssetTier === "none"
      && ["disabled", "idle"].includes(sample.waterHydrologyAssetState)
      && hydrologyBytes === 0
      && mountedIds.length === 0
      && requestedIds.length === 0
      && sample.waterHydrologyNativeUnionPlannedBytes === 0;
  }
  return sample.nativeHydrologyAdmissionPresentationReady === true
    && sample.waterHydrologyNativeAdmissionEpoch
      === sample.nativeHydrologyAdmissionEpoch
    && sample.waterHydrologyNativeUnionReservedBytes
      === sample.nativeHydrologyAdmissionReservedDecodedBytes
    && sample.waterHydrologyNativeUnionCurrentBytes
      === sample.applicationOwnedDecodedBytes + hydrologyBytes
    && sample.waterHydrologyNativeUnionPlannedBytes
      === sample.waterHydrologyNativeUnionReservedBytes + hydrologyBytes
    && sample.waterHydrologyNativeUnionTransitionPeakBytes
      >= sample.waterHydrologyNativeUnionPlannedBytes
    && sample.waterHydrologyNativeUnionTransitionPeakBytes
      <= NATIVE_DECODED_BUDGET_BYTES
    && sameStringSet(mountedIds, requestedIds)
    && sameStringSet(mountedPaths, requestedPaths)
    && sameStringSet(mountedRegions, requestedRegions)
    && mountedIds.length === sample.waterHydrologySamplerSlotCount
    && sample.waterHydrologyAssetTier === sample.waterHydrologyRequestedTier
    && (
      (sample.waterHydrologyAssetTier === "detail"
        && sample.waterHydrologyAssetState === "ready")
      || (sample.waterHydrologyAssetTier === "fallback"
        && sample.waterHydrologyAssetState === "fallback")
    )
    && hydrologyBytes > 0;
}

async function waitForStrictWaterTelemetry(connection, sessionId) {
  return waitFor(connection, sessionId, async () => {
    const sample = await runtimeSample(connection, sessionId);
    return strictWaterTelemetryReady(sample) ? sample : null;
  }, "strict retained water texture telemetry", 30_000);
}

async function waitForNativeReady(connection, sessionId, expectedTerrainTileCount = 4) {
  return waitFor(connection, sessionId, async () => {
    const sample = await runtimeSample(connection, sessionId);
    return sample.nativeState === "ready"
      && sample.nativeVisible === true
      && sample.cohortPhase === "active"
      && sample.terrainTileCount === expectedTerrainTileCount
      && strictWaterTelemetryReady(sample)
      && (sample.supplementalState === "ready" || sample.supplementalState === "idle")
      ? sample
      : null;
  }, "ready native cohort", 30_000);
}

async function captureHydrologyBoundaryTransition({
  connection,
  hydrologyManifest,
  outputDirectory,
  proofDirectory,
  root,
  sessionId,
  url,
}) {
  const contract = NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION;
  await navigate(connection, sessionId, url);
  await setCamera(connection, sessionId, contract.fromCamera);
  await waitForNativeReady(connection, sessionId);
  await evaluate(connection, sessionId, `(() => {
    const style = document.createElement('style');
    style.dataset.ninjaoneHydrologyBoundaryIsolation = 'true';
    style.textContent = '* { animation-play-state: paused !important; } '
      + '.ninjaone-environment-proof__hud { display: none !important; } '
      + '.career-world__interface { display: none !important; } '
      + '[data-environment-layer="wildlife"] { display: none !important; }';
    document.head.append(style);
  })()`);
  const clip = await viewportClip(connection, sessionId);
  const waterClip = await elementClip(
    connection,
    sessionId,
    'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]',
  );
  const frames = [];
  const framedStates = new Set();
  const readSample = async () => {
    const [camera, runtime] = await Promise.all([
      readCamera(connection, sessionId),
      runtimeSample(connection, sessionId),
    ]);
    return Object.freeze({
      camera: Object.freeze({ origin: camera.origin, span: camera.span }),
      elapsedMs: 0,
      runtime,
    });
  };
  const captureStateFrame = async (id, sample) => {
    const imageFile = path.join(
      proofDirectory,
      `hydrology-boundary-${id}.png`,
    );
    await screenshot(connection, sessionId, imageFile, clip);
    const after = await readSample();
    if (
      after.runtime.waterHydrologyTransitionState
        !== sample.runtime.waterHydrologyTransitionState
    ) return false;
    frames.push(Object.freeze({
      camera: sample.camera,
      captureSynchronization: "runtime-state-before-and-after-cdp-screenshot",
      clip,
      id,
      imagePath: relativePath(outputDirectory, imageFile),
      runtime: sample.runtime,
      runtimeAfter: after.runtime,
    }));
    return true;
  };

  await evaluate(connection, sessionId, `(() => {
    const trace = {
      active: true,
      phaseAlpha: {},
      samples: [],
      startedAt: performance.now(),
    };
    window.__ninjaoneHydrologyBoundaryTrace = trace;
    const frame = () => {
      if (!trace.active || trace.samples.length >= 900) return;
      const runtime = ${RUNTIME_SAMPLE_EXPRESSION};
      const viewport = document.querySelector('.career-world__viewport');
      const water = document.querySelector(
        'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]'
      );
      if (runtime && viewport && water) {
        const camera = {
          origin: viewport.dataset.cameraOrigin.split(',').map(Number),
          span: viewport.dataset.cameraSpan.split(',').map(Number),
        };
        const sample = {
          camera,
          elapsedMs: Math.round(performance.now() - trace.startedAt),
          runtime,
        };
        trace.samples.push(sample);
        const state = runtime.waterHydrologyTransitionState;
        const opacity = runtime.waterHydrologyTransitionOpacity;
        const isIntermediateFade = (
          (state === 'fading-out' || state === 'fading-in')
          && opacity > 0
          && opacity < 1
        );
        if (
          (isIntermediateFade || state === 'zero')
          && !trace.phaseAlpha[state]
          && water.width > 0
          && water.height > 0
        ) {
          trace.phaseAlpha[state] = {
            camera,
            dataUrl: water.toDataURL('image/png'),
            height: water.height,
            runtime,
            width: water.width,
          };
        }
      }
      trace.requestId = requestAnimationFrame(frame);
    };
    trace.requestId = requestAnimationFrame(frame);
  })()`);
  await evaluate(connection, sessionId, `(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }))()`);
  const initial = await readSample();
  if (!await captureStateFrame("stable-before", initial)) {
    throw new Error("Hydrology boundary changed before the initial stable frame painted.");
  }
  framedStates.add("stable-before");
  let panComplete = false;
  let panError = null;
  const panPromise = dispatchSinglePan(connection, sessionId, contract.toCamera.origin)
    .then(() => panCamera(connection, sessionId, contract.toCamera.origin))
    .then(() => { panComplete = true; })
    .catch((error) => {
      panComplete = true;
      panError = error;
    });
  const deadline = Date.now() + 15_000;
  let reachedFinal = false;
  while (Date.now() < deadline) {
    const sample = await readSample();
    const state = sample.runtime.waterHydrologyTransitionState;
    if (
      new Set(["fading-out", "zero", "fading-in"]).has(state)
      && !framedStates.has(state)
      && await captureStateFrame(state, sample)
    ) framedStates.add(state);
    if (
      panComplete
      && cameraMatches(sample.camera, contract.toCamera)
      && state === "stable"
      && sample.runtime.waterHydrologyTransitionOpacity === 1
      && strictWaterTelemetryReady(sample.runtime)
    ) {
      reachedFinal = true;
      break;
    }
    await delay(12);
  }
  await panPromise;
  if (panError) throw panError;
  if (!reachedFinal) {
    throw new Error("Hydrology boundary transition did not settle at the target camera.");
  }
  const finalRuntime = await waitForNativeReady(connection, sessionId);
  const finalCamera = await readCamera(connection, sessionId);
  const finalSample = Object.freeze({
    camera: Object.freeze({ origin: finalCamera.origin, span: finalCamera.span }),
    elapsedMs: 0,
    runtime: finalRuntime,
  });
  if (!await captureStateFrame("stable-after", finalSample)) {
    throw new Error("Hydrology boundary changed before the final stable frame painted.");
  }
  const trace = await evaluate(connection, sessionId, `(() => new Promise((resolve) => {
    const trace = window.__ninjaoneHydrologyBoundaryTrace;
    if (!trace) throw new Error('Hydrology boundary rAF trace is missing.');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      trace.active = false;
      if (trace.requestId) cancelAnimationFrame(trace.requestId);
      resolve({ phaseAlpha: trace.phaseAlpha, samples: trace.samples });
    }));
  }))()`);
  const phaseAlpha = Object.entries(trace.phaseAlpha ?? {}).map(([id, snapshot]) => {
    const encoded = snapshot.dataUrl?.match(/^data:image\/png;base64,(.+)$/)?.[1];
    if (!encoded) throw new Error(`Hydrology boundary ${id} alpha capture is invalid.`);
    const file = path.join(proofDirectory, `hydrology-boundary-${id}-regional-alpha.png`);
    return [id, Object.freeze({
      camera: snapshot.camera,
      elapsedMs: 0,
      runtime: snapshot.runtime,
    }), file, Buffer.from(encoded, "base64")];
  });
  const zeroPhase = phaseAlpha.find(([id]) => id === "zero");
  if (!zeroPhase) {
    throw new Error("Hydrology boundary trace did not capture the zero-alpha retarget barrier.");
  }
  if (phaseAlpha.some(([, sample]) => !cameraMatches(sample.camera, zeroPhase[1].camera))) {
    throw new Error("Hydrology boundary phase alpha cameras do not share one registration.");
  }
  await Promise.all(phaseAlpha.map(([, , file, data]) => (
    writeRegionalHydrologyAlphaDelta(data, zeroPhase[3], file)
  )));
  const alphaFrames = [];
  for (const [id, sample, file] of phaseAlpha.map(
    ([phaseId, phaseSample, phaseFile]) => [phaseId, phaseSample, phaseFile],
  )) {
    const mountedIds = sample.runtime.waterHydrologyAssetResourceIds ?? [];
    const requestedIds = sample.runtime.waterHydrologyRequestedResourceIds ?? [];
    const fieldResourceIds = mountedIds.length > 0 ? mountedIds : requestedIds;
    const fieldTier = mountedIds.length > 0
      ? sample.runtime.waterHydrologyAssetTier
      : sample.runtime.waterHydrologyRequestedTier;
    const motionContract = await deriveNinjaOneHydrologyMotionContract({
      camera: sample.camera,
      clip: waterClip,
      fieldResourceIds,
      fieldTier,
      manifest: hydrologyManifest,
      root,
    });
    const maskFile = path.join(
      proofDirectory,
      `hydrology-boundary-${id}-registered-mask.png`,
    );
    await writeFile(maskFile, motionContract.fullMaskPng);
    alphaFrames.push(Object.freeze({
      alphaBasis: "regional-minus-zero-baseline",
      camera: sample.camera,
      clip: waterClip,
      fieldResourceIds: motionContract.fieldResourceIds,
      fieldTier: motionContract.fieldTier,
      id,
      imagePath: relativePath(outputDirectory, file),
      maskPath: relativePath(outputDirectory, maskFile),
      maskSha256: motionContract.fullMaskSha256,
      opacity: sample.runtime.waterHydrologyTransitionOpacity,
      state: sample.runtime.waterHydrologyTransitionState,
    }));
  }
  const samples = Object.freeze((trace.samples ?? []).map((sample) => Object.freeze({
    camera: Object.freeze({ origin: sample.camera.origin, span: sample.camera.span }),
    elapsedMs: sample.elapsedMs,
    runtime: sample.runtime,
  })));
  return Object.freeze({
    alphaFrames: Object.freeze(alphaFrames),
    frames: Object.freeze(frames),
    fromCamera: contract.fromCamera,
    id: contract.id,
    isolation: NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION,
    samples,
    toCamera: contract.toCamera,
    transitionTriggered: samples.some(({ runtime }) => (
      runtime.waterHydrologyTransitionState !== "stable"
    )),
  });
}

async function viewportClip(connection, sessionId) {
  const camera = await readCamera(connection, sessionId);
  return {
    height: Math.max(1, Math.floor(camera.rect.height)),
    scale: 1,
    width: Math.max(1, Math.floor(camera.rect.width)),
    x: Math.max(0, Math.floor(camera.rect.x)),
    y: Math.max(0, Math.floor(camera.rect.y)),
  };
}

async function elementClip(connection, sessionId, selector) {
  const rect = await evaluate(connection, sessionId, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
  })()`);
  if (!rect) throw new Error(`Capture element is missing: ${selector}`);
  return {
    height: Math.max(1, Math.floor(rect.height)),
    scale: 1,
    width: Math.max(1, Math.floor(rect.width)),
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
  };
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

async function captureWaterCanvasPng(connection, sessionId, file) {
  const capture = await evaluate(connection, sessionId, `(() => new Promise((resolve, reject) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const canvas = document.querySelector(
        'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]'
      );
      if (!canvas) {
        reject(new Error('Foreground hydrology canvas is missing.'));
        return;
      }
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        height: canvas.height,
        width: canvas.width,
      });
    }));
  }))()`);
  const encoded = capture?.dataUrl?.match(/^data:image\/png;base64,(.+)$/)?.[1];
  if (!encoded || !Number.isSafeInteger(capture.width) || !Number.isSafeInteger(capture.height)) {
    throw new Error("Unable to capture the foreground hydrology canvas.");
  }
  await writeFile(file, Buffer.from(encoded, "base64"));
  return Object.freeze({ height: capture.height, width: capture.width });
}

async function writeRegionalHydrologyAlphaDelta(framePng, zeroPng, file) {
  const [frame, zero] = await Promise.all([
    sharp(framePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(zeroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (
    frame.info.width !== zero.info.width
    || frame.info.height !== zero.info.height
    || frame.info.channels !== 4
    || zero.info.channels !== 4
  ) throw new Error("Hydrology boundary alpha delta dimensions are invalid.");
  for (let index = 0; index < frame.data.length; index += 4) {
    frame.data[index + 3] = Math.max(
      0,
      frame.data[index + 3] - zero.data[index + 3],
    );
  }
  await sharp(frame.data, {
    raw: {
      channels: 4,
      height: frame.info.height,
      width: frame.info.width,
    },
  }).png().toFile(file);
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

async function captureFrame({ connection, file, sessionId }) {
  const clip = await viewportClip(connection, sessionId);
  await screenshot(connection, sessionId, file, clip);
  const camera = await readCamera(connection, sessionId);
  return { camera: { origin: camera.origin, span: camera.span }, clip };
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
      + 'canvas[data-layer="water-surface"] { visibility: hidden !important; }';
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
  const mode = options.mode ?? "full";
  const artifactPrefix = options["artifact-prefix"] ?? "foliage-isolated";
  if (!new Set(["full", "foliage-isolation"]).has(mode)) {
    throw new Error("--mode must be full or foliage-isolation.");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(artifactPrefix)) {
    throw new Error("--artifact-prefix must be a bounded lowercase filename stem.");
  }
  const hydrologyManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json",
  ), "utf8"));
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

    if (mode === "foliage-isolation") {
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
    }

    const checkpoints = {};
    for (const [id, fixed] of Object.entries(NINJAONE_MVP_FIXED_CAMERAS)) {
      await navigate(connection, sessionId, url);
      await setCamera(connection, sessionId, fixed);
      await waitForNativeReady(connection, sessionId);
      const runtime = await waitForStrictWaterTelemetry(connection, sessionId);
      const imageFile = path.join(proofDirectory, `checkpoint-${id.toLowerCase()}.png`);
      const referenceFile = path.resolve(root, NINJAONE_MVP_CHECKPOINT_REFERENCES[id]);
      const { camera, clip } = await captureFrame({ connection, file: imageFile, sessionId });
      checkpoints[id] = {
        camera,
        clip,
        imagePath: relativePath(outputDirectory, imageFile),
        referencePath: relativePath(
          outputDirectory,
          referenceFile,
        ),
        referenceSha256: await sha256(referenceFile),
        runtime,
      };
    }

    await navigate(connection, sessionId, url);
    const b2Center = NINJAONE_MVP_FIXED_CAMERAS.B2.center;
    const lodFrames = [];
    for (const step of NINJAONE_MVP_LOD_SEQUENCE) {
      const target = {
        origin: b2Center.map((value) => value - step.span * 0.5),
        span: [step.span, step.span],
      };
      await setCamera(connection, sessionId, target);
      if (step.id === "close" || step.id === "reverse-hysteresis") {
        await waitForNativeReady(connection, sessionId);
      } else {
        await delay(120);
      }
      await waitForStrictWaterTelemetry(connection, sessionId);
      const runtime = await runtimeSample(connection, sessionId);
      const imageFile = path.join(proofDirectory, `lod-${step.id}.png`);
      const { camera, clip } = await captureFrame({ connection, file: imageFile, sessionId });
      lodFrames.push({
        camera,
        clip,
        id: step.id,
        imagePath: relativePath(outputDirectory, imageFile),
        runtime,
      });
    }

    const residencySamples = [];
    const captureResidency = async (stepId, active = true) => {
      await waitForStrictWaterTelemetry(connection, sessionId);
      const runtime = await runtimeSample(connection, sessionId);
      const cameraValue = await readCamera(connection, sessionId);
      const sample = {
        active,
        camera: { origin: cameraValue.origin, span: cameraValue.span },
        runtime,
        sequenceId: "runtime-residency-r1",
        stepId,
      };
      if (["close-ready", "pan-evicting", "pan-loading", "pan-ready"].includes(stepId)) {
        const imageFile = path.join(proofDirectory, `residency-${stepId}.png`);
        sample.clip = await viewportClip(connection, sessionId);
        await screenshot(connection, sessionId, imageFile, sample.clip);
        sample.imagePath = relativePath(outputDirectory, imageFile);
        sample.visualIsolation = NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION;
      }
      residencySamples.push(sample);
    };
    await navigate(connection, sessionId, url);
    await setCamera(connection, sessionId, { origin: [0, 0], span: [0.9, 0.9] });
    await captureResidency("world-low");
    await setCamera(connection, sessionId, { origin: [0.095, 0], span: [0.36, 0.36] });
    await captureResidency("territory-low");
    await setCamera(connection, sessionId, {
      origin: [0.1875 - 0.045, 0.25 - 0.045], span: [0.09, 0.09],
    });
    await captureResidency("site-preload-off");
    await setCamera(connection, sessionId, {
      origin: [0.1875 - 0.037, 0.25 - 0.037], span: [0.074, 0.074],
    });
    await delay(100);
    await captureResidency("preload-enter");
    const firstPanCamera = { origin: [0.18, 0.23], span: [0.04, 0.04] };
    const secondPanCamera = { origin: [0.211, 0.23], span: [0.04, 0.04] };
    await setCamera(connection, sessionId, firstPanCamera);
    await waitForNativeReady(connection, sessionId);
    await evaluate(connection, sessionId, `(() => {
      const style = document.createElement('style');
      style.dataset.ninjaoneResidencyCaptureIsolation = 'true';
      style.textContent = '* { animation-play-state: paused !important; } '
        + '.ninjaone-environment-proof__hud { display: none !important; } '
        + '.career-world__interface { display: none !important; } '
        + '[data-environment-layer="wildlife"] { display: none !important; } '
        + 'canvas[data-layer="water-surface"] { visibility: hidden !important; } '
        + '.ninjaone-environment-foliage-r3 { visibility: hidden !important; }';
      document.head.append(style);
    })()`);
    await captureResidency("close-ready");
    await connection.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
    const requiredRequestGate = await createRequiredImageRequestGate(connection, sessionId);
    await evaluate(connection, sessionId, `(() => {
      const native = document.querySelector('.ninjaone-environment-native-detail');
      if (!native) throw new Error('Native cohort telemetry is missing.');
      const observer = new MutationObserver(() => {
        if (native.dataset.environmentNativeCohortPhase === 'evicting') {
          observer.disconnect();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              debugger;
            });
          });
        }
      });
      observer.observe(native, {
        attributes: true,
        attributeFilter: ['data-environment-native-cohort-phase'],
      });
    })()`);
    const pausedPromise = waitForCdpEvent(
      connection,
      (message) => message.sessionId === sessionId
        && message.method === "Debugger.paused",
      "native eviction debugger pause",
    );
    await dispatchSinglePan(connection, sessionId, secondPanCamera.origin);
    const paused = await pausedPromise;
    const callFrameId = paused.params.callFrames[0]?.callFrameId;
    if (!callFrameId) throw new Error("Eviction debugger pause has no call frame.");
    const [evictingRuntime, evictingCamera] = await Promise.all([
      evaluateOnCallFrame(
        connection, sessionId, callFrameId, RUNTIME_SAMPLE_EXPRESSION,
      ),
      evaluateOnCallFrame(connection, sessionId, callFrameId, CAMERA_EXPRESSION),
    ]);
    const evictingClip = {
      height: Math.max(1, Math.floor(evictingCamera.rect.height)),
      scale: 1,
      width: Math.max(1, Math.floor(evictingCamera.rect.width)),
      x: Math.max(0, Math.floor(evictingCamera.rect.x)),
      y: Math.max(0, Math.floor(evictingCamera.rect.y)),
    };
    const evictingFile = path.join(proofDirectory, "residency-pan-evicting.png");
    await screenshot(connection, sessionId, evictingFile, evictingClip);
    residencySamples.push({
      active: true,
      camera: { origin: evictingCamera.origin, span: evictingCamera.span },
      clip: evictingClip,
      imagePath: relativePath(outputDirectory, evictingFile),
      runtime: evictingRuntime,
      captureSynchronization: "one-painted-frame-before-debugger",
      paintedFramesBeforeCapture: 1,
      sequenceId: "runtime-residency-r1",
      stepId: "pan-evicting",
      visualIsolation: NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION,
    });
    await connection.send("Debugger.resume", {}, sessionId);
    await panCamera(connection, sessionId, secondPanCamera.origin);
    const heldRequiredRequestCount = await requiredRequestGate.waitForRequest();
    const loadingRuntime = await waitFor(connection, sessionId, async () => {
      const sample = await runtimeSample(connection, sessionId);
      return sample.cohortPhase === "active"
        && sample.terrainState === "ready"
        && sample.requiredState === "loading"
        && sample.requiredPreloadActive === true
        && sample.requiredReady === false
        && sample.requiredResourceIds.length > 0
        && sample.nativeState === "loading"
        && sample.nativeVisible === false
        ? sample
        : null;
    }, "terrain-ready cohort with required images held", 10_000);
    const loadingCamera = await readCamera(connection, sessionId);
    const loadingFile = path.join(proofDirectory, "residency-pan-loading.png");
    const loadingClip = await viewportClip(connection, sessionId);
    await screenshot(connection, sessionId, loadingFile, loadingClip);
    residencySamples.push({
      active: true,
      camera: { origin: loadingCamera.origin, span: loadingCamera.span },
      clip: loadingClip,
      captureSynchronization: "required-image-request-gate",
      heldRequiredRequestCount,
      heldRequiredRequestPaths: requiredRequestGate.requestPaths(),
      imagePath: relativePath(outputDirectory, loadingFile),
      runtime: loadingRuntime,
      sequenceId: "runtime-residency-r1",
      stepId: "pan-loading",
      visualIsolation: NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION,
    });
    await evaluate(connection, sessionId, `(() => {
      const native = document.querySelector('.ninjaone-environment-native-detail');
      if (!native) throw new Error('Native cohort telemetry is missing.');
      const trace = {
        firstPromotion: null,
        invalidIntermediatePromotion: false,
        observedPromotions: 0,
      };
      window.__ninjaoneRequiredPromotionTrace = trace;
      const readRequiredChildren = () => {
        const seamChildren = [
          ...document.querySelectorAll('[data-environment-seam-integration-state]'),
        ].map((child) => {
        const selectedResourceIds = (
          child.dataset.environmentSeamIntegrationResourceIds ?? ''
        ).split(',').filter(Boolean);
        const mountedResourceIds = [
          ...child.querySelectorAll('image[data-environment-seam-integration-resource]'),
        ].map((node) => node.dataset.environmentSeamIntegrationResource);
        return {
          hiddenPaintedFrames: Number(
            child.dataset.environmentSeamIntegrationHiddenPaintedFrames ?? 0
          ),
          kind: 'seam',
          mountedNodeCount: mountedResourceIds.length,
          mountedResourceIds,
          selectedResourceIds,
          state: child.dataset.environmentSeamIntegrationState ?? 'idle',
          svgLoadedCount: Number(child.dataset.environmentSeamIntegrationSvgLoadedCount ?? 0),
          visible: child.dataset.environmentSeamIntegrationVisible === 'true',
        };
        });
        const coastChildren = [
          ...document.querySelectorAll('[data-environment-coast-transition-state]'),
        ].map((child) => {
          const selectedResourceIds = (
            child.dataset.environmentCoastTransitionSelectedResourceIds
              ?? child.dataset.environmentCoastTransitionResource
              ?? ''
          ).split(',').filter(Boolean);
          const mountedResourceIds = [
            ...child.querySelectorAll('image[data-environment-coast-transition-resource]'),
          ].map((node) => node.dataset.environmentCoastTransitionResource);
          return {
            hiddenPaintedFrames: Number(
              child.dataset.environmentCoastTransitionHiddenPaintedFrames ?? 0
            ),
            kind: 'coast',
            mountedNodeCount: mountedResourceIds.length,
            mountedResourceIds,
            selectedResourceIds,
            state: child.dataset.environmentCoastTransitionState ?? 'idle',
            svgLoadedCount: Number(child.dataset.environmentCoastTransitionSvgLoadedCount ?? 0),
            visible: child.dataset.environmentCoastTransitionVisible === 'true',
          };
        });
        return [...seamChildren, ...coastChildren]
          .filter(({ selectedResourceIds }) => selectedResourceIds.length > 0);
      };
      const observer = new MutationObserver(() => {
        if (native.dataset.environmentNativeVisible !== 'true') return;
        const children = readRequiredChildren();
        const snapshot = {
          children,
          nativeVisible: true,
          requiredReady: native.dataset.environmentNativeRequiredReady === 'true',
          requiredState: native.dataset.environmentNativeRequiredState,
        };
        trace.observedPromotions += 1;
        trace.firstPromotion ??= snapshot;
        if (
          snapshot.requiredReady !== true
          || snapshot.requiredState !== 'ready'
          || children.length === 0
          || children.some((child) => (
            child.state !== 'ready'
            || child.visible !== true
            || child.svgLoadedCount !== child.selectedResourceIds.length
            || child.mountedNodeCount !== child.selectedResourceIds.length
            || child.hiddenPaintedFrames < 2
          ))
        ) trace.invalidIntermediatePromotion = true;
        observer.disconnect();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            debugger;
          });
        });
      });
      observer.observe(native, {
        attributes: true,
        attributeFilter: ['data-environment-native-visible'],
      });
    })()`);
    const promotionPausedPromise = waitForCdpEvent(
      connection,
      (message) => message.sessionId === sessionId
        && message.method === "Debugger.paused",
      "first required-cohort promotion debugger pause",
      30_000,
    );
    await requiredRequestGate.release();
    const promotionPaused = await promotionPausedPromise;
    const promotionCallFrameId = promotionPaused.params.callFrames[0]?.callFrameId;
    if (!promotionCallFrameId) {
      throw new Error("First-promotion debugger pause has no call frame.");
    }
    const [firstPromotedRuntime, firstPromotedCamera, promotionTrace] = await Promise.all([
      evaluateOnCallFrame(
        connection, sessionId, promotionCallFrameId, RUNTIME_SAMPLE_EXPRESSION,
      ),
      evaluateOnCallFrame(connection, sessionId, promotionCallFrameId, CAMERA_EXPRESSION),
      evaluateOnCallFrame(
        connection,
        sessionId,
        promotionCallFrameId,
        "window.__ninjaoneRequiredPromotionTrace",
      ),
    ]);
    const firstPromotedClip = {
      height: Math.max(1, Math.floor(firstPromotedCamera.rect.height)),
      scale: 1,
      width: Math.max(1, Math.floor(firstPromotedCamera.rect.width)),
      x: Math.max(0, Math.floor(firstPromotedCamera.rect.x)),
      y: Math.max(0, Math.floor(firstPromotedCamera.rect.y)),
    };
    const firstPromotedFile = path.join(
      proofDirectory,
      "residency-pan-first-promoted.png",
    );
    await screenshot(connection, sessionId, firstPromotedFile, firstPromotedClip);
    residencySamples.push({
      active: true,
      camera: {
        origin: firstPromotedCamera.origin,
        span: firstPromotedCamera.span,
      },
      captureSynchronization: "one-painted-frame-after-required-promotion",
      clip: firstPromotedClip,
      imagePath: relativePath(outputDirectory, firstPromotedFile),
      paintedFramesAfterPromotion: 1,
      promotionTrace,
      runtime: firstPromotedRuntime,
      sequenceId: "runtime-residency-r1",
      stepId: "pan-first-promoted",
      visualIsolation: NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION,
    });
    await connection.send("Debugger.resume", {}, sessionId);
    await waitForNativeReady(connection, sessionId);
    await captureResidency("pan-ready");
    await setCameraSpan(connection, sessionId, 0.08, [0.5, 0.5]);
    await waitForNativeReady(connection, sessionId);
    await captureResidency("reverse-hysteresis");
    await setCameraSpan(connection, sessionId, 0.09, [0.5, 0.5]);
    await delay(100);
    await captureResidency("released");

    const hydrologyBoundaryTransition = await captureHydrologyBoundaryTransition({
      connection,
      hydrologyManifest,
      outputDirectory,
      proofDirectory,
      root,
      sessionId,
      url,
    });

    await navigate(connection, sessionId, url);
    await setCamera(connection, sessionId, NINJAONE_MVP_FIXED_CAMERAS.C2);
    await waitForNativeReady(connection, sessionId);
    await evaluate(connection, sessionId, `(() => {
      const style = document.createElement('style');
      style.dataset.ninjaoneCaptureIsolation = 'true';
      style.textContent = '* { animation-play-state: paused !important; } '
        + '.ninjaone-environment-native-detail__canopy-sway { animation-play-state: running !important; } '
        + '.ninjaone-environment-proof__hud { display: none !important; } '
        + '.career-world__interface { display: none !important; } '
        + '[data-environment-layer="wildlife"] { display: none !important; } '
        + 'canvas[data-layer="water-surface"] { visibility: hidden !important; }';
      document.head.append(style);
    })()`);
    const motionFiles = [];
    const normalStates = [];
    const motionClip = { height: viewport.height, scale: 1, width: viewport.width, x: 0, y: 0 };
    for (let index = 0; index < 3; index += 1) {
      if (index > 0) await delay(650);
      const file = path.join(
        proofDirectory,
        `foliage-isolated-normal-${index + 1}.png`,
      );
      await screenshot(connection, sessionId, file, motionClip);
      motionFiles.push(file);
      normalStates.push(await readFoliageNodeStates(connection, sessionId));
    }
    const foliageMaskFile = path.join(
      proofDirectory,
      "foliage-isolated-mask.png",
    );
    const rectangles = await foliageRects(connection, sessionId, motionClip);
    await writeMotionMask(foliageMaskFile, motionClip, rectangles);
    const normalMotionDiff = await maskedDiffMetrics(
      motionFiles[0], motionFiles[2], foliageMaskFile,
    );
    const forcedStates = [];
    for (const [id, progress] of [["0", 0], ["37", 0.37]]) {
      const nodeStates = await forceFoliageProgress(connection, sessionId, progress);
      const file = path.join(
        proofDirectory,
        `foliage-isolated-forced-${id}.png`,
      );
      await screenshot(connection, sessionId, file, motionClip);
      forcedStates.push({
        imagePath: relativePath(outputDirectory, file),
        nodeStates,
        progress,
      });
    }
    const forcedDiff = await maskedDiffMetrics(
      path.resolve(outputDirectory, forcedStates[0].imagePath),
      path.resolve(outputDirectory, forcedStates[1].imagePath),
      foliageMaskFile,
    );
    const foliageCrops = await writeFoliageCrops({
      frames: [
        ...motionFiles.map((file, index) => ({
          file,
          id: `foliage-isolated-normal-${index + 1}`,
        })),
        ...forcedStates.map((state) => ({
          file: path.resolve(outputDirectory, state.imagePath),
          id: `foliage-isolated-forced-${Math.round(state.progress * 100)}`,
        })),
      ],
      outputDirectory,
      proofDirectory,
      rectangles,
    });
    const foliageRuntime = await runtimeSample(connection, sessionId);
    const hydrologyFeatureCaptures = [];
    const hydrologyMotionCaptures = [];
    const hydrologyOcclusionCaptures = [];
    for (const id of ["C1", "C2"]) {
      const fixedCamera = NINJAONE_MVP_FIXED_CAMERAS[id];
      await navigate(connection, sessionId, url);
      await setCamera(connection, sessionId, fixedCamera);
      const runtime = await waitForNativeReady(connection, sessionId);
      const clip = await elementClip(
        connection,
        sessionId,
        'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]',
      );
      const contract = await deriveNinjaOneHydrologyMotionContract({
        camera: fixedCamera,
        clip,
        fieldTier: runtime.waterHydrologyAssetTier,
        fieldResourceIds: runtime.waterHydrologyAssetResourceIds,
        manifest: hydrologyManifest,
        root,
      });
      const maskFile = path.join(
        proofDirectory,
        `motion-hydrology-${id.toLowerCase()}-mask.png`,
      );
      await writeFile(maskFile, contract.maskPng);
      const maskDataUrl = `data:image/png;base64,${contract.maskPng.toString("base64")}`;
      await evaluate(connection, sessionId, `(() => {
        const style = document.createElement('style');
        style.dataset.ninjaoneHydrologyOcclusionIsolation = 'true';
        style.textContent = '* { animation-play-state: paused !important; } '
          + '.ninjaone-environment-proof__hud { display: none !important; } '
          + '.career-world__interface { display: none !important; } '
          + '[data-environment-layer="wildlife"] { display: none !important; } '
          + '.ninjaone-environment-foliage-r3 { visibility: hidden !important; } '
          + '[data-environment-seam-integration-state] { visibility: hidden !important; } '
          + '[data-environment-coast-transition-state] { visibility: hidden !important; }';
        document.head.append(style);
      })()`);
      const occlusionVisibleFile = path.join(
        proofDirectory,
        `hydrology-occlusion-${id.toLowerCase()}-visible.png`,
      );
      const occlusionHiddenFile = path.join(
        proofDirectory,
        `hydrology-occlusion-${id.toLowerCase()}-hidden.png`,
      );
      await screenshot(connection, sessionId, occlusionVisibleFile, clip);
      await evaluate(connection, sessionId, `(() => {
        const water = document.querySelector(
          'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]'
        );
        if (!water) throw new Error('Foreground hydrology canvas is missing.');
        water.style.setProperty('visibility', 'hidden', 'important');
      })()`);
      await screenshot(connection, sessionId, occlusionHiddenFile, clip);
      await evaluate(connection, sessionId, `(() => {
        const water = document.querySelector(
          'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]'
        );
        if (!water) throw new Error('Foreground hydrology canvas is missing.');
        water.style.removeProperty('visibility');
      })()`);
      hydrologyOcclusionCaptures.push(Object.freeze({
        camera: fixedCamera,
        clip,
        hiddenImagePath: relativePath(outputDirectory, occlusionHiddenFile),
        id: `hydrology-occlusion-${id}`,
        isolation: NINJAONE_MVP_HYDROLOGY_OCCLUSION_ISOLATION,
        maskPath: relativePath(outputDirectory, maskFile),
        runtime,
        visibleImagePath: relativePath(outputDirectory, occlusionVisibleFile),
      }));
      await evaluate(connection, sessionId, `(() => {
        const style = document.createElement('style');
        style.dataset.ninjaoneHydrologyCaptureIsolation = 'true';
        style.textContent = '.career-world__viewport > * { visibility: hidden !important; } '
          + 'canvas[data-layer="water-surface"] { visibility: visible !important; '
          + '-webkit-mask-image: url(${JSON.stringify(maskDataUrl)}); '
          + 'mask-image: url(${JSON.stringify(maskDataUrl)}); '
          + '-webkit-mask-size: 100% 100%; mask-size: 100% 100%; '
          + '-webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }';
        document.head.append(style);
      })()`);
      await delay(100);
      const frames = [];
      for (let index = 0; index < 3; index += 1) {
        if (index > 0) await delay(220);
        const file = path.join(
          proofDirectory,
          `motion-hydrology-${id.toLowerCase()}-${index + 1}.png`,
        );
        await screenshot(connection, sessionId, file, clip);
        frames.push(relativePath(outputDirectory, file));
      }
      hydrologyMotionCaptures.push(Object.freeze({
        camera: fixedCamera,
        clip,
        contract: Object.freeze({
          coveragePixels: contract.coveragePixels,
          directionalPixels: contract.directionalPixels,
          fieldDecodedBytes: contract.fieldDecodedBytes,
          fieldFlowVector: contract.fieldFlowVector,
          fieldResourceIds: contract.fieldResourceIds,
          fieldResourcePaths: contract.fieldPaths,
          fieldSha256s: contract.fieldSha256s,
          fieldTier: contract.fieldTier,
          fullMaskSha256: contract.fullMaskSha256,
          maskSha256: contract.maskSha256,
          sourceBounds: contract.sourceBounds,
          styleCounts: contract.styleCounts,
        }),
        flowVector: contract.flowVector,
        frames: Object.freeze(frames),
        id: `hydrology-${id}`,
        maskPath: relativePath(outputDirectory, maskFile),
        runtime,
      }));
    }

    for (const feature of NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES) {
      await navigate(connection, sessionId, url);
      await setCamera(connection, sessionId, feature.camera);
      const runtime = await waitForNativeReady(
        connection,
        sessionId,
        feature.expectedTerrainTileCount,
      );
      const clip = await elementClip(
        connection,
        sessionId,
        'canvas[data-layer="water-surface"][data-foreground-hydrology="true"]',
      );
      const contract = await deriveNinjaOneHydrologyMotionContract({
        camera: feature.camera,
        clip,
        fieldTier: runtime.waterHydrologyAssetTier,
        fieldResourceIds: runtime.waterHydrologyAssetResourceIds,
        manifest: hydrologyManifest,
        root,
      });
      const slug = feature.id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const fullMaskFile = path.join(proofDirectory, `${slug}-full-mask.png`);
      const directionMaskFile = path.join(
        proofDirectory,
        `${slug}-direction-mask.png`,
      );
      await Promise.all([
        writeFile(fullMaskFile, contract.fullMaskPng),
        writeFile(directionMaskFile, contract.maskPng),
      ]);
      await evaluate(connection, sessionId, `(() => {
        const style = document.createElement('style');
        style.dataset.ninjaoneHydrologyFeatureIsolation = ${JSON.stringify(feature.id)};
        style.textContent = '* { animation-play-state: paused !important; } '
          + '.ninjaone-environment-proof__hud { display: none !important; } '
          + '.career-world__interface { display: none !important; } '
          + '[data-environment-layer="wildlife"] { display: none !important; }';
        document.head.append(style);
      })()`);
      await delay(100);
      const alphaFrames = [];
      const frames = [];
      for (let index = 0; index < 3; index += 1) {
        if (index > 0) await delay(220);
        const frameFile = path.join(proofDirectory, `${slug}-${index + 1}.png`);
        const alphaFile = path.join(
          proofDirectory,
          `${slug}-water-alpha-${index + 1}.png`,
        );
        await screenshot(connection, sessionId, frameFile, clip);
        const canvasDimensions = await captureWaterCanvasPng(
          connection,
          sessionId,
          alphaFile,
        );
        if (
          canvasDimensions.width !== clip.width
          || canvasDimensions.height !== clip.height
        ) throw new Error(`${feature.id} canvas dimensions do not match its capture clip.`);
        frames.push(relativePath(outputDirectory, frameFile));
        alphaFrames.push(relativePath(outputDirectory, alphaFile));
      }
      hydrologyFeatureCaptures.push(Object.freeze({
        alphaFrames: Object.freeze(alphaFrames),
        camera: feature.camera,
        clip,
        contract: Object.freeze({
          coveragePixels: contract.coveragePixels,
          directionalPixels: contract.directionalPixels,
          fieldDecodedBytes: contract.fieldDecodedBytes,
          fieldFlowVector: contract.fieldFlowVector,
          fieldResourceIds: contract.fieldResourceIds,
          fieldResourcePaths: contract.fieldPaths,
          fieldSha256s: contract.fieldSha256s,
          fieldTier: contract.fieldTier,
          fullMaskSha256: contract.fullMaskSha256,
          maskSha256: contract.maskSha256,
          sourceBounds: contract.sourceBounds,
          styleCounts: contract.styleCounts,
        }),
        directionMaskPath: relativePath(outputDirectory, directionMaskFile),
        flowVector: contract.flowVector,
        frames: Object.freeze(frames),
        id: feature.id,
        isolation: NINJAONE_MVP_HYDROLOGY_FEATURE_ISOLATION,
        maskPath: relativePath(outputDirectory, fullMaskFile),
        runtime,
      }));
    }

    stopEvents();
    const diagnostics = classifyBrowserDiagnostics(
      consoleErrors,
      networkErrors,
      automationDiagnostics,
    );
    const evidence = {
      bindings: await createNinjaOneEnvironmentCaptureBindings(root),
      checkpoints,
      consoleErrors: diagnostics.consoleErrors,
      hydrologyBoundaryTransition,
      hydrologyFeatureCaptures,
      lodTransition: { frames: lodFrames },
      hydrologyOcclusionCaptures,
      motionCaptures: hydrologyMotionCaptures,
      foliageProof: {
        fixedCamera: NINJAONE_MVP_FIXED_CAMERAS.C2,
        crops: foliageCrops,
        forcedDiff,
        forcedStates,
        isolation: {
          animation: "all paused except canopy sway during normal trio; disabled during forced states",
          cameraPreserved: true,
          hud: ".ninjaone-environment-proof__hud and .career-world__interface display:none!important",
          water: "visibility:hidden!important",
          wildlife: "display:none!important",
        },
        maskPath: relativePath(outputDirectory, foliageMaskFile),
        normalFrames: motionFiles.map((file) => relativePath(outputDirectory, file)),
        normalMotionDiff,
        normalStates,
        rectangles,
        runtime: foliageRuntime,
      },
      producer: {
        automation: "browser-dom-screenshot",
        automationDiagnostics,
        capturedAt: new Date().toISOString(),
        id: NINJAONE_MVP_CAPTURE_PRODUCER_ID,
        scriptPath: NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
        scriptSha256: await sha256(path.join(root, NINJAONE_MVP_CAPTURE_PRODUCER_PATH)),
        url,
        viewport,
      },
      networkErrors: diagnostics.networkErrors,
      residencySamples,
      schemaVersion: 1,
    };
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
