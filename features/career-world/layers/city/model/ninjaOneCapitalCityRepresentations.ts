import representationManifest from "../../../../../public/career-world/capitals/ninjaone/manifests/city-lod-representations-r1.json" with { type: "json" };
import {
  constrainCameraViewToBounds,
  WORLD_CAMERA_VIEW,
  type CameraView,
  type Pair,
} from "../../../shared/camera.ts";
import {
  DETAIL_POLICY,
  resolveDetailState,
  type DetailState,
  type DetailTierId,
} from "../../../shared/lod/policy.ts";
import {
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
} from "../../terrain/model/ninjaOneEnvironmentProof.ts";

export type NinjaOneCapitalCityDistrictId = "D01" | "D02" | "D03" | "D04" | "D05";

export type NinjaOneCapitalCityRepresentationMode =
  | "capital-incremental-context"
  | "d01-close-composite"
  | "d01-site-composite"
  | "d02-close-composite"
  | "d02-site-composite"
  | "d03-close-composite"
  | "d03-site-composite"
  | "d04-close-composite"
  | "d04-site-composite"
  | "d05-close-composite"
  | "d05-site-composite"
  | "territory-proxy"
  | "world-marker";

export type NinjaOneCapitalCityProofViewId =
  | "capital"
  | "d01-close"
  | "d01-site"
  | "d02-close"
  | "d02-site"
  | "d03-close"
  | "d03-site"
  | "d04-close"
  | "d04-site"
  | "d05-close"
  | "d05-site"
  | "territory"
  | "world";

const TERRITORY_REGISTER_REPRESENTATION_POLICY =
  "world-marker-territory-symbolic-register-capital-semantic-handoff-district-exclusive-incremental-migration";

interface ProxyDelivery {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly encodedBytes: number;
  readonly path: string;
  readonly sha256: string;
}

interface WholeCityProxyRepresentation {
  readonly deliveries: {
    readonly context: ProxyDelivery;
    readonly territory: ProxyDelivery;
  };
  readonly id: "P01";
  readonly label: string;
  readonly presentation: {
    readonly contextIntent: string;
    readonly contextOpacity: number;
    readonly territoryIntent: string;
    readonly territoryOpacity: number;
    readonly territoryScale: number;
    readonly territoryScaleAnchor: Pair;
  };
  readonly registration: {
    readonly artboard: Pair;
    readonly bounds: {
      readonly height: number;
      readonly left: number;
      readonly top: number;
      readonly width: number;
    };
    readonly method: string;
  };
  readonly replacedDistricts: readonly {
    readonly districtId: NinjaOneCapitalCityDistrictId;
    readonly exclusionMask: string;
    readonly maskBounds: {
      readonly height: number;
      readonly left: number;
      readonly top: number;
      readonly width: number;
    };
    readonly replacementByTier: Readonly<Record<"capital" | "close" | "site", string>>;
  }[];
  readonly representationClass: "whole-city-proxy";
  readonly source: {
    readonly dimensions: Pair;
    readonly fullAlphaPath: string;
    readonly path: string;
    readonly sha256: string;
  };
  readonly tier: "territory";
}

function pair(value: readonly number[], label: string): Pair {
  if (value.length !== 2 || value.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError(`${label} must contain two finite numbers.`);
  }
  return Object.freeze([value[0], value[1]] as Pair);
}

function delivery(
  value: Omit<ProxyDelivery, "dimensions"> & { readonly dimensions: readonly number[] },
  label: string,
): ProxyDelivery {
  return Object.freeze({
    ...value,
    dimensions: pair(value.dimensions, `${label}.dimensions`),
  });
}

const rawProxy = representationManifest.representations[0] as unknown as Omit<
  WholeCityProxyRepresentation,
  "deliveries" | "registration" | "source"
> & {
  readonly deliveries: {
    readonly context: Omit<ProxyDelivery, "dimensions"> & { readonly dimensions: readonly number[] };
    readonly territory: Omit<ProxyDelivery, "dimensions"> & { readonly dimensions: readonly number[] };
  };
  readonly registration: Omit<WholeCityProxyRepresentation["registration"], "artboard"> & {
    readonly artboard: readonly number[];
  };
  readonly source: Omit<WholeCityProxyRepresentation["source"], "dimensions"> & {
    readonly dimensions: readonly number[];
  };
};

export const NINJAONE_CAPITAL_CITY_REPRESENTATION_AUTHORITY_ID =
  representationManifest.id;
