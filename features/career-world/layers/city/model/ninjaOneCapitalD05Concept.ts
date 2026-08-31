import registration from "../../../../../public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r4.json" with { type: "json" };
import waterEffects from "../../../../../public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-water-effects-runtime-r5.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import {
  normalizeWaterTuning,
  readWaterTuningUrlOverrides,
} from "../../../shared/waterTuning.ts";

const PLATE_PATH = "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-r1.png";
const CANON_ROOT = "/career-world/capitals/ninjaone/city-v2/canon";
const USABLE_MASK_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r4.png";
const REGISTRATION_PATH =
  "/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r4.json";
const PROVENANCE_PATH =
  `${CANON_ROOT}/d05-canon-r4.provenance.json`;
const FOLIAGE_SHIMMER_MASK_PATH =
  `${CANON_ROOT}/d05-canon-foliage-shimmer-mask-r4.png`;

export type NinjaOneCapitalD05ConceptTier = "territoryRegister" | "capital" | "site" | "close";

export interface NinjaOneCapitalD05ConceptAnchor {
  readonly id: string;
  readonly label: string;
  readonly masterPoint: Pair;
}

const TIERS = Object.freeze({
  territoryRegister: Object.freeze({
    id: "territory-register",
    path: "/career-world/capitals/ninjaone/city-v2/derived/d05-territory-register-r1.png",
    dimensions: Object.freeze([1305, 1205] as Pair),
    sha256: "20760e651d8190b8b9d135621496558bf0d6a19ef292cd076cda6eaf48c04f01",
  }),
  capital: Object.freeze({
    id: "capital",
    path: `${CANON_ROOT}/d05-canon-capital-r4.png`,
    dimensions: Object.freeze([1305, 1205] as Pair),
    sha256: "5dd70a26ae325cdb2b1f026e3038df89e8e58ceb1eddaec13fc9d8d6c2ed16c0",
  }),
  site: Object.freeze({
    id: "site",
    path: `${CANON_ROOT}/d05-canon-intermediate-r4.png`,
    dimensions: Object.freeze([2610, 2410] as Pair),
    sha256: "8437bedb27bd9dc309f1d200f79445a4cd13ac87249703e8619ba3247199cb97",
  }),
  close: Object.freeze({
    id: "close",
    path: `${CANON_ROOT}/d05-canon-r4.png`,
    dimensions: Object.freeze([2621, 2419] as Pair),
    sha256: "89f802ed868738f915cc3195383923b1c3e1cc095ad18a9d895db9ddf4ac27ac",
  }),
});

// The owner-approved interactive floor presents the full canon at 1:1. The
// capital derivative must never be enlarged past its native width; the
// intermediate derivative occupies the remaining approach to that floor.
export const NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN = 0.0825;

// 0.0825 above is a bare span, so it only lands on 1:1 for one window width
// (about 1303px). On a wider viewport the same span magnifies the canon --
// roughly 1.5x at 1948px -- which is the softness seen when the camera is
// allowed past the art. Derive the floor from the live viewport instead.
//
// The capital envelope's world span is immutable at 0.25 (world-territories-r4,
// asserted by test) and the master artboard is 1448 wide.
const MASTER_ARTBOARD_WIDTH = 1448;
const CAPITAL_ENVELOPE_WORLD_SPAN_X = 0.25;
const D05_CANON_WORLD_SPAN_X =
  (registration.destinationMasterBounds[2]
    - registration.destinationMasterBounds[0])
  / MASTER_ARTBOARD_WIDTH
  * CAPITAL_ENVELOPE_WORLD_SPAN_X;

/**
 * Smallest camera span that still shows the D05 canon at or below 1:1 for a
 * viewport of `viewportWidth` CSS pixels. Zooming past this only enlarges
 * pixels no source resolves.
 */
export function resolveD05CanonOneToOneMinimumSpan(
  viewportWidth: number,
): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN;
  }
  return Math.min(
    1,
    viewportWidth * D05_CANON_WORLD_SPAN_X / TIERS.close.dimensions[0],
  );
}

