import assetManifest from "../../../../../public/career-world/capitals/ninjaone/manifests/city-layer-assets-r2.json" with { type: "json" };
import compositionManifest from "../../../../../public/career-world/capitals/ninjaone/manifests/city-layer-composition-r2.json" with { type: "json" };
import layoutManifest from "../../../../../public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json" with { type: "json" };
import packageAuthority from "../../../../../public/career-world/capitals/ninjaone/manifests/city-package-authority-r4.json" with { type: "json" };
import type { CameraView, Pair } from "../../../shared/camera";
import {
  DETAIL_TIER_DEPTH,
  type DetailTierId,
} from "../../../shared/lod/policy.ts";
import { WORLD_PLANE } from "../../../shared/world.ts";
import {
  NINJAONE_ENVIRONMENT_PROOF_ID,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
} from "../../terrain/model/ninjaOneEnvironmentProof.ts";
import type { NinjaOneCapitalCityDistrictId } from "./ninjaOneCapitalCityRepresentations.ts";

export type CityLayerId =
  | "L4_0"
  | "L4_1"
  | "L4_2"
  | "L4_3"
  | "L4_4"
  | "L4_5"
  | "L4_6"
  | "L4_7";

type CityAssetTier = Extract<DetailTierId, "capital" | "site" | "close">;

export type NinjaOneCapitalCityNodeRepresentationClass =
  | "capital-district-composite"
  | "legacy-nonconforming-close-candidate"
  | "registered-close-overlay"
  | "registered-district-base"
  | "unregistered-close-candidate";

interface CityAssetVariant {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly encodedBytes: number;
  readonly path: string;
  readonly sha256: string;
}

interface CityAsset {
  readonly family: string;
  readonly id: string;
  readonly source: {
    readonly dimensions: Pair;
    readonly path: string;
    readonly sha256: string;
  };
  readonly variants: Partial<Record<CityAssetTier, CityAssetVariant>>;
}

type CityNodeBinding = {
  readonly anchor: Pair;
  readonly id: string;
  readonly kind:
    | "inferred-unverified-anchor"
    | "package-registered-anchor";
};

interface CityNodeSource {
  readonly assetId: string;
  readonly binding: CityNodeBinding;
  readonly districtId?: NinjaOneCapitalCityDistrictId;
  readonly displayWidth: number;
  readonly footprintFraction: Pair;
  readonly id: string;
  readonly label: string;
  readonly layerId: CityLayerId;
  readonly minimumTier: CityAssetTier;
  readonly motion?: "rail-eastbound";
  readonly representationClass: NinjaOneCapitalCityNodeRepresentationClass;
  readonly role?: "landmark" | "skill";
  readonly visibleTiers?: readonly CityAssetTier[];
  readonly zBias: number;
}

interface MasterLayoutNode {
  readonly anchor: Pair;
  readonly assetId: string;
  readonly displayWidth: number;
  readonly id: string;
  readonly layerId: CityLayerId;
  readonly minimumTier: CityAssetTier;
  readonly motion?: "rail-eastbound";
  readonly role?: "landmark" | "skill";
  readonly visibleTiers?: readonly CityAssetTier[];
  readonly zBias: number;
}

export interface NinjaOneCapitalCityCirculationPath {
  readonly id: string;
  readonly kind: "bridge-approach" | "concourse" | "spine" | "terrace";
  readonly points: readonly Pair[];
  readonly width: number;
}

export interface NinjaOneCapitalCityLayerDefinition {
  readonly id: CityLayerId;
  readonly label: string;
  readonly owns: string;
}

export interface NinjaOneCapitalCityNode extends Omit<CityNodeSource, "binding"> {
  readonly anchor: Pair;
  readonly asset: CityAsset;
  readonly registrationBinding: CityNodeBinding;
}

function finitePair(value: readonly number[], label: string): Pair {
  if (value.length !== 2 || value.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError(`${label} must be a finite pair.`);
  }
  return Object.freeze([value[0], value[1]] as Pair);
}

function boundAnchor(binding: CityNodeBinding): Pair {
  return finitePair(binding.anchor, `City master anchor ${binding.id}`);
}

