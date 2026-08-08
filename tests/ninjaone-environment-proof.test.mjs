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
  NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
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

async function adjacentVerticalEdgeMae(leftPath, rightPath) {
  const [left, right] = await Promise.all([
    sharp(leftPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(rightPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(left.info.width, right.info.width);
  assert.equal(left.info.height, right.info.height);
  let error = 0;
  let samples = 0;
  for (let y = 0; y < left.info.height; y += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      error += Math.abs(
        left.data[(y * left.info.width + left.info.width - 1) * 3 + channel]
        - right.data[y * right.info.width * 3 + channel],
      );
      samples += 1;
    }
  }
  return error / samples;
}

async function adjacentHorizontalEdgeMae(topPath, bottomPath) {
  const [top, bottom] = await Promise.all([
    sharp(topPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(bottomPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(top.info.width, bottom.info.width);
  assert.equal(top.info.height, bottom.info.height);
  let error = 0;
  let samples = 0;
  for (let x = 0; x < top.info.width; x += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      error += Math.abs(
        top.data[((top.info.height - 1) * top.info.width + x) * 3 + channel]
        - bottom.data[x * 3 + channel],
      );
      samples += 1;
    }
  }
  return error / samples;
}

async function adjacentOpaqueEdgeMae(firstPath, secondPath, orientation) {
  const [first, second] = await Promise.all([
    sharp(firstPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(secondPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(first.info.width, second.info.width);
  assert.equal(first.info.height, second.info.height);
  const vertical = orientation === "vertical";
  const length = vertical ? first.info.height : first.info.width;
  let error = 0;
  let samples = 0;
  for (let position = 0; position < length; position += 1) {
    const firstPixel = vertical
      ? position * first.info.width + first.info.width - 1
      : (first.info.height - 1) * first.info.width + position;
    const secondPixel = vertical ? position * second.info.width : position;
    const firstOffset = firstPixel * 4;
    const secondOffset = secondPixel * 4;
    if (first.data[firstOffset + 3] < 180 || second.data[secondOffset + 3] < 180) {
      continue;
    }
    for (let channel = 0; channel < 3; channel += 1) {
      error += Math.abs(
        first.data[firstOffset + channel] - second.data[secondOffset + channel],
      );
      samples += 1;
    }
  }
  return { mae: samples > 0 ? error / samples : null, samples };
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
  assert.deepEqual(manifest.registration.runtimeTileDimensions, [1440, 1080]);
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
  assert.deepEqual(manifest.layers.hydrology.flowField.dimensions, [1440, 1080]);
  assert.ok(manifest.layers.hydrology.flowField.opaquePixels > 1_000);
  assert.equal(manifest.layers.hydrology.segments.length, 6);

  for (const tile of NINJAONE_ENVIRONMENT_NATIVE_TILES) {
    const metadata = await readImageMetadata(tile.path);
    assert.deepEqual([metadata.width, metadata.height], [1440, 1080]);
    assert.equal(metadata.format, "png");
    assert.equal(metadata.hasAlpha, true);
    const bytes = await readFile(runtimeAssetFile(tile.path));
    assert.equal(
      (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex").toUpperCase(),
      tile.sha256,
    );
  }

  const decodedTerrainBytes = NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES
    * 1440 * 1080 * 4;
  const largestAnimatedResources = [
    ...NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES,
  ].map(({ dimensions }) => dimensions[0] * dimensions[1] * 4)
    .sort((left, right) => right - left)
    .slice(0, NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES);
  assert.ok(
    decodedTerrainBytes
      + largestAnimatedResources.reduce((total, value) => total + value, 0)
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  );
});

test("native detail selection never mounts an unbounded tile or animation set", () => {
  const cameras = [
    { origin: [0.198, 0.18], span: [0.04, 0.04] },
    { origin: [0.235, 0.145], span: [0.05, 0.05] },
    { origin: [0.34, 0.02], span: [0.045, 0.045] },
    { origin: [0.13, 0.26], span: [0.06, 0.06] },
  ];
  const allInstances = NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES;
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

test("native shared foliage stays sparse and hydrology uses one registered flow field", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json",
  );
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES.length, 5);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES.length, 5);
  for (const resource of NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES) {
    const file = runtimeAssetFile(resource.path);
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .extractChannel("alpha")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const nontransparent = data.reduce(
      (total, value) => total + (value > 0 ? 1 : 0),
      0,
    );
    assert.equal(nontransparent, resource.opaquePixels);
    assert.ok(nontransparent / (info.width * info.height) < 0.42);
  }
  const flowField = await sharp(runtimeAssetFile(manifest.layers.hydrology.flowField.path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([flowField.info.width, flowField.info.height], [1440, 1080]);
  const flowStyles = new Set();
  let flowPixels = 0;
  for (let offset = 0; offset < flowField.data.length; offset += 4) {
    if (flowField.data[offset] > 0) {
      flowPixels += 1;
      flowStyles.add(flowField.data[offset + 3]);
    }
  }
  assert.equal(flowPixels, manifest.layers.hydrology.flowField.opaquePixels);
  assert.deepEqual([...flowStyles].sort((left, right) => left - right), [48, 176, 255]);
  for (const resource of NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES) {
    const file = runtimeAssetFile(resource.path);
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .extractChannel("alpha")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rootBandStart = Math.floor(info.height * 0.92);
    let maximumRootAlpha = 0;
    for (let y = rootBandStart; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        maximumRootAlpha = Math.max(maximumRootAlpha, data[y * info.width + x]);
      }
    }
    assert.ok(
      maximumRootAlpha <= 24,
      `${resource.id} moves opaque pixels through its rooted lower band`,
    );
  }
});

test("registered native tiles use canonical grid origins and sealed opaque edges", async () => {
  const tiles = new Map(NINJAONE_ENVIRONMENT_NATIVE_TILES.map((tile) => [tile.id, tile]));
  for (const tile of tiles.values()) {
    assert.deepEqual(
      tile.artboardBounds.origin,
      [tile.column * 360, tile.row * 270],
      `${tile.id} must remain in its canonical grid slot`,
    );
    const right = tiles.get(`r${tile.row}-c${tile.column + 1}`);
    if (right) {
      const edge = await adjacentOpaqueEdgeMae(
        runtimeAssetFile(tile.path),
        runtimeAssetFile(right.path),
        "vertical",
      );
      if (edge.samples > 0) {
        assert.ok(edge.mae <= 1, `${tile.id}/${right.id} runtime edge MAE is ${edge.mae}`);
      }
    }
    const bottom = tiles.get(`r${tile.row + 1}-c${tile.column}`);
    if (bottom) {
      const edge = await adjacentOpaqueEdgeMae(
        runtimeAssetFile(tile.path),
        runtimeAssetFile(bottom.path),
        "horizontal",
      );
      if (edge.samples > 0) {
        assert.ok(edge.mae <= 1, `${tile.id}/${bottom.id} runtime edge MAE is ${edge.mae}`);
      }
    }
  }
});

test("contextual outpainting replaces the visible row with one seam-safe cohort", async () => {
  const row = NINJAONE_ENVIRONMENT_NATIVE_TILES
    .filter(({ row }) => row === 2)
    .sort((left, right) => left.column - right.column);
  assert.equal(row.length, 4);
  assert.ok(row.every(({ sourcePath }) => sourcePath.includes("/detail-tiles-r3/")));
  for (let column = 0; column < row.length - 1; column += 1) {
    const authored = await adjacentVerticalEdgeMae(
      path.join(root, row[column].sourcePath.slice(1)),
      path.join(root, row[column + 1].sourcePath.slice(1)),
    );
    const legacy = await adjacentVerticalEdgeMae(
      path.join(root, "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated", `r2-c${column}-generated-r2.png`),
      path.join(root, "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated", `r2-c${column + 1}-generated-r2.png`),
    );
    assert.ok(authored < 15, `r2-c${column}/r2-c${column + 1} edge MAE is ${authored}`);
    assert.ok(authored < legacy * 0.5);
  }
});

test("contextual outpainting continues the central tile north without a hard edge", async () => {
  const tile = (id) => NINJAONE_ENVIRONMENT_NATIVE_TILES.find((value) => value.id === id);
  const north = tile("r1-c2");
  const center = tile("r2-c2");
  assert.ok(north.sourcePath.includes("/detail-tiles-r3/"));
  assert.ok(center.sourcePath.includes("/detail-tiles-r3/"));
  const authored = await adjacentHorizontalEdgeMae(
    path.join(root, north.sourcePath.slice(1)),
    path.join(root, center.sourcePath.slice(1)),
  );
  const legacy = await adjacentHorizontalEdgeMae(
    path.join(root, "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r1-c2-generated-r2.png"),
    path.join(root, "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r2-c2-generated-r2.png"),
  );
  assert.ok(authored < 13, `r1-c2/r2-c2 edge MAE is ${authored}`);
  assert.ok(authored < legacy * 0.6);
});

test("close detail is atomically painted and page visibility suspends runtime work", async () => {
  const [nativeDetail, scene, waterCanvas, waterController, styles] = await Promise.all([
    readFile(path.join(root, "features/career-world/development/NinjaOneEnvironmentNativeDetail.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/composition/WorldScene.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/components/WaterSurfaceCanvas.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/WaterSurfaceController.ts"), "utf8"),
    readFile(path.join(root, "features/career-world/styles/career-world.css"), "utf8"),
  ]);
  assert.match(nativeDetail, /active && detailState\.shouldLoadCloseAssets/);
  assert.doesNotMatch(nativeDetail, /detailState\.tier\.id === "close"/);
  assert.match(nativeDetail, /data-environment-native-visible=\{visible\}/);
  assert.match(nativeDetail, /opacity=\{visible \? 1 : 0\}/);
  assert.doesNotMatch(nativeDetail, /opacity=\{[^}]*siteToClose/);
  assert.match(scene, /new IntersectionObserver/);
  assert.match(scene, /rootMargin: "192px 0px"/);
  assert.match(waterCanvas, /controllerRef\.current\?\.setActive\(active\)/);
  assert.match(waterController, /setActive\(active: boolean\)/);
  assert.match(waterController, /Math\.min\(\s*0\.25/);
  assert.match(styles, /transform-origin: 50% 88%/);
  assert.match(styles, /opacity: 0\.42/);
  assert.doesNotMatch(styles, /rotate\(0\.2deg\) skewX\(0\.12deg\) scaleY\(1\.0015\)/);
  assert.doesNotMatch(styles, /translate\(1\.9px, -0\.3px\) rotate\(0\.62deg\)/);
  assert.doesNotMatch(styles, /ninjaone-native-waterfall-flow/);
  assert.doesNotMatch(nativeDetail, /NINJAONE_ENVIRONMENT_NATIVE_HYDROLOGY/);
  assert.match(nativeDetail, /const visible = active && ready && detailState\.shouldLoadCloseAssets/);
  assert.doesNotMatch(nativeDetail, /detailState\.tier\.id === "close"/);
});

test("tile authoring uses one-eighth context and minimum-error seam quilting", async () => {
  const [prepare, finalize, reconcileCorner] = await Promise.all([
    readFile(path.join(root, "scripts/prepare-ninjaone-environment-tile-context.mjs"), "utf8"),
    readFile(path.join(root, "scripts/finalize-ninjaone-environment-tile-outpaint.mjs"), "utf8"),
    readFile(path.join(root, "scripts/reconcile-ninjaone-environment-corner-revision.mjs"), "utf8"),
  ]);
  assert.match(prepare, /const OVERLAP_RATIO = 1 \/ 8/);
  assert.match(prepare, /Math\.round\(patchHeight \* 1\.5\)/);
  assert.match(prepare, /verticalInset/);
  assert.match(finalize, /function findVerticalSeam/);
  assert.match(finalize, /generatedMetadata\.width \/ generatedMetadata\.height/);
  assert.match(finalize, /direction === "north" \? resizedHeight - patchHeight : 0/);
  assert.match(finalize, /const mix = local > seam\[y\] \? 1 : 0/);
  assert.doesNotMatch(finalize, /const feather =/);
  assert.match(reconcileCorner, /const lockDepth = Math\.round\(height \/ 8\)/);
  assert.match(reconcileCorner, /const backtrack = new Int8Array/);
  assert.match(reconcileCorner, /y < seamY \? edited : locked/);
  assert.match(reconcileCorner, /seamMae/);
});

test("isolated preview renders semantic terrain and suppresses the city stack", async () => {
  const [
    page,
    scene,
    renderer,
    builder,
    semanticBuilder,
    nativeBuilder,
    registeredBuilder,
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
    readFile(path.join(root, "scripts/lib/ninjaone-registered-terrain-master.mjs"), "utf8"),
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
    "hydrology",
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
  assert.doesNotMatch(renderer, /terrain-microdetail/);
  assert.doesNotMatch(renderer, /<InfrastructureLayer|<StructuresLayer|<NinjaOneCapitalMvp/);
  assert.match(builder, /world-land-mask-r4\.png/);
  assert.match(builder, /ninjaone-environment-terrain-master-detail-r2\.png/);
  assert.match(builder, /native-detail-r2\.json/);
  assert.match(builder, /canonicalHeightFieldPath/);
  assert.match(builder, /canonicalSlopeFieldPath/);
  assert.match(semanticBuilder, /HYDROLOGY/);
  assert.match(semanticBuilder, /TRAILS/);
  assert.match(semanticBuilder, /WILDLIFE_RESOURCES/);
  assert.match(nativeBuilder, /detail-tiles-r2\/generated/);
  assert.match(nativeBuilder, /detail-tiles-r3\/generated/);
  assert.match(nativeBuilder, /const FALLBACK_TARGET_TILES = TARGET_TILES/);
  assert.match(nativeBuilder, /canopy-only grouped assets/);
  assert.match(nativeBuilder, /function buildHydrologyFlowField/);
  assert.match(nativeBuilder, /registered flow field drives the global WebGL water renderer/);
  assert.doesNotMatch(nativeBuilder, /function hydrologySpriteRgba/);
  assert.match(nativeBuilder, /id: "c2-east-headwater-flow"/);
  assert.match(nativeBuilder, /flowVector: Object\.freeze\(\[-3\.5, 5\]\)/);
  assert.doesNotMatch(nativeBuilder, /neutralizeCanopies|\.blur\(10\)/);
  assert.match(nativeBuilder, /buildFallbackTileAlpha/);
  assert.match(nativeBuilder, /const feather = 320/);
  assert.match(nativeBuilder, /column \* TILE_ARTBOARD\.width/);
  assert.match(nativeBuilder, /row \* TILE_ARTBOARD\.height/);
  assert.doesNotMatch(nativeBuilder, /NORTHWEST_COAST_BOUNDS/);
  assert.match(registeredBuilder, /function sealVerticalSeam/);
  assert.match(registeredBuilder, /function sealHorizontalSeam/);
  assert.match(waterRenderer, /ninjaOneStreamFlow/);
  assert.match(waterRenderer, /u_ninjaOneStreamOrigin/);
  assert.match(streamShader, /vec2 decodedFlow/);
  assert.match(streamShader, /float waterfall/);
  assert.match(streamShader, /OpenWaterSample primaryOceanSurface = sampleWaterBodyAtTime/);
  assert.match(streamShader, /OpenWaterSample offsetOceanSurface = sampleWaterBodyAtTime/);
  assert.match(streamShader, /OpenWaterSample oceanSurface = blendWaterSamples/);
  assert.match(streamShader, /float primarySurfaceMix/);
  assert.match(streamShader, /float flowingMaterialTime/);
  assert.match(streamShader, /float materialTime = mix\(flowingMaterialTime/);
  assert.match(streamShader, /float downstreamSpeed/);
  assert.match(streamShader, /float primaryFoamBreakup/);
  assert.match(streamShader, /float offsetFoamBreakup/);
  assert.match(streamShader, /float foamBreakup = mix/);
  assert.match(streamShader, /float downhillDistance = centeredPixels\.y/);
  assert.match(streamShader, /float longitudinalCoordinate/);
  assert.match(streamShader, /float downhillPhase/);
  assert.match(streamShader, /float crestWave/);
  assert.match(streamShader, /float travelingCrest/);
  assert.match(streamShader, /float travelingTrough/);
  assert.match(streamShader, /downhillDistance \* mix\(0\.11, 0\.15, waterfall\)/);
  assert.match(streamShader, /Coverage is topology-owned and time-invariant/);
  assert.doesNotMatch(streamShader, /impactPulse/);
  assert.match(streamShader, /float impactZone/);
  assert.match(streamShader, /float mist = impactZone/);
  assert.match(streamShader, /Keep this layer translucent/);
  assert.doesNotMatch(nativeBuilder, /dynamicShadows:\s*Object\.freeze\(\{\s*enabled:\s*true/);
});
