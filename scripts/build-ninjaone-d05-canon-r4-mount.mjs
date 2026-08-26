import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const root = (relative) => path.join(ROOT, relative);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const input = Object.freeze({
  canon: {
    path: ".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/canon/d05-canon-r4.png",
    sha256: "84df8cf38eea9179a5f5d35a049176584087119e260c84b087317393d1ec75ea",
    dimensions: [2621, 2419, 3],
  },
  capital: {
    path: ".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/tiers/d05-canon-capital-r4.png",
    sha256: "41960d120f1d4f8a3e6991849a683f917dc3866125a8c68751694e54a3e4820f",
    dimensions: [1305, 1205, 3],
  },
  intermediate: {
    path: ".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/tiers/d05-canon-intermediate-r4.png",
    sha256: "420bcd434d6092be79fbbb8ccfcfcc67a52ad5a3e313714e606573de0353bdcb",
    dimensions: [2610, 2410, 3],
  },
  plateB: {
    path: ".codex-tmp/quarantine/city-v2/T12-naturalize-r2/d05-base-naturalized-r2.png",
    sha256: "da6bfce555a425b5aa04ed90c07a86dfcffee6bc6d18b0051ee610ca1987a20b",
    dimensions: [1305, 1205, 3],
  },
});
const output = Object.freeze({
  canon: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-r4.png",
  capital: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-capital-r4.png",
  intermediate: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-intermediate-r4.png",
  mask: "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r4.png",
  registration: "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r4.json",
  provenance: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-r4.provenance.json",
  shimmer: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-foliage-shimmer-mask-r4.png",
  qa: ".codex-tmp/qa/T16",
});
const feather = Object.freeze({
  northRawPixels: 65.208568,
  eastRawPixels: 65.182102,
  southRawPixels: 244.532763,
  westOceanRawPixels: 128,
  method: "linear outer-frame alpha; r3 north/east/south distances retained, owner-amended western ocean edge widened to 128 raw pixels",
});

function alphaAt(distance, width) {
  return Math.max(0, Math.min(255, Math.round((distance + 0.5) / width * 255)));
}

async function assertInput(entry) {
  const bytes = await readFile(root(entry.path));
  assert.equal(sha256(bytes), entry.sha256, `input SHA-256 mismatch: ${entry.path}`);
  const meta = await sharp(bytes).metadata();
  assert.deepEqual([meta.width, meta.height, meta.channels], entry.dimensions, `input dimensions mismatch: ${entry.path}`);
  return bytes;
}

async function emit(relative, bytes) {
  const destination = root(relative);
  await mkdir(path.dirname(destination), { recursive: true });
  if (CHECK_ONLY) {
    const existing = await readFile(destination);
    assert.deepEqual(existing, bytes, `--check output differs: ${relative}`);
  }
  await writeFile(destination, bytes);
}

function blueWater(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta + 6) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  return hue >= 155 && hue <= 255 && max > 0 && delta / max >= 0.22 && b >= r * 0.85;
}

async function buildMask(plateB) {
  const { data: rgb, info } = await sharp(plateB).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const alpha = Buffer.alloc(width * height);
  let opaqueInterior = 0, interiorWater = 0, maskedInteriorWater = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixel = y * width + x;
    const value = Math.min(
      alphaAt(x, feather.westOceanRawPixels),
      alphaAt(width - 1 - x, feather.eastRawPixels),
      alphaAt(y, feather.northRawPixels),
      alphaAt(height - 1 - y, feather.southRawPixels),
    );
    alpha[pixel] = value;
    const interior = x >= feather.westOceanRawPixels && x < width - feather.eastRawPixels
      && y >= feather.northRawPixels && y < height - feather.southRawPixels;
    if (interior && value === 255) opaqueInterior += 1;
    const source = pixel * 3;
    if (interior && blueWater(rgb[source], rgb[source + 1], rgb[source + 2])) {
      interiorWater += 1;
      if (value !== 255) maskedInteriorWater += 1;
    }
  }
  assert.ok(interiorWater > 0, "plate B must retain measurable interior painted water");
  assert.equal(maskedInteriorWater, 0, "ocean-inclusive mask must not cut interior painted water");
  const png = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .toColourspace("b-w").png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const decoded = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.channels, 1, "mask must remain single-channel");
  assert.deepEqual(decoded.data, alpha, "encoded mask samples differ from the derived alpha field");

  const tint = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    tint[pixel * 4] = 67;
    tint[pixel * 4 + 1] = 231;
    tint[pixel * 4 + 2] = 176;
    tint[pixel * 4 + 3] = Math.round(alpha[pixel] * 0.64);
  }
  const overlay = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .composite([{ input: tint, raw: { width, height, channels: 4 } }])
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  return { png, overlay, width, height, opaqueInterior, interiorWater, maskedInteriorWater };
}