const assetById = new Map<string, CityAsset>(
  (assetManifest.assets as unknown as readonly CityAsset[]).map((asset) => [asset.id, Object.freeze({
    ...asset,
    source: Object.freeze({
      ...asset.source,
      dimensions: finitePair(asset.source.dimensions, `${asset.id}.source.dimensions`),
    }),
    variants: Object.freeze(Object.fromEntries(
      Object.entries(asset.variants).map(([tier, variant]) => [tier, Object.freeze({
        ...variant,
        dimensions: finitePair(variant.dimensions, `${asset.id}.${tier}.dimensions`),
      })]),
    )),
  })]),
);

export const NINJAONE_CAPITAL_CITY_LAYER_ID = "L4" as const;
export const NINJAONE_CAPITAL_CITY_LAYER_AUTHORITY_ID = compositionManifest.id;
export const NINJAONE_CAPITAL_CITY_PACKAGE_AUTHORITY_ID = packageAuthority.id;
export const NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD = finitePair(
  layoutManifest.artboard,
  "NinjaOne Capital runtime layout artboard",
);
export const NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN = NINJAONE_ENVIRONMENT_WORLD_ORIGIN;
export const NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN = NINJAONE_ENVIRONMENT_WORLD_SPAN;
export const NINJAONE_CAPITAL_CITY_LAYER_CAMERA: CameraView = Object.freeze({
  origin: Object.freeze([5 / 48, 0] as Pair),
  span: Object.freeze([1 / 6, 1 / 6] as Pair),
});
export const NINJAONE_CAPITAL_CITY_CONCEPT_CAMERA: CameraView = Object.freeze({
  origin: NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN,
  span: NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN,
});
export const NINJAONE_CAPITAL_CITY_MASTER_REFERENCE = Object.freeze({
  ...compositionManifest.masterReference,
  dimensions: finitePair(
    compositionManifest.masterReference.dimensions,
    "NinjaOne Capital master dimensions",
  ),
});
export const NINJAONE_CAPITAL_CITY_LAYER_MAXIMUM_DECODED_COHORT_BYTES:
Readonly<Record<CityAssetTier, number>> = Object.freeze({
  capital: assetManifest.delivery.maximumDecodedCohortBytes.capital,
  close: assetManifest.delivery.maximumDecodedCohortBytes.close,
  site: assetManifest.delivery.maximumDecodedCohortBytes.site,
});
export const NINJAONE_CAPITAL_CITY_LAYER_DEFINITIONS:
readonly NinjaOneCapitalCityLayerDefinition[] = Object.freeze(
  (compositionManifest.layers as readonly NinjaOneCapitalCityLayerDefinition[]).map(
    (layer) => Object.freeze({ ...layer }),
  ),
);
export const NINJAONE_CAPITAL_CITY_CIRCULATION_PATHS:
readonly NinjaOneCapitalCityCirculationPath[] = Object.freeze(
  (layoutManifest.circulation as unknown as readonly NinjaOneCapitalCityCirculationPath[])
    .map((path) => Object.freeze({
      ...path,
      points: Object.freeze(path.points.map((point) => finitePair(
        point,
        `${path.id}.point`,
      ))),
    })),
);

if (
  compositionManifest.status !== "active-registered-r3-composition"
  || compositionManifest.authority.packageAuthorityId !== packageAuthority.id
  || compositionManifest.authority.terrainRegistrationId !== NINJAONE_ENVIRONMENT_PROOF_ID
  || compositionManifest.authority.geographyOwnership !== "none"
  || compositionManifest.authority.masterConceptRole
    !== "package-selected-live-land-registration-density-hierarchy-and-silhouette-reference"
  || packageAuthority.status !== "sole-city-authority"
  || packageAuthority.runtimePolicy.renderUnit !== "individual-node"
  || packageAuthority.runtimePolicy.cityOwnsGeography
  || packageAuthority.selectedMaster.sha256 !== compositionManifest.masterReference.sha256
  || packageAuthority.selectedMaster.packagePath !== compositionManifest.masterReference.packagePath
  || packageAuthority.selectedMaster.dimensions.join(",")
    !== compositionManifest.masterReference.dimensions.join(",")
  || packageAuthority.registration.worldOrigin.join(",")
    !== NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN.join(",")
  || packageAuthority.registration.worldSpan.join(",")
    !== NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN.join(",")
  || compositionManifest.masterReference.runtimeVisible
  || layoutManifest.authority.runtimePlateVisible
  || layoutManifest.authority.packageAuthorityId !== packageAuthority.id
  || compositionManifest.runtimeLayoutManifest
    !== "/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json"
  || compositionManifest.runtimeRepresentationManifest
    !== "/career-world/capitals/ninjaone/manifests/city-foundation-r3.json"
  || NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD.join(",")
    !== NINJAONE_CAPITAL_CITY_MASTER_REFERENCE.dimensions.join(",")
  || compositionManifest.lod.hiddenTiers.join(",") !== "world,territory"
  || NINJAONE_CAPITAL_CITY_LAYER_DEFINITIONS.map(({ id }) => id).join(",")
    !== "L4_0,L4_1,L4_2,L4_3,L4_4,L4_5,L4_6,L4_7"
) {
  throw new TypeError("NinjaOne Capital city authority does not match package, terrain, and LOD contracts.");
}

