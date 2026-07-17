import { PALETTE_SLOTS } from "../geometry/palettes";
import {
  CAREER_WORLD_PROJECTION_ID,
  type DetailTier,
  type ExtrusionPrimitive,
  type GeometryDefinition,
  type PaletteSlot,
  type PlanPoint,
  type StrokePrimitive,
  type SurfacePrimitive,
} from "../geometry/types";

type SkillGeometryIdA =
  | "skill/safe-writes@v1"
  | "skill/context-compression@v1"
  | "skill/workflow-orchestration@v1"
  | "skill/operator-control@v1"
  | "skill/data-contracts@v1"
  | "skill/go@v1"
  | "skill/typescript@v1"
  | "skill/react@v1"
  | "skill/aws@v1";

const IDENTITY_HASHES = Object.freeze({
  "skill/safe-writes@v1": Object.freeze({
    masterGeometryHash:
      "sha256:b1df2b0c81e8a1dda5df3f7158a12630f9d140b9849b5515e2f769736fd68069",
    primaryPathHash:
      "sha256:de7d0ac9c6b5a86ec6a616a2d654f9e3429f06456abbf25e71d683ed95f05b5c",
  }),
  "skill/context-compression@v1": Object.freeze({
    masterGeometryHash:
      "sha256:dfef20c964daa2a6990652cebd7c14de36ff0c75a9857282fc9a7659485efc3a",
    primaryPathHash:
      "sha256:5be156474dcc31d6d53ee9f6bd97a2b0c001a64348e03a2371e316466904c26b",
  }),
  "skill/workflow-orchestration@v1": Object.freeze({
    masterGeometryHash:
      "sha256:9b01e46a631e4e0bc31fe8a3c4ba06da1393ac17819730db5d7b62c3cf7e89cc",
    primaryPathHash:
      "sha256:3a8336d92bdb26206800f6bb015d022f2785e4def06a874c67ff7185aec9e3cf",
  }),
  "skill/operator-control@v1": Object.freeze({
    masterGeometryHash:
      "sha256:b287a0ea46ee6cfd8eaeeb399ed8e9dd1740be2fc2aa824e5798a5315564ce82",
    primaryPathHash:
      "sha256:7fc421db47884bedd29a359c7312e8f3e33d7b6c1ea1ef9b389e0ea49b6a2efa",
  }),
  "skill/data-contracts@v1": Object.freeze({
    masterGeometryHash:
      "sha256:5c0d00f488491ae34e64325a42dfdbffaa807837605f517e939af71167ec266a",
    primaryPathHash:
      "sha256:ba4d70f8851ad0bedd81b615be8f93735120af98da0792fd506cedd31e523674",
  }),
  "skill/go@v1": Object.freeze({
    masterGeometryHash:
      "sha256:b9b1141f506d474ca24f811ec015124229bf325346f6621a70321e607fe528c0",
    primaryPathHash:
      "sha256:99be4bad080b37d66ab151b32cf2e46e6ed1a3c1218dee0a1986655eb5f2ee7a",
  }),
  "skill/typescript@v1": Object.freeze({
    masterGeometryHash:
      "sha256:a1d5dca922fddc3e6eb2f536d307f4110f8ffdb9fdd52187f04ed04585478542",
    primaryPathHash:
      "sha256:4bf8c4e9b893a2fbd41231b51b0a86efb4fc9fa0a24b55e3dce2c069a0cd77c2",
  }),
  "skill/react@v1": Object.freeze({
    masterGeometryHash:
      "sha256:bd584a6a082a8c825fdc1544f823900982bfb6e76e34a6e5f795641aa76ae9e9",
    primaryPathHash:
      "sha256:e07ffee72bd1fa64e432ee33920bc093c6bab365431252a9d8ef8161160fca24",
  }),
  "skill/aws@v1": Object.freeze({
    masterGeometryHash:
      "sha256:99d10a29de225f8fb7d568c2add2bc3ed4eb4b91542de10578843dc2157c4f92",
    primaryPathHash:
      "sha256:401b20a28ff24c880a57e337906f819b0a72f9ed34b774d43cc7a0cd0a2e56ac",
  }),
} satisfies Readonly<
  Record<
    SkillGeometryIdA,
    Readonly<
      Pick<GeometryDefinition, "masterGeometryHash" | "primaryPathHash">
    >
  >
>);

