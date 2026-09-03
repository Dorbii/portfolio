import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_WATER_SURFACE_STATE,
  normalizeWaterSurfaceState,
  readWaterSurfaceUrlOverrides,
} from "../features/career-world/layers/ocean/model/state.ts";
import {
  CAREER_WORLD_WATER_REALISM_PROFILE,
  defineWaterRealismProfile,
} from "../features/career-world/layers/ocean/model/profiles.ts";
import { windVectorFromDegrees } from "../features/career-world/shared/weather.ts";
import {
  DEFAULT_WATER_TUNING,
  normalizeWaterTuning,
  readWaterTuningUrlOverrides,
  serializeWaterTuning,
} from "../features/career-world/shared/waterTuning.ts";
import {
  advanceLodPresentationFade,
  DETAIL_POLICY,
  defineLayerDetailContract,
  DESTINATION_MARKER_HANDOFF,
  LOD_PRESENTATION_TRANSITION_MS,
  PROJECT_DESTINATION_POLICY,
  resolveDetailState,
  resolveLodSourceOpacity,
  resolveNodeVisibility,
  resolveProjectDestinationVisibility,
  resolveRegisteredRasterVisibility,
  resolveWorldDestinationVisibility,
  WORLD_DESTINATION_POLICY,
} from "../features/career-world/shared/lod.ts";

// The ocean exposes three numbers, not thirty. Its three tuned sea states carry
// ~170 uniforms between them, generated from the offline presets rather than
// typed in here, so there is nothing left to dial one effect at a time -- what
// remains is where on the calm/windy/heavy scale this world sits.
test("water state clamps external inputs without changing its contract", () => {
  assert.deepEqual(
    normalizeWaterSurfaceState({ weather: -3, timeScale: 9, opacity: -1 }),
    { weather: 0, timeScale: 3, opacity: 0.2 },
  );
  assert.deepEqual(
    normalizeWaterSurfaceState({ weather: 9, timeScale: -1, opacity: 9 }),
    { weather: 1, timeScale: 0, opacity: 1 },
  );
  assert.deepEqual(
    normalizeWaterSurfaceState({ weather: Number.NaN, timeScale: "x" }),
    {
      weather: DEFAULT_WATER_SURFACE_STATE.weather,
      timeScale: DEFAULT_WATER_SURFACE_STATE.timeScale,
      opacity: DEFAULT_WATER_SURFACE_STATE.opacity,
    },
  );
  assert.ok(Object.isFrozen(normalizeWaterSurfaceState()));
});

test("ocean realism profile is revisioned, deeply frozen, and range checked", () => {
  const profile = CAREER_WORLD_WATER_REALISM_PROFILE;
  assert.match(profile.id, /^[a-z0-9-]+@r\d+$/);
  assert.ok(Object.isFrozen(profile) && Object.isFrozen(profile.ocean));
  assert.deepEqual(normalizeWaterSurfaceState(), {
    weather: profile.ocean.weather,
    timeScale: profile.ocean.timeScale,
    opacity: DEFAULT_WATER_TUNING.oceanOpacity,
  });
  // Below the state the world field was baked from: the wide shot wants a
  // restrained ambient sea that reveals its detail on approach.
  assert.ok(profile.ocean.weather < 0.5);
  assert.throws(
    () => defineWaterRealismProfile({ id: "no-revision", ocean: profile.ocean }),
    /revisioned stable id/,
  );
  assert.throws(
    () => defineWaterRealismProfile({
      id: "solved-ocean@r1",
      ocean: { ...profile.ocean, weather: 1.01 },
    }),
    /ocean\.weather must be finite and between 0 and 1/,
  );
  assert.throws(
    () => defineWaterRealismProfile({
      id: "solved-ocean@r1",
      ocean: { ...profile.ocean, timeScale: 3.01 },
    }),
    /ocean\.timeScale must be finite and between 0 and 3/,
  );
});

test("water URL overrides are opt-in, numeric, and normalized by the state boundary", () => {
  assert.deepEqual(
    readWaterSurfaceUrlOverrides(
      "?water.weather=0.8&water.timeScale=1.4&water.opacity=0.6&water.unknown=9",
    ),
    { weather: 0.8, timeScale: 1.4, opacity: 0.6 },
  );
  assert.deepEqual(
    readWaterSurfaceUrlOverrides("?water.weather=nope&water.timeScale="),
    {},
  );
  assert.equal(
    normalizeWaterSurfaceState(readWaterSurfaceUrlOverrides("?water.weather=10")).weather,
    1,
  );
});