const DEFAULT_FOOTPRINT_BY_LAYER: Readonly<Record<CityLayerId, Pair>> = Object.freeze({
  L4_0: Object.freeze([1, 1] as Pair),
  L4_1: Object.freeze([0.5, 0.2] as Pair),
  L4_2: Object.freeze([0.82, 0.22] as Pair),
  L4_3: Object.freeze([0.74, 0.25] as Pair),
  L4_4: Object.freeze([0.76, 0.24] as Pair),
  L4_5: Object.freeze([0.45, 0.15] as Pair),
  L4_6: Object.freeze([0.58, 0.18] as Pair),
  L4_7: Object.freeze([0.84, 0.14] as Pair),
});

const packageSkillAnchorByAssetId = new Map(
  packageAuthority.registeredSkillAnchors.map(({ assetId, anchor, groundOffset }) => {
    const promotionAnchor = finitePair(anchor, `${assetId}.packagePromotionAnchor`);
    const offset = finitePair(groundOffset ?? [0, 0], `${assetId}.packageGroundOffset`);
    return [assetId, finitePair([
      promotionAnchor[0] + offset[0],
      promotionAnchor[1] + offset[1],
    ], `${assetId}.packageGroundAnchor`)];
  }),
);

const packageLandmarkAnchorByAssetId = new Map(
  packageAuthority.registeredLandmarks.map(({ assetId, anchor }) => [
    assetId,
    finitePair(anchor, `${assetId}.packageLandmarkAnchor`),
  ]),
);

const packageRegisteredAnchorByAssetId = new Map([
  ...packageSkillAnchorByAssetId,
  ...packageLandmarkAnchorByAssetId,
]);

const cityNodeSources: readonly CityNodeSource[] = Object.freeze(
  (layoutManifest.nodes as unknown as readonly MasterLayoutNode[]).map((node) => {
    const anchor = finitePair(node.anchor, `${node.id}.anchor`);
    const registeredAnchor = packageRegisteredAnchorByAssetId.get(node.assetId);
    const isPackageRegistered = registeredAnchor?.join(",") === anchor.join(",");
    return Object.freeze({
      ...node,
      binding: Object.freeze({
        anchor,
        id: isPackageRegistered
          ? `${packageAuthority.id}#${node.assetId}`
          : `${layoutManifest.id}#${node.id}`,
        kind: isPackageRegistered
          ? "package-registered-anchor" as const
          : "inferred-unverified-anchor" as const,
      }),
      footprintFraction: DEFAULT_FOOTPRINT_BY_LAYER[node.layerId],
      label: node.id.replaceAll("-", " "),
      representationClass: "unregistered-close-candidate" as const,
    });
  }),
);

export const NINJAONE_CAPITAL_CITY_LAYER_NODES: readonly NinjaOneCapitalCityNode[] =
  Object.freeze(cityNodeSources.map((node) => {
    const asset = assetById.get(node.assetId);
    if (
      !asset
      || !asset.variants[node.minimumTier]
      || (node.visibleTiers !== undefined && (
        node.visibleTiers.length === 0
        || new Set(node.visibleTiers).size !== node.visibleTiers.length
        || node.visibleTiers.some((tier) => !asset.variants[tier])
      ))
      || !NINJAONE_CAPITAL_CITY_LAYER_DEFINITIONS.some(({ id }) => id === node.layerId)
      || !Number.isFinite(node.displayWidth)
      || node.displayWidth <= 0
      || node.footprintFraction.some((amount) => amount <= 0 || amount > 1)
    ) {
      throw new TypeError(`Invalid NinjaOne Capital city node: ${node.id}`);
    }
    const anchor = boundAnchor(node.binding);
    if (
      anchor[0] < 0
      || anchor[1] < 0
      || anchor[0] > NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD[0]
      || anchor[1] > NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD[1]
    ) {
      throw new RangeError(`NinjaOne Capital city node leaves the registered artboard: ${node.id}`);
    }
    return Object.freeze({
      ...node,
      anchor,
      asset,
      footprintFraction: finitePair(node.footprintFraction, `${node.id}.footprintFraction`),
      registrationBinding: Object.freeze({ ...node.binding }),
    });
  }));

