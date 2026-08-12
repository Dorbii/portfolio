import { createHash } from "node:crypto";

export const NINJAONE_STATION_RIVER_LOCK_REVISION = "r1";
export const NINJAONE_STATION_RIVER_BASE_COMMIT = "e50bb80";
export const NINJAONE_STATION_RIVER_ENVELOPE = Object.freeze({
  height: 1100,
  left: 700,
  top: 520,
  width: 1150,
});

export const NINJAONE_STATION_RIVER_PATHS = Object.freeze({
  cityManifest: "public/career-world/capitals/ninjaone/manifests/city-node-composition-r1.json",
  fixture: "tests/fixtures/ninjaone-station-river-layout-lock-r1.json",
  geometryLock: "public/career-world/capitals/ninjaone/city-r1/qa/station-river-geometry-lock-r1.png",
  treatmentMask: "public/career-world/capitals/ninjaone/city-r1/fabric/station-river-treatment-mask-r1.png",
  waterManifest: "public/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
});

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nodeLayout(node) {
  return {
    displayWidth: node.displayWidth,
    footprintFraction: node.footprintFraction,
    groundAnchor: node.groundAnchor,
    localPosition: node.localPosition,
    skillId: node.skillId,
    slotId: node.slotId,
    terrainTransition: node.terrainTransition,
  };
}

function populationLayout(cue) {
  return {
    displayHeight: cue.displayHeight,
    groundAnchor: cue.groundAnchor,
    id: cue.id,
    localPosition: cue.localPosition,
    minimumDetailTier: cue.minimumDetailTier,
  };
}

export function buildNinjaOneStationRiverLayoutContract(city, water) {
  return {
    artboard: city.artboard,
    cityFabric: {
      contactLayer: city.cityFabric.contactLayer,
      environmentTransitionDetail: city.cityFabric.environmentTransitionDetail,
      foreground: city.cityFabric.foreground,
      underlay: city.cityFabric.underlay,
    },
    districts: city.districts.map((district) => ({
      id: district.id,
      sourceFabricEnvelope: district.sourceFabricEnvelope,
    })),
    envelope: NINJAONE_STATION_RIVER_ENVELOPE,
    layerOrder: city.layerOrder,
    nodes: city.nodes.map(nodeLayout),
    population: city.populationScaleCues.cues.map(populationLayout),
    rail: {
      bedLayer: city.transport.rail.bedLayer,
      controlPoints: city.transport.rail.controlPoints,
      gatewayLocalPosition: city.transport.rail.gatewayLocalPosition,
      segments: city.transport.rail.segments.map((segment) => ({
        displayWidth: segment.displayWidth,
        id: segment.id,
        kind: segment.kind,
        localCenter: segment.localCenter,
        rotationDegrees: segment.rotationDegrees,
        sourceCell: segment.sourceCell,
      })),
      stationLocalPosition: city.transport.rail.stationLocalPosition,
      stationTrackCenterLocalPosition: city.transport.rail.stationTrackCenterLocalPosition,
      supportLayer: city.transport.rail.supportLayer,
      trackLayer: city.transport.rail.trackLayer,
    },
    station: city.transport.station,
    terrainBinding: city.terrainBinding,
    water: {
      authorityId: water.authorityId,
      field: water.field,
      registration: water.registration,
      terrainEraseMask: water.terrainEraseMask,
    },
  };
}

export function layoutContractSha256(city, water) {
  return sha256(JSON.stringify(buildNinjaOneStationRiverLayoutContract(city, water)));
}
