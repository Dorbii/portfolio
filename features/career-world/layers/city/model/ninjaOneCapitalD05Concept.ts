import registration from "../../../../../public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r3.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";

const PLATE_PATH = "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-r1.png";
const CANON_ROOT = "/career-world/capitals/ninjaone/city-v2/canon";
const USABLE_MASK_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r3.png";
const REGISTRATION_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r3.json";
const PROVENANCE_PATH =
  `${CANON_ROOT}/d05-canon-r1.provenance.json`;
const FOLIAGE_SHIMMER_MASK_PATH =
  `${CANON_ROOT}/d05-canon-foliage-shimmer-mask-r2.png`;

export type NinjaOneCapitalD05ConceptTier = "capital" | "site" | "close";

export interface NinjaOneCapitalD05ConceptAnchor {
  readonly id: string;
  readonly label: string;
  readonly masterPoint: Pair;
}

const TIERS = Object.freeze({
  capital: Object.freeze({
    id: "capital",
    path: `${CANON_ROOT}/d05-canon-capital-r1.png`,
    dimensions: Object.freeze([1305, 1205] as Pair),
    sha256: "84ebf439c506a694436a5dc3a3d02f63bb513ca631be3ea0dd4c41390db7b81d",
  }),
  site: Object.freeze({
    id: "site",
    path: `${CANON_ROOT}/d05-canon-intermediate-r1.png`,
    dimensions: Object.freeze([2610, 2410] as Pair),
    sha256: "199df38d01262d2d52ab5502d3026efcbf1424df2ba708e385860fd3f58b9233",
  }),
  close: Object.freeze({
    id: "close",
    path: `${CANON_ROOT}/d05-canon-r1.png`,
    dimensions: Object.freeze([2619, 2417] as Pair),
    sha256: "d5f43e19e0fdd0cd4e22a6822d4f2f4f685de3ea0bc9a2d0c3ece2153d57cab2",
  }),
});

export function ninjaOneCapitalD05ConceptTier(
  tier: NinjaOneCapitalD05ConceptTier,
) {
  return TIERS[tier];
}

export const NINJAONE_CAPITAL_D05_CONCEPT = Object.freeze({
  id: registration.id,
  masterBounds: Object.freeze([
    registration.destinationMasterBounds[0],
    registration.destinationMasterBounds[1],
    registration.destinationMasterBounds[2],
    registration.destinationMasterBounds[3],
  ] as const),
  tiers: TIERS,
  plate: Object.freeze({
    dimensions: Object.freeze([
      registration.plate.dimensions[0],
      registration.plate.dimensions[1],
    ] as Pair),
    path: PLATE_PATH,
    sha256: registration.plate.sha256,
  }),
  provenancePath: PROVENANCE_PATH,
  registrationPath: REGISTRATION_PATH,
  transform: Object.freeze({
    offset: Object.freeze([
      registration.candidateToMasterArtboardComposed.offset[0],
      registration.candidateToMasterArtboardComposed.offset[1],
    ] as Pair),
    scale: Object.freeze([
      registration.candidateToMasterArtboardComposed.scale[0],
      registration.candidateToMasterArtboardComposed.scale[1],
    ] as Pair),
  }),
  usableMask: Object.freeze({
    dimensions: Object.freeze([
      registration.mask.dimensions[0],
      registration.mask.dimensions[1],
    ] as Pair),
    path: USABLE_MASK_PATH,
    sha256: registration.mask.sha256,
  }),
  foliageShimmerMask: Object.freeze({
    dimensions: Object.freeze([1305, 1205] as Pair),
    path: FOLIAGE_SHIMMER_MASK_PATH,
  }),
});

export const NINJAONE_CAPITAL_D05_CONCEPT_ANCHORS:
readonly NinjaOneCapitalD05ConceptAnchor[] = Object.freeze(
  registration.anchors.map((anchor) => Object.freeze({
    id: anchor.id,
    label: anchor.name,
    masterPoint: Object.freeze([
      anchor.masterArtboardSpace.center[0],
      anchor.masterArtboardSpace.center[1],
    ] as Pair),
  })),
);
