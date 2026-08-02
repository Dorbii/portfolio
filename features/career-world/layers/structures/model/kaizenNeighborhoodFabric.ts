import type { Pair } from "../../../shared/camera";

export const KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC =
  "/career-world/layers/structures/textures/ambient/kaizen-agent/"
  + "kaizen-city-foundation-r1.png";

export const KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC =
  "/career-world/layers/structures/textures/ambient/kaizen-agent/"
  + "kaizen-city-foundation-close-r3.webp";

export const KAIZEN_NEIGHBORHOOD_DETAIL_ATLAS_SRC =
  "/career-world/layers/structures/textures/ambient/kaizen-agent/"
  + "heroic-neighborhood-detail-atlas-r4.png";

export const KAIZEN_NEIGHBORHOOD_ATLAS_DIMENSIONS = Object.freeze([
  1254,
  1254,
] as Pair);

export const KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS = Object.freeze([
  5016,
  5016,
] as Pair);

export const KAIZEN_NEIGHBORHOOD_MODULE_LODS = [
  "site",
  "close",
] as const;

export type KaizenNeighborhoodModuleLod =
  typeof KAIZEN_NEIGHBORHOOD_MODULE_LODS[number];

export const KAIZEN_NEIGHBORHOOD_MODULE_KINDS = [
  "city-foundation",
  "city-foundation-refinement",
  "townhouse-frontage",
  "corner-frontage",
  "artisan-strip",
  "tavern-frontage",
  "market-stalls",
  "service-yard",
  "civic-garden",
  "fountain-node",
  "retaining-stair",
  "street-connector",
  "rail-service",
  "residential-courtyard",
] as const;

export type KaizenNeighborhoodModuleKind =
  typeof KAIZEN_NEIGHBORHOOD_MODULE_KINDS[number];

export interface KaizenNeighborhoodModule {
  readonly anchor: Pair;
  readonly assetPath: string;
  readonly blockId: string;
  readonly crop: readonly [number, number, number, number];
  readonly id: string;
  readonly kind: KaizenNeighborhoodModuleKind;
  readonly lod: KaizenNeighborhoodModuleLod;
  readonly sourceDimensions: Pair;
  readonly span: Pair;
}

const DETAIL_CROPS = Object.freeze({
  "townhouse-frontage": Object.freeze([0, 0, 314, 418] as const),
  "corner-frontage": Object.freeze([314, 0, 313, 418] as const),
  "artisan-strip": Object.freeze([627, 0, 314, 418] as const),
  "tavern-frontage": Object.freeze([941, 0, 313, 418] as const),
  "market-stalls": Object.freeze([0, 418, 314, 418] as const),
  "service-yard": Object.freeze([314, 418, 313, 418] as const),
  "civic-garden": Object.freeze([627, 418, 314, 418] as const),
  "fountain-node": Object.freeze([941, 418, 313, 418] as const),
  "retaining-stair": Object.freeze([0, 836, 314, 418] as const),
  "street-connector": Object.freeze([314, 836, 313, 418] as const),
  "rail-service": Object.freeze([627, 836, 314, 418] as const),
  "residential-courtyard": Object.freeze([941, 836, 313, 418] as const),
});

function foundationModule(): KaizenNeighborhoodModule {
  return Object.freeze({
    anchor: Object.freeze([0.228, 0.308] as Pair),
    assetPath: KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
    blockId: "kaizen-agent-city-foundation",
    crop: Object.freeze([0, 0, 1254, 1254] as const),
    id: "kaizen-city-foundation",
    kind: "city-foundation",
    lod: "site",
    sourceDimensions: KAIZEN_NEIGHBORHOOD_ATLAS_DIMENSIONS,
    span: Object.freeze([0.1065, 0.1893] as Pair),
  });
}

function closeFoundationModule(): KaizenNeighborhoodModule {
  return Object.freeze({
    anchor: Object.freeze([0.228, 0.308] as Pair),
    assetPath: KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC,
    blockId: "kaizen-agent-city-foundation",
    crop: Object.freeze([0, 0, 5016, 5016] as const),
    id: "kaizen-city-foundation-close",
    kind: "city-foundation-refinement",
    lod: "close",
    sourceDimensions: KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS,
    span: Object.freeze([0.1065, 0.1893] as Pair),
  });
}

