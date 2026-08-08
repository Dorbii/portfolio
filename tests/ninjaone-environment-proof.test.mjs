import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  NINJAONE_ENVIRONMENT_ARTBOARD,
  NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
  NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES,
  NINJAONE_ENVIRONMENT_GRID_CELLS,
  NINJAONE_ENVIRONMENT_HYDROLOGY_SOURCES,
  NINJAONE_ENVIRONMENT_LAYER_ORDER,
  NINJAONE_ENVIRONMENT_LOD_LAYERS,
  NINJAONE_ENVIRONMENT_PROOF_ID,
  NINJAONE_ENVIRONMENT_ROCK_INSTANCES,
  NINJAONE_ENVIRONMENT_ROCK_RESOURCES,
  NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES,
  NINJAONE_ENVIRONMENT_STATIC_CLUSTER_COUNT,
  NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES,
  NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES,
  NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES,
  NINJAONE_ENVIRONMENT_TRAIL_SOURCES,
  NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES,
  NINJAONE_ENVIRONMENT_WILDLIFE_RESOURCES,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
} from "../features/career-world/development/model/ninjaOneEnvironmentProof.ts";
import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS,
  selectNinjaOneEnvironmentNativeInstances,
  selectNinjaOneEnvironmentNativeTiles,
} from "../features/career-world/development/model/ninjaOneEnvironmentNativeDetail.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function runtimeAssetFile(publicPath) {
  const unversionedPath = publicPath.split("?", 1)[0];
  return path.join(root, "public", unversionedPath.replace(/^\//, ""));
}

async function readImageMetadata(publicPath) {
  const absolutePath = runtimeAssetFile(publicPath);
  const [metadata, file] = await Promise.all([
    sharp(absolutePath).metadata(),
    stat(absolutePath),
  ]);
  return { ...metadata, size: file.size };
}

test("environment proof owns a semantic city-free B2 C1 C2 stack", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json",
  );
  assert.equal(manifest.id, NINJAONE_ENVIRONMENT_PROOF_ID);
  assert.equal(manifest.status, "environment-only-proof");
  assert.deepEqual(NINJAONE_ENVIRONMENT_GRID_CELLS, ["B2", "C1", "C2"]);
  assert.deepEqual(manifest.registration.gridCells, ["B2", "C1", "C2"]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_WORLD_ORIGIN, [0.125, 0]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_WORLD_SPAN, [0.25, 1 / 3]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_ARTBOARD, [1440, 1080]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_LAYER_ORDER, [
    "terrain-geology",
    "secondary-relief",
    "hydrology",
    "static-foliage",
    "tertiary-relief",
    "trails",
    "shared-rocks",
    "shared-animated-foliage",
    "surface-ecology",
    "wildlife",
    "integration-detail",
    "dynamic-shadows",
  ]);
  assert.equal(manifest.layers.integrationDetail.enabled, false);
  assert.equal(manifest.layers.dynamicShadows.enabled, false);
  assert.equal(
    manifest.layerOrder.some((layer) => (
      /(?:^|-)(?:city|building|rail|road|microdetail)(?:-|$)/.test(layer)
    )),
    false,
  );
});

test("zoom tiers retain one authored terrain geometry without detached asset substitutions", () => {
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.world, []);
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.territory, []);
  for (const tier of ["capital", "site"]) {
    assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS[tier], ["terrain-geology"]);
    assert.match(
      NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[tier].path,
      /-r2\.webp\?v=[a-f0-9]{12}$/,
    );
  }
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.close, [
    "terrain-geology",
    "hydrology",
    "shared-animated-foliage",
  ]);
  assert.match(
    NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.close.path,
    /-r2\.webp\?v=[a-f0-9]{12}$/,
  );
  assert.deepEqual(
    ["territory", "capital", "site", "close"].map(
      (tier) => NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[tier].dimensions[0],
    ),
    [720, 1440, 2160, 2880],
  );
});

