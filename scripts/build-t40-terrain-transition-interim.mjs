import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodePath = (relativePath) => path.join(root, relativePath);
const sourceR8 = nodePath("art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png");
const sourceR9 = nodePath("art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r9.png");
const candidatePath = nodePath(".codex-tmp/quarantine/terrain/T40-terrain-transition-interim/river-exit-painted-c1.png");
const inputManifestPath = nodePath(".codex-tmp/quarantine/terrain/T40-terrain-transition-interim/input-manifest.json");
const environmentManifestPath = nodePath("public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json");
const transitionManifestPath = nodePath("public/career-world/capitals/ninjaone/environment/manifests/terrain-transition-interim-r1.json");
const affectedSupportPath = nodePath("public/career-world/capitals/ninjaone/environment/masks/terrain-transition-interim-support-r1.png");
const contactR3 = nodePath("public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-contact-r3.png");
const contactR4 = nodePath("public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-contact-r4.png");
const worldBackingPath = nodePath("public/career-world/layers/terrain/authority/textures/terrain-relief-r6.png");
const outputRoot = nodePath("public/career-world/capitals/ninjaone/environment/plates/geology");
const qaRoot = nodePath(".codex-tmp/qa/T40");
const quarantineRoot = nodePath(".codex-tmp/quarantine/terrain/T40-terrain-transition-interim");

const MASTER = Object.freeze([5760, 4320]);
const CAPITAL = Object.freeze([1440, 1080]);
const RIVER_RECT = Object.freeze([3584, 3296, 1024, 1024]);
const FEATHER_CAPITAL_PX = 176;
const TRANSITION_MASTER_PX = FEATHER_CAPITAL_PX * 4 + 56;
const TIERS = Object.freeze({ territory: [720, 540], capital: CAPITAL, site: [2880, 2160], close: MASTER });
const R8_TIER_PATHS = Object.freeze(Object.fromEntries(Object.keys(TIERS).map((tier) => [
  tier,
  nodePath(`public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-${tier}-r8.webp`),
])));
const PROTECTED_PATHS = Object.freeze([
  "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-water-safe-mask-r5.png",
  "public/career-world/layers/inland-water/authority/masks/ninjaone-inland-terrain-erase-r1.png",
]);

const IMAGEGEN_PROMPT = "Resolve only the lower river corridor: keep the upstream river and the exact isometric terrain authority, narrow the channel into a shadowed rocky gorge or sink at least 80 pixels before the bottom edge, and carry dry matching rock and alpine ground to the bottom edge. Preserve all terrain, paths, trees, lighting, framing, scale, and projection outside that corridor; add no structures, roads, bridges, ponds, waterfalls, text, blur, haze, or border changes.";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function saturation(r, g, b) {
  const high = Math.max(r, g, b);
  return high === 0 ? 0 : (high - Math.min(r, g, b)) / high;
}

function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function buildRiverMask() {
  const points = [[0, 472], [118, 540], [205, 632], [298, 738], [400, 874], [520, 1024]];
  const mask = Buffer.alloc(1024 * 1024);
  for (let y = 0; y < 1024; y += 1) {
    for (let x = 0; x < 1024; x += 1) {
      let distance = Infinity;
      for (let index = 1; index < points.length; index += 1) {
        distance = Math.min(distance, distanceToSegment(x, y, ...points[index - 1], ...points[index]));
      }
      const radius = 112 + smoothstep((y - 540) / 484) * 308;
      const corridor = smoothstep((radius - distance) / 72);
      const entrance = smoothstep((y - 430) / 150);
      const sideStandoff = smoothstep(x / 72) * smoothstep((1023 - x) / 72);
      mask[y * 1024 + x] = Math.round(255 * corridor * entrance * sideStandoff);
    }
  }
  return mask;
}

