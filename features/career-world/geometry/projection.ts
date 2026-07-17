import {
  CAREER_WORLD_PROJECTION_ID,
  type PlanPoint,
  type ProjectedPoint,
  type SpatialPoint,
} from "./types";

const ISO_HORIZONTAL_SCALE = 0.8660254;
export const PROJECTION_DECIMAL_PLACES = 4;

export const CAREER_WORLD_PROJECTION = Object.freeze({
  id: CAREER_WORLD_PROJECTION_ID,
  type: "orthographic-true-isometric",
  cameraAzimuthDegreesFromNorth: 225,
  lookDirectionDegreesFromNorth: 45,
  elevationDegrees: 35.264,
  rollDegrees: 0,
  authoredRotationAllowed: false,
  north: "+Y projects upper-left",
  screenX: "(x-y)*0.8660254",
  screenY: "-(x+y)*0.5-z",
} as const);

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
}

export function roundProjectionCoordinate(value: number): number {
  requireFinite(value, "Projection coordinate");
  const scale = 10 ** PROJECTION_DECIMAL_PLACES;
  const scaled = (value + Number.EPSILON) * scale;
  requireFinite(scaled, "Scaled projection coordinate");
  const rounded = Math.round(scaled) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatProjectionCoordinate(value: number): string {
  return roundProjectionCoordinate(value).toFixed(PROJECTION_DECIMAL_PLACES);
}

export function projectSpatialPoint(point: SpatialPoint): ProjectedPoint {
  requireFinite(point.x, "Spatial x");
  requireFinite(point.y, "Spatial y");
  requireFinite(point.z, "Spatial z");

  return Object.freeze({
    x: roundProjectionCoordinate((point.x - point.y) * ISO_HORIZONTAL_SCALE),
    y: roundProjectionCoordinate(-(point.x + point.y) * 0.5 - point.z),
  });
}

export function projectPlanPoint(point: PlanPoint, z = 0): ProjectedPoint {
  return projectSpatialPoint({ x: point.x, y: point.y, z });
}

export function projectPlan(
  plan: readonly PlanPoint[],
  z = 0,
): readonly ProjectedPoint[] {
  return Object.freeze(plan.map((point) => projectPlanPoint(point, z)));
}
