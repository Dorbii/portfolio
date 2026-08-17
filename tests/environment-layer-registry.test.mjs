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
    if (layer.id.includes("_")) {
      assert.ok(layer.parentId, `${layer.id} must declare its authority parent`);
      assert.ok(ids.has(layer.parentId));
    } else {
      assert.equal(layer.parentId, undefined);
    }
  }
});

test("authority visibility cascades without erasing child selections", () => {
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

test("coastal ambience is independently live while future terrain shadows stay gated", () => {
  const forced = Object.freeze({
    ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
    L1_2: true,
    L2_3: true,
  });
  assert.equal(isEnvironmentLayerEffectivelyVisible(forced, "L1_2"), true);
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