function plan(points: readonly PlanPoint[]): readonly PlanPoint[] {
  return Object.freeze(
    points.map((point) => Object.freeze({ x: point.x, y: point.y })),
  );
}

function rectanglePlan(
  width: number,
  depth: number,
  centerX = 0,
  centerY = 0,
  rotationDegrees = 0,
): readonly PlanPoint[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return plan(
    [
      { x: -halfWidth, y: -halfDepth },
      { x: halfWidth, y: -halfDepth },
      { x: halfWidth, y: halfDepth },
      { x: -halfWidth, y: halfDepth },
    ].map((point) => ({
      x: Math.round((centerX + point.x * cosine - point.y * sine) * 10_000) / 10_000,
      y: Math.round((centerY + point.x * sine + point.y * cosine) * 10_000) / 10_000,
    })),
  );
}

function polygonPlan(
  sideCount: number,
  radius: number,
  centerX = 0,
  centerY = 0,
  rotationDegrees = 0,
): readonly PlanPoint[] {
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  return plan(
    Array.from({ length: sideCount }, (_, index) => {
      const angle = rotationRadians + (index * Math.PI * 2) / sideCount;
      return {
        x: Math.round((centerX + Math.cos(angle) * radius) * 10_000) / 10_000,
        y: Math.round((centerY + Math.sin(angle) * radius) * 10_000) / 10_000,
      };
    }),
  );
}

function extrusion(
  id: string,
  extrusionPlan: readonly PlanPoint[],
  height: number,
  detailTier: DetailTier = 0,
): ExtrusionPrimitive {
  return Object.freeze({
    type: "extrusion",
    id,
    plan: extrusionPlan,
    height,
    top: "structure.base",
    litSide: "structure.base",
    shadowSide: "structure.shadow",
    stroke: "line.primary",
    detailTier,
  });
}

