import type { Pair } from "../../../shared/camera";
import semanticManifest from "../../../../../public/career-world/layers/structures/manifests/kaizen-semantic-assets-r1.json" with { type: "json" };

export const KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC =
  semanticManifest.sourcePlate;

export const KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC =
  semanticManifest.closePlate;

export const KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS = Object.freeze([
  semanticManifest.plateDimensions[0],
  semanticManifest.plateDimensions[1],
] as Pair);

export const KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS = Object.freeze([
  semanticManifest.closePlateDimensions[0],
  semanticManifest.closePlateDimensions[1],
] as Pair);

export type KaizenNeighborhoodModuleLod = "site" | "close";

export type KaizenNeighborhoodModuleKind =
  | "city-foundation"
  | "city-foundation-refinement";

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

export const KAIZEN_NEIGHBORHOOD_ANCHOR = Object.freeze([
  semanticManifest.plateAnchor[0],
  semanticManifest.plateAnchor[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_SPAN = Object.freeze([
  semanticManifest.plateSpan[0],
  semanticManifest.plateSpan[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y =
  semanticManifest.plateAlignmentY;
const KAIZEN_NEIGHBORHOOD_BLOCK_ID = "kaizen-agent-city-foundation";

export const KAIZEN_NEIGHBORHOOD_MODULES:
readonly KaizenNeighborhoodModule[] = Object.freeze([
  Object.freeze({
    anchor: KAIZEN_NEIGHBORHOOD_ANCHOR,
    assetPath: KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
    blockId: KAIZEN_NEIGHBORHOOD_BLOCK_ID,
    crop: Object.freeze([
      0,
      0,
      KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS[0],
      KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS[1],
    ] as const),
    id: "kaizen-city-foundation",
    kind: "city-foundation",
    lod: "site",
    sourceDimensions: KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS,
    span: KAIZEN_NEIGHBORHOOD_SPAN,
  }),
  Object.freeze({
    anchor: KAIZEN_NEIGHBORHOOD_ANCHOR,
    assetPath: KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC,
    blockId: KAIZEN_NEIGHBORHOOD_BLOCK_ID,
    crop: Object.freeze([
      0,
      0,
      KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS[0],
      KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS[1],
    ] as const),
    id: "kaizen-city-foundation-close",
    kind: "city-foundation-refinement",
    lod: "close",
    sourceDimensions: KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS,
    span: KAIZEN_NEIGHBORHOOD_SPAN,
  }),
]);
