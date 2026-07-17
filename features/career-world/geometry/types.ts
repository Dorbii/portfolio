export const CAREER_ASSET_CATEGORIES = [
  "world",
  "city",
  "project",
  "skill",
  "ambient",
] as const;

export type CareerAssetCategory = (typeof CAREER_ASSET_CATEGORIES)[number];
export type CareerAssetId = `${CareerAssetCategory}/${string}@v1`;

export const CAREER_WORLD_PROJECTION_ID = "cw-iso-225-45-35.264-r0-v1" as const;
export type CareerWorldProjectionId = typeof CAREER_WORLD_PROJECTION_ID;

export const DETAIL_TIERS = [0, 1, 2] as const;
export type DetailTier = (typeof DETAIL_TIERS)[number];

export type PaletteSlot =
  | "structure.base"
  | "structure.shadow"
  | "line.primary"
  | "line.secondary"
  | "accent.emissive"
  | "accent.focus"
  | "label.primary"
  | "terrain.claim";

export type GeometryPalette = Readonly<Record<PaletteSlot, string>>;

export type PlanPoint = Readonly<{
  x: number;
  y: number;
}>;

export type SpatialPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type ProjectedPoint = Readonly<{
  x: number;
  y: number;
}>;

export type Footprint = Readonly<{
  width: number;
  depth: number;
}>;

export type SurfacePrimitive = Readonly<{
  type: "surface";
  id: string;
  path: string;
  fill: PaletteSlot;
  stroke?: PaletteSlot;
  detailTier: DetailTier;
}>;

export type ExtrusionPrimitive = Readonly<{
  type: "extrusion";
  id: string;
  plan: readonly PlanPoint[];
  height: number;
  top: PaletteSlot;
  litSide: PaletteSlot;
  shadowSide: PaletteSlot;
  stroke: PaletteSlot;
  detailTier: DetailTier;
}>;

export type StrokePrimitive = Readonly<{
  type: "stroke";
  id: string;
  path: string;
  stroke: PaletteSlot;
  detailTier: DetailTier;
}>;

export type GeometryPrimitive =
  | SurfacePrimitive
  | ExtrusionPrimitive
  | StrokePrimitive;

export type GeometryDefinition = Readonly<{
  assetId: CareerAssetId;
  category: CareerAssetCategory;
  geometryKey: `career-world/${string}/master-v1`;
  masterGeometryHash: `sha256:${string}`;
  primaryPathHash: `sha256:${string}`;
  primaryPath: string;
  footprint: Footprint;
  orientation: 0;
  projection: CareerWorldProjectionId;
  paletteSlots: readonly PaletteSlot[];
  primitives: readonly GeometryPrimitive[];
}>;

export function isDetailTier(value: unknown): value is DetailTier {
  return value === 0 || value === 1 || value === 2;
}

export function assertDetailTier(value: unknown): asserts value is DetailTier {
  if (!isDetailTier(value)) {
    throw new RangeError(`Expected detail tier 0, 1, or 2; received ${String(value)}`);
  }
}

export function assertNever(value: never, context: string): never {
  throw new Error(`${context}: ${JSON.stringify(value)}`);
}
