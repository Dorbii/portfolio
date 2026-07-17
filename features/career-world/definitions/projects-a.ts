import {
  projectedPlanPath,
  regularPolygonPlan,
  svgPathFromProjectedPoints,
} from "../geometry/primitives";
import {
  projectSpatialPoint,
  roundProjectionCoordinate,
} from "../geometry/projection";
import { PALETTE_SLOTS } from "../geometry/palettes";
import {
  CAREER_WORLD_PROJECTION_ID,
  type DetailTier,
  type GeometryDefinition,
  type GeometryPrimitive,
  type PaletteSlot,
  type PlanPoint,
  type ProjectedPoint,
  type SpatialPoint,
} from "../geometry/types";

type ProjectAssetId = `project/${string}@v1`;

type ProjectDefinitionInput = Readonly<{
  assetId: ProjectAssetId;
  geometryKey: `career-world/${string}/master-v1`;
  masterGeometryHash: GeometryDefinition["masterGeometryHash"];
  primaryPathHash: GeometryDefinition["primaryPathHash"];
  primaryPath: string;
  footprint: Readonly<{ width: number; depth: number }>;
  primitives: readonly GeometryPrimitive[];
}>;

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

function rectPlan(
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
): readonly PlanPoint[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return freezePlan([
    { x: centerX - halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY + halfDepth },
    { x: centerX - halfWidth, y: centerY + halfDepth },
  ]);
}

function barPlan(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
): readonly PlanPoint[] {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const normalX = (-deltaY / length) * (width / 2);
  const normalY = (deltaX / length) * (width / 2);

  return freezePlan([
    { x: startX + normalX, y: startY + normalY },
    { x: endX + normalX, y: endY + normalY },
    { x: endX - normalX, y: endY - normalY },
    { x: startX - normalX, y: startY - normalY },
  ]);
}

function translatedPlan(
  source: readonly PlanPoint[],
  offsetX: number,
  offsetY: number,
): readonly PlanPoint[] {
  return freezePlan(
    source.map((point) => ({
      x: point.x + offsetX,
      y: point.y + offsetY,
    })),
  );
}

function screenPath(points: readonly ProjectedPoint[], close = true): string {
  return svgPathFromProjectedPoints(points, close);
}

function spatialPath(points: readonly SpatialPoint[], close = true): string {
  return svgPathFromProjectedPoints(points.map(projectSpatialPoint), close);
}

function surface(
  id: string,
  path: string,
  fill: PaletteSlot,
  stroke: PaletteSlot | undefined,
  detailTier: DetailTier,
): GeometryPrimitive {
  return Object.freeze({ type: "surface", id, path, fill, stroke, detailTier });
}

function extrusion(
  id: string,
  plan: readonly PlanPoint[],
  height: number,
  detailTier: DetailTier = 0,
): GeometryPrimitive {
  return Object.freeze({
    type: "extrusion",
    id,
    plan,
    height,
    top: "structure.base",
    litSide: "line.secondary",
    shadowSide: "structure.shadow",
    stroke: "line.primary",
    detailTier,
  });
}

function stroke(
  id: string,
  path: string,
  strokeSlot: PaletteSlot,
  detailTier: DetailTier,
): GeometryPrimitive {
  return Object.freeze({
    type: "stroke",
    id,
    path,
    stroke: strokeSlot,
    detailTier,
  });
}

function elevatedSlab(
  id: string,
  plan: readonly PlanPoint[],
  baseHeight: number,
  topHeight: number,
): readonly GeometryPrimitive[] {
  const sides = plan.map((start, index) => {
    const end = plan[(index + 1) % plan.length];
    return surface(
      `${id}-side-${index + 1}`,
      spatialPath([
        { x: start.x, y: start.y, z: baseHeight },
        { x: end.x, y: end.y, z: baseHeight },
        { x: end.x, y: end.y, z: topHeight },
        { x: start.x, y: start.y, z: topHeight },
      ]),
      index < 2 ? "structure.shadow" : "line.secondary",
      "line.primary",
      0,
    );
  });

  return Object.freeze([
    ...sides,
    surface(
      `${id}-roof`,
      projectedPlanPath(plan, topHeight),
      "structure.base",
      "line.primary",
      0,
    ),
  ]);
}

function recessedCut(
  id: string,
  plan: readonly PlanPoint[],
  floorHeight: number,
  rimHeight: number,
): readonly GeometryPrimitive[] {
  const walls = plan.map((start, index) => {
    const end = plan[(index + 1) % plan.length];
    return surface(
      `${id}-retaining-wall-${index + 1}`,
      spatialPath([
        { x: start.x, y: start.y, z: floorHeight },
        { x: end.x, y: end.y, z: floorHeight },
        { x: end.x, y: end.y, z: rimHeight },
        { x: start.x, y: start.y, z: rimHeight },
      ]),
      index % 2 === 0 ? "structure.shadow" : "line.secondary",
      "line.primary",
      0,
    );
  });

  return Object.freeze([
    surface(
      `${id}-recessed-floor`,
      projectedPlanPath(plan, floorHeight),
      "structure.shadow",
      "line.primary",
      0,
    ),
    ...walls,
  ]);
}

function pitchedRoof(
  id: string,
  plan: readonly PlanPoint[],
  eaveHeight: number,
  ridgeHeight: number,
): readonly GeometryPrimitive[] {
  if (plan.length !== 4) {
    throw new RangeError(`${id} pitched roof requires a four-point rectangular plan`);
  }
  const [nearLeft, nearRight, farRight, farLeft] = plan;
  const ridgeX = roundProjectionCoordinate((nearLeft.x + nearRight.x) / 2);
  const nearRidge = { x: ridgeX, y: nearLeft.y, z: ridgeHeight };
  const farRidge = { x: ridgeX, y: farLeft.y, z: ridgeHeight };

  return Object.freeze([
    surface(
      `${id}-left-pitch`,
      spatialPath([
        { x: nearLeft.x, y: nearLeft.y, z: eaveHeight },
        { x: farLeft.x, y: farLeft.y, z: eaveHeight },
        farRidge,
        nearRidge,
      ]),
      "structure.base",
      "line.primary",
      0,
    ),
    surface(
      `${id}-right-pitch`,
      spatialPath([
        nearRidge,
        farRidge,
        { x: farRight.x, y: farRight.y, z: eaveHeight },
        { x: nearRight.x, y: nearRight.y, z: eaveHeight },
      ]),
      "line.secondary",
      "line.primary",
      0,
    ),
    surface(
      `${id}-near-gable`,
      spatialPath([
        { x: nearLeft.x, y: nearLeft.y, z: eaveHeight },
        { x: nearRight.x, y: nearRight.y, z: eaveHeight },
        nearRidge,
      ]),
      "structure.shadow",
      "line.primary",
      0,
    ),
    surface(
      `${id}-far-gable`,
      spatialPath([
        { x: farLeft.x, y: farLeft.y, z: eaveHeight },
        { x: farRight.x, y: farRight.y, z: eaveHeight },
        farRidge,
      ]),
      "line.secondary",
      "line.primary",
      0,
    ),
  ]);
}

