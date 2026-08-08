import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CAREER_WORLD_LAYER_ORDER,
} from "../features/career-world/shared/layers.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const featureLayers = path.join(root, "features", "career-world", "layers");
const publicLayers = path.join(root, "public", "career-world", "layers");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("source directories implement the declared eight-layer order", async () => {
  const directories = [];
  for (const entry of await readdir(featureLayers)) {
    if ((await stat(path.join(featureLayers, entry))).isDirectory()) {
      directories.push(entry);
    }
  }
  assert.deepEqual(
    directories.sort(),
    [...CAREER_WORLD_LAYER_ORDER].sort(),
  );
  assert.equal(CAREER_WORLD_LAYER_ORDER.length, 8);
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("coastline"), false);
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
  const preview = await readFile(path.join(
    root,
    "app/career-world/previews/territory-landform/page.tsx",
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
  assert.match(preview, /<CareerWorld enableDevelopmentTools \/>/);
});

test("five focus views remain valid crops of one world plane", async () => {
  const manifest = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
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
  const waterRoot = path.join(featureLayers, "water-surface");
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
        "water-surface",
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
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r6.json",
  );
  const renderer = await readFile(
    path.join(
      featureLayers,
      "water-surface",
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

test("composition resolves semantic zoom once and passes it downward", async () => {
  const scene = await readFile(
    path.join(root, "features", "career-world", "composition", "WorldScene.tsx"),
    "utf8",
  );
  const waterCanvas = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "components",
      "WaterSurfaceCanvas.tsx",
    ),
    "utf8",
  );
  const waterRenderer = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "WaterSurfaceRenderer.ts",
    ),
    "utf8",
  );

  assert.equal(
    (scene.match(/resolveDetailState\(/g) ?? []).length,
    1,
  );
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
      "water-surface",
      "components",
      "WaterSurfaceCanvas.tsx",
    ),
    "utf8",
  );
  const waterController = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "WaterSurfaceController.ts",
    ),
    "utf8",
  );
  const land = await readFile(
    path.join(
      featureLayers,
      "territory-landform",
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
    /queueCamera\(zoomCameraViewAt/,
  );
  assert.match(
    wheelHandler,
    /const scale = wheelZoomScale\(event\.deltaY\)[\s\S]*zoomCameraViewAt\(\s*camera,/,
    "Wheel bursts must compose from the rendered camera with bounded scale.",
  );
  assert.doesNotMatch(wheelHandler, /zoomCameraViewAt\(\s*cameraRef\.current/);
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
    /controllerRef\.current\?\.setView\(\s*camera,\s*detailState,\s*nativeHydrologyAdmission,?\s*\)/,
  );
  assert.match(
    waterCanvas,
    /\[camera,\s*detailState,\s*nativeHydrologyAdmission\]/,
  );
  assert.match(
    waterController,
    /setView\(camera:[\s\S]*this\.renderer\.setView\(camera,\s*detailState,\s*nativeHydrologyAdmission\);[\s\S]*this\.renderOnce\(\);/,
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
      "territory-landform",
      "components",
      "TerritoryLandform.tsx",
    ),
    "utf8",
  );
  const streamModel = await readFile(
    path.join(
      featureLayers,
      "territory-landform",
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
    readJson("scripts/assets/career-world/terrain-stream-tiles-authoring-r3.json"),
    readJson(
      "public/career-world/layers/territory-landform/manifests/"
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
  assert.match(streamGenerator, /terrain-stream-tiles-authoring-r3\.json/);
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

test("water zoom adds detail without suppressing world swell or bathymetry", async () => {
  const openWater = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "shaders",
      "open-water.ts",
    ),
    "utf8",
  );
  const coast = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "shaders",
      "coast.ts",
    ),
    "utf8",
  );
  const common = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "shaders",
      "common.ts",
    ),
    "utf8",
  );

  assert.doesNotMatch(openWater, /u_siteLod/);
  assert.match(coast, /u_siteLod/);
  assert.match(coast, /siteSwash/);
  assert.match(coast, /recedingBand/);
  assert.match(coast, /wetContact/);
  const renderer = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "rendering",
      "WaterSurfaceRenderer.ts",
    ),
    "utf8",
  );
  const assets = await readFile(
    path.join(
      featureLayers,
      "water-surface",
      "model",
      "assets.ts",
    ),
    "utf8",
  );
  const landAssets = await readFile(
    path.join(
      featureLayers,
      "territory-landform",
      "model",
      "assets.ts",
    ),
    "utf8",
  );

  assert.match(
    assets,
    /directionalAlbedo:[\s\S]*DIRECTIONAL_ALBEDO/,
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
  assert.match(openWater, /u_directionalAlbedo/);
  assert.match(
    openWater,
    /microCoordinate\s*=\s*bodyUv\s*\*\s*u_microFrequency\s*\*\s*u_waveDensity/,
  );
  assert.match(
    openWater,
    /macroCoordinate\s*=\s*bodyUv\s*\*\s*vec2\(1\.72,\s*1\.34\)/,
  );
  assert.doesNotMatch(openWater, /u_territoryCoverage|territoryFrequency/);
  assert.doesNotMatch(openWater, /\/\s*max\(viewSpan/);
  assert.match(
    openWater,
    /texture\(\s*u_directionalAlbedo,\s*authoredUv,\s*-0\.35\s*\)/,
  );
  assert.match(
    openWater,
    /directionalFine[\s\S]*directionalBroad[\s\S]*directionalContrast/,
  );
  assert.match(
    openWater,
    /territoryLineDetail\s*=[\s\S]*territoryMix[\s\S]*u_detailScale/,
  );
  assert.match(
    openWater,
    /microGradient[\s\S]*u_territoryNormalStrength[\s\S]*territoryMix/,
  );
  assert.match(openWater, /transformWaterCoordinate\(/);
  assert.match(
    openWater,
    /hydrology\.r[\s\S]*u_basinRippleFrequency/,
  );
  assert.match(openWater, /hydrology\.g[\s\S]*u_lakeRippleFrequency/);
  assert.match(openWater, /u_basinTextureOrigin/);
  assert.match(openWater, /rippleDistance\s*\*\s*rippleFrequency/);
  assert.match(openWater, /openFoam/);
  assert.match(openWater, /palette,\s*authored,\s*0\.7/);
  assert.doesNotMatch(
    openWater,
    /semanticFrequency|territoryArtB/,
  );
  assert.doesNotMatch(
    openWater,
    /displacement\s*\*=\s*mix\(\s*1\.0,\s*viewSpan/,
  );
  assert.match(coast, /coastProfileGradient/);
  assert.match(coast, /u_coastMaterialTexel/);
  assert.match(coast, /bathymetryLight/);
  assert.doesNotMatch(common, /fwidth\(coordinate\)/);
  assert.match(renderer, /private readonly coastMaterialTexel/);
  assert.match(renderer, /u_coastMaterialTexel/);
  assert.doesNotMatch(renderer, /resolveWaterTextureCoverage/);
  assert.match(
    renderer,
    /createTexture\(this\.gl,\s*directionalAlbedo,\s*"clamp"\)/,
  );
  assert.match(
    renderer,
    /this\.textures\.directionalAlbedo\s*!==\s*undefined/,
  );
  assert.match(
    renderer,
    /DETAIL_POLICY\.renderScale\.maximumDevicePixelRatio/,
  );
  assert.doesNotMatch(
    renderer,
    /canvas\.dataset\.detailAssetState\s*===\s*"ready"/,
  );
});
