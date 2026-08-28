import registration from "../../../../../public/career-world/capitals/ninjaone/city-v2/plates/d06-i16-registration-r10.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";

const CANON_ROOT = "/career-world/capitals/ninjaone/city-v2/canon";

export type NinjaOneCapitalD06CanonTier = "territoryRegister" | "capital" | "site" | "close";

const tiers = Object.freeze({
  territoryRegister: Object.freeze({
    id: "territory-register" as const,
    path: "/career-world/capitals/ninjaone/city-v2/derived/d06-territory-register-r1.png",
    dimensions: Object.freeze([1063, 413] as Pair),
    sha256: "ab59287bc3f894baecaf42eab4d6d5e20be6d1ab1722b65d8c15fdea618f22ad",
  }),
  capital: Object.freeze({
    id: "capital" as const,
    path: `${CANON_ROOT}/d06-canon-capital-r10.png`,
    dimensions: Object.freeze([1063, 413] as Pair),
  }),
  site: Object.freeze({
    id: "site" as const,
    path: `${CANON_ROOT}/d06-canon-intermediate-r10.png`,
    dimensions: Object.freeze([2126, 826] as Pair),
  }),
  close: Object.freeze({
    id: "close" as const,
    path: `${CANON_ROOT}/d06-canon-r10.png`,
    dimensions: Object.freeze([2135, 830] as Pair),
  }),
});

// Matches the D05 pyramid policy: the close source owns the one-to-one floor;
// the site derivative is the approach tier and capital is the half-resolution tier.
export const NINJAONE_CAPITAL_D06_CANON_ONE_TO_ONE_MAXIMUM_SPAN = 0.0825;

export function ninjaOneCapitalD06CanonTierForSpan(span: number) {
  if (span <= NINJAONE_CAPITAL_D06_CANON_ONE_TO_ONE_MAXIMUM_SPAN) return tiers.close;
  if (span <= NINJAONE_CAPITAL_D06_CANON_ONE_TO_ONE_MAXIMUM_SPAN * 2) return tiers.site;
  return tiers.capital;
}

export function ninjaOneCapitalD06CanonTierWeights({
  capitalToSite,
  siteToClose,
}: {
  readonly capitalToSite: number;
  readonly siteToClose: number;
}) {
  return Object.freeze([
    Object.freeze({ opacity: 1 - capitalToSite, tier: tiers.capital }),
    Object.freeze({ opacity: capitalToSite * (1 - siteToClose), tier: tiers.site }),
    Object.freeze({ opacity: capitalToSite * siteToClose, tier: tiers.close }),
  ].filter(({ opacity }) => opacity > 0));
}

export const NINJAONE_CAPITAL_D06_CANON = Object.freeze({
  id: registration.id,
  masterBounds: Object.freeze([...registration.destinationMasterBounds] as Pair & readonly [number, number, number, number]),
  tiers,
  usableMask: Object.freeze({
    path: registration.mask.path,
    dimensions: Object.freeze([registration.mask.dimensions[0], registration.mask.dimensions[1]] as Pair),
    sha256: registration.mask.sha256,
  }),
  paintedWaterMask: Object.freeze({
    path: registration.paintedWaterMask.path,
    sha256: registration.paintedWaterMask.sha256,
  }),
  spriteOverlayRegistration: Object.freeze({
    path: registration.spriteOverlayRegistration.path,
    sha256: registration.spriteOverlayRegistration.sha256,
  }),
  structureOverlayRegistration: Object.freeze({
    path: registration.structureOverlayRegistration.path,
    sha256: registration.structureOverlayRegistration.sha256,
    status: registration.structureOverlayRegistration.status,
  }),
});
