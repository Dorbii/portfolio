import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_CAPITAL_CITY_ARTBOARD,
  NINJAONE_CAPITAL_CITY_CAMERA,
  NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER,
  NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_RAIL_EXIT,
  NINJAONE_CAPITAL_CITY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_WORLD_SPAN,
} from "../features/career-world/development/model/ninjaOneCapitalCityNodes.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function manifest() {
  return JSON.parse(await source(
    "public/career-world/capitals/ninjaone/manifests/city-node-composition-r1.json",
  ));
}

test("capital preview camera and runtime registration use the full B1/B2/C1/C2 city artboard", async () => {
  const city = await manifest();
  assert.deepEqual(NINJAONE_CAPITAL_CITY_ARTBOARD, [2571, 1929]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_WORLD_ORIGIN, [0.125, 0]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_WORLD_SPAN, [0.25, 1 / 3]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_CAMERA, {
    origin: [0.125, 0],
    span: [0.25, 1 / 3],
  });
  assert.deepEqual(city.artboard.dimensions, NINJAONE_CAPITAL_CITY_ARTBOARD);
  assert.deepEqual(city.artboard.worldOrigin, NINJAONE_CAPITAL_CITY_WORLD_ORIGIN);
  assert.deepEqual(city.artboard.worldSpan, NINJAONE_CAPITAL_CITY_WORLD_SPAN);
  assert.deepEqual(city.layerOrder, NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER);
});

test("capital preview mounts distinct territory and detailed city stacks without obsolete terrace plates", async () => {
  const [city, page, scene, renderer, skillRenderer, developmentIndex] = await Promise.all([
    manifest(),
    source("app/page.tsx"),
    source("features/career-world/composition/WorldScene.tsx"),
    source("features/career-world/development/NinjaOneCapitalMvp.tsx"),
    source("features/career-world/development/NinjaOneCapitalSkillNodes.tsx"),
    source("features/career-world/development/index.ts"),
  ]);

  assert.match(
    page,
    /case "ninjaone-capital-mvp":[\s\S]*?<CareerWorld capitalMvp enableDevelopmentTools \/>/,
  );
  assert.match(scene, /<TerritoryLandform/);
  assert.match(
    scene,
    /showNinjaOneInlandWater \? \([\s\S]*?<NinjaOneInlandWaterCanvas[\s\S]*?active=\{isPageVisible\}/,
  );
  assert.match(scene, /<NinjaOneCapitalMvp[\s\S]*light=\{WORLD_LIGHT\}/);
  assert.match(developmentIndex, /NINJAONE_CAPITAL_CITY_CAMERA as NINJAONE_CAPITAL_MVP_CAMERA/);
  assert.match(renderer, /city-node-composition@r1/);
  assert.match(renderer, /territoryOverviewVisible/);
  assert.match(renderer, /detailedCityVisible/);
  assert.match(renderer, /data-capital-layer="territory-settlement-overview"/);

  for (const layer of city.layerOrder) {
    if (layer === "external-terrain") {
      assert.match(scene, /<TerritoryLandform/);
    } else if (layer === "building-ground-shadows") {
      assert.match(skillRenderer, /data-capital-city-node-layer="building-ground-shadows"/);
    } else {
      assert.match(renderer, new RegExp(`data-capital-layer="${layer}"`), layer);
    }
  }

  assert.doesNotMatch(renderer, /NINJAONE_CAPITAL_MVP_PLATES/);
  assert.doesNotMatch(renderer, /model\/ninjaOneCapitalMvp/);
  assert.doesNotMatch(renderer, /data-capital-plate="(?:base|static-environment)"/);
  assert.doesNotMatch(renderer, /data-shared-asset="(?:structure|foliage)"/);
  assert.doesNotMatch(`${renderer}\n${skillRenderer}`, /Kaizen/i);
});

test("rail, station, and temporary population stay independent at runtime", async () => {
  const renderer = await source(
    "features/career-world/development/NinjaOneCapitalMvp.tsx",
  );
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.direction, "south-southeast");
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.entryDirection, "station-terminal");
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEntry, false);
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEndpoint, true);
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.terminatesAtBuilding, false);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT, 16);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT, 8);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT, 8);
  assert.match(renderer, /data-capital-station-independent="true"/);
  assert.match(renderer, /data-capital-station-owns-track="false"/);
  assert.match(renderer, /data-capital-station-owns-train="false"/);
  assert.match(renderer, /data-capital-rail-entry/);
  assert.match(renderer, /data-capital-rail-off-capital-entry/);
  assert.match(renderer, /data-capital-rail-terminates-at-building/);
  assert.match(renderer, /data-asset-status="production-loop-not-yet-recovered"/);
  assert.match(renderer, /data-temporary-swappable-layer="true"/);
  assert.match(renderer, /sitePopulationVisible \? \(/);
  assert.match(renderer, /closePopulationVisible \? \(/);
  assert.match(renderer, /temporary-population-site-scale-cues/);
  assert.match(renderer, /temporary-population-close-detail-cues/);
});
