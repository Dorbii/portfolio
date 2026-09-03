import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  NINJAONE_ENVIRONMENT_GEOLOGY_TRANSITION_SOURCES,
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
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
  ninjaOneEnvironmentGeologyTierWeights,
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
  assert.deepEqual(NINJAONE_ENVIRONMENT_WORLD_SPAN, [0.125, 1 / 6]);
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
    [NINJAONE_ENVIRONMENT_GEOLOGY_TRANSITION_SOURCES, ["territory", "capital", "site", "close"]],
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
  assert.deepEqual(
    manifest.layers.geology.contactRepair.contacts,
    ["B1-B2", "B1-C1", "C1-C2"],
  );
  assert.deepEqual(contactMask.dimensions, [1440, 1080]);
  assert.deepEqual(contactMask.contactEdges, ["left", "right", "bottom"]);
  assert.match(contactMask.shape, /wide.*irregular/u);
  assert.equal((await sharp(runtimeAssetFile(contactMask.path)).metadata()).format, "png");
});

test("interim terrain transition is wide, reversible, and pixel-bounded", async () => {
  const [environment, treatment] = await Promise.all([
    readJson("public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json"),
    readJson("public/career-world/capitals/ninjaone/environment/manifests/terrain-transition-interim-r1.json"),
  ]);
  const contactMask = environment.layers.geology.contactMask;
  assert.match(treatment.status, /^INTERIM-/u);
  assert.equal(environment.layers.geology.transitionTreatment.id, treatment.id);
  assert.ok(contactMask.featherPixels >= environment.registration.artboard[1] * 0.1);
  assert.ok(
    treatment.boundaryCensus.transitionWidths.median
      >= treatment.boundaryCensus.previousTransitionWidths.median * 4,
  );
  assert.ok(
    treatment.riverExit.blueBottomPixelsAfter
      <= treatment.riverExit.blueBottomPixelsBefore * 0.005,
  );
  assert.ok(
    Math.max(
      treatment.patchBorders.topLeftRightLuminancePercent,
      treatment.patchBorders.topLeftRightSaturationPercent,
      treatment.patchBorders.bottomEffectiveCompositePercent,
    ) <= treatment.patchBorders.limitPercent,
  );

  const [previous, current, support] = await Promise.all([
    sharp(path.join(root, treatment.sources.previous)).ensureAlpha().raw().toBuffer(),
    sharp(path.join(root, treatment.sources.current)).ensureAlpha().raw().toBuffer(),
    sharp(runtimeAssetFile(treatment.changedPixelPolicy.affectedSupportMaskPath))
      .greyscale().raw().toBuffer(),
  ]);
  assert.equal(previous.length, current.length);
  assert.equal(support.length * 4, current.length);
  let changedPixels = 0;
  let outsideChangedPixels = 0;
  for (let pixel = 0; pixel < support.length; pixel += 1) {
    const index = pixel * 4;
    assert.equal(current[index + 3], previous[index + 3], "T40 must preserve source alpha");
    const changed = current[index] !== previous[index]
      || current[index + 1] !== previous[index + 1]
      || current[index + 2] !== previous[index + 2];
    if (changed) changedPixels += 1;
    if (changed && support[pixel] === 0) outsideChangedPixels += 1;
  }
  assert.ok(changedPixels > 0);
  assert.equal(outsideChangedPixels, 0);
  assert.equal(treatment.changedPixelPolicy.outsideChangedPixels, 0);

  for (const tier of ["territory", "capital", "site", "close"]) {
    const baseSize = await stat(runtimeAssetFile(NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[tier].path));
    const transitionSize = await stat(runtimeAssetFile(NINJAONE_ENVIRONMENT_GEOLOGY_TRANSITION_SOURCES[tier].path));
    assert.ok(transitionSize.size < baseSize.size, `${tier} interim overlay must remain cheaper than its base plate`);
  }

  for (const protectedFile of treatment.protectedFiles) {
    const actual = createHash("sha256")
      .update(await readFile(path.join(root, protectedFile.path)))
      .digest("hex");
    assert.equal(actual, protectedFile.sha256, `${protectedFile.path} changed during T40`);
  }
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
  const allResources = [
    ...NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
    ...NINJAONE_ENVIRONMENT_ROCK_RESOURCES,
  ];
  for (const resource of allResources) {
    const metadata = await readImageMetadata(resource.path);
    assert.equal(metadata.hasAlpha, true, `${resource.path} must retain alpha`);
    assert.ok(metadata.size > 2_000, `${resource.path} is unexpectedly empty`);
  }
  assert.ok([
    ...NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
    ...NINJAONE_ENVIRONMENT_ROCK_INSTANCES,
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
    readJson("public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json"),
  ]);
  assert.deepEqual(Object.keys(native.layers), ["dynamicShadows"]);
  assert.equal(foliage.id, "career-world/capitals/ninjaone/foliage@r6");
  assert.ok(foliage.resources.length > 0);
  assert.equal(foliage.instances.length, foliage.budgets.poolGroups);
  assert.ok(
    foliage.budgets.maximumSelectedGroups * foliage.budgets.nodesPerGroup
      <= foliage.budgets.maximumSupplementalNodes,
  );
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
  // A long stall must not advect foam half a screen, so the shipping path caps
  // the step at 50 ms. ?water.capture relaxes it deliberately: a hidden page
  // gets its timers clamped to one second, and a capture of a simulation that
  // has advanced a twentieth of real time is a confident picture of the wrong
  // thing. The relaxation has to stay gated on that flag.
  assert.match(waterController, /this\.captureWhileHidden \? 1\.5 : 0\.05/);
  assert.match(waterController, /water\.capture/);
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
    geologyRenderer,
    landRenderer,
    streamTiles,
    styles,
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
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/components/NinjaOneEnvironmentGeology.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/components/TerritoryLandform.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/model/streamTiles.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/styles/career-world.css",
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
  assert.match(
    renderer,
    /<NinjaOneEnvironmentGeology[\s\S]*?onReadyChange=\{onGeologyReadyChange\}/,
    "the authored geology replacement must publish paint readiness",
  );
  assert.match(
    geologyRenderer,
    /className="career-world__layer ninjaone-environment-geology"[\s\S]*?data-environment-authority="L2"/,
    "authored geology must be mounted at terrain authority depth",
  );
  assert.match(
    geologyRenderer,
    /data-environment-layer="terrain-geology"[\s\S]*?href=\{source\.path\}/,
    "the accepted authored geology must remain visible in production",
  );
  assert.match(
    scene,
    /ninjaOneGeologyReady[\s\S]*?suppressDetailedStreaming=\{ninjaOneEnvironmentOwnsCamera\}/,
    "global detail sources may retire only after the authored replacement is ready",
  );
  assert.match(
    landRenderer,
    /!detailState\.shouldLoadTerritoryAssets[\s\S]*?\|\| suppressDetailedStreaming[\s\S]*?\|\| detailPlateRetired/,
    "the redundant full-world detail plate must not decode under a ready replacement",
  );
  assert.doesNotMatch(
    streamTiles,
    /KAIZEN_CITY_OCCLUDED_TERRAIN_TILE_IDS|\.filter\(\(\{ id \}\)/,
    "terrain registration must not infer that an optional city plate is mounted",
  );
  assert.match(styles, /\.ninjaone-environment-geology \{\s*z-index: 3;/);
  assert.match(styles, /\.ninjaone-environment-proof \{\s*z-index: 7;/);
  assert.doesNotMatch(renderer, /ninjaone-environment-proof-alpha/);
  const terrainRenderers = `${renderer}\n${geologyRenderer}`;
  for (const layer of [
    "terrain-geology",
    "secondary-relief",
    "static-foliage",
    "tertiary-relief",
    "trails",
    "shared-rocks",
    "shared-animated-foliage",
    "surface-ecology",
  ]) {
    assert.ok(terrainRenderers.includes(`"${layer}"`), `${layer} is not rendered`);
  }
  assert.match(scene, /<WaterSurfaceCanvas[\s\S]*?active=\{isPageVisible\}/);
  assert.match(scene, /showFoliage=\{terrainFoliageVisible\}/);
  assert.match(scene, /terrainFoliageVisible \? \([\s\S]*?<FoliageLayer/);
  assert.match(geologyRenderer, /ninjaone-inland-terrain-erase-r1\.png/);
  assert.match(geologyRenderer, /ninjaone-environment-geology-terrain-erase-filter/);
  assert.match(
    geologyRenderer,
    /"0 0 0 1 0"/,
    "the terrain cutout must preserve source alpha instead of erasing its full bounding box",
  );
  assert.doesNotMatch(geologyRenderer, /"0 0 0 0 1"/);
  assert.match(
    geologyRenderer,
    /id="ninjaone-environment-geology-source-alpha"[\s\S]*?<feFuncA intercept="0" slope="32" type="linear"/,
    "authored terrain alpha must be hardened without blurring or recoloring its RGB master",
  );
  assert.doesNotMatch(
    styles,
    /ninjaone-environment-geology[^}]*filter:/,
    "the accepted authored terrain master must not be recolored by runtime CSS",
  );
  const geologyWeightScenarios = [
    { capitalToSite: 0, siteToClose: 0, tierId: "capital" },
    { capitalToSite: 0.5, siteToClose: 0, tierId: "site" },
    { capitalToSite: 1, siteToClose: 0.5, tierId: "close" },
    { capitalToSite: 1, siteToClose: 1, tierId: "close" },
  ];
  for (const scenario of geologyWeightScenarios) {
    const weights = ninjaOneEnvironmentGeologyTierWeights(scenario);
    assert.ok(weights.length >= 1);
    assert.ok(weights.every(({ opacity }) => opacity > 0 && opacity <= 1));
    assert.ok(Math.abs(weights.reduce((sum, { opacity }) => sum + opacity, 0) - 1) < 1e-9);
    assert.equal(new Set(weights.map(({ tier }) => tier)).size, weights.length);
  }
  assert.doesNotMatch(renderer, /ninjaone-inland-water-field-r1\.png/);
  assert.doesNotMatch(renderer, /wildlife/i);
  assert.doesNotMatch(renderer, /terrain-microdetail/);
  assert.doesNotMatch(renderer, /<InfrastructureLayer|<StructuresLayer/);
  assert.match(nativeBuilder, /SOURCE_TILE_ROOT/);
  assert.match(nativeBuilder, /VOID_MASK_TILE_IDS/);
  assert.match(nativeBuilder, /buildNinjaOneEnvironmentStaticTerrain/);
  assert.doesNotMatch(nativeBuilder, /master-detail-r2|detail-tiles-r3|registered-terrain-master/);
  // The solved renderer supersedes every painted material path, T27d's banded
  // reconstruction included: the water is no longer a texture reconstructed
  // from offline bands, it is an eikonal phase field solved once against the
  // coast authority and sampled through the camera.
  assert.match(waterRenderer, /OCEAN_FIELD_ASSETS\.phase/);
  assert.match(waterRenderer, /OCEAN_FIELD_ASSETS\.flow/);
  assert.doesNotMatch(waterRenderer, /materialBands|worldAlbedo|macroHeight|microHeight/);
  // The phase texture packs a 16-bit residual across two 8-bit channels, so
  // hardware bilinear would interpolate the high and low bytes independently
  // and spike the reconstructed phase at every low-byte wrap.
  assert.match(waterRenderer, /texPhase: createTexture\([^)]*"nearest"\)/);
  assert.doesNotMatch(waterRenderer, /hydrology|ninjaOneStream|riverSurface/i);
  assert.doesNotMatch(nativeBuilder, /dynamicShadows:\s*Object\.freeze\(\{\s*enabled:\s*true/);
});