if (
  NINJAONE_CAPITAL_CITY_LAYER_NODES.length
    !== compositionManifest.composition.targetNodeCount
) {
  throw new TypeError("NinjaOne Capital city density does not match the binding master contract.");
}

if (
  new Set(NINJAONE_CAPITAL_CITY_LAYER_NODES.map(({ id }) => id)).size
    !== NINJAONE_CAPITAL_CITY_LAYER_NODES.length
  || NINJAONE_CAPITAL_CITY_LAYER_NODES.some(({ asset }) => (
    Object.values(asset.variants).some((variant) => /atlas|plate|full-canvas/i.test(variant?.path ?? ""))
  ))
  || packageSkillAnchorByAssetId.size !== 19
  || NINJAONE_CAPITAL_CITY_LAYER_NODES
    .filter(({ layerId }) => layerId === "L4_3")
    .some(({ anchor, assetId }) => (
      packageSkillAnchorByAssetId.get(assetId)?.join(",") !== anchor.join(",")
    ))
  || packageLandmarkAnchorByAssetId.size !== 2
  || NINJAONE_CAPITAL_CITY_LAYER_NODES
    .filter(({ assetId }) => packageRegisteredAnchorByAssetId.has(assetId))
    .some(({ anchor, assetId, registrationBinding }) => (
      packageRegisteredAnchorByAssetId.get(assetId)?.join(",") !== anchor.join(",")
      || registrationBinding.kind !== "package-registered-anchor"
    ))
) {
  throw new TypeError("NinjaOne Capital city nodes must preserve package registration provenance.");
}

export function ninjaOneCapitalCityAssetVariant(
  node: NinjaOneCapitalCityNode,
  tier: DetailTierId,
): CityAssetVariant {
  if (tier !== "capital" && tier !== "site" && tier !== "close") {
    throw new TypeError(`No city asset source exists for ${tier}.`);
  }
  const variant = node.asset.variants[tier];
  if (!variant) throw new TypeError(`${node.assetId} has no ${tier} derivative.`);
  return variant;
}

export function ninjaOneCapitalCityLocalCameraBounds(
  camera: CameraView,
): readonly [number, number, number, number] {
  const worldX = NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_CITY_LAYER_ARTBOARD[1];
  const cameraX = camera.origin[0] * WORLD_PLANE.width;
  const cameraY = camera.origin[1] * WORLD_PLANE.height;
  return Object.freeze([
    (cameraX - worldX) / scaleX,
    (cameraY - worldY) / scaleY,
    (cameraX + camera.span[0] * WORLD_PLANE.width - worldX) / scaleX,
    (cameraY + camera.span[1] * WORLD_PLANE.height - worldY) / scaleY,
  ]);
}

const CITY_LAYER_ADMISSION_ORDER: readonly CityLayerId[] = Object.freeze([
  "L4_0",
  "L4_1",
  "L4_3",
  "L4_2",
  "L4_7",
  "L4_5",
  "L4_4",
  "L4_6",
]);

export const NINJAONE_CAPITAL_D01_DETAIL_ASSET_IDS = Object.freeze([
  "S03",
  "S05",
  "S06",
  "S16",
  "S17",
  "S19",
] as const);

export const NINJAONE_CAPITAL_D01_DETAIL_DISPLAY_WIDTHS = Object.freeze({
  S03: 105,
  S05: 96,
  S06: 108,
  S16: 114,
  S17: 111,
  S19: 138,
} as const);

export const NINJAONE_CAPITAL_D02_DETAIL_ASSET_IDS = Object.freeze([
  "I02",
  "S13",
] as const);

export const NINJAONE_CAPITAL_D02_DETAIL_DISPLAY_WIDTHS = Object.freeze({
  I02: 115,
  S13: 180,
} as const);

export const NINJAONE_CAPITAL_D03_DETAIL_ASSET_IDS = Object.freeze([
  "S07",
  "S08",
  "S09",
  "S12",
] as const);