export const NINJAONE_CAPITAL_D05_CONCEPT_TIER_MAXIMUM_SPANS = Object.freeze({
  capital:
    NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN
    * TIERS.close.dimensions[0] / TIERS.capital.dimensions[0],
  close: NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN,
  site: NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN,
});

export function ninjaOneCapitalD05ConceptTier(
  tier: NinjaOneCapitalD05ConceptTier,
) {
  return TIERS[tier];
}

export function ninjaOneCapitalD05ConceptTierForSpan(span: number) {
  if (span <= NINJAONE_CAPITAL_D05_CONCEPT_TIER_MAXIMUM_SPANS.close) {
    return TIERS.close;
  }
  if (span <= NINJAONE_CAPITAL_D05_CONCEPT_TIER_MAXIMUM_SPANS.capital) {
    return TIERS.site;
  }
  return TIERS.capital;
}

export function ninjaOneCapitalD05ConceptTierWeights({
  capitalToSite,
  siteToClose,
}: {
  readonly capitalToSite: number;
  readonly siteToClose: number;
}) {
  return Object.freeze([
    Object.freeze({ opacity: 1 - capitalToSite, tier: TIERS.capital }),
    Object.freeze({ opacity: capitalToSite * (1 - siteToClose), tier: TIERS.site }),
    Object.freeze({ opacity: capitalToSite * siteToClose, tier: TIERS.close }),
  ].filter(({ opacity }) => opacity > 0));
}

export function ninjaOneCapitalD05WaterEffectTuning(search = "") {
  const tuning = normalizeWaterTuning(readWaterTuningUrlOverrides(search));
  return Object.freeze({
    cityWaterOpacity: tuning.cityWaterOpacity,
    cityWaterShoreRamp: tuning.cityWaterShoreRamp,
    sparkle: tuning.effectSparkle,
    foam: tuning.foam,
    crest: tuning.crest,
    cycling: tuning.cycling,
    relight: tuning.relight,
    swell: tuning.swell,
  });
}

export type NinjaOneCapitalD05WaterEffectTuning = ReturnType<
  typeof ninjaOneCapitalD05WaterEffectTuning
>;

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
  waterEffects: Object.freeze({
    // The registered D05 logical extent stays at the plate dimensions, while
    // the composite keeps a full-canon backing store for a crisp SVG overlay.
    dimensions: TIERS.close.dimensions,
    fieldDimensions: Object.freeze([1305, 1205] as Pair),
    sourcePath: `${CANON_ROOT}/d05-canon-r4.png`,
    waterMaskPath: waterEffects.waterMaskPath,
    sparkle: Object.freeze({
      maskPath: waterEffects.sparkle.maskPath,
      phaseFieldPath: waterEffects.sparkle.phaseFieldPath,
      // Compatibility aliases keep the r1 SVG definitions inert while r2 owns
      // the actual local canvas composite.
      frames: Object.freeze([waterEffects.sparkle.maskPath]),
      loopSeconds: 1,
    }),
    foam: Object.freeze({
      maskPath: waterEffects.foam.maskPath,
      shoreSdfPath: waterEffects.foam.shoreSdfPath,
    }),
    foamMaskPath: waterEffects.foam.maskPath,
    crest: Object.freeze({
      maskPath: waterEffects.crest.maskPath,
      directionFieldPath: waterEffects.crest.directionFieldPath,
      pseudoNormalFieldPath: waterEffects.crest.pseudoNormalFieldPath,
      rampLutPath: waterEffects.crest.rampLutPath,
      travelDirection: Object.freeze([
        waterEffects.crest.travelDirection[0],
        waterEffects.crest.travelDirection[1],
      ] as Pair),
      wavePhaseFieldPath: waterEffects.crest.wavePhaseFieldPath,
    }),
    provenancePath: waterEffects.provenancePath,
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
