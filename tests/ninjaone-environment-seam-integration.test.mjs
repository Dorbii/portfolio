import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION,
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES,
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_PAINTED_NODES,
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES,
  advanceNinjaOneEnvironmentSeamLoadCohort,
  isNinjaOneEnvironmentSeamLoadCohortCurrent,
  ninjaOneEnvironmentSeamRequiredCohortState,
  ninjaOneEnvironmentSeamSelectionKey,
  selectNinjaOneEnvironmentSeamIntegration,
} from "../features/career-world/development/model/ninjaOneEnvironmentSeamIntegration.ts";
import { auditIntegrationOverlays } from "../scripts/lib/ninjaone-environment-mvp-verification.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json",
);
const GENERATOR_PATH = path.join(
  ROOT,
  "scripts/build-ninjaone-environment-seam-integration-r2.mjs",
);
const OUTPUT_ROOT = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/shared/seam-integration-native-r2",
);
const SOURCE_PREFIX =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
const EXPECTED_SOURCE_IDS = Object.freeze([
  "r0-c2", "r0-c3", "r1-c2", "r1-c3",
  "r2-c0", "r2-c1", "r2-c2", "r2-c3",
  "r3-c0", "r3-c1", "r3-c2", "r3-c3",
]);
const FIXED_CAMERAS = Object.freeze({
  B2: Object.freeze({ origin: Object.freeze([0.1675, 0.23]), span: Object.freeze([0.04, 0.04]) }),
  C1: Object.freeze({
    origin: Object.freeze([0.2925, 1 / 12 - 0.02]),
    span: Object.freeze([0.04, 0.04]),
  }),
  C2: Object.freeze({ origin: Object.freeze([0.2925, 0.23]), span: Object.freeze([0.04, 0.04]) }),
});
const INTERCELL_CAMERAS = Object.freeze({
  dense: Object.freeze({
    origin: Object.freeze([0.1875, 0.18459422958870475]),
    span: Object.freeze([0.074, 0.074]),
  }),
  boundary: Object.freeze({
    origin: Object.freeze([0.21958333305493183, 0.1883333333041626]),
    span: Object.freeze([0.04, 0.04]),
  }),
  horizontal: Object.freeze({
    origin: Object.freeze([0.2925, 0.14666666666666667]),
    span: Object.freeze([0.04, 0.04]),
  }),
  waterfall: Object.freeze({
    origin: Object.freeze([0.21958333305493183, 0.21296296296296297]),
    span: Object.freeze([0.04, 0.04]),
  }),
});

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function repoFile(repoOrPublicPath) {
  const unversioned = repoOrPublicPath.split("?", 1)[0].replace(/^\//, "");
  return repoOrPublicPath.startsWith("/career-world/")
    ? path.join(ROOT, "public", unversioned)
    : path.join(ROOT, unversioned);
}

async function hashes(files) {
  return Promise.all(files.map(async (file) => Object.freeze({
    file,
    sha256: sha256(await readFile(file)),
  })));
}

test("r2 seam authority binds all exact native originals and excludes banned fidelity sources", async () => {
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/seam-integration@r2");
  assert.equal(manifest.status, "partial-internal-accepted-intercell-unresolved");
  assert.deepEqual(
    manifest.authority.sources.map(({ id }) => id),
    EXPECTED_SOURCE_IDS,
  );
  assert.deepEqual(manifest.registration, {
    artboard: [1440, 1080],
    coordinateMathScale: 4,
    nativeTileDimensions: [1448, 1086],
    tileArtboard: [360, 270],
  });
  assert.deepEqual(manifest.derivation, {
    baseMutation: "none",
    colorOperation: "bounded symmetric low-frequency seam correction",
    context: "exact 32-pixel accepted internal strips; inter-cell joins are audited but intentionally unselected",
    interpolation: "none",
    resampling: "none",
    topologyOperation: "none",
  });
  assert.equal(manifest.compositionEvidence, undefined);
  assert.equal(manifest.proof, undefined);

  for (const source of manifest.authority.sources) {
    assert.equal(source.path, `${SOURCE_PREFIX}${source.id}-generated-r2.png`);
    assert.deepEqual(source.dimensions, [1448, 1086]);
    assert.equal(source.storage, "png-rgb-8");
    const bytes = await readFile(repoFile(source.path));
    const metadata = await sharp(bytes).metadata();
    assert.equal(sha256(bytes), source.sha256, source.id);
    assert.deepEqual(
      [metadata.width, metadata.height, metadata.channels, metadata.hasAlpha],
      [1448, 1086, 3, false],
      source.id,
    );
  }

  const [generator, model, component] = await Promise.all([
    readFile(GENERATOR_PATH, "utf8"),
    readFile(
      path.join(ROOT, "features/career-world/development/model/ninjaOneEnvironmentSeamIntegration.ts"),
      "utf8",
    ),
    readFile(
      path.join(ROOT, "features/career-world/development/NinjaOneEnvironmentSeamIntegration.tsx"),
      "utf8",
    ),
  ]);
  for (const text of [JSON.stringify(manifest), generator, model, component]) {
    assert.doesNotMatch(
      text,
      /ninjaone-environment-terrain-master-detail-r2\.png|runtime-close-quilt-r3\.png|seam-integration-native-r1/,
    );
  }
  assert.match(generator, /detail-tiles-r2\/generated/);
  assert.match(generator, /buildNeighborContext/);
  assert.match(generator, /STRIP_PIXELS = 32/);
  assert.doesNotMatch(
    generator,
    /Math\.random|Date\.now|new Date\s*\(|process\.stdin|readline|prompt\(/,
  );
  for (const obsolete of [
    "scripts/build-ninjaone-environment-seam-integration-r1.mjs",
    "public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r1.json",
    "public/career-world/capitals/ninjaone/environment/shared/seam-integration-native-r1",
  ]) {
    await assert.rejects(stat(path.join(ROOT, obsolete)), { code: "ENOENT" });
  }
});

test("four accepted 64px internal assets preserve detail; rejected inter-cell assets are absent", async () => {
  assert.equal(manifest.resources.length, 4);
  assert.deepEqual(
    manifest.resources.map(({ id }) => id),
    [
      "b2-internal-vertical-seam",
      "b2-internal-horizontal-seam",
      "c2-internal-vertical-seam",
      "c2-internal-horizontal-seam",
    ],
  );
  assert.equal(NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES.length, 4);
  assert.deepEqual(
    (await readdir(OUTPUT_ROOT)).sort(),
    manifest.resources.flatMap((resource) => [
      path.basename(repoFile(resource.path)),
      path.basename(repoFile(resource.nativeOriginalComparison.referencePath)),
    ]).sort(),
  );
  const audit = await auditIntegrationOverlays({ manifests: [manifest], root: ROOT });
  assert.equal(audit.pass, true, JSON.stringify(audit.resources));
  for (const resource of manifest.resources) {
    const bytes = await readFile(repoFile(resource.path));
    const metadata = await sharp(bytes).metadata();
    assert.equal(sha256(bytes), resource.sha256, resource.id);
    assert.deepEqual([metadata.width, metadata.height], resource.dimensions, resource.id);
    assert.equal(metadata.channels, 4, resource.id);
    assert.equal(resource.decodedBytes, resource.dimensions[0] * resource.dimensions[1] * 4);
    assert.equal(resource.integrationType, "native-original-seam-integration");
    assert.equal(resource.nativeSeamPixel, 32);
    assert.equal(resource.minimumWidthPixels, 64);
    assert.equal(resource.sourceStrips.length, 4);
    assert.ok(resource.sourcePaths.every((sourcePath) => sourcePath.startsWith(SOURCE_PREFIX)));
    assert.ok(resource.sourceStrips.every((strip) => (
      strip.sourcePath === `${SOURCE_PREFIX}${strip.tileId}-generated-r2.png`
      && strip.sourceSha256 === manifest.authority.sources.find(
        ({ id }) => id === strip.tileId,
      ).sha256
    )));
    assert.ok(resource.metrics.nativeOriginalComparison.detailEnergyRatio >= 0.85);
    assert.ok(resource.metrics.nativeOriginalComparison.luminanceMedianDeltaPct <= 5);
    assert.ok(Object.values(resource.metrics.nativeOriginalComparison.rgbMedianDelta)
      .every((value) => value <= 12));
    assert.ok(resource.metrics.longestAlphaBoundaryRun <= 48);
    assert.ok(resource.metrics.segments.every(({ after }) => (
      after.discontinuityRatio !== null && after.discontinuityRatio <= 1.15
    )));
    const referenceBytes = await readFile(
      repoFile(resource.nativeOriginalComparison.referencePath),
    );
    assert.equal(
      sha256(referenceBytes),
      resource.nativeOriginalComparison.referenceSha256,
      `${resource.id} context provenance`,
    );
  }
  assert.deepEqual(
    manifest.resources.filter(({ orientation }) => orientation === "vertical")
      .map(({ dimensions }) => dimensions),
    [[64, 2172], [64, 2172]],
  );
  assert.deepEqual(
    manifest.resources.filter(({ orientation }) => orientation === "horizontal")
      .map(({ dimensions }) => dimensions),
    [[2896, 64], [2896, 64]],
  );
  assert.equal(manifest.resources.some(({ cellId }) => cellId.includes("-")), false);
});

test("full native sweep fails closed on all four unselected inter-cell segments", () => {
  assert.equal(manifest.fullNativeSweep.length, 16);
  for (const cellId of ["B2", "C1", "C2"]) {
    const cellSweep = manifest.fullNativeSweep.filter((entry) => entry.cellId === cellId);
    assert.equal(cellSweep.length, 4, cellId);
    assert.deepEqual(
      new Set(cellSweep.map(({ orientation }) => orientation)),
      new Set(["horizontal", "vertical"]),
      cellId,
    );
  }
  assert.ok(manifest.fullNativeSweep.filter(({ cellId }) => cellId === "B2")
    .every(({ decision, metrics }) => (
      decision === "minimum-width-overlay-required"
      && metrics.visiblePairs > 0
      && metrics.discontinuityRatio > 1.15
    )));
  assert.ok(manifest.fullNativeSweep.filter(({ cellId }) => cellId === "C2")
    .every(({ decision, metrics }) => (
      decision === "minimum-width-overlay-required"
      && metrics.visiblePairs > 0
      && metrics.discontinuityRatio > 1.15
    )));
  assert.ok(manifest.fullNativeSweep.filter(({ cellId }) => cellId === "C1")
    .every(({ decision }) => (
      decision === "no-overlay-authorized-coast-and-void-topology-retained"
    )));
  assert.equal(manifest.resources.some(({ cellId }) => cellId === "C1"), false);
  assert.deepEqual(
    manifest.fullNativeSweep.filter(({ cellId }) => cellId.includes("-"))
      .map(({ decision, metrics, neighborTileIds }) => ({
        decision,
        neighborTileIds,
        ratio: metrics.discontinuityRatio,
      })),
    [
      { decision: "UNRESOLVED-missing-accepted-intercell-overlay", neighborTileIds: ["r2-c1", "r2-c2"], ratio: 3.367028 },
      { decision: "UNRESOLVED-missing-accepted-intercell-overlay", neighborTileIds: ["r3-c1", "r3-c2"], ratio: 2.200856 },
      { decision: "UNRESOLVED-missing-accepted-intercell-overlay", neighborTileIds: ["r1-c2", "r2-c2"], ratio: 2.635108 },
      { decision: "UNRESOLVED-missing-accepted-intercell-overlay", neighborTileIds: ["r1-c3", "r2-c3"], ratio: 2.136728 },
    ],
  );

  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.B2).map(({ id }) => id),
    ["b2-internal-vertical-seam", "b2-internal-horizontal-seam"],
  );
  assert.deepEqual(selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.C1), []);
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.C2).map(({ id }) => id),
    ["c2-internal-vertical-seam", "c2-internal-horizontal-seam"],
  );
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(INTERCELL_CAMERAS.boundary).map(({ id }) => id),
    [],
  );
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(INTERCELL_CAMERAS.waterfall).map(({ id }) => id),
    ["b2-internal-horizontal-seam", "c2-internal-horizontal-seam"],
  );
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(INTERCELL_CAMERAS.horizontal).map(({ id }) => id),
    ["c2-internal-vertical-seam"],
  );
  assert.throws(
    () => selectNinjaOneEnvironmentSeamIntegration(INTERCELL_CAMERAS.dense),
    /mounted-resource budget/,
  );
  assert.deepEqual(selectNinjaOneEnvironmentSeamIntegration({
    origin: [0.75, 0.75],
    span: [0.04, 0.04],
  }), []);
  assert.equal(NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES, 2);
  assert.equal(NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_DECODED_BYTES, 1_297_408);
});