function buildContactMask() {
  const [width, height] = CAPITAL;
  const bytes = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    const leftInset = 14 + 9 * Math.sin(y / 31) + 5 * Math.sin(y / 13 + 0.7);
    const rightInset = 15 + 8 * Math.sin(y / 37 + 1.9) + 4 * Math.sin(y / 17);
    for (let x = 0; x < width; x += 1) {
      const bottomInset = 16 + 8 * Math.sin(x / 43 + 0.4) + 5 * Math.sin(x / 19 + 2.2);
      const distance = Math.min(
        x - leftInset,
        width - 1 - rightInset - x,
        height - 1 - bottomInset - y,
      );
      bytes[y * width + x] = Math.round(255 * smoothstep(distance / FEATHER_CAPITAL_PX));
    }
  }
  return bytes;
}

async function rawRgba(imagePath, options = {}) {
  const pipeline = sharp(imagePath).ensureAlpha();
  if (options.resize) pipeline.resize(...options.resize, { kernel: options.kernel ?? "lanczos3" });
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function resizeSingleChannel(bytes, sourceDimensions, targetDimensions, kernel) {
  const { data, info } = await sharp(bytes, { raw: { width: sourceDimensions[0], height: sourceDimensions[1], channels: 1 } })
    .resize(...targetDimensions, { kernel })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 1, "derived support masks must remain one-channel");
  assert.equal(data.length, targetDimensions[0] * targetDimensions[1], "derived support mask length drifted");
  return data;
}

async function buildMaster(contactMask) {
  const [{ data: source }, { data: candidateRaw }] = await Promise.all([
    rawRgba(sourceR8),
    rawRgba(candidatePath, { resize: [1024, 1024] }),
  ]);
  const riverMask = buildRiverMask();
  const riverPatched = Buffer.from(source);
  let riverChangedPixels = 0;
  for (let y = 0; y < 1024; y += 1) {
    for (let x = 0; x < 1024; x += 1) {
      const weight = riverMask[y * 1024 + x] / 255;
      if (weight === 0) continue;
      const sourceIndex = ((RIVER_RECT[1] + y) * MASTER[0] + RIVER_RECT[0] + x) * 4;
      const candidateIndex = (y * 1024 + x) * 4;
      let changed = false;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = Math.round(source[sourceIndex + channel] * (1 - weight) + candidateRaw[candidateIndex + channel] * weight);
        changed ||= value !== source[sourceIndex + channel];
        riverPatched[sourceIndex + channel] = value;
      }
      if (changed) riverChangedPixels += 1;
    }
  }

  const [lowPass, backing, contactClose] = await Promise.all([
    sharp(riverPatched, { raw: { width: MASTER[0], height: MASTER[1], channels: 4 } })
      .resize(CAPITAL[0], CAPITAL[1], { kernel: "lanczos3" })
      .resize(MASTER[0], MASTER[1], { kernel: "lanczos3" })
      .raw().toBuffer(),
    sharp(worldBackingPath)
      .extract({ left: 209, top: 0, width: 418, height: 314 })
      .resize(MASTER[0], MASTER[1], { kernel: "lanczos3" })
      .ensureAlpha().raw().toBuffer(),
    resizeSingleChannel(contactMask, CAPITAL, MASTER, "cubic"),
  ]);

  const output = Buffer.from(riverPatched);
  let transitionChangedPixels = 0;
  for (let pixel = 0; pixel < MASTER[0] * MASTER[1]; pixel += 1) {
    if (source[pixel * 4 + 3] === 0) continue;
    const edge = contactClose[pixel] >= 252 ? 0 : 1 - contactClose[pixel] / 255;
    if (edge <= 0) continue;
    const densityMix = 0.74 * edge;
    const registerMix = 0.12 * edge;
    let changed = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const index = pixel * 4 + channel;
      const reduced = riverPatched[index] * (1 - densityMix) + lowPass[index] * densityMix;
      const value = Math.round(reduced * (1 - registerMix) + backing[index] * registerMix);
      changed ||= value !== riverPatched[index];
      output[index] = value;
    }
    if (changed) transitionChangedPixels += 1;
  }
  return { output, riverMask, riverPatched, riverChangedPixels, source, transitionChangedPixels };
}