async function buildEdgeStrip(capital) {
  const background = { r: 28, g: 37, b: 48, alpha: 1 };
  const edge = 160;
  const { width, height } = await sharp(capital).metadata();
  const panels = await Promise.all([
    sharp(capital).extract({ left: 0, top: 0, width, height: edge }).resize(1040, 128).png().toBuffer(),
    sharp(capital).extract({ left: 0, top: height - edge, width, height: edge }).resize(1040, 128).png().toBuffer(),
    sharp(capital).extract({ left: 0, top: 0, width: edge, height }).resize(128, 1040).png().toBuffer(),
    sharp(capital).extract({ left: width - edge, top: 0, width: edge, height }).resize(128, 1040).png().toBuffer(),
  ]);
  return sharp({ create: { width: 1312, height: 1312, channels: 3, background } })
    .composite([
      { input: panels[0], left: 136, top: 0 }, { input: panels[1], left: 136, top: 1184 },
      { input: panels[2], left: 0, top: 136 }, { input: panels[3], left: 1184, top: 136 },
    ]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

async function buildShimmerRecipe() {
  const sourcePath = root(".codex-tmp/quarantine/city-v2/T9d-shimmer-tighten/build-d05-canon-foliage-shimmer-mask-r2.mjs");
  let source = await readFile(sourcePath, "utf8");
  source = source
    .replaceAll("T9d-shimmer-tighten", "T16")
    .replaceAll(".codex-tmp/quarantine/city-v2/T16/shimmer", `${output.qa}/shimmer`)
    .replaceAll("d05-canon-capital-r1.png", "d05-canon-capital-r4.png")
    .replaceAll("d05-anchor-cover-usable-mask-r3.png", "d05-anchor-cover-usable-mask-r4.png")
    .replaceAll("d05-anchor-cover-registration-r3.json", "d05-anchor-cover-registration-r4.json")
    .replaceAll("d05-canon-foliage-shimmer-mask-r2", "d05-canon-foliage-shimmer-mask-r4")
    .replaceAll("d05-canon-foliage-shimmer-proof-overlay-r2", "d05-canon-foliage-shimmer-proof-overlay-r4")
    .replaceAll("T9d D05 canon foliage shimmer mask r2", "T16 D05 canon foliage shimmer mask r4")
    .replaceAll("Usable-mask r3", "Usable-mask r4")
    .replaceAll("usable-mask r3", "usable-mask r4");
  const recipe = root(`${output.qa}/build-d05-canon-foliage-shimmer-mask-r4.mjs`);
  await mkdir(path.dirname(recipe), { recursive: true });
  await writeFile(recipe, source);
  const result = spawnSync(process.execPath, [recipe, "--check"], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`T10b shimmer recipe failed:\n${result.stdout}\n${result.stderr}`);
  const line = result.stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(line).report;
}

async function main() {
  const [canon, capital, intermediate, plateB] = await Promise.all([
    assertInput(input.canon), assertInput(input.capital), assertInput(input.intermediate), assertInput(input.plateB),
  ]);
  const mask = await buildMask(plateB);
  await emit(output.canon, canon);
  await emit(output.capital, capital);
  await emit(output.intermediate, intermediate);
  await emit(output.mask, mask.png);
  await emit(`${output.qa}/mask-r4-overlay.png`, mask.overlay);
  await emit(`${output.qa}/plate-edge-band-strip-r4.png`, await buildEdgeStrip(capital));

  const priorRegistrationBytes = await readFile(root("public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r3.json"));
  const priorRegistration = JSON.parse(priorRegistrationBytes);
  const registration = {
    ...priorRegistration,
    id: "ninjaone-d05-anchor-cover@r4",
    status: "owner-authorized-canon-r4-files-staged-for-F20",
    mask: {
      path: "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r4.png",
      sha256: sha256(mask.png), dimensions: [mask.width, mask.height], channels: 1,
      sourcePlateB: { path: input.plateB.path, sha256: input.plateB.sha256 },
      oceanInclusiveOuterFeather: feather,
    },
    canonPyramid: {
      source: "T14 patched owner-accepted canon r4",
      closeDimensions: input.canon.dimensions,
      priorCloseDimensions: [2619, 2417, 3],
      deltaPixels: [2, 2, 0],
      tierDimensions: { capital: input.capital.dimensions, site: input.intermediate.dimensions },
      anchorAuthority: "anchors and destinationMasterBounds are carried unchanged from r3; only canon source dimensions changed",
    },
    districtMask: {
      whiteMeans: "show",
      derivation: "owner-amended r4 full-plate mask: every plate-B interior pixel, including western ocean and top-right lake, remains usable; only the outer frame receives alpha feathering",
      outerFrameFeather: feather,
      coverage: { opaqueInteriorPixels: mask.opaqueInterior, interiorBlueWaterPixels: mask.interiorWater, maskedInteriorBlueWaterPixels: mask.maskedInteriorWater },
    },
    supersedes: { path: "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r3.json", sha256: sha256(priorRegistrationBytes) },
    notes: [
      "One anchor authority: r4 preserves r3 anchors, destination bounds, and affine registration unchanged.",
      "F20 remains the director-owned live plate-edge water seam judgment; this record only establishes deterministic mask mechanics.",
    ],
  };
  const registrationBytes = Buffer.from(`${JSON.stringify(registration, null, 2)}\n`);
  await emit(output.registration, registrationBytes);
  const shimmerReport = await buildShimmerRecipe();
  const shimmerBytes = await readFile(root(output.shimmer));
  const provenance = {
    schemaVersion: 2,
    taskId: "T16-canon-r4-mount",
    status: "owner-authorized-files-staged-for-F20",
    lineage: "T12 naturalized plate B -> T13/T13b/T13c/T13d canon r4 -> T14 owner-accepted patches",
    source: {
      plateB: { path: input.plateB.path, sha256: input.plateB.sha256, dimensions: input.plateB.dimensions },
      t14ProofManifest: { path: ".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/proof-manifest.json", sha256: sha256(await readFile(root(".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/proof-manifest.json"))) },
      t14PatchLedger: { path: ".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/patch-ledger.json", sha256: sha256(await readFile(root(".codex-tmp/quarantine/city-v2/T14-canon-r4-patches/patch-ledger.json"))) },
    },
    registration: { path: output.registration, sha256: sha256(registrationBytes), destinationMasterBounds: registration.destinationMasterBounds, priorR3Sha256: sha256(priorRegistrationBytes) },
    tiers: {
      capital: { path: output.capital, dimensions: input.capital.dimensions, sha256: input.capital.sha256, derivation: "T14 deterministic downsample from patched r4 canon" },
      site: { path: output.intermediate, dimensions: input.intermediate.dimensions, sha256: input.intermediate.sha256, derivation: "T14 deterministic downsample from patched r4 canon" },
      close: { path: output.canon, dimensions: input.canon.dimensions, sha256: input.canon.sha256, derivation: "T14 patched canonical maximum-resolution artwork" },
    },
    foliageShimmer: {
      path: output.shimmer, sha256: sha256(shimmerBytes), sourceTier: "capital", sourceTierSha256: input.capital.sha256,
      recipe: `${output.qa}/build-d05-canon-foliage-shimmer-mask-r4.mjs`,
      t10bRecipe: "HSV 56-92, saturation >=0.40, 7px architecture buffer; source algorithm copied without threshold changes",
      coveragePercent: shimmerReport.counts.coveragePercent, opaqueCoveragePercent: shimmerReport.counts.opaqueCoveragePercent,
      finalComponents: shimmerReport.counts.finalComponents, regionCount: shimmerReport.counts.regionCount,
      architectureStandoff: shimmerReport.architectureStandoff,
    },
    ownerAcceptance: {
      citations: [
        "QA-REVIEW.md: Owner (canon r4 acceptance review, round 2), 2026-08-26: both T14 patches accepted; canon r4 art-complete.",
        "QA-REVIEW.md: owner mount authorization, 2026-08-26: yeah go for the mount.",
        "STATE.md: owner-amended ocean-inclusive mask scope, 2026-08-26.",
      ],
      mountState: "files staged for F20; director owns live verification and commit",
    },
  };
  const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
  await emit(output.provenance, provenanceBytes);
  const report = {
    inputs: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { path: value.path, sha256: value.sha256, dimensions: value.dimensions }])),
    outputs: { canon: input.canon.sha256, capital: input.capital.sha256, intermediate: input.intermediate.sha256, mask: sha256(mask.png), registration: sha256(registrationBytes), provenance: sha256(provenanceBytes), shimmer: sha256(shimmerBytes) },
    mask: { dimensions: [mask.width, mask.height], feather, opaqueInteriorPixels: mask.opaqueInterior, interiorBlueWaterPixels: mask.interiorWater, maskedInteriorBlueWaterPixels: mask.maskedInteriorWater },
    shimmer: shimmerReport.counts,
    registrationDelta: registration.canonPyramid.deltaPixels,
  };
  await emit(`${output.qa}/mount-report.json`, Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
  console.log(JSON.stringify(report));
}

await main();