export const NINJAONE_CAPITAL_D03_DETAIL_DISPLAY_WIDTHS = Object.freeze({
  S07: 135,
  S08: 116,
  S09: 176,
  S12: 106,
} as const);

export const NINJAONE_CAPITAL_D04_DETAIL_ASSET_IDS = Object.freeze([
  "S02",
  "S04",
] as const);

export const NINJAONE_CAPITAL_D04_DETAIL_DISPLAY_WIDTHS = Object.freeze({
  S02: 95,
  S04: 107,
} as const);

export const NINJAONE_CAPITAL_D05_DETAIL_ASSET_IDS = Object.freeze([
  "S01",
  "S10",
  "S11",
  "S15",
  "S18",
] as const);

export const NINJAONE_CAPITAL_D05_DETAIL_DISPLAY_WIDTHS = Object.freeze({
  S01: 130,
  S10: 126,
  S11: 133,
  S15: 144,
  S18: 140,
} as const);

function visibleRegisteredDetailNodes(
  camera: CameraView,
  tier: DetailTierId,
  layerIds: readonly CityLayerId[],
  assetIds: ReadonlySet<string> | null,
): readonly NinjaOneCapitalCityNode[] {
  if (tier !== "site" && tier !== "close") return Object.freeze([]);
  const [left, top, right, bottom] = ninjaOneCapitalCityLocalCameraBounds(camera);
  const margin = tier === "close" ? 96 : 180;
  const candidates = NINJAONE_CAPITAL_CITY_LAYER_NODES.filter((node) => (
    node.registrationBinding.kind === "package-registered-anchor"
    && (assetIds === null || assetIds.has(node.assetId))
    && layerIds.includes(node.layerId)
    && (node.visibleTiers?.includes(tier)
      ?? DETAIL_TIER_DEPTH[tier] >= DETAIL_TIER_DEPTH[node.minimumTier])
    && node.anchor[0] + node.displayWidth >= left - margin
    && node.anchor[0] - node.displayWidth <= right + margin
    && node.anchor[1] + node.displayWidth >= top - margin
    && node.anchor[1] - node.displayWidth <= bottom + margin
  )).sort((leftNode, rightNode) => (
    CITY_LAYER_ADMISSION_ORDER.indexOf(leftNode.layerId)
      - CITY_LAYER_ADMISSION_ORDER.indexOf(rightNode.layerId)
    || leftNode.anchor[1] + leftNode.zBias - rightNode.anchor[1] - rightNode.zBias
  ));
  const decodedSources = new Set<string>();
  let decodedBytes = 0;
  return Object.freeze(candidates.filter((node) => {
    const variant = ninjaOneCapitalCityAssetVariant(node, tier);
    if (decodedSources.has(variant.path)) return true;
    if (
      decodedBytes + variant.decodedBytes
        > NINJAONE_CAPITAL_CITY_LAYER_MAXIMUM_DECODED_COHORT_BYTES[tier]
    ) {
      return false;
    }
    decodedSources.add(variant.path);
    decodedBytes += variant.decodedBytes;
    return true;
  }));
}

export function ninjaOneCapitalVisibleRegisteredDetailNodes(
  camera: CameraView,
  tier: DetailTierId,
  layerIds: readonly CityLayerId[],
): readonly NinjaOneCapitalCityNode[] {
  return visibleRegisteredDetailNodes(camera, tier, layerIds, null);
}

