import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const qaOutput = path.join(root, ".codex-tmp/qa/T4g-r2-mask-wide-feather");
const publicOutput = path.join(root, "public/career-world/capitals/ninjaone/city-v2/plates");
const waterCutMaskRelative = "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r1.png";
const r2MaskRelative = "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r2.png";
const r2RegistrationRelative = "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r2.json";
const r2ProvenanceRelative = "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-r2.provenance.json";
const maskName = "d05-anchor-cover-usable-mask-r3.png";
const registrationName = "d05-anchor-cover-registration-r3.json";
const provenanceName = "d05-anchor-cover-r3.provenance.json";
const expectedSourceHashes = Object.freeze({
  waterCutShorelineMask: "bd9ad25bdab85eeaf9488cac7ddf10385058724623deb84aa3aa10b53353b3c4",
  r2Mask: "5deca30098e71dbdf839d2df0dba7ebc0887fea70384c75868896694db3aa4f4",
});
const shorelineExclusionRawPixels = 2;
const wideInlandFeatherMasterPixels = 48;
const hardEdgeMinimumDropDistanceMasterPixels = 24;
const hardEdgeMinimumStraightRunMasterPixels = 40;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (relative) => sha256(await readFile(path.join(root, relative)));
const sourceRecord = (relative, hash) => ({ path: relative, sha256: hash });
const round = (value) => Number(value.toFixed(6));

function wideInlandBoundaryAlpha(dimensions, r2Registration) {
  const [width, height] = dimensions;
  const [scaleX, scaleY] = r2Registration.candidateToMasterArtboardComposed.scale;
  const { southOpaqueRawY, southTransparentRawY } = r2Registration.mask.inlandBoundaryExtraction;
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const north = Math.min(1, Math.max(0, (y + 0.5) * scaleY / wideInlandFeatherMasterPixels));
    const south = y <= southOpaqueRawY ? 1 : Math.max(0,
      Math.min(1, (southTransparentRawY - (y + 0.5)) / (southTransparentRawY - southOpaqueRawY)));
    for (let x = 0; x < width; x += 1) {
      const east = Math.min(1, Math.max(0,
        (width - 0.5 - x) * scaleX / wideInlandFeatherMasterPixels));
      alpha[y * width + x] = Math.round(255 * north * east * south);
    }
  }
  return {
    alpha,
    extraction: {
      method: "r2-composition-wide-master-space-inland-feather",
      northEastMasterPixels: wideInlandFeatherMasterPixels,
      northRawPixels: round(wideInlandFeatherMasterPixels / scaleY),
      eastRawPixels: round(wideInlandFeatherMasterPixels / scaleX),
      southOpaqueRawY,
      southTransparentRawY,
      registeredWaterShorelineExclusionRawPixels: shorelineExclusionRawPixels,
    },
  };
}

function qualifyingRunFlags(values, scale) {
  const flags = new Uint8Array(values.length);
  let qualifyingStraightRuns = 0;
  let longestMasterRun = 0;
  let start = 0;
  while (start < values.length) {
    if (!values[start]) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < values.length && values[end]) end += 1;
    const masterLength = (end - start) * scale;
    longestMasterRun = Math.max(longestMasterRun, masterLength);
    if (masterLength > hardEdgeMinimumStraightRunMasterPixels) {
      flags.fill(1, start, end);
      qualifyingStraightRuns += 1;
    }
    start = end;
  }
  return { flags, qualifyingStraightRuns, longestMasterRun: round(longestMasterRun) };
}

function candidateRegisteredWater(raw, rawDimensions, dimensions, registration) {
  const [rawWidth, rawHeight] = rawDimensions;
  const [width, height] = dimensions;
  const { offset, scale } = registration.candidateToMasterArtboardComposed;
  const binary = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const masterX = offset[0] + (x + 0.5) * scale[0];
    const masterY = offset[1] + (y + 0.5) * scale[1];
    if (masterX >= 0 && masterX < rawWidth && masterY >= 0 && masterY < rawHeight) {
      binary[y * width + x] = raw[Math.floor(masterY) * rawWidth + Math.floor(masterX)] >= 128 ? 1 : 0;
    }
  }
  return binary;
}

function distanceToWater(water, dimensions, x, y, radius = 2) {
  const [width, height] = dimensions;
  let closest = Infinity;
  for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
    const sourceX = x + dx;
    const sourceY = y + dy;
    if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height && water[sourceY * width + sourceX]) {
      closest = Math.min(closest, Math.max(Math.abs(dx), Math.abs(dy)));
    }
  }
  return closest;
}

