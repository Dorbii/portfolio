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

test("WFX01 adds support-localized water detail only at site and close", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(rendererSource, /tier === "site" \|\| tier === "close"/);
  assert.match(rendererSource, /WFX01-city-bridge-water-detail-r1-alpha\.png/);
  assert.match(rendererSource, /data-city-child-layer="L4_0"/);

  const [candidate, waterMask] = await Promise.all([
    rgba("/career-world/capitals/ninjaone/city-r3/_review/WFX01-city-bridge-water-detail-r1-alpha.png"),
    grayscale("../public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png"),
  ]);
  assert.deepEqual([candidate.info.width, candidate.info.height], [1448, 1086]);

  let alphaCount = 0;
  let maximumAlpha = 0;
  let outsideWater = 0;
  let outsideRegisteredComponents = 0;
  let componentEdgePixels = 0;
  for (let index = 0; index < candidate.info.width * candidate.info.height; index += 1) {
    const alpha = candidate.data[index * 4 + 3];
    if (alpha === 0) continue;
    alphaCount += 1;
    maximumAlpha = Math.max(maximumAlpha, alpha);
    if (waterMask.data[index] < 128) outsideWater += 1;
    const x = index % candidate.info.width;
    const y = Math.floor(index / candidate.info.width);
    const inCentral = x >= 533 && x <= 968 && y >= 464 && y <= 828;
    const inStation = x >= 792 && x <= 1036 && y >= 858 && y <= 1077;
    if (!inCentral && !inStation) outsideRegisteredComponents += 1;
    if (
      (inCentral && (x === 533 || x === 968 || y === 464 || y === 828))
      || (inStation && (x === 792 || x === 1036 || y === 858 || y === 1077))
    ) {
      componentEdgePixels += 1;
    }
  }
  assert.equal(alphaCount, 2_786);
  assert.equal(maximumAlpha, 136);
  assert.equal(outsideWater, 0);
  assert.equal(outsideRegisteredComponents, 0);
  assert.equal(componentEdgePixels, 0);
});

test("CFX01 adds parent-derived fabric detail only at site and close", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(rendererSource, /closeFabricVisible = \(tier === "site" \|\| tier === "close"\)[\s\S]*?visibility, "L4_4"/);
  assert.match(rendererSource, /CFX01-city-close-fabric-detail-r1-alpha\.png/);
  assert.match(rendererSource, /data-city-asset-id="CFX01"/);
  assert.match(rendererSource, /opacity=\{tier === "close" \? 1 : 0\.48\}/);

  const [candidate, context, waterMask, d06Mask] = await Promise.all([
    rgba("/career-world/capitals/ninjaone/city-r3/_review/CFX01-city-close-fabric-detail-r1-alpha.png"),
    rgba(NINJAONE_CAPITAL_CITY_R3_CONTEXT.path),
    grayscale("../public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png"),
  ]);
  assert.deepEqual([candidate.info.width, candidate.info.height], [1448, 1086]);

  let alphaCount = 0;
  let maximumAlpha = 0;
  let outsideContext = 0;
  let waterOverlap = 0;
  let d06Overlap = 0;
  for (let index = 0; index < candidate.info.width * candidate.info.height; index += 1) {
    const alpha = candidate.data[index * 4 + 3];
    if (alpha === 0) continue;
    alphaCount += 1;
    maximumAlpha = Math.max(maximumAlpha, alpha);
    if (context.data[index * 4 + 3] < 32) outsideContext += 1;
    if (waterMask.data[index] > 0) waterOverlap += 1;
    if (d06Mask.data[index] > 0) d06Overlap += 1;
  }
  assert.equal(alphaCount, 170_276);
  assert.equal(maximumAlpha, 104);
  assert.equal(outsideContext, 0);
  assert.equal(waterOverlap, 0);
  assert.equal(d06Overlap, 0);
});

test("CFX02 adds registered central architecture detail only at close", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(rendererSource, /centralArchitectureDetailVisible = tier === "close" && focusDistrict === null[\s\S]*?visibility, "L4_4"/);
  assert.match(rendererSource, /CFX02-city-central-architecture-detail-overlay-r1-alpha\.png/);
  assert.match(rendererSource, /data-city-asset-id="CFX02"/);

  const [candidate, context, waterMask] = await Promise.all([
    rgba("/career-world/capitals/ninjaone/city-r3/_review/CFX02-city-central-architecture-detail-overlay-r1-alpha.png"),
    rgba(NINJAONE_CAPITAL_CITY_R3_CONTEXT.path),
    grayscale("../public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png"),
  ]);
  assert.deepEqual([candidate.info.width, candidate.info.height], [1448, 1086]);

  let alphaCount = 0;
  let maximumAlpha = 0;
  let outsideRoi = 0;
  let outsideContext = 0;
  let waterOverlap = 0;
  let lowerTerminalOverlap = 0;
  for (let index = 0; index < candidate.info.width * candidate.info.height; index += 1) {
    const alpha = candidate.data[index * 4 + 3];
    if (alpha === 0) continue;
    alphaCount += 1;
    maximumAlpha = Math.max(maximumAlpha, alpha);
    const x = index % candidate.info.width;
    const y = Math.floor(index / candidate.info.width);
    if (x < 220 || x >= 880 || y < 90 || y >= 610) outsideRoi += 1;
    if (context.data[index * 4 + 3] === 0) outsideContext += 1;
    if (waterMask.data[index] > 0) waterOverlap += 1;
    if (y >= 820) lowerTerminalOverlap += 1;
  }
  assert.equal(alphaCount, 20_730);
  assert.equal(maximumAlpha, 208);
  assert.equal(outsideRoi, 0);
  assert.equal(outsideContext, 0);
  assert.equal(waterOverlap, 0);
  assert.equal(lowerTerminalOverlap, 0);
});