export const NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY:
WholeCityProxyRepresentation = Object.freeze({
  ...rawProxy,
  deliveries: Object.freeze({
    context: delivery(rawProxy.deliveries.context, "P01.context"),
    territory: delivery(rawProxy.deliveries.territory, "P01.territory"),
  }),
  registration: Object.freeze({
    ...rawProxy.registration,
    artboard: pair(rawProxy.registration.artboard, "P01.registration.artboard"),
    bounds: Object.freeze({ ...rawProxy.registration.bounds }),
  }),
  replacedDistricts: Object.freeze(rawProxy.replacedDistricts.map((district) => Object.freeze({
    ...district,
    maskBounds: Object.freeze({ ...district.maskBounds }),
    replacementByTier: Object.freeze({ ...district.replacementByTier }),
  }))),
  presentation: Object.freeze({
    ...rawProxy.presentation,
    territoryScaleAnchor: pair(
      rawProxy.presentation.territoryScaleAnchor,
      "P01.presentation.territoryScaleAnchor",
    ),
  }),
  source: Object.freeze({
    ...rawProxy.source,
    dimensions: pair(rawProxy.source.dimensions, "P01.source.dimensions"),
  }),
});

if (
  representationManifest.schemaVersion !== 1
  || representationManifest.status !== "runtime-awaiting-fixed-sequence-visual-acceptance"
  || representationManifest.authority.geographyOwnership !== "none"
  || representationManifest.authority.representationPolicy
    !== TERRITORY_REGISTER_REPRESENTATION_POLICY
  || representationManifest.authority.territoryRegister.representationClass
    !== "symbolic-register"
  || representationManifest.authority.territoryRegister.physicalScaleClaim !== false
  || representationManifest.authority.territoryRegister.canonHandoff.tier !== "capital"
  || representationManifest.authority.territoryRegister.canonHandoff.startsAtMaximumCameraSpan
    !== DETAIL_POLICY.tierMaximumSpan.capital
  || representationManifest.authority.territoryRegister.canonHandoff.completesAtMaximumCameraSpan
    !== DETAIL_POLICY.territoryToCapital.endSpan
  || representationManifest.representations.length !== 1
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.id !== "P01"
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.representationClass !== "whole-city-proxy"
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.registration.artboard.join(",") !== "1448,1086"
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.presentation.territoryScale <= 0
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.presentation.territoryScale >= 1
  || NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.replacedDistricts.length !== 0
) {
  throw new TypeError("NinjaOne Capital representation authority is invalid.");
}

const D01_PROOF_LOCAL_BOUNDS = Object.freeze({
  height: 520,
  left: 120,
  top: 0,
  width: 780,
});

const D01_SOCKET_SELECTION_LOCAL_BOUNDS = Object.freeze([
  Object.freeze({ height: 120, left: 435, top: 150, width: 120 }),
  Object.freeze({ height: 120, left: 602, top: 170, width: 120 }),
  Object.freeze({ height: 120, left: 705, top: 270, width: 120 }),
  Object.freeze({ height: 115, left: 480, top: 405, width: 120 }),
  Object.freeze({ height: 120, left: 290, top: 240, width: 120 }),
  Object.freeze({ height: 115, left: 647, top: 420, width: 120 }),
]);

const D02_SELECTION_LOCAL_BOUNDS = Object.freeze({
  height: 336,
  left: 1080,
  top: 120,
  width: 368,
});

const D02_PROOF_LOCAL_BOUNDS = Object.freeze({
  height: 260,
  left: 1240,
  top: 230,
  width: 208,
});

const D03_SELECTION_LOCAL_BOUNDS = Object.freeze({
  height: 629,
  left: 763,
  top: 252,
  width: 685,
});

const D03_PROOF_LOCAL_BOUNDS = Object.freeze({
  height: 400,
  left: 820,
  top: 360,
  width: 400,
});

const D04_PROOF_LOCAL_BOUNDS = Object.freeze({
  height: 480,
  left: 210,
  top: 360,
  width: 700,
});

const D04_SOCKET_SELECTION_LOCAL_BOUNDS = Object.freeze([
  Object.freeze({ height: 135, left: 185, top: 430, width: 130 }),
  Object.freeze({ height: 135, left: 345, top: 445, width: 105 }),
  Object.freeze({ height: 150, left: 720, top: 650, width: 130 }),
]);

const D05_SELECTION_LOCAL_BOUNDS = Object.freeze({
  height: 673,
  left: 0,
  top: 413,
  width: 691,
});

// The selectable district reaches the registered artboard edge, but centering the
// proof camera on that full footprint exposes the plane boundary at close LoD.
// Reframe the proof only; district ownership and node/world coordinates stay fixed.
const D05_PROOF_LOCAL_BOUNDS = Object.freeze({
  ...D05_SELECTION_LOCAL_BOUNDS,
  left: 135,
});

