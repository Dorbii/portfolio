import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_CAPITAL_CITY_ARTBOARD,
  NINJAONE_CAPITAL_CITY_CAMERA,
  NINJAONE_CAPITAL_CITY_NODE_COUNT,
  NINJAONE_CAPITAL_CITY_NODE_RUNTIME_ELIGIBLE,
  NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS,
  NINJAONE_CAPITAL_CITY_NODES,
  NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_RAIL_EXIT,
  NINJAONE_CAPITAL_CITY_STATION,
  NINJAONE_CAPITAL_CITY_VISUAL_LAYERS,
  NINJAONE_CAPITAL_CITY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_WORLD_SPAN,
  ninjaOneCapitalAnimatedCityNodeId,
  ninjaOneCapitalVisibleCityNodes,
} from "../features/career-world/development/model/ninjaOneCapitalCityNodes.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/manifests/city-node-composition-r1.json",
);
const validationPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-r1/qa/city-node-composition-r1.validation.json",
);
const conceptSubstrateValidationPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-r1/qa/city-concept-environment-substrate-r1.validation.json",
);

async function readJson(absolutePath) {
  return JSON.parse(await readFile(absolutePath, "utf8"));
}

async function sha256(absolutePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolutePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

function absolutePublicPath(publicPath) {
  assert.match(publicPath, /^\/career-world\//);
  return path.join(root, "public", publicPath.replace(/^\//, ""));
}

test("NinjaOne city composition publishes 19 independent skill nodes but remains terrain-blocked", async () => {
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/city-node-composition@r1");
  assert.equal(manifest.status, "integration-preview");
  assert.equal(manifest.productionReady, false);
  assert.equal(manifest.runtimeEligible, false);
  assert.equal(NINJAONE_CAPITAL_CITY_NODE_RUNTIME_ELIGIBLE, false);
  assert.equal(NINJAONE_CAPITAL_CITY_NODE_COUNT, 19);
  assert.equal(NINJAONE_CAPITAL_CITY_NODES.length, 19);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_ARTBOARD, [2571, 1929]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_WORLD_ORIGIN, [0.125, 0]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_WORLD_SPAN, [0.25, 1 / 3]);
  assert.deepEqual(NINJAONE_CAPITAL_CITY_CAMERA, {
    origin: [0.125, 0],
    span: [0.25, 1 / 3],
  });
  assert.equal(new Set(manifest.nodes.map(({ skillId }) => skillId)).size, 19);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(Object.groupBy(manifest.nodes, ({ layoutDistrictId }) => layoutDistrictId))
        .map(([districtId, nodes]) => [districtId, nodes.length]),
    ),
    {
      "application-core": 8,
      "infrastructure-works": 5,
      "knowledge-api-citadel": 6,
    },
  );
  assert.match(manifest.terrainBinding.status, /^blocked-/);
  assert.match(NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS, /^blocked-/);
  assert.equal(
    manifest.terrainBinding.canonicalLandMask.contentHashStatus,
    "frozen-global-authority",
  );
  assert.equal(
    manifest.terrainBinding.canonicalLandMask.sha256,
    "8801722b801b2ecabd048dc71ac99ff7f0c566e69e06a50d9c4e41706dd7003a",
  );
  assert.equal(
    manifest.terrainBinding.heightField.sha256,
    "8cb7d6480a707c33e220a55611af8557c3fc9440f0c347cf9a786adcb1f41e3f",
  );
  assert.equal(
    manifest.terrainBinding.slopeField.sha256,
    "c248599daeb10e5c8d71dc15ef2cc65d3b90a8f77165ab0cfda5c770676e6134",
  );
  assert.equal(
    manifest.terrainBinding.globalVisualBase.sha256,
    "6bab5e350840a7f832d19add140fd49a7523b12ffc06899f343064d3de07f32b",
  );
  assert.equal(
    manifest.terrainBinding.regionalTerrainMaster.sha256,
    "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02",
  );
  for (const node of manifest.nodes) {
    assert.equal(node.terrainAdmissionPreview.landCoverage, 1, node.skillId);
    assert.ok(node.terrainAdmissionPreview.buildableCoverage >= 0.8, node.skillId);
  }
  assert.equal(
    manifest.terrainBinding.hydrology.manifestPath,
    "/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
  );
  assert.equal(
    manifest.terrainBinding.hydrology.authorityId,
    "career-world/capitals/ninjaone/inland-water-authority@r1",
  );
  assert.equal(
    manifest.terrainBinding.hydrology.fieldPath,
    "/career-world/layers/water-surface/fields/ninjaone-inland-water-field-r1.png",
  );
  assert.equal(
    manifest.terrainBinding.hydrology.currentBranchSha256,
    await sha256(absolutePublicPath(manifest.terrainBinding.hydrology.manifestPath)),
  );
  assert.equal(manifest.terrainBinding.hydrology.fieldContentHashesFrozen, true);
  assert.equal(manifest.terrainBinding.hydrology.numericShorelineSetbackVerified, false);
});

test("all 19 skill buildings own renderable assets and appear in both city LOD previews", async () => {
  const manifest = await readJson(manifestPath);
  const validation = await readJson(validationPath);
  const alphaBlocked = manifest.nodes.filter(({ assetNodeReady }) => !assetNodeReady);
  assert.deepEqual(alphaBlocked, []);
  assert.equal(validation.assetNodeReadyCount, 19);
  assert.equal(validation.visiblyPlacedNodeCount, 19);
  assert.deepEqual(
    new Set(validation.detailedRenderedSkillIds),
    new Set(manifest.nodes.map(({ skillId }) => skillId)),
  );
  assert.deepEqual(
    new Set(validation.territoryRenderedSkillIds),
    new Set(manifest.nodes.map(({ skillId }) => skillId)),
  );

  const golang = manifest.nodes.find(({ skillId }) => skillId === "golang");
  assert.ok(golang);
  assert.equal(golang.renderMode, "semantic-layers");
  assert.deepEqual(golang.integrationBlockers, []);
  assert.equal(golang.alphaRecovery.maximumCornerAlpha, 0);
  assert.equal(golang.alphaRecovery.transparentRgbUnderZeroAlpha, 0);
  assert.equal(
    golang.alphaRecovery.sourceSha256,
    "afb3de7530580b4d19eb6b20d776cd660b26a4962955096cb80b47b342cfeacd",
  );

  for (const node of manifest.nodes) {
    const poster = absolutePublicPath(node.posterPath);
    assert.ok((await stat(poster)).size > 10_000, node.posterPath);
    assert.equal(await sha256(poster), node.posterSha256, node.posterPath);
    for (const layer of node.renderLayers) {
      const asset = absolutePublicPath(layer.path);
      assert.ok((await stat(asset)).size > 10_000, layer.path);
      assert.equal(await sha256(asset), layer.sha256, layer.path);
      assert.ok(layer.maximumCornerAlpha <= 1, layer.path);
    }
  }
});

test("concept proof preserves each runtime building width instead of rescaling by hierarchy class", async () => {
  const manifest = await readJson(manifestPath);
  const validation = await readJson(conceptSubstrateValidationPath);
  const manifestNodes = new Map(manifest.nodes.map((node) => [node.skillId, node]));

  assert.equal(validation.nodeScaleAuthority, "city-node-manifest-displayWidth");
  assert.equal(validation.scaleClassControlsDisplayWidth, false);
  assert.equal(validation.allNodeDisplayWidthsMatchManifest, true);
  assert.equal(validation.allSkillNodesHaveDetailTransitions, true);
  assert.deepEqual(validation.skillDisplayWidthRange, [124, 228]);
  assert.equal(validation.stationDisplayWidth, manifest.transport.station.displayWidth);
  assert.equal(validation.summitPlaceholderOwnership.passes, true);
  assert.equal(validation.summitPlaceholderOwnership.skillId, "ai-agent-systems");
  assert.equal(validation.summitPlaceholderOwnership.replacementSlotId, "summit-citadel");
  assert.ok(validation.summitPlaceholderOwnership.sourceOwnedPixels >= 75_000);
  assert.equal(validation.summitPlaceholderOwnership.aperturedResidualPixels, 0);
  assert.equal(validation.summitPlaceholderOwnership.foregroundResidualPixels, 0);

  const skillPlacements = validation.nodePlacements.filter(({ skillId }) => skillId !== null);
  assert.equal(skillPlacements.length, 19);
  for (const placement of skillPlacements) {
    const node = manifestNodes.get(placement.skillId);
    assert.ok(node, placement.skillId);
    assert.equal(placement.manifestDisplayWidth, node.displayWidth, placement.skillId);
    assert.equal(placement.visibleDimensions[0], node.displayWidth, placement.skillId);
    assert.equal(placement.displayWidthDeltaPixels, 0, placement.skillId);
  }
});

test("station, territory rail, and moving train retain independent ownership", async () => {
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.transport.station.independentAsset, true);
  assert.equal(manifest.transport.station.ownsTrack, false);
  assert.equal(manifest.transport.station.ownsTrain, false);
  assert.equal(manifest.transport.rail.owner, "territory-transport-layer");
  assert.equal(manifest.transport.train.owner, "moving-vehicle-layer");
  assert.equal(manifest.transport.train.independentAsset, true);
  assert.equal(manifest.transport.train.bakedIntoStation, false);
  assert.equal(manifest.transport.train.bakedIntoCityPlate, false);
  assert.equal(manifest.transport.train.path, null);
  assert.equal(NINJAONE_CAPITAL_CITY_STATION.id, "ninjaone-intercity-station-r2");
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.direction, "south-southeast");
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.entryDirection, "station-terminal");
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEntry, false);
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEndpoint, true);
  assert.equal(NINJAONE_CAPITAL_CITY_RAIL_EXIT.terminatesAtBuilding, false);
  assert.ok(manifest.transport.rail.controlPoints.at(-1).y > 1);
  assert.equal(manifest.transport.rail.cityOnlyLoopForbidden, true);
  assert.equal(manifest.transport.rail.renderMethod, "authored-isometric-segment-chain");
  assert.equal(manifest.transport.rail.screenSpaceRibbonForbidden, true);
  assert.equal(manifest.transport.rail.segments[0].id, "station-through");
  assert.ok(manifest.transport.rail.segments.every(({ rotationDegrees }) => rotationDegrees === 0));
  assert.ok(manifest.transport.rail.segments.every(({ id }) => !/west|northwest/i.test(id)));
  assert.equal(
    manifest.transport.rail.segmentJoins.length,
    manifest.transport.rail.segments.length - 1,
  );
  assert.ok(manifest.transport.rail.segmentJoins.every(({ alphaOverlapPixels }) => (
    alphaOverlapPixels > 0
  )));
  assert.equal(manifest.transport.rail.scaleReference.territoryOverviewPopulationVisible, false);
  assert.equal(manifest.transport.rail.scaleReference.humanHeightPixels, 31);
  assert.deepEqual(manifest.transport.rail.scaleReference.trackEnvelopeTargetPixels, [16, 20]);
  assert.deepEqual(
    manifest.transport.rail.controlPoints[0],
    manifest.transport.rail.stationTrackCenterLocalPosition,
  );
  assert.ok(Math.min(...manifest.transport.rail.controlPoints.map((point) => Math.hypot(
    point.x - manifest.transport.rail.stationTrackCenterLocalPosition.x,
    point.y - manifest.transport.rail.stationTrackCenterLocalPosition.y,
  ))) < 0.02);

  const railAtlasPath = absolutePublicPath(manifest.transport.rail.segmentAtlas.alphaPath);
  assert.ok((await stat(railAtlasPath)).size > 10_000, railAtlasPath);
  assert.equal(
    await sha256(railAtlasPath),
    manifest.transport.rail.segmentAtlas.alphaSha256,
    manifest.transport.rail.segmentAtlas.alphaPath,
  );

  for (const asset of [
    NINJAONE_CAPITAL_CITY_STATION,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railSupport,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railBed,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railTrack,
  ]) {
    const absolutePath = absolutePublicPath(asset.path);
    assert.ok((await stat(absolutePath)).size > 10_000, asset.path);
    assert.equal(await sha256(absolutePath), asset.sha256, asset.path);
  }
});

