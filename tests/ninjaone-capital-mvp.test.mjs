import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_CAPITAL_CITY_ARTBOARD,
  NINJAONE_CAPITAL_CITY_CAMERA,
  NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER,
  NINJAONE_CAPITAL_CITY_PRESENTATION_CAMERA,
  NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_RAIL_EXIT,
  NINJAONE_CAPITAL_CITY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_WORLD_SPAN,
  ninjaOneCapitalVisiblePopulationCues,
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
  assert.deepEqual(NINJAONE_CAPITAL_CITY_PRESENTATION_CAMERA, {
    origin: [0.125, 0],
    span: [0.25, 0.25],
  });
  assert.deepEqual(city.artboard.dimensions, NINJAONE_CAPITAL_CITY_ARTBOARD);
  assert.deepEqual(city.artboard.worldOrigin, NINJAONE_CAPITAL_CITY_WORLD_ORIGIN);
  assert.deepEqual(city.artboard.worldSpan, NINJAONE_CAPITAL_CITY_WORLD_SPAN);
  assert.deepEqual(city.layerOrder, NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER);
});

test("capital preview mounts distinct territory and detailed city stacks without obsolete terrace plates", async () => {
  const [
    city,
    page,
    scene,
    renderer,
    skillRenderer,
    developmentIndex,
  ] = await Promise.all([
    manifest(),
    source("app/page.tsx"),
    source("features/career-world/composition/WorldScene.tsx"),
    source("features/career-world/development/NinjaOneCapitalMvp.tsx"),
    source("features/career-world/development/NinjaOneCapitalSkillNodes.tsx"),
    source("features/career-world/development/index.ts"),
  ]);

  assert.match(
    page,
    /case "ninjaone-capital-mvp":[\s\S]*?<CareerWorld enablePerformanceProbe initialView="ninjaone-capital" \/>/,
  );
  assert.doesNotMatch(page, /capitalMvp/);
  assert.match(page, /default:[\s\S]*?return <CareerWorld \/>/);
  assert.match(scene, /<TerritoryLandform/);
  assert.match(
    scene,
    /showNinjaOneInlandWater && inlandWaterAuthorityVisible \? \([\s\S]*?<NinjaOneInlandWaterCanvas[\s\S]*?active=\{isPageVisible && inlandWaterMotionVisible\}/,
  );
  assert.match(scene, /const showNinjaOneCapital = !topologyProof && !environmentProof/);
  assert.match(
    scene,
    /showNinjaOneCapital && !capitalRecoveryBaseline \? \([\s\S]*?<NinjaOneCapitalMvp[\s\S]*?light=\{WORLD_LIGHT\}/,
  );
  assert.match(
    developmentIndex,
    /NINJAONE_CAPITAL_CITY_PRESENTATION_CAMERA as NINJAONE_CAPITAL_MVP_CAMERA/,
  );
  assert.match(renderer, /city-node-composition@r1/);
  assert.match(renderer, /detailedCityVisible/);
  assert.doesNotMatch(renderer, /phase\?: "contact" \| "city" \| "all"/);
  assert.match(scene, /<TerritoryLandform[\s\S]*?<NinjaOneInlandWaterCanvas[\s\S]*?<NinjaOneCapitalMvp/);
  for (const productionLayer of [
    "InfrastructureLayer",
    "EnvironmentLayer",
    "ActorsEffectsLayer",
    "StructuresLayer",
    "FoliageLayer",
  ]) {
    assert.match(scene, new RegExp(`<${productionLayer}`));
  }
  assert.match(renderer, /detailState\.tier\.id === "capital"/);
  assert.doesNotMatch(renderer, /territory-settlement-overview/);
  assert.doesNotMatch(renderer, /overviewSettlement|waterTransition/);
  assert.doesNotMatch(renderer, /NinjaOneStationRiverDetail/);
  assert.doesNotMatch(renderer, /city-terrain-contact/);
  assert.match(scene, /detailState\.tier\.id !== "world"/);
  assert.match(scene, /detailState\.tier\.id !== "territory"/);

  for (const layer of city.layerOrder) {
    if (layer === "external-terrain") {
      assert.match(scene, /<TerritoryLandform/);
    } else if (layer === "inland-water") {
      assert.match(scene, /<NinjaOneInlandWaterCanvas/);
    } else if (layer === "building-ground-shadows") {
      assert.match(skillRenderer, /data-capital-city-node-layer="building-ground-shadows"/);
    } else if (layer === "single-centerline-transport-site-close") {
      assert.match(renderer, /data-capital-layer="single-centerline-transport"/);
    } else if (layer === "skill-building-nodes") {
      assert.match(skillRenderer, /data-capital-layer="skill-building-nodes"/);
    } else if (
      layer === "temporary-population-site-scale-cues"
      || layer === "temporary-population-close-detail-cues"
    ) {
      assert.match(renderer, /<NinjaOneCapitalPopulation/);
    } else {
      assert.match(renderer, new RegExp(`data-capital-layer="${layer}"`), layer);
    }
  }

  assert.doesNotMatch(renderer, /NINJAONE_CAPITAL_MVP_PLATES/);
  assert.doesNotMatch(renderer, /model\/ninjaOneCapitalMvp/);
  assert.doesNotMatch(renderer, /data-capital-plate="(?:base|static-environment)"/);
  assert.doesNotMatch(renderer, /data-shared-asset="(?:structure|foliage)"/);
  assert.doesNotMatch(`${renderer}\n${skillRenderer}`, /Kaizen/i);
  assert.equal(city.cityFabric.contactLayer.containsTerrainPixels, true);
  assert.equal(city.cityFabric.contactLayer.runtimeVisible, false);
  assert.equal(city.layerOrder.includes("city-terrain-contact"), false);
  assert.equal(city.cityFabric.overviewSettlement.runtimeVisible, false);
  assert.equal(city.cityFabric.waterTransition.runtimeVisible, false);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_VISUAL_LAYERS\.productionCirculation/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_VISUAL_LAYERS\.productionTransitionDetail/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_VISUAL_LAYERS\.productionBridgeTransition/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_VISUAL_LAYERS\.registeredBridges/);
  assert.match(renderer, /\{detailedCityVisible \? \([\s\S]*?<NinjaOneCapitalSkillNodes/);
  assert.match(skillRenderer, /ninjaOneCapitalVisibleCityNodes/);
  assert.match(skillRenderer, /data-capital-city-node-terrain-binding="production-component-transition"/);
});

test("rail, station, and temporary population stay independent at runtime", async () => {
  const [renderer, populationRenderer] = await Promise.all([
    source("features/career-world/development/NinjaOneCapitalMvp.tsx"),
    source("features/career-world/development/NinjaOneCapitalPopulation.tsx"),
  ]);
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
  assert.match(renderer, /data-capital-layer="single-centerline-transport"/);
  assert.match(renderer, /<NinjaOneCapitalPopulation/);
  assert.match(populationRenderer, /data-temporary-swappable-layer="true"/);
  assert.match(populationRenderer, /data-population-render-mode="camera-culled-individual-sprites"/);
  assert.match(populationRenderer, /ninjaOneCapitalVisiblePopulationCues/);
});

test("population cues are culled to the current detailed camera", () => {
  const site = {
    origin: [0.24, 0.08],
    span: [0.09, 0.09],
  };
  const close = {
    origin: [0.24, 0.08],
    span: [0.06, 0.06],
  };
  assert.equal(ninjaOneCapitalVisiblePopulationCues(site, "capital").length, 0);
  assert.ok(ninjaOneCapitalVisiblePopulationCues(site, "site").every(
    ({ minimumDetailTier }) => minimumDetailTier === "site",
  ));
  assert.ok(ninjaOneCapitalVisiblePopulationCues(close, "close").length <= 16);
});