function hardEdgeMetrics(mask, waterCutMask, inlandEligible, dimensions, masterScale) {
  const [width, height] = dimensions;
  const [scaleX, scaleY] = masterScale;
  const inspectDirection = (horizontal) => {
    const acrossScale = horizontal ? scaleY : scaleX;
    const stepScale = horizontal ? scaleX : scaleY;
    const stepLimit = Math.ceil(hardEdgeMinimumDropDistanceMasterPixels / stepScale);
    const across = horizontal ? height : width;
    const along = horizontal ? width : height;
    let rapidDropSamples = 0;
    let qualifyingStraightRuns = 0;
    let longestStraightMasterRun = 0;
    for (let step = 1; step <= stepLimit; step += 1) for (let boundary = 0; boundary + step < along; boundary += 1) {
      if (step * stepScale >= hardEdgeMinimumDropDistanceMasterPixels) continue;
      const eligibleRun = [];
      const rapidRun = [];
      for (let cross = 0; cross < across; cross += 1) {
        const [x, y] = horizontal ? [boundary, cross] : [cross, boundary];
        const [nextX, nextY] = horizontal ? [boundary + step, cross] : [cross, boundary + step];
        const first = y * width + x;
        const second = nextY * width + nextX;
        const eligible = waterCutMask[first] > 200
          && waterCutMask[second] > 200
          && inlandEligible[first]
          && inlandEligible[second];
        eligibleRun.push(eligible);
        rapidRun.push(eligible && ((mask[first] > 200 && mask[second] < 30)
          || (mask[second] > 200 && mask[first] < 30)));
      }
      const qualifying = qualifyingRunFlags(eligibleRun, acrossScale);
      qualifyingStraightRuns += qualifying.qualifyingStraightRuns;
      longestStraightMasterRun = Math.max(longestStraightMasterRun, qualifying.longestMasterRun);
      for (let cross = 0; cross < across; cross += 1) {
        if (qualifying.flags[cross] && rapidRun[cross]) rapidDropSamples += 1;
      }
    }
    return {
      direction: horizontal ? "horizontal-boundary" : "vertical-boundary",
      maximumCheckedDropDistanceMasterPixels: round((stepLimit - 1) * stepScale),
      qualifyingStraightRuns,
      longestStraightMasterRun,
      rapidDropSamples,
    };
  };
  const directions = [inspectDirection(true), inspectDirection(false)];
  const rapidDropSamples = directions.reduce((total, direction) => total + direction.rapidDropSamples, 0);
  assert.equal(rapidDropSamples, 0,
    `Inland hard-edge check failed: alpha drops from >200 to <30 in fewer than ${hardEdgeMinimumDropDistanceMasterPixels} master px.`);
  return {
    minimumStraightRunMasterPixels: hardEdgeMinimumStraightRunMasterPixels,
    minimumDropDistanceMasterPixels: hardEdgeMinimumDropDistanceMasterPixels,
    rapidDropSamples,
    directions,
  };
}