test("registered plates retain one 4:3 geometry and transparent layering", async () => {
  const tieredSources = [
    [NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES, ["territory", "capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES, ["territory", "capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES, ["capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_HYDROLOGY_SOURCES, ["capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES, ["site", "close"]],
    [NINJAONE_ENVIRONMENT_TRAIL_SOURCES, ["site", "close"]],
    [NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES, ["close"]],
  ];
  for (const [sources, tiers] of tieredSources) {
    for (const tier of tiers) {
      const source = sources[tier];
      const metadata = await readImageMetadata(source.path);
      assert.deepEqual([metadata.width, metadata.height], source.dimensions);
      assert.equal(metadata.width / metadata.height, 4 / 3);
      assert.equal(metadata.hasAlpha, true, `${source.path} must retain alpha`);
      assert.ok(metadata.size > 1_000, `${source.path} is unexpectedly empty`);
    }
  }
});

test("environment density uses bounded shared resource pools", async () => {
  assert.equal(NINJAONE_ENVIRONMENT_STATIC_CLUSTER_COUNT, 0);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.length, 0);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length, 0);
  assert.equal(NINJAONE_ENVIRONMENT_ROCK_RESOURCES.length, 6);
  assert.equal(NINJAONE_ENVIRONMENT_ROCK_INSTANCES.length, 12);
  assert.equal(NINJAONE_ENVIRONMENT_WILDLIFE_RESOURCES.length, 6);
  assert.equal(NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES.length, 6);
  const allResources = [
    ...NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
    ...NINJAONE_ENVIRONMENT_ROCK_RESOURCES,
    ...NINJAONE_ENVIRONMENT_WILDLIFE_RESOURCES,
  ];
  for (const resource of allResources) {
    const metadata = await readImageMetadata(resource.path);
    assert.equal(metadata.hasAlpha, true, `${resource.path} must retain alpha`);
    assert.ok(metadata.size > 2_000, `${resource.path} is unexpectedly empty`);
  }
  assert.ok([
    ...NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
    ...NINJAONE_ENVIRONMENT_ROCK_INSTANCES,
    ...NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES,
  ].every(({ minimumTier }) => minimumTier === "site" || minimumTier === "close"));
});

test("native close detail streams accepted lossless tiles within a bounded budget", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json",
  );
  assert.equal(manifest.status, "accepted-close-detail");
  assert.equal(manifest.layers.dynamicShadows.enabled, false);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_TILES.length, 12);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES, 4);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES, 6);
  assert.deepEqual(manifest.registration.grid, [4, 4]);
  assert.deepEqual(manifest.registration.tileArtboard, [360, 270]);
  assert.deepEqual(manifest.registration.runtimeTileDimensions, [1448, 1086]);
  assert.deepEqual(
    manifest.tiles.map(({ id }) => id),
    [
      "r0-c2",
      "r0-c3",
      "r1-c2",
      "r1-c3",
      "r2-c0",
      "r2-c1",
      "r2-c2",
      "r2-c3",
      "r3-c0",
      "r3-c1",
      "r3-c2",
      "r3-c3",
    ],
  );
  assert.deepEqual(Object.keys(manifest.layers), ["dynamicShadows"]);

  for (const tile of NINJAONE_ENVIRONMENT_NATIVE_TILES) {
    const metadata = await readImageMetadata(tile.path);
    assert.deepEqual([metadata.width, metadata.height], [1448, 1086]);
    assert.equal(metadata.format, "png");
    assert.equal(metadata.hasAlpha, Boolean(tile.voidMaskId));
    const bytes = await readFile(runtimeAssetFile(tile.path));
    assert.equal(
      (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex").toUpperCase(),
      tile.sha256,
    );
  }

  const decodedTerrainBytes = NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES
    * 1448 * 1086 * 4;
  assert.ok(decodedTerrainBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS, 0);
});

