import {
  formatProjectionCoordinate,
  projectPlan,
  projectPlanPoint,
  projectSpatialPoint,
  roundProjectionCoordinate,
} from "./projection";
import {
  isDetailTier,
  type ExtrusionPrimitive,
  type PlanPoint,
  type ProjectedPoint,
} from "./types";

export type ExtrusionSideTone = "lit" | "shadow";

export type ProjectedExtrusionSide = Readonly<{
  id: `side-${number}`;
  path: string;
  tone: ExtrusionSideTone;
}>;

export type ProjectedExtrusion = Readonly<{
  topPath: string;
  sides: readonly ProjectedExtrusionSide[];
}>;

export function isGeometryPrimitiveType(
  value: unknown,
): value is "surface" | "extrusion" | "stroke" {
  return value === "surface" || value === "extrusion" || value === "stroke";
}

function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`);
  }
}

function freezePlan(points: readonly PlanPoint[]): readonly PlanPoint[] {
  return Object.freeze(
    points.map((point) =>
      Object.freeze({
        x: roundProjectionCoordinate(point.x),
        y: roundProjectionCoordinate(point.y),
      }),
    ),
  );
}

export function rectangularPlan(width: number, depth: number): readonly PlanPoint[] {
  requirePositive(width, "Rectangle width");
  requirePositive(depth, "Rectangle depth");
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return freezePlan([
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ]);
}

export function regularPolygonPlan(
  sideCount: number,
  radius: number,
  rotationDegrees = 0,
): readonly PlanPoint[] {
  if (!Number.isInteger(sideCount) || sideCount < 3) {
    throw new RangeError("Regular polygon side count must be an integer of at least 3");
  }
  requirePositive(radius, "Regular polygon radius");
  if (!Number.isFinite(rotationDegrees)) {
    throw new TypeError("Regular polygon rotation must be finite");
  }

  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  return freezePlan(
    Array.from({ length: sideCount }, (_, index) => {
      const angle = rotationRadians + (index * 2 * Math.PI) / sideCount;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    }),
  );
}

export function svgPathFromProjectedPoints(
  points: readonly ProjectedPoint[],
  close = true,
): string {
  if (points.length < 2) {
    throw new RangeError("An SVG path requires at least two projected points");
  }

  const [first, ...rest] = points;
  const commands = [
    `M ${formatProjectionCoordinate(first.x)} ${formatProjectionCoordinate(first.y)}`,
    ...rest.map(
      (point) =>
        `L ${formatProjectionCoordinate(point.x)} ${formatProjectionCoordinate(point.y)}`,
    ),
  ];

  return `${commands.join(" ")}${close ? " Z" : ""}`;
}

export function projectedPlanPath(
  plan: readonly PlanPoint[],
  z = 0,
): string {
  if (plan.length < 3) {
    throw new RangeError("A closed plan path requires at least three points");
  }
  return svgPathFromProjectedPoints(projectPlan(plan, z));
}

function sideTone(start: ProjectedPoint, end: ProjectedPoint): ExtrusionSideTone {
  const horizontalDirection = roundProjectionCoordinate(end.x - start.x);
  const verticalDirection = roundProjectionCoordinate(end.y - start.y);
  return horizontalDirection > 0 || (horizontalDirection === 0 && verticalDirection < 0)
    ? "lit"
    : "shadow";
}

export function projectExtrusion(primitive: ExtrusionPrimitive): ProjectedExtrusion {
  const errors = validateGeometryPrimitive(primitive);
  if (errors.length > 0) {
    throw new TypeError(`Invalid extrusion ${primitive.id}: ${errors.join("; ")}`);
  }

  const sides = primitive.plan.map((start, index) => {
    const end = primitive.plan[(index + 1) % primitive.plan.length];
    const baseStart = projectPlanPoint(start);
    const baseEnd = projectPlanPoint(end);
    const topEnd = projectSpatialPoint({ x: end.x, y: end.y, z: primitive.height });
    const topStart = projectSpatialPoint({ x: start.x, y: start.y, z: primitive.height });

    return Object.freeze({
      id: `side-${index}` as const,
      path: svgPathFromProjectedPoints([baseStart, baseEnd, topEnd, topStart]),
      tone: sideTone(baseStart, baseEnd),
    });
  });

  return Object.freeze({
    topPath: projectedPlanPath(primitive.plan, primitive.height),
    sides: Object.freeze(sides),
  });
}

function planSignedArea(plan: readonly PlanPoint[]): number {
  return plan.reduce((sum, point, index) => {
    const next = plan[(index + 1) % plan.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

export function validateGeometryPrimitive(primitive: unknown): readonly string[] {
  const errors: string[] = [];
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive)) {
    return Object.freeze(["primitive must be an object"]);
  }

  const candidate = primitive as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  if (!id.trim()) errors.push("primitive id is empty");
  if (!isDetailTier(candidate.detailTier)) {
    errors.push(`primitive ${id || "<empty>"} has invalid detail tier`);
  }

  if (candidate.type === "surface" || candidate.type === "stroke") {
    if (typeof candidate.path !== "string" || !candidate.path.trim()) {
      errors.push(`primitive ${id || "<empty>"} has an empty path`);
    }
  } else if (candidate.type === "extrusion") {
    if (!Array.isArray(candidate.plan)) {
      errors.push(`extrusion ${id || "<empty>"} plan must be an array`);
      return Object.freeze(errors);
    }
    const plan = candidate.plan as unknown[];
    if (plan.length < 3) {
      errors.push(`extrusion ${id || "<empty>"} has fewer than three plan points`);
    }
    if (typeof candidate.height !== "number" || !Number.isFinite(candidate.height) || candidate.height <= 0) {
      errors.push(`extrusion ${id || "<empty>"} has an invalid height`);
    }

    const validPoints: PlanPoint[] = [];
    plan.forEach((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`extrusion ${id || "<empty>"} plan point ${index} is not finite`);
        return;
      }
      const point = value as Record<string, unknown>;
      if (
        typeof point.x !== "number" ||
        typeof point.y !== "number" ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        errors.push(`extrusion ${id || "<empty>"} plan point ${index} is not finite`);
        return;
      }
      validPoints.push({ x: point.x, y: point.y });
    });
    if (validPoints.length === plan.length && plan.length >= 3) {
      const uniquePoints = new Set(validPoints.map((point) => `${point.x},${point.y}`));
      if (uniquePoints.size !== validPoints.length) {
        errors.push(`extrusion ${id || "<empty>"} repeats a plan point`);
      }
      if (Math.abs(planSignedArea(validPoints)) <= Number.EPSILON) {
        errors.push(`extrusion ${id || "<empty>"} has a zero-area plan`);
      }
    }
  } else {
    errors.push(`unknown primitive type ${String(candidate.type)}`);
  }

  return Object.freeze(errors);
}
