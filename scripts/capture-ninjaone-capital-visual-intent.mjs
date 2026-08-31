#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  CdpConnection,
  browserCandidates,
  delay,
  evaluate,
  firstAccessible,
  launchBrowser,
  navigate,
  readCamera,
  resolveCdpWebSocket,
  screenshot,
  waitFor,
} from "./capture-ninjaone-environment-mvp.mjs";

sharp.cache(false);
sharp.concurrency(1);

const REFERENCE_WIDTH = 1448;
const REFERENCE_HEIGHT = 1086;
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_URL =
  "http://localhost:4179/?view=ninjaone-capital-city-layer&intent=concept";
const DEFAULT_OUTPUT =
  ".codex-tmp/city-lod-correction-r1/visual-intent/evidence.json";
const DEFAULT_VIEWPORT = Object.freeze({ height: 1260, width: 1512 });
const REFERENCE_MASTER =
  "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png";
const REFERENCE_BASE =
  "art-source/career-world/ninjaone-capital/city-nodes-r2/intent/ninjaone-capital-live-land-water-base-r1.png";
const DISTRICTS = Object.freeze([
  Object.freeze({ id: "D01", label: "upper-capital" }),
  Object.freeze({ id: "D02", label: "dojo-ridge" }),
  Object.freeze({ id: "D03", label: "eastern-industry" }),
  Object.freeze({ id: "D04", label: "central-lake-terraces" }),
  Object.freeze({ id: "D05", label: "western-skill-terraces" }),
]);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--assert-threshold") {
      options.assertThreshold = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value.`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/capture-ninjaone-capital-visual-intent.mjs [options]",
    "",
    "Options:",
    "  --assert-threshold          Exit nonzero when similarity is below the threshold.",
    "  --browser-executable <file> Chrome/Edge executable (auto-detected by default).",
    "  --cdp <url>                 Attach to an existing browser CDP endpoint.",
    "  --output <file>             Evidence JSON output path.",
    "  --root <directory>          Repository root (default: current directory).",
    "  --threshold <0..1>          Intent threshold (default: 0.8).",
    "  --url <url>                 Running city-layer preview URL.",
  ].join("\n");
}

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function maskStats(target, live, selection) {
  let targetCount = 0;
  let liveCount = 0;
  let intersection = 0;
  let selectedCount = 0;
  for (let pixel = 0; pixel < target.length; pixel += 1) {
    if (selection && !selection[pixel]) continue;
    selectedCount += 1;
    const targetOn = target[pixel] !== 0;
    const liveOn = live[pixel] !== 0;
    targetCount += Number(targetOn);
    liveCount += Number(liveOn);
    intersection += Number(targetOn && liveOn);
  }
  const union = targetCount + liveCount - intersection;
  const precision = liveCount === 0 ? 0 : intersection / liveCount;
  const recall = targetCount === 0 ? 0 : intersection / targetCount;
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);
  return Object.freeze({
    f1: round(f1),
    intersectionPixels: intersection,
    liveOccupancy: selectedCount === 0 ? 0 : round(liveCount / selectedCount),
    livePixels: liveCount,
    precision: round(precision),
    recall: round(recall),
    selectedPixels: selectedCount,
    targetOccupancy: selectedCount === 0 ? 0 : round(targetCount / selectedCount),
    targetPixels: targetCount,
    unionPixels: union,
  });
}

function boundaryMask(mask, width, height) {
  const boundary = new Uint8Array(mask.length);
  for (let y = 1; y + 1 < height; y += 1) {
    for (let x = 1; x + 1 < width; x += 1) {
      const pixel = y * width + x;
      if (!mask[pixel]) continue;
      if (
        !mask[pixel - 1]
        || !mask[pixel + 1]
        || !mask[pixel - width]
        || !mask[pixel + width]
      ) boundary[pixel] = 1;
    }
  }
  return boundary;
}

function dilate(mask, width, height, radius) {
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (!mask[pixel]) continue;
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        const targetY = y + offsetY;
        if (targetY < 0 || targetY >= height) continue;
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const targetX = x + offsetX;
          if (targetX >= 0 && targetX < width) {
            output[targetY * width + targetX] = 1;
          }
        }
      }
    }
  }
  return output;
}

function tolerantBoundaryF1(targetMask, liveMask, width, height) {
  const targetBoundary = boundaryMask(targetMask, width, height);
  const liveBoundary = boundaryMask(liveMask, width, height);
  const targetTolerance = dilate(targetBoundary, width, height, 2);
  const liveTolerance = dilate(liveBoundary, width, height, 2);
  let targetCount = 0;
  let liveCount = 0;
  let targetMatched = 0;
  let liveMatched = 0;
  for (let pixel = 0; pixel < targetBoundary.length; pixel += 1) {
    if (targetBoundary[pixel]) {
      targetCount += 1;
      targetMatched += Number(liveTolerance[pixel] !== 0);
    }
    if (liveBoundary[pixel]) {
      liveCount += 1;
      liveMatched += Number(targetTolerance[pixel] !== 0);
    }
  }
  const precision = liveCount === 0 ? 0 : liveMatched / liveCount;
  const recall = targetCount === 0 ? 0 : targetMatched / targetCount;
  return round(precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall));
}

function intersectionColorSimilarity(reference, live, targetMask, liveMask) {
  let difference = 0;
  let channelCount = 0;
  for (let pixel = 0; pixel < targetMask.length; pixel += 1) {
    if (!targetMask[pixel] || !liveMask[pixel]) continue;
    const offset = pixel * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      difference += Math.abs(reference[offset + channel] - live[offset + channel]);
      channelCount += 1;
    }
  }
  return channelCount === 0 ? 0 : round(1 - difference / (channelCount * 255));
}

async function rawRgba(file) {
  return sharp(file)
    .resize(REFERENCE_WIDTH, REFERENCE_HEIGHT, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

async function rawMask(file) {
  const data = await sharp(file)
    .resize(REFERENCE_WIDTH, REFERENCE_HEIGHT, { fit: "fill", kernel: "nearest" })
    .greyscale()
    .raw()
    .toBuffer();
  return Uint8Array.from(data, (value) => Number(value >= 128));
}

async function writeMask(file, mask) {
  const rgba = Buffer.alloc(mask.length * 4);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const value = mask[pixel] ? 255 : 0;
    const offset = pixel * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  await sharp(rgba, {
    raw: { channels: 4, height: REFERENCE_HEIGHT, width: REFERENCE_WIDTH },
  }).png().toFile(file);
}

async function compareFrames({ baseFile, cityFile, masterFile, outputDirectory, root }) {
  const [base, live, reference] = await Promise.all([
    rawRgba(baseFile),
    rawRgba(cityFile),
    rawRgba(masterFile),
  ]);
  const pixelCount = REFERENCE_WIDTH * REFERENCE_HEIGHT;
  const targetMask = new Uint8Array(pixelCount);
  const liveMask = new Uint8Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const referenceDifference = Math.max(
      Math.abs(reference[offset] - base[offset]),
      Math.abs(reference[offset + 1] - base[offset + 1]),
      Math.abs(reference[offset + 2] - base[offset + 2]),
    );
    targetMask[pixel] = Number(referenceDifference >= 18);
    liveMask[pixel] = Number(live[offset + 3] >= 16);
  }
  const silhouette = maskStats(targetMask, liveMask);
  const boundaryF1 = tolerantBoundaryF1(
    targetMask,
    liveMask,
    REFERENCE_WIDTH,
    REFERENCE_HEIGHT,
  );
  const colorSimilarity = intersectionColorSimilarity(
    reference,
    live,
    targetMask,
    liveMask,
  );
  const score = round(
    silhouette.f1 * 0.6
      + boundaryF1 * 0.25
      + colorSimilarity * 0.15,
  );
  const districtMetrics = [];
  for (const district of DISTRICTS) {
    const selection = await rawMask(path.join(
      root,
      `art-source/career-world/ninjaone-capital/city-nodes-r2/intent/${district.id}-mask.png`,
    ));
    districtMetrics.push(Object.freeze({
      ...district,
      ...maskStats(targetMask, liveMask, selection),
    }));
  }
  const overlay = Buffer.alloc(pixelCount * 4);
  const difference = Buffer.alloc(pixelCount * 4);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const targetOn = targetMask[pixel] !== 0;
    const liveOn = liveMask[pixel] !== 0;
    overlay[offset] = targetOn ? 255 : 0;
    overlay[offset + 1] = targetOn && liveOn ? 255 : 0;
    overlay[offset + 2] = liveOn ? 255 : 0;
    overlay[offset + 3] = targetOn || liveOn ? 210 : 0;
    const mismatched = targetOn !== liveOn;
    difference[offset] = mismatched ? 255 : 0;
    difference[offset + 1] = mismatched ? 255 : 0;
    difference[offset + 2] = mismatched ? 255 : 0;
    difference[offset + 3] = mismatched ? 255 : 0;
  }
  const overlayFile = path.join(outputDirectory, "city-mask-overlay.png");
  const differenceFile = path.join(outputDirectory, "city-mask-difference.png");
  const targetMaskFile = path.join(outputDirectory, "concept-city-region-mask.png");
  const liveMaskFile = path.join(outputDirectory, "live-city-region-mask.png");
  await Promise.all([
    sharp(overlay, {
      raw: { channels: 4, height: REFERENCE_HEIGHT, width: REFERENCE_WIDTH },
    }).png().toFile(overlayFile),
    sharp(difference, {
      raw: { channels: 4, height: REFERENCE_HEIGHT, width: REFERENCE_WIDTH },
    }).png().toFile(differenceFile),
    writeMask(targetMaskFile, targetMask),
    writeMask(liveMaskFile, liveMask),
  ]);
  return Object.freeze({
    boundaryF1,
    colorSimilarity,
    districtMetrics: Object.freeze(districtMetrics),
    score,
    silhouette,
  });
}

const PROOF_STYLE = `
  .career-world__header,
  .career-world__interface,
  .career-world__layer-inspector,
  .career-world__development-overlay { display: none !important; }
  .career-world, .career-world__viewport { box-shadow: none !important; }