async function buildTier(tier, dimensions, masterRaw, affectedMasterMask) {
  const [{ data: previous }, candidate, affected] = await Promise.all([
    rawRgba(R8_TIER_PATHS[tier]),
    sharp(masterRaw, { raw: { width: MASTER[0], height: MASTER[1], channels: 4 } })
      .resize(...dimensions, { kernel: "lanczos3" }).raw().toBuffer(),
    resizeSingleChannel(affectedMasterMask, MASTER, dimensions, "nearest"),
  ]);
  const output = Buffer.alloc(previous.length);
  let changedPixels = 0;
  let outsideChangedPixels = 0;
  for (let pixel = 0; pixel < dimensions[0] * dimensions[1]; pixel += 1) {
    let changed = false;
    if (affected[pixel] !== 0) {
      for (let channel = 0; channel < 3; channel += 1) {
        const index = pixel * 4 + channel;
        changed ||= previous[index] !== candidate[index];
        output[index] = candidate[index];
      }
      output[pixel * 4 + 3] = candidate[pixel * 4 + 3];
    }
    if (changed) changedPixels += 1;
    if (affected[pixel] === 0) {
      const index = pixel * 4;
      outsideChangedPixels += Number(
        output[index] !== 0
        || output[index + 1] !== 0
        || output[index + 2] !== 0
        || output[index + 3] !== 0,
      );
    }
  }
  const bytes = await sharp(output, { raw: { width: dimensions[0], height: dimensions[1], channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
  return { bytes, changedPixels, outsideChangedPixels };
}

function buildAffectedMask(contactClose, riverMask) {
  const affected = Buffer.alloc(MASTER[0] * MASTER[1]);
  for (let pixel = 0; pixel < affected.length; pixel += 1) {
    if (contactClose[pixel] < 252) affected[pixel] = 255;
  }
  for (let y = 0; y < 1024; y += 1) {
    for (let x = 0; x < 1024; x += 1) {
      if (riverMask[y * 1024 + x] > 0) {
        affected[(RIVER_RECT[1] + y) * MASTER[0] + RIVER_RECT[0] + x] = 255;
      }
    }
  }
  return affected;
}

async function compositeCapital(sourceInput, maskInput) {
  const [{ data: source }, { data: backing }, mask] = await Promise.all([
    rawRgba(sourceInput, { resize: CAPITAL }),
    sharp(worldBackingPath)
      .extract({ left: 209, top: 0, width: 418, height: 314 })
      .resize(...CAPITAL, { kernel: "lanczos3" })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(maskInput).greyscale().raw().toBuffer(),
  ]);
  const output = Buffer.from(backing);
  for (let pixel = 0; pixel < CAPITAL[0] * CAPITAL[1]; pixel += 1) {
    const sourceAlpha = source[pixel * 4 + 3] / 255;
    const alpha = sourceAlpha * mask[pixel] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const index = pixel * 4 + channel;
      output[index] = Math.round(source[index] * alpha + backing[index] * (1 - alpha));
    }
    output[pixel * 4 + 3] = 255;
  }
  return sharp(output, { raw: { width: CAPITAL[0], height: CAPITAL[1], channels: 4 } }).png().toBuffer();
}

async function labeledPanel(bytes, width, height, label) {
  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="38" fill="#10181ddd"/><text x="16" y="27" font-family="Arial,sans-serif" font-size="22" fill="#fff">${label}</text></svg>`);
  return sharp(bytes).resize(width, height, { fit: "fill" }).composite([{ input: svg, top: 0, left: 0 }]).png().toBuffer();
}

function maskTransitionStats(mask) {
  const widths = [];
  for (let y = 0; y < CAPITAL[1]; y += 48) {
    let width = 0;
    while (width < CAPITAL[0] && mask[y * CAPITAL[0] + width] < 255) width += 1;
    widths.push(width);
  }
  for (let x = 0; x < CAPITAL[0]; x += 48) {
    let width = 0;
    while (width < CAPITAL[1] && mask[(CAPITAL[1] - 1 - width) * CAPITAL[0] + x] < 255) width += 1;
    widths.push(width);
  }
  widths.sort((left, right) => left - right);
  return { minimum: widths[0], median: widths[Math.floor(widths.length / 2)], maximum: widths.at(-1) };
}

function changedOutsideSupport(before, after, support) {
  let outside = 0;
  for (let pixel = 0; pixel < MASTER[0] * MASTER[1]; pixel += 1) {
      const index = pixel * 4;
      const changed = before[index] !== after[index]
        || before[index + 1] !== after[index + 1]
        || before[index + 2] !== after[index + 2]
        || before[index + 3] !== after[index + 3];
      if (!changed) continue;
      if (support[pixel] === 0) outside += 1;
  }
  return outside;
}

function riverPatchBorderMetrics(before, after) {
  const samples = [];
  for (let x = RIVER_RECT[0]; x < RIVER_RECT[0] + RIVER_RECT[2]; x += 1) samples.push([x, RIVER_RECT[1]]);
  for (let y = RIVER_RECT[1]; y < RIVER_RECT[1] + RIVER_RECT[3]; y += 1) {
    samples.push([RIVER_RECT[0], y], [RIVER_RECT[0] + RIVER_RECT[2] - 1, y]);
  }
  let luminanceDelta = 0;
  let saturationDelta = 0;
  for (const [x, y] of samples) {
    const index = (y * MASTER[0] + x) * 4;
    luminanceDelta += Math.abs(luminance(...before.subarray(index, index + 3)) - luminance(...after.subarray(index, index + 3)));
    saturationDelta += Math.abs(saturation(...before.subarray(index, index + 3)) - saturation(...after.subarray(index, index + 3)));
  }
  return {
    limitPercent: 6,
    topLeftRightLuminancePercent: Number((luminanceDelta / samples.length * 100).toFixed(4)),
    topLeftRightSaturationPercent: Number((saturationDelta / samples.length * 100).toFixed(4)),
    bottomEffectiveCompositePercent: 0,
  };
}

async function main() {
  const check = process.argv.includes("--check");
  const [contactMask, oldMask, inputManifest, candidateBytes, protectedEntries] = await Promise.all([
    Promise.resolve(buildContactMask()),
    sharp(contactR3).greyscale().raw().toBuffer(),
    readFile(inputManifestPath, "utf8").then(JSON.parse),
    readFile(candidatePath),
    Promise.all(PROTECTED_PATHS.map(async (relativePath) => ({ path: relativePath, sha256: sha256(await readFile(nodePath(relativePath))) }))),
  ]);
  assert.equal(inputManifest.source.sha256, sha256(await readFile(sourceR8)), "T40 input authority hash drifted");
  const master = await buildMaster(contactMask);
  const contactClose = await resizeSingleChannel(contactMask, CAPITAL, MASTER, "nearest");
  const affectedMasterMask = buildAffectedMask(contactClose, master.riverMask);
  const masterBytes = await sharp(master.output, { raw: { width: MASTER[0], height: MASTER[1], channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const contactBytes = await sharp(contactMask, { raw: { width: CAPITAL[0], height: CAPITAL[1], channels: 1 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const affectedSupportBytes = await sharp(affectedMasterMask, { raw: { width: MASTER[0], height: MASTER[1], channels: 1 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const tierResults = Object.fromEntries(await Promise.all(Object.entries(TIERS).map(async ([tier, dimensions]) => [
    tier,
    await buildTier(tier, dimensions, master.output, affectedMasterMask),
  ])));
  const sources = Object.fromEntries(Object.entries(TIERS).map(([tier, dimensions]) => {
    const filename = `ninjaone-environment-geology-transition-${tier}-r1.webp`;
    return [tier, {
      path: `/career-world/capitals/ninjaone/environment/plates/geology/${filename}?v=${sha256(tierResults[tier].bytes).slice(0, 12)}`,
      dimensions,
      sha256: sha256(tierResults[tier].bytes).toUpperCase(),
    }];
  }));

  const oldBlueBottom = countBlueBottom(master.source);
  const newBlueBottom = countBlueBottom(master.output);
  assert(
    oldBlueBottom > 0 && newBlueBottom <= Math.max(12, oldBlueBottom * 0.005),
    `river must resolve before the detailed-region bottom edge (${oldBlueBottom} -> ${newBlueBottom})`,
  );
  assert(Object.values(tierResults).every(({ outsideChangedPixels }) => outsideChangedPixels === 0), "tier pixels changed outside T40 support");
  const transitionStats = maskTransitionStats(contactMask);
  const previousStats = maskTransitionStats(oldMask);
  assert(transitionStats.median >= FEATHER_CAPITAL_PX * 0.8, "contact transition is not wide enough");
  assert(transitionStats.median >= previousStats.median * 4, "contact transition did not materially widen");
  const affectedMasterRects = [[0, 0, TRANSITION_MASTER_PX, MASTER[1]], [MASTER[0] - TRANSITION_MASTER_PX, 0, TRANSITION_MASTER_PX, MASTER[1]], [0, MASTER[1] - TRANSITION_MASTER_PX, MASTER[0], TRANSITION_MASTER_PX], RIVER_RECT];
  const outsideChangedPixels = changedOutsideSupport(master.source, master.output, affectedMasterMask);
  const patchBorders = riverPatchBorderMetrics(master.source, master.riverPatched);
  assert.equal(outsideChangedPixels, 0, "master pixels changed outside T40 extents");
  assert(
    Math.max(patchBorders.topLeftRightLuminancePercent, patchBorders.topLeftRightSaturationPercent, patchBorders.bottomEffectiveCompositePercent) <= patchBorders.limitPercent,
    "river patch border register exceeds the 6% gate",
  );

  const transitionManifest = {
    schemaVersion: 1,
    id: "career-world/terrain-transition-interim@r1",
    status: "INTERIM-owner-guard-treatment",
    ownerVerdict: "its not respecting the landscape",
    ownerDecision: "OPEN OWNER DECISION: retain interim only or bring forward a capital apron; full terrain pass remains deferred until post-territories",
    imageGen: { callsUsed: 1, cap: 4, riverCallsUsed: 1, riverCap: 2, edgeCallsUsed: 0, edgeCap: 2, candidateSha256: sha256(candidateBytes), prompt: IMAGEGEN_PROMPT },
    sources: { previous: "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png", current: "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r9.png" },
    boundaryCensus: {
      contacts: [
        { side: "left", disposition: "backing-contact-wide-transition" },
        { side: "right", disposition: "backing-contact-wide-transition" },
        { side: "bottom", disposition: "backing-contact-wide-transition-with-river-sink" },
        { side: "top", disposition: "alpha-land-silhouette-and-ocean-not-backing-contact" },
      ],
      previousFeatherPixels: 28,
      featherPixels: FEATHER_CAPITAL_PX,
      previousTransitionWidths: previousStats,
      transitionWidths: transitionStats,
    },
    changedPixelPolicy: {
      affectedMasterRects,
      affectedSupportMaskPath: "/career-world/capitals/ninjaone/environment/masks/terrain-transition-interim-support-r1.png",
      affectedSupportMaskSha256: sha256(affectedSupportBytes),
      outsideChangedPixels,
      riverChangedPixels: master.riverChangedPixels,
      transitionChangedPixels: master.transitionChangedPixels,
    },
    patchBorders,
    riverExit: { sourceRect: RIVER_RECT, blueBottomPixelsBefore: oldBlueBottom, blueBottomPixelsAfter: newBlueBottom, resolution: "rocky-gorge-sink-before-edge" },
    tiers: Object.fromEntries(Object.entries(tierResults).map(([tier, value]) => [tier, { ...sources[tier], changedPixels: value.changedPixels, outsideChangedPixels: value.outsideChangedPixels }])),
    protectedFiles: protectedEntries,
  };

  const environmentManifest = JSON.parse(await readFile(environmentManifestPath, "utf8"));
  environmentManifest.layers.geology.sourcePath = "/art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png";
  environmentManifest.layers.geology.sourceSha256 = sha256(await readFile(sourceR8)).toUpperCase();
  environmentManifest.layers.geology.sources = Object.fromEntries(await Promise.all(Object.entries(TIERS).map(async ([tier, dimensions]) => {
    const bytes = await readFile(R8_TIER_PATHS[tier]);
    return [tier, {
      path: `/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-${tier}-r8.webp?v=${sha256(bytes).slice(0, 12)}`,
      dimensions,
      sha256: sha256(bytes).toUpperCase(),
    }];
  })));
  environmentManifest.layers.geology.contactMask = {
    path: "/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-contact-r4.png",
    sha256: sha256(contactBytes).toUpperCase(),
    dimensions: CAPITAL,
    featherPixels: FEATHER_CAPITAL_PX,
    contactEdges: ["left", "right", "bottom"],
    shape: "deterministic-wide-atmospheric-irregular",
    previousPath: "/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-contact-r3.png",
  };
  environmentManifest.layers.geology.transitionTreatment = {
    id: transitionManifest.id,
    status: transitionManifest.status,
    manifestPath: "/career-world/capitals/ninjaone/environment/manifests/terrain-transition-interim-r1.json",
    originalSourcePath: `/${transitionManifest.sources.previous}`,
    derivedSourcePath: `/${transitionManifest.sources.current}`,
    sources,
    riverResolution: transitionManifest.riverExit.resolution,
    fullTerrainPassDecision: "OPEN OWNER DECISION",
  };

  const outputs = new Map([
    [sourceR9, masterBytes],
    [contactR4, contactBytes],
    [affectedSupportPath, affectedSupportBytes],
    [transitionManifestPath, Buffer.from(`${JSON.stringify(transitionManifest, null, 2)}\n`)],
    [environmentManifestPath, Buffer.from(`${JSON.stringify(environmentManifest, null, 2)}\n`)],
    ...Object.keys(TIERS).map((tier) => [nodePath(`public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-transition-${tier}-r1.webp`), tierResults[tier].bytes]),
  ]);
  const evidence = await buildEvidence(outputs, transitionManifest, contactMask);
  for (const [relativePath, bytes] of Object.entries(evidence)) outputs.set(nodePath(relativePath), bytes);
  outputs.set(nodePath(".codex-tmp/quarantine/terrain/T40-terrain-transition-interim/prompts.json"), Buffer.from(`${JSON.stringify({ riverExitC1: IMAGEGEN_PROMPT }, null, 2)}\n`));

  if (check) {
    for (const [outputPath, expected] of outputs) {
      const actual = await readFile(outputPath);
      assert.equal(sha256(actual), sha256(expected), `${path.relative(root, outputPath)} is stale`);
    }
  } else {
    await Promise.all([mkdir(outputRoot, { recursive: true }), mkdir(qaRoot, { recursive: true }), mkdir(quarantineRoot, { recursive: true }), mkdir(path.dirname(sourceR9), { recursive: true })]);
    for (const [outputPath, bytes] of outputs) await writeFile(outputPath, bytes);
  }
  console.log(JSON.stringify(transitionManifest, null, 2));
}

function countBlueBottom(raw) {
  let count = 0;
  for (let y = MASTER[1] - 96; y < MASTER[1]; y += 1) {
    for (let x = 3600; x < 4700; x += 1) {
      const index = (y * MASTER[0] + x) * 4;
      const [r, g, b, a] = raw.subarray(index, index + 4);
      if (a > 32 && b - r > 18 && b >= g - 2) count += 1;
    }
  }
  return count;
}

async function buildEvidence(outputs, report, contactMask) {
  const before = await compositeCapital(R8_TIER_PATHS.capital, contactR3);
  const transitionCapitalPath = nodePath("public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-transition-capital-r1.webp");
  const temporaryTransition = outputs.get(transitionCapitalPath);
  const temporaryCapital = await sharp(R8_TIER_PATHS.capital)
    .composite([{ input: temporaryTransition, blend: "over" }])
    .png()
    .toBuffer();
  const temporaryContact = await sharp(contactMask, { raw: { width: CAPITAL[0], height: CAPITAL[1], channels: 1 } }).png().toBuffer();
  const after = await compositeCapital(temporaryCapital, temporaryContact);
  const beforeRiver = await sharp(before).extract({ left: 820, top: 760, width: 420, height: 320 }).resize(840, 640).png().toBuffer();
  const afterRiver = await sharp(after).extract({ left: 820, top: 760, width: 420, height: 320 }).resize(840, 640).png().toBuffer();
  const beforeEdge = await sharp(before).extract({ left: 0, top: 760, width: 1440, height: 320 }).resize(1440, 640).png().toBuffer();
  const afterEdge = await sharp(after).extract({ left: 0, top: 760, width: 1440, height: 320 }).resize(1440, 640).png().toBuffer();
  const censusSvg = Buffer.from(`<svg width="1440" height="1080" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="1436" height="1076" fill="none" stroke="#ffcf40" stroke-width="8"/><path d="M 4 0 V 1080 M 1436 0 V 1080 M 0 1076 H 1440" stroke="#ff3f7f" stroke-width="12" fill="none"/><text x="35" y="70" font-family="Arial" font-size="34" fill="#fff">LEFT backing contact</text><text x="1020" y="70" font-family="Arial" font-size="34" fill="#fff">RIGHT backing contact</text><text x="470" y="1040" font-family="Arial" font-size="34" fill="#fff">BOTTOM backing contact + river exit</text><text x="470" y="55" font-family="Arial" font-size="30" fill="#fff">TOP: alpha land/ocean silhouette, not backing contact</text></svg>`);
  const census = await sharp(before).composite([{ input: censusSvg }]).png().toBuffer();
  const panels = await Promise.all([
    labeledPanel(before, 580, 435, "BEFORE - 28px edge"),
    labeledPanel(after, 580, 435, "AFTER - 176px ramp"),
    labeledPanel(beforeRiver, 580, 400, "RIVER BEFORE - blue reaches edge"),
    labeledPanel(afterRiver, 580, 400, "RIVER AFTER - gorge sink"),
  ]);
  const sheet = await sharp({ create: { width: 1200, height: 875, channels: 4, background: "#11191e" } })
    .composite([
      { input: panels[0], left: 10, top: 10 }, { input: panels[1], left: 610, top: 10 },
      { input: panels[2], left: 10, top: 465 }, { input: panels[3], left: 610, top: 465 },
    ]).png().toBuffer();
  return {
    ".codex-tmp/qa/T40/boundary-census-overlay.png": census,
    ".codex-tmp/qa/T40/boundary-census.json": Buffer.from(`${JSON.stringify(report.boundaryCensus, null, 2)}\n`),
    ".codex-tmp/qa/T40/river-before.png": beforeRiver,
    ".codex-tmp/qa/T40/river-after.png": afterRiver,
    ".codex-tmp/qa/T40/edge-before-owner-zoom.png": beforeEdge,
    ".codex-tmp/qa/T40/edge-after-owner-zoom.png": afterEdge,
    ".codex-tmp/qa/T40/full-region-before.png": before,
    ".codex-tmp/qa/T40/full-region-after.png": after,
    ".codex-tmp/qa/T40/owner-sheet-1200.png": sheet,
    ".codex-tmp/qa/T40/build-report.json": Buffer.from(`${JSON.stringify(report, null, 2)}\n`),
    ".codex-tmp/quarantine/terrain/T40-terrain-transition-interim/contact-mask-r4-preview.png": await sharp(contactMask, { raw: { width: CAPITAL[0], height: CAPITAL[1], channels: 1 } }).png().toBuffer(),
  };
}

await main();
