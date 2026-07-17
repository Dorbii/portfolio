import { PALETTE_SLOTS } from "../geometry/palettes";
import {
  regularPolygonPlan,
  svgPathFromProjectedPoints,
} from "../geometry/primitives";
import { projectSpatialPoint } from "../geometry/projection";
import {
  CAREER_WORLD_PROJECTION_ID,
  type DetailTier,
  type ExtrusionPrimitive,
  type GeometryDefinition,
  type GeometryPrimitive,
  type PaletteSlot,
  type PlanPoint,
  type ProjectedPoint,
  type SpatialPoint,
  type StrokePrimitive,
  type SurfacePrimitive,
} from "../geometry/types";

type ProjectAssetId = `project/${string}@v1`;

type ProjectDefinitionInput = Readonly<{
  assetId: ProjectAssetId;
  geometryKey: `career-world/${string}/master-v1`;
  masterGeometryHash: `sha256:${string}`;
  primaryPathHash: `sha256:${string}`;
  primaryPath: string;
  footprint: Readonly<{ width: number; depth: number }>;
  primitives: readonly GeometryPrimitive[];
}>;

const BASE_TOP: PaletteSlot = "structure.base";
const BASE_LIT: PaletteSlot = "structure.base";
const BASE_SHADOW: PaletteSlot = "structure.shadow";
const PRIMARY_LINE: PaletteSlot = "line.primary";

function freezePlan(points: readonly PlanPoint[]): readonly PlanPoint[] {
  return Object.freeze(
    points.map((point) => Object.freeze({ x: point.x, y: point.y })),
  );
}

