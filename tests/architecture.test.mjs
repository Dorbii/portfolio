import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CAREER_WORLD_LAYER_ORDER,
} from "../features/career-world/shared/layers.ts";
import {
  ENVIRONMENT_LAYER_DEFINITIONS,
} from "../features/career-world/shared/environmentLayers.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const featureLayers = path.join(root, "features", "career-world", "layers");
const publicLayers = path.join(root, "public", "career-world", "layers");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("composition and environment registries expose unique ordered layer contracts", () => {
  assert.equal(CAREER_WORLD_LAYER_ORDER.length, 7);
  assert.equal(new Set(CAREER_WORLD_LAYER_ORDER).size, 7);
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("coastline"), false);
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("water-surface"), false);
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("territory-landform"), false);
  assert.ok(CAREER_WORLD_LAYER_ORDER.includes("ocean"));
  assert.ok(CAREER_WORLD_LAYER_ORDER.includes("terrain"));
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("environment"), false);
  assert.equal(ENVIRONMENT_LAYER_DEFINITIONS.length, 21);
  assert.equal(
    ENVIRONMENT_LAYER_DEFINITIONS.some(({ id }) => id === "L3_3"),
    false,
  );
  assert.equal(
    new Set(ENVIRONMENT_LAYER_DEFINITIONS.map(({ id }) => id)).size,
    ENVIRONMENT_LAYER_DEFINITIONS.length,
  );
  assert.deepEqual(
    ENVIRONMENT_LAYER_DEFINITIONS
      .filter(({ parentId }) => parentId)
      .map(({ parentId }) => parentId)
      .every((parentId) => ["L1", "L2", "L3", "L4"].includes(parentId)),
    true,
  );
});

test("topography and territory QA remain independent interface diagnostics", async () => {
  const scene = await readFile(path.join(
    root,
    "features/career-world/composition/WorldScene.tsx",
  ), "utf8");
  const controls = await readFile(path.join(
    featureLayers,
    "interface/components/WorldInterface.tsx",
  ), "utf8");
  const overlay = await readFile(path.join(
    root,
    "features/career-world/development/DevelopmentOverlay.tsx",
  ), "utf8");
  const rootPage = await readFile(path.join(
    root,
    "app/page.tsx",
  ), "utf8");

  assert.match(scene, /showTopography/);
  assert.match(scene, /showTerritoryQa/);
  assert.match(scene, /showGrid/);
  assert.match(scene, /INTERACTIVE_TARGET_SELECTOR/);
  assert.match(scene, /target\.closest\(INTERACTIVE_TARGET_SELECTOR\)/);
  assert.match(controls, />\s*Topography\s*</);
  assert.match(controls, />\s*Territory QA\s*</);
  assert.match(controls, />\s*Grid\s*</);
  assert.match(controls, /disabled=\{!isInteractive\}/);
  assert.match(controls, /data-ready=\{isInteractive\}/);
  assert.match(overlay, /showTopography\s*\?/);
  assert.match(overlay, /showTerritories\s*\?/);
  assert.match(overlay, /showGrid\s*\?/);
  assert.match(
    rootPage,
    /case "terrain":[\s\S]*?<CareerWorld enableDevelopmentTools \/>/,
  );
});

test("five focus views remain valid crops of one world plane", async () => {
  const manifest = await readJson(
    "public/career-world/layers/terrain/authority/manifests/world-territories-r4.json",
  );
  assert.equal(manifest.territories.length, 5);
  assert.equal(new Set(manifest.territories.map(({ id }) => id)).size, 5);

  for (const territory of manifest.territories) {
    assert.equal(territory.focusView.origin.length, 2);
    assert.equal(territory.focusView.span.length, 2);
    for (let index = 0; index < 2; index += 1) {
      const origin = territory.focusView.origin[index];
      const span = territory.focusView.span[index];
      assert.ok(span >= 0.18 && span <= 1, territory.id);
      assert.ok(origin >= 0 && origin + span <= 1, territory.id);
    }
  }
});

test("coast ownership stays out of composition and land runtime patches", async () => {
  const waterRoot = path.join(featureLayers, "ocean");
  const files = [];

  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(absolute);
      }
    }
  }

  await collect(path.join(root, "features", "career-world"));
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const waterSource = (
    await Promise.all(
      (await readdir(path.join(waterRoot, "model")))
        .filter((file) => file.endsWith(".ts"))
        .map((file) => readFile(path.join(waterRoot, "model", file), "utf8")),
    )
  ).join("\n");

  assert.equal(source.includes("land-contact-overlay"), false);
  assert.equal(waterSource.includes("deferred-coast-accents"), false);
  assert.equal(waterSource.includes("coastline-effect-nodes"), false);
});

