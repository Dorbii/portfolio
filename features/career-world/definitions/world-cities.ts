import { CAREER_WORLD_PROJECTION } from "../geometry/projection";
import { PALETTE_SLOTS } from "../geometry/palettes";
import type {
  GeometryDefinition,
  GeometryPrimitive,
  PlanPoint,
} from "../geometry/types";

function plan(points: readonly PlanPoint[]): readonly PlanPoint[] {
  return Object.freeze(
    points.map((point) => Object.freeze({ x: point.x, y: point.y })),
  );
}

function rect(
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
): readonly PlanPoint[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return plan([
    { x: centerX - halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY + halfDepth },
    { x: centerX - halfWidth, y: centerY + halfDepth },
  ]);
}

function octagon(
  centerX: number,
  centerY: number,
  radius: number,
): readonly PlanPoint[] {
  const inset = radius * 0.4142;

  return plan([
    { x: centerX - inset, y: centerY - radius },
    { x: centerX + inset, y: centerY - radius },
    { x: centerX + radius, y: centerY - inset },
    { x: centerX + radius, y: centerY + inset },
    { x: centerX + inset, y: centerY + radius },
    { x: centerX - inset, y: centerY + radius },
    { x: centerX - radius, y: centerY + inset },
    { x: centerX - radius, y: centerY - inset },
  ]);
}

function freezePrimitive(primitive: GeometryPrimitive): GeometryPrimitive {
  if (primitive.type === "extrusion") {
    return Object.freeze({
      ...primitive,
      plan: plan(primitive.plan),
    });
  }

  return Object.freeze({ ...primitive });
}

function defineGeometry(definition: GeometryDefinition): GeometryDefinition {
  return Object.freeze({
    ...definition,
    footprint: Object.freeze({ ...definition.footprint }),
    paletteSlots: PALETTE_SLOTS,
    primitives: Object.freeze(definition.primitives.map(freezePrimitive)),
  });
}

const WORLD_PRIMARY_PATH =
  "M -690.0000 -70.0000 L -650.0000 -170.0000 L -545.0000 -250.0000 L -410.0000 -300.0000 L -300.0000 -355.0000 L -160.0000 -320.0000 L -55.0000 -350.0000 L 40.0000 -300.0000 L 170.0000 -315.0000 L 280.0000 -260.0000 L 420.0000 -255.0000 L 520.0000 -185.0000 L 665.0000 -125.0000 L 700.0000 -20.0000 L 650.0000 85.0000 L 690.0000 180.0000 L 555.0000 245.0000 L 470.0000 325.0000 L 330.0000 300.0000 L 225.0000 355.0000 L 90.0000 330.0000 L -20.0000 370.0000 L -160.0000 335.0000 L -260.0000 375.0000 L -370.0000 315.0000 L -510.0000 300.0000 L -545.0000 210.0000 L -650.0000 150.0000 L -620.0000 60.0000 Z M -748.0000 -205.0000 L -720.0000 -226.0000 L -686.0000 -214.0000 L -680.0000 -183.0000 L -713.0000 -168.0000 L -742.0000 -178.0000 Z M 714.0000 -176.0000 L 746.0000 -190.0000 L 772.0000 -169.0000 L 758.0000 -142.0000 L 724.0000 -145.0000 Z M -716.0000 243.0000 L -680.0000 226.0000 L -652.0000 245.0000 L -661.0000 276.0000 L -699.0000 283.0000 L -725.0000 265.0000 Z M 662.0000 294.0000 L 695.0000 276.0000 L 731.0000 293.0000 L 722.0000 326.0000 L 680.0000 333.0000 Z";

const NINJAONE_PRIMARY_PATH =
  "M -250.0000 85.0000 L -210.0000 10.0000 L -160.0000 -5.0000 L -145.0000 -75.0000 L -105.0000 -105.0000 L -70.0000 -100.0000 L -70.0000 -155.0000 L -45.0000 -175.0000 L -45.0000 -225.0000 L -20.0000 -240.0000 L -20.0000 -275.0000 L 0.0000 -285.0000 L 20.0000 -275.0000 L 20.0000 -240.0000 L 45.0000 -225.0000 L 45.0000 -175.0000 L 70.0000 -155.0000 L 70.0000 -105.0000 L 105.0000 -100.0000 L 145.0000 -75.0000 L 160.0000 -5.0000 L 210.0000 10.0000 L 250.0000 85.0000 L 220.0000 125.0000 L 90.0000 160.0000 L 0.0000 205.0000 L -90.0000 160.0000 L -220.0000 125.0000 Z";