test("water tuning panel values clamp and serialize in one canonical order", () => {
  const tuning = normalizeWaterTuning(readWaterTuningUrlOverrides(
    "?water.weather=9&water.timeScale=-1&water.opacity=9"
    + "&city-water.opacity=-1&city-water.shoreRamp=9"
    + "&water-effects.foam=-1&water-effects.crest=1.15&water-effects.relight=9"
    + "&water-effects.cycling=-1&water-effects.swell=9",
  ));
  assert.deepEqual(tuning, {
    oceanWeather: 1,
    oceanTimeScale: 0,
    oceanOpacity: 1,
    cityWaterOpacity: 0,
    cityWaterShoreRamp: 1,
    effectSparkle: 1,
    foam: 0,
    crest: 1.15,
    relight: 2,
    cycling: 0,
    swell: 2,
  });
  assert.equal(
    serializeWaterTuning(tuning),
    "?water.weather=1&water.timeScale=0&water.opacity=1"
    + "&city-water.opacity=0&city-water.shoreRamp=1"
    + "&water-effects.sparkle=1&water-effects.foam=0&water-effects.crest=1.15"
    + "&water-effects.relight=2&water-effects.cycling=0&water-effects.swell=2",
  );
});

test("wind direction produces a normalized world vector", () => {
  const [x, y] = windVectorFromDegrees(24);
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-12);
});

test("one camera span resolves the detail tier for every layer", () => {
  assert.equal(
    resolveDetailState({ origin: [0, 0], span: [1, 1] }).tier.id,
    "world",
  );
  assert.equal(
    resolveDetailState({ origin: [0.2, 0.2], span: [0.25, 0.25] }).tier.id,
    "territory",
  );
  const capital = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.075, 0.075],
  }).tier;
  assert.equal(capital.id, "capital");
  assert.equal(capital.requiresAuthoredTile, true);
  const site = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.0425, 0.0425],
  }).tier;
  assert.equal(site.id, "site");
  assert.equal(site.requiresAuthoredTile, true);
  const close = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.0375, 0.0375],
  }).tier;
  assert.equal(close.id, "close");
  assert.equal(close.requiresAuthoredTile, true);
});

test("one central LOD policy owns thresholds and render budget", () => {
  assert.equal(DETAIL_POLICY.cameraMinimumSpan, 0.02);
  assert.ok(
    DETAIL_POLICY.capitalAssetPreloadSpan
      > DETAIL_POLICY.territoryToCapital.startSpan,
  );
  assert.ok(
    DETAIL_POLICY.siteAssetPreloadSpan
      > DETAIL_POLICY.capitalToSite.startSpan,
  );
  assert.ok(
    DETAIL_POLICY.closeAssetPreloadSpan
      > DETAIL_POLICY.siteToClose.startSpan,
  );
  assert.ok(
    DETAIL_POLICY.worldToTerritory.startSpan
      > DETAIL_POLICY.worldToTerritory.endSpan,
  );
  assert.deepEqual(
    DETAIL_POLICY.tierMaximumSpan,
    {
      world: 1,
      territory: 0.39,
      capital: 0.17,
      site: 0.05,
      close: 0.0375,
    },
  );
  assert.equal(
    DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    2,
  );
  assert.equal(
    DETAIL_POLICY.renderScale.maximumAnimatedWaterDevicePixelRatio,
    1.5,
  );
});