function inspectMask(mask, r2Mask, waterCutMask, wideInlandMask, inlandEligible, dimensions, anchors, masterScale) {
  const [width, height] = dimensions;
  let nonZero = 0;
  let opaque = 0;
  let transition = 0;
  let r2CompositionFailures = 0;
  let commonSolidSamples = 0;
  let commonSolidFailures = 0;
  let shorelineBandPixels = 0;
  let shorelineBandMaxDelta = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixel = y * width + x;
    const value = mask[pixel];
    if (value > 0) nonZero += 1;
    if (value === 255) opaque += 1;
    if (value > 0 && value < 255) transition += 1;
    const expected = inlandEligible[pixel]
      ? Math.min(waterCutMask[pixel], wideInlandMask[pixel])
      : r2Mask[pixel];
    if (value !== expected) r2CompositionFailures += 1;
    if (r2Mask[pixel] > 0 && r2Mask[pixel] < 255 && !inlandEligible[pixel]) {
      shorelineBandPixels += 1;
      shorelineBandMaxDelta = Math.max(shorelineBandMaxDelta, Math.abs(value - r2Mask[pixel]));
    }
    if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) continue;
    let commonSolid = true;
    for (let dy = -2; dy <= 2 && commonSolid; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const neighbor = (y + dy) * width + x + dx;
      if (r2Mask[neighbor] !== 255 || wideInlandMask[neighbor] !== 255) commonSolid = false;
    }
    if (commonSolid) {
      commonSolidSamples += 1;
      if (value !== 255) commonSolidFailures += 1;
    }
  }
  assert.equal(r2CompositionFailures, 0,
    "Mask must replace only r2's inland feather while retaining the r2 registered-water coast exactly.");
  assert.ok(commonSolidSamples > 0, "F16 requires common solid interior samples.");
  assert.equal(commonSolidFailures, 0, "F16 common solid interior samples must remain opaque.");
  assert.ok(shorelineBandPixels > 0, "The r1 shoreline band is unexpectedly empty.");
  assert.equal(shorelineBandMaxDelta, 0, "The r1 shoreline transition band must remain byte-identical.");
  const anchorAlphas = anchors.map(({ id, candidatePixelSpace: { center } }) => {
    const x = Math.floor(center[0]);
    const y = Math.floor(center[1]);
    const alpha = mask[y * width + x];
    assert.equal(alpha, 255, `Mounted ${id} anchor must remain fully opaque.`);
    return { id, candidatePixel: [x, y], alpha };
  });
  return {
    f16SolidityAndCoverage: {
      decodedChannelCountExpected: 1,
      nonZeroPixels: nonZero,
      fullyOpaquePixels: opaque,
      usableFraction: round(nonZero / mask.length),
      transitionPixels: transition,
      commonSolidInteriorSamples: commonSolidSamples,
      commonSolidInteriorFailures: commonSolidFailures,
    },
    r2CompositionFailures,
    registeredWaterCoastBand: { pixels: shorelineBandPixels, maxAlphaDeltaVsR2: shorelineBandMaxDelta },
    anchors: anchorAlphas,
    hardEdge: hardEdgeMetrics(mask, waterCutMask, inlandEligible, dimensions, masterScale),
  };
}

async function encodeMask(mask, dimensions) {
  const [width, height] = dimensions;
  const png = await sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } })
    .toColourspace("b-w").png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const decoded = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([decoded.info.width, decoded.info.height, decoded.info.channels], [width, height, 1]);
  assert.deepEqual(decoded.data, Buffer.from(mask), "F16 PNG decode differs from the computed single-channel mask.");
  return png;
}

function updatedRegistration(r2Registration, maskHash, metrics, sourceHashes, extraction) {
  const updated = structuredClone(r2Registration);
  updated.id = "ninjaone-d05-anchor-cover@r3";
  updated.mask = {
    ...updated.mask,
    path: `/career-world/capitals/ninjaone/city-v2/plates/${maskName}`,
    sha256: maskHash,
    waterCutShorelineMask: sourceRecord(waterCutMaskRelative, sourceHashes.waterCutShorelineMask),
    previousR2Mask: sourceRecord(r2MaskRelative, sourceHashes.r2Mask),
    wideInlandFeather: extraction,
  };
  delete updated.mask.inlandBoundaryAlphaMask;
  delete updated.mask.inlandBoundaryResampling;
  delete updated.mask.inlandBoundaryExtraction;
  updated.districtMask = {
    ...updated.districtMask,
    derivation: "r2 registered-water composition with only its inland north/east feather replaced by a 48-master-pixel field; registered-water coast-band pixels remain byte-identical to r2",
    f16SolidityAndCoverage: metrics.f16SolidityAndCoverage,
    registeredWaterCoastBand: metrics.registeredWaterCoastBand,
    inlandHardEdge: metrics.hardEdge,
  };
  delete updated.districtMask.shorelineBand;
  const unchanged = structuredClone(updated);
  unchanged.id = r2Registration.id;
  unchanged.mask = r2Registration.mask;
  unchanged.districtMask = r2Registration.districtMask;
  assert.deepEqual(unchanged, r2Registration, "r3 registration changed outside its id, mask, and district-mask records.");
  return updated;
}