function facetedCap(
  id: string,
  plan: readonly PlanPoint[],
  eaveHeight: number,
  apex: SpatialPoint,
): readonly GeometryPrimitive[] {
  return Object.freeze(
    plan.map((start, index) => {
      const end = plan[(index + 1) % plan.length];
      return surface(
        `${id}-facet-${index + 1}`,
        spatialPath([
          { x: start.x, y: start.y, z: eaveHeight },
          { x: end.x, y: end.y, z: eaveHeight },
          apex,
        ]),
        index % 2 === 0 ? "structure.base" : "line.secondary",
        "line.primary",
        0,
      );
    }),
  );
}

function slopedWedgeCap(
  id: string,
  plan: readonly PlanPoint[],
  eaveHeight: number,
  highHeight: number,
): readonly GeometryPrimitive[] {
  if (plan.length !== 4) {
    throw new RangeError(`${id} wedge cap requires a four-point plan`);
  }
  const heights = [eaveHeight, eaveHeight, highHeight, highHeight] as const;
  const fascia = plan.flatMap((start, index) => {
    const endIndex = (index + 1) % plan.length;
    const end = plan[endIndex];
    const startHeight = heights[index];
    const endHeight = heights[endIndex];
    if (startHeight === eaveHeight && endHeight === eaveHeight) return [];
    return [
      surface(
        `${id}-fascia-${index + 1}`,
        spatialPath([
          { x: start.x, y: start.y, z: eaveHeight },
          { x: end.x, y: end.y, z: eaveHeight },
          { x: end.x, y: end.y, z: endHeight },
          { x: start.x, y: start.y, z: startHeight },
        ]),
        index % 2 === 0 ? "structure.shadow" : "line.secondary",
        "line.primary",
        0,
      ),
    ];
  });

  return Object.freeze([
    ...fascia,
    surface(
      `${id}-sloped-roof`,
      spatialPath(
        plan.map((point, index) => ({
          x: point.x,
          y: point.y,
          z: heights[index],
        })),
      ),
      "structure.base",
      "line.primary",
      0,
    ),
  ]);
}

function taperedShell(
  id: string,
  lowerPlan: readonly PlanPoint[],
  upperPlan: readonly PlanPoint[],
  lowerHeight: number,
  upperHeight: number,
): readonly GeometryPrimitive[] {
  if (lowerPlan.length !== upperPlan.length) {
    throw new RangeError(`${id} tapered shell plans must have equal point counts`);
  }
  const sides = lowerPlan.map((lowerStart, index) => {
    const nextIndex = (index + 1) % lowerPlan.length;
    const lowerEnd = lowerPlan[nextIndex];
    const upperEnd = upperPlan[nextIndex];
    const upperStart = upperPlan[index];
    return surface(
      `${id}-sloped-side-${index + 1}`,
      spatialPath([
        { x: lowerStart.x, y: lowerStart.y, z: lowerHeight },
        { x: lowerEnd.x, y: lowerEnd.y, z: lowerHeight },
        { x: upperEnd.x, y: upperEnd.y, z: upperHeight },
        { x: upperStart.x, y: upperStart.y, z: upperHeight },
      ]),
      index % 2 === 0 ? "structure.shadow" : "line.secondary",
      "line.primary",
      0,
    );
  });

  return Object.freeze([
    ...sides,
    surface(
      `${id}-top`,
      projectedPlanPath(upperPlan, upperHeight),
      "structure.base",
      "line.primary",
      0,
    ),
  ]);
}

function defineProject(input: ProjectDefinitionInput): GeometryDefinition {
  return Object.freeze({
    assetId: input.assetId,
    category: "project",
    geometryKey: input.geometryKey,
    masterGeometryHash: input.masterGeometryHash,
    primaryPathHash: input.primaryPathHash,
    primaryPath: input.primaryPath,
    footprint: Object.freeze(input.footprint),
    orientation: 0,
    projection: CAREER_WORLD_PROJECTION_ID,
    paletteSlots: PALETTE_SLOTS,
    primitives: Object.freeze(input.primitives),
  });
}

const kaizenAgentPrimaryPath = screenPath([
  { x: 157.6166, y: -15 }, { x: -31.1769, y: 94 }, { x: -143.7602, y: 33 },
  { x: -138.5641, y: -2 }, { x: -130.7698, y: -6.5 }, { x: -130.7698, y: -30.5 },
  { x: -94.3968, y: -51.5 }, { x: -78.8083, y: -42.5 }, { x: -27.7128, y: -72 },
  { x: -27.7128, y: -81 }, { x: -19.0526, y: -86 }, { x: -16.4545, y: -84.5 },
  { x: -16.4545, y: -101.5 }, { x: 19.9186, y: -122.5 }, { x: 38.1051, y: -112 },
  { x: 44.1673, y: -115.5 }, { x: 51.0955, y: -111.5 }, { x: 52.8275, y: -112.5 },
  { x: 106.5211, y: -81.5 }, { x: 106.5211, y: -72.5 }, { x: 111.7173, y: -69.5 },
  { x: 111.7173, y: -66.5 }, { x: 122.9756, y: -60 }, { x: 122.9756, y: -39 },
]);