export const NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS = Object.freeze({
  "d01-close": 760,
  "d01-site": 1080,
  "d02-close": 560,
  "d02-site": 1080,
  "d03-close": 760,
  "d03-site": 1080,
  "d04-close": 760,
  "d04-site": 1080,
  "d05-close": 880,
  "d05-site": 1080,
});

function registeredDistrictParentCrop(
  localWidth: number,
  bounds: Readonly<{ height: number; left: number; top: number; width: number }>,
): CameraView {
  const localHeight = localWidth * 0.75;
  const localLeft = Math.min(
    1448 - localWidth,
    Math.max(0, bounds.left + bounds.width * 0.5 - localWidth * 0.5),
  );
  const localTop = Math.min(
    1086 - localHeight,
    Math.max(0, bounds.top + bounds.height * 0.5 - localHeight * 0.5),
  );
  return Object.freeze({
    origin: Object.freeze([
      NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0]
        + localLeft / 1448 * NINJAONE_ENVIRONMENT_WORLD_SPAN[0],
      NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1]
        + localTop / 1086 * NINJAONE_ENVIRONMENT_WORLD_SPAN[1],
    ] as Pair),
    span: Object.freeze([
      localWidth / 1448 * NINJAONE_ENVIRONMENT_WORLD_SPAN[0],
      localHeight / 1086 * NINJAONE_ENVIRONMENT_WORLD_SPAN[1],
    ] as Pair),
  });
}

export const NINJAONE_CAPITAL_CITY_PROOF_CAMERAS:
Readonly<Record<NinjaOneCapitalCityProofViewId, CameraView>> = Object.freeze({
  capital: Object.freeze({
    origin: NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
    span: NINJAONE_ENVIRONMENT_WORLD_SPAN,
  }),
  "d01-close": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d01-close"],
    D01_PROOF_LOCAL_BOUNDS,
  ),
  "d01-site": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d01-site"],
    D01_PROOF_LOCAL_BOUNDS,
  ),
  "d02-close": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d02-close"],
    D02_PROOF_LOCAL_BOUNDS,
  ),
  "d02-site": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d02-site"],
    D02_PROOF_LOCAL_BOUNDS,
  ),
  "d03-close": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d03-close"],
    D03_PROOF_LOCAL_BOUNDS,
  ),
  "d03-site": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d03-site"],
    D03_PROOF_LOCAL_BOUNDS,
  ),
  "d04-close": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d04-close"],
    D04_PROOF_LOCAL_BOUNDS,
  ),
  "d04-site": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d04-site"],
    D04_PROOF_LOCAL_BOUNDS,
  ),
  "d05-close": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d05-close"],
    D05_PROOF_LOCAL_BOUNDS,
  ),
  "d05-site": registeredDistrictParentCrop(
    NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS["d05-site"],
    D05_PROOF_LOCAL_BOUNDS,
  ),
  territory: Object.freeze({
    origin: Object.freeze([0, 0] as Pair),
    span: Object.freeze([0.72, 0.72] as Pair),
  }),
  world: WORLD_CAMERA_VIEW,
});

export const NINJAONE_CAPITAL_CITY_PROOF_TIERS:
Readonly<Record<NinjaOneCapitalCityProofViewId, DetailTierId>> = Object.freeze({
  capital: "capital",
  "d01-close": "close",
  "d01-site": "site",
  "d02-close": "close",
  "d02-site": "site",
  "d03-close": "close",
  "d03-site": "site",
  "d04-close": "close",
  "d04-site": "site",
  "d05-close": "close",
  "d05-site": "site",
  territory: "territory",
  world: "world",
});

export const NINJAONE_CAPITAL_CITY_DETAIL_POLICY = Object.freeze({
  closeAssetPreloadSpan: 0.06,
  siteAssetPreloadSpan: DETAIL_POLICY.siteAssetPreloadSpan,
  tierMaximumSpan: Object.freeze({
    capital: DETAIL_POLICY.tierMaximumSpan.capital,
    close: DETAIL_POLICY.tierMaximumSpan.close,
    site: DETAIL_POLICY.tierMaximumSpan.site,
  }),
  capitalToSite: DETAIL_POLICY.capitalToSite,
  siteToClose: DETAIL_POLICY.siteToClose,
});