export function ninjaOneCapitalVisibleDistrictDetailNodes(
  camera: CameraView,
  tier: DetailTierId,
  layerIds: readonly CityLayerId[],
  districtId: NinjaOneCapitalCityDistrictId,
): readonly NinjaOneCapitalCityNode[] {
  if (districtId === "D01") {
    const nodes = visibleRegisteredDetailNodes(
      camera,
      tier,
      layerIds,
      new Set(NINJAONE_CAPITAL_D01_DETAIL_ASSET_IDS),
    );
    return Object.freeze(nodes.map((node) => Object.freeze({
      ...node,
      displayWidth: NINJAONE_CAPITAL_D01_DETAIL_DISPLAY_WIDTHS[
        node.assetId as keyof typeof NINJAONE_CAPITAL_D01_DETAIL_DISPLAY_WIDTHS
      ],
    })));
  }
  if (districtId === "D02") {
    const nodes = visibleRegisteredDetailNodes(
      camera,
      tier,
      layerIds,
      new Set(NINJAONE_CAPITAL_D02_DETAIL_ASSET_IDS),
    );
    return Object.freeze(nodes.map((node) => Object.freeze({
      ...node,
      displayWidth: NINJAONE_CAPITAL_D02_DETAIL_DISPLAY_WIDTHS[
        node.assetId as keyof typeof NINJAONE_CAPITAL_D02_DETAIL_DISPLAY_WIDTHS
      ],
    })));
  }
  if (districtId === "D03") {
    const nodes = visibleRegisteredDetailNodes(
      camera,
      tier,
      layerIds,
      new Set(NINJAONE_CAPITAL_D03_DETAIL_ASSET_IDS),
    );
    return Object.freeze(nodes.map((node) => Object.freeze({
      ...node,
      displayWidth: NINJAONE_CAPITAL_D03_DETAIL_DISPLAY_WIDTHS[
        node.assetId as keyof typeof NINJAONE_CAPITAL_D03_DETAIL_DISPLAY_WIDTHS
      ],
    })));
  }
  if (districtId === "D04") {
    const nodes = visibleRegisteredDetailNodes(
      camera,
      tier,
      layerIds,
      new Set(NINJAONE_CAPITAL_D04_DETAIL_ASSET_IDS),
    );
    return Object.freeze(nodes.map((node) => Object.freeze({
      ...node,
      displayWidth: NINJAONE_CAPITAL_D04_DETAIL_DISPLAY_WIDTHS[
        node.assetId as keyof typeof NINJAONE_CAPITAL_D04_DETAIL_DISPLAY_WIDTHS
      ],
    })));
  }
  if (districtId !== "D05") return Object.freeze([]);
  const nodes = visibleRegisteredDetailNodes(
    camera,
    tier,
    layerIds,
    new Set(NINJAONE_CAPITAL_D05_DETAIL_ASSET_IDS),
  );
  return Object.freeze(nodes.map((node) => Object.freeze({
    ...node,
    displayWidth: NINJAONE_CAPITAL_D05_DETAIL_DISPLAY_WIDTHS[
      node.assetId as keyof typeof NINJAONE_CAPITAL_D05_DETAIL_DISPLAY_WIDTHS
    ],
  })));
}

export function ninjaOneCapitalVisibleCityLayerNodes(
  camera: CameraView,
  tier: DetailTierId,
  layerId: CityLayerId,
  forcedFocusDistrict: NinjaOneCapitalCityDistrictId | null = null,
): readonly NinjaOneCapitalCityNode[] {
  if (tier === "world" || tier === "territory") return Object.freeze([]);
  const [left, top, right, bottom] = ninjaOneCapitalCityLocalCameraBounds(camera);
  const margin = tier === "close" ? 96 : tier === "site" ? 180 : 260;
  const candidates = NINJAONE_CAPITAL_CITY_LAYER_NODES.filter((node) => (
    tier === "capital"
    && node.representationClass === "capital-district-composite"
    && (node.visibleTiers?.includes(tier)
      ?? DETAIL_TIER_DEPTH[tier] >= DETAIL_TIER_DEPTH[node.minimumTier])
    && node.anchor[0] + node.displayWidth >= left - margin
    && node.anchor[0] - node.displayWidth <= right + margin
    && node.anchor[1] + node.displayWidth >= top - margin
    && node.anchor[1] - node.displayWidth <= bottom + margin
  )).sort((leftNode, rightNode) => (
    CITY_LAYER_ADMISSION_ORDER.indexOf(leftNode.layerId)
      - CITY_LAYER_ADMISSION_ORDER.indexOf(rightNode.layerId)
  ));
  const decodedSources = new Set<string>();
  let decodedBytes = 0;
  const admitted = candidates.filter((node) => {
    const variant = ninjaOneCapitalCityAssetVariant(node, tier);
    if (decodedSources.has(variant.path)) return true;
    if (
      decodedBytes + variant.decodedBytes
        > NINJAONE_CAPITAL_CITY_LAYER_MAXIMUM_DECODED_COHORT_BYTES[tier]
    ) {
      return false;
    }
    decodedSources.add(variant.path);
    decodedBytes += variant.decodedBytes;
    return true;
  });
  return Object.freeze(admitted.filter((node) => node.layerId === layerId).sort(
    (leftNode, rightNode) => (
      leftNode.anchor[1] + leftNode.zBias - rightNode.anchor[1] - rightNode.zBias
    ),
  ));
}