const TANIUM_PRIMARY_PATH =
  "M -330.0000 105.0000 L -312.0000 5.0000 L -275.0000 -25.0000 L -265.0000 -185.0000 L -235.0000 -220.0000 L -195.0000 -210.0000 L -185.0000 -160.0000 L -135.0000 -120.0000 L 128.0000 -115.0000 L 170.0000 -145.0000 L 180.0000 -198.0000 L 214.0000 -220.0000 L 250.0000 -202.0000 L 258.0000 -92.0000 L 304.0000 -58.0000 L 332.0000 45.0000 L 305.0000 110.0000 L 140.0000 150.0000 L 0.0000 175.0000 L -145.0000 154.0000 Z";

const INDEPENDENT_PRIMARY_PATH =
  "M -280.0000 120.0000 L -270.0000 -15.0000 L -240.0000 -35.0000 L -220.0000 -95.0000 L -188.0000 -120.0000 L -165.0000 -92.0000 L -140.0000 -138.0000 L -108.0000 -160.0000 L -85.0000 -130.0000 L -58.0000 -176.0000 L -25.0000 -198.0000 L -2.0000 -162.0000 L 28.0000 -205.0000 L 58.0000 -220.0000 L 78.0000 -170.0000 L 115.0000 -150.0000 L 125.0000 -248.0000 L 155.0000 -272.0000 L 190.0000 -258.0000 L 198.0000 -95.0000 L 242.0000 -60.0000 L 260.0000 18.0000 L 236.0000 78.0000 L 274.0000 110.0000 L 252.0000 164.0000 L 142.0000 180.0000 L 64.0000 155.0000 L -36.0000 188.0000 L -152.0000 176.0000 Z";

const ACE_HARDWARE_PRIMARY_PATH =
  "M -292.0000 118.0000 L -278.0000 12.0000 L -225.0000 -18.0000 L -210.0000 -118.0000 L -135.0000 -166.0000 L -82.0000 -218.0000 L 62.0000 -238.0000 L 208.0000 -158.0000 L 220.0000 -92.0000 L 257.0000 -68.0000 L 274.0000 12.0000 L 305.0000 42.0000 L 286.0000 124.0000 L 174.0000 158.0000 L 68.0000 192.0000 L -58.0000 180.0000 L -170.0000 162.0000 Z";

const COLUMN_PRIMARY_PATH =
  "M -286.0000 120.0000 L -286.0000 8.0000 L -250.0000 -38.0000 L -208.0000 -42.0000 L -195.0000 -164.0000 L -174.0000 -188.0000 L -152.0000 -174.0000 L -142.0000 -58.0000 L -112.0000 -62.0000 L -101.0000 -191.0000 L -79.0000 -218.0000 L -56.0000 -204.0000 L -48.0000 -68.0000 L -18.0000 -72.0000 L -7.0000 -211.0000 L 16.0000 -241.0000 L 40.0000 -226.0000 L 47.0000 -78.0000 L 77.0000 -82.0000 L 88.0000 -231.0000 L 112.0000 -264.0000 L 137.0000 -247.0000 L 143.0000 -88.0000 L 174.0000 -92.0000 L 185.0000 -252.0000 L 210.0000 -287.0000 L 236.0000 -269.0000 L 242.0000 -78.0000 L 278.0000 -46.0000 L 286.0000 42.0000 L 314.0000 76.0000 L 286.0000 128.0000 L 116.0000 162.0000 L 0.0000 198.0000 L -116.0000 162.0000 Z";