test("deferred crash accents are isolated in actors-effects", async () => {
  const deferred = await readJson(
    "public/career-world/layers/actors-effects/manifests/deferred-coast-accents-r1.json",
  );
  assert.equal(deferred.status, "deferred-phase-7");
  assert.ok(deferred.nodes.length > 0);
  assert.equal(
    await stat(
      path.join(
        publicLayers,
        "ocean",
        "authority",
        "manifests",
        "coast-geometry-r5.json",
      ),
    ).then(() => true),
    true,
  );
});

test("one backdrop-owned light contract drives static and rendered layers", async () => {
  const light = await readJson(
    "public/career-world/layers/world-backdrop/manifests/world-light-r1.json",
  );
  const land = await readJson(
    "public/career-world/layers/terrain/authority/manifests/terrain-relief-r6.json",
  );
  const renderer = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "WaterSurfaceRenderer.ts",
    ),
    "utf8",
  );
  const scene = await readFile(
    path.join(root, "features", "career-world", "composition", "WorldScene.tsx"),
    "utf8",
  );
  const backdrop = await readFile(
    path.join(featureLayers, "world-backdrop", "index.tsx"),
    "utf8",
  );

  assert.equal(light.direction.length, 3);
  assert.deepEqual(land.derivation.worldLightDirection, light.direction);
  assert.match(scene, /<WorldBackdrop light=\{WORLD_LIGHT\}/);
  assert.match(scene, /light=\{WORLD_LIGHT\}/);
  assert.match(backdrop, /light: WorldLight/);
  assert.match(renderer, /setLight\(light: WorldLight\)/);
  assert.doesNotMatch(renderer, /WORLD_LIGHT/);
  assert.doesNotMatch(renderer, /\[-0\.42,\s*-0\.36,\s*0\.83\]/);
});

test("water is lit for the projection the world's own art declares", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const relief = await readJson(
    "public/career-world/layers/terrain/authority/manifests/terrain-relief-r6.json",
  );
  const renderer = await readFile(
    path.join(featureLayers, "ocean", "rendering", "WaterSurfaceRenderer.ts"),
    "utf8",
  );

  // The ground is plan view and the things standing on it are high oblique.
  // Both halves matter: a water surface lit for one camera beside land drawn for
  // another puts its highlights on facets no other layer believes in, and that
  // is what a flat-looking sea IS.
  assert.equal(relief.projection, "orthographic-plan");
  assert.equal(structures.projection.type, "orthographic-high-oblique");
  const offNadir = 90 - structures.projection.pitchDegreesFromHorizontal;
  const declared = renderer.match(/const LAND_ART_OBLIQUE_DEGREES = (\d+(?:\.\d+)?);/);
  assert.ok(declared, "the ocean renderer must name the land art's oblique angle");
  assert.equal(Number(declared[1]), offNadir);

  // And it must be a RAMP off the shared tier state, not a constant: nadir where
  // the ground is plan, the land art's own angle where the oblique art is.
  assert.match(renderer, /uViewTilt: viewTilt,/);
  assert.match(renderer, /detail\.worldToTerritory \+ detail\.territoryToCapital/);
});

