import {
  CAREER_WORLD_PROJECTION_ID,
  assertNever,
  type DetailTier,
  type GeometryDefinition,
  type GeometryPrimitive,
  type PaletteSlot,
} from "./types";
import {
  PALETTE_SLOTS,
  hasCanonicalPaletteSlots,
  isPaletteSlot,
} from "./palettes";
import { isGeometryPrimitiveType, validateGeometryPrimitive } from "./primitives";

export const GEOMETRY_PAYLOAD_SCHEMA_VERSION = "career-world-geometry/v1" as const;

type SurfacePayload = readonly [
  "surface",
  id: string,
  path: string,
  fill: PaletteSlot,
  stroke: PaletteSlot | null,
  detailTier: DetailTier,
];

type ExtrusionPayload = readonly [
  "extrusion",
  id: string,
  plan: readonly (readonly [x: number, y: number])[],
  height: number,
  top: PaletteSlot,
  litSide: PaletteSlot,
  shadowSide: PaletteSlot,
  stroke: PaletteSlot,
  detailTier: DetailTier,
];

type StrokePayload = readonly [
  "stroke",
  id: string,
  path: string,
  stroke: PaletteSlot,
  detailTier: DetailTier,
];

export type CanonicalPrimitivePayload =
  | SurfacePayload
  | ExtrusionPayload
  | StrokePayload;

export type CanonicalGeometryPayload = readonly [
  schemaVersion: typeof GEOMETRY_PAYLOAD_SCHEMA_VERSION,
  assetId: string,
  category: string,
  geometryKey: string,
  projection: string,
  orientation: 0,
  footprint: readonly [width: number, depth: number],
  paletteSlots: readonly PaletteSlot[],
  primaryPath: string,
  primitives: readonly CanonicalPrimitivePayload[],
];

const sha256Pattern = /^sha256:[0-9a-f]{64}$/;
const assetIdPattern = /^(world|city|project|skill|ambient)\/.+@v1$/;
const geometryKeyPattern = /^career-world\/.+\/master-v1$/;

function primitivePaletteSlots(primitive: GeometryPrimitive): readonly unknown[] {
  switch (primitive.type) {
    case "surface":
      return primitive.stroke ? [primitive.fill, primitive.stroke] : [primitive.fill];
    case "extrusion":
      return [
        primitive.top,
        primitive.litSide,
        primitive.shadowSide,
        primitive.stroke,
      ];
    case "stroke":
      return [primitive.stroke];
    default:
      return assertNever(primitive, "Unknown geometry primitive while reading palette slots");
  }
}

export function canonicalPrimitivePayload(
  primitive: GeometryPrimitive,
): CanonicalPrimitivePayload {
  switch (primitive.type) {
    case "surface":
      return Object.freeze([
        "surface",
        primitive.id,
        primitive.path,
        primitive.fill,
        primitive.stroke ?? null,
        primitive.detailTier,
      ]);
    case "extrusion":
      return Object.freeze([
        "extrusion",
        primitive.id,
        Object.freeze(
          primitive.plan.map((point) => Object.freeze([point.x, point.y] as const)),
        ),
        primitive.height,
        primitive.top,
        primitive.litSide,
        primitive.shadowSide,
        primitive.stroke,
        primitive.detailTier,
      ]);
    case "stroke":
      return Object.freeze([
        "stroke",
        primitive.id,
        primitive.path,
        primitive.stroke,
        primitive.detailTier,
      ]);
    default:
      return assertNever(primitive, "Unknown geometry primitive in canonical payload");
  }
}

export function validateGeometryDefinition(
  definition: GeometryDefinition,
): readonly string[] {
  const errors: string[] = [];
  if (!assetIdPattern.test(definition.assetId)) errors.push("assetId is not a v1 Career World asset id");
  if (!definition.assetId.startsWith(`${definition.category}/`)) {
    errors.push("assetId category does not match definition category");
  }
  if (!geometryKeyPattern.test(definition.geometryKey)) errors.push("geometryKey is not a master-v1 key");
  if (!sha256Pattern.test(definition.masterGeometryHash)) errors.push("masterGeometryHash is not a lowercase sha256 digest");
  if (!sha256Pattern.test(definition.primaryPathHash)) errors.push("primaryPathHash is not a lowercase sha256 digest");
  if (!definition.primaryPath.trim()) errors.push("primaryPath is empty");
  if (!Number.isFinite(definition.footprint.width) || definition.footprint.width <= 0) {
    errors.push("footprint width must be a positive finite number");
  }
  if (!Number.isFinite(definition.footprint.depth) || definition.footprint.depth <= 0) {
    errors.push("footprint depth must be a positive finite number");
  }
  if (definition.orientation !== 0) errors.push("orientation must be 0");
  if (definition.projection !== CAREER_WORLD_PROJECTION_ID) {
    errors.push("projection does not match the frozen Career World projection");
  }
  if (!hasCanonicalPaletteSlots(definition.paletteSlots)) {
    errors.push("paletteSlots do not match the exact canonical order");
  }
  if (definition.primitives.length === 0) errors.push("definition has no primitives");
  if (!definition.primitives.some((primitive) => primitive.detailTier === 0)) {
    errors.push("definition has no tier-0 primitive");
  }

  const primitiveIds = new Set<string>();
  for (const primitive of definition.primitives) {
    errors.push(...validateGeometryPrimitive(primitive));
    if (primitiveIds.has(primitive.id)) errors.push(`duplicate primitive id ${primitive.id}`);
    primitiveIds.add(primitive.id);
    if (!isGeometryPrimitiveType((primitive as { type?: unknown }).type)) continue;
    for (const slot of primitivePaletteSlots(primitive)) {
      if (!isPaletteSlot(slot)) errors.push(`primitive ${primitive.id} uses unknown palette slot ${String(slot)}`);
    }
  }

  return Object.freeze(errors);
}

export function assertGeometryDefinition(
  definition: GeometryDefinition,
): asserts definition is GeometryDefinition {
  const errors = validateGeometryDefinition(definition);
  if (errors.length > 0) {
    throw new TypeError(`Invalid Career World geometry definition: ${errors.join("; ")}`);
  }
}

export function canonicalGeometryPayload(
  definition: GeometryDefinition,
): CanonicalGeometryPayload {
  assertGeometryDefinition(definition);
  return Object.freeze([
    GEOMETRY_PAYLOAD_SCHEMA_VERSION,
    definition.assetId,
    definition.category,
    definition.geometryKey,
    definition.projection,
    definition.orientation,
    Object.freeze([definition.footprint.width, definition.footprint.depth] as const),
    PALETTE_SLOTS,
    definition.primaryPath,
    Object.freeze(definition.primitives.map(canonicalPrimitivePayload)),
  ]);
}

export function serializeCanonicalGeometryPayload(definition: GeometryDefinition): string {
  return JSON.stringify(canonicalGeometryPayload(definition));
}
