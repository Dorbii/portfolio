import {
  AMBIENT_STRUCTURE_ARCHETYPES,
  type AmbientStructureArchetype,
} from "./ambient";

export const NINJAONE_CITY_ASSET_POOL_ID =
  "ninjaone-common-city-assets@r1";

export const NINJAONE_CITY_ASSET_ROLES = [
  "civic",
  "housing",
  "service",
  "workshop",
] as const;

export type NinjaOneCityAssetRole =
  typeof NINJAONE_CITY_ASSET_ROLES[number];

export interface NinjaOneCityAssetResource {
  readonly id: string;
  readonly role: NinjaOneCityAssetRole;
  readonly archetype: AmbientStructureArchetype;
  readonly defaultVariant: "standard";
  readonly variants: Readonly<Record<"standard", string>>;
}

interface NinjaOneCityAssetConfig {
  readonly id: string;
  readonly role: NinjaOneCityAssetRole;
  readonly archetypeId: string;
}

const ASSET_CONFIGS: readonly NinjaOneCityAssetConfig[] = Object.freeze([
  Object.freeze({
    id: "ninjaone-artisan-rowhouse",
    role: "housing",
    archetypeId: "kaizen-artisan-rowhouse",
  }),
  Object.freeze({
    id: "ninjaone-machinist-workshop",
    role: "workshop",
    archetypeId: "kaizen-machinist-workshop",
  }),
  Object.freeze({
    id: "ninjaone-corner-tenement",
    role: "housing",
    archetypeId: "kaizen-corner-tenement",
  }),
  Object.freeze({
    id: "ninjaone-guild-annex",
    role: "civic",
    archetypeId: "kaizen-guild-annex",
  }),
  Object.freeze({
    id: "ninjaone-carriage-warehouse",
    role: "service",
    archetypeId: "kaizen-carriage-warehouse",
  }),
  Object.freeze({
    id: "ninjaone-municipal-pump-house",
    role: "service",
    archetypeId: "kaizen-municipal-pump-house",
  }),
]);

function requireAmbientArchetype(
  archetypeId: string,
): AmbientStructureArchetype {
  const archetype = AMBIENT_STRUCTURE_ARCHETYPES.find(
    ({ id }) => id === archetypeId,
  );
  if (!archetype) {
    throw new TypeError(
      `NinjaOne city asset ${archetypeId} is not registered.`,
    );
  }
  return archetype;
}

export const NINJAONE_CITY_ASSET_POOL:
readonly NinjaOneCityAssetResource[] = Object.freeze(
  ASSET_CONFIGS.map((config) => {
    const archetype = requireAmbientArchetype(config.archetypeId);
    return Object.freeze({
      id: config.id,
      role: config.role,
      archetype,
      defaultVariant: "standard" as const,
      variants: Object.freeze({
        standard: archetype.assetPath,
      }),
    });
  }),
);

const ASSET_BY_ARCHETYPE_ID = new Map(
  NINJAONE_CITY_ASSET_POOL.map((resource) => [
    resource.archetype.id,
    resource,
  ]),
);

export function resolveNinjaOneCityAssetResource(
  archetypeId: string,
): NinjaOneCityAssetResource | null {
  return ASSET_BY_ARCHETYPE_ID.get(archetypeId) ?? null;
}

export function resolveNinjaOneCityAssetPath(
  resource: NinjaOneCityAssetResource,
  variant: keyof NinjaOneCityAssetResource["variants"] =
    resource.defaultVariant,
): string {
  return resource.variants[variant];
}
