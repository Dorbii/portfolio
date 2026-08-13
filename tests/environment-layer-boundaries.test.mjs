import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("L1 L2 and L3 expose authority roots and explicit child modules", async () => {
  const [scene, ocean, oceanAuthority, oceanMotion, oceanAmbience,
    terrain, terrainAuthority, terrainDetail, terrainWildlife, terrainShadows,
    inland, inlandAuthority, inlandMotion, inlandEffects, inlandLife] =
    await Promise.all([
      read("features/career-world/composition/WorldScene.tsx"),
      read("features/career-world/layers/ocean/index.ts"),
      read("features/career-world/layers/ocean/authority/index.ts"),
      read("features/career-world/layers/ocean/surface-motion/index.ts"),
      read("features/career-world/layers/ocean/coastal-ambience/index.ts"),
      read("features/career-world/layers/terrain/index.ts"),
      read("features/career-world/layers/terrain/authority/index.ts"),
      read("features/career-world/layers/terrain/detail/index.ts"),
      read("features/career-world/layers/terrain/wildlife/index.ts"),
      read("features/career-world/layers/terrain/dynamic-shadows/index.ts"),
      read("features/career-world/layers/inland-water/index.ts"),
      read("features/career-world/layers/inland-water/authority/index.ts"),
      read("features/career-world/layers/inland-water/surface-motion/index.ts"),
      read("features/career-world/layers/inland-water/effects/index.ts"),
      read("features/career-world/layers/inland-water/aquatic-life/index.ts"),
    ]);

  assert.match(scene, /from "\.\.\/layers\/ocean"/);
  assert.match(scene, /from "\.\.\/layers\/terrain"/);
  assert.match(scene, /from "\.\.\/layers\/inland-water"/);
  assert.match(ocean, /from "\.\/authority"/);
  assert.match(terrain, /from "\.\/authority"/);
  assert.match(inland, /from "\.\/authority"/);
  assert.match(oceanAuthority, /OCEAN_AUTHORITY_LAYER_ID = "L1"/);
  assert.match(oceanMotion, /OCEAN_SURFACE_MOTION_LAYER_ID = "L1_1"/);
  assert.match(oceanAmbience, /OCEAN_COASTAL_AMBIENCE_LAYER_ID = "L1_2"/);
  assert.match(terrainAuthority, /TERRAIN_AUTHORITY_LAYER_ID = "L2"/);
  assert.match(terrainDetail, /TERRAIN_DETAIL_LAYER_ID = "L2_1"/);
  assert.match(terrainWildlife, /TERRAIN_WILDLIFE_LAYER_ID = "L2_2"/);
  assert.match(terrainShadows, /TERRAIN_DYNAMIC_SHADOWS_LAYER_ID = "L2_3"/);
  assert.match(inlandAuthority, /INLAND_WATER_AUTHORITY_LAYER_ID = "L3"/);
  assert.match(inlandMotion, /INLAND_WATER_SURFACE_MOTION_LAYER_ID = "L3_1"/);
  assert.match(inlandEffects, /INLAND_WATER_EFFECTS_LAYER_ID = "L3_2"/);
  assert.match(inlandLife, /INLAND_WATER_AQUATIC_LIFE_LAYER_ID = "L3_3"/);
});
