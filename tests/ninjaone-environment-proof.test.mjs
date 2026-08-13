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
} from "../features/career-world/layers/terrain/model/ninjaOneEnvironmentProof.ts";
import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS,
  selectNinjaOneEnvironmentNativeInstances,
  selectNinjaOneEnvironmentNativeTiles,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentNativeDetail.ts";

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

test("environment proof owns a semantic city-free B1 B2 C1 C2 stack", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json",
  );
  assert.equal(manifest.id, NINJAONE_ENVIRONMENT_PROOF_ID);
  assert.equal(manifest.status, "environment-only-proof");
  assert.deepEqual(NINJAONE_ENVIRONMENT_GRID_CELLS, ["B1", "B2", "C1", "C2"]);
  assert.deepEqual(manifest.registration.gridCells, ["B1", "B2", "C1", "C2"]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_WORLD_ORIGIN, [0.125, 0]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_WORLD_SPAN, [0.25, 1 / 3]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_ARTBOARD, [1440, 1080]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_LAYER_ORDER, [
    "terrain-geology",
    "secondary-relief",
    "static-foliage",
    "tertiary-relief",
    "trails",
    "shared-rocks",
    "shared-animated-foliage",
    "surface-ecology",
    "wildlife",
    "dynamic-shadows",
  ]);
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
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.capital, ["terrain-geology"]);
  for (const tier of ["capital", "site"]) {
    assert.match(
      NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[tier].path,
      /-r\d+\.webp\?v=[a-f0-9]{12}$/,
    );
  }
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.site, [
    "terrain-geology",
    "shared-animated-foliage",
  ]);
  assert.deepEqual(NINJAONE_ENVIRONMENT_LOD_LAYERS.close, [
    "terrain-geology",
    "shared-animated-foliage",
  ]);
  assert.match(
    NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.close.path,
    /-r\d+\.webp\?v=[a-f0-9]{12}$/,
  );
  assert.deepEqual(
    ["territory", "capital", "site", "close"].map(
      (tier) => NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[tier].dimensions[0],
    ),
    [720, 1440, 2880, 5760],
  );
});

