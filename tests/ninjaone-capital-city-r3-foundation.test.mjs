import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import sharp from "sharp";

import {
  NINJAONE_CAPITAL_CITY_R3_ARTBOARD,
  NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID,
  NINJAONE_CAPITAL_CITY_R3_CONTEXT,
  NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS,
  NINJAONE_CAPITAL_CITY_R3_TERRITORY,
  NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE,
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityFoundationR3.ts";
import {
  NINJAONE_CAPITAL_CITY_DETAIL_POLICY,
  NINJAONE_CAPITAL_CITY_PROOF_CAMERAS,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityRepresentations.ts";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts";
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
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK.dimensions, [1448, 1086]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK.dimensions, [1448, 1086]);
  assert.deepEqual(
    NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK.dimensions,
    [1448, 1086],
  );
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION.dimensions, [1448, 1086]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_TERRITORY.dimensions, [512, 384]);
  assert.equal(NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE, 0);
  assert.deepEqual(Object.keys(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS).sort(), [
    "CFX01",
    "CFX02",
    "D03L02",
    "D03L03",
    "D05L02",
    "D05L03",
    "I20",
    "I21",
    "LFX06",
    "WFX01",
  ]);
  assert.ok(Object.values(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS)
    .every(({ asset }) => !asset.path.includes("/_review/")));
});

test("D03 reveals native land and restores only city-owned contact and integration fabric", async () => {
  const [exclusion, contact, integration, district, land, water] = await Promise.all([
    grayscale(`../public${NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK.path}`),
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L02.asset.path),
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.asset.path),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/districts/D03-eastern-industry-mask.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/registered-parent-land-mask-r1.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png"),
  ]);
  assert.deepEqual([exclusion.info.width, exclusion.info.height, exclusion.info.channels], [1448, 1086, 1]);
  assert.deepEqual([contact.info.width, contact.info.height, contact.info.channels], [1448, 1086, 4]);
  assert.deepEqual([integration.info.width, integration.info.height, integration.info.channels], [1448, 1086, 4]);
  assert.deepEqual(
    {
      layerId: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L02.layerId,
      role: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L02.role,
      tiers: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L02.tiers,
    },
    {
      layerId: "L4_1",
      role: "eastern-industry-ground-contact-platforms",
      tiers: ["site", "close"],
    },
  );
  assert.deepEqual(
    {
      layerId: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.layerId,
      role: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.role,
      tiers: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.tiers,
    },
    {
      layerId: "L4_1",
      role: "eastern-industry-terrain-integration-detail",
      tiers: ["site", "close"],
    },
  );

  let districtPixels = 0;
  let hardRevealPixels = 0;
  let exclusionOutsideDistrict = 0;
  let contactPixels = 0;
  let contactOutsideDistrict = 0;
  let contactOutsideLand = 0;
  let contactOnWater = 0;
  let integrationPixels = 0;
  let integrationOutsideDistrict = 0;
  let integrationOutsideLand = 0;
  let integrationOnWater = 0;
  let integrationMaximumAlpha = 0;
  for (let index = 0; index < district.data.length; index += 1) {
    if (district.data[index] > 0) districtPixels += 1;
    if (exclusion.data[index] >= 240) hardRevealPixels += 1;
    if (exclusion.data[index] > 0 && district.data[index] === 0) {
      exclusionOutsideDistrict += 1;
    }
    const alpha = contact.data[index * 4 + 3];
    if (alpha > 0) {
      contactPixels += 1;
      if (district.data[index] === 0) contactOutsideDistrict += 1;
      if (land.data[index] === 0) contactOutsideLand += 1;
      if (water.data[index] > 223) contactOnWater += 1;
    }
    const integrationAlpha = integration.data[index * 4 + 3];
    if (integrationAlpha > 0) {
      integrationPixels += 1;
      integrationMaximumAlpha = Math.max(integrationMaximumAlpha, integrationAlpha);
      if (district.data[index] === 0) integrationOutsideDistrict += 1;
      if (land.data[index] < 64) integrationOutsideLand += 1;
      if (water.data[index] >= 240) integrationOnWater += 1;
    }
  }
  assert.ok(hardRevealPixels / districtPixels >= 0.9);
  assert.ok(hardRevealPixels / districtPixels <= 0.97);
  assert.equal(exclusionOutsideDistrict, 0);
  assert.ok(contactPixels / districtPixels >= 0.02);
  assert.ok(contactPixels / districtPixels <= 0.08);
  assert.equal(contactOutsideDistrict, 0);
  assert.equal(contactOutsideLand, 0);
  assert.equal(contactOnWater, 0);
  assert.ok(integrationPixels / districtPixels >= 0.02);
  assert.ok(integrationPixels / districtPixels <= 0.1);
  assert.equal(integrationMaximumAlpha, 220);
  assert.equal(integrationOutsideDistrict, 0);
  assert.equal(integrationOutsideLand, 0);
  assert.equal(integrationOnWater, 0);
  assert.deepEqual([
    contact.data[3],
    contact.data[(contact.info.width - 1) * 4 + 3],
    contact.data[(contact.info.width * (contact.info.height - 1)) * 4 + 3],
    contact.data[(contact.info.width * contact.info.height - 1) * 4 + 3],
  ], [0, 0, 0, 0]);
  assert.deepEqual([
    integration.data[3],
    integration.data[(integration.info.width - 1) * 4 + 3],
    integration.data[(integration.info.width * (integration.info.height - 1)) * 4 + 3],
    integration.data[(integration.info.width * integration.info.height - 1) * 4 + 3],
  ], [0, 0, 0, 0]);

  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  const contactIndex = rendererSource.indexOf('data-city-asset-id="D03L02"');
  const integrationIndex = rendererSource.indexOf('data-city-asset-id="D03L03"');
  const d03NodeIndex = rendererSource.indexOf('focusedDistrict="D03"', integrationIndex);
  assert.ok(contactIndex >= 0);
  assert.ok(integrationIndex > contactIndex);
  assert.ok(d03NodeIndex > integrationIndex);
});