async function build() {
  const [r2RegistrationText, r2ProvenanceText, r2MaskHash, waterCutHash, r2MaskDecoded, waterCutDecoded] = await Promise.all([
    readFile(path.join(root, r2RegistrationRelative), "utf8"),
    readFile(path.join(root, r2ProvenanceRelative), "utf8"),
    hashFile(r2MaskRelative),
    hashFile(waterCutMaskRelative),
    sharp(path.join(root, r2MaskRelative)).greyscale().raw().toBuffer({ resolveWithObject: true }),
    sharp(path.join(root, waterCutMaskRelative)).greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(r2MaskHash, expectedSourceHashes.r2Mask, "The r2 composition source hash changed; review before rebuilding.");
  assert.equal(waterCutHash, expectedSourceHashes.waterCutShorelineMask, "The r1 water-cut source hash changed; review before rebuilding.");
  const r2Registration = JSON.parse(r2RegistrationText);
  const r2Provenance = JSON.parse(r2ProvenanceText);
  const dimensions = r2Registration.mask.dimensions;
  const [width, height] = dimensions;
  assert.deepEqual([r2MaskDecoded.info.width, r2MaskDecoded.info.height, r2MaskDecoded.info.channels], [width, height, 1]);
  assert.deepEqual([waterCutDecoded.info.width, waterCutDecoded.info.height, waterCutDecoded.info.channels], [width, height, 1]);
  const registeredWaterRelative = r2Registration.mask.registeredL3Water.path;
  assert.equal(await hashFile(registeredWaterRelative), r2Registration.mask.registeredL3Water.sha256,
    "The registered L3 water source hash no longer matches the r2 registration.");
  const registeredWaterDecoded = await sharp(path.join(root, registeredWaterRelative)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const registeredWater = candidateRegisteredWater(registeredWaterDecoded.data,
    [registeredWaterDecoded.info.width, registeredWaterDecoded.info.height], dimensions, r2Registration);
  const inlandEligible = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    inlandEligible[y * width + x] = distanceToWater(registeredWater, dimensions, x, y, shorelineExclusionRawPixels) > shorelineExclusionRawPixels ? 1 : 0;
  }
  const wideInland = wideInlandBoundaryAlpha(dimensions, r2Registration);
  const mask = new Uint8Array(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    mask[pixel] = inlandEligible[pixel]
      ? Math.min(waterCutDecoded.data[pixel], wideInland.alpha[pixel])
      : r2MaskDecoded.data[pixel];
  }
  const metrics = inspectMask(mask, r2MaskDecoded.data, waterCutDecoded.data, wideInland.alpha, inlandEligible, dimensions,
    r2Registration.anchors, r2Registration.candidateToMasterArtboardComposed.scale);
  const png = await encodeMask(mask, dimensions);
  const sourceHashes = { r2Mask: r2MaskHash, waterCutShorelineMask: waterCutHash };
  const registration = updatedRegistration(r2Registration, sha256(png), metrics, sourceHashes, wideInland.extraction);
  const provenance = {
    ...r2Provenance,
    id: "ninjaone-d05-anchor-cover@r3-provenance",
    sourceHashes: {
      ...r2Provenance.sourceHashes,
      maskInputs: {
        previousR2Mask: sourceRecord(r2MaskRelative, r2MaskHash),
        waterCutShorelineMask: sourceRecord(waterCutMaskRelative, waterCutHash),
      },
    },
    baseR2Provenance: sourceRecord(r2ProvenanceRelative, sha256(Buffer.from(r2ProvenanceText))),
    maskDerivation: {
      method: "r2-registered-water-composition-plus-wide-inland-feather",
      sourceHashes,
      wideInlandFeather: wideInland.extraction,
      determinism: { twoIndependentEncodesByteIdentical: true, outputSha256: sha256(png) },
      metrics,
    },
  };
  return { png, registration, provenance, metrics };
}

async function main() {
  await mkdir(path.join(qaOutput, "determinism"), { recursive: true });
  const [first, second] = await Promise.all([build(), build()]);
  assert.deepEqual(first.png, second.png, "Two independent r3 mask encodes differ.");
  assert.deepEqual(first.metrics, second.metrics, "Two independent r3 mask inspections differ.");
  const maskHash = sha256(first.png);
  await Promise.all([
    writeFile(path.join(qaOutput, maskName), first.png),
    writeFile(path.join(qaOutput, "determinism", maskName), second.png),
    writeFile(path.join(publicOutput, maskName), first.png),
    writeFile(path.join(publicOutput, registrationName), `${JSON.stringify(first.registration, null, 2)}\n`),
    writeFile(path.join(publicOutput, provenanceName), `${JSON.stringify(first.provenance, null, 2)}\n`),
  ]);
  assert.equal(await hashFile(`public/career-world/capitals/ninjaone/city-v2/plates/${maskName}`), maskHash,
    "Promoted r3 mask differs from the deterministic output.");
  console.log(JSON.stringify({ deterministic: true, maskHash, ...first.metrics }, null, 2));
}

await main();
