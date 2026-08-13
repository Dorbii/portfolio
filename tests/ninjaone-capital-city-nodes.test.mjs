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
const productionRuntimeValidationPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-r1/qa/city-production-runtime-r1.validation.json",
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

test("NinjaOne production composition registers 19 admitted skill nodes without a concept raster", async () => {
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/city-node-composition@r1");
  assert.equal(manifest.status, "production-component-recovery-baseline");
  assert.equal(manifest.productionReady, false);
  assert.equal(manifest.runtimeEligible, true);
  assert.equal(NINJAONE_CAPITAL_CITY_NODE_RUNTIME_ELIGIBLE, true);
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
  assert.equal(
    manifest.terrainBinding.status,
    "frozen-terrain-live-water-production-component-recovery",
  );
  assert.equal(
    NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS,
    manifest.terrainBinding.status,
  );
  for (const node of manifest.nodes) {
    assert.ok(Number.isFinite(node.localPosition.x), node.skillId);
    assert.ok(Number.isFinite(node.localPosition.y), node.skillId);
    assert.ok(node.localPosition.x >= 0 && node.localPosition.x <= 1, node.skillId);
    assert.ok(node.localPosition.y >= 0 && node.localPosition.y <= 1, node.skillId);
  }
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
    "/career-world/layers/inland-water/authority/fields/ninjaone-inland-water-field-r1.png",
  );
  assert.equal(
    manifest.terrainBinding.hydrology.currentBranchSha256,
    await sha256(absolutePublicPath(manifest.terrainBinding.hydrology.manifestPath)),
  );
  assert.equal(manifest.terrainBinding.hydrology.fieldContentHashesFrozen, true);
  assert.equal(manifest.terrainBinding.hydrology.numericShorelineSetbackVerified, false);
});

test("all 19 skill buildings own renderable assets in the production composition", async () => {
  const manifest = await readJson(manifestPath);
  const validation = await readJson(validationPath);
  const alphaBlocked = manifest.nodes.filter(({ assetNodeReady }) => !assetNodeReady);
  assert.deepEqual(alphaBlocked, []);
  assert.equal(validation.nodeCount, 19);
  assert.equal(validation.uniqueSkillIds, 19);
  assert.equal(validation.renderableNodeCount, 19);
  assert.equal(validation.runtimeLayerCount, 4);
  assert.equal(validation.legacyRuntimeLayerCount, 0);
  assert.equal(validation.individualScaleAuditPasses, true);

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

test("individual production scales keep buildings coherent with the environment", async () => {
  const manifest = await readJson(manifestPath);
  const validation = await readJson(productionRuntimeValidationPath);

  assert.equal(validation.layoutReferenceIsRuntimeRaster, false);
  assert.equal(validation.frozenTerrainGeometryUnchanged, true);
  assert.equal(validation.skillNodeCount, 19);
  assert.deepEqual(validation.skillDisplayWidthRange, [148, 290]);
  assert.equal(validation.stationDisplayWidth, manifest.transport.station.displayWidth);
  assert.equal(manifest.transport.station.displayWidth, 250);
  assert.ok(
    new Set(manifest.nodes.map(({ displayWidth }) => displayWidth)).size >= 8,
    "building widths must preserve meaningful proportional variation",
  );
  for (const node of manifest.nodes) {
    assert.equal(
      node.scaleAuthority,
      "individual-building-environment-proportion-r1",
      node.skillId,
    );
    assert.ok(node.scaleAudit?.confidence, node.skillId);
    assert.ok(node.targetVisibleHeight >= 110, node.skillId);
  }
  const citadel = manifest.nodes.find(({ skillId }) => skillId === "ai-agent-systems");
  assert.equal(citadel.displayWidth, 290);
  assert.match(citadel.scaleAudit.explicitOutlierException, /centerpiece/i);
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
  assert.ok(manifest.transport.rail.controlPoints.length >= 2);
  assert.ok(manifest.transport.rail.controlPoints.every(({ x, y }) => (
    Number.isFinite(x) && Number.isFinite(y)
  )));
  assert.equal(manifest.transport.rail.cityOnlyLoopForbidden, true);
  assert.equal(
    manifest.transport.rail.renderMethod,
    "lod-stable-authored-isometric-through-route-r3",
  );
  assert.equal(manifest.transport.rail.screenSpaceRibbonForbidden, true);
  assert.ok(manifest.transport.rail.segments.length >= 2);
  assert.equal(
    manifest.transport.rail.segmentJoins.length,
    manifest.transport.rail.segments.length - 1,
  );
  assert.equal(manifest.transport.rail.supportDerivedFromCenterline, true);
  assert.equal(manifest.transport.rail.stationTangentContinuous, true);
  assert.equal(manifest.transport.rail.portalTangentContinuous, true);
  assert.equal(manifest.transport.rail.orphanTrackCount, 0);
  assert.equal(manifest.transport.rail.throughRoute, true);
  assert.equal(manifest.transport.rail.futureNetworkReady, true);
  assert.ok(manifest.transport.rail.minimumCurveRadiusPixels >= 150);
  assert.ok(manifest.transport.rail.maximumLocalTurnDegrees <= 24);
  assert.equal(
    manifest.transport.rail.interchangeSocket.connectionStatus,
    "reserved-for-future-city-network",
  );
  assert.deepEqual(
    manifest.transport.rail.interchangeSocket.travelDirections,
    ["inbound", "outbound"],
  );
  assert.equal(manifest.transport.rail.scaleReference.territoryOverviewPopulationVisible, false);
  assert.equal(manifest.transport.rail.scaleReference.humanHeightPixels, 31);
  assert.deepEqual(manifest.transport.rail.scaleReference.trackEnvelopeTargetPixels, [16, 20]);
  assert.deepEqual(
    manifest.transport.rail.conceptTopology.segments[0].conceptPoints[0],
    [
      manifest.transport.rail.stationLocalPosition.x,
      manifest.transport.rail.stationLocalPosition.y,
    ],
  );
  assert.equal(manifest.transport.rail.conceptTopology.mountainTunnelRequired, true);
  assert.ok(manifest.transport.rail.segmentJoins.every(
    ({ alphaOverlapPixels }) => alphaOverlapPixels > 0,
  ));

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
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railPortalBack,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railTrack,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railPortalForeground,
    NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railStationForeground,
  ]) {
    const absolutePath = absolutePublicPath(asset.path);
    assert.ok((await stat(absolutePath)).size > 10_000, asset.path);
    assert.equal(await sha256(absolutePath), asset.sha256, asset.path);
  }
});