test("D05 reveals native land and keeps grounding inside reversible L4_1 ownership", async () => {
  const [exclusion, contact, integration, district, land, water] = await Promise.all([
    grayscale(`../public${NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK.path}`),
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L02.asset.path),
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L03.asset.path),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/registered-parent-land-mask-r1.png"),
    grayscale("../art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png"),
  ]);
  assert.deepEqual([exclusion.info.width, exclusion.info.height, exclusion.info.channels], [1448, 1086, 1]);
  assert.deepEqual([contact.info.width, contact.info.height, contact.info.channels], [1448, 1086, 4]);
  assert.deepEqual([integration.info.width, integration.info.height, integration.info.channels], [1448, 1086, 4]);
  assert.deepEqual(
    [NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L02.layerId,
      NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L03.layerId],
    ["L4_1", "L4_1"],
  );
  assert.deepEqual(
    [NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L02.tiers,
      NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L03.tiers],
    [["site", "close"], ["site", "close"]],
  );

  let districtPixels = 0;
  let hardRevealPixels = 0;
  let exclusionOutsideDistrict = 0;
  let contactPixels = 0;
  let contactOutsideDistrict = 0;
  let contactOutsideLand = 0;
  let contactOnWater = 0;
  let integrationPixels = 0;
  let integrationOutsideDistrict = 0;
  let integrationOutsideLand = 0;
  let integrationOnWater = 0;
  let integrationMaximumAlpha = 0;
  for (let index = 0; index < district.data.length; index += 1) {
    if (district.data[index] > 0) districtPixels += 1;
    if (exclusion.data[index] >= 240) hardRevealPixels += 1;
    if (exclusion.data[index] > 0 && district.data[index] === 0) {
      exclusionOutsideDistrict += 1;
    }
    const contactAlpha = contact.data[index * 4 + 3];
    if (contactAlpha > 0) {
      contactPixels += 1;
      if (district.data[index] === 0) contactOutsideDistrict += 1;
      if (land.data[index] < 64) contactOutsideLand += 1;
      if (water.data[index] >= 240) contactOnWater += 1;
    }
    const integrationAlpha = integration.data[index * 4 + 3];
    if (integrationAlpha > 0) {
      integrationPixels += 1;
      integrationMaximumAlpha = Math.max(integrationMaximumAlpha, integrationAlpha);
      if (district.data[index] === 0) integrationOutsideDistrict += 1;
      if (land.data[index] < 64) integrationOutsideLand += 1;
      if (water.data[index] >= 240) integrationOnWater += 1;
    }
  }
  assert.ok(hardRevealPixels / districtPixels >= 0.96);
  assert.ok(hardRevealPixels / districtPixels <= 0.99);
  assert.equal(exclusionOutsideDistrict, 0);
  assert.ok(contactPixels / districtPixels >= 0.015);
  assert.ok(contactPixels / districtPixels <= 0.05);
  assert.equal(contactOutsideDistrict, 0);
  assert.equal(contactOutsideLand, 0);
  assert.equal(contactOnWater, 0);
  assert.ok(integrationPixels / districtPixels >= 0.015);
  assert.ok(integrationPixels / districtPixels <= 0.06);
  assert.equal(integrationMaximumAlpha, 220);
  assert.equal(integrationOutsideDistrict, 0);
  assert.equal(integrationOutsideLand, 0);
  assert.equal(integrationOnWater, 0);
  assert.deepEqual([
    contact.data[3],
    contact.data[(contact.info.width - 1) * 4 + 3],
    contact.data[(contact.info.width * (contact.info.height - 1)) * 4 + 3],
    contact.data[(contact.info.width * contact.info.height - 1) * 4 + 3],
  ], [0, 0, 0, 0]);
  assert.deepEqual([
    integration.data[3],
    integration.data[(integration.info.width - 1) * 4 + 3],
    integration.data[(integration.info.width * (integration.info.height - 1)) * 4 + 3],
    integration.data[(integration.info.width * integration.info.height - 1) * 4 + 3],
  ], [0, 0, 0, 0]);

  const rendererSource = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  const contactIndex = rendererSource.indexOf('data-city-asset-id="D05L02"');
  const integrationIndex = rendererSource.indexOf('data-city-asset-id="D05L03"');
  const d05NodeIndex = rendererSource.indexOf('focusedDistrict="D05"', integrationIndex);
  assert.ok(contactIndex >= 0);
  assert.ok(integrationIndex > contactIndex);
  assert.ok(d05NodeIndex > integrationIndex);
});

