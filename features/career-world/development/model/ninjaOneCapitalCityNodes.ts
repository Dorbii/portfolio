import cityNodeManifest from "../../../../public/career-world/capitals/ninjaone/manifests/city-node-composition-r1.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import type { DetailTierId } from "../../shared/lod";
import { WORLD_PLANE } from "../../shared/world.ts";

export type NinjaOneCapitalCityNodeProductionState =
  | "animation-pending"
  | "independent-go-metadata-pending"
  | "provisional-static"
  | "review"
  | "selected"
  | "selected-alpha-blocked";

export type NinjaOneCapitalCityNodeRenderMode =
  | "animated-master"
  | "semantic-layers"
  | "static";

export interface NinjaOneCapitalCityNodeLayer {
  readonly dimensions: Pair;
  readonly durationMs: number;
  readonly frameCount: number;
  readonly id: string;
  readonly maximumCornerAlpha: number;
  readonly path: string;
  readonly sha256: string;
}

export interface NinjaOneCapitalCityRasterAsset {
  readonly dimensions: Pair;
  readonly path: string;
  readonly sha256: string;
}

export interface NinjaOneCapitalCityStation extends NinjaOneCapitalCityRasterAsset {
  readonly anchor: Pair;
  readonly displayWidth: number;
  readonly groundAnchor: Pair;
  readonly id: string;
}

export interface NinjaOneCapitalCityNode {
  readonly anchor: Pair;
  readonly assetNodeReady: boolean;
  readonly displayWidth: number;
  readonly durationMs: number;
  readonly elevationBand: number;
  readonly footprintFraction: Pair;
  readonly frameCount: number;
  readonly groundAnchor: Pair;
  readonly integrationBlockers: readonly string[];
  readonly label: string;
  readonly layoutDistrictId: string;
  readonly posterPath: string;
  readonly posterSha256: string;
  readonly productionState: NinjaOneCapitalCityNodeProductionState;
  readonly provisionalSkill: boolean;
  readonly renderLayers: readonly NinjaOneCapitalCityNodeLayer[];
  readonly renderMode: NinjaOneCapitalCityNodeRenderMode;
  readonly revision: string | null;
  readonly skillId: string;
  readonly slotId: string;
  readonly sourceDimensions: Pair;
  readonly zBias: number;
}

interface RawPairRecord {
  readonly x?: unknown;
  readonly y?: unknown;
  readonly width?: unknown;
  readonly depth?: unknown;
}

const PRODUCTION_STATES = new Set<NinjaOneCapitalCityNodeProductionState>([
  "animation-pending",
  "independent-go-metadata-pending",
  "provisional-static",
  "review",
  "selected",
  "selected-alpha-blocked",
]);

const RENDER_MODES = new Set<NinjaOneCapitalCityNodeRenderMode>([
  "animated-master",
  "semantic-layers",
  "static",
]);

