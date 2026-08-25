import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const output = path.join(root, ".codex-tmp/qa/T4e-b-register-mount");
const publicOutput = path.join(root, "public/career-world/capitals/ninjaone/city-v2/plates");
const candidateRelative = ".codex-tmp/quarantine/city-v2/T4d-shore-scale/continuation/candidates/candidate-b-anchor-cover-raw.png";
const continuationRelative = ".codex-tmp/quarantine/city-v2/T4d-shore-scale/continuation";
const proofManifestRelative = `${continuationRelative}/proof-manifest.json`;
const promptsRelative = `${continuationRelative}/prompts.json`;
const scaffoldRelative = `${continuationRelative}/d05-anchor-cover-scaffold-r1.png`;
const candidateDRelative = ".codex-tmp/quarantine/city-v2/T4d-shore-scale/candidates/candidate-d-scale-raw.png";
const silhouetteRelative = ".codex-tmp/qa/T4/shore-measure-2/extended-land-silhouette-r1.png";
const registeredWaterRelative = "public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png";
const candidate = path.join(root, candidateRelative);
const silhouette = path.join(root, silhouetteRelative);
const registeredWater = path.join(root, registeredWaterRelative);
const plateName = "d05-anchor-cover-r1.png";
const maskName = "d05-anchor-cover-usable-mask-r1.png";
const registrationName = "d05-anchor-cover-registration-r1.json";
const provenanceName = "d05-anchor-cover-r1.provenance.json";
const dimensions = [1305, 1205];
const bounds = [-270, 413, 691, 1300];
const masterDimensions = [961, 887];
const artboard = [1448, 1086];
const scale = [masterDimensions[0] / dimensions[0], masterDimensions[1] / dimensions[1]];
const offset = [bounds[0], bounds[1]];
const ownerAcceptanceNote = "OWNER ACCEPTANCE (Steve, 2026-08-25): continuation candidate B ACCEPTED as the D05 composition authority — with recorded debt. Acceptance granted on the F24-compliant evidence set (masked preview over the registered backdrop, worst-coast 2x crop, gate overlays) — framing recorded: full-district and 2x shore crops, not in-app. Director's supporting analysis: B's 62.89% coastline conformity is ~5:1 the harmless class (painted land outgrowing the true coast, mask-cut at mount; 60.3% of samples) vs the material class (painted water intruding on true land; 13.0%, localized). Steve's caveat, logged as standing debt: coast refinement pass after the pyramid work — the coast has areas that look rough. I liked the docks on the shore — B's fresh shore is barer than the old plate's dock-apron treatment; the refinement pass restores docks/shore dressing.";

const anchors = [
  ["S01", "gopher foundry", [908, 374, 1157, 635], 0.6662],
  ["S10", "red tiered works", [500, 296, 740, 573], 2.3214],
  ["S11", "whale-crane warehouse", [1058, 562, 1305, 760], 2.9454],
  ["S15", "scroll archive", [621, 73, 889, 362], 1.0224],
  ["S18", "hex wheel mill", [956, 549, 1220, 759], 1.2037],
];
const spriteRelative = Object.fromEntries(
  anchors.map(([id]) => [id, `public/career-world/capitals/ninjaone/city-v2/sprites/${id.toLowerCase()}-sprite-r1.png`]),
);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (relative) => sha256(await readFile(path.join(root, relative)));
const round = (value) => Number(value.toFixed(6));
const mapPoint = ([x, y]) => [round(offset[0] + x * scale[0]), round(offset[1] + y * scale[1])];
const mapBox = ([left, top, right, bottom]) => [...mapPoint([left, top]), ...mapPoint([right, bottom])];
const center = ([left, top, right, bottom]) => [(left + right) / 2, (top + bottom) / 2];
const pixelIndex = (x, y) => y * dimensions[0] + x;

function sourceRecord(relative, hash) {
  return { path: relative, sha256: hash };
}

function feather(binary) {
  const [width, height] = dimensions;
  const weights = [1, 4, 6, 4, 1];
  const result = new Uint8Array(binary.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        sum += binary[pixelIndex(sx, sy)] * weights[dx + 2] * weights[dy + 2];
      }
    }
    result[pixelIndex(x, y)] = Math.round(sum * 255 / 256);
  }
  return result;
}

function waterDistance(waterBinary, x, y, radius = 3) {
  let closest = Infinity;
  for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
    const sx = x + dx;
    const sy = y + dy;
    if (sx < 0 || sx >= dimensions[0] || sy < 0 || sy >= dimensions[1]) continue;
    if (waterBinary[pixelIndex(sx, sy)]) closest = Math.min(closest, Math.max(Math.abs(dx), Math.abs(dy)));
  }
  return closest;
}

