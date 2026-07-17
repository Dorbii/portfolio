import { PALETTE_SLOTS } from "../geometry/palettes";
import {
  CAREER_WORLD_PROJECTION,
  roundProjectionCoordinate,
} from "../geometry/projection";
import {
  projectedPlanPath,
  rectangularPlan,
  regularPolygonPlan,
  svgPathFromProjectedPoints,
} from "../geometry/primitives";
import type {
  DetailTier,
  ExtrusionPrimitive,
  GeometryDefinition,
  GeometryPrimitive,
  PaletteSlot,
  PlanPoint,
  ProjectedPoint,
  StrokePrimitive,
  SurfacePrimitive,
} from "../geometry/types";

type Coordinate = readonly [x: number, y: number];

type SkillDefinitionInput = Readonly<{
  assetId: `skill/${string}@v1`;
  geometryKey: `career-world/${string}/master-v1`;
  masterGeometryHash: `sha256:${string}`;
  primaryPathHash: `sha256:${string}`;
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

function translatePlan(
  plan: readonly PlanPoint[],
  x: number,
  y: number,
): readonly PlanPoint[] {
  return freezePlan(plan.map((point) => ({ x: point.x + x, y: point.y + y })));
}

function boxPlan(
  width: number,
  depth: number,
  x = 0,
  y = 0,
): readonly PlanPoint[] {
  return translatePlan(rectangularPlan(width, depth), x, y);
}

function polygonPlan(
  points: readonly Coordinate[],
): readonly PlanPoint[] {
  return freezePlan(points.map(([x, y]) => ({ x, y })));
}

function regularPlan(
  sides: number,
  radius: number,
  x = 0,
  y = 0,
  rotationDegrees = 0,
): readonly PlanPoint[] {
  return translatePlan(regularPolygonPlan(sides, radius, rotationDegrees), x, y);
}

function orientedBoxPlan(
  length: number,
  width: number,
  x: number,
  y: number,
  rotationDegrees: number,
): readonly PlanPoint[] {
  const rotation = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return freezePlan(
    rectangularPlan(length, width).map((point) => ({
      x: point.x * cosine - point.y * sine + x,
      y: point.x * sine + point.y * cosine + y,
    })),
  );
}

function projectedPoints(points: readonly Coordinate[]): readonly ProjectedPoint[] {
  return Object.freeze(
    points.map(([x, y]) => Object.freeze({ x, y })),
  );
}

function screenPath(points: readonly Coordinate[]): string {
  return svgPathFromProjectedPoints(projectedPoints(points));
}

function openScreenPath(points: readonly Coordinate[]): string {
  return svgPathFromProjectedPoints(projectedPoints(points), false);
}

function compoundScreenPath(...rings: readonly (readonly Coordinate[])[]): string {
  return rings.map(screenPath).join(" ");
}

function extrusion(
  id: string,
  plan: readonly PlanPoint[],
  height: number,
): ExtrusionPrimitive {
  return Object.freeze({
    type: "extrusion",
    id,
    plan,
    height,
    top: "structure.base",
    litSide: "line.secondary",
    shadowSide: "structure.shadow",
    stroke: "line.primary",
    detailTier: 0,
  });
}

function surface(
  id: string,
  path: string,
  fill: PaletteSlot,
  detailTier: DetailTier,
  strokeSlot: PaletteSlot = "line.primary",
): SurfacePrimitive {
  return Object.freeze({
    type: "surface",
    id,
    path,
    fill,
    stroke: strokeSlot,
    detailTier,
  });
}

function stroke(
  id: string,
  path: string,
  detailTier: DetailTier,
  strokeSlot: PaletteSlot = "line.secondary",
): StrokePrimitive {
  return Object.freeze({
    type: "stroke",
    id,
    path,
    stroke: strokeSlot,
    detailTier,
  });
}

function skillDefinition(input: SkillDefinitionInput): GeometryDefinition {
  return Object.freeze({
    assetId: input.assetId,
    category: "skill",
    geometryKey: input.geometryKey,
    masterGeometryHash: input.masterGeometryHash,
    primaryPathHash: input.primaryPathHash,
    primaryPath: input.primaryPath,
    footprint: Object.freeze(input.footprint),
    orientation: 0,
    projection: CAREER_WORLD_PROJECTION.id,
    paletteSlots: PALETTE_SLOTS,
    primitives: Object.freeze(input.primitives),
  });
}

const manifestPrimaryPath = screenPath([
  [-0.25, -32.25],
  [0.25, -32.5],
  [8.5, -27.75],
  [9, -26.25],
  [11.75, -23.5],
  [15.75, -21.5],
  [16.5, -19.75],
  [34, -10],
  [35, -9.25],
  [35.25, -7],
  [40.25, -4.25],
  [40, -3.5],
  [34.25, 0],
  [35, 0.25],
  [35, 2],
  [36.75, 4],
  [38.25, 3.5],
  [43.75, 6.75],
  [43.5, 13],
  [45.5, 15.75],
  [45.25, 16.5],
  [40.25, 14.25],
  [38, 15.5],
  [34, 13],
  [32.75, 13.5],
  [31, 12.5],
  [30.75, 5],
  [28.75, 2.75],
  [27, 3.75],
  [27, 10.25],
  [26.5, 10.75],
  [24.75, 11.5],
  [23, 10.5],
  [22.75, 6.5],
  [22.25, 6.5],
  [-7, 23.5],
  [-40.25, 4.25],
  [-40, 3.5],
  [-35, 0.75],
  [-34.75, -1.5],
  [-25.25, -6.75],
  [-25, -10],
  [-17.75, -13.75],
  [-17.75, -18.25],
  [-10.75, -22.25],
  [-10.5, -26.5],
]);

const manifestV3 = skillDefinition({
  assetId: "skill/manifest-v3@v1",
  geometryKey: "career-world/skill/manifest-v3/master-v1",
  masterGeometryHash: "sha256:186f11c0e13f500cbf63ac71b970ccb3e315050f37f30137452324bbcb92d013",
  primaryPathHash: "sha256:4880e96c03eaa8475d4a167a611b4f8ec7b82f84d9838d9851eac20136bb079f",
  primaryPath: manifestPrimaryPath,
  footprint: { width: 94, depth: 60 },
  primitives: [
    surface("sorting-pad", projectedPlanPath(boxPlan(54, 38)), "terrain.claim", 0),
    extrusion("sorting-hall", boxPlan(48, 32), 5),
    extrusion("ledger-tier-lower", boxPlan(32, 23, -1, 0), 12),
    extrusion("ledger-tier-middle", boxPlan(22, 16, -1, 0), 20),
    extrusion("ledger-cap", boxPlan(12, 10, -1, 0), 27),
    extrusion("ramp-support-upper", boxPlan(2, 2, 1.8, -17.8), 24.4),
    extrusion("ramp-support-middle", boxPlan(2, 2, 4.4, -24.4), 17.9),
    extrusion("ramp-support-lower", boxPlan(2, 2, 7, -31), 11.4),
    extrusion("ramp-terminal-footing", boxPlan(6, 6, 10, -34), 5),
    surface(
      "verification-ramp",
      screenPath([
        [7, -27],
        [10, -25],
        [39, 7],
        [35, 10],
      ]),
      "structure.base",
      0,
    ),
    stroke(
      "ramp-rails",
      `${openScreenPath([[7, -28], [37, 7]])} ${openScreenPath([[10, -25], [40, 8]])}`,
      0,
      "line.primary",
    ),
    surface(
      "ramp-ground-stairs",
      screenPath([
        [35, 8],
        [42, 11],
        [45, 16],
        [38, 13],
      ]),
      "structure.base",
      0,
    ),
    stroke(
      "tier-facade-rhythm",
      `${openScreenPath([[-18, -7], [-7, -13], [5, -7]])} ${openScreenPath([[-12, -17], [-3, -21], [7, -17]])}`,
      1,
    ),
    stroke(
      "ledger-seams",
      `${openScreenPath([[-24, 3], [0, 15], [24, 3]])} ${openScreenPath([[-8, -26], [0, -30], [8, -26]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const javaPrimaryPath = screenPath([
  [-43.3013, 3],
  [-37.2391, -2.5],
  [-7.7942, -24],
  [0, -28.5],
  [23.3827, -29.5],
  [38.9711, -20.5],
  [43.3013, -7],
  [43.3013, -5],
  [35, 8],
  [14, 20],
  [-8.6603, 25],
  [-23.3827, 22.5],
  [-38.9711, 13.5],
  [-43.3013, 5],
]);

const java = skillDefinition({
  assetId: "skill/java@v1",
  geometryKey: "career-world/skill/java/master-v1",
  masterGeometryHash: "sha256:e1c23da0f3d0a7b77595cd969d74506cd42c6b59e4edf17ad5236742a3fc8a60",
  primaryPathHash: "sha256:bccd03711d3a3d572dacc196f903ee89325fa8f8191541640a06475bf6299d33",
  primaryPath: javaPrimaryPath,
  footprint: { width: 92, depth: 54 },
  primitives: [
    extrusion("runtime-plinth", boxPlan(60, 40), 2),
    extrusion("runtime-hall", boxPlan(46, 28), 5),
    extrusion("west-cross-wing", boxPlan(14, 18, -29, 0), 7),
    extrusion("east-cross-wing", boxPlan(14, 18, 29, 0), 7),
    extrusion("service-tower-base", regularPlan(8, 9, 0, 0, 22.5), 13),
    extrusion("service-tower-cap", boxPlan(9, 9), 24),
    extrusion("colonnade-front-west-03", boxPlan(2, 2, -24, 17), 6),
    extrusion("colonnade-front-west-02", boxPlan(2, 2, -16, 17), 6),
    extrusion("colonnade-front-west-01", boxPlan(2, 2, -8, 17), 6),
    extrusion("colonnade-front-center", boxPlan(2, 2, 0, 17), 6),
    extrusion("colonnade-front-east-01", boxPlan(2, 2, 8, 17), 6),
    extrusion("colonnade-front-east-02", boxPlan(2, 2, 16, 17), 6),
    extrusion("colonnade-front-east-03", boxPlan(2, 2, 24, 17), 6),
    extrusion("colonnade-west-north", boxPlan(2, 2, -26, -10), 6),
    extrusion("colonnade-west-center", boxPlan(2, 2, -26, 0), 6),
    extrusion("colonnade-west-south", boxPlan(2, 2, -26, 10), 6),
    extrusion("colonnade-east-north", boxPlan(2, 2, 26, -10), 6),
    extrusion("colonnade-east-center", boxPlan(2, 2, 26, 0), 6),
    extrusion("colonnade-east-south", boxPlan(2, 2, 26, 10), 6),
    stroke(
      "perimeter-colonnade",
      `${projectedPlanPath(boxPlan(56, 36), 4)} ${openScreenPath([[-34, 2], [-29, 5], [-24, 8], [-19, 11], [-14, 14], [-9, 17]])} ${openScreenPath([[9, 17], [14, 14], [19, 11], [24, 8], [29, 5], [34, 2]])}`,
      0,
      "line.primary",
    ),
    stroke(
      "perimeter-column-rhythm",
      `${openScreenPath([[-35, 8], [-35, 0]])} ${openScreenPath([[-28, 12], [-28, 4]])} ${openScreenPath([[-21, 16], [-21, 8]])} ${openScreenPath([[-14, 20], [-14, 12]])} ${openScreenPath([[14, 20], [14, 12]])} ${openScreenPath([[21, 16], [21, 8]])} ${openScreenPath([[28, 12], [28, 4]])} ${openScreenPath([[35, 8], [35, 0]])}`,
      0,
      "line.primary",
    ),
    stroke(
      "hall-bay-seams",
      `${openScreenPath([[-24, -4], [0, 8], [24, -4]])} ${openScreenPath([[-20, 1], [0, 11], [20, 1]])}`,
      1,
    ),
    stroke(
      "tower-service-lines",
      `${openScreenPath([[-4, -25], [0, -28], [4, -25]])} ${openScreenPath([[0, -28], [0, -25]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const aiPrimaryPath = screenPath([
  [16.25, -32.25],
  [27.5, -26.25],
  [28, -25.75],
  [28, -19.25],
  [41.75, -11.5],
  [42, -8.75],
  [27.75, -0.75],
  [27.25, 0.5],
  [21.25, 4.5],
  [18.25, 4.75],
  [-15.5, 24.5],
  [-42, 9.25],
  [-41.75, 6.5],
  [-27, -1.75],
  [-26.75, -4],
  [-24, -5.5],
  [-24, -6],
  [-27.25, -6.5],
  [-33.5, -11.75],
  [-31.5, -18.25],
  [-26.25, -24.5],
  [-3.75, -19.25],
  [-4.25, -22.5],
  [1.25, -20.5],
  [1.5, -24],
]);

const ai = skillDefinition({
  assetId: "skill/ai@v1",
  geometryKey: "career-world/skill/ai/master-v1",
  masterGeometryHash: "sha256:2cf1e0f96fbf8e1bef9a998987f37934629583abc8eec056a86a3a5ec0828969",
  primaryPathHash: "sha256:7fbdcb21424c627b8c329917ccc033729bcebe186f596fe5a29e2724d0f16d59",
  primaryPath: aiPrimaryPath,
  footprint: { width: 88, depth: 54 },
  primitives: [
    extrusion("calibration-pad", boxPlan(66, 30), 2),
    extrusion("west-cradle", boxPlan(9, 14, -20, -1), 13),
    extrusion("east-cradle", boxPlan(8, 12, 17, -1), 10),
    surface(
      "faceted-calibration-drum",
      screenPath([
        [-31, -18],
        [-26, -24],
        [22, -13],
        [29, -7],
        [27, 0],
        [21, 4],
        [-27, -7],
        [-33, -12],
      ]),
      "structure.base",
      0,
    ),
    surface(
      "measurement-gallery",
      screenPath([
        [-4, -22],
        [1, -20],
        [9, 3],
        [4, 5],
      ]),
      "line.secondary",
      0,
    ),
    extrusion("service-annex", boxPlan(17, 13, 26, 9), 7),
    stroke(
      "drum-facets",
      `${openScreenPath([[-24, -21], [-25, -8]])} ${openScreenPath([[20, -12], [19, 1]])} ${openScreenPath([[-2, -17], [-3, -4]])}`,
      1,
    ),
    stroke(
      "gallery-measurement-seams",
      `${openScreenPath([[-1, -17], [6, 2]])} ${openScreenPath([[2, -18], [9, 1]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const vmwarePrimaryPath = screenPath([
  [-37.2391, -0.5],
  [-31.1769, -16],
  [-27.7128, -18.5],
  [4.3301, -37],
  [25.9808, -24.5],
  [32.0429, -16.5],
  [37.2391, -7.5],
  [37.2391, -3.5],
  [24, 7],
  [8, 16],
  [-6.0622, 21.5],
  [-19.0526, 17],
  [-31.1769, 10],
  [-37.2391, 3.5],
]);

const vmware = skillDefinition({
  assetId: "skill/vmware@v1",
  geometryKey: "career-world/skill/vmware/master-v1",
  masterGeometryHash: "sha256:932f3bcc9eaec25e569396ebcd3b80c0c796943a57ff4b9b92f98cfeed439bef",
  primaryPathHash: "sha256:7455b689602228e48e48db1f3b5e273e6ab180cee3d1f121a44a639febb7185c",
  primaryPath: vmwarePrimaryPath,
  footprint: { width: 80, depth: 48 },
  primitives: [
    extrusion("physical-base", boxPlan(50, 36), 4),
    extrusion("lower-machine-floor", boxPlan(40, 28, 2, -1), 13),
    extrusion("upper-machine-floor", boxPlan(37, 25, -2, -1), 23),
    extrusion("exposed-side-core", boxPlan(8, 14, -24, 1), 26),
    surface(
      "recessed-service-court",
      projectedPlanPath(boxPlan(20, 8, 4, 13), 4),
      "terrain.claim",
      0,
    ),
    stroke(
      "floor-supports",
      `${openScreenPath([[-23, 7], [-23, -7]])} ${openScreenPath([[-8, 16], [-8, 1]])} ${openScreenPath([[8, 16], [8, 0]])} ${openScreenPath([[24, 7], [24, -8]])}`,
      0,
      "line.primary",
    ),
    stroke(
      "machine-floor-bands",
      `${openScreenPath([[-24, -7], [3, 7], [27, -7]])} ${openScreenPath([[-21, -18], [2, -6], [23, -18]])}`,
      1,
    ),
    stroke(
      "side-core-conduits",
      `${openScreenPath([[-29, -16], [-29, 5]])} ${openScreenPath([[-26, -18], [-26, 4]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const macstadiumPrimaryPath = compoundScreenPath(
  [
    [-44.1673, 6.5],
    [-35.9401, -0.75],
    [10.3923, -34.5],
    [19.9186, -40],
    [31.1769, -33.5],
    [44.1673, -12.5],
    [44.1673, -9.5],
    [-16.4545, 25.5],
    [-44.1673, 9.5],
  ],
  [
    [40.25, -11],
    [45, -8.5],
    [45, -7],
    [42.75, -5.75],
    [42.75, 0.75],
    [42.25, 1.25],
    [38.75, 3],
    [35.25, 1],
    [34.75, -1.25],
    [25.5, 4.25],
    [25.5, 10.75],
    [24.5, 11.5],
    [21.5, 13],
    [17.75, 10.75],
    [17.5, 8.75],
    [8.25, 14.25],
    [8, 21],
    [4.25, 23],
    [0.5, 20.75],
    [0.5, 15.75],
    [-1.75, 14.5],
    [-1.5, 12.75],
  ],
);

const macstadium = skillDefinition({
  assetId: "skill/macstadium@v1",
  geometryKey: "career-world/skill/macstadium/master-v1",
  masterGeometryHash: "sha256:686a6f767541d8e666df2046ae4cefc172e5f94c731eb5c39ed221cbf4766a11",
  primaryPathHash: "sha256:3dd4d802817ba14bde95266ff0eeecbc37e4fcef0dd7cd4b997d8e683c341b9f",
  primaryPath: macstadiumPrimaryPath,
  footprint: { width: 94, depth: 58 },
  primitives: [
    extrusion("deep-plinth", boxPlan(70, 32), 3),
    extrusion("managed-compute-hall", boxPlan(54, 21, -4, 0), 11),
    extrusion("raised-end-tower", boxPlan(11, 13, 24, 0), 22),
    extrusion("bridge-west-pier", boxPlan(4, 4, -18, -23), 7),
    extrusion("bridge-center-pier", boxPlan(4, 4, 2, -23), 7),
    extrusion("bridge-east-pier", boxPlan(4, 4, 22, -23), 7),
    surface(
      "parallel-utility-bridge",
      projectedPlanPath(boxPlan(48, 5, 2, -23), 7),
      "structure.base",
      0,
    ),
    stroke(
      "bridge-rails",
      projectedPlanPath(boxPlan(48, 5, 2, -23), 8),
      0,
      "line.primary",
    ),
    stroke(
      "service-bay-rhythm",
      `${openScreenPath([[-31, 4], [-25, 7], [-19, 10], [-13, 13], [-7, 14], [-1, 15]])} ${openScreenPath([[5, 14], [11, 11], [17, 8], [23, 5]])}`,
      1,
    ),
    stroke(
      "roof-service-seams",
      `${openScreenPath([[-13, -13], [-8, -9], [4, -15]])} ${openScreenPath([[-6, -17], [2, -11], [14, -17]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const electronFrameOuter: readonly Coordinate[] = [
  [-28, 15],
  [-28, -18],
  [-22, -27],
  [21, -27],
  [28, -19],
  [28, 15],
  [21, 21],
  [-21, 21],
];
const electronFrameInner: readonly Coordinate[] = [
  [-17, 11],
  [-12, 15],
  [12, 15],
  [18, 10],
  [18, -14],
  [13, -19],
  [-13, -19],
  [-18, -13],
];
const electronFramePath = compoundScreenPath(
  electronFrameOuter,
  [...electronFrameInner].reverse(),
);
const electronPrimaryPath = screenPath([
  [-0.25, -28.25],
  [0.25, -28.5],
  [0.5, -27.5],
  [21.25, -27.5],
  [28.5, -19.25],
  [28.5, -14],
  [36.75, -9.25],
  [36.75, -5.75],
  [28.5, -1],
  [28.5, 15.25],
  [21.25, 21.5],
  [-21.25, 21.5],
  [-28.5, 15.25],
  [-28.75, 10.75],
  [-36.75, 6.25],
  [-36.75, 2.75],
  [-28.5, -2],
  [-28.5, -18.25],
  [-22.25, -27.5],
  [-0.5, -27.5],
]);

const electron = skillDefinition({
  assetId: "skill/electron@v1",
  geometryKey: "career-world/skill/electron/master-v1",
  masterGeometryHash: "sha256:cbafdba39c730b56edd9dc3cc15cc0171fb15cc4b2ba1ac758c3f071b346b706",
  primaryPathHash: "sha256:fdd06aa8537c9ab51cdeb5098629f167dc90a45431493d9d79f57491bdf68c58",
  primaryPath: electronPrimaryPath,
  footprint: { width: 78, depth: 60 },
  primitives: [
    extrusion("desktop-base-slab", boxPlan(54, 30), 3),
    surface("outer-workspace-frame", electronFramePath, "structure.base", 0),
    extrusion("inner-workspace-volume", boxPlan(25, 18, 0, 1), 13),
    stroke(
      "workspace-cradle",
      `${openScreenPath([[-8, -18], [-4, -23], [4, -23], [8, -18]])} ${openScreenPath([[0, -23], [0, -28]])}`,
      0,
      "line.primary",
    ),
    stroke(
      "frame-joints",
      `${openScreenPath([[-27, -11], [-18, -11]])} ${openScreenPath([[18, -11], [27, -11]])} ${openScreenPath([[-14, 19], [-14, 14]])} ${openScreenPath([[14, 19], [14, 14]])}`,
      1,
    ),
    stroke(
      "workspace-panel-seams",
      `${openScreenPath([[-11, -3], [0, 3], [11, -3]])} ${openScreenPath([[0, 3], [0, 13]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const informaticaPrimaryPath = screenPath([
  [-19.5, -31.5],
  [-8, -25.25],
  [-7.75, -21.25],
  [-5, -23],
  [5, -23],
  [11.75, -19],
  [11.75, -14.75],
  [21.5, -20.25],
  [21.75, -24.5],
  [29.75, -29.25],
  [38, -24.5],
  [38, -17],
  [37.5, -16.5],
  [30, -12.25],
  [27.75, -13.25],
  [11.75, -4],
  [11.75, 3],
  [5, 7],
  [2, 7.25],
  [0.75, 10.5],
  [7, 14],
  [7, 21.5],
  [-9.75, 31.25],
  [-22.5, 24],
  [-22.5, 16.5],
  [-9, 8.75],
  [-7.75, 5.25],
  [-10, 3.75],
  [-28.75, 6],
  [-41.5, 13.5],
  [-54, 6.25],
  [-54, -1.25],
  [-38.25, -10.5],
  [-27.5, -4.25],
  [-12.75, -6.25],
  [-18.75, -11.25],
  [-22.25, -9.25],
  [-33.75, -16],
  [-33.75, -23.5],
]);

const informatica = skillDefinition({
  assetId: "skill/informatica@v1",
  geometryKey: "career-world/skill/informatica/master-v1",
  masterGeometryHash: "sha256:b0693e6281a2a967c7db1ee3f2c269c7d154f489ab6010b02e167f8262979387",
  primaryPathHash: "sha256:d8928454880914e6df533bd5f1237b2f0fdd87ad1cb7e271ca0297389bdb0f42",
  primaryPath: informaticaPrimaryPath,
  footprint: { width: 114, depth: 68 },
  primitives: [
    extrusion("transformation-chamber", regularPlan(8, 10, 0, 0, 22.5), 16),
    extrusion("northwest-intake-hall", boxPlan(19, 14, -27, -18), 7),
    extrusion("southwest-intake-hall", boxPlan(18, 14, -28, 18), 7),
    extrusion("south-intake-hall", boxPlan(16, 13, 5, 29), 7),
    extrusion("northwest-corridor", orientedBoxPlan(24, 6, -15, -10, 31), 5),
    extrusion("southwest-corridor", orientedBoxPlan(24, 6, -15, 10, -31), 5),
    extrusion("south-corridor", orientedBoxPlan(20, 6, 3, 16, 83), 5),
    extrusion("exit-corridor", boxPlan(22, 5, 19, 0), 5),
    extrusion("single-exit-dock", boxPlan(9, 9, 34.5, 0), 7),
    stroke(
      "corridor-center-seams",
      `${openScreenPath([[-33, -4], [-9, -5]])} ${openScreenPath([[-7, 13], [-1, 2]])} ${openScreenPath([[2, 20], [1, 7]])} ${openScreenPath([[8, -10], [25, -19]])}`,
      1,
    ),
    stroke(
      "chamber-panel-band",
      screenPath([[-10, -10], [0, -15], [10, -10], [10, 0], [0, 5], [-10, 0]]),
      2,
      "accent.emissive",
    ),
  ],
});

const atlassianChevronPlan = polygonPlan([
  [-34, 20],
  [-14, -13],
  [0, -3],
  [15, -15],
  [36, 18],
  [28, 29],
  [1, 7],
  [-25, 30],
]);
const atlassianPrimaryPath = screenPath([
  [-1, -35.75],
  [16, -34.25],
  [26.5, -7],
  [26.5, 0],
  [26, 0.5],
  [14.75, 1],
  [11.75, 2],
  [18.25, 5.5],
  [18.5, 6.25],
  [0.25, 17.5],
  [-6.75, 13],
  [-47.25, 7.25],
  [-47.75, 0.75],
  [-50.75, -1],
  [-50.75, -5],
  [-48, -6.75],
  [-47.75, -10],
  [-42.25, -10],
  [-40.75, -10.75],
  [-1.75, -33.25],
]);

const atlassian = skillDefinition({
  assetId: "skill/atlassian@v1",
  geometryKey: "career-world/skill/atlassian/master-v1",
  masterGeometryHash: "sha256:8e42a8446b21f42320810af1e4a25a312f6c5f52de74f013cdbd4518cb8d4af2",
  primaryPathHash: "sha256:67116c1be87453a76df5ee8239267ed97c71f36799c963c83e5a1575ec501c89",
  primaryPath: atlassianPrimaryPath,
  footprint: { width: 106, depth: 64 },
  primitives: [
    extrusion("continuous-chevron-hall", atlassianChevronPlan, 7),
    extrusion("west-roof-terrace", orientedBoxPlan(28, 12, -10, 5, -38), 11),
    extrusion("east-roof-terrace", orientedBoxPlan(31, 12, 12, 5, 38), 10),
    extrusion("joined-apex-terrace", boxPlan(13, 11, 1, -3), 16),
    extrusion("rear-archive-strip", boxPlan(56, 6, 0, 27), 4),
    surface(
      "open-forecourt",
      screenPath([
        [-17, 6],
        [0, -3],
        [18, 6],
        [0, 17],
      ]),
      "terrain.claim",
      0,
    ),
    stroke(
      "terrace-step-lines",
      `${openScreenPath([[-22, -8], [-7, -11], [1, -11]])} ${openScreenPath([[1, -11], [10, -17], [25, -8]])}`,
      1,
    ),
    stroke(
      "forecourt-facade-rhythm",
      `${openScreenPath([[-21, 7], [-14, 10], [-6, 12]])} ${openScreenPath([[6, 12], [12, 8], [10, 3]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

const ciCdTrackOuter: readonly Coordinate[] = [
  [-39, 4],
  [-39, -11],
  [-34, -18],
  [25, -18],
  [33, -12],
  [36, 5],
  [30, 13],
  [-31, 13],
];
const ciCdTrackInner: readonly Coordinate[] = [
  [-31, 4],
  [-27, 8],
  [24, 8],
  [29, 3],
  [27, -7],
  [22, -11],
  [-28, -11],
  [-32, -7],
];
const ciCdTrackPath = compoundScreenPath(
  ciCdTrackOuter,
  [...ciCdTrackInner].reverse(),
);
const ciCdPrimaryPath = screenPath([
  [-43.3013, 9],
  [-39, -11],
  [-34, -18],
  [20.3516, -41.25],
  [29.8779, -35.75],
  [42.0022, -24.75],
  [43.3013, -13],
  [43.3013, -11],
  [36, 5],
  [30, 13],
  [-7.7942, 22.5],
  [-19.0526, 25],
  [-43.3013, 11],
]);

const ciCd = skillDefinition({
  assetId: "skill/ci-cd@v1",
  geometryKey: "career-world/skill/ci-cd/master-v1",
  masterGeometryHash: "sha256:542a3134ba7b1580f01f5aeacc041c21be0ce2068adfea2993a0618c47844e31",
  primaryPathHash: "sha256:89d81c08e92ebf0f9213cb8e68550b51d1a59109e09332abb6c77e4d7461c231",
  primaryPath: ciCdPrimaryPath,
  footprint: { width: 92, depth: 54 },
  primitives: [
    extrusion("fabrication-plinth", boxPlan(72, 28), 2),
    extrusion("fabrication-hall", boxPlan(57, 19, -5, 0), 10),
    extrusion("release-bay-low", boxPlan(14, 11, 29, -7), 13),
    extrusion("release-bay-high", boxPlan(14, 11, 29, 7), 17),
    extrusion("track-west-support", boxPlan(4, 4, -25, -16), 7),
    extrusion("track-center-support", boxPlan(4, 4, 0, -16), 7),
    extrusion("track-east-support", boxPlan(4, 4, 24, -14), 7),
    surface("continuous-service-track", ciCdTrackPath, "line.secondary", 0),
    stroke(
      "track-edge-rails",
      `${openScreenPath([[-36, -15], [27, -15], [33, -9]])} ${openScreenPath([[-36, 10], [28, 10], [33, 5]])}`,
      0,
      "line.primary",
    ),
    stroke(
      "fabrication-bay-seams",
      `${openScreenPath([[-26, -4], [-17, 1], [-8, -4]])} ${openScreenPath([[1, -4], [10, 1], [19, -4]])}`,
      1,
    ),
    stroke(
      "release-bay-panel-lines",
      `${openScreenPath([[26, -12], [33, -8]])} ${openScreenPath([[30, -18], [37, -14]])}`,
      2,
      "accent.emissive",
    ),
  ],
});

export const SKILL_GEOMETRY_DEFINITIONS_C = Object.freeze([
  manifestV3,
  java,
  ai,
  vmware,
  macstadium,
  electron,
  informatica,
  atlassian,
  ciCd,
] satisfies readonly GeometryDefinition[]);