test("registered plates retain one 4:3 geometry and transparent layering", async () => {
  const tieredSources = [
    [NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES, ["territory", "capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES, ["territory", "capital", "site", "close"]],
    [NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES, ["capital", "site", "close"]],
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

test("regional terrain detail uses one coherent cohort and a registered contact repair", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json",
  );
  const contactMask = manifest.layers.geology.contactMask;
  const revision = manifest.layers.geology.sourcePath.match(/-r(\d+)\.png$/)?.[1];
  assert.ok(revision, "terrain source must declare a revision");
  assert.deepEqual(Object.keys(manifest.layers.geology.sources), [
    "territory",
    "capital",
    "site",
    "close",
  ]);
  for (const source of Object.values(manifest.layers.geology.sources)) {
    assert.match(source.path, new RegExp(`-r${revision}\\.webp\\?v=[a-f0-9]{12}$`));
    assert.equal(await stat(runtimeAssetFile(source.path)).then(() => true), true);
  }
  assert.equal(manifest.layers.geology.contactRepair.alphaPreserved, true);
  assert.equal(manifest.layers.geology.contactRepair.projectionChanged, false);
  assert.deepEqual(manifest.layers.geology.contactRepair.contacts, ["B1-B2", "B1-C1"]);
  assert.deepEqual(contactMask.dimensions, [1440, 1080]);
  assert.deepEqual(contactMask.contactEdges, ["left", "right", "bottom"]);
  assert.equal(contactMask.shape, "deterministic-multiscale-irregular");
  assert.equal((await sharp(runtimeAssetFile(contactMask.path)).metadata()).format, "png");
});

test("environment registration does not expose a legacy static hydrology plate", async () => {
  const [manifest, model] = await Promise.all([
    readJson(
      "public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json",
    ),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/model/ninjaOneEnvironmentProof.ts",
    ), "utf8"),
  ]);

  assert.equal(manifest.layers.hydrology, undefined);
  assert.doesNotMatch(model, /NINJAONE_ENVIRONMENT_HYDROLOGY_SOURCES/);
  assert.doesNotMatch(model, /layers\.hydrology\.sources/);
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

test("native terrain delegates foliage to a separate production manifest", async () => {
  const [native, foliage] = await Promise.all([
    readJson("public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json"),
    readJson("public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json"),
  ]);
  assert.deepEqual(Object.keys(native.layers), ["dynamicShadows"]);
  assert.equal(foliage.id, "career-world/capitals/ninjaone/foliage-native@r3");
  assert.ok(foliage.resources.length > 0);
  assert.ok(foliage.instances.length <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES);
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

test("close detail mounts additive layers only and page visibility suspends runtime work", async () => {
  const [nativeDetail, scene, waterCanvas, waterController] = await Promise.all([
    readFile(path.join(root, "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentNativeDetail.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/composition/WorldScene.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/ocean/components/WaterSurfaceCanvas.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/ocean/rendering/WaterSurfaceController.ts"), "utf8"),
  ]);
  assert.match(nativeDetail, /data-environment-native-render-mode="additive-only"/);
  assert.match(nativeDetail, /data-environment-native-terrain-node-count="0"/);
  assert.match(nativeDetail, /data-environment-native-seam-node-count="0"/);
  assert.match(nativeDetail, /resolveNinjaOneEnvironmentFoliageEligibility\(\{/);
  assert.match(nativeDetail, /shouldLoadCloseAssets: detailState\.shouldLoadSiteAssets/);
  assert.match(nativeDetail, /active=\{active && siteOrCloser\}/);
  assert.match(nativeDetail, /maximumGroups=\{NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS\}/);
  assert.doesNotMatch(nativeDetail, /NinjaOneEnvironmentSeamIntegration/);
  assert.doesNotMatch(nativeDetail, /<image|terrainTiles|seamIntegration/);
  assert.match(scene, /new IntersectionObserver/);
  assert.match(scene, /rootMargin: "192px 0px"/);
  assert.match(waterCanvas, /controllerRef\.current\?\.setActive\(active\)/);
  assert.match(waterController, /setActive\(active: boolean\)/);
  assert.match(waterController, /Math\.min\(\s*0\.05/);
  assert.doesNotMatch(nativeDetail, /HydrologyAdmission|hydrologyAdmission/);
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

test("the root-selectable environment proof renders semantic terrain and suppresses the city stack", async () => {
  const [
    page,
    scene,
    renderer,
    nativeBuilder,
    waterRenderer,
  ] = await Promise.all([
    readFile(path.join(
      root,
      "app/page.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/components/NinjaOneEnvironmentProof.tsx",
    ), "utf8"),
    readFile(path.join(root, "scripts/build-ninjaone-environment-native-detail.mjs"), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/ocean/rendering/WaterSurfaceRenderer.ts",
    ), "utf8"),
  ]);
  assert.match(
    page,
    /case "ninjaone-environment":[\s\S]*?<CareerWorld enableDevelopmentTools environmentProof \/>/,
  );
  assert.match(
    scene,
    /const showNinjaOneInlandWater = \([\s\S]*?detailState\.tier\.id !== "world"[\s\S]*?detailState\.tier\.id !== "territory"/,
  );
  assert.match(
    scene,
    /showNinjaOneInlandWater && inlandWaterAuthorityVisible \? \([\s\S]*?<NinjaOneInlandWaterCanvas[\s\S]*?active=\{isPageVisible && inlandWaterMotionVisible\}/,
  );
  assert.match(
    scene,
    /<NinjaOneEnvironmentProof[\s\S]*?proofMode=\{environmentProof\}/,
  );
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
  assert.match(scene, /<WaterSurfaceCanvas[\s\S]*?active=\{isPageVisible\}/);
  assert.doesNotMatch(renderer, /terrain-microdetail/);
  assert.doesNotMatch(renderer, /<InfrastructureLayer|<StructuresLayer|<NinjaOneCapitalMvp/);
  assert.match(nativeBuilder, /SOURCE_TILE_ROOT/);
  assert.match(nativeBuilder, /VOID_MASK_TILE_IDS/);
  assert.match(nativeBuilder, /buildNinjaOneEnvironmentStaticTerrain/);
  assert.doesNotMatch(nativeBuilder, /master-detail-r2|detail-tiles-r3|registered-terrain-master/);
  assert.match(waterRenderer, /\["worldAlbedo", WATER_ASSETS\.worldAlbedo/);
  assert.doesNotMatch(waterRenderer, /hydrology|ninjaOneStream|riverSurface/i);
  assert.doesNotMatch(nativeBuilder, /dynamicShadows:\s*Object\.freeze\(\{\s*enabled:\s*true/);
});
