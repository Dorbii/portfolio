import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWaterSurfaceState,
  windVectorFromDegrees,
} from "../features/career-world/layers/water-surface/model/state.ts";
import {
  SHELTERED_BASIN_STYLE,
  SMALL_INLAND_LAKE_STYLE,
} from "../features/career-world/layers/water-surface/model/bodies.ts";
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

test("water state clamps external inputs without changing its contract", () => {
  assert.deepEqual(
    normalizeWaterSurfaceState({
      motion: -3,
      waveStrength: 9,
      waveDensity: 7,
      weather: 2,
      opacity: 0,
      detailScale: Number.NaN,
      windDirectionDegrees: -90,
    }),
    {
      motion: 0,
      waveStrength: 2,
      waveDensity: 2,
      weather: 1,
      opacity: 0.2,
      detailScale: 0.58,
      windDirectionDegrees: 270,
    },
  );
});

test("inland water bodies have independent fixed transforms", () => {
  const bodies = [
    SHELTERED_BASIN_STYLE,
    SMALL_INLAND_LAKE_STYLE,
  ];
  assert.deepEqual(
    bodies.map(({ id }) => id),
    ["mainland-inner-sea", "mainland-southwest-lake"],
  );
  for (const body of bodies) {
    const { texture } = body;
    assert.equal(texture.worldAnchor.length, 2);
    assert.equal(texture.textureOrigin.length, 2);
    assert.equal(texture.textureScale.length, 2);
    assert.notEqual(texture.rotationRadians, 0);
    assert.notDeepEqual(texture.worldAnchor, texture.textureOrigin);
    assert.ok(body.rippleFrequency > 0);
    assert.ok(body.rippleMix > 0.5);
    assert.ok(body.tintMix > 0);
  }
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
    resolveDetailState({ origin: [0.2, 0.2], span: [0.5, 0.5] }).tier.id,
    "territory",
  );
  const capital = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.15, 0.15],
  }).tier;
  assert.equal(capital.id, "capital");
  assert.equal(capital.requiresAuthoredTile, true);
  const site = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.075, 0.075],
  }).tier;
  assert.equal(site.id, "site");
  assert.equal(site.requiresAuthoredTile, true);
  const close = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.04, 0.04],
  }).tier;
  assert.equal(close.id, "close");
  assert.equal(close.requiresAuthoredTile, true);
});

test("one central LOD policy owns thresholds and render budget", () => {
  assert.equal(DETAIL_POLICY.cameraMinimumSpan, 0.03);
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
      territory: 0.78,
      capital: 0.2,
      site: 0.1,
      close: 0.05,
    },
  );
  assert.equal(
    DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    2,
  );
});

test("layer detail contracts require a world source", () => {
  const contract = defineLayerDetailContract({
    layer: "water-surface",
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
      layer: "water-surface",
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
    span: [0.75, 0.75],
  });
  const territory = resolveDetailState({
    origin: [0.2, 0.2],
    span: [0.4, 0.4],
  });
  const capital = resolveDetailState({
    origin: [0.4, 0.4],
    span: [0.12, 0.12],
  });
  const site = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.075, 0.075],
  });
  const close = resolveDetailState({
    origin: [0.45, 0.45],
    span: [0.04, 0.04],
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