test("animated water resizes only when its observer or LOD requests it", async () => {
  const [openWaterRenderer, inlandRenderer, openWaterController, inlandController] =
    await Promise.all([
      readFile(path.join(process.cwd(), "features/career-world/layers/ocean/rendering/WaterSurfaceRenderer.ts"), "utf8"),
      readFile(path.join(process.cwd(), "features/career-world/layers/inland-water/rendering/NinjaOneInlandWaterRenderer.ts"), "utf8"),
      readFile(path.join(process.cwd(), "features/career-world/layers/ocean/rendering/WaterSurfaceController.ts"), "utf8"),
      readFile(path.join(process.cwd(), "features/career-world/layers/inland-water/rendering/NinjaOneInlandWaterController.ts"), "utf8"),
    ]);

  for (const renderer of [openWaterRenderer, inlandRenderer]) {
    assert.match(renderer, /private resizePending = true/);
    assert.match(renderer, /if \(this\.resizePending\) \{\s*this\.resize\(\);\s*this\.resizePending = false;/);
    assert.match(renderer, /requestResize\(\): void \{\s*this\.resizePending = true;/);
    assert.doesNotMatch(renderer, /const gl = this\.gl;\s*this\.resize\(\);/);
  }
  // The ocean draws at the LAND's pixel ratio, not the lower animated-water one.
  // It shares a coastline with the land art on every frame, and water rendered
  // at a lower resolution than the art it borders does not read as softer
  // water -- it reads as a lower-quality layer. Measured at 6.2 ms average
  // against a 33 ms budget, so the animated-layer argument for a lower ceiling
  // does not apply to this renderer. The inland water keeps the animated cap.
  assert.match(openWaterRenderer, /DETAIL_POLICY\.renderScale\.maximumDevicePixelRatio/);
  assert.doesNotMatch(openWaterRenderer, /maximumAnimatedWaterDevicePixelRatio/);
  assert.match(inlandRenderer, /maximumAnimatedWaterDevicePixelRatio/);
  for (const controller of [openWaterController, inlandController]) {
    assert.match(controller, /new ResizeObserver\(\(\) => \{\s*this\.renderer\.requestResize\(\);\s*if \(!this\.resizeFrameRequest\) \{/);
    assert.match(controller, /this\.resizeFrameRequest = requestAnimationFrame\(\(\) => \{\s*this\.resizeFrameRequest = 0;\s*this\.renderOnce\(\);/);
  }
  assert.match(inlandController, /INLAND_WATER_FRAME_INTERVAL_MS = 1000 \/ 30/);
  assert.match(
    inlandController,
    /timestamp - this\.lastTimestamp[\s\S]*?< INLAND_WATER_FRAME_INTERVAL_MS - FRAME_INTERVAL_TOLERANCE_MS/,
  );
  assert.match(inlandController, /dataset\.frameIntervalP95Ms/);
  assert.match(inlandController, /dataset\.renderP95Ms/);
});

test("live foliage does not trigger full-page layout on every animation frame", async () => {
  const styles = await readFile(
    path.join(process.cwd(), "features/career-world/styles/career-world.css"),
    "utf8",
  );
  assert.match(
    styles,
    /\.career-world__foliage-canopy\s*\{[\s\S]*?animation: none;/,
  );
  assert.doesNotMatch(
    styles,
    /\.career-world__foliage-canopy\s*\{[\s\S]*?animation-name:\s*career-world-foliage-breeze;/,
  );
});

test("layer detail contracts require a world source", () => {
  const contract = defineLayerDetailContract({
    layer: "ocean",
    sources: [
      {
        id: "world",
        kind: "registered-raster",
        minimumTier: "world",
        path: "/world.png",
        dimensions: [3840, 2160],
        worldBounds: {
          origin: [0, 0],
          span: [1, 1],
        },
      },
      {
        id: "territory",
        kind: "world-procedural",
        minimumTier: "territory",
        path: "/detail.png",
        fixedWorldFrequency: [12, 10],
      },
    ],
  });
  assert.ok(Object.isFrozen(contract));
  assert.ok(Object.isFrozen(contract.sources));
  assert.throws(
    () => defineLayerDetailContract({
      layer: "ocean",
      sources: [
        {
          id: "territory-only",
          kind: "world-procedural",
          minimumTier: "territory",
          path: "/detail.png",
          fixedWorldFrequency: [12, 10],
        },
      ],
    }),
    /needs a world source/,
  );
});

test("LOD nodes and registered rasters share semantic transition weights", () => {
  const world = resolveDetailState({
    origin: [0, 0],
    span: [1, 1],
  });
  const transition = resolveDetailState({
    origin: [0.1, 0.1],
    span: [0.375, 0.375],
  });
  const territory = resolveDetailState({
    origin: [0.2, 0.2],
    span: [0.205, 0.205],
  });
  const capital = resolveDetailState({
    origin: [0.4, 0.4],
    span: [0.06, 0.06],
  });
  const site = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.045, 0.045],
  });
  const close = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.0375, 0.0375],
  });

  assert.equal(world.worldToTerritory, 0);
  assert.ok(
    transition.worldToTerritory > 0
      && transition.worldToTerritory < 1,
  );
  assert.equal(territory.worldToTerritory, 1);
  assert.equal(territory.territoryToCapital, 0);
  assert.equal(capital.territoryToCapital, 1);
  assert.ok(capital.capitalToSite > 0 && capital.capitalToSite < 1);
  assert.equal(site.capitalToSite, 1);
  assert.equal(site.siteToClose, 0);
  assert.equal(close.siteToClose, 1);
  assert.ok(world.renderScale < transition.renderScale);
  assert.ok(transition.renderScale < territory.renderScale);
  assert.ok(territory.renderScale < capital.renderScale);
  assert.ok(capital.renderScale < site.renderScale);
  assert.ok(site.renderScale < close.renderScale);
  assert.equal(world.shouldLoadTerritoryAssets, false);
  assert.equal(transition.shouldLoadTerritoryAssets, true);
  assert.equal(territory.shouldLoadCapitalAssets, false);
  assert.equal(capital.shouldLoadCapitalAssets, true);
  assert.equal(territory.shouldLoadSiteAssets, false);
  assert.equal(capital.shouldLoadSiteAssets, true);
  assert.equal(capital.shouldLoadCloseAssets, false);
  assert.equal(site.shouldLoadCloseAssets, true);
  const sitePreload = resolveDetailState({
    origin: [0.4, 0.4],
    span: [
      DETAIL_POLICY.siteAssetPreloadSpan,
      DETAIL_POLICY.siteAssetPreloadSpan,
    ],
  });
  const siteActivation = resolveDetailState({
    origin: [0.4, 0.4],
    span: [
      DETAIL_POLICY.capitalToSite.startSpan - 0.001,
      DETAIL_POLICY.capitalToSite.startSpan - 0.001,
    ],
  });
  assert.equal(sitePreload.shouldLoadSiteAssets, true);
  assert.equal(sitePreload.capitalToSite, 0);
  assert.ok(siteActivation.capitalToSite > 0);
  const closePreload = resolveDetailState({
    origin: [0.4, 0.4],
    span: [
      DETAIL_POLICY.closeAssetPreloadSpan,
      DETAIL_POLICY.closeAssetPreloadSpan,
    ],
  });
  const closeActivation = resolveDetailState({
    origin: [0.4, 0.4],
    span: [
      DETAIL_POLICY.siteToClose.startSpan - 0.001,
      DETAIL_POLICY.siteToClose.startSpan - 0.001,
    ],
  });
  assert.equal(closePreload.shouldLoadCloseAssets, true);
  assert.equal(closePreload.siteToClose, 0);
  assert.ok(closeActivation.siteToClose > 0);

  assert.equal(
    resolveNodeVisibility({ minimumTier: "world" }, world),
    1,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "territory" }, transition),
    transition.worldToTerritory,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "capital" }, territory),
    0,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "capital" }, capital),
    1,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "site" }, site),
    1,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "close" }, close),
    1,
  );
  assert.equal(
    resolveNodeVisibility(WORLD_DESTINATION_POLICY, world),
    1,
  );
  assert.equal(
    resolveNodeVisibility(WORLD_DESTINATION_POLICY, territory),
    1,
  );
  assert.equal(
    resolveNodeVisibility(PROJECT_DESTINATION_POLICY, world),
    0,
  );
  assert.equal(
    resolveNodeVisibility(PROJECT_DESTINATION_POLICY, territory),
    1,
  );
  assert.equal(
    resolveNodeVisibility({ minimumTier: "territory" }, territory),
    1,
    "Employer capitals must remain present beside territory destinations.",
  );
  const earlyProjectTown = {
    ...territory,
    territoryToCapital:
      DESTINATION_MARKER_HANDOFF.holdUntilSettlementVisibility,
  };
  const overlappingProjectTown = {
    ...territory,
    territoryToCapital: 0.66,
  };
  const establishedProjectTown = {
    ...territory,
    territoryToCapital:
      DESTINATION_MARKER_HANDOFF.hiddenAtSettlementVisibility,
  };
  assert.equal(
    resolveWorldDestinationVisibility(earlyProjectTown),
    1,
    "The employer capital label must remain readable beside project labels.",
  );
  assert.equal(
    resolveProjectDestinationVisibility(earlyProjectTown),
    1,
    "Project labels must remain fully readable until the town is established.",
  );
  assert.ok(
    resolveProjectDestinationVisibility(overlappingProjectTown) > 0,
    "Project labels must overlap the town reveal instead of disappearing first.",
  );
  assert.ok(
    resolveProjectDestinationVisibility(overlappingProjectTown)
      + resolveNodeVisibility(
        { minimumTier: "capital" },
        overlappingProjectTown,
      )
      > 1,
    "The destination-to-town handoff must contain a deliberate overlap.",
  );
  assert.equal(
    resolveWorldDestinationVisibility(overlappingProjectTown),
    resolveProjectDestinationVisibility(overlappingProjectTown),
    "Capital and project labels must share the same retirement curve.",
  );
  assert.equal(
    resolveProjectDestinationVisibility(establishedProjectTown),
    0,
    "Established project towns must retire their destination labels.",
  );
  assert.equal(
    resolveWorldDestinationVisibility(establishedProjectTown),
    0,
    "The employer capital label must retire with the project labels.",
  );
  assert.equal(
    resolveRegisteredRasterVisibility(
      { minimumTier: "capital" },
      territory,
    ),
    0,
  );
  assert.equal(
    resolveRegisteredRasterVisibility(
      { minimumTier: "capital" },
      resolveDetailState({
        origin: [0.3, 0.3],
        span: [
          DETAIL_POLICY.capitalAssetPreloadSpan,
          DETAIL_POLICY.capitalAssetPreloadSpan,
        ],
      }),
    ),
    0,
  );
  assert.equal(
    resolveRegisteredRasterVisibility(
      { minimumTier: "site" },
      capital,
    ),
    capital.capitalToSite,
  );
  assert.ok(
    DETAIL_POLICY.cameraMinimumSpan
      <= DETAIL_POLICY.tierMaximumSpan.close,
    "The central camera policy must make the close tier reachable.",
  );
});