// Territory is a symbolic register, not an architecture-bearing physical view.
// Start the semantic hand-off at the first capital-detail camera span and finish
// it before the existing territory-to-capital transition ends.
export const NINJAONE_CAPITAL_CITY_CANON_HANDOFF = Object.freeze({
  endSpan: DETAIL_POLICY.territoryToCapital.endSpan,
  startSpan: DETAIL_POLICY.tierMaximumSpan.capital,
});

function descendingSmoothstep(span: number, start: number, end: number): number {
  const amount = Math.min(1, Math.max(0, (start - span) / (start - end)));
  return amount * amount * (3 - 2 * amount);
}

export function ninjaOneCapitalCitySemanticHandoffWeights(span: number) {
  const canonOpacity = descendingSmoothstep(
    span,
    NINJAONE_CAPITAL_CITY_CANON_HANDOFF.startSpan,
    NINJAONE_CAPITAL_CITY_CANON_HANDOFF.endSpan,
  );
  return Object.freeze({
    canonOpacity,
    territoryRegisterOpacity: 1 - canonOpacity,
  });
}

function cameraIsCenteredInNinjaOneCapital(camera: CameraView): boolean {
  const centerX = camera.origin[0] + camera.span[0] * 0.5;
  const centerY = camera.origin[1] + camera.span[1] * 0.5;
  return centerX >= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0]
    && centerX <= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0] + NINJAONE_ENVIRONMENT_WORLD_SPAN[0]
    && centerY >= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1]
    && centerY <= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1] + NINJAONE_ENVIRONMENT_WORLD_SPAN[1];
}

export function resolveNinjaOneCapitalDetailState(
  camera: CameraView,
  requestedProofTier: DetailTierId | null = null,
): DetailState {
  const globalState = resolveDetailState(camera);
  const span = Math.max(...camera.span);
  const cameraTierId = cameraIsCenteredInNinjaOneCapital(camera)
    ? span <= NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close
      ? "close"
      : span <= NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.site
        ? "site"
        : span <= NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.capital
          ? "capital"
          : globalState.tier.id
    : globalState.tier.id;
  const tierId = requestedProofTier ?? cameraTierId;
  if (!cameraIsCenteredInNinjaOneCapital(camera) || tierId === "world" || tierId === "territory") {
    return globalState;
  }
  const capitalToSite = requestedProofTier
    ? tierId === "site" || tierId === "close" ? 1 : 0
    : descendingSmoothstep(
      span,
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.capitalToSite.startSpan,
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.capitalToSite.endSpan,
    );
  const siteToClose = requestedProofTier
    ? tierId === "close" ? 1 : 0
    : descendingSmoothstep(
      span,
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.siteToClose.startSpan,
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.siteToClose.endSpan,
    );
  return Object.freeze({
    ...globalState,
    tier: resolveDetailState(camera, tierId).tier,
    capitalToSite,
    siteToClose,
    renderScale:
      DETAIL_POLICY.renderScale.world
      + globalState.worldToTerritory * DETAIL_POLICY.renderScale.territoryGain
      + globalState.territoryToCapital * DETAIL_POLICY.renderScale.capitalGain
      + capitalToSite * DETAIL_POLICY.renderScale.siteGain
      + siteToClose * DETAIL_POLICY.renderScale.closeGain,
    shouldLoadSiteAssets:
      tierId === "site" || tierId === "close"
      || span <= NINJAONE_CAPITAL_CITY_DETAIL_POLICY.siteAssetPreloadSpan,
    shouldLoadCloseAssets:
      tierId === "close"
      || span <= NINJAONE_CAPITAL_CITY_DETAIL_POLICY.closeAssetPreloadSpan,
  });
}

const NINJAONE_ENVIRONMENT_CAMERA_BOUNDS: CameraView = Object.freeze({
  origin: NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  span: NINJAONE_ENVIRONMENT_WORLD_SPAN,
});

export function constrainNinjaOneCapitalCityProofCamera(
  viewId: NinjaOneCapitalCityProofViewId,
  candidate: CameraView,
): CameraView {
  const registered = NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[viewId];
  if (ninjaOneCapitalCityProofDistrict(viewId) === null) return registered;
  return constrainCameraViewToBounds(
    { origin: candidate.origin, span: registered.span },
    NINJAONE_ENVIRONMENT_CAMERA_BOUNDS,
  );
}

export function ninjaOneCapitalCityProofDistrict(
  viewId: NinjaOneCapitalCityProofViewId,
): NinjaOneCapitalCityDistrictId | null {
  if (viewId === "d01-site" || viewId === "d01-close") return "D01";
  if (viewId === "d02-site" || viewId === "d02-close") return "D02";
  if (viewId === "d03-site" || viewId === "d03-close") return "D03";
  if (viewId === "d04-site" || viewId === "d04-close") return "D04";
  if (viewId === "d05-site" || viewId === "d05-close") return "D05";
  return null;
}