test("city fabric and temporary fantasy population remain independent registered layers", async () => {
  const manifest = await readJson(manifestPath);
  const conceptValidation = await readJson(conceptSubstrateValidationPath);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT, 16);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT, 8);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT, 8);
  assert.equal(manifest.populationScaleCues.affectsTerrain, false);
  assert.equal(manifest.populationScaleCues.affectsBuildingGeometry, false);
  assert.equal(manifest.populationScaleCues.registration, "identity-concept-master");
  assert.deepEqual(manifest.populationScaleCues.visibilityPolicy, {
    world: [],
    territory: [],
    capital: [],
    site: ["siteLayer"],
    close: ["siteLayer", "closeDetailLayer"],
  });
  assert.equal(manifest.populationScaleCues.siteLayer.cueCount, 8);
  assert.equal(manifest.populationScaleCues.closeDetailLayer.cueCount, 8);
  assert.ok(manifest.populationScaleCues.cues.every((cue) => (
    cue.registration === "identity-concept-master"
    && cue.conceptPosition.x === cue.localPosition.x
    && cue.conceptPosition.y === cue.localPosition.y
  )));
  assert.equal(conceptValidation.populationScaleCues.registration, "identity-concept-master");
  assert.deepEqual(conceptValidation.populationScaleCues.hiddenTiers, [
    "world",
    "territory",
    "capital",
  ]);
  assert.deepEqual(conceptValidation.populationScaleCues.siteVisibleTiers, ["site", "close"]);
  assert.deepEqual(conceptValidation.populationScaleCues.closeSupplementVisibleTiers, ["close"]);
  assert.equal(conceptValidation.populationScaleCues.siteCueCount, 8);
  assert.equal(conceptValidation.populationScaleCues.closeSupplementCueCount, 8);
  assert.deepEqual(conceptValidation.populationScaleCues.displayHeightRange, [21, 36]);
  assert.ok(conceptValidation.populationScaleCues.terrainSupport.every(
    ({ terrainSupportAlpha }) => terrainSupportAlpha >= 32,
  ));
  assert.deepEqual(
    new Set(manifest.populationScaleCues.cues.map(({ species }) => species)),
    new Set(["dwarf", "elf", "gnome", "human", "orc"]),
  );
  assert.equal(manifest.cityFabric.environmentTransitionDetail.visualOnly, true);
  assert.equal(manifest.cityFabric.environmentTransitionDetail.affectsLandMask, false);
  assert.equal(manifest.cityFabric.environmentTransitionDetail.affectsHeight, false);
  assert.equal(manifest.cityFabric.environmentTransitionDetail.affectsSlope, false);
  assert.equal(manifest.cityFabric.environmentTransitionDetail.affectsCollision, false);
  assert.equal(manifest.cityFabric.sourceEvidence.runtimeUsage, "none-rejected-monolithic-plate");
  assert.equal(manifest.cityFabric.overviewSettlement.lod, "territory-only");
  assert.equal(manifest.cityFabric.overviewSettlement.containsTerrainPixels, false);
  assert.equal(manifest.cityFabric.overviewSettlement.containsPopulation, false);
  assert.ok(manifest.cityFabric.infrastructureAtlas.placementIds.length >= 8);

  for (const asset of Object.values(NINJAONE_CAPITAL_CITY_VISUAL_LAYERS)) {
    assert.deepEqual(asset.dimensions, [2571, 1929], asset.path);
    const absolutePath = absolutePublicPath(asset.path);
    assert.ok((await stat(absolutePath)).size > 10_000, asset.path);
    assert.equal(await sha256(absolutePath), asset.sha256, asset.path);
  }
});

test("territory uses the sparse overview while detail selects at most one animation", () => {
  const capitalCamera = {
    origin: [0.25, 0.15],
    span: [0.125, 0.17],
  };
  assert.equal(ninjaOneCapitalVisibleCityNodes(capitalCamera, "world").length, 0);
  assert.equal(ninjaOneCapitalVisibleCityNodes(capitalCamera, "territory").length, 0);
  assert.equal(ninjaOneCapitalVisibleCityNodes(capitalCamera, "capital").length, 19);
  assert.equal(ninjaOneCapitalAnimatedCityNodeId(capitalCamera, "capital"), null);

  const visibleAtSite = ninjaOneCapitalVisibleCityNodes(capitalCamera, "site");
  const animatedAtSite = ninjaOneCapitalAnimatedCityNodeId(capitalCamera, "site");
  assert.ok(visibleAtSite.length > 0);
  assert.ok(
    animatedAtSite === null
      || visibleAtSite.some(({ skillId }) => skillId === animatedAtSite),
  );
  assert.ok(
    visibleAtSite.filter(({ skillId }) => skillId === animatedAtSite).length <= 1,
  );
});
