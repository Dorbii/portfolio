import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import sharp from "sharp";

import {
  NINJAONE_CAPITAL_CITY_R3_ARTBOARD,
  NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID,
  NINJAONE_CAPITAL_CITY_R3_CONTEXT,
  NINJAONE_CAPITAL_CITY_R3_TERRITORY,
  NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE,
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityFoundationR3.ts";
import {
  DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  ENVIRONMENT_LAYER_DEFINITIONS,
  isEnvironmentLayerEffectivelyVisible,
} from "../features/career-world/shared/environmentLayers.ts";

const ROOT = new URL("../", import.meta.url);

async function rgba(publicPath) {
  const bytes = await readFile(new URL(`../public${publicPath}`, import.meta.url));
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function grayscale(relativePath) {
  const bytes = await readFile(new URL(relativePath, import.meta.url));
  return sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true });
}

test("r3 foundation publishes a registered water-safe capital cohort", () => {
  assert.equal(
    NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID,
    "career-world/capitals/ninjaone/city-foundation@r3",
  );
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_ARTBOARD, [1448, 1086]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_CONTEXT.dimensions, [1448, 1086]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION.dimensions, [1448, 1086]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_TERRITORY.dimensions, [512, 384]);
  assert.equal(NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE, 0);
});

test("L4_0 is city-owned and cascades off with the city authority", () => {
  const waterInteraction = ENVIRONMENT_LAYER_DEFINITIONS.find(({ id }) => id === "L4_0");
  assert.deepEqual(
    waterInteraction,
    {
      available: true,
      id: "L4_0",
      label: "City water interaction",
      owns: "local under-bridge darkening, waterfront contact, ripples, reflections, and flow deflection without replacing global water",
      parentId: "L4",
    },
  );
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, "L4_0"),
    true,
  );
  assert.equal(
    isEnvironmentLayerEffectivelyVisible(
      { ...DEFAULT_ENVIRONMENT_LAYER_VISIBILITY, L4: false },
      "L4_0",
    ),
    false,
  );
});

test("capital context clears D06 for atomic replacement and never repaints registered water", async () => {
  const [context, composite, d06Mask, waterMask] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_CONTEXT.path),
    rgba("/career-world/capitals/ninjaone/city-r3/foundation/city-foundation-composite-r1-alpha.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png"),
    grayscale("../public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png"),
  ]);
  assert.deepEqual([context.info.width, context.info.height], [1448, 1086]);
  assert.equal(d06Mask.info.channels, 1);
  assert.equal(waterMask.info.channels, 1);

  let clearedD06Pixels = 0;
  let compositedD06Pixels = 0;
  let coveredWaterPixels = 0;
  for (let index = 0; index < d06Mask.data.length; index += 1) {
    const contextAlpha = context.data[index * 4 + 3];
    if (d06Mask.data[index] > 250) {
      if (contextAlpha <= 4) clearedD06Pixels += 1;
      if (composite.data[index * 4 + 3] > 16) compositedD06Pixels += 1;
    }
    if (waterMask.data[index] > 127 && contextAlpha > 16) coveredWaterPixels += 1;
  }
  assert.ok(compositedD06Pixels > 150_000);
  assert.ok(clearedD06Pixels > compositedD06Pixels * 0.98);
  assert.equal(coveredWaterPixels, 0);
});

test("r3 builder is a declared reproducible package script", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(
    packageJson.scripts["build:ninjaone-capital-city-r3"],
    "node scripts/build-ninjaone-capital-city-r3.mjs",
  );
  assert.equal(ROOT.protocol, "file:");
});

test("territory keeps the city plate preload-only until capital detail", async () => {
  const [authoritySource, manifestSource] = await Promise.all([
    readFile(new URL(
      "../features/career-world/layers/city/authority/NinjaOneCapitalCityLayer.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../public/career-world/capitals/ninjaone/manifests/city-foundation-r3.json",
      import.meta.url,
    ), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  assert.match(
    authoritySource,
    /detailState\.tier\.id === "world"\s*\|\| detailState\.tier\.id === "territory"/,
  );
  assert.equal(
    manifest.lod.territory,
    "preload-cache-only-not-runtime-visible",
  );
});

test("close city foliage reuses the registered L2 native conifer atlases", async () => {
  const [rendererSource, foliageSource, reuseManifestSource] = await Promise.all([
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalNativeFoliage.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../public/career-world/capitals/ninjaone/city-r3/authority/city-native-foliage-reuse-r1.json",
      import.meta.url,
    ), "utf8"),
  ]);
  const reuseManifest = JSON.parse(reuseManifestSource);
  assert.match(rendererSource, /tier === "close"[\s\S]*?visibility, "L4_6"/);
  assert.match(foliageSource, /selectNinjaOneEnvironmentFoliageInstances/);
  assert.match(foliageSource, /L2-native-conifer-atlas-reuse/);
  assert.doesNotMatch(foliageSource, /city-nodes-r2[\\/]foliage/);
  assert.equal(reuseManifest.sourceFoliageManifestId, "career-world/capitals/ninjaone/foliage@r6");
  assert.ok(reuseManifest.instances.length > 0);
  for (const instance of reuseManifest.instances) {
    assert.ok(instance.evidence.alphaFraction >= 0.5);
    assert.ok(instance.evidence.baseVegetationFraction >= 0.3);
    assert.ok(instance.evidence.vegetationFraction >= 0.3);
  }
});