`;

const CITY_ONLY_STYLE = `
  html, body, .career-world, .career-world__viewport {
    background: transparent !important;
    box-shadow: none !important;
  }
  .career-world__viewport > * { visibility: hidden !important; }
  .career-world__viewport > .ninjaone-capital-city,
  .career-world__viewport > .ninjaone-capital-city * { visibility: visible !important; }
`;

async function injectStyle(connection, sessionId, id, css) {
  await evaluate(connection, sessionId, `(() => {
    document.getElementById(${JSON.stringify(id)})?.remove();
    const style = document.createElement('style');
    style.id = ${JSON.stringify(id)};
    style.textContent = ${JSON.stringify(css)};
    document.head.append(style);
    return true;
  })()`);
}

async function captureRuntimeFrames({ browserExecutable, cdp, outputDirectory, url, viewport }) {
  let launched = null;
  let connection = null;
  let targetId = null;
  try {
    const websocketUrl = cdp
      ? await resolveCdpWebSocket(cdp)
      : await (async () => {
        const executable = browserExecutable ?? await firstAccessible(browserCandidates());
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
      connection.send("Network.enable", {}, sessionId),
      connection.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1,
        height: viewport.height,
        mobile: false,
        width: viewport.width,
      }, sessionId),
      connection.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      }, sessionId),
    ]);
    await navigate(connection, sessionId, url);
    await waitFor(connection, sessionId, async () => evaluate(connection, sessionId, `(() => {
      const viewportNode = document.querySelector('.career-world__viewport');
      const city = document.querySelector('.ninjaone-capital-city');
      return Boolean(
        viewportNode
        && city
        && viewportNode.dataset.cityVisualIntent === 'true'
        && viewportNode.dataset.detailTier === 'capital'
        && city.querySelectorAll('image').length > 0
      );
    })()`), "capital visual-intent render", 30_000);
    await delay(500);
    await injectStyle(connection, sessionId, "city-visual-proof-style", PROOF_STYLE);
    const camera = await readCamera(connection, sessionId);
    const clip = Object.freeze({
      height: camera.rect.height,
      scale: 1,
      width: camera.rect.width,
      x: camera.rect.x,
      y: camera.rect.y,
    });
    const liveFile = path.join(outputDirectory, "live-land-city.png");
    await screenshot(connection, sessionId, liveFile, clip);
    await injectStyle(connection, sessionId, "city-only-proof-style", CITY_ONLY_STYLE);
    await connection.send("Emulation.setDefaultBackgroundColorOverride", {
      color: { a: 0, b: 0, g: 0, r: 0 },
    }, sessionId);
    const cityFile = path.join(outputDirectory, "live-city-isolated.png");
    await screenshot(connection, sessionId, cityFile, clip);
    const telemetry = await evaluate(connection, sessionId, `(() => {
      const viewportNode = document.querySelector('.career-world__viewport');
      const city = document.querySelector('.ninjaone-capital-city');
      const nodes = [...city.querySelectorAll('[data-city-node-id]')].map((node, index) => {
        const image = node.querySelector('image');
        const shadow = node.querySelector('ellipse');
        const anchor = shadow
          ? [Number(shadow.getAttribute('cx')), Number(shadow.getAttribute('cy'))]
          : null;
        const imageBottom = image
          ? Number(image.getAttribute('y')) + Number(image.getAttribute('height'))
          : null;
        const imageBounds = image
          ? {
              height: Number(image.getAttribute('height')),
              left: Number(image.getAttribute('x')),
              top: Number(image.getAttribute('y')),
              width: Number(image.getAttribute('width')),
            }
          : null;
        const resolvedAnchor = anchor ?? (imageBounds
          ? [imageBounds.left + imageBounds.width * 0.5, imageBounds.top + imageBounds.height]
          : null);
        return {
          anchor: resolvedAnchor,
          assetId: node.dataset.cityAssetId,
          binding: node.dataset.cityNodeRegistrationBinding,
          groundContactError: anchor && imageBottom !== null
            ? Math.abs(imageBottom - anchor[1])
            : null,
          id: node.dataset.cityNodeId,
          imageBounds,
          index,
          layerId: node.dataset.cityChildLayer,
        };
      });
      let depthOrderViolations = 0;
      for (let index = 1; index < nodes.length; index += 1) {
        if (nodes[index - 1].anchor?.[1] > nodes[index].anchor?.[1]) {
          depthOrderViolations += 1;
        }
      }
      return {
        cameraOrigin: viewportNode.dataset.cameraOrigin.split(',').map(Number),
        cameraSpan: viewportNode.dataset.cameraSpan.split(',').map(Number),
        declaredNodeCount: Number(city.dataset.cityNodeCount),
        depthOrderViolations,
        mountedNodeCount: nodes.length,
        nodes,
        tier: viewportNode.dataset.detailTier,
      };
    })()`);
    return Object.freeze({ camera, cityFile, clip, liveFile, telemetry });
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
        } catch {}
      }
    }
  }
}

export async function captureNinjaOneCapitalVisualIntent(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const output = path.resolve(root, options.output ?? DEFAULT_OUTPUT);
  const outputDirectory = path.dirname(output);
  const threshold = Number(options.threshold ?? DEFAULT_THRESHOLD);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    throw new TypeError("Visual similarity threshold must be in (0, 1].");
  }
  await mkdir(outputDirectory, { recursive: true });
  const runtime = await captureRuntimeFrames({
    browserExecutable: options["browser-executable"],
    cdp: options.cdp,
    outputDirectory,
    url: options.url ?? DEFAULT_URL,
    viewport: DEFAULT_VIEWPORT,
  });
  const masterFile = path.join(root, REFERENCE_MASTER);
  const baseFile = path.join(root, REFERENCE_BASE);
  const metrics = await compareFrames({
    baseFile,
    cityFile: runtime.cityFile,
    masterFile,
    outputDirectory,
    root,
  });
  const [masterBytes, baseBytes, cityBytes, liveBytes] = await Promise.all([
    readFile(masterFile),
    readFile(baseFile),
    readFile(runtime.cityFile),
    readFile(runtime.liveFile),
  ]);
  const evidence = Object.freeze({
    acceptance: Object.freeze({
      passed: metrics.score >= threshold,
      score: metrics.score,
      threshold,
    }),
    artifacts: Object.freeze({
      cityIsolated: path.relative(outputDirectory, runtime.cityFile).replaceAll(path.sep, "/"),
      cityIsolatedSha256: sha256(cityBytes),
      liveLandCity: path.relative(outputDirectory, runtime.liveFile).replaceAll(path.sep, "/"),
      liveLandCitySha256: sha256(liveBytes),
      maskOverlay: "city-mask-overlay.png",
    }),
    capture: Object.freeze({
      camera: Object.freeze({
        origin: runtime.camera.origin,
        span: runtime.camera.span,
      }),
      clip: runtime.clip,
      referenceDimensions: Object.freeze([REFERENCE_WIDTH, REFERENCE_HEIGHT]),
      url: options.url ?? DEFAULT_URL,
      viewport: DEFAULT_VIEWPORT,
    }),
    metric: Object.freeze({
      definition: "0.60 city-region silhouette F1 + 0.25 two-pixel-tolerant boundary F1 + 0.15 intersecting-city RGB similarity",
      ignores: "UI and accepted L1-L3 background pixels",
      limitations: Object.freeze([
        "The master-minus-live-base target mask contains terrain-registration residue and is a guardrail, not visual acceptance authority.",
        "Runtime ground-contact and depth-order telemetry measures self-consistency only, not master agreement.",
      ]),
      ...metrics,
    }),
    reference: Object.freeze({
      basePath: REFERENCE_BASE,
      baseSha256: sha256(baseBytes),
      masterPath: REFERENCE_MASTER,
      masterSha256: sha256(masterBytes),
    }),
    runtime: runtime.telemetry,
    schemaVersion: 1,
  });
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  return Object.freeze({ evidence, output, outputDirectory });
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
    const result = await captureNinjaOneCapitalVisualIntent(options);
    process.stdout.write(`${JSON.stringify({
      output: result.output,
      passed: result.evidence.acceptance.passed,
      score: result.evidence.acceptance.score,
      threshold: result.evidence.acceptance.threshold,
    }, null, 2)}\n`);
    if (options.assertThreshold && !result.evidence.acceptance.passed) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