test("maximum seam union keeps the accepted internal cohort within its declared budget", () => {
  const breakdown = manifest.budgets.unionBreakdown;
  assert.equal(breakdown.terrainDecodedBytes, 4 * 1448 * 1086 * 4);
  assert.equal(breakdown.foliageDecodedBytes, 0);
  assert.equal(breakdown.seamDecodedBytes, 1_297_408);
  assert.equal(manifest.budgets.rejectedIntercellDecodedBytes, 0);
  assert.equal(manifest.budgets.fixedC2SeamDecodedBytes, 1_297_408);
  assert.equal(
    manifest.budgets.fixedC2DecodedUnion,
    breakdown.terrainDecodedBytes
      + breakdown.foliageDecodedBytes
      + manifest.budgets.fixedC2SeamDecodedBytes,
  );
  assert.equal(
    Object.values(breakdown).reduce((total, value) => total + value, 0),
    manifest.budgets.maximumApplicationOwnedDecodedUnion,
  );
  assert.equal(
    NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION,
    26_457_856,
  );
  assert.ok(NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION < 32 * 1024 * 1024);
  assert.equal(
    32 * 1024 * 1024 - NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION,
    7_096_576,
  );
  assert.deepEqual(manifest.budgets.unionSupplementalNodeBreakdown, {
    foliage: 0,
    seam: 2,
  });
  assert.ok(
    Object.values(manifest.budgets.unionSupplementalNodeBreakdown)
      .reduce((total, value) => total + value, 0) <= 6,
  );
  assert.equal(manifest.budgets.maximumCohortId, "fixedB2Internal");
  assert.equal(manifest.budgets.maximumPaintedSupplementNodes, 2);
  assert.equal(NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_PAINTED_NODES, 2);
  assert.deepEqual(
    Object.fromEntries(Object.entries(manifest.selectorCheckpoints).map(
      ([id, { paintedNodeCount }]) => [id, paintedNodeCount],
    )),
    {
      fixedB2Internal: 2,
      fixedC2Internal: 2,
    },
  );
});