export function ninjaOneCapitalCityFocusedDistrict(
  tier: DetailTierId,
  selectedDistrict: NinjaOneCapitalCityDistrictId | null = null,
  forcedDistrict: NinjaOneCapitalCityDistrictId | null = null,
): NinjaOneCapitalCityDistrictId | null {
  if (forcedDistrict) return forcedDistrict;
  if (tier !== "site" && tier !== "close") return null;
  return selectedDistrict;
}

export function ninjaOneCapitalCityUsesFreeCameraDetailCohort(
  tier: DetailTierId,
  focusedDistrict: NinjaOneCapitalCityDistrictId | null,
): boolean {
  return tier === "site" && focusedDistrict === null;
}

export function ninjaOneCapitalCityDistrictAtWorldPoint(
  worldPoint: Pair,
): NinjaOneCapitalCityDistrictId | null {
  const localX = (
    (worldPoint[0] - NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0])
    / NINJAONE_ENVIRONMENT_WORLD_SPAN[0]
  ) * 1448;
  const localY = (
    (worldPoint[1] - NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1])
    / NINJAONE_ENVIRONMENT_WORLD_SPAN[1]
  ) * 1086;
  const d02Right = D02_SELECTION_LOCAL_BOUNDS.left + D02_SELECTION_LOCAL_BOUNDS.width;
  const d02Bottom = D02_SELECTION_LOCAL_BOUNDS.top + D02_SELECTION_LOCAL_BOUNDS.height;
  if (localX >= D02_SELECTION_LOCAL_BOUNDS.left
    && localX <= d02Right
    && localY >= D02_SELECTION_LOCAL_BOUNDS.top
    && localY <= d02Bottom) return "D02";
  if (D01_SOCKET_SELECTION_LOCAL_BOUNDS.some((bounds) => (
    localX >= bounds.left
    && localX <= bounds.left + bounds.width
    && localY >= bounds.top
    && localY <= bounds.top + bounds.height
  ))) return "D01";
  if (D04_SOCKET_SELECTION_LOCAL_BOUNDS.some((bounds) => (
    localX >= bounds.left
    && localX <= bounds.left + bounds.width
    && localY >= bounds.top
    && localY <= bounds.top + bounds.height
  ))) return "D04";
  const d03Right = D03_SELECTION_LOCAL_BOUNDS.left + D03_SELECTION_LOCAL_BOUNDS.width;
  const d03Bottom = D03_SELECTION_LOCAL_BOUNDS.top + D03_SELECTION_LOCAL_BOUNDS.height;
  if (localX >= D03_SELECTION_LOCAL_BOUNDS.left
    && localX <= d03Right
    && localY >= D03_SELECTION_LOCAL_BOUNDS.top
    && localY <= d03Bottom) return "D03";
  const d05Right = D05_SELECTION_LOCAL_BOUNDS.left + D05_SELECTION_LOCAL_BOUNDS.width;
  const d05Bottom = D05_SELECTION_LOCAL_BOUNDS.top + D05_SELECTION_LOCAL_BOUNDS.height;
  return localX >= D05_SELECTION_LOCAL_BOUNDS.left
    && localX <= d05Right
    && localY >= D05_SELECTION_LOCAL_BOUNDS.top
    && localY <= d05Bottom
    ? "D05"
    : null;
}

export function ninjaOneCapitalCityRepresentationMode(
  tier: DetailTierId,
  focusedDistrict: NinjaOneCapitalCityDistrictId | null,
): NinjaOneCapitalCityRepresentationMode {
  if (tier === "world") return "world-marker";
  if (tier === "territory") return "world-marker";
  if (tier === "site" && focusedDistrict === "D01") return "d01-site-composite";
  if (tier === "close" && focusedDistrict === "D01") return "d01-close-composite";
  if (tier === "site" && focusedDistrict === "D02") return "d02-site-composite";
  if (tier === "close" && focusedDistrict === "D02") return "d02-close-composite";
  if (tier === "site" && focusedDistrict === "D03") return "d03-site-composite";
  if (tier === "close" && focusedDistrict === "D03") return "d03-close-composite";
  if (tier === "site" && focusedDistrict === "D04") return "d04-site-composite";
  if (tier === "close" && focusedDistrict === "D04") return "d04-close-composite";
  if (tier === "site" && focusedDistrict === "D05") return "d05-site-composite";
  if (tier === "close" && focusedDistrict === "D05") return "d05-close-composite";
  return "capital-incremental-context";
}