const WORLD_GEOMETRY = defineGeometry({
  assetId: "world/career-world@v1",
  category: "world",
  geometryKey: "career-world/world/career-world/master-v1",
  masterGeometryHash: "sha256:d19fb4433893727ac11812c221a64d452cff914cd506bb7003f0f22a8dab43d7",
  primaryPathHash: "sha256:2289e817a69967b632ef230d87ace8b7206a81f4375634c3019bd32ef6618b0d",
  primaryPath: WORLD_PRIMARY_PATH,
  footprint: { width: 1600, depth: 900 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "surface",
      id: "world-coastline-envelope",
      path: WORLD_PRIMARY_PATH,
      fill: "terrain.claim",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "district-pad-ninjaone",
      path: "M -540.0000 -80.0000 L -515.0000 -130.0000 L -440.0000 -145.0000 L -380.0000 -110.0000 L -375.0000 -55.0000 L -425.0000 -20.0000 L -505.0000 -30.0000 Z",
      fill: "structure.base",
      stroke: "line.secondary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "district-pad-tanium",
      path: "M -75.0000 -105.0000 L -48.0000 -150.0000 L 30.0000 -160.0000 L 78.0000 -120.0000 L 70.0000 -70.0000 L 18.0000 -42.0000 L -52.0000 -55.0000 Z",
      fill: "structure.base",
      stroke: "line.secondary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "district-pad-independent",
      path: "M 362.0000 -82.0000 L 390.0000 -132.0000 L 466.0000 -140.0000 L 516.0000 -102.0000 L 508.0000 -48.0000 L 452.0000 -18.0000 L 382.0000 -32.0000 Z",
      fill: "structure.base",
      stroke: "line.secondary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "district-pad-ace-hardware",
      path: "M -498.0000 250.0000 L -470.0000 202.0000 L -392.0000 195.0000 L -342.0000 236.0000 L -352.0000 290.0000 L -408.0000 320.0000 L -478.0000 304.0000 Z",
      fill: "structure.base",
      stroke: "line.secondary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "district-pad-column-technologies",
      path: "M 322.0000 250.0000 L 350.0000 202.0000 L 428.0000 195.0000 L 478.0000 236.0000 L 468.0000 290.0000 L 412.0000 320.0000 L 342.0000 304.0000 Z",
      fill: "structure.base",
      stroke: "line.secondary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "terrain-spine-north",
      path: "M -520.0000 -214.0000 L -386.0000 -252.0000 L -252.0000 -218.0000 L -120.0000 -274.0000 L 32.0000 -222.0000 L 178.0000 -262.0000 L 332.0000 -210.0000 L 476.0000 -188.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "terrain-spine-south",
      path: "M -482.0000 210.0000 L -350.0000 170.0000 L -226.0000 238.0000 L -86.0000 184.0000 L 58.0000 242.0000 L 202.0000 184.0000 L 344.0000 222.0000 L 490.0000 182.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "terrain-corridor-center",
      path: "M -430.0000 -58.0000 L -288.0000 -26.0000 L -146.0000 -86.0000 L 0.0000 -34.0000 L 144.0000 -74.0000 L 286.0000 -24.0000 L 430.0000 -58.0000",
      stroke: "accent.emissive",
      detailTier: 2,
    },
    {
      type: "stroke",
      id: "coastline-inner-contour",
      path: "M -610.0000 -88.0000 L -572.0000 -164.0000 L -460.0000 -220.0000 L -332.0000 -266.0000 L -204.0000 -246.0000 L -78.0000 -272.0000 L 52.0000 -242.0000 L 186.0000 -260.0000 L 306.0000 -218.0000 L 436.0000 -202.0000 L 570.0000 -104.0000 M 588.0000 38.0000 L 548.0000 120.0000 L 578.0000 170.0000 L 482.0000 206.0000 L 410.0000 270.0000 L 294.0000 248.0000 L 190.0000 296.0000 L 72.0000 278.0000 L -30.0000 318.0000 L -160.0000 286.0000 L -270.0000 324.0000 L -370.0000 270.0000 L -486.0000 254.0000 L -508.0000 180.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ],
});

const NINJAONE_GEOMETRY = defineGeometry({
  assetId: "city/ninjaone@v1",
  category: "city",
  geometryKey: "career-world/city/ninjaone/master-v1",
  masterGeometryHash: "sha256:cc6bc6eeb3b9d0df943b8bda392d7568e284e486c7f1305beb6b1d6d7266b5db",
  primaryPathHash: "sha256:178bfb0e8450d08e3c3bd170543ab790ede8dd1c0a3d69cf416d5d562ae37237",
  primaryPath: NINJAONE_PRIMARY_PATH,
  footprint: { width: 360, depth: 340 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "extrusion",
      id: "clipped-diamond-plinth",
      plan: plan([
        { x: 0, y: -170 },
        { x: 135, y: -85 },
        { x: 170, y: 0 },
        { x: 135, y: 85 },
        { x: 0, y: 170 },
        { x: -135, y: 85 },
        { x: -170, y: 0 },
        { x: -135, y: -85 },
      ]),
      height: 10,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "octagonal-command-hall",
      plan: octagon(0, 0, 86),
      height: 62,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    ...[
      ["annex-west", -112, 0],
      ["annex-north", 0, -112],
      ["annex-east", 112, 0],
    ].map(([id, x, y]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: octagon(Number(x), Number(y), 46),
      height: 34,
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "extrusion",
      id: "beacon-step-lower",
      plan: octagon(0, 0, 52),
      height: 104,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "beacon-step-upper",
      plan: octagon(0, 0, 34),
      height: 148,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "beacon-crown",
      plan: octagon(0, 0, 17),
      height: 178,
      top: "accent.emissive",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "command-hall-window-band",
      path: "M -76.0000 -82.0000 L -24.0000 -112.0000 M 24.0000 -112.0000 L 76.0000 -82.0000 M -90.0000 -30.0000 L -90.0000 8.0000 M 90.0000 -30.0000 L 90.0000 8.0000",
      stroke: "accent.emissive",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "empty-sign-slot",
      path: "M -36.0000 44.0000 L 36.0000 44.0000 L 36.0000 70.0000 L -36.0000 70.0000 Z",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "beacon-service-seams",
      path: "M -42.0000 -146.0000 L 42.0000 -146.0000 M -30.0000 -184.0000 L 30.0000 -184.0000 M 0.0000 -274.0000 L 0.0000 -242.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ],
});

const TANIUM_GEOMETRY = defineGeometry({
  assetId: "city/tanium@v1",
  category: "city",
  geometryKey: "career-world/city/tanium/master-v1",
  masterGeometryHash: "sha256:19ac9a133ccd97deccec702175a5f1449575f7a1b4e24d0ee7ad9421f8212fb8",
  primaryPathHash: "sha256:06e79625bcda014ebfc90c65b41b2fb54d8ef88bbb9b6f9e6feb25791e6b3dae",
  primaryPath: TANIUM_PRIMARY_PATH,
  footprint: { width: 440, depth: 280 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "surface",
      id: "open-forum-floor",
      path: "M -142.8942 66.5000 L 56.2917 -48.5000 L 142.8942 -1.5000 L -56.2917 113.5000 Z",
      fill: "terrain.claim",
      stroke: "line.secondary",
      detailTier: 0,
    },
    ...[
      ["forum-spine-north", 0, -90, 360, 40],
      ["forum-spine-south", 0, 90, 360, 40],
      ["forum-spine-west", -160, 0, 40, 140],
      ["forum-spine-east", 160, 0, 40, 140],
    ].map(([id, x, y, width, depth]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), Number(y), Number(width), Number(depth)),
      height: 45,
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    ...[
      ["buttress-northwest", -182, -108],
      ["buttress-northeast", 182, -108],
      ["buttress-southeast", 182, 108],
      ["buttress-southwest", -182, 108],
    ].map(([id, x, y]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), Number(y), 62, 58),
      height: 24,
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "extrusion",
      id: "observation-tower-tall",
      plan: rect(-145, -78, 54, 58),
      height: 148,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "observation-tower-short",
      plan: rect(145, 78, 48, 54),
      height: 108,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "forum-facade-rhythm",
      path: "M -205.0000 52.0000 L -145.0000 87.0000 M -125.0000 98.0000 L -65.0000 132.0000 M -45.0000 142.0000 L 15.0000 176.0000 M 75.0000 -112.0000 L 135.0000 -78.0000 M 155.0000 -66.0000 L 210.0000 -34.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "tower-observation-slits",
      path: "M -242.0000 -160.0000 L -208.0000 -140.0000 M -229.0000 -184.0000 L -198.0000 -166.0000 M 182.0000 -162.0000 L 211.0000 -145.0000",
      stroke: "accent.emissive",
      detailTier: 2,
    },
  ],
});

const INDEPENDENT_GEOMETRY = defineGeometry({
  assetId: "city/independent@v1",
  category: "city",
  geometryKey: "career-world/city/independent/master-v1",
  masterGeometryHash: "sha256:6efb10ea0cbfdef5e726ff22bc6a3243ca3feca94a513ac7d53c820b6fc80bb1",
  primaryPathHash: "sha256:f9bf4940e5bf6f1a71f1bb05e63d165324646be42cb23003431587ccfb114471",
  primaryPath: INDEPENDENT_PRIMARY_PATH,
  footprint: { width: 390, depth: 300 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "extrusion",
      id: "perimeter-base-workshop-run",
      plan: rect(-70, -75, 245, 145),
      height: 10,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "perimeter-base-court-run",
      plan: plan([
        { x: -105, y: 22 },
        { x: 132, y: -72 },
        { x: 156, y: -45 },
        { x: -82, y: 50 },
      ]),
      height: 10,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "perimeter-base-pavilion-run",
      plan: plan([
        { x: -80, y: 52 },
        { x: 118, y: 78 },
        { x: 112, y: 112 },
        { x: -90, y: 84 },
      ]),
      height: 10,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    ...[
      ["sawtooth-bay-01", -145, -72, 62],
      ["sawtooth-bay-02", -102, -72, 82],
      ["sawtooth-bay-03", -59, -72, 64],
      ["sawtooth-bay-04", -16, -72, 84],
      ["sawtooth-bay-05", 27, -72, 66],
    ].map(([id, x, y, height]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), Number(y), 42, 120),
      height: Number(height),
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "extrusion",
      id: "archive-tower",
      plan: rect(125, -75, 50, 64),
      height: 168,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "court-pavilion",
      plan: rect(112, 92, 72, 62),
      height: 48,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "triangular-courtyard-outline",
      path: "M -60.0000 52.0000 L 84.0000 18.0000 L 18.0000 128.0000 Z",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "workshop-bay-seams",
      path: "M -210.0000 -88.0000 L -140.0000 -48.0000 M -164.0000 -125.0000 L -94.0000 -85.0000 M -118.0000 -96.0000 L -48.0000 -56.0000 M -72.0000 -134.0000 L -2.0000 -94.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "archive-window-stack",
      path: "M 151.0000 -224.0000 L 174.0000 -211.0000 M 151.0000 -194.0000 L 174.0000 -181.0000 M 151.0000 -164.0000 L 174.0000 -151.0000",
      stroke: "accent.emissive",
      detailTier: 2,
    },
  ],
});

const ACE_HARDWARE_GEOMETRY = defineGeometry({
  assetId: "city/ace-hardware@v1",
  category: "city",
  geometryKey: "career-world/city/ace-hardware/master-v1",
  masterGeometryHash: "sha256:4aac885cfff2796dce8aea24e2794f22fcb8134a890699da4b69de0aa23a7289",
  primaryPathHash: "sha256:fb9df029d0d1dcc6db00fbf1d5110bc09a069f6476061c5da242ec6f59668f99",
  primaryPath: ACE_HARDWARE_PRIMARY_PATH,
  footprint: { width: 410, depth: 310 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "extrusion",
      id: "heavy-rectangular-plinth",
      plan: rect(0, 0, 390, 290),
      height: 14,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "broad-civic-hall",
      plan: rect(12, 0, 276, 158),
      height: 82,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "shed-roof-plane",
      path: "M -118.0000 -145.0000 L 40.0000 -238.0000 L 178.0000 -158.0000 L 18.0000 -70.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "chamfered-corner-tower",
      plan: plan([
        { x: -170, y: -82 },
        { x: -122, y: -82 },
        { x: -98, y: -58 },
        { x: -98, y: -10 },
        { x: -122, y: 14 },
        { x: -170, y: 14 },
        { x: -192, y: -10 },
        { x: -192, y: -58 },
      ]),
      height: 126,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    ...[
      ["porch-north", 20, -108, 260, 34, 42],
      ["porch-south", 20, 108, 260, 34, 38],
      ["porch-west", -164, 28, 34, 142, 36],
      ["porch-east", 164, 8, 34, 170, 36],
    ].map(([id, x, y, width, depth, height]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), Number(y), Number(width), Number(depth)),
      height: Number(height),
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "stroke",
      id: "porch-support-rhythm",
      path: "M -184.0000 44.0000 L -184.0000 88.0000 M -140.0000 68.0000 L -140.0000 112.0000 M -92.0000 94.0000 L -92.0000 138.0000 M 98.0000 -124.0000 L 98.0000 -80.0000 M 145.0000 -98.0000 L 145.0000 -54.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "empty-hall-sign-slot",
      path: "M -46.0000 -82.0000 L 74.0000 -82.0000 L 74.0000 -52.0000 L -46.0000 -52.0000 Z",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "shed-roof-seams",
      path: "M -86.0000 -140.0000 L 70.0000 -230.0000 M -44.0000 -116.0000 L 108.0000 -204.0000 M 0.0000 -92.0000 L 146.0000 -176.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ],
});

const COLUMN_GEOMETRY = defineGeometry({
  assetId: "city/column-technologies@v1",
  category: "city",
  geometryKey: "career-world/city/column-technologies/master-v1",
  masterGeometryHash: "sha256:95897772dde90e5d0c54e3baa67aa973dc8f99206f5000e57c542dbce956a50c",
  primaryPathHash: "sha256:3debd55237c31c4a3537af39c50726f82f8308c1c265250f1676582e4dfec8ae",
  primaryPath: COLUMN_PRIMARY_PATH,
  footprint: { width: 440, depth: 240 },
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION.id,
  paletteSlots: PALETTE_SLOTS,
  primitives: [
    {
      type: "extrusion",
      id: "capital-foundation",
      plan: rect(0, 0, 430, 190),
      height: 14,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "low-transverse-hall",
      plan: rect(0, 0, 350, 92),
      height: 66,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "end-block-west",
      plan: rect(-185, 0, 70, 120),
      height: 78,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "end-block-east",
      plan: rect(185, 0, 70, 120),
      height: 78,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "recessed-roof-bridge",
      plan: rect(0, -32, 260, 26),
      height: 104,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    ...[
      ["structural-fin-01", -120, 156],
      ["structural-fin-02", -60, 171],
      ["structural-fin-03", 0, 186],
      ["structural-fin-04", 60, 201],
      ["structural-fin-05", 120, 216],
    ].map(([id, x, height]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), -12, 24, 52),
      height: Number(height),
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    ...[
      ["forecourt-step-lower", 0, 92, 230, 42, 5],
      ["forecourt-step-middle", 0, 76, 190, 38, 9],
      ["forecourt-step-upper", 0, 60, 150, 34, 13],
    ].map(([id, x, y, width, depth, height]) => ({
      type: "extrusion" as const,
      id: String(id),
      plan: rect(Number(x), Number(y), Number(width), Number(depth)),
      height: Number(height),
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "stroke",
      id: "hall-colonnade-seams",
      path: "M -188.0000 30.0000 L -188.0000 96.0000 M -142.0000 56.0000 L -142.0000 122.0000 M -96.0000 82.0000 L -96.0000 148.0000 M -50.0000 108.0000 L -50.0000 174.0000 M 94.0000 -86.0000 L 94.0000 -20.0000 M 140.0000 -60.0000 L 140.0000 6.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "fin-cap-seams",
      path: "M -192.0000 -173.0000 L -174.0000 -163.0000 M -105.0000 -202.0000 L -87.0000 -192.0000 M -18.0000 -231.0000 L 0.0000 -221.0000 M 69.0000 -260.0000 L 87.0000 -250.0000 M 156.0000 -289.0000 L 174.0000 -279.0000",
      stroke: "accent.emissive",
      detailTier: 2,
    },
  ],
});

export const WORLD_CITY_GEOMETRY_DEFINITIONS: readonly GeometryDefinition[] =
  Object.freeze([
    WORLD_GEOMETRY,
    NINJAONE_GEOMETRY,
    TANIUM_GEOMETRY,
    INDEPENDENT_GEOMETRY,
    ACE_HARDWARE_GEOMETRY,
    COLUMN_GEOMETRY,
  ]);