function inspectMask(mask, binary, waterBinary) {
  let nonZero = 0;
  let opaque = 0;
  let solidLandSamples = 0;
  let solidLandFailures = 0;
  let registeredWaterOpaque = 0;
  let distantRegisteredWaterNonZero = 0;
  let transitionPixels = 0;
  for (let y = 0; y < dimensions[1]; y += 1) for (let x = 0; x < dimensions[0]; x += 1) {
    const index = pixelIndex(x, y);
    const value = mask[index];
    if (value > 0) nonZero += 1;
    if (value === 255) opaque += 1;
    if (value > 0 && value < 255) transitionPixels += 1;
    if (waterBinary[index]) {
      if (value === 255) registeredWaterOpaque += 1;
      if (waterDistance(waterBinary, x, y) >= 3 && value !== 0) distantRegisteredWaterNonZero += 1;
    }
    if (!binary[index] || x < 3 || y < 3 || x >= dimensions[0] - 3 || y >= dimensions[1] - 3) continue;
    let solid = true;
    for (let dy = -2; dy <= 2 && solid; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      if (!binary[pixelIndex(x + dx, y + dy)]) solid = false;
    }
    if (solid) {
      solidLandSamples += 1;
      if (value !== 255) solidLandFailures += 1;
    }
  }
  assert.ok(solidLandSamples > 0, "F16 requires solid registered-land samples.");
  assert.equal(solidLandFailures, 0, "F16 solid registered-land pixels must remain opaque.");
  assert.equal(registeredWaterOpaque, 0, "Registered L3 water must not be fully covered by the D05 plate.");
  assert.equal(distantRegisteredWaterNonZero, 0, "Only the explicit shoreline feather band may overlap registered L3 water.");
  return {
    decodedChannelCountExpected: 1,
    nonZeroPixels: nonZero,
    fullyOpaquePixels: opaque,
    usableFraction: round(nonZero / mask.length),
    transitionPixels,
    solidRegisteredLandSamples: solidLandSamples,
    solidRegisteredLandFailures: solidLandFailures,
    registeredL3WaterFullyOpaquePixels: registeredWaterOpaque,
    registeredL3WaterDistantNonZeroPixels: distantRegisteredWaterNonZero,
    shorelineFeatherRawPixels: 2,
  };
}