function rectAt(
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

function translatePlan(
  plan: readonly PlanPoint[],
  offsetX: number,
  offsetY: number,
): readonly PlanPoint[] {
  return freezePlan(
    plan.map((point) => ({
      x: point.x + offsetX,
      y: point.y + offsetY,
    })),
  );
}

function spatialPath(points: readonly SpatialPoint[]): string {
  return svgPathFromProjectedPoints(points.map(projectSpatialPoint));
}

function outlinePath(points: readonly ProjectedPoint[]): string {
  return svgPathFromProjectedPoints(points);
}

function extrusion(
  id: string,
  plan: readonly PlanPoint[],
  height: number,
  detailTier: DetailTier = 0,
  top: PaletteSlot = BASE_TOP,
): ExtrusionPrimitive {
  return Object.freeze({
    type: "extrusion",
    id,
    plan,
    height,
    top,
    litSide: BASE_LIT,
    shadowSide: BASE_SHADOW,
    stroke: PRIMARY_LINE,
    detailTier,
  });
}

function surface(
  id: string,
  path: string,
  detailTier: DetailTier = 0,
  fill: PaletteSlot = BASE_TOP,
  stroke: PaletteSlot = PRIMARY_LINE,
): SurfacePrimitive {
  return Object.freeze({
    type: "surface",
    id,
    path,
    fill,
    stroke,
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

function cuboidSurfaces(
  id: string,
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
  bottomZ: number,
  topZ: number,
  detailTier: DetailTier = 0,
): readonly SurfacePrimitive[] {
  const x0 = centerX - width / 2;
  const x1 = centerX + width / 2;
  const y0 = centerY - depth / 2;
  const y1 = centerY + depth / 2;
  const lower = [
    { x: x0, y: y0, z: bottomZ },
    { x: x1, y: y0, z: bottomZ },
    { x: x1, y: y1, z: bottomZ },
    { x: x0, y: y1, z: bottomZ },
  ] as const;
  const upper = [
    { x: x0, y: y0, z: topZ },
    { x: x1, y: y0, z: topZ },
    { x: x1, y: y1, z: topZ },
    { x: x0, y: y1, z: topZ },
  ] as const;

  return Object.freeze([
    surface(`${id}-side-0`, spatialPath([lower[0], lower[1], upper[1], upper[0]]), detailTier),
    surface(`${id}-side-1`, spatialPath([lower[1], lower[2], upper[2], upper[1]]), detailTier, BASE_SHADOW),
    surface(`${id}-side-2`, spatialPath([lower[2], lower[3], upper[3], upper[2]]), detailTier, BASE_SHADOW),
    surface(`${id}-side-3`, spatialPath([lower[3], lower[0], upper[0], upper[3]]), detailTier),
    surface(`${id}-top`, spatialPath(upper), detailTier),
  ]);
}

function frustumSurfaces(
  id: string,
  lower: Readonly<{ centerX: number; centerY: number; width: number; depth: number; z: number }>,
  upper: Readonly<{ centerX: number; centerY: number; width: number; depth: number; z: number }>,
  includeTop = true,
): readonly SurfacePrimitive[] {
  const lowerPoints = [
    { x: lower.centerX - lower.width / 2, y: lower.centerY - lower.depth / 2, z: lower.z },
    { x: lower.centerX + lower.width / 2, y: lower.centerY - lower.depth / 2, z: lower.z },
    { x: lower.centerX + lower.width / 2, y: lower.centerY + lower.depth / 2, z: lower.z },
    { x: lower.centerX - lower.width / 2, y: lower.centerY + lower.depth / 2, z: lower.z },
  ] as const;
  const upperPoints = [
    { x: upper.centerX - upper.width / 2, y: upper.centerY - upper.depth / 2, z: upper.z },
    { x: upper.centerX + upper.width / 2, y: upper.centerY - upper.depth / 2, z: upper.z },
    { x: upper.centerX + upper.width / 2, y: upper.centerY + upper.depth / 2, z: upper.z },
    { x: upper.centerX - upper.width / 2, y: upper.centerY + upper.depth / 2, z: upper.z },
  ] as const;
  const sides = [
    surface(`${id}-side-0`, spatialPath([lowerPoints[0], lowerPoints[1], upperPoints[1], upperPoints[0]])),
    surface(`${id}-side-1`, spatialPath([lowerPoints[1], lowerPoints[2], upperPoints[2], upperPoints[1]]), 0, BASE_SHADOW),
    surface(`${id}-side-2`, spatialPath([lowerPoints[2], lowerPoints[3], upperPoints[3], upperPoints[2]]), 0, BASE_SHADOW),
    surface(`${id}-side-3`, spatialPath([lowerPoints[3], lowerPoints[0], upperPoints[0], upperPoints[3]])),
  ];
  if (includeTop) {
    sides.push(surface(`${id}-top`, spatialPath(upperPoints)));
  }
  return Object.freeze(sides);
}

function projectDefinition(input: ProjectDefinitionInput): GeometryDefinition {
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

const contextForge = projectDefinition({
  assetId: "project/contextforge@v1",
  geometryKey: "career-world/project/contextforge/master-v1",
  masterGeometryHash: "sha256:b514e77499d8105737a3d9339229a7d57bedc0cfb529db18012d8985601cc6c1",
  primaryPathHash: "sha256:7c4ec00cc9912ccd5740de3f303ffd418c577cefbdbde0b26ee8404ce129e5cc",
  primaryPath: outlinePath([
    { x: -144, y: 18 },
    { x: -126, y: -92 },
    { x: -72, y: -153 },
    { x: -6, y: -181 },
    { x: 73, y: -151 },
    { x: 134, y: -88 },
    { x: 147, y: -3 },
    { x: 88, y: 58 },
    { x: -14, y: 100 },
    { x: -112, y: 55 },
  ]),
  footprint: { width: 260, depth: 250 },
  primitives: [
    extrusion(
      "l-foundation",
      freezePlan([
        { x: -108, y: -82 },
        { x: 30, y: -82 },
        { x: 30, y: -28 },
        { x: 102, y: -28 },
        { x: 102, y: 86 },
        { x: 38, y: 86 },
        { x: 38, y: 30 },
        { x: -108, y: 30 },
      ]),
      8,
    ),
    extrusion("fabrication-long-hall", rectAt(-40, 1, 136, 58), 32),
    extrusion("fabrication-return-hall", rectAt(67, 28, 58, 116), 32),
    surface("sawtooth-vault-01", spatialPath([
      { x: -106, y: -26, z: 32 },
      { x: -70, y: -26, z: 48 },
      { x: -70, y: 28, z: 48 },
      { x: -106, y: 28, z: 32 },
    ])),
    surface("sawtooth-vault-02", spatialPath([
      { x: -70, y: -26, z: 32 },
      { x: -34, y: -26, z: 48 },
      { x: -34, y: 28, z: 48 },
      { x: -70, y: 28, z: 32 },
    ])),
    surface("sawtooth-vault-03", spatialPath([
      { x: -34, y: -26, z: 32 },
      { x: 2, y: -26, z: 48 },
      { x: 2, y: 28, z: 48 },
      { x: -34, y: 28, z: 32 },
    ])),
    extrusion("offset-archive-tower", rectAt(68, 59, 38, 42), 92),
    extrusion(
      "compression-house",
      translatePlan(regularPolygonPlan(12, 28, 15), -82, -62),
      58,
    ),
    surface("diagonal-transfer-bridge", spatialPath([
      { x: -67, y: -48, z: 58 },
      { x: -60, y: -56, z: 58 },
      { x: 61, y: 43, z: 65 },
      { x: 54, y: 51, z: 65 },
    ]), 0, "structure.shadow"),
    stroke("bridge-truss", spatialPath([
      { x: -64, y: -52, z: 65 },
      { x: -41, y: -27, z: 72 },
      { x: -18, y: -13, z: 65 },
      { x: 5, y: 12, z: 72 },
      { x: 28, y: 26, z: 65 },
      { x: 57, y: 47, z: 70 },
    ]), 1),
    stroke("cold-tool-rack", spatialPath([
      { x: 34, y: 76, z: 12 },
      { x: 34, y: 76, z: 28 },
      { x: 50, y: 76, z: 28 },
      { x: 50, y: 76, z: 12 },
      { x: 39, y: 76, z: 27 },
      { x: 39, y: 76, z: 16 },
      { x: 45, y: 76, z: 27 },
      { x: 45, y: 76, z: 16 },
    ]), 2, "accent.focus"),
  ],
});

const careerWorldPortfolio = projectDefinition({
  assetId: "project/career-world-portfolio@v1",
  geometryKey: "career-world/project/career-world-portfolio/master-v1",
  masterGeometryHash: "sha256:e6637dbce85d773d7cf0195e285de5fefd8aa7f633ab080254101e7adee9b30a",
  primaryPathHash: "sha256:82742d1069dd48aaf0ad616778dea46e3be581f99c500c6461496f625a087413",
  primaryPath: outlinePath([
    { x: -165, y: 18 },
    { x: -120, y: -61 },
    { x: -62, y: -81 },
    { x: -39, y: -139 },
    { x: 0, y: -159 },
    { x: 39, y: -139 },
    { x: 62, y: -81 },
    { x: 120, y: -61 },
    { x: 155, y: 18 },
    { x: 83, y: 72 },
    { x: 36, y: 54 },
    { x: 0, y: 86 },
    { x: -36, y: 54 },
    { x: -83, y: 72 },
  ]),
  footprint: { width: 310, depth: 280 },
  primitives: [
    extrusion("rear-pavilion", rectAt(0, 55, 116, 34), 34),
    extrusion("left-pavilion-arm", rectAt(-52, 5, 34, 112), 34),
    extrusion("right-pavilion-arm", rectAt(52, 5, 34, 112), 34),
    extrusion("left-front-pavilion", rectAt(-66, -53, 62, 34), 34),
    extrusion("right-front-pavilion", rectAt(66, -53, 62, 34), 34),
    surface("folded-map-roof-rear-left", spatialPath([
      { x: -58, y: 38, z: 34 },
      { x: 0, y: 38, z: 51 },
      { x: 0, y: 72, z: 43 },
      { x: -58, y: 72, z: 34 },
    ])),
    surface("folded-map-roof-rear-right", spatialPath([
      { x: 0, y: 38, z: 51 },
      { x: 58, y: 38, z: 34 },
      { x: 58, y: 72, z: 34 },
      { x: 0, y: 72, z: 43 },
    ])),
    surface("folded-map-roof-left", spatialPath([
      { x: -69, y: -51, z: 34 },
      { x: -35, y: -51, z: 46 },
      { x: -35, y: 38, z: 42 },
      { x: -69, y: 38, z: 34 },
    ])),
    surface("folded-map-roof-right", spatialPath([
      { x: 35, y: -51, z: 46 },
      { x: 69, y: -51, z: 34 },
      { x: 69, y: 38, z: 34 },
      { x: 35, y: 38, z: 42 },
    ])),
    extrusion("viewpoint-deck-left", rectAt(-108, 14, 80, 42), 18),
    extrusion("viewpoint-deck-right", rectAt(108, 14, 80, 42), 18),
    extrusion("viewpoint-deck-rear", rectAt(0, 102, 48, 60), 18),
    extrusion("inset-evidence-gallery", rectAt(77, -26, 18, 54), 24),
    surface("blank-survey-table", spatialPath([
      { x: -15, y: -12, z: 10 },
      { x: 15, y: -12, z: 10 },
      { x: 15, y: 8, z: 10 },
      { x: -15, y: 8, z: 10 },
    ]), 2, "structure.shadow", "accent.focus"),
  ],
});

const ticketValidationAutomation = projectDefinition({
  assetId: "project/ticket-validation-automation@v1",
  geometryKey: "career-world/project/ticket-validation-automation/master-v1",
  masterGeometryHash: "sha256:4ef57b7660bc8de414a986831630c982e2daf67cfa42a812162168c7ceff9353",
  primaryPathHash: "sha256:9a3f4df01905b2331abbfec46c94671b188e36e5dc1f76476d93ba881eedd0dc",
  primaryPath: outlinePath([
    { x: -166, y: 38 },
    { x: -120, y: -82 },
    { x: -63, y: -147 },
    { x: 9, y: -127 },
    { x: 92, y: -94 },
    { x: 132, y: -46 },
    { x: 153, y: 36 },
    { x: 72, y: 63 },
    { x: -36, y: 99 },
  ]),
  footprint: { width: 280, depth: 180 },
  primitives: [
    extrusion("wedge-platform", freezePlan([
      { x: -128, y: -58 },
      { x: 112, y: -58 },
      { x: 132, y: 0 },
      { x: 102, y: 58 },
      { x: -128, y: 58 },
    ]), 10),
    extrusion("canopy-support-left", rectAt(-83, -3, 12, 20), 58),
    extrusion("canopy-support-center", rectAt(-27, 2, 12, 20), 64),
    extrusion("canopy-support-right", rectAt(29, 7, 12, 20), 58),
    surface("folded-canopy-left", spatialPath([
      { x: -112, y: -38, z: 62 },
      { x: -42, y: -38, z: 83 },
      { x: -42, y: 38, z: 76 },
      { x: -112, y: 38, z: 62 },
    ])),
    surface("folded-canopy-center", spatialPath([
      { x: -42, y: -38, z: 83 },
      { x: 25, y: -38, z: 68 },
      { x: 25, y: 38, z: 73 },
      { x: -42, y: 38, z: 76 },
    ])),
    surface("folded-canopy-tip", spatialPath([
      { x: 25, y: -38, z: 68 },
      { x: 81, y: -25, z: 78 },
      { x: 81, y: 25, z: 78 },
      { x: 25, y: 38, z: 73 },
    ])),
    ...[-48, -28, -8, 12, 32, 52].map((x, index) =>
      extrusion(`gate-rib-${index + 1}`, rectAt(x, 13, 7, 32), 34),
    ),
    extrusion("inspection-arch-left-post", rectAt(86, 11, 12, 28), 62),
    extrusion("inspection-arch-right-post", rectAt(116, 11, 12, 28), 62),
    ...cuboidSurfaces("inspection-arch-header", 101, 11, 42, 28, 54, 68),
    stroke("clean-canopy-perforations", spatialPath([
      { x: -95, y: -22, z: 65 },
      { x: -82, y: -22, z: 68 },
      { x: -69, y: -22, z: 71 },
      { x: -56, y: -22, z: 75 },
      { x: -43, y: -22, z: 78 },
      { x: -31, y: -22, z: 77 },
      { x: -18, y: -22, z: 74 },
    ]), 1, "line.secondary"),
  ],
});

const sapTableUpdateIntegration = projectDefinition({
  assetId: "project/sap-table-update-integration@v1",
  geometryKey: "career-world/project/sap-table-update-integration/master-v1",
  masterGeometryHash: "sha256:01f7aae8ac98e46f87c656f8330436ce2863352cabd0619c5636ce071381d8f7",
  primaryPathHash: "sha256:f80aed3911ec95fa6bc2cc20dac982e14d596f2ea6f4a7ee9502be4db39c649a",
  primaryPath: outlinePath([
    { x: -143, y: -8 },
    { x: -111, y: -112 },
    { x: -22, y: -162 },
    { x: 78, y: -127 },
    { x: 143, y: -59 },
    { x: 132, y: 37 },
    { x: 55, y: 82 },
    { x: -50, y: 73 },
    { x: -120, y: 46 },
  ]),
  footprint: { width: 270, depth: 270 },
  primitives: [
    extrusion("corner-pier-northwest", rectAt(-76, -58, 24, 24), 66),
    extrusion("corner-pier-northeast", rectAt(76, -58, 24, 24), 66),
    extrusion("corner-pier-southeast", rectAt(76, 58, 24, 24), 66),
    extrusion("corner-pier-southwest", rectAt(-76, 58, 24, 24), 66),
    extrusion("centered-mechanical-lift", rectAt(0, 0, 30, 30), 62, 0, "accent.emissive"),
    ...cuboidSurfaces("elevated-grid-deck", 0, 0, 184, 144, 62, 74),
    extrusion("narrow-transfer-bridge", rectAt(0, -70, 26, 112), 12),
    stroke("deck-grid-longitudinal", spatialPath([
      { x: -92, y: -24, z: 74 },
      { x: 92, y: -24, z: 74 },
      { x: 92, y: 24, z: 74 },
      { x: -92, y: 24, z: 74 },
    ]), 1),
    stroke("deck-grid-crosswise", spatialPath([
      { x: -46, y: -72, z: 74 },
      { x: -46, y: 72, z: 74 },
      { x: 0, y: 72, z: 74 },
      { x: 0, y: -72, z: 74 },
      { x: 46, y: -72, z: 74 },
      { x: 46, y: 72, z: 74 },
    ]), 1),
  ],
});

const qcAlmExtractor = projectDefinition({
  assetId: "project/qc-alm-extractor@v1",
  geometryKey: "career-world/project/qc-alm-extractor/master-v1",
  masterGeometryHash: "sha256:18c6a8076be80eea213d13d5da2feb7f7b0180eedeec62d1f5778bcecdd41c92",
  primaryPathHash: "sha256:2d44a790a528d450d25448e91895b28bb056fd813832a480c85a392afcf8bc7e",
  primaryPath: outlinePath([
    { x: -136, y: 43 },
    { x: -107, y: -60 },
    { x: -64, y: -143 },
    { x: -8, y: -173 },
    { x: 58, y: -151 },
    { x: 108, y: -70 },
    { x: 136, y: 34 },
    { x: 68, y: 79 },
    { x: -39, y: 87 },
  ]),
  footprint: { width: 250, depth: 280 },
  primitives: [
    extrusion("quarry-base-lower", freezePlan([
      { x: -94, y: -72 },
      { x: 78, y: -72 },
      { x: 98, y: -35 },
      { x: 86, y: 65 },
      { x: 24, y: 82 },
      { x: -86, y: 65 },
      { x: -104, y: 8 },
    ]), 12),
    extrusion("quarry-base-middle", rectAt(-8, -2, 154, 118), 22),
    extrusion("quarry-base-upper", rectAt(-8, -4, 116, 82), 31),
    extrusion("left-clamp-foot", rectAt(-55, 3, 38, 46), 32),
    extrusion("right-clamp-foot", rectAt(55, 3, 38, 46), 32),
    ...frustumSurfaces(
      "left-leaning-clamp",
      { centerX: -55, centerY: 3, width: 34, depth: 40, z: 30 },
      { centerX: -39, centerY: 4, width: 24, depth: 30, z: 111 },
    ),
    ...frustumSurfaces(
      "right-leaning-clamp",
      { centerX: 55, centerY: 3, width: 34, depth: 40, z: 30 },
      { centerX: 39, centerY: 4, width: 24, depth: 30, z: 111 },
    ),
    ...cuboidSurfaces("suspended-faceted-block", 0, 4, 54, 38, 73, 102),
    extrusion("rear-service-ramp", rectAt(0, 88, 36, 84), 10),
    stroke("clamp-face-seams", spatialPath([
      { x: -54, y: -17, z: 44 },
      { x: -43, y: -11, z: 95 },
      { x: 43, y: -11, z: 95 },
      { x: 54, y: -17, z: 44 },
    ]), 1),
  ],
});

const atlassianPlatformAutomation = projectDefinition({
  assetId: "project/atlassian-platform-automation@v1",
  geometryKey: "career-world/project/atlassian-platform-automation/master-v1",
  masterGeometryHash: "sha256:6c72a6d7fbafed9c626333c902d24c6bebaaf15bef79e64fc4c523020de35c72",
  primaryPathHash: "sha256:d70d632ec5ee9abe009c5ecf7de90ec3ef4e24b9be247f34a82eeaae14e239c7",
  primaryPath: outlinePath([
    { x: -139, y: -31 },
    { x: -102, y: -122 },
    { x: -22, y: -170 },
    { x: -4, y: -139 },
    { x: 17, y: -158 },
    { x: 105, y: -113 },
    { x: 141, y: -24 },
    { x: 104, y: 67 },
    { x: 37, y: 53 },
    { x: 0, y: 84 },
    { x: -39, y: 54 },
    { x: -106, y: 65 },
  ]),
  footprint: { width: 300, depth: 270 },
  primitives: [
    extrusion("compact-central-base", rectAt(0, 0, 46, 46), 31),
    extrusion("stabilizer-arm-west", rectAt(-82, 0, 122, 22), 13),
    extrusion("stabilizer-arm-east", rectAt(82, 0, 122, 22), 13),
    extrusion("stabilizer-arm-north", rectAt(0, 73, 22, 108), 13),
    extrusion("stabilizer-arm-south", rectAt(0, -73, 22, 108), 13),
    ...frustumSurfaces(
      "inverted-tier-lower",
      { centerX: 0, centerY: 0, width: 48, depth: 48, z: 30 },
      { centerX: 0, centerY: 0, width: 88, depth: 70, z: 52 },
    ),
    ...frustumSurfaces(
      "inverted-tier-middle",
      { centerX: 0, centerY: 0, width: 82, depth: 64, z: 52 },
      { centerX: 0, centerY: 0, width: 122, depth: 92, z: 74 },
    ),
    ...frustumSurfaces(
      "inverted-tier-upper",
      { centerX: 0, centerY: 0, width: 116, depth: 86, z: 74 },
      { centerX: 0, centerY: 0, width: 158, depth: 116, z: 96 },
      false,
    ),
    surface("split-roof-west", spatialPath([
      { x: -79, y: -58, z: 96 },
      { x: -5, y: -58, z: 96 },
      { x: -5, y: -18, z: 96 },
      { x: 25, y: 0, z: 96 },
      { x: -5, y: 18, z: 96 },
      { x: -5, y: 58, z: 96 },
      { x: -79, y: 58, z: 96 },
    ])),
    surface("split-roof-east", spatialPath([
      { x: 5, y: -58, z: 96 },
      { x: 79, y: -58, z: 96 },
      { x: 79, y: 58, z: 96 },
      { x: 5, y: 58, z: 96 },
      { x: 5, y: 18, z: 96 },
      { x: -25, y: 0, z: 96 },
      { x: 5, y: -18, z: 96 },
    ])),
    stroke("stepped-tier-seam", spatialPath([
      { x: -58, y: -43, z: 74 },
      { x: 58, y: -43, z: 74 },
      { x: 58, y: 43, z: 74 },
      { x: -58, y: 43, z: 74 },
      { x: -58, y: -43, z: 74 },
    ]), 1),
  ],
});

const atlassianDataCenterResilience = projectDefinition({
  assetId: "project/atlassian-data-center-resilience@v1",
  geometryKey: "career-world/project/atlassian-data-center-resilience/master-v1",
  masterGeometryHash: "sha256:86974242eef5bc1c0f03e53c3c79af0ecbf2b558cc69c98705c5bb103444d5e7",
  primaryPathHash: "sha256:266396dfca987fe19dd64968595e57ed5ecc7819afafa1f3fa09447a0ea2e6e3",
  primaryPath: outlinePath([
    { x: -201, y: 8 },
    { x: -139, y: -69 },
    { x: -75, y: -99 },
    { x: -48, y: -131 },
    { x: 0, y: -145 },
    { x: 48, y: -131 },
    { x: 75, y: -99 },
    { x: 139, y: -69 },
    { x: 176, y: 8 },
    { x: 119, y: 62 },
    { x: 52, y: 54 },
    { x: 0, y: 96 },
    { x: -52, y: 54 },
    { x: -119, y: 62 },
  ]),
  footprint: { width: 350, depth: 230 },
  primitives: [
    extrusion("fortified-u-mass", freezePlan([
      { x: -96, y: -78 },
      { x: 96, y: -78 },
      { x: 96, y: 82 },
      { x: 46, y: 82 },
      { x: 46, y: -24 },
      { x: -46, y: -24 },
      { x: -46, y: 82 },
      { x: -96, y: 82 },
    ]), 39),
    extrusion("buttress-west-rear", rectAt(-107, -53, 22, 28), 30),
    extrusion("buttress-west-front", rectAt(-107, 52, 22, 28), 30),
    extrusion("buttress-east-rear", rectAt(107, -53, 22, 28), 30),
    extrusion("buttress-east-front", rectAt(107, 52, 22, 28), 30),
    extrusion("buttress-back-left", rectAt(-45, -89, 28, 22), 30),
    extrusion("buttress-back-right", rectAt(45, -89, 28, 22), 30),
    extrusion("utility-neck-west", rectAt(-116, 34, 46, 18), 17),
    extrusion("utility-pod-west", rectAt(-146, 34, 44, 46), 25),
    extrusion("utility-neck-east", rectAt(116, 34, 46, 18), 17),
    extrusion("utility-pod-east", rectAt(146, 34, 44, 46), 25),
    stroke("single-roof-datum", spatialPath([
      { x: -96, y: -78, z: 39 },
      { x: 96, y: -78, z: 39 },
      { x: 96, y: 82, z: 39 },
      { x: 46, y: 82, z: 39 },
      { x: 46, y: -24, z: 39 },
      { x: -46, y: -24, z: 39 },
      { x: -46, y: 82, z: 39 },
      { x: -96, y: 82, z: 39 },
      { x: -96, y: -78, z: 39 },
    ]), 1),
  ],
});

const clientDevopsDeliveryImplementations = projectDefinition({
  assetId: "project/client-devops-delivery-implementations@v1",
  geometryKey: "career-world/project/client-devops-delivery-implementations/master-v1",
  masterGeometryHash: "sha256:e5173587fa37103df391b350bc97efcfa4c15a502e74d30e7ace1527d353273a",
  primaryPathHash: "sha256:bb664721fa8bc59f0058f03bcf4149d294ad57c029fa46e1faa4eb53eacb48aa",
  primaryPath: outlinePath([
    { x: -118, y: 38 },
    { x: -105, y: -68 },
    { x: -66, y: -139 },
    { x: 4, y: -212 },
    { x: 78, y: -152 },
    { x: 122, y: -89 },
    { x: 135, y: -12 },
    { x: 105, y: 58 },
    { x: 35, y: 83 },
    { x: -53, y: 78 },
  ]),
  footprint: { width: 230, depth: 210 },
  primitives: [
    extrusion(
      "five-sided-podium",
      regularPolygonPlan(5, 92, -18),
      14,
    ),
    extrusion("wedge-block-one", freezePlan([
      { x: -62, y: -48 },
      { x: -9, y: -48 },
      { x: -9, y: -9 },
      { x: -39, y: 7 },
      { x: -68, y: -18 },
    ]), 56),
    extrusion("wedge-block-two", freezePlan([
      { x: 9, y: -48 },
      { x: 57, y: -48 },
      { x: 69, y: -18 },
      { x: 41, y: 7 },
      { x: 9, y: -9 },
    ]), 74),
    extrusion("wedge-block-three", freezePlan([
      { x: -62, y: 17 },
      { x: -12, y: 9 },
      { x: -9, y: 48 },
      { x: -36, y: 63 },
      { x: -69, y: 41 },
    ]), 92),
    extrusion("wedge-block-four", freezePlan([
      { x: 12, y: 9 },
      { x: 57, y: 17 },
      { x: 66, y: 43 },
      { x: 31, y: 67 },
      { x: 9, y: 48 },
    ]), 112),
    ...cuboidSurfaces("off-center-cantilevered-cap", 19, -3, 152, 104, 110, 134),
    stroke("interlocked-wedge-seams", spatialPath([
      { x: -9, y: -48, z: 22 },
      { x: -9, y: -9, z: 52 },
      { x: 9, y: -9, z: 69 },
      { x: 9, y: -48, z: 31 },
      { x: -12, y: 9, z: 66 },
      { x: -9, y: 48, z: 83 },
      { x: 9, y: 48, z: 103 },
      { x: 12, y: 9, z: 78 },
    ]), 1),
  ],
});

export const PROJECT_GEOMETRY_DEFINITIONS_B = Object.freeze([
  contextForge,
  careerWorldPortfolio,
  ticketValidationAutomation,
  sapTableUpdateIntegration,
  qcAlmExtractor,
  atlassianPlatformAutomation,
  atlassianDataCenterResilience,
  clientDevopsDeliveryImplementations,
] satisfies readonly GeometryDefinition[]);