test("composition resolves semantic zoom once and passes it downward", async () => {
  const scene = await readFile(
    path.join(root, "features", "career-world", "composition", "WorldScene.tsx"),
    "utf8",
  );
  const waterCanvas = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "components",
      "WaterSurfaceCanvas.tsx",
    ),
    "utf8",
  );
  const waterRenderer = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "WaterSurfaceRenderer.ts",
    ),
    "utf8",
  );

  assert.equal(
    (scene.match(/resolveNinjaOneCapitalDetailState\(/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(scene, /\bresolveDetailState\(/);
  assert.match(scene, /DETAIL_POLICY\.cameraMinimumSpan/);
  assert.doesNotMatch(scene, /PHASE_3_MINIMUM_SPAN/);
  assert.doesNotMatch(waterCanvas, /resolveDetailState/);
  assert.doesNotMatch(waterRenderer, /resolveDetailState/);
  assert.match(scene, /detailState=\{detailState\}/);
});

test("camera-driven DOM and water layers update before the same paint", async () => {
  const scene = await readFile(
    path.join(root, "features/career-world/composition/WorldScene.tsx"),
    "utf8",
  );
  const waterCanvas = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "components",
      "WaterSurfaceCanvas.tsx",
    ),
    "utf8",
  );
  const waterController = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "WaterSurfaceController.ts",
    ),
    "utf8",
  );
  const land = await readFile(
    path.join(
      featureLayers,
      "terrain",
      "components",
      "TerritoryLandform.tsx",
    ),
    "utf8",
  );

  assert.match(scene, /const queueCamera = useCallback/);
  assert.match(scene, /cameraFrameRef\.current = requestAnimationFrame/);
  const wheelHandler = scene.match(
    /const handleWheel[\s\S]*?\n  const handlePointerDown/,
  )?.[0] ?? "";
  assert.match(
    wheelHandler,
    /const candidate = zoomCameraViewAt\([\s\S]*?queueCamera\(candidate\)/,
    "Free-camera wheel input must enqueue the same normalized zoom candidate at every anchor.",
  );
  assert.match(
    wheelHandler,
    /const scale = wheelZoomScale\(event\.deltaY\)[\s\S]*zoomCameraViewAt\(\s*publishedCamera,/,
    "Wheel bursts must compose from the rendered camera with bounded scale.",
  );
  assert.doesNotMatch(wheelHandler, /zoomCameraViewAt\(\s*cameraRef\.current/);
  assert.doesNotMatch(
    wheelHandler,
    /ninjaOneCapitalCityDistrictAtWorldPoint|selectedCityDistrict|capitalFloor/,
    "District proof routing must not intercept ordinary free-camera zoom.",
  );
  assert.match(scene, /MAX_WHEEL_ZOOM_SCALE = 1\.28/);
  assert.doesNotMatch(
    wheelHandler,
    /commitCamera\(zoomCameraViewAt/,
  );
  assert.match(
    scene,
    /const drag = dragRef\.current;[\s\S]*if \(!drag[\s\S]*return;[\s\S]*getBoundingClientRect\(\)/,
  );
  assert.match(waterCanvas, /useLayoutEffect\(\(\) => \{/);
  assert.match(
    waterCanvas,
    /controllerRef\.current\?\.setView\(camera, detailState\)/,
  );
  assert.match(
    waterCanvas,
    /\[camera, detailState\]/,
  );
  assert.match(
    waterController,
    /setView\(camera: CameraView, detailState: DetailState\): void \{[\s\S]*this\.renderer\.setView\(camera, detailState\);[\s\S]*this\.renderOnce\(\);/,
  );
  assert.match(land, /useLayoutEffect\(\(\) => \{/);
  assert.match(land, /detailState\.renderScale/);
  assert.match(land, /context\.drawImage\(/);
  assert.match(
    land,
    /const streamVisibility =[\s\S]*resolveRegisteredRasterVisibility\(\s*visibleStreamTiles\[0\],\s*detailState,/,
  );
  assert.match(land, /resolveLodCohortTransition\(/);
  assert.match(land, /resolveLodCohortKeyOpacity\(/);
  assert.match(land, /resolveLodCrossfadeTargets\(/);
  assert.match(land, /detailState\.shouldLoadCapitalAssets/);
  assert.doesNotMatch(land, /cameraLayerStyle/);
});

test("capital-detail land streaming follows the centralized LOD contract", async () => {
  const land = await readFile(
    path.join(
      featureLayers,
      "terrain",
      "components",
      "TerritoryLandform.tsx",
    ),
    "utf8",
  );
  const streamModel = await readFile(
    path.join(
      featureLayers,
      "terrain",
      "model",
      "streamTiles.ts",
    ),
    "utf8",
  );
  const streamGenerator = await readFile(
    path.join(
      root,
      "scripts",
      "build-career-world-land-stream-tiles.py",
    ),
    "utf8",
  );
  const [authoringManifest, runtimeManifest] = await Promise.all([
    readJson(
      "public/career-world/layers/terrain/authority/manifests/"
        + "terrain-stream-tiles-r3.json",
    ),
    readJson(
      "public/career-world/layers/terrain/authority/manifests/"
        + "terrain-stream-runtime-r4.json",
    ),
  ]);

  assert.match(
    land,
    /const streamVisibility =[\s\S]*resolveRegisteredRasterVisibility\(\s*visibleStreamTiles\[0\],\s*detailState,/,
  );
  assert.match(
    land,
    /const capitalCohortReady = isLodCohortReady\(\s*visibleCapitalKeys,\s*decodedStreamKeysRef\.current,/,
  );
  assert.match(
    land,
    /const siteCohortReady = isLodCohortReady\(\s*visibleSiteKeys,\s*decodedStreamKeysRef\.current,/,
  );
  assert.match(
    land,
    /capitalCohortRef\.current = resolveLodCohortTransition\(\s*visibleCapitalKeys,\s*decodedStreamKeysRef\.current,\s*capitalCohortRef\.current,\s*now,/,
  );
  assert.match(
    land,
    /siteCohortRef\.current = resolveLodCohortTransition\(\s*visibleSiteKeys,\s*decodedStreamKeysRef\.current,\s*siteCohortRef\.current,\s*now,/,
  );
  assert.match(
    land,
    /const currentCapitalCohortReady = isCurrentLodCohort\(\s*visibleCapitalKeys,\s*capitalCohortRef\.current,/,
  );
  assert.match(
    land,
    /const baseReplacementReady = \([\s\S]*const crossfadeTargets = resolveLodCrossfadeTargets\(\{[\s\S]*lowerReady: \([\s\S]*capitalCohortReady[\s\S]*hasCapitalCohort[\s\S]*baseReplacementReady[\s\S]*lowerVisibility: streamVisibility,[\s\S]*upperReady: siteCohortReady \|\| hasSiteCohort,[\s\S]*upperVisibility: siteVisibility,[\s\S]*let capitalTarget = crossfadeTargets\.lower;[\s\S]*let siteTarget = crossfadeTargets\.upper;/,
  );
  assert.match(
    land,
    /advanceLodPresentationFade\([\s\S]*capitalTarget[\s\S]*advanceLodPresentationFade\([\s\S]*siteTarget/,
  );
  assert.match(
    land,
    /const sourceOpacity = resolveLodCohortKeyOpacity\(\s*cohort,\s*key,\s*now,/,
  );
  assert.doesNotMatch(
    land,
    /resolveLodSourceOpacity\(decodedAt, now\)|const streamTierReady/,
  );
  assert.match(
    land,
    /if \(needsPresentationFrame\) \{[\s\S]*queueRender\(\)/,
  );
  assert.match(
    land,
    /canvas\.dataset\.streamCapitalTransition = capitalOpacity\.toFixed\(3\)/,
  );
  assert.match(
    land,
    /canvas\.dataset\.streamSiteTransition = siteOpacity\.toFixed\(3\)/,
  );
  assert.match(
    land,
    /data-stream-transition-ms=\{LOD_PRESENTATION_TRANSITION_MS\}/,
  );
  assert.doesNotMatch(
    land,
    /drawRegisteredTile\(\s*tile,\s*image,\s*detailState\.capitalToSite\s*\)/,
  );
  assert.match(
    land,
    /const retainCapitalPresentation = \([\s\S]*shouldRetainLodSource\([\s\S]*const retainSitePresentation = \([\s\S]*shouldRetainLodSource\(/,
  );
  assert.match(
    land,
    /const needsCapitalFallback = \([\s\S]*!retainSitePresentation[\s\S]*detailState\.capitalToSite[\s\S]*capitalPresentationRef\.current\.value/,
  );
  assert.match(
    land,
    /const requestedTiers:[\s\S]*retainCapitalPresentation && needsCapitalFallback[\s\S]*retainSitePresentation/,
  );
  assert.match(
    land,
    /planTerrainResidencyWithTierFallback\(\{[\s\S]*policy: residencyPolicy,[\s\S]*requestedTierCandidates,[\s\S]*residentSourceKeys:[\s\S]*tiles: residencyTiles,[\s\S]*viewportPixels,[\s\S]*const plan = admission\.plan;[\s\S]*const admittedTiers = admission\.requestedTiers;/,
  );
  assert.match(land, /plan\.requestedTiles/);
  assert.match(land, /plan\.retainedTiles/);
  assert.match(
    land,
    /activeStreamKeysRef\.current\.size[\s\S]*TERRAIN_STREAM_POLICY\.maximumConcurrentLoads/,
  );
  assert.match(
    land,
    /const eligibleVisibleRequestCount = queue\.filter\([\s\S]*visibleStreamKeysRef\.current\.has\(candidate\.key\)[\s\S]*failure\.retryAt <= now/,
  );
  assert.match(
    land,
    /prefetchSourcesToPreempt\(\{[\s\S]*activeSourceKeys: activeStreamKeysRef\.current,[\s\S]*eligibleVisibleRequestCount,[\s\S]*maximumConcurrentLoads,[\s\S]*visibleSourceKeys: visibleStreamKeysRef\.current,[\s\S]*for \(const key of prefetchKeysToCancel\)[\s\S]*cancelStreamSource\(key\)/,
  );
  assert.match(
    land,
    /expectedCanvasDecodedBytes\([\s\S]*canvas,[\s\S]*detailState\.renderScale/,
  );
  assert.match(land, /streamTileRefs\.current\.delete\(key\)/);
  assert.match(land, /releaseImage\(image\)/);
  assert.match(
    land,
    /streamRequestQueueRef\.current = \[[\s\S]*\.\.\.visibleRequests,[\s\S]*\.\.\.prefetchRequests/,
  );
  assert.doesNotMatch(land, /preferredStreamTier/);
  assert.match(
    land,
    /dataset\.streamResolutionTier = siteOpacity > 0\.5[\s\S]*\? "site"[\s\S]*: "capital"/,
  );
  assert.match(land, /dataset\.streamResidentSourceCount/);
  assert.match(land, /dataset\.streamEstimatedDecodedBytes/);
  assert.match(land, /dataset\.streamVisibleOverBudget/);
  assert.match(land, /dataset\.landEstimatedDecodedBytes/);
  assert.match(land, /dataset\.landMaximumDecodedBytes/);
  assert.match(land, /image\.onerror = failRequest/);
  assert.match(land, /const loadWorldPlate[\s\S]*image\.decode\(\)/);
  assert.match(land, /const loadDetailPlate[\s\S]*image\.decode\(\)/);
  assert.match(
    land,
    /TERRAIN_SITE_RESIDENCY_TILES[\s\S]*\.\.\.TERRAIN_SITE_RESIDENCY_TILES/,
  );
  assert.match(
    land,
    /setTimeout\([\s\S]*failRequest,[\s\S]*TERRAIN_STREAM_POLICY\.requestTimeoutMs/,
  );
  assert.match(
    streamModel,
    /terrain-stream-runtime-r4\.json/,
  );
  assert.match(
    streamModel,
    /maximumResidentDecodedBytes/,
  );
  assert.match(streamModel, /maximumConcurrentLoads/);
  assert.match(streamModel, /prefetchMarginPixels/);
  assert.match(streamModel, /retentionMarginPixels/);
  assert.match(streamModel, /retryBaseDelayMs/);
  assert.match(streamModel, /retryMaximumDelayMs/);
  assert.match(streamModel, /requestTimeoutMs/);
  assert.match(streamModel, /maximumLandLayerDecodedBytes/);
  assert.match(streamModel, /decodedBytes/);
  assert.match(
    streamModel,
    /tiles\/stream-r3\//,
  );
  assert.doesNotMatch(streamModel, /tiles\/stream-r1\//);
  assert.match(streamModel, /TerrainStreamSourceTier/);
  assert.match(streamModel, /sources\.capital\.dimensions/);
  assert.match(streamModel, /sources\.site\.dimensions/);
  assert.match(streamGenerator, /CHILD_COLUMNS = 2/);
  assert.match(streamGenerator, /CHILD_ROWS = 2/);
  assert.match(
    streamGenerator,
    /STREAM_GRID_COLUMNS = GRID_COLUMNS \* CHILD_COLUMNS/,
  );
  assert.match(
    streamGenerator,
    /STREAM_GRID_ROWS = GRID_ROWS \* CHILD_ROWS/,
  );
  assert.match(streamGenerator, /tiles" \/ "stream-r3"/);
  assert.match(streamGenerator, /terrain-stream-tiles-r3\.json/);
  assert.doesNotMatch(streamGenerator, /scripts["']\s*\/\s*["']assets/);
  assert.match(streamGenerator, /terrain-stream-runtime-r4\.json/);
  assert.match(streamGenerator, /"decodedBytes":/);
  assert.equal(
    authoringManifest.id,
    "career-world/terrain-stream-tiles@r3",
  );
  assert.equal(
    runtimeManifest.id,
    "career-world/terrain-stream-runtime@r4",
  );
  assert.equal(runtimeManifest.tiles.length, authoringManifest.tiles.length);
  assert.deepEqual(
    Object.keys(runtimeManifest.tiles[0]).sort(),
    ["id", "minimumTier", "sources", "worldBounds"],
  );
  assert.match(
    streamGenerator,
    /site_tile\.getchannel\("A"\)\.getextrema\(\)\[1\][\s\S]*MINIMUM_ALPHA/,
  );
  assert.doesNotMatch(
    streamGenerator,
    /--derive-capital-from-manifest/,
  );
  assert.doesNotMatch(
    streamGenerator,
    /upgrade_manifest_with_capital_variants/,
  );
  assert.doesNotMatch(
    streamGenerator,
    /terrain-stream-tiles-r1\.json/,
  );
});

test("water zoom preserves the coast path while the open field owns its detail", async () => {
  const openWater = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "shaders",
      "open-water.ts",
    ),
    "utf8",
  );
  const coast = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "shaders",
      "coast.ts",
    ),
    "utf8",
  );
  const common = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "shaders",
      "common.ts",
    ),
    "utf8",
  );

  assert.match(openWater, /u_siteLod/);
  assert.match(coast, /u_siteLod/);
  assert.match(coast, /siteSwash/);
  assert.match(coast, /recedingBand/);
  assert.match(coast, /wetContact/);
  const renderer = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "rendering",
      "WaterSurfaceRenderer.ts",
    ),
    "utf8",
  );
  const assets = await readFile(
    path.join(
      featureLayers,
      "ocean",
      "model",
      "assets.ts",
    ),
    "utf8",
  );
  const landAssets = await readFile(
    path.join(
      featureLayers,
      "terrain",
      "model",
      "assets.ts",
    ),
    "utf8",
  );

  assert.match(assets, /WATER_DETAIL_CONTRACT/);
  assert.match(
    assets,
    /id:\s*"territory-line-field"[\s\S]*kind:\s*"world-procedural"[\s\S]*minimumTier:\s*"territory"/,
  );
  const waterContract = assets.slice(
    assets.indexOf("export const WATER_DETAIL_CONTRACT"),
  );
  assert.doesNotMatch(
    waterContract,
    /DIRECTIONAL_ALBEDO/,
    "the same-resolution directional reference must not masquerade as an LOD",
  );
  assert.match(landAssets, /LAND_DETAIL_CONTRACT/);
  assert.match(
    landAssets,
    /const TERRITORY_PLATE_DIMENSIONS = \[6688, 3764\][\s\S]*id:\s*"territory-land-plate"[\s\S]*dimensions:\s*TERRITORY_PLATE_DIMENSIONS/,
  );
  assert.equal(
    (
      assets.match(
        /water-surface-world-lod-r2-3840x2160\.png/g,
      ) ?? []
    ).length,
    1,
  );
  assert.match(landAssets, /terrain-relief-r6\.png/);
  assert.match(landAssets, /terrain-relief-r6-detail-4x\.png/);
  assert.match(landAssets, /terrain-contours-r4-detail-4x\.png/);
  assert.doesNotMatch(openWater, /territoryLineDetail|directionalContrast|sampleChopBand|sampleWaveBand/);
  assert.doesNotMatch(openWater, /hydrology|basinRipple|lakeRipple|u_basinTextureOrigin/i);
  assert.match(coast, /coastProfileGradient/);
  assert.match(coast, /u_coastMaterialTexel/);
  assert.match(coast, /bathymetryLight/);
  assert.doesNotMatch(common, /fwidth\(coordinate\)/);
  assert.match(renderer, /private readonly coastMaterialTexel/);
  assert.match(renderer, /u_coastMaterialTexel/);
  assert.doesNotMatch(renderer, /resolveWaterTextureCoverage/);
  assert.doesNotMatch(
    renderer,
    /createFramebuffer|waveFieldTargets|WAVE_FIELD_TEXTURE_UNIT/,
    "the ocean upgrade must remain in the existing single render pass",
  );
  assert.equal(
    (renderer.match(/gl\.drawArrays\(/g) ?? []).length,
    1,
    "the ocean renderer should issue one fullscreen draw",
  );
  assert.doesNotMatch(renderer, /directionalAlbedo/);
  assert.match(
    renderer,
    /DETAIL_POLICY\.renderScale\.maximumAnimatedWaterDevicePixelRatio/,
  );
  assert.doesNotMatch(
    renderer,
    /canvas\.dataset\.detailAssetState\s*===\s*"ready"/,
  );
});