function surface(
  id: string,
  path: string,
  detailTier: DetailTier = 0,
  fill: PaletteSlot = "structure.base",
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

function definition(
  value: Omit<
    GeometryDefinition,
    "assetId" | "category" | "masterGeometryHash" | "primaryPathHash"
  > &
    Readonly<{ assetId: SkillGeometryIdA; category: "skill" }>,
): GeometryDefinition {
  const hashes = IDENTITY_HASHES[value.assetId];
  return Object.freeze({
    ...value,
    ...hashes,
    footprint: Object.freeze(value.footprint),
    paletteSlots: PALETTE_SLOTS,
    primitives: Object.freeze(value.primitives),
  });
}

const safeWrites = definition({
  assetId: "skill/safe-writes@v1",
  category: "skill",
  geometryKey: "career-world/skill/safe-writes/master-v1",
  primaryPath:
    "M -101 -12 L -88 -66 L -35 -97 L 35 -62 L 54 -73 L 99 -47 L 106 -7 L 81 25 L 46 42 L 20 78 L -49 70 L -95 38 Z",
  footprint: { width: 220, depth: 180 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion(
      "foundation-clipped",
      plan([
        { x: -108, y: -72 },
        { x: 88, y: -72 },
        { x: 108, y: -52 },
        { x: 108, y: 72 },
        { x: -108, y: 72 },
        { x: -108, y: -52 },
      ]),
      6,
    ),
    extrusion("archive-west-wing", rectanglePlan(58, 118, -55, 4), 44),
    extrusion("archive-rear-wing", rectanglePlan(118, 42, 4, 42), 44),
    extrusion("archive-east-return", rectanglePlan(38, 72, 44, 13), 44),
    extrusion("write-chamber", rectanglePlan(32, 30, -3, 3), 24),
    extrusion("airlock-inner", rectanglePlan(46, 22, -52, -61), 31),
    extrusion("airlock-outer", rectanglePlan(58, 24, -52, -78), 22),
    extrusion("rollback-neck", rectanglePlan(27, 30, 65, -9), 28),
    extrusion("rollback-vault", rectanglePlan(55, 67, 87, -8), 42),
    stroke(
      "courtyard-recess-seam",
      "M -37 -18 L 1 -39 L 39 -17 L 2 4 Z",
      1,
    ),
    stroke(
      "airlock-sequence-seams",
      "M -91 20 L -52 42 L -13 20 M -83 29 L -52 47 L -21 29",
      1,
      "accent.emissive",
    ),
    stroke(
      "vault-rollback-ribs",
      "M 53 -35 L 83 -18 M 59 -42 L 89 -25 M 65 -49 L 95 -32",
      1,
    ),
    stroke(
      "safe-write-easter-egg",
      "M -9 -24 L 0 -29 L 9 -24 M -9 -19 L 0 -24 L 9 -19",
      2,
      "accent.focus",
    ),
  ],
});

const contextCompression = definition({
  assetId: "skill/context-compression@v1",
  category: "skill",
  geometryKey: "career-world/skill/context-compression/master-v1",
  primaryPath:
    "M -84 39 L -62 -111 L 0 -146 L 62 -111 L 85 38 L 65 70 L 0 108 L -65 70 Z",
  footprint: { width: 180, depth: 150 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion(
      "tapered-base",
      plan([
        { x: -90, y: -57 },
        { x: -69, y: -75 },
        { x: 69, y: -75 },
        { x: 90, y: -57 },
        { x: 90, y: 57 },
        { x: 69, y: 75 },
        { x: -69, y: 75 },
        { x: -90, y: 57 },
      ]),
      9,
    ),
    surface(
      "compression-frame-outer",
      "M -60 31 L -60 -98 L 0 -132 L 60 -98 L 60 31 L 50 37 L 50 -91 L 0 -119 L -50 -91 L -50 37 Z",
    ),
    surface(
      "compression-frame-large",
      "M -45 39 L -45 -65 L 0 -91 L 45 -65 L 45 39 L 36 44 L 36 -58 L 0 -79 L -36 -58 L -36 44 Z",
    ),
    surface(
      "compression-frame-medium",
      "M -31 45 L -31 -34 L 0 -52 L 31 -34 L 31 45 L 23 50 L 23 -27 L 0 -40 L -23 -27 L -23 50 Z",
    ),
    surface(
      "compression-frame-inner",
      "M -19 51 L -19 -11 L 0 -22 L 19 -11 L 19 51 L 12 55 L 12 -4 L 0 -11 L -12 -4 L -12 55 Z",
    ),
    extrusion("dense-core", rectanglePlan(30, 28, 0, 9), 38),
    stroke(
      "base-inset",
      "M -66 48 L 0 86 L 66 48 L 55 42 L 0 73 L -55 42 Z",
      1,
      "accent.emissive",
    ),
    stroke(
      "core-compression-seams",
      "M -20 -8 L 0 3 L 20 -8 M -18 4 L 0 14 L 18 4 M -13 17 L 0 24 L 13 17",
      1,
    ),
    stroke(
      "compression-easter-egg",
      "M -7 28 L 0 32 L 7 28 M -5 34 L 0 37 L 5 34",
      2,
      "accent.focus",
    ),
  ],
});

const workflowOrchestration = definition({
  assetId: "skill/workflow-orchestration@v1",
  category: "skill",
  geometryKey: "career-world/skill/workflow-orchestration/master-v1",
  primaryPath:
    "M -116 18 L -104 -38 L -70 -57 L -62 -89 L -27 -109 L 0 -151 L 28 -109 L 62 -89 L 70 -57 L 104 -38 L 116 18 L 88 54 L 49 59 L 28 91 L -28 91 L -49 59 L -88 54 Z",
  footprint: { width: 240, depth: 220 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion("rotunda-foundation", polygonPlan(12, 72, 0, 0, 15), 10),
    surface(
      "interrupted-ring-ramp",
      "M -72 -1 C -62 -51 -26 -79 17 -73 C 57 -68 78 -35 74 3 L 58 10 C 60 -24 42 -50 13 -55 C -18 -60 -46 -39 -54 -4 L -21 15 L -32 32 L -76 7 Z",
    ),
    extrusion("central-drum-plinth", polygonPlan(12, 52, 0, 0, 15), 24),
    extrusion("central-drum", polygonPlan(12, 37, 0, 0, 15), 91),
    extrusion("service-bay-north", polygonPlan(6, 23, 0, 79, 30), 28),
    extrusion("service-bay-northeast", polygonPlan(6, 23, 68, 40, 30), 23),
    extrusion("service-bay-southeast", polygonPlan(6, 23, 68, -40, 30), 27),
    extrusion("service-bay-south", polygonPlan(6, 23, 0, -79, 30), 22),
    extrusion("service-bay-southwest", polygonPlan(6, 23, -68, -40, 30), 26),
    extrusion("service-bay-northwest", polygonPlan(6, 23, -68, 40, 30), 24),
    stroke(
      "drum-vertical-seams",
      "M -28 -47 L -28 32 M -14 -55 L -14 25 M 0 -61 L 0 20 M 14 -55 L 14 25 M 28 -47 L 28 32",
      1,
    ),
    stroke(
      "ring-deck-seams",
      "M -57 -14 L -42 -7 M -46 -37 L -32 -28 M 44 -33 L 57 -20 M 51 -5 L 66 1",
      1,
      "accent.emissive",
    ),
    stroke(
      "six-beat-easter-egg",
      "M 0 -76 L 0 -69 M 57 -42 L 51 -38 M 57 32 L 51 29 M 0 67 L 0 60 M -57 32 L -51 29 M -57 -42 L -51 -38",
      2,
      "accent.focus",
    ),
  ],
});

const operatorControl = definition({
  assetId: "skill/operator-control@v1",
  category: "skill",
  geometryKey: "career-world/skill/operator-control/master-v1",
  primaryPath:
    "M -121 34 L -106 -57 L -61 -82 L -43 -126 L 0 -151 L 43 -126 L 58 -86 L 102 -61 L 123 27 L 91 69 L 43 69 L 20 96 L -55 92 L -86 67 Z",
  footprint: { width: 250, depth: 210 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion(
      "broad-stepped-foundation",
      plan([
        { x: -125, y: -84 },
        { x: 100, y: -84 },
        { x: 125, y: -59 },
        { x: 125, y: 84 },
        { x: -100, y: 84 },
        { x: -125, y: 59 },
      ]),
      8,
    ),
    extrusion("lower-plinth", polygonPlan(8, 79, -3, 0, 22.5), 20),
    extrusion("upper-plinth", polygonPlan(8, 60, -3, 0, 22.5), 38),
    extrusion("counterweight-hall", rectanglePlan(111, 47, 32, 67), 43),
    surface(
      "switchback-ramp-west",
      "M -101 39 L -78 52 L -39 29 L -50 23 L -91 46 L -106 37 L -92 -7 L -80 0 Z",
    ),
    surface(
      "switchback-ramp-east",
      "M 99 37 L 77 50 L 39 28 L 50 22 L 90 44 L 105 35 L 91 -9 L 79 -2 Z",
    ),
    extrusion("raised-cabin-stem", polygonPlan(8, 31, -3, -2, 22.5), 67),
    extrusion("faceted-control-cabin", polygonPlan(8, 49, -3, -2, 22.5), 101),
    stroke(
      "west-ramp-rails",
      "M -101 36 L -78 49 L -40 27 M -94 -5 L -82 2 L -92 38",
      1,
      "accent.emissive",
    ),
    stroke(
      "east-ramp-rails",
      "M 99 34 L 77 47 L 40 26 M 93 -7 L 81 0 L 91 36",
      1,
      "accent.emissive",
    ),
    stroke(
      "cabin-panel-seams",
      "M -31 -68 L -31 -14 M -16 -77 L -16 -20 M 0 -82 L 0 -23 M 16 -74 L 16 -18 M 31 -61 L 31 -10",
      1,
    ),
    stroke(
      "operator-easter-egg",
      "M -10 -39 L -3 -43 L 4 -39 M 0 -33 L 7 -37 L 14 -33",
      2,
      "accent.focus",
    ),
  ],
});

const dataContracts = definition({
  assetId: "skill/data-contracts@v1",
  category: "skill",
  geometryKey: "career-world/skill/data-contracts/master-v1",
  primaryPath:
    "M -128 25 L -108 -63 L -66 -99 L -21 -74 L -13 -27 L 0 -35 L 13 -27 L 25 -75 L 72 -104 L 115 -75 L 130 22 L 92 63 L 24 56 L 10 42 L -8 42 L -25 57 L -91 63 Z",
  footprint: { width: 260, depth: 170 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion("left-archive-foundation", rectanglePlan(112, 119, -72, 0), 7),
    extrusion("right-archive-foundation", rectanglePlan(112, 119, 72, 0), 7),
    extrusion("left-archive-hall", rectanglePlan(100, 108, -72, 0), 43),
    extrusion("right-archive-hall", rectanglePlan(100, 108, 72, 0), 49),
    surface(
      "left-steep-pitch-roof",
      "M -111 -22 L -63 -74 L -20 -49 L -69 -3 Z",
    ),
    surface(
      "right-shallow-pitch-roof",
      "M 14 -48 L 68 -79 L 116 -51 L 62 -25 Z",
    ),
    extrusion("sealed-validation-gate", rectanglePlan(25, 31, 0, -7), 34),
    stroke(
      "left-hall-bays",
      "M -116 -8 L -92 6 M -101 -25 L -77 -11 M -83 -42 L -59 -28 M -65 -57 L -41 -43",
      1,
    ),
    stroke(
      "right-hall-bays",
      "M 35 -43 L 59 -29 M 53 -54 L 77 -40 M 71 -64 L 95 -50 M 89 -51 L 113 -37",
      1,
    ),
    stroke(
      "sealed-gate-seams",
      "M -12 -18 L 0 -11 L 12 -18 M 0 -11 L 0 18",
      1,
      "accent.emissive",
    ),
    stroke(
      "contract-pair-easter-egg",
      "M -5 5 L -1 7 L -5 9 M 5 5 L 1 7 L 5 9",
      2,
      "accent.focus",
    ),
  ],
});

const goWorkshop = definition({
  assetId: "skill/go@v1",
  category: "skill",
  geometryKey: "career-world/skill/go/master-v1",
  primaryPath:
    "M -138 24 L -121 -48 L -78 -72 L 42 -141 L 113 -100 L 139 -22 L 119 42 L 75 66 L -78 64 L -123 49 Z",
  footprint: { width: 280, depth: 150 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion(
      "workshop-foundation",
      plan([
        { x: -140, y: -75 },
        { x: 140, y: -75 },
        { x: 140, y: 75 },
        { x: -119, y: 75 },
        { x: -140, y: 54 },
      ]),
      6,
    ),
    extrusion("north-gable-hall", rectanglePlan(238, 48, 0, 45), 37),
    extrusion(
      "south-gable-hall",
      plan([
        { x: -119, y: -67 },
        { x: 119, y: -67 },
        { x: 119, y: -19 },
        { x: -99, y: -19 },
        { x: -119, y: -39 },
      ]),
      37,
    ),
    surface(
      "north-gable-roof",
      "M -79 -77 L 24 -137 L 121 -81 L 18 -21 Z",
    ),
    surface(
      "south-gable-roof",
      "M -122 -27 L -20 -86 L 79 -29 L -24 31 Z",
    ),
    surface(
      "open-service-spine",
      "M -102 10 L 3 -51 L 100 5 L -5 66 Z",
      0,
      "terrain.claim",
      "line.primary",
    ),
    extrusion("rear-monitor-shed", rectanglePlan(60, 82, 75, 19), 59),
    stroke(
      "service-spine-rails",
      "M -84 12 L 2 -38 L 84 9 M -83 21 L 3 -29 L 85 18",
      1,
      "accent.emissive",
    ),
    stroke(
      "workshop-bay-seams",
      "M -100 35 L -75 50 M -65 15 L -40 30 M -29 -5 L -4 10 M 7 -25 L 32 -10 M 43 -45 L 68 -30",
      1,
    ),
    stroke(
      "go-channel-easter-egg",
      "M -13 5 L -3 -1 L 7 5 M -7 12 L 3 6 L 13 12",
      2,
      "accent.focus",
    ),
  ],
});

const typeScript = definition({
  assetId: "skill/typescript@v1",
  category: "skill",
  geometryKey: "career-world/skill/typescript/master-v1",
  primaryPath:
    "M -82 42 L -72 -53 L -39 -72 L -30 -126 L -16 -134 L -6 -194 L 8 -202 L 20 -145 L 32 -151 L 45 -113 L 61 -104 L 79 -50 L 84 37 L 48 63 L 12 58 L -22 76 L -62 63 Z",
  footprint: { width: 170, depth: 150 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion("compiler-hall-foundation", rectanglePlan(119, 109, -13, 0), 7),
    extrusion("compiler-hall", rectanglePlan(108, 98, -17, 0), 52),
    surface(
      "recessed-side-court",
      "M 31 17 L 61 0 L 86 15 L 54 33 Z",
      0,
      "terrain.claim",
      "line.primary",
    ),
    extrusion("court-low-wall", rectanglePlan(47, 8, 48, 43), 17),
    extrusion("shaft-short", rectanglePlan(17, 17, 27, 1), 104),
    extrusion("shaft-medium", rectanglePlan(17, 17, -31, 0), 132),
    extrusion("shaft-tall", rectanglePlan(17, 17, -2, 0), 169),
    surface(
      "diagonal-binding-brace",
      "M -43 -111 L -34 -118 L 38 -76 L 30 -68 Z",
      0,
      "structure.base",
      "line.primary",
    ),
    stroke(
      "compiler-hall-band",
      "M -65 -20 L -15 9 L 38 -22 M -64 -11 L -15 18 L 39 -13",
      1,
      "accent.emissive",
    ),
    stroke(
      "shaft-facet-seams",
      "M -30 -119 L -30 -28 M -2 -158 L -2 -31 M 27 -91 L 27 -20",
      1,
    ),
    stroke(
      "type-lattice-easter-egg",
      "M 43 13 L 48 10 L 53 13 M 43 19 L 48 16 L 53 19 M 43 25 L 48 22 L 53 25",
      2,
      "accent.focus",
    ),
  ],
});

const reactTerraces = definition({
  assetId: "skill/react@v1",
  category: "skill",
  geometryKey: "career-world/skill/react/master-v1",
  primaryPath:
    "M -118 31 L -104 -43 L -72 -61 L -63 -102 L -21 -127 L 4 -104 L 44 -115 L 77 -87 L 72 -53 L 110 -31 L 121 38 L 84 70 L 41 61 L 15 88 L -31 86 L -57 62 L -92 63 Z",
  footprint: { width: 240, depth: 220 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion("three-wing-foundation", polygonPlan(12, 111, 0, 0, 15), 6),
    extrusion("terrace-wing-east", rectanglePlan(104, 42, 60, 0, 0), 40),
    extrusion("terrace-wing-northwest", rectanglePlan(104, 42, -30, 52, 120), 52),
    extrusion("terrace-wing-southwest", rectanglePlan(104, 42, -30, -52, 240), 31),
    extrusion("rear-service-bar", rectanglePlan(91, 25, 10, 76), 23),
    extrusion("open-central-stage", polygonPlan(8, 27, 0, 0, 22.5), 10),
    stroke(
      "east-terrace-seams",
      "M 13 -12 L 47 8 M 25 -20 L 59 0 M 37 -27 L 71 -7",
      1,
    ),
    stroke(
      "northwest-terrace-seams",
      "M -61 -41 L -31 -24 M -68 -29 L -38 -12 M -75 -17 L -45 0",
      1,
    ),
    stroke(
      "southwest-terrace-seams",
      "M -46 33 L -17 50 M -35 26 L -6 43 M -24 19 L 5 36",
      1,
    ),
    stroke(
      "responsive-three-bar-easter-egg",
      "M -11 7 L 11 7 M -8 13 L 8 13 M -5 19 L 5 19",
      2,
      "accent.focus",
    ),
  ],
});

const awsCampus = definition({
  assetId: "skill/aws@v1",
  category: "skill",
  geometryKey: "career-world/skill/aws/master-v1",
  primaryPath:
    "M -113 24 L -101 -47 L -66 -67 L -42 -59 L -25 -117 L 0 -132 L 26 -117 L 43 -58 L 72 -72 L 105 -53 L 116 25 L 87 57 L 37 57 L 14 82 L -42 78 L -67 59 L -98 55 Z",
  footprint: { width: 230, depth: 200 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    extrusion(
      "clipped-perimeter-base",
      plan([
        { x: -115, y: -78 },
        { x: -92, y: -100 },
        { x: 92, y: -100 },
        { x: 115, y: -78 },
        { x: 115, y: 78 },
        { x: 92, y: 100 },
        { x: -92, y: 100 },
        { x: -115, y: 78 },
      ]),
      8,
    ),
    extrusion("causeway-west", rectanglePlan(74, 22, -40, -23, 30), 14),
    extrusion("causeway-east", rectanglePlan(74, 22, 40, -23, -30), 14),
    extrusion("causeway-south", rectanglePlan(70, 22, 0, 40, 90), 14),
    extrusion("utility-hub", rectanglePlan(55, 55, 0, -7), 106),
    extrusion("service-pavilion-west", rectanglePlan(45, 45, -74, -49), 42),
    extrusion("service-pavilion-east", rectanglePlan(45, 45, 74, -49), 42),
    extrusion("service-pavilion-south", rectanglePlan(45, 45, 0, 72), 39),
    stroke(
      "hub-vertical-bands",
      "M -26 -82 L -26 -5 M -13 -90 L -13 -13 M 0 -98 L 0 -21 M 13 -90 L 13 -13 M 26 -82 L 26 -5",
      1,
    ),
    stroke(
      "causeway-insets",
      "M -69 3 L -17 -27 M 69 3 L 17 -27 M -18 39 L 18 18",
      1,
      "accent.emissive",
    ),
    stroke(
      "distributed-three-dock-easter-egg",
      "M -83 -39 L -72 -33 M 72 -41 L 83 -35 M -5 48 L 5 48",
      2,
      "accent.focus",
    ),
  ],
});

export const SKILL_GEOMETRY_DEFINITIONS_A = Object.freeze([
  safeWrites,
  contextCompression,
  workflowOrchestration,
  operatorControl,
  dataContracts,
  goWorkshop,
  typeScript,
  reactTerraces,
  awsCampus,
] satisfies readonly GeometryDefinition[]);