const kaizenAgentFoundation = freezePlan([
  { x: -112, y: -76 },
  { x: 106, y: -76 },
  { x: 118, y: 56 },
  { x: 76, y: 82 },
  { x: -78, y: 82 },
  { x: -116, y: 50 },
]);

const kaizenAgentPrimitives = Object.freeze([
  surface(
    "kaizen-agent-foundation",
    projectedPlanPath(kaizenAgentFoundation),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion("kaizen-agent-rear-bar", rectPlan(0, -48, 150, 38), 56),
  extrusion("kaizen-agent-rear-crown", rectPlan(0, -48, 88, 38), 72),
  extrusion("kaizen-agent-left-bar", rectPlan(-66, 12, 42, 104), 42),
  extrusion("kaizen-agent-left-step", rectPlan(-66, -5, 34, 62), 55),
  extrusion("kaizen-agent-right-bar", rectPlan(66, 11, 42, 106), 47),
  extrusion("kaizen-agent-right-step", rectPlan(66, -9, 34, 62), 60),
  extrusion("kaizen-agent-transfer-bay", rectPlan(0, 13, 42, 44), 24),
  extrusion("kaizen-agent-rollback-vault", rectPlan(96, 34, 32, 54), 29),
  extrusion("kaizen-agent-front-post-left", rectPlan(-43, 64, 10, 12), 27),
  extrusion("kaizen-agent-front-post-right", rectPlan(43, 64, 10, 12), 27),
  surface(
    "kaizen-agent-front-gate",
    spatialPath([
      { x: -38, y: 64, z: 4 },
      { x: 38, y: 64, z: 4 },
      { x: 38, y: 64, z: 24 },
      { x: -38, y: 64, z: 24 },
    ]),
    "structure.shadow",
    "line.primary",
    0,
  ),
  ...elevatedSlab("kaizen-agent-gate-bridge", rectPlan(0, 9, 96, 12), 42, 50),
  stroke(
    "kaizen-agent-left-roof-seam",
    spatialPath([
      { x: -66, y: -34, z: 56 },
      { x: -66, y: 24, z: 56 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "kaizen-agent-right-roof-seam",
    spatialPath([
      { x: 66, y: -40, z: 61 },
      { x: 66, y: 25, z: 61 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "kaizen-agent-transfer-grid",
    screenPath([
      { x: -17, y: -35 },
      { x: 0, y: -45 },
      { x: 17, y: -35 },
      { x: 0, y: -25 },
      { x: -17, y: -35 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "kaizen-agent-inactive-gate-arm",
    screenPath([
      { x: -31, y: 21 },
      { x: 16, y: -6 },
    ], false),
    "accent.emissive",
    2,
  ),
]);

const vendyPrimaryPath = screenPath([
  { x: 173.2051, y: -16 }, { x: -46.7654, y: 105 }, { x: -155.0185, y: 47.5 },
  { x: -161.0807, y: -7 }, { x: -155.8846, y: -9.6111 }, { x: -155.8846, y: -18 },
  { x: -119.5115, y: -39 }, { x: -109.2221, y: -33.0594 }, { x: -90.9327, y: -42.25 },
  { x: -90.9327, y: -63.5 }, { x: -49.3634, y: -87.5 }, { x: -36.8061, y: -80.25 },
  { x: -36.8061, y: -83.75 }, { x: -25.5477, y: -90.25 }, { x: -11.5241, y: -82.1535 },
  { x: 25.9808, y: -101 }, { x: 39.4042, y: -95.8139 }, { x: 39.4042, y: -124.25 },
  { x: 84.4375, y: -150.25 }, { x: 133.8009, y: -121.75 }, { x: 133.8009, y: -59.344 },
  { x: 141.1621, y: -56.5 },
]);

const vendyApron = freezePlan([
  { x: -132, y: -78 },
  { x: 116, y: -84 },
  { x: 138, y: -25 },
  { x: 116, y: 86 },
  { x: -86, y: 100 },
  { x: -137, y: 42 },
]);

const vendyPrimitives = Object.freeze([
  surface(
    "vendy-equipment-apron",
    projectedPlanPath(vendyApron),
    "terrain.claim",
    "line.primary",
    0,
  ),
  ...recessedCut("vendy-sunken-dock", rectPlan(0, 25, 108, 68), -10, 1),
  extrusion("vendy-left-tower-base", rectPlan(-78, -24, 56, 62), 18),
  extrusion("vendy-left-tower", rectPlan(-78, -24, 38, 44), 104),
  extrusion("vendy-left-tower-cap", rectPlan(-78, -24, 48, 54), 113),
  extrusion("vendy-right-tower-base", rectPlan(82, -18, 62, 66), 19),
  extrusion("vendy-right-tower", rectPlan(82, -18, 44, 48), 82),
  extrusion("vendy-right-tower-cap", rectPlan(82, -18, 52, 57), 91),
  extrusion("vendy-gantry-hub-support", rectPlan(0, -3, 20, 22), 59),
  ...elevatedSlab("vendy-gantry-left", barPlan(-64, -22, -8, -3, 14), 61, 69),
  ...elevatedSlab("vendy-gantry-right", barPlan(8, -3, 67, -17, 14), 61, 69),
  ...elevatedSlab("vendy-gantry-stem", barPlan(0, 4, 0, 36, 13), 61, 69),
  extrusion("vendy-operator-kiosk", rectPlan(-74, 70, 42, 30), 23),
  stroke(
    "vendy-dock-panel-grid",
    screenPath([
      { x: -55, y: 28 },
      { x: -18, y: 47 },
      { x: 19, y: 28 },
      { x: 56, y: 47 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "vendy-gantry-rail",
    spatialPath([
      { x: -58, y: -18, z: 70 },
      { x: -8, y: -2, z: 70 },
      { x: 8, y: -2, z: 70 },
      { x: 62, y: -15, z: 70 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "vendy-empty-service-trolley",
    projectedPlanPath(rectPlan(0, 16, 8, 8), 69),
    "accent.emissive",
    2,
  ),
]);

const kaizenMetricsPrimaryPath = screenPath([
  { x: 184.4634, y: -24.5 }, { x: -43.3013, y: 107 }, { x: -158.4826, y: 48.5 },
  { x: -167.1429, y: 16.5 }, { x: -123.8125, y: -9.0577 }, { x: -117.7795, y: -21 },
  { x: -110.5966, y: -16.8529 }, { x: -92.8181, y: -27.3393 }, { x: -89.2006, y: -34.5 },
  { x: -84.8936, y: -32.0134 }, { x: -61.8237, y: -45.6208 }, { x: -60.6218, y: -48 },
  { x: -59.1908, y: -47.1738 }, { x: -6.9282, y: -78 }, { x: 27.2797, y: -89.75 },
  { x: 52.8275, y: -104.5 }, { x: 59.3158, y: -100.754 }, { x: 61.4878, y: -101.5 },
  { x: 64.0274, y: -99.9099 }, { x: 65.0209, y: -100.4835 }, { x: 84.0045, y: -103.4203 },
  { x: 102.988, y: -100.4836 }, { x: 116.8849, y: -92.4601 }, { x: 121.9715, y: -81.5 },
  { x: 121.9715, y: -64.5797 }, { x: 161.9467, y: -41.5 }, { x: 161.9467, y: -38.5986 },
]);

const kaizenMetricsFoundation = freezePlan([
  { x: -132, y: -82 },
  { x: 131, y: -82 },
  { x: 137, y: 66 },
  { x: 74, y: 82 },
  { x: -113, y: 80 },
  { x: -140, y: 43 },
]);

const kaizenMetricsIngestionPlans = Object.freeze([
  rectPlan(-89, 4, 28, 86),
  rectPlan(-59, -1, 28, 90),
  rectPlan(-29, -6, 28, 94),
  rectPlan(1, -11, 28, 98),
]);

const kaizenMetricsLightwellPlan = translatedPlan(
  regularPolygonPlan(8, 21, 22.5),
  48,
  42,
);

const kaizenMetricsPrimitives = Object.freeze([
  surface(
    "kaizen-metrics-lower-terrace",
    projectedPlanPath(kaizenMetricsFoundation),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion("kaizen-metrics-upper-terrace", rectPlan(4, -1, 238, 126), 12),
  ...kaizenMetricsIngestionPlans.flatMap((plan, index) => [
    extrusion(`kaizen-metrics-ingestion-bay-${index + 1}`, plan, 25),
    ...pitchedRoof(`kaizen-metrics-ingestion-bay-${index + 1}-roof`, plan, 25, 42),
  ]),
  extrusion("kaizen-metrics-compute-spine", rectPlan(-36, -57, 164, 24), 74),
  extrusion(
    "kaizen-metrics-query-reservoir",
    translatedPlan(regularPolygonPlan(12, 31, 15), 72, -25),
    58,
  ),
  extrusion("kaizen-metrics-assistant-lightwell-wall", kaizenMetricsLightwellPlan, 12),
  ...facetedCap(
    "kaizen-metrics-assistant-lightwell",
    kaizenMetricsLightwellPlan,
    12,
    { x: 48, y: 42, z: 36 },
  ),
  stroke(
    "kaizen-metrics-compute-modules",
    spatialPath([
      { x: -105, y: -57, z: 75 },
      { x: -82, y: -57, z: 75 },
      { x: -59, y: -57, z: 75 },
      { x: -36, y: -57, z: 75 },
      { x: -13, y: -57, z: 75 },
      { x: 10, y: -57, z: 75 },
      { x: 33, y: -57, z: 75 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "kaizen-metrics-reservoir-ring",
    projectedPlanPath(translatedPlan(regularPolygonPlan(12, 24, 15), 72, -25), 59),
    "line.secondary",
    1,
  ),
  stroke(
    "kaizen-metrics-maintenance-capsule",
    spatialPath([
      { x: 8, y: 16, z: 13 },
      { x: 30, y: 16, z: 13 },
      { x: 37, y: 23, z: 13 },
      { x: 30, y: 30, z: 13 },
      { x: 8, y: 30, z: 13 },
      { x: 1, y: 23, z: 13 },
    ]),
    "accent.emissive",
    2,
  ),
]);

const taniumPrimaryPath = screenPath([
  { x: -192.2576, y: 13 }, { x: -145.4923, y: -11.8684 }, { x: -145.4923, y: -43 },
  { x: -79.6743, y: -70 }, { x: -74.1798, y: -49.7903 }, { x: -68.416, y: -57.5 },
  { x: -1.7321, y: -85 }, { x: 10.3923, y: -56.4167 }, { x: 10.3923, y: -73 },
  { x: 77.0763, y: -99.5 }, { x: 148.5833, y: -130.7846 },
  { x: 166.3409, y: -92.5221 }, { x: 168.0089, y: -91 },
  { x: 168.0089, y: -88.9282 }, { x: 174.9371, y: -74 }, { x: 174.9371, y: -61 },
  { x: 168.0089, y: -62.0718 }, { x: 168.0089, y: 1 }, { x: 125.5737, y: 25.5 },
  { x: 105.3265, y: 7.6578 }, { x: 104.7891, y: 18.5 }, { x: 86.386, y: 2.125 },
  { x: 38.9711, y: 29.5 }, { x: 13.2502, y: -0.65 }, { x: -40.7032, y: 30.5 },
  { x: -47.3221, y: 22.8571 }, { x: -43.3013, y: 47 }, { x: -115.2968, y: 30.5667 },
  { x: -119.5115, y: 33 }, { x: -122.8953, y: 28.8323 },
]);

const taniumForecourt = freezePlan([
  { x: -124, y: 98 },
  { x: 22, y: 92 },
  { x: -72, y: -22 },
]);

const taniumTrench = freezePlan([
  { x: -61, y: 57 },
  { x: -34, y: 41 },
  { x: -19, y: 15 },
  { x: 7, y: 2 },
  { x: 17, y: -27 },
  { x: 44, y: -42 },
  { x: 51, y: -70 },
  { x: 64, y: -64 },
  { x: 59, y: -33 },
  { x: 34, y: -18 },
  { x: 24, y: 11 },
  { x: -2, y: 27 },
  { x: -18, y: 52 },
  { x: -47, y: 69 },
]);

const taniumLowerHallPlan = freezePlan([
  { x: -102, y: 36 },
  { x: -34, y: 36 },
  { x: -20, y: 72 },
  { x: -85, y: 83 },
]);

const taniumMiddleHallPlan = freezePlan([
  { x: -54, y: -7 },
  { x: 15, y: -7 },
  { x: 28, y: 30 },
  { x: -38, y: 41 },
]);

const taniumUpperHallPlan = freezePlan([
  { x: -7, y: -52 },
  { x: 62, y: -52 },
  { x: 75, y: -14 },
  { x: 10, y: -2 },
]);

const taniumTowerCanopy = translatedPlan(regularPolygonPlan(3, 48, -90), 74, -80);

const taniumPrimitives = Object.freeze([
  surface(
    "tanium-triangular-forecourt",
    projectedPlanPath(taniumForecourt),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion(
    "tanium-wedge-hall-lower",
    taniumLowerHallPlan,
    31,
  ),
  ...slopedWedgeCap("tanium-wedge-hall-lower-cap", taniumLowerHallPlan, 31, 44),
  extrusion(
    "tanium-wedge-hall-middle",
    taniumMiddleHallPlan,
    42,
  ),
  ...slopedWedgeCap("tanium-wedge-hall-middle-cap", taniumMiddleHallPlan, 42, 56),
  extrusion(
    "tanium-wedge-hall-upper",
    taniumUpperHallPlan,
    54,
  ),
  ...slopedWedgeCap("tanium-wedge-hall-upper-cap", taniumUpperHallPlan, 54, 69),
  ...recessedCut("tanium-zigzag-inspection-trench", taniumTrench, -9, 1),
  extrusion(
    "tanium-audit-tower",
    freezePlan([
      { x: 47, y: -98 },
      { x: 96, y: -98 },
      { x: 105, y: -58 },
      { x: 57, y: -50 },
    ]),
    92,
  ),
  ...elevatedSlab("tanium-cantilevered-audit-canopy", taniumTowerCanopy, 88, 101),
  stroke(
    "tanium-hall-roof-ridges",
    spatialPath([
      { x: -87, y: 52, z: 32 },
      { x: -39, y: 52, z: 32 },
      { x: -39, y: 8, z: 43 },
      { x: 8, y: 8, z: 43 },
      { x: 8, y: -37, z: 55 },
      { x: 55, y: -37, z: 55 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "tanium-recessed-inspection-lamp",
    spatialPath([
      { x: 45, y: -46, z: 2 },
      { x: 51, y: -52, z: 2 },
      { x: 57, y: -46, z: 2 },
      { x: 51, y: -40, z: 2 },
      { x: 45, y: -46, z: 2 },
    ], false),
    "accent.emissive",
    2,
  ),
]);

const uatPrimaryPath = screenPath([
  { x: 187.9275, y: -56.5 }, { x: -98.7269, y: 109 }, { x: -191.3916, y: 58.5 },
  { x: -174.0711, y: 48.5 }, { x: -174.0711, y: 5.5 }, { x: -129.0378, y: -20.5 },
  { x: -100.459, y: -4 }, { x: -93.5307, y: -8 }, { x: -85.7365, y: -3.5 },
  { x: -79.6743, y: -7 }, { x: -79.6743, y: -16 }, { x: -55.4256, y: -30 },
  { x: -47.6314, y: -25.5 }, { x: -41.5692, y: -29 }, { x: -41.5692, y: -38 },
  { x: -17.3205, y: -52 }, { x: -9.5263, y: -47.5 }, { x: -3.4641, y: -51 },
  { x: -3.4641, y: -60 }, { x: 20.7846, y: -74 }, { x: 28.5788, y: -69.5 },
  { x: 34.641, y: -73 }, { x: 34.641, y: -82 }, { x: 58.8897, y: -96 },
  { x: 66.6839, y: -91.5 }, { x: 75.9134, y: -96.8286 }, { x: 75.9134, y: -105.9879 },
  { x: 75.9134, y: -126.0121 }, { x: 100.438, y: -140.1714 }, { x: 135.1209, y: -140.1714 },
  { x: 159.6455, y: -126.0121 }, { x: 159.6455, y: -105.9879 }, { x: 159.6455, y: -78.0121 },
  { x: 159.6455, y: -75.9225 },
]);

const uatFoundation = freezePlan([
  { x: -166, y: -52 },
  { x: 165, y: -52 },
  { x: 174, y: 52 },
  { x: -169, y: 52 },
]);

const uatRightPavilionPlan = translatedPlan(regularPolygonPlan(8, 37, 22.5), 136, 0);
const uatMezzaninePlan = rectPlan(0, -5, 232, 14);

const uatPrimitives = Object.freeze([
  surface(
    "uat-validation-foundation",
    projectedPlanPath(uatFoundation),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion("uat-left-endpoint-pavilion", rectPlan(-139, 0, 52, 72), 59),
  extrusion("uat-right-endpoint-pavilion", uatRightPavilionPlan, 48),
  extrusion("uat-validation-chamber-1", rectPlan(-88, 14, 28, 40), 28),
  extrusion("uat-validation-chamber-2", rectPlan(-44, 14, 28, 40), 28),
  extrusion("uat-validation-chamber-3", rectPlan(0, 14, 28, 40), 28),
  extrusion("uat-validation-chamber-4", rectPlan(44, 14, 28, 40), 28),
  extrusion("uat-validation-chamber-5", rectPlan(88, 14, 28, 40), 28),
  ...elevatedSlab("uat-control-mezzanine", uatMezzaninePlan, 43, 51),
  surface(
    "uat-left-mezzanine-stair",
    spatialPath([
      { x: -116, y: 41, z: 0 },
      { x: -104, y: 41, z: 0 },
      { x: -104, y: 8, z: 43 },
      { x: -116, y: 8, z: 43 },
    ]),
    "structure.base",
    "line.primary",
    0,
  ),
  surface(
    "uat-right-mezzanine-stair",
    spatialPath([
      { x: 104, y: 41, z: 0 },
      { x: 116, y: 41, z: 0 },
      { x: 116, y: 8, z: 43 },
      { x: 104, y: 8, z: 43 },
    ]),
    "structure.base",
    "line.primary",
    0,
  ),
  stroke(
    "uat-mezzanine-rail",
    spatialPath([
      { x: -116, y: -11, z: 55 },
      { x: 116, y: -11, z: 55 },
    ], false),
    "line.secondary",
    1,
  ),
  ...[-88, -44, 0, 44, 88].map((centerX, index) =>
    stroke(
      `uat-chamber-${index + 1}-door`,
      spatialPath([
        { x: centerX - 7, y: 35, z: 3 },
        { x: centerX + 7, y: 35, z: 3 },
        { x: centerX + 7, y: 35, z: 20 },
        { x: centerX - 7, y: 35, z: 20 },
      ]),
      "line.secondary",
      1,
    ),
  ),
  stroke(
    "uat-empty-test-cart",
    spatialPath([
      { x: 16, y: 37, z: 2 },
      { x: 32, y: 37, z: 2 },
      { x: 34, y: 29, z: 2 },
      { x: 18, y: 29, z: 2 },
      { x: 16, y: 37, z: 2 },
    ], false),
    "accent.emissive",
    2,
  ),
]);

const cablecarCatenaryBoundaryArc = Object.freeze(
  Array.from({ length: 65 }, (_, index): ProjectedPoint => {
    const startT = 0.6744387931034483;
    const endT = 0.5225954035572307;
    const t = startT + ((endT - startT) * index) / 64;
    const inverseT = 1 - t;
    const traceEpsilon = index === 0 || index === 64 ? 0 : 0.0002;
    return {
      x: inverseT * inverseT * -58 + t * t * 58,
      y: inverseT * inverseT * -61 + 2 * inverseT * t * -48 + t * t * -61 + traceEpsilon,
    };
  }),
);

const cablecarPrimaryPath = screenPath([
  { x: -7.7942, y: 46.5 }, { x: -75.3442, y: 85.5 }, { x: -148.0903, y: 43.5 },
  { x: -135.1, y: 36 }, { x: -135.1, y: 22 }, { x: -124.2746, y: 15.75 },
  { x: -124.2746, y: -29.75 }, { x: -117.3464, y: -33.75 }, { x: -117.3464, y: -61.75 },
  { x: -80.9734, y: -82.75 }, { x: -41.5692, y: -60 }, { x: 40.6022, y: -107.4417 },
  { x: 40.6022, y: -123.0703 }, { x: 40.6022, y: -140.9297 }, { x: 46.2599, y: -144.1962 },
  { x: 46.2599, y: -152.4232 }, { x: 46.2599, y: -167.5767 }, { x: 64.819, y: -178.2918 },
  { x: 91.0656, y: -178.2918 }, { x: 109.6247, y: -167.5767 }, { x: 109.6247, y: -152.4232 },
  { x: 109.6247, y: -144.1962 }, { x: 115.2824, y: -140.9297 }, { x: 115.2824, y: -123.0703 },
  { x: 115.2824, y: -89.2446 }, { x: 125.4659, y: -83.3651 }, { x: 125.4659, y: -64.6801 },
  { x: 135.6497, y: -58.8005 }, { x: 135.6497, y: -31.1995 }, { x: 101.8455, y: -11.6826 },
  { x: 54.0391, y: -11.6826 }, { x: 20.2349, y: -31.1995 },
  ...cablecarCatenaryBoundaryArc,
  { x: -38.5381, y: -30.75 },
  { x: -38.5381, y: -30.25 }, { x: -31.6099, y: -26.25 }, { x: -31.6099, y: 19.75 },
  { x: -20.7846, y: 26 }, { x: -20.7846, y: 39 },
]);

const cablecarLeftBase = rectPlan(-90, 0, 62, 70);
const cablecarRightBase = translatedPlan(regularPolygonPlan(8, 42, 22.5), 90, 0);
const cablecarBridgePlan = rectPlan(0, 0, 132, 18);

const cablecarPrimitives = Object.freeze([
  surface(
    "cablecar-left-terminal-pad",
    projectedPlanPath(rectPlan(-90, 0, 78, 84)),
    "terrain.claim",
    "line.primary",
    0,
  ),
  surface(
    "cablecar-right-terminal-pad",
    projectedPlanPath(translatedPlan(regularPolygonPlan(8, 51, 22.5), 90, 0)),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion("cablecar-left-terminal-base", cablecarLeftBase, 21),
  ...taperedShell(
    "cablecar-left-terminal-taper",
    rectPlan(-90, 0, 56, 64),
    rectPlan(-90, 0, 32, 36),
    21,
    105,
  ),
  extrusion("cablecar-right-terminal-base", cablecarRightBase, 27),
  ...taperedShell(
    "cablecar-right-terminal-taper",
    translatedPlan(regularPolygonPlan(8, 38, 22.5), 90, 0),
    translatedPlan(regularPolygonPlan(8, 22, 22.5), 90, 0),
    27,
    115,
  ),
  ...elevatedSlab("cablecar-enclosed-service-bridge", cablecarBridgePlan, 62, 75),
  stroke(
    "cablecar-catenary-lower-chord",
    "M -58.0000 -61.0000 Q 0.0000 -48.0000 58.0000 -61.0000",
    "line.primary",
    0,
  ),
  stroke(
    "cablecar-maintenance-rail",
    "M -40.0000 -50.0000 Q 0.0000 -74.0000 40.0000 -97.0000",
    "line.secondary",
    1,
  ),
  stroke(
    "cablecar-static-pod",
    projectedPlanPath(freezePlan([
      { x: -10, y: -4 },
      { x: 0, y: -7 },
      { x: 10, y: -4 },
      { x: 10, y: 4 },
      { x: 0, y: 7 },
      { x: -10, y: 4 },
    ]), 76),
    "accent.emissive",
    2,
  ),
]);

const xsearchPrimaryPath = screenPath([
  { x: -2.0718, y: 93.1962 }, { x: -34.641, y: 112 }, { x: -189.6596, y: 35.5 },
  { x: 61.4878, y: -109.5 }, { x: 193.9897, y: -20 }, { x: 22.5167, y: 79 },
  { x: 22.5167, y: 97 },
]);

const xsearchFoundation = freezePlan([
  { x: -132, y: -92 },
  { x: 132, y: -92 },
  { x: 145, y: 74 },
  { x: -145, y: 74 },
]);

const xsearchFinLengths = Object.freeze([116, 101, 109, 91, 103, 83]);
const xsearchFinCenters = Object.freeze([-62, -37, -12, 13, 38, 63]);

const xsearchPrimitives = Object.freeze([
  surface(
    "xsearch-indexing-foundation",
    projectedPlanPath(xsearchFoundation),
    "terrain.claim",
    "line.primary",
    0,
  ),
  ...xsearchFinLengths.map((length, index) => {
    const centerY = -72 + length / 2;
    return extrusion(
      `xsearch-archive-fin-${index + 1}`,
      rectPlan(xsearchFinCenters[index], centerY, 18, length),
      24,
    );
  }),
  ...taperedShell(
    "xsearch-reading-tower",
    translatedPlan(regularPolygonPlan(3, 51, -90), -84, -59),
    translatedPlan(regularPolygonPlan(3, 24, -90), -84, -59),
    0,
    96,
  ),
  ...elevatedSlab("xsearch-query-bridge", rectPlan(0, -16, 154, 15), 34, 43),
  ...xsearchFinLengths.map((length, index) => {
    const centerY = -72 + length / 2;
    return stroke(
      `xsearch-fin-${index + 1}-spine`,
      spatialPath([
        { x: xsearchFinCenters[index], y: centerY - length / 2 + 5, z: 25 },
        { x: xsearchFinCenters[index], y: centerY + length / 2 - 5, z: 25 },
      ], false),
      "line.secondary",
      1,
    );
  }),
]);

const tmatchPrimaryPath = screenPath([
  { x: 84.8705, y: -49 }, { x: 84.8705, y: 49 }, { x: -84.8705, y: 49 },
  { x: -84.8705, y: -49 }, { x: -83.1384, y: -49 }, { x: -83.1384, y: -64 },
  { x: -77.9423, y: -68 }, { x: -76.2102, y: -69 }, { x: -75.3442, y: -68.5 },
  { x: -67.55, y: -73 }, { x: -65.8179, y: -72 }, { x: -64.0859, y: -76 },
  { x: -59.7558, y: -74.9568 }, { x: -61.4878, y: -80.5 }, { x: -48.281, y: -74.875 },
  { x: -47.6314, y: -74.8704 }, { x: -45.8993, y: -89.5 }, { x: -44.1673, y: -88.4333 },
  { x: -45.8993, y: -92.5 }, { x: -35.089, y: -88.2586 }, { x: -30.3109, y: -88.1667 },
  { x: -28.5788, y: -102.5 }, { x: -13.776, y: -100.784 }, { x: -8, y: -121 },
  { x: 7, y: -108 }, { x: 0.2209, y: -100.1779 }, { x: 38.9711, y: -98.5 },
  { x: 40.4905, y: -86.8041 }, { x: 42.8822, y: -86.7581 }, { x: 49.3634, y: -90.5 },
  { x: 56.2916, y: -86.5 }, { x: 56.2917, y: -86.5 }, { x: 56.2917, y: -86.4999 },
  { x: 82.2724, y: -71.5 }, { x: 82.2724, y: -49 },
]);

const tmatchDiamond = freezePlan([
  { x: 0, y: -98 },
  { x: 98, y: 0 },
  { x: 0, y: 98 },
  { x: -98, y: 0 },
]);

const tmatchLeftBase = freezePlan([
  { x: -8, y: -82 }, { x: -17, y: -48 }, { x: -5, y: -30 }, { x: -17, y: -12 },
  { x: -5, y: 8 }, { x: -17, y: 28 }, { x: -5, y: 48 }, { x: -8, y: 82 },
  { x: -86, y: 0 },
]);

const tmatchRightBase = freezePlan([
  { x: 8, y: -82 },
  { x: 86, y: 0 },
  { x: 8, y: 82 }, { x: 5, y: 48 }, { x: 17, y: 28 }, { x: 5, y: 8 },
  { x: 17, y: -12 }, { x: 5, y: -30 }, { x: 17, y: -48 },
]);

const tmatchSeamPlan = freezePlan([
  { x: -8, y: -82 }, { x: 8, y: -82 }, { x: 17, y: -48 }, { x: 5, y: -30 },
  { x: 17, y: -12 }, { x: 5, y: 8 }, { x: 17, y: 28 }, { x: 5, y: 48 },
  { x: 8, y: 82 }, { x: -8, y: 82 }, { x: -5, y: 48 }, { x: -17, y: 28 },
  { x: -5, y: 8 }, { x: -17, y: -12 }, { x: -5, y: -30 }, { x: -17, y: -48 },
]);

const tmatchPrimitives = Object.freeze([
  surface(
    "tmatch-diamond-foundation",
    projectedPlanPath(tmatchDiamond),
    "terrain.claim",
    "line.primary",
    0,
  ),
  extrusion("tmatch-left-lower-step", tmatchLeftBase, 31),
  extrusion("tmatch-right-lower-step", tmatchRightBase, 31),
  extrusion(
    "tmatch-left-middle-step",
    freezePlan([
      { x: -9, y: -62 }, { x: -16, y: -34 }, { x: -5, y: -17 },
      { x: -16, y: 0 }, { x: -5, y: 18 }, { x: -9, y: 62 },
      { x: -65, y: 0 },
    ]),
    54,
  ),
  extrusion(
    "tmatch-right-middle-step",
    freezePlan([
      { x: 9, y: -62 },
      { x: 65, y: 0 },
      { x: 9, y: 62 }, { x: 5, y: 18 }, { x: 16, y: 0 },
      { x: 5, y: -17 }, { x: 16, y: -34 },
    ]),
    54,
  ),
  extrusion(
    "tmatch-left-upper-step",
    freezePlan([
      { x: -10, y: -43 }, { x: -15, y: -22 }, { x: -4, y: -4 },
      { x: -15, y: 14 }, { x: -10, y: 43 },
      { x: -45, y: 0 },
    ]),
    76,
  ),
  extrusion(
    "tmatch-right-upper-step",
    freezePlan([
      { x: 10, y: -43 },
      { x: 45, y: 0 },
      { x: 10, y: 43 }, { x: 4, y: 14 }, { x: 15, y: -4 }, { x: 4, y: -22 },
    ]),
    76,
  ),
  extrusion("tmatch-rear-archive-fin", rectPlan(0, -69, 14, 38), 112),
  extrusion("tmatch-front-entry", rectPlan(0, 73, 18, 28), 25),
  ...recessedCut("tmatch-deep-zigzag-seam", tmatchSeamPlan, 23, 31),
  stroke(
    "tmatch-left-facade-rhythm",
    screenPath([
      { x: -73, y: -34 },
      { x: -51, y: -45 },
      { x: -31, y: -36 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "tmatch-right-facade-rhythm",
    screenPath([
      { x: 31, y: -36 },
      { x: 51, y: -45 },
      { x: 73, y: -34 },
    ], false),
    "line.secondary",
    1,
  ),
  stroke(
    "tmatch-alignment-pin-left",
    "M -4.0000 -72.0000 L -4.0000 -64.0000",
    "accent.emissive",
    2,
  ),
  stroke(
    "tmatch-alignment-pin-right",
    "M 4.0000 -58.0000 L 4.0000 -50.0000",
    "accent.emissive",
    2,
  ),
]);

export const PROJECT_GEOMETRY_DEFINITIONS_A = Object.freeze([
  defineProject({
    assetId: "project/kaizen-agent-platform@v1",
    geometryKey: "career-world/project/kaizen-agent-platform/master-v1",
    masterGeometryHash: "sha256:8d44e5441ab4d1c0b46b219553e66e67ef4c42898f4a8eac74a6961f4feb84d2",
    primaryPathHash: "sha256:a074bc19ba680a923ea6a14a5ea84d7747cd173be8318682c6046b3838c21c07",
    primaryPath: kaizenAgentPrimaryPath,
    footprint: { width: 236, depth: 164 },
    primitives: kaizenAgentPrimitives,
  }),
  defineProject({
    assetId: "project/vendy-vm-platform@v1",
    geometryKey: "career-world/project/vendy-vm-platform/master-v1",
    masterGeometryHash: "sha256:6db6dcedbe6cb534140687e7f42696e2b368d66ab575fa697043ecbf37542d15",
    primaryPathHash: "sha256:c6042a192744482cd843885f2cbf3ab17bc66b44696f6c0188fc0092fa088a14",
    primaryPath: vendyPrimaryPath,
    footprint: { width: 276, depth: 200 },
    primitives: vendyPrimitives,
  }),
  defineProject({
    assetId: "project/kaizen-metrics@v1",
    geometryKey: "career-world/project/kaizen-metrics/master-v1",
    masterGeometryHash: "sha256:2e2381dc7a7b621fedd7b0e0e186c8e22fcd4d9c92b2418e01e9ad7ce8747947",
    primaryPathHash: "sha256:9ca4bd1436856de56e2947b31800c10395283865bfb8e1928e07fa72e05e80ec",
    primaryPath: kaizenMetricsPrimaryPath,
    footprint: { width: 280, depth: 164 },
    primitives: kaizenMetricsPrimitives,
  }),
  defineProject({
    assetId: "project/tanium-risk-assessment@v1",
    geometryKey: "career-world/project/tanium-risk-assessment/master-v1",
    masterGeometryHash: "sha256:107b90acb35e1fae118c7a2e87c958e8f428a7defab3f01745c193e11f9e2bc4",
    primaryPathHash: "sha256:b1c786ba69f5b64b4c1b00e93459631ca83cde9a3019e7a2f14f9efed9bbc9c8",
    primaryPath: taniumPrimaryPath,
    footprint: { width: 248, depth: 196 },
    primitives: taniumPrimitives,
  }),
  defineProject({
    assetId: "project/uat-automation@v1",
    geometryKey: "career-world/project/uat-automation/master-v1",
    masterGeometryHash: "sha256:0d921daa912e4ad28d6f16d575407474e6c37a5ef0bdd5b26a41b1d2636c9d81",
    primaryPathHash: "sha256:b63f5808cf836f71770c4d3c80aba64340fac915d3f731d489d25d42dc191470",
    primaryPath: uatPrimaryPath,
    footprint: { width: 348, depth: 104 },
    primitives: uatPrimitives,
  }),
  defineProject({
    assetId: "project/cablecar@v1",
    geometryKey: "career-world/project/cablecar/master-v1",
    masterGeometryHash: "sha256:6e11183b43cdb32f528f1a53fa94b6da24de3f27a7c25f5fa4111016e61a54b8",
    primaryPathHash: "sha256:8f04d6f924bf00aec11a10ff58fcb8472bdfdee32ecbe88ecd119cd5bf0bc014",
    primaryPath: cablecarPrimaryPath,
    footprint: { width: 274.2359, depth: 94.2359 },
    primitives: cablecarPrimitives,
  }),
  defineProject({
    assetId: "project/xsearch@v1",
    geometryKey: "career-world/project/xsearch/master-v1",
    masterGeometryHash: "sha256:20e78f0318e9939cec712b189acf4a27d34cc4f311f20c8781c9d4a48b7f2dcf",
    primaryPathHash: "sha256:f9c24aabe596f0d78ab5461ff3abd0d562b20adcef37bc5e430080d94484fc7f",
    primaryPath: xsearchPrimaryPath,
    footprint: { width: 290, depth: 220 },
    primitives: xsearchPrimitives,
  }),
  defineProject({
    assetId: "project/tmatch-eolmatch@v1",
    geometryKey: "career-world/project/tmatch-eolmatch/master-v1",
    masterGeometryHash: "sha256:334c4f3de61430690a45b4619bc0a4fdcb2064d8058fedc7f11903d2d560ab87",
    primaryPathHash: "sha256:f6c76916ccfe95b31a82e8f7a9d46d400324a918cef5aeb6439cb15de9137c0a",
    primaryPath: tmatchPrimaryPath,
    footprint: { width: 196, depth: 196 },
    primitives: tmatchPrimitives,
  }),
] satisfies readonly GeometryDefinition[]);