async function buildMask(destination) {
  const [silhouetteRaw, waterRaw] = await Promise.all([
    sharp(silhouette).removeAlpha().greyscale().resize(dimensions[0], dimensions[1], { kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true }),
    sharp(registeredWater).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(silhouetteRaw.info.channels, 1);
  assert.deepEqual([waterRaw.info.width, waterRaw.info.height, waterRaw.info.channels], [...artboard, 1]);
  const binary = new Uint8Array(dimensions[0] * dimensions[1]);
  const waterBinary = new Uint8Array(binary.length);
  for (let y = 0; y < dimensions[1]; y += 1) for (let x = 0; x < dimensions[0]; x += 1) {
    const masterX = offset[0] + (x + 0.5) * scale[0];
    const masterY = offset[1] + (y + 0.5) * scale[1];
    const withinArtboard = masterX >= 0 && masterX < artboard[0] && masterY >= 0 && masterY < artboard[1];
    const water = withinArtboard && waterRaw.data[Math.floor(masterY) * artboard[0] + Math.floor(masterX)] >= 128;
    const index = pixelIndex(x, y);
    waterBinary[index] = water ? 1 : 0;
    binary[index] = silhouetteRaw.data[index] >= 128 && !water ? 1 : 0;
  }
  const mask = feather(binary);
  const metrics = inspectMask(mask, binary, waterBinary);
  const png = await sharp(Buffer.from(mask), { raw: { width: dimensions[0], height: dimensions[1], channels: 1 } })
    .toColourspace("b-w").png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  await writeFile(destination, png);
  const decoded = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([decoded.info.width, decoded.info.height, decoded.info.channels], [...dimensions, 1]);
  assert.deepEqual(decoded.data, Buffer.from(mask), "F16 PNG decode differs from the computed single-channel mask.");
  return { png, metrics };
}

function registration(plateHash, maskHash, inputHashes, metrics) {
  return {
    schemaVersion: 1,
    id: "ninjaone-d05-anchor-cover@r1",
    status: "owner-accepted-composition-authority",
    coordinateConventions: { origin: "top-left", units: "pixels", pointOrder: "[x, y]", bboxOrder: "[left, top, right, bottom]", bboxEdges: "half-open" },
    plate: { path: `/career-world/capitals/ninjaone/city-v2/plates/${plateName}`, sha256: plateHash, dimensions, channels: 3 },
    destinationMasterBounds: bounds,
    candidateToMasterArtboardComposed: {
      type: "axis-aligned-affine-scale-and-translate",
      sourceDimensions: dimensions,
      destinationDimensions: masterDimensions,
      scale,
      offset,
      formula: "master = [-270, 413] + candidate * [961/1305, 887/1205]",
    },
    anchors: anchors.map(([id, name, bbox, drift]) => ({
      id,
      name,
      candidatePixelSpace: { center: center(bbox), footprintBbox: bbox, bboxConvention: "half-open [left, top, right, bottom]" },
      masterArtboardSpace: { center: mapPoint(center(bbox)), footprintBbox: mapBox(bbox), bboxConvention: "half-open [left, top, right, bottom]" },
      drift: { centerMasterPixels: drift, maximumMasterPixels: 2.95, source: "T4d-r3/r4 scaffold-drift record" },
    })),
    mask: {
      path: `/career-world/capitals/ninjaone/city-v2/plates/${maskName}`,
      sha256: maskHash,
      dimensions,
      channels: 1,
      registeredL3Water: sourceRecord(registeredWaterRelative, inputHashes.registeredWater),
      extendedCoastSilhouette: sourceRecord(silhouetteRelative, inputHashes.silhouette),
    },
    districtMask: {
      whiteMeans: "show",
      derivation: "registered extended D05 coast silhouette minus registered L3 city-water authority, resampled into candidate space with a two-raw-pixel binomial shoreline transition band",
      f16SolidityAndCoverage: metrics,
    },
    notes: [
      "Destination bounds are an L4 overlay registration and do not modify L1-L3 registration.",
      "F20 mount requirement: use x/y/width/height into destinationMasterBounds when attaching the shared-space mask; do not transform that mask-bearing element.",
      "The standing coast-refinement debt is deferred to the owner-directed post-pyramid pass; this mount does not add docks or shore dressing.",
    ],
  };
}

async function main() {
  await mkdir(output, { recursive: true });
  const candidateMeta = await sharp(candidate).metadata();
  assert.deepEqual([candidateMeta.width, candidateMeta.height, candidateMeta.channels], [...dimensions, 3]);
  const inputHashes = {
    candidateB: await hashFile(candidateRelative),
    scaffold: await hashFile(scaffoldRelative),
    candidateD: await hashFile(candidateDRelative),
    prompts: await hashFile(promptsRelative),
    proofManifest: await hashFile(proofManifestRelative),
    silhouette: await hashFile(silhouetteRelative),
    registeredWater: await hashFile(registeredWaterRelative),
    sprites: Object.fromEntries(await Promise.all(Object.entries(spriteRelative).map(async ([id, relative]) => [id, await hashFile(relative)]))),
  };
  const maskPath = path.join(output, maskName);
  const maskRun2 = path.join(output, "determinism", maskName);
  await mkdir(path.dirname(maskRun2), { recursive: true });
  const [first, second] = await Promise.all([buildMask(maskPath), buildMask(maskRun2)]);
  assert.deepEqual(first.png, second.png, "Two independent mask writes differ.");
  assert.deepEqual(first.metrics, second.metrics, "Two independent mask inspections differ.");
  const maskHash = sha256(first.png);
  const publicPlate = path.join(publicOutput, plateName);
  const publicMask = path.join(publicOutput, maskName);
  await copyFile(candidate, publicPlate);
  await writeFile(publicMask, first.png);
  const promotedHash = sha256(await readFile(publicPlate));
  assert.equal(promotedHash, inputHashes.candidateB, "Promotion must be byte-identical to the accepted quarantine raw.");
  assert.equal(sha256(await readFile(publicMask)), maskHash, "Promoted mask hash differs from the deterministic output.");
  const registrationText = `${JSON.stringify(registration(promotedHash, maskHash, inputHashes, first.metrics), null, 2)}\n`;
  await writeFile(path.join(publicOutput, registrationName), registrationText);
  const provenance = {
    schemaVersion: 1,
    id: "ninjaone-d05-anchor-cover@r1-provenance",
    promotedPlate: { path: `/career-world/capitals/ninjaone/city-v2/plates/${plateName}`, sha256: promotedHash },
    sourceHashes: {
      candidateBRaw: sourceRecord(candidateRelative, inputHashes.candidateB),
      scaffold: sourceRecord(scaffoldRelative, inputHashes.scaffold),
      candidateD: sourceRecord(candidateDRelative, inputHashes.candidateD),
      despilledSprites: Object.fromEntries(Object.entries(spriteRelative).map(([id, relative]) => [id, sourceRecord(relative, inputHashes.sprites[id])])),
    },
    t4dR3Prompts: sourceRecord(promptsRelative, inputHashes.prompts),
    t4dR3ProofManifest: sourceRecord(proofManifestRelative, inputHashes.proofManifest),
    ownerAcceptanceNote,
    coastRefinementDebt: "Deferred owner-directed coast refinement after pyramid work; no shore dressing or docks are attempted by T4e.",
  };
  await writeFile(path.join(publicOutput, provenanceName), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(JSON.stringify({ promotedHash, quarantineHash: inputHashes.candidateB, maskHash, metrics: first.metrics }, null, 2));
}

await main();
