import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWaterSurfaceState,
  windVectorFromDegrees,
} from "../features/career-world/layers/water-surface/model/state.ts";
import {
  resolveDetailState,
  resolveNodeVisibility,
  resolveDetailTier,
} from "../features/career-world/shared/lod.ts";

test("water state clamps external inputs without changing its contract", () => {
  assert.deepEqual(
    normalizeWaterSurfaceState({
      motion: -3,
      waveStrength: 9,
      weather: 2,
      opacity: 0,
      detailScale: Number.NaN,
      windDirectionDegrees: -90,
    }),
    {
      motion: 0,
      waveStrength: 2,
      weather: 1,
      opacity: 0.2,
      detailScale: 0.58,
      windDirectionDegrees: 270,
    },
  );
});

test("wind direction produces a normalized world vector", () => {
  const [x, y] = windVectorFromDegrees(24);
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-12);
});

test("one camera span resolves the detail tier for every layer", () => {
  assert.equal(
    resolveDetailTier({ origin: [0, 0], span: [1, 1] }).id,
    "world",
  );
  assert.equal(
    resolveDetailTier({ origin: [0.2, 0.2], span: [0.5, 0.5] }).id,
    "territory",
  );
  const capital = resolveDetailTier({
    origin: [0.45, 0.45],
    span: [0.15, 0.15],
  });
  assert.equal(capital.id, "capital");
  assert.equal(capital.requiresAuthoredTile, true);
});

test("LOD assets and future nodes blend continuously across shared thresholds", () => {
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

  assert.equal(world.worldToTerritory, 0);
  assert.ok(
    transition.worldToTerritory > 0
      && transition.worldToTerritory < 1,
  );
  assert.equal(territory.worldToTerritory, 1);
  assert.equal(territory.territoryToCapital, 0);
  assert.equal(capital.territoryToCapital, 1);
  assert.ok(world.canvasScale < transition.canvasScale);
  assert.ok(transition.canvasScale < territory.canvasScale);
  assert.ok(territory.canvasScale < capital.canvasScale);

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
});