function detailModule(
  id: string,
  blockId: string,
  kind: keyof typeof DETAIL_CROPS,
  anchor: Pair,
  span: Pair = [0.0125, 0.022],
): KaizenNeighborhoodModule {
  return Object.freeze({
    anchor: Object.freeze(anchor),
    assetPath: KAIZEN_NEIGHBORHOOD_DETAIL_ATLAS_SRC,
    blockId,
    crop: DETAIL_CROPS[kind],
    id,
    kind,
    lod: "close",
    sourceDimensions: KAIZEN_NEIGHBORHOOD_ATLAS_DIMENSIONS,
    span: Object.freeze(span),
  });
}

export const KAIZEN_NEIGHBORHOOD_MODULES:
readonly KaizenNeighborhoodModule[] = Object.freeze([
  foundationModule(),
  closeFoundationModule(),
  detailModule(
    "kaizen-foundry-rail-service",
    "kaizen-agent-foundry-core",
    "rail-service",
    [0.204, 0.152],
    [0.0155, 0.021],
  ),
  detailModule(
    "kaizen-foundry-west-frontage",
    "kaizen-agent-foundry-core",
    "townhouse-frontage",
    [0.217, 0.16],
  ),
  detailModule(
    "kaizen-foundry-east-artisans",
    "kaizen-agent-foundry-core",
    "artisan-strip",
    [0.22, 0.18],
  ),
  detailModule(
    "kaizen-foundry-service-yard",
    "kaizen-agent-foundry-core",
    "service-yard",
    [0.203, 0.175],
  ),
  detailModule(
    "kaizen-foundry-civic-garden",
    "kaizen-agent-foundry-core",
    "civic-garden",
    [0.208, 0.198],
  ),
  detailModule(
    "kaizen-project-fountain-node",
    "kaizen-agent-foundry-core",
    "fountain-node",
    [0.222, 0.203],
    [0.011, 0.018],
  ),
  detailModule(
    "kaizen-west-corner-frontage",
    "kaizen-agent-west-skill-block",
    "corner-frontage",
    [0.214, 0.243],
  ),
  detailModule(
    "kaizen-west-tavern-frontage",
    "kaizen-agent-west-skill-block",
    "tavern-frontage",
    [0.228, 0.252],
  ),
  detailModule(
    "kaizen-west-retaining-stair",
    "kaizen-agent-west-skill-block",
    "retaining-stair",
    [0.214, 0.27],
    [0.01, 0.019],
  ),
  detailModule(
    "kaizen-west-garden-court",
    "kaizen-agent-west-skill-block",
    "civic-garden",
    [0.232, 0.27],
    [0.011, 0.019],
  ),
  detailModule(
    "kaizen-east-townhouse-frontage",
    "kaizen-agent-east-skill-block",
    "townhouse-frontage",
    [0.252, 0.242],
  ),
  detailModule(
    "kaizen-east-artisan-frontage",
    "kaizen-agent-east-skill-block",
    "artisan-strip",
    [0.263, 0.251],
  ),
  detailModule(
    "kaizen-east-service-yard",
    "kaizen-agent-east-skill-block",
    "service-yard",
    [0.246, 0.271],
  ),
  detailModule(
    "kaizen-east-fountain-court",
    "kaizen-agent-east-skill-block",
    "fountain-node",
    [0.259, 0.271],
    [0.011, 0.018],
  ),
  detailModule(
    "kaizen-south-market-stalls",
    "kaizen-agent-south-service-block",
    "market-stalls",
    [0.225, 0.294],
  ),
  detailModule(
    "kaizen-south-residential-courtyard",
    "kaizen-agent-south-service-block",
    "residential-courtyard",
    [0.24, 0.31],
  ),
  detailModule(
    "kaizen-south-service-yard",
    "kaizen-agent-south-service-block",
    "service-yard",
    [0.258, 0.301],
  ),
  detailModule(
    "kaizen-south-east-frontage",
    "kaizen-agent-south-service-block",
    "townhouse-frontage",
    [0.267, 0.324],
  ),
  detailModule(
    "kaizen-south-garden",
    "kaizen-agent-south-service-block",
    "civic-garden",
    [0.22, 0.327],
    [0.011, 0.019],
  ),
  detailModule(
    "kaizen-south-street-connector",
    "kaizen-agent-south-service-block",
    "street-connector",
    [0.244, 0.326],
    [0.012, 0.017],
  ),
  detailModule(
    "kaizen-south-rail-service",
    "kaizen-agent-south-service-block",
    "rail-service",
    [0.259, 0.331],
    [0.012, 0.018],
  ),
]);
