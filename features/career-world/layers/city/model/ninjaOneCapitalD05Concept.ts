import registration from "../../../../../public/career-world/capitals/ninjaone/city-v2/plates/d05-shore-a-registration-r3.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";

const PLATE_PATH = "/career-world/capitals/ninjaone/city-v2/plates/d05-shore-bright-r1.png";
const USABLE_MASK_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-shore-bright-usable-mask-r3.png";
const REGISTRATION_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-shore-a-registration-r3.json";
const PROVENANCE_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-shore-bright-r1.provenance.json";

export interface NinjaOneCapitalD05ConceptAnchor {
  readonly id: string;
  readonly label: string;
  readonly masterPoint: Pair;
}

export const NINJAONE_CAPITAL_D05_CONCEPT = Object.freeze({
  id: registration.id,
  masterBounds: Object.freeze([
    registration.destinationMasterBounds[0],
    registration.destinationMasterBounds[1],
    registration.destinationMasterBounds[2],
    registration.destinationMasterBounds[3],
  ] as const),
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