test("current city layers and temporary scale cues remain independently registered", async () => {
  const manifest = await readJson(manifestPath);
  const productionValidation = await readJson(productionRuntimeValidationPath);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT, 16);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT, 8);
  assert.equal(NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT, 8);
  assert.equal(manifest.populationScaleCues.affectsTerrain, false);
  assert.equal(manifest.populationScaleCues.affectsBuildingGeometry, false);
  assert.equal(manifest.populationScaleCues.registration, "production-city-circulation-r1");
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
    cue.registration === manifest.populationScaleCues.registration
    && Number.isFinite(cue.localPosition.x)
    && Number.isFinite(cue.localPosition.y)
  )));
  assert.deepEqual(
    new Set(manifest.populationScaleCues.cues.map(({ species }) => species)),
    new Set(["dwarf", "elf", "gnome", "human", "orc"]),
  );
  assert.equal(manifest.layerOrder.includes("city-terrain-contact"), false);
  assert.equal(manifest.cityFabric.environmentTransitionDetail, undefined);
  assert.equal(manifest.cityFabric.contactLayer, undefined);
  assert.equal(manifest.cityFabric.waterTransition, undefined);
  assert.equal(manifest.cityFabric.sourceEvidence, undefined);
  assert.equal(manifest.cityFabric.overviewSettlement, undefined);
  assert.equal(manifest.cityFabric.runtimeAuthority.id, (
    "career-world/ninjaone-capital/production-component-runtime@r1"
  ));
  assert.equal(manifest.cityFabric.runtimeAuthority.layoutReferenceIsRuntimeRaster, false);
  assert.equal(productionValidation.conceptDerivedRuntimeRasterCount, 0);
  assert.equal(manifest.cityFabric.infrastructureAtlas, undefined);
  assert.equal(manifest.cityFabric.productionCirculation.runtimeVisible, true);
  assert.equal(manifest.cityFabric.productionTransitionDetail.runtimeVisible, true);
  assert.equal(manifest.cityFabric.productionBridgeTransition.runtimeVisible, true);
  assert.equal(manifest.cityFabric.productionBridgeTransition.containsWaterPixels, false);
  assert.equal(manifest.cityFabric.productionBridges.runtimeVisible, true);
  assert.equal(
    manifest.cityFabric.productionBridges.bridgeCount,
    "authored-network-crossings",
  );
  assert.equal(manifest.cityFabric.productionForeground, undefined);
  const placementIds = productionValidation.placementRecords.map(({ id }) => id);
  assert.ok(placementIds.length > 0);
  assert.equal(new Set(placementIds).size, placementIds.length);
  assert.ok(productionValidation.placementRecords.every((placement) => {
    const position = placement.registeredOffset ?? placement.localPosition;
    const hasFinitePosition = Array.isArray(position)
      ? position.length === 2 && position.every(Number.isFinite)
      : Number.isFinite(position?.x) && Number.isFinite(position?.y);
    return typeof placement.id === "string"
      && placement.id.length > 0
      && typeof placement.role === "string"
      && placement.role.length > 0
      && hasFinitePosition
      && (placement.registeredScale === undefined || (
        Number.isFinite(placement.registeredScale) && placement.registeredScale > 0
      ));
  }));

  for (const asset of Object.values(NINJAONE_CAPITAL_CITY_VISUAL_LAYERS)) {
    assert.deepEqual(asset.dimensions, [2571, 1929], asset.path);
    const absolutePath = absolutePublicPath(asset.path);
    assert.ok((await stat(absolutePath)).size > 10_000, asset.path);
    assert.equal(await sha256(absolutePath), asset.sha256, asset.path);
  }
});

test("world and territory hide the city while detail selects at most one animation", () => {
  const capitalCamera = {
    origin: [0.25, 0.15],
    span: [0.125, 0.17],
  };
  assert.equal(ninjaOneCapitalVisibleCityNodes(capitalCamera, "world").length, 0);
  assert.equal(ninjaOneCapitalVisibleCityNodes(capitalCamera, "territory").length, 0);
  const visibleAtCapital = ninjaOneCapitalVisibleCityNodes(capitalCamera, "capital");
  assert.ok(visibleAtCapital.length > 0);
  assert.ok(visibleAtCapital.length <= 19, "capital detail cannot exceed the city manifest");
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

  assert.ok(visibleAtSite.filter(({ skillId }) => skillId === animatedAtSite).length <= 1);
});
