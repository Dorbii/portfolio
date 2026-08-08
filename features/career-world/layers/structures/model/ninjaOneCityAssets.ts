import {
  KAIZEN_SEMANTIC_STRUCTURE_ASSETS,
  type KaizenSemanticAssetRole,
  type KaizenSemanticStructureAsset,
} from "./kaizenSemanticAssets.ts";

export const NINJAONE_CITY_ASSET_POOL_ID =
  "ninjaone-shared-city-assets@r3";

export const NINJAONE_CITY_ASSET_ROLES = [
  "project",
  "skill",
] as const;

export type NinjaOneCityAssetRole = KaizenSemanticAssetRole;

export interface NinjaOneCityAssetResource {
  readonly defaultVariant: "standard";
  readonly id: string;
  readonly role: NinjaOneCityAssetRole;
  readonly semanticAsset: KaizenSemanticStructureAsset;
  readonly variants: Readonly<Record<"standard", string>>;
}

export const NINJAONE_CITY_ASSET_POOL:
readonly NinjaOneCityAssetResource[] = Object.freeze(
  KAIZEN_SEMANTIC_STRUCTURE_ASSETS.map((semanticAsset) => Object.freeze({
    defaultVariant: "standard" as const,
    id: `ninjaone-${semanticAsset.id}`,
    role: semanticAsset.role,
    semanticAsset,
    variants: Object.freeze({
      standard: semanticAsset.assetPath,
    }),
  })),
);

const ASSET_BY_SEMANTIC_ID = new Map(
  NINJAONE_CITY_ASSET_POOL.map((resource) => [
    resource.semanticAsset.id,
    resource,
  ]),
);

export function resolveNinjaOneCityAssetResource(
  semanticAssetId: string,
): NinjaOneCityAssetResource | null {
  return ASSET_BY_SEMANTIC_ID.get(semanticAssetId) ?? null;
}

export function resolveNinjaOneCityAssetPath(
  resource: NinjaOneCityAssetResource,
  variant: keyof NinjaOneCityAssetResource["variants"] =
    resource.defaultVariant,
): string {
  return resource.variants[variant];
}