test("native detail selection never mounts an unbounded tile or supplemental set", () => {
  const cameras = [
    { origin: [0.198, 0.18], span: [0.04, 0.04] },
    { origin: [0.235, 0.145], span: [0.05, 0.05] },
    { origin: [0.34, 0.02], span: [0.045, 0.045] },
    { origin: [0.13, 0.26], span: [0.06, 0.06] },
  ];
  const allInstances = Array.from({ length: 9 }, (_, index) => ({
    animation: "canopy-sway",
    artboardBounds: { origin: [430 + index, 570], span: [24, 32] },
    id: `synthetic-supplement-${index}`,
    phaseSeconds: -index * 0.2,
    resource: {
      dimensions: [96, 128],
      id: `synthetic-resource-${index}`,
      opaquePixels: 1,
      path: `/synthetic-${index}.png`,
    },
    tileId: "r2-c1",
  }));
  for (const camera of cameras) {
    assert.ok(
      selectNinjaOneEnvironmentNativeTiles(camera).length
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
    );
    assert.ok(
      selectNinjaOneEnvironmentNativeInstances(camera, allInstances).length
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
    );
  }
  assert.ok(
    selectNinjaOneEnvironmentNativeTiles(cameras[0]).some(({ id }) => id === "r2-c1"),
  );
  const selectedInstances = selectNinjaOneEnvironmentNativeInstances(cameras[0], allInstances);
  assert.ok(selectedInstances.every(({ animation }) => animation === "canopy-sway"));
});

test("native terrain delegates foliage and hydrology to separate production manifests", async () => {
  const [native, foliage, hydrology] = await Promise.all([
    readJson("public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json"),
    readJson("public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json"),
    readJson("public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json"),
  ]);
  assert.deepEqual(Object.keys(native.layers), ["dynamicShadows"]);
  assert.equal(foliage.id, "career-world/capitals/ninjaone/foliage-native@r3");
  assert.equal(hydrology.id, "career-world/capitals/ninjaone/hydrology-native@r2");
  assert.ok(foliage.resources.length > 0);
  assert.ok(foliage.instances.length <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES);
  assert.deepEqual(hydrology.registration.gridCells, ["B2", "C1", "C2"]);
  assert.ok(hydrology.metrics.waterPixels > 0);
});

test("registered native tiles keep canonical native-original provenance", () => {
  for (const tile of NINJAONE_ENVIRONMENT_NATIVE_TILES) {
    assert.deepEqual(
      tile.artboardBounds.origin,
      [tile.column * 360, tile.row * 270],
      `${tile.id} must remain in its canonical grid slot`,
    );
    assert.equal(
      tile.sourcePath,
      "/art-source/career-world/ninjaone-environment/production-r2/"
        + `detail-tiles-r2/generated/${tile.id}-generated-r2.png`,
    );
    assert.deepEqual(tile.sourceDimensions, [1448, 1086]);
    assert.deepEqual(tile.sourceCrop, [0, 0, 1448, 1086]);
  }
});

test("the visible row uses four independent accepted native originals", () => {
  const row = NINJAONE_ENVIRONMENT_NATIVE_TILES
    .filter(({ row }) => row === 2)
    .sort((left, right) => left.column - right.column);
  assert.equal(row.length, 4);
  assert.deepEqual(row.map(({ id }) => id), ["r2-c0", "r2-c1", "r2-c2", "r2-c3"]);
  assert.deepEqual(
    row.map(({ sourceCrop }) => sourceCrop),
    [0, 1, 2, 3].map(() => [0, 0, 1448, 1086]),
  );
  assert.deepEqual(
    row.map(({ id, sourcePath }) => sourcePath.endsWith(`${id}-generated-r2.png`)),
    [true, true, true, true],
  );
});