function finitePair(values: readonly unknown[], label: string): Pair {
  if (
    values.length !== 2
    || values.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new TypeError(`${label} must contain two finite numbers.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function finiteRecordPair(
  value: RawPairRecord,
  keys: readonly ["x", "y"] | readonly ["width", "depth"],
  label: string,
): Pair {
  return finitePair(keys.map((key) => value[key]), label);
}

function publicAssetPath(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.startsWith("/career-world/")) {
    throw new TypeError(`${label} must be a Career World public asset path.`);
  }
  return value;
}

function parseLayer(
  raw: (typeof cityNodeManifest.nodes)[number]["renderLayers"][number],
  label: string,
): NinjaOneCapitalCityNodeLayer {
  return Object.freeze({
    dimensions: finitePair(raw.dimensions, `${label}.dimensions`),
    durationMs: raw.durationMs,
    frameCount: raw.frameCount,
    id: raw.id,
    maximumCornerAlpha: raw.maximumCornerAlpha,
    path: publicAssetPath(raw.path, `${label}.path`),
    sha256: raw.sha256,
  });
}

function parseRasterAsset(
  raw: { readonly dimensions: readonly number[]; readonly path: string; readonly sha256: string },
  label: string,
): NinjaOneCapitalCityRasterAsset {
  return Object.freeze({
    dimensions: finitePair(raw.dimensions, `${label}.dimensions`),
    path: publicAssetPath(raw.path, `${label}.path`),
    sha256: raw.sha256,
  });
}

export const NINJAONE_CAPITAL_CITY_ARTBOARD = finitePair(
  cityNodeManifest.artboard.dimensions,
  "artboard.dimensions",
);
export const NINJAONE_CAPITAL_CITY_WORLD_ORIGIN = finitePair(
  cityNodeManifest.artboard.worldOrigin,
  "artboard.worldOrigin",
);
export const NINJAONE_CAPITAL_CITY_WORLD_SPAN = finitePair(
  cityNodeManifest.artboard.worldSpan,
  "artboard.worldSpan",
);

function parseNode(
  raw: (typeof cityNodeManifest.nodes)[number],
  index: number,
): NinjaOneCapitalCityNode {
  const label = `nodes[${index}]`;
  if (!PRODUCTION_STATES.has(raw.productionState as NinjaOneCapitalCityNodeProductionState)) {
    throw new TypeError(`${label}.productionState is unsupported.`);
  }
  if (!RENDER_MODES.has(raw.renderMode as NinjaOneCapitalCityNodeRenderMode)) {
    throw new TypeError(`${label}.renderMode is unsupported.`);
  }
  const localPosition = finiteRecordPair(raw.localPosition, ["x", "y"], `${label}.localPosition`);
  const renderLayers = Object.freeze(
    raw.renderLayers.map((layer, layerIndex) =>
      parseLayer(layer, `${label}.renderLayers[${layerIndex}]`)
    ),
  );
  if (renderLayers.length === 0) {
    throw new TypeError(`${label} must publish at least one render layer.`);
  }
  return Object.freeze({
    anchor: finitePair([
      localPosition[0] * NINJAONE_CAPITAL_CITY_ARTBOARD[0],
      localPosition[1] * NINJAONE_CAPITAL_CITY_ARTBOARD[1],
    ], `${label}.anchor`),
    assetNodeReady: raw.assetNodeReady,
    displayWidth: raw.displayWidth,
    durationMs: raw.durationMs,
    elevationBand: raw.elevationBand,
    footprintFraction: finiteRecordPair(
      raw.footprintFraction,
      ["width", "depth"],
      `${label}.footprintFraction`,
    ),
    frameCount: raw.frameCount,
    groundAnchor: finitePair(raw.groundAnchor, `${label}.groundAnchor`),
    integrationBlockers: Object.freeze([...raw.integrationBlockers]),
    label: raw.label,
    layoutDistrictId: raw.layoutDistrictId,
    posterPath: publicAssetPath(raw.posterPath, `${label}.posterPath`),
    posterSha256: raw.posterSha256,
    productionState: raw.productionState as NinjaOneCapitalCityNodeProductionState,
    provisionalSkill: raw.provisionalSkill,
    renderLayers,
    renderMode: raw.renderMode as NinjaOneCapitalCityNodeRenderMode,
    revision: raw.revision,
    skillId: raw.skillId,
    slotId: raw.slotId,
    sourceDimensions: finitePair(raw.sourceDimensions, `${label}.sourceDimensions`),
    zBias: raw.zBias,
  });
}

if (
  cityNodeManifest.schemaVersion !== 1
  || cityNodeManifest.id !== "career-world/capitals/ninjaone/city-node-composition@r1"
  || cityNodeManifest.status !== "integration-preview"
  || cityNodeManifest.productionReady !== false
  || cityNodeManifest.runtimeEligible !== false
  || cityNodeManifest.nodes.length !== 19
  || cityNodeManifest.transport.station.independentAsset !== true
  || cityNodeManifest.transport.station.ownsTrack !== false
  || cityNodeManifest.transport.station.ownsTrain !== false
  || cityNodeManifest.transport.train.independentAsset !== true
  || cityNodeManifest.transport.train.bakedIntoCityPlate !== false
  || cityNodeManifest.transport.train.bakedIntoStation !== false
) {
  throw new TypeError("NinjaOne Capital city-node composition identity is invalid.");
}

export const NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER = Object.freeze([
  ...cityNodeManifest.layerOrder,
]);

export const NINJAONE_CAPITAL_CITY_NODES = Object.freeze(
  cityNodeManifest.nodes.map(parseNode),
);

if (new Set(NINJAONE_CAPITAL_CITY_NODES.map(({ skillId }) => skillId)).size !== 19) {
  throw new TypeError("NinjaOne Capital skill node IDs are not unique.");
}
if (NINJAONE_CAPITAL_CITY_NODES.some(({ assetNodeReady }) => !assetNodeReady)) {
  throw new TypeError("Every NinjaOne Capital skill building must own a renderable asset node.");
}

export const NINJAONE_CAPITAL_CITY_NODE_COUNT = NINJAONE_CAPITAL_CITY_NODES.length;
export const NINJAONE_CAPITAL_CITY_NODE_RUNTIME_ELIGIBLE = false;
export const NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS =
  cityNodeManifest.terrainBinding.status;

export const NINJAONE_CAPITAL_CITY_VISUAL_LAYERS = Object.freeze({
  environmentTransitionDetail: parseRasterAsset(
    cityNodeManifest.cityFabric.environmentTransitionDetail,
    "cityFabric.environmentTransitionDetail",
  ),
  foreground: parseRasterAsset(
    cityNodeManifest.cityFabric.foreground,
    "cityFabric.foreground",
  ),
  overviewSettlement: parseRasterAsset(
    cityNodeManifest.cityFabric.overviewSettlement,
    "cityFabric.overviewSettlement",
  ),
  populationSiteScaleCues: parseRasterAsset(
    cityNodeManifest.populationScaleCues.siteLayer,
    "populationScaleCues.siteLayer",
  ),
  populationCloseDetailCues: parseRasterAsset(
    cityNodeManifest.populationScaleCues.closeDetailLayer,
    "populationScaleCues.closeDetailLayer",
  ),
  railBed: parseRasterAsset(
    cityNodeManifest.transport.rail.bedLayer,
    "transport.rail.bedLayer",
  ),
  railSupport: parseRasterAsset(
    cityNodeManifest.transport.rail.supportLayer,
    "transport.rail.supportLayer",
  ),
  railTrack: parseRasterAsset(
    cityNodeManifest.transport.rail.trackLayer,
    "transport.rail.trackLayer",
  ),
  terrainContact: parseRasterAsset(
    cityNodeManifest.cityFabric.contactLayer,
    "cityFabric.contactLayer",
  ),
  underlay: parseRasterAsset(
    cityNodeManifest.cityFabric.underlay,
    "cityFabric.underlay",
  ),
});

const stationLocalPosition = finiteRecordPair(
  cityNodeManifest.transport.station.localPosition,
  ["x", "y"],
  "transport.station.localPosition",
);

export const NINJAONE_CAPITAL_CITY_STATION: NinjaOneCapitalCityStation = Object.freeze({
  ...parseRasterAsset(cityNodeManifest.transport.station, "transport.station"),
  anchor: finitePair([
    stationLocalPosition[0] * NINJAONE_CAPITAL_CITY_ARTBOARD[0],
    stationLocalPosition[1] * NINJAONE_CAPITAL_CITY_ARTBOARD[1],
  ], "transport.station.anchor"),
  displayWidth: cityNodeManifest.transport.station.displayWidth,
  groundAnchor: finitePair(
    cityNodeManifest.transport.station.groundAnchor,
    "transport.station.groundAnchor",
  ),
  id: cityNodeManifest.transport.station.id,
});

export const NINJAONE_CAPITAL_CITY_RAIL_EXIT = Object.freeze({
  direction: cityNodeManifest.transport.rail.exitDirection,
  entryDirection: cityNodeManifest.transport.rail.entryDirection,
  offCapitalEntry: cityNodeManifest.transport.rail.offCapitalEntry,
  offCapitalEndpoint: cityNodeManifest.transport.rail.offCapitalEndpoint,
  terminatesAtBuilding: cityNodeManifest.transport.rail.terminatesAtBuilding,
});

export const NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT =
  cityNodeManifest.populationScaleCues.cues.length;
export const NINJAONE_CAPITAL_CITY_POPULATION_SITE_CUE_COUNT =
  cityNodeManifest.populationScaleCues.cues.filter(
    ({ minimumDetailTier }) => minimumDetailTier === "site",
  ).length;
export const NINJAONE_CAPITAL_CITY_POPULATION_CLOSE_DETAIL_CUE_COUNT =
  cityNodeManifest.populationScaleCues.cues.filter(
    ({ minimumDetailTier }) => minimumDetailTier === "close",
  ).length;

export const NINJAONE_CAPITAL_CITY_CAMERA: CameraView = Object.freeze({
  origin: NINJAONE_CAPITAL_CITY_WORLD_ORIGIN,
  span: NINJAONE_CAPITAL_CITY_WORLD_SPAN,
});

function localCameraBounds(camera: CameraView): readonly [number, number, number, number] {
  const worldX = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_CITY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_CITY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_CITY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_CITY_ARTBOARD[1];
  const cameraX = camera.origin[0] * WORLD_PLANE.width;
  const cameraY = camera.origin[1] * WORLD_PLANE.height;
  const cameraWidth = camera.span[0] * WORLD_PLANE.width;
  const cameraHeight = camera.span[1] * WORLD_PLANE.height;
  return Object.freeze([
    (cameraX - worldX) / scaleX,
    (cameraY - worldY) / scaleY,
    (cameraX + cameraWidth - worldX) / scaleX,
    (cameraY + cameraHeight - worldY) / scaleY,
  ]);
}

export function ninjaOneCapitalVisibleCityNodes(
  camera: CameraView,
  detailTier: DetailTierId,
): readonly NinjaOneCapitalCityNode[] {
  if (
    detailTier !== "territory"
    && detailTier !== "capital"
    && detailTier !== "site"
    && detailTier !== "close"
  ) {
    return Object.freeze([]);
  }
  if (detailTier === "territory") {
    return Object.freeze([]);
  }
  if (detailTier === "capital") {
    return NINJAONE_CAPITAL_CITY_NODES;
  }
  const [left, top, right, bottom] = localCameraBounds(camera);
  const margin = detailTier === "close" ? 120 : 220;
  return Object.freeze(NINJAONE_CAPITAL_CITY_NODES.filter((node) => (
    node.anchor[0] + node.displayWidth >= left - margin
    && node.anchor[0] - node.displayWidth <= right + margin
    && node.anchor[1] + node.displayWidth >= top - margin
    && node.anchor[1] - node.displayWidth <= bottom + margin
  )));
}

export function ninjaOneCapitalAnimatedCityNodeId(
  camera: CameraView,
  detailTier: DetailTierId,
): string | null {
  if (detailTier !== "site" && detailTier !== "close") {
    return null;
  }
  const [left, top, right, bottom] = localCameraBounds(camera);
  const center: Pair = [(left + right) * 0.5, (top + bottom) * 0.5];
  const candidates = ninjaOneCapitalVisibleCityNodes(camera, detailTier).filter(
    (node) => node.assetNodeReady && node.renderMode === "animated-master",
  );
  return candidates.reduce<NinjaOneCapitalCityNode | null>((closest, node) => {
    if (!closest) {
      return node;
    }
    const nodeDistance = Math.hypot(node.anchor[0] - center[0], node.anchor[1] - center[1]);
    const closestDistance = Math.hypot(
      closest.anchor[0] - center[0],
      closest.anchor[1] - center[1],
    );
    return nodeDistance < closestDistance ? node : closest;
  }, null)?.skillId ?? null;
}