test("LOD transition boundaries and midpoint weights are deterministic", () => {
  const cases = [
    {
      key: "worldToTerritory",
      minimumTier: "territory",
      transition: DETAIL_POLICY.worldToTerritory,
    },
    {
      key: "territoryToCapital",
      minimumTier: "capital",
      transition: DETAIL_POLICY.territoryToCapital,
    },
    {
      key: "capitalToSite",
      minimumTier: "site",
      transition: DETAIL_POLICY.capitalToSite,
    },
    {
      key: "siteToClose",
      minimumTier: "close",
      transition: DETAIL_POLICY.siteToClose,
    },
  ];

  for (const { key, minimumTier, transition } of cases) {
    const spans = [
      [transition.startSpan, 0],
      [(transition.startSpan + transition.endSpan) / 2, 0.5],
      [transition.endSpan, 1],
    ];
    for (const [span, expected] of spans) {
      const camera = { origin: [0.2, 0.2], span: [span, span] };
      const first = resolveDetailState(camera);
      const second = resolveDetailState(camera);

      assert.deepEqual(second, first);
      assert.ok(
        Math.abs(first[key] - expected) < 1e-12,
        `${key} at span ${span}`,
      );
      assert.equal(
        resolveRegisteredRasterVisibility({ minimumTier }, first),
        first[key],
        `${minimumTier} raster visibility at span ${span}`,
      );
      assert.equal(
        resolveNodeVisibility({ minimumTier }, first),
        first[key],
        `${minimumTier} node visibility at span ${span}`,
      );
    }
  }
});

