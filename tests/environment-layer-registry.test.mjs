import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  ENVIRONMENT_LAYER_DEFINITIONS,
  isEnvironmentLayerEffectivelyVisible,
} from "../features/career-world/shared/environmentLayers.ts";

test("environment registry gives every child one authority parent", () => {
  const ids = new Set(ENVIRONMENT_LAYER_DEFINITIONS.map(({ id }) => id));
  assert.equal(ids.size, ENVIRONMENT_LAYER_DEFINITIONS.length);
  for (const layer of ENVIRONMENT_LAYER_DEFINITIONS) {
    if (layer.parentId) {
      assert.ok(ids.has(layer.parentId));
      const visited = new Set([layer.id]);
      let parent = layer.parentId;
      while (parent) {
        assert.ok(!visited.has(parent), `cycle in ${layer.id}'s authority chain`);
        visited.add(parent);
        parent = ENVIRONMENT_LAYER_DEFINITIONS.find((entry) => entry.id === parent)?.parentId;
      }
    }
  }
});

test("authority visibility cascades without erasing child selections", () => {
  const waterDisabled = { ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, L1: false };
  for (const id of ["L1_0", "L1_1", "L1_2", "L3", "L3_1", "L3_2"]) {
    assert.equal(isEnvironmentLayerEffectivelyVisible(waterDisabled, id), false);
    assert.equal(waterDisabled[id], true);
  }
  const inlandDisabled = Object.freeze({
    ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
    L3: false,
  });
  assert.equal(inlandDisabled.L3_1, true);
  assert.equal(isEnvironmentLayerEffectivelyVisible(inlandDisabled, "L3_1"), false);
  assert.equal(isEnvironmentLayerEffectivelyVisible(inlandDisabled, "L3_2"), false);
  assert.equal(isEnvironmentLayerEffectivelyVisible(inlandDisabled, "L3_4"), false);
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(
      DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
      "L3_1",
    ),
    true,
  );
});

test("coastal ambience defaults on and stays independently toggleable", () => {
  // It defaulted off, and off is what the default view showed: L1_2 owns the
  // spray, and with it hidden the sea met the rock with no swash, no breaker
  // throw and no wet contact at all. The flag predated the water layer being
  // able to draw any of that. An UNAVAILABLE layer is a different thing and
  // still cannot be forced on, which is the other half of this contract.
  assert.equal(DEFAULT_ENVIRONMENT_LAYER_VISIBILITY.L1_2, true);
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(
      DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
      "L1_2",
    ),
    true,
  );
  const hidden = Object.freeze({ ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, L1_2: false });
  assert.equal(isEnvironmentLayerEffectivelyVisible(hidden, "L1_2"), false);
  const forced = Object.freeze({ ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, L2_3: true });
  assert.equal(isEnvironmentLayerEffectivelyVisible(forced, "L2_3"), false);
});

test("terrain detail and foliage motion are independently toggleable", () => {
  const landAuthority = ENVIRONMENT_LAYER_DEFINITIONS.find(({ id }) => id === "L2");
  const foliage = ENVIRONMENT_LAYER_DEFINITIONS.find(({ id }) => id === "L2_2");
  assert.equal(landAuthority?.label, "Land authority");
  assert.equal(foliage?.label, "Tree and foliage motion");
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(
      DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
      "L2_1",
    ),
    true,
  );
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(
      DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
      "L2_2",
    ),
    true,
  );
});

test("city children preserve their selections when the L4 authority is disabled", () => {
  const cityDisabled = Object.freeze({
    ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
    L4: false,
  });
  assert.equal(cityDisabled.L4_1, true);
  assert.equal(cityDisabled.L4_7, true);
  assert.equal(isEnvironmentLayerEffectivelyVisible(cityDisabled, "L4_1"), false);
  assert.equal(isEnvironmentLayerEffectivelyVisible(cityDisabled, "L4_7"), false);
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, "L4_3"),
    true,
  );
});