test("canonical cohort epochs reject A-B-A stale completions and preserve same-set identity", () => {
  const canonicalA = ninjaOneEnvironmentSeamSelectionKey([
    { path: "/assets/a-second.png", sha256: "SECOND" },
    { path: "/assets/a-first.png", sha256: "FIRST" },
  ]);
  assert.equal(
    canonicalA,
    ninjaOneEnvironmentSeamSelectionKey([
      { path: "/assets/a-first.png", sha256: "FIRST" },
      { path: "/assets/a-second.png", sha256: "SECOND" },
    ]),
  );
  const initial = Object.freeze({ epoch: 0, key: "" });
  const firstA = advanceNinjaOneEnvironmentSeamLoadCohort(initial, canonicalA);
  const cohortB = advanceNinjaOneEnvironmentSeamLoadCohort(firstA, "/assets/b.png");
  const secondA = advanceNinjaOneEnvironmentSeamLoadCohort(cohortB, canonicalA);
  assert.equal(firstA.epoch, 1);
  assert.equal(cohortB.epoch, 2);
  assert.equal(secondA.epoch, 3);
  assert.equal(isNinjaOneEnvironmentSeamLoadCohortCurrent(secondA, firstA), false);
  assert.equal(isNinjaOneEnvironmentSeamLoadCohortCurrent(secondA, cohortB), false);
  assert.equal(isNinjaOneEnvironmentSeamLoadCohortCurrent(secondA, secondA), true);
  assert.equal(advanceNinjaOneEnvironmentSeamLoadCohort(secondA, canonicalA), secondA);

  const requiredState = ninjaOneEnvironmentSeamRequiredCohortState(
    [
      {
        decodedBytes: 40,
        id: "a-second",
        path: "/assets/a-second.png",
        sha256: "SECOND",
      },
      {
        decodedBytes: 20,
        id: "a-first",
        path: "/assets/a-first.png",
        sha256: "FIRST",
      },
    ],
    "loading",
    secondA.epoch,
  );
  assert.deepEqual(requiredState, {
    decodedBytes: 60,
    epoch: 3,
    key: canonicalA,
    paintedNodeCount: 2,
    resourceIds: ["a-second", "a-first"],
    status: "loading",
  });
});