test("C1 void alpha has separate source provenance and no runtime mask residency", () => {
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS.length, 4);
  assert.deepEqual(
    NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS.map(({ tileId }) => tileId),
    ["r0-c2", "r0-c3", "r1-c2", "r1-c3"],
  );
  for (const mask of NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS) {
    assert.equal(mask.runtimeMounted, false);
    assert.equal(mask.runtimeDecodedBytes, 0);
    assert.deepEqual(mask.dimensions, [1448, 1086]);
    assert.ok(mask.sourcePath.endsWith(`${mask.tileId}-generated-r2.png`));
  }
});

test("close detail is atomically painted and page visibility suspends runtime work", async () => {
  const [nativeDetail, scene, waterCanvas, waterController] = await Promise.all([
    readFile(path.join(root, "features/career-world/development/NinjaOneEnvironmentNativeDetail.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/composition/WorldScene.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/components/WaterSurfaceCanvas.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/WaterSurfaceController.ts"), "utf8"),
  ]);
  assert.match(nativeDetail, /resolveNinjaOneEnvironmentNativeDemand\(\{/);
  assert.match(nativeDetail, /previousDemand,\s+shouldLoadCloseAssets/);
  assert.match(nativeDetail, /if \(demand !== previousDemand\)/);
  assert.match(nativeDetail, /retargetNinjaOneEnvironmentNativeDecodeCohort\(/);
  assert.match(nativeDetail, /const visible = presentation\.visible/);
  assert.match(nativeDetail, /lowerDetailAvailable: true/);
  assert.match(
    nativeDetail,
    /data-environment-native-no-visible-gap=\{presentation\.noVisibleGap\}/,
  );
  assert.match(nativeDetail, /onLoad=\{\(\) => recordDecodeEvent/);
  assert.doesNotMatch(nativeDetail, /detailState\.tier\.id === "close"/);
  assert.match(nativeDetail, /data-environment-native-visible=\{visible\}/);
  assert.match(nativeDetail, /opacity=\{visible \? 1 : 0\}/);
  assert.doesNotMatch(nativeDetail, /opacity=\{[^}]*siteToClose/);
  assert.match(scene, /new IntersectionObserver/);
  assert.match(scene, /rootMargin: "192px 0px"/);
  assert.match(waterCanvas, /controllerRef\.current\?\.setActive\(active\)/);
  assert.match(waterController, /setActive\(active: boolean\)/);
  assert.match(waterController, /Math\.min\(\s*0\.25/);
  assert.doesNotMatch(nativeDetail, /NINJAONE_ENVIRONMENT_NATIVE_HYDROLOGY/);
});

test("production native authoring is standalone and package-addressable", async () => {
  const [nativeBuilder, packageJson] = await Promise.all([
    readFile(path.join(root, "scripts/build-ninjaone-environment-native-detail.mjs"), "utf8"),
    readJson("package.json"),
  ]);
  assert.equal(
    packageJson.scripts["build:environment-native"],
    "node scripts/build-ninjaone-environment-native-detail.mjs --static-only",
  );
  assert.match(nativeBuilder, /SOURCE_TILE_ROOT/);
  assert.match(nativeBuilder, /VOID_MASK_TILE_IDS/);
  assert.match(nativeBuilder, /buildNinjaOneEnvironmentStaticTerrain/);
  assert.doesNotMatch(nativeBuilder, /master-detail-r2|detail-tiles-r3|registered-terrain-master/);
  assert.doesNotMatch(nativeBuilder, /harmon|buildHydrology|buildFoliage|fallback/i);
});

test("isolated preview renders semantic terrain and suppresses the city stack", async () => {
  const [
    page,
    scene,
    renderer,
    builder,
    semanticBuilder,
    nativeBuilder,
    waterRenderer,
    streamShader,
  ] = await Promise.all([
    readFile(path.join(
      root,
      "app/career-world/previews/ninjaone-environment/page.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/development/NinjaOneEnvironmentProof.tsx",
    ), "utf8"),
    readFile(path.join(root, "scripts/build-ninjaone-environment-proof.mjs"), "utf8"),
    readFile(path.join(root, "scripts/build-ninjaone-environment-semantics.mjs"), "utf8"),
    readFile(path.join(root, "scripts/build-ninjaone-environment-native-detail.mjs"), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/WaterSurfaceRenderer.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/shaders/ninjaone-streams.ts",
    ), "utf8"),
  ]);
  assert.match(page, /<CareerWorld enableDevelopmentTools environmentProof \/>/);
  assert.match(scene, /environmentProof \? \(/);
  assert.match(scene, /<NinjaOneEnvironmentProof/);
  for (const layer of [
    "terrain-geology",
    "secondary-relief",
    "static-foliage",
    "tertiary-relief",
    "trails",
    "shared-rocks",
    "shared-animated-foliage",
    "surface-ecology",
    "wildlife",
  ]) {
    assert.ok(renderer.includes(`"${layer}"`), `${layer} is not rendered`);
  }
  assert.match(scene, /<WaterSurfaceCanvas[\s\S]*?foregroundHydrology=\{environmentProof\}/);
  assert.doesNotMatch(renderer, /terrain-microdetail/);
  assert.doesNotMatch(renderer, /<InfrastructureLayer|<StructuresLayer|<NinjaOneCapitalMvp/);
  assert.match(builder, /world-land-mask-r4\.png/);
  assert.doesNotMatch(builder, /master-detail-r2|runtime-close-quilt-r3/);
  assert.match(builder, /native-detail-r2\.json/);
  assert.match(builder, /canonicalHeightFieldPath/);
  assert.match(builder, /canonicalSlopeFieldPath/);
  assert.match(semanticBuilder, /HYDROLOGY/);
  assert.match(semanticBuilder, /TRAILS/);
  assert.match(semanticBuilder, /WILDLIFE_RESOURCES/);
  assert.match(nativeBuilder, /SOURCE_TILE_ROOT/);
  assert.match(nativeBuilder, /VOID_MASK_TILE_IDS/);
  assert.match(nativeBuilder, /buildNinjaOneEnvironmentStaticTerrain/);
  assert.doesNotMatch(nativeBuilder, /master-detail-r2|detail-tiles-r3|registered-terrain-master/);
  assert.match(waterRenderer, /ninjaOneStreamFlow/);
  assert.match(waterRenderer, /u_ninjaOneStreamOrigin/);
  assert.match(streamShader, /float style = saturate\(encoded\.a \/ max\(coverage/);
  assert.match(streamShader, /vec2 decodedFlow = \(encodedFlow/);
  assert.match(
    streamShader,
    /primaryPhaseUvA = phaseBaseUv - flow \* flowPhaseA \* phaseAdvance/,
  );
  assert.match(
    streamShader,
    /materialBaseUv - flow \* flowPhaseA \* materialAdvance/,
  );
  assert.doesNotMatch(streamShader, /downhillAxis/);
  assert.match(streamShader, /float tarnPhase =/);
  assert.match(streamShader, /float lipAcceleration =/);
  assert.match(streamShader, /float fallingSheet =/);
  assert.match(streamShader, /float impactFoam =/);
  assert.match(streamShader, /float downstreamTurbulence =/);
  assert.match(streamShader, /float coastalFoam =/);
  assert.match(streamShader, /float mist = impact/);
  assert.match(streamShader, /OpenWaterSample primaryOceanSurface = sampleWaterBodyAtTime/);
  assert.match(streamShader, /OpenWaterSample offsetOceanSurface = sampleWaterBodyAtTime/);
  assert.match(streamShader, /OpenWaterSample oceanSurface = blendWaterSamples/);
  const registeredAlpha = streamShader.match(
    /result\.alpha = mask \* \(([\s\S]*?)\);\s+return result;/,
  );
  assert.ok(registeredAlpha, "registered hydrology alpha assignment is missing");
  assert.doesNotMatch(registeredAlpha[1], /time|sin|heightSample|foam|mist/);
  assert.doesNotMatch(nativeBuilder, /dynamicShadows:\s*Object\.freeze\(\{\s*enabled:\s*true/);
});