test("LOD readiness catch-up fades complete once on elapsed time", () => {
  const initial = Object.freeze({
    value: 0,
    target: 0,
    lastUpdatedAt: 0,
  });
  const armed = advanceLodPresentationFade(initial, 1, 100);
  assert.deepEqual(armed, {
    value: 0,
    target: 1,
    lastUpdatedAt: 100,
  });

  const midpoint = advanceLodPresentationFade(
    armed,
    1,
    100 + LOD_PRESENTATION_TRANSITION_MS / 2,
  );
  assert.equal(midpoint.value, 0.5);
  assert.deepEqual(
    advanceLodPresentationFade(
      midpoint,
      1,
      100 + LOD_PRESENTATION_TRANSITION_MS,
    ),
    {
      value: 1,
      target: 1,
      lastUpdatedAt: 100 + LOD_PRESENTATION_TRANSITION_MS,
    },
  );

  assert.equal(resolveLodSourceOpacity(200, 199), 0);
  assert.equal(
    resolveLodSourceOpacity(
      200,
      200 + LOD_PRESENTATION_TRANSITION_MS / 2,
    ),
    0.5,
  );
  assert.equal(
    resolveLodSourceOpacity(
      200,
      200 + LOD_PRESENTATION_TRANSITION_MS,
    ),
    1,
  );
  assert.equal(resolveLodSourceOpacity(200, 10_000), 1);
});