test("LFX06 recesses only live land below the city context", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(rendererSource, /visibility,\s*"L4_1"/);
  assert.match(rendererSource, /LFX06-upper-rear-native-ridge-underlay-r1-alpha\.png/);
  assert.match(rendererSource, /data-city-asset-id="LFX06"/);
  assert.match(rendererSource, /data-city-child-layer="L4_1"/);

  const [candidate, landMask, waterMask] = await Promise.all([
    rgba("/career-world/capitals/ninjaone/city-r3/_review/LFX06-upper-rear-native-ridge-underlay-r1-alpha.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/live-land-authority-mask-r1.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png"),
  ]);
  assert.deepEqual([candidate.info.width, candidate.info.height], [1448, 1086]);

  let alphaCount = 0;
  let maximumAlpha = 0;
  let outsideRoi = 0;
  let outsideLand = 0;
  let waterOverlap = 0;
  for (let index = 0; index < candidate.info.width * candidate.info.height; index += 1) {
    const alpha = candidate.data[index * 4 + 3];
    if (alpha === 0) continue;
    alphaCount += 1;
    maximumAlpha = Math.max(maximumAlpha, alpha);
    const x = index % candidate.info.width;
    const y = Math.floor(index / candidate.info.width);
    if (x < 220 || x >= 740 || y < 20 || y >= 260) outsideRoi += 1;
    if (landMask.data[index] === 0) outsideLand += 1;
    if (waterMask.data[index] > 0) waterOverlap += 1;
  }
  assert.equal(alphaCount, 52_821);
  assert.equal(maximumAlpha, 196);
  assert.equal(outsideRoi, 0);
  assert.equal(outsideLand, 0);
  assert.equal(waterOverlap, 0);
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
    assert.ok(instance.evidence.contextAlphaFraction >= 0.8);
    assert.ok(instance.evidence.baseVegetationFraction >= 0.6);
    assert.ok(instance.evidence.structureFraction <= 0.3);
    assert.ok(instance.evidence.vegetationFraction >= 0.65);
  }
});

test("the rejected LFX01 rear-cliff candidate is not mounted at runtime", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");

  assert.doesNotMatch(rendererSource, /LFX01|upper-capital-rear-cliff-transition-r1-alpha/);
});

test("station LoD promotes train-free I20 at capital and open-undercroft I21 at site and close", async () => {
  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(rendererSource, /tier === "capital"\s*\? D06_CAPITAL_REVIEW_BASE/);
  assert.match(rendererSource, /I20-station-capital-cluster-no-train-r1-alpha\.png/);
  assert.match(rendererSource, /I21-station-undercroft-open-r1-alpha\.png/);
  assert.doesNotMatch(rendererSource, /I18-station-site-base-no-train-r1-alpha\.png/);
  assert.match(rendererSource, /height:\s*587\s*\*\s*0\.82/);
  assert.match(rendererSource, /width:\s*783\s*\*\s*0\.82/);
  assert.match(rendererSource, /D06_STATION_REVIEW_SCALE\s*=\s*0\.82/);

  const [capital, capitalSource, siteClose, siteCloseSource] = await Promise.all([
    rgba("/career-world/capitals/ninjaone/city-r3/_review/I20-station-capital-cluster-no-train-r1-alpha.png"),
    rgba("/career-world/capitals/ninjaone/city-nodes-r2/capital/infrastructure/I13-station-capital-cluster-r1-alpha.png"),
    rgba("/career-world/capitals/ninjaone/city-r3/_review/I21-station-undercroft-open-r1-alpha.png"),
    rgba("/career-world/capitals/ninjaone/city-r3/_review/I18-station-site-base-no-train-r1-alpha.png"),
  ]);
  assert.deepEqual([capital.info.width, capital.info.height], [384, 191]);
  assert.deepEqual([siteClose.info.width, siteClose.info.height], [1448, 1086]);

  let capitalAlphaDifferences = 0;
  let siteCloseAlphaExpansion = 0;
  let siteCloseAlphaReduction = 0;
  for (let index = 0; index < capital.info.width * capital.info.height; index += 1) {
    if (capital.data[index * 4 + 3] !== capitalSource.data[index * 4 + 3]) {
      capitalAlphaDifferences += 1;
    }
  }
  for (let index = 0; index < siteClose.info.width * siteClose.info.height; index += 1) {
    const candidateAlpha = siteClose.data[index * 4 + 3];
    const sourceAlpha = siteCloseSource.data[index * 4 + 3];
    if (candidateAlpha > sourceAlpha) siteCloseAlphaExpansion += 1;
    if (candidateAlpha < sourceAlpha) siteCloseAlphaReduction += 1;
  }
  assert.equal(capitalAlphaDifferences, 0);
  assert.equal(siteCloseAlphaExpansion, 0);
  assert.equal(siteCloseAlphaReduction, 38_927);
});