test("component preload lifecycle is epoch-safe, cancellable, static, and reports mounted accounting", async () => {
  const component = await readFile(
    path.join(ROOT, "features/career-world/development/NinjaOneEnvironmentSeamIntegration.tsx"),
    "utf8",
  );
  assert.match(component, /const selectionKey = ninjaOneEnvironmentSeamSelectionKey\(resources\)/);
  assert.match(component, /key=\{selectionKey \|\| "empty"\}/);
  assert.match(component, /advanceNinjaOneEnvironmentSeamLoadCohort/);
  assert.match(component, /isNinjaOneEnvironmentSeamLoadCohortCurrent/);
  assert.match(component, /setLoadState\(\{ \.\.\.requestCohort, status: "loading" \}\)/);
  assert.match(component, /useEffect\(\(\) => \{[\s\S]*?\}, \[preloadPathKey, selectionKey\]\);/);
  assert.match(component, /image\.onload = null/);
  assert.match(component, /image\.onerror = null/);
  assert.match(component, /image\.src = ""/);
  assert.match(component, /typeof image\.decode === "function"/);
  assert.match(component, /image\.decode\(\)\.then\(resolve, reject\)/);
  assert.match(component, /data-environment-seam-integration-selected-count/);
  assert.match(component, /data-environment-seam-integration-count=\{mountedCount\}/);
  assert.match(component, /data-environment-seam-integration-decoded-bytes=\{mountedDecodedBytes\}/);
  assert.match(component, /data-environment-seam-integration-painted-node-count=\{mountedPaintedNodeCount\}/);
  assert.match(component, /data-environment-seam-integration-hidden-painted-frames=\{[\s\S]*?loadState\.status === "ready" \? 2 : 0/);
  assert.match(component, /data-environment-seam-integration-cohort-epoch=\{loadState\.epoch\}/);
  assert.match(component, /onRequiredCohortStateChange\?\.\(requiredCohortState\)/);
  assert.match(component, /ninjaOneEnvironmentSeamRequiredCohortState\(resources, status, cohortEpoch\)/);
  assert.match(component, /requiredCohortEpoch = 0/);
  assert.match(component, /cohortEpoch=\{requiredCohortEpoch\}/);
  assert.match(component, /data-environment-seam-integration-presentation-epoch=\{cohortEpoch\}/);
  assert.match(component, /const visible = presentationReady && status === "ready"/);
  assert.match(component, /const preloadPathKey = resources\.map\(\(\{ path \}\) => path\)\.sort\(\)\.join\("\|"\)/);
  assert.match(component, /const selectedPaintedNodeCount = resources\.length/);
  assert.doesNotMatch(component, /seam-integration-tonal|linearGradient|tonalTransition/);
  assert.match(component, /\{resources\.map\(\(resource\) => \(/);
  assert.match(component, /onLoad=\{\(\) => recordSvgLoad\(ninjaOneEnvironmentSeamResourceKey\(resource\)\)\}/);
  assert.match(component, /onError=\{\(\) => setSvgLoadError\(true\)\}/);
  assert.match(component, /const mountedCount = resources\.length/);
  assert.match(component, /window\.requestAnimationFrame\(\(\) => \{[\s\S]*?window\.requestAnimationFrame/);
  assert.match(component, /opacity=\{visible \? 1 : 0\}/);
  assert.doesNotMatch(component, /setInterval|animation|transform|filter/);
});

test("r2 generator is deterministic and idempotent without mutating native sources", { concurrency: false }, async () => {
  const productionFiles = [
    MANIFEST_PATH,
    ...manifest.resources.flatMap((resource) => [
      repoFile(resource.path),
      repoFile(resource.nativeOriginalComparison.referencePath),
    ]),
  ];
  const sourceFiles = manifest.authority.sources.map(({ path: sourcePath }) => repoFile(sourcePath));
  const beforeProduction = await hashes(productionFiles);
  const beforeSources = await hashes(sourceFiles);
  for (let pass = 0; pass < 2; pass += 1) {
    const result = spawnSync(
      process.execPath,
      ["scripts/build-ninjaone-environment-seam-integration-r2.mjs"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.resourceIds, manifest.resources.map(({ id }) => id));
    assert.equal(output.seamDecodedBytes, 1_297_408);
    assert.equal(output.decodedUnion, 26_457_856);
  }
  assert.deepEqual(await hashes(productionFiles), beforeProduction);
  assert.deepEqual(await hashes(sourceFiles), beforeSources);
});