test("progressive city detail uses the byte-exact accepted live-water authority", async () => {
  const [runtimeBytes, sourceBytes] = await Promise.all([
    readFile(new URL(
      `../public${NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK.path}`,
      import.meta.url,
    )),
    readFile(new URL(
      "../art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png",
      import.meta.url,
    )),
  ]);
  assert.equal(runtimeBytes.equals(sourceBytes), true);
  const metadata = await sharp(runtimeBytes).metadata();
  assert.deepEqual([metadata.width, metadata.height, metadata.channels], [1448, 1086, 1]);
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
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.WFX01\.asset\.path/);
  assert.match(rendererSource, /data-city-child-layer="L4_0"/);

  const [candidate, waterMask] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.asset.path),
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
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.CFX01\.asset\.path/);
  assert.match(rendererSource, /data-city-asset-id="CFX01"/);
  assert.match(rendererSource, /opacity=\{tier === "close" \? 1 : 0\.48\}/);

  const [candidate, context, waterMask, d06Mask] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.path),
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
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.CFX02\.asset\.path/);
  assert.match(rendererSource, /data-city-asset-id="CFX02"/);

  const [candidate, context, waterMask] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX02.asset.path),
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
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.LFX06\.asset\.path/);
  assert.match(rendererSource, /data-city-asset-id="LFX06"/);
  assert.match(rendererSource, /data-city-child-layer="L4_1"/);

  const [candidate, landMask, waterMask] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.path),
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
  assert.match(foliageSource, /NinjaOneEnvironmentFoliageGroup/);
  assert.match(foliageSource, /NinjaOneEnvironmentFoliageCanvas/);
  assert.match(foliageSource, /shared-neutralization-plus-animated-canopy/);
  assert.doesNotMatch(foliageSource, /city-nodes-r2[\\/]foliage/);
  assert.equal(reuseManifest.sourceFoliageManifestId, "career-world/capitals/ninjaone/foliage@r6");
  assert.ok(reuseManifest.instances.length > 0);
  for (const instance of reuseManifest.instances) {
    assert.ok(instance.evidence.contextAlphaFraction >= 0.8);
    assert.ok(instance.evidence.baseVegetationFraction >= 0.6);
    assert.ok(instance.evidence.structureFraction <= 0.3);
    assert.ok(instance.evidence.vegetationFraction >= 0.65);
  }
  const approvedIds = new Set(reuseManifest.instances.map(({ id }) => id));
  const freeCloseCamera = Object.freeze({
    origin: Object.freeze([0.125, 0]),
    span: Object.freeze([0.145, 0.194]),
  });
  assert.deepEqual(
    selectNinjaOneEnvironmentFoliageInstances(
      freeCloseCamera,
      true,
      NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
      NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
      approvedIds,
    ),
    [],
    "The global L2 foliage retention ceiling must remain unchanged.",
  );
  const cityTrees = selectNinjaOneEnvironmentFoliageInstances(
    freeCloseCamera,
    true,
    NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
    NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    approvedIds,
    NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
  );
  assert.ok(cityTrees.length > 0, "The wider city close tier must mount approved L2 trees.");
  assert.ok(cityTrees.every(({ id }) => approvedIds.has(id)));
  assert.ok(cityTrees.every(({ atlasResource }) => (
    atlasResource.path.includes("/environment/shared/foliage-native-r4/")
  )));
  const d02Registration = reuseManifest.districtInstances.D02;
  assert.equal(
    d02Registration.method,
    "existing-L2-tree-node-positions-registered-to-baked-D02-ridge-foliage",
  );
  assert.equal(d02Registration.instances.length, 10);
  const sourceFoliageIds = new Set(
    NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ id }) => id),
  );
  const d02ApprovedIds = new Set([
    ...approvedIds,
    ...d02Registration.instances.map(({ id }) => id),
  ]);
  assert.ok(d02Registration.instances.every(({ id }) => sourceFoliageIds.has(id)));
  for (const { id } of d02Registration.instances) {
    const sourceInstance = NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.find(
      (instance) => instance.id === id,
    );
    assert.ok(sourceInstance?.neutralizationAtlasRect);
    const atlasBytes = await readFile(new URL(
      `../public${sourceInstance.atlasResource.path.split("?")[0]}`,
      import.meta.url,
    ));
    for (const [frameKind, rect] of [
      ["canopy", sourceInstance.canopyAtlasRect],
      ["neutralization", sourceInstance.neutralizationAtlasRect],
    ]) {
      const [left, top, width, height] = rect;
      const { data } = await sharp(atlasBytes)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let nontransparentPixels = 0;
      for (let offset = 3; offset < data.length; offset += 4) {
        if (data[offset] > 0) nontransparentPixels += 1;
      }
      assert.ok(
        nontransparentPixels > 0,
        `${id} must not register an empty ${frameKind} atlas frame.`,
      );
    }
  }
  const d02Trees = selectNinjaOneEnvironmentFoliageInstances(
    NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d02-close"],
    true,
    NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
    NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    d02ApprovedIds,
    NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
  );
  assert.ok(d02Trees.length >= 12);
  assert.ok(d02Trees.every(({ atlasResource }) => (
    atlasResource.path.includes("/environment/shared/foliage-native-r4/")
  )));
  const d03Registration = reuseManifest.districtInstances.D03;
  assert.equal(
    d03Registration.method,
    "existing-L2-tree-node-positions-registered-to-baked-D03-native-land-foliage",
  );
  assert.equal(d03Registration.instances.length, 16);
  const d03ApprovedIds = new Set([
    ...approvedIds,
    ...d03Registration.instances.map(({ id }) => id),
  ]);
  assert.ok(d03Registration.instances.every(({ id }) => sourceFoliageIds.has(id)));
  for (const { id } of d03Registration.instances) {
    const sourceInstance = NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.find(
      (instance) => instance.id === id,
    );
    assert.ok(sourceInstance?.neutralizationAtlasRect);
    const atlasBytes = await readFile(new URL(
      `../public${sourceInstance.atlasResource.path.split("?")[0]}`,
      import.meta.url,
    ));
    for (const [frameKind, rect] of [
      ["canopy", sourceInstance.canopyAtlasRect],
      ["neutralization", sourceInstance.neutralizationAtlasRect],
    ]) {
      const [left, top, width, height] = rect;
      const { data } = await sharp(atlasBytes)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let nontransparentPixels = 0;
      for (let offset = 3; offset < data.length; offset += 4) {
        if (data[offset] > 0) nontransparentPixels += 1;
      }
      assert.ok(
        nontransparentPixels > 0,
        `${id} must not register an empty ${frameKind} atlas frame.`,
      );
    }
  }
  const d03Trees = selectNinjaOneEnvironmentFoliageInstances(
    NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d03-close"],
    true,
    NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
    NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    d03ApprovedIds,
    NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
  );
  assert.ok(d03Trees.length >= 16);
  assert.ok(d03Trees.every(({ atlasResource }) => (
    atlasResource.path.includes("/environment/shared/foliage-native-r4/")
  )));

  const integration = await rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.asset.path);
  const foliageOccupancy = Buffer.alloc(integration.info.width * integration.info.height);
  const atlasCache = new Map();
  for (const instance of d03Trees) {
    let atlasBytes = atlasCache.get(instance.atlasResource.path);
    if (!atlasBytes) {
      atlasBytes = await readFile(new URL(`../public${instance.atlasResource.path.split("?")[0]}`, import.meta.url));
      atlasCache.set(instance.atlasResource.path, atlasBytes);
    }
    const [frameX, frameY, frameWidth, frameHeight] = instance.canopyAtlasRect;
    const left = Math.floor(instance.artboardBounds.origin[0]);
    const top = Math.floor(instance.artboardBounds.origin[1]);
    const right = Math.ceil(instance.artboardBounds.origin[0] + instance.artboardBounds.span[0]);
    const bottom = Math.ceil(instance.artboardBounds.origin[1] + instance.artboardBounds.span[1]);
    const targetWidth = right - left;
    const targetHeight = bottom - top;
    const canopyAlpha = await sharp(atlasBytes)
      .extract({ left: frameX, top: frameY, width: frameWidth, height: frameHeight })
      .ensureAlpha()
      .extractChannel(3)
      .resize(targetWidth, targetHeight, { fit: "fill" })
      .raw()
      .toBuffer();
    for (let y = 0; y < targetHeight; y += 1) {
      for (let x = 0; x < targetWidth; x += 1) {
        if (canopyAlpha[y * targetWidth + x] === 0) continue;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const artboardX = left + x + dx;
            const artboardY = top + y + dy;
            if (
              artboardX >= 0
              && artboardX < integration.info.width
              && artboardY >= 0
              && artboardY < integration.info.height
            ) {
              foliageOccupancy[artboardY * integration.info.width + artboardX] = 1;
            }
          }
        }
      }
    }
  }
  let foliagePixels = 0;
  let integrationFoliageOverlap = 0;
  for (let index = 0; index < foliageOccupancy.length; index += 1) {
    if (foliageOccupancy[index] === 0) continue;
    foliagePixels += 1;
    if (integration.data[index * 4 + 3] > 0) integrationFoliageOverlap += 1;
  }
  assert.ok(foliagePixels > 1_000);
  assert.equal(integrationFoliageOverlap, 0);
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
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.I20\.asset\.path/);
  assert.match(rendererSource, /NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS\.I21\.asset\.path/);
  assert.doesNotMatch(rendererSource, /I18-station-site-base-no-train-r1-alpha\.png/);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement, {
    anchor: [1056.5, 1086],
    baseSize: [783, 587],
    scale: 0.72,
  });

  const [capital, capitalSource, siteClose, siteCloseSource] = await Promise.all([
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.asset.path),
    rgba("/career-world/capitals/ninjaone/city-nodes-r2/capital/infrastructure/I13-station-capital-cluster-r1-alpha.png"),
    rgba(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.asset.path),
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

  const siteClosePlacement = NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement;
  const capitalPlacement = NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement;
  const renderedSiteCloseWidth = Math.round(
    siteClosePlacement.baseSize[0] * siteClosePlacement.scale,
  );
  const renderedSiteCloseHeight = Math.round(
    siteClosePlacement.baseSize[1] * siteClosePlacement.scale,
  );
  const renderedCapitalWidth = capitalPlacement.baseSize[0] * capitalPlacement.scale;
  assert.ok(renderedSiteCloseWidth / renderedCapitalWidth >= 0.9);
  assert.ok(renderedSiteCloseWidth / renderedCapitalWidth <= 1.1);

  const stationBytes = await readFile(new URL(
    `../public${NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.asset.path}`,
    import.meta.url,
  ));
  const [{ data: placedStation }, registeredWater] = await Promise.all([
    sharp(stationBytes)
      .resize(renderedSiteCloseWidth, renderedSiteCloseHeight)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    grayscale(
      `../public${NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK.path}`,
    ),
  ]);
  const stationLeft = Math.round(
    siteClosePlacement.anchor[0] - renderedSiteCloseWidth * 0.5,
  );
  const stationTop = NINJAONE_CAPITAL_CITY_R3_ARTBOARD[1] - renderedSiteCloseHeight;
  let opaqueRegisteredWaterOverlap = 0;
  for (let y = 0; y < renderedSiteCloseHeight; y += 1) {
    for (let x = 0; x < renderedSiteCloseWidth; x += 1) {
      const stationAlpha = placedStation[(y * renderedSiteCloseWidth + x) * 4 + 3];
      const waterOffset = (stationTop + y) * NINJAONE_CAPITAL_CITY_R3_ARTBOARD[0]
        + stationLeft + x;
      if (stationAlpha >= 128 && registeredWater.data[waterOffset] >= 128) {
        opaqueRegisteredWaterOverlap += 1;
      }
    }
  }
  assert.ok(
    opaqueRegisteredWaterOverlap <= 1_800,
    `I21 must preserve the registered river margin; found ${opaqueRegisteredWaterOverlap} opaque water pixels.`,
  );
});
