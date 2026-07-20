import type { CareerAssetId } from "../geometry/types";
import type { CareerWorldPaletteId } from "../geometry/palettes";
import {
  careerWorldRegistry,
  employerById,
  type CareerProjectId,
  type EmployerId,
  type WorldPoint,
} from "./world-registry";

export type DetailTier = "world" | "territory" | "district" | "close";

export type WorldRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type FootprintClass =
  | "capital-standard"
  | "capital-wide"
  | "capital-deep"
  | "project-standard"
  | "project-wide"
  | "project-deep"
  | "project-tall"
  | "project-linear"
  | "skill-standard"
  | "skill-wide"
  | "skill-tall"
  | "skill-linear"
  | "skill-large"
  | "ambient-road"
  | "ambient-water";

export type WorldZone = Readonly<{
  id: EmployerId;
  topology: "mainland" | "island";
  origin: WorldPoint;
  bounds: WorldRect;
  paletteId: CareerWorldPaletteId;
}>;

export type ScenePlacement = Readonly<{
  instanceId: string;
  assetId: CareerAssetId;
  employerId: EmployerId;
  projectId: CareerProjectId | null;
  kind: "capital" | "project" | "skill";
  localPosition: WorldPoint;
  position: WorldPoint;
  footprintClass: FootprintClass;
  footprint: Readonly<{ width: number; depth: number }>;
  visualWidth: number;
  groundAnchor: Readonly<{ x: number; y: number }>;
  minDetail: DetailTier;
  labelDetail: DetailTier;
  paletteId: CareerWorldPaletteId;
}>;

export type AmbientPlacement = Readonly<{
  instanceId: string;
  assetId: CareerAssetId;
  employerId: EmployerId | null;
  projectId: null;
  kind: "ambient";
  position: WorldPoint;
  footprintClass: FootprintClass;
  footprint: Readonly<{ width: number; depth: number }>;
  visualWidth: number;
  groundAnchor: Readonly<{ x: number; y: number }>;
  minDetail: DetailTier;
  labelDetail: null;
  paletteId: "ambient-neutral";
}>;

export type SceneNode = ScenePlacement | AmbientPlacement;

export type RouteDefinition = Readonly<{
  id: string;
  points: readonly WorldPoint[];
  closed: boolean;
}>;

const FOOTPRINTS: Readonly<
  Record<FootprintClass, Readonly<{ width: number; depth: number }>>
> = Object.freeze({
  "capital-standard": Object.freeze({ width: 146, depth: 96 }),
  "capital-wide": Object.freeze({ width: 160, depth: 90 }),
  "capital-deep": Object.freeze({ width: 144, depth: 106 }),
  "project-standard": Object.freeze({ width: 62, depth: 40 }),
  "project-wide": Object.freeze({ width: 78, depth: 36 }),
  "project-deep": Object.freeze({ width: 58, depth: 52 }),
  "project-tall": Object.freeze({ width: 48, depth: 50 }),
  "project-linear": Object.freeze({ width: 82, depth: 28 }),
  "skill-standard": Object.freeze({ width: 40, depth: 28 }),
  "skill-wide": Object.freeze({ width: 50, depth: 26 }),
  "skill-tall": Object.freeze({ width: 30, depth: 40 }),
  "skill-linear": Object.freeze({ width: 54, depth: 20 }),
  "skill-large": Object.freeze({ width: 52, depth: 38 }),
  "ambient-road": Object.freeze({ width: 26, depth: 10 }),
  "ambient-water": Object.freeze({ width: 28, depth: 12 }),
});

const zoneBounds: Readonly<Record<EmployerId, WorldRect>> = Object.freeze({
  ninjaone: Object.freeze({ x: 80, y: 100, width: 560, height: 450 }),
  tanium: Object.freeze({ x: 520, y: 100, width: 560, height: 430 }),
  independent: Object.freeze({ x: 960, y: 130, width: 580, height: 390 }),
  "ace-hardware": Object.freeze({ x: 70, y: 565, width: 560, height: 300 }),
  "column-technologies": Object.freeze({ x: 920, y: 560, width: 620, height: 310 }),
});

export const worldZones: readonly WorldZone[] = Object.freeze(
  careerWorldRegistry.employers.map((employer) =>
    Object.freeze({
      id: employer.id,
      topology:
        employer.id === "ace-hardware" || employer.id === "column-technologies"
          ? "island"
          : "mainland",
      origin: employer.anchor,
      bounds: zoneBounds[employer.id],
      paletteId: employer.palette,
    }),
  ),
);

type ProjectLayoutTuple = readonly [
  id: CareerProjectId,
  x: number,
  y: number,
  visualWidth: number,
  footprintClass: FootprintClass,
];

const projectLayouts: Readonly<Record<EmployerId, readonly ProjectLayoutTuple[]>> = {
  ninjaone: [
    ["kaizen-agent-platform", 280, 438, 78, "project-standard"],
    ["vendy-vm-platform", 590, 260, 82, "project-deep"],
    ["engineering-metrics-pipeline", 380, 397, 72, "project-standard"],
  ],
  tanium: [
    ["tanium-risk-assessment", 637, 299, 66, "project-tall"],
    ["uat-automation", 645, 209, 88, "project-linear"],
    ["cablecar", 935, 284, 82, "project-wide"],
    ["xsearch", 885, 378, 82, "project-wide"],
    ["tmatch-eolmatch", 687, 382, 68, "project-deep"],
  ],
  independent: [
    ["contextforge", 1118, 378, 80, "project-wide"],
    ["career-world-portfolio", 1390, 377, 76, "project-deep"],
  ],
  "ace-hardware": [
    ["ticket-validation-automation", 350, 755, 70, "project-linear"],
    ["sap-table-update-integration", 433, 680, 82, "project-wide"],
    ["qc-alm-extractor", 195, 755, 70, "project-deep"],
  ],
  "column-technologies": [
    ["atlassian-platform-automation", 1000, 705, 70, "project-standard"],
    ["atlassian-data-center-resilience", 1333, 686, 82, "project-wide"],
    ["client-devops-delivery-implementations", 1300, 795, 62, "project-tall"],
  ],
};

type SkillLayoutTuple = readonly [id: string, x: number, y: number];

const skillLayouts: Readonly<Record<EmployerId, readonly SkillLayoutTuple[]>> = {
  ninjaone: [
    ["safe-writes", 140, 275],
    ["data-contracts", 250, 150],
    ["go", 245, 205],
    ["redis", 160, 205],
    ["mcp", 205, 256],
    ["openapi", 480, 288],
    ["workflow-orchestration", 565, 314],
    ["operator-control", 495, 367],
    ["react", 550, 385],
    ["aws", 450, 480],
    ["postgresql", 250, 316],
    ["vmware", 360, 464],
    ["macstadium", 520, 445],
    ["python", 220, 490],
    ["databricks", 135, 360],
    ["docker", 210, 361],
    ["ai", 150, 430],
  ],
  tanium: [
    ["python", 564, 307],
    ["go", 580, 390],
    ["workflow-orchestration", 885, 440],
    ["operator-control", 700, 150],
    ["data-contracts", 763, 170],
    ["csharp", 861, 196],
    ["localdb", 1015, 255],
    ["react", 1055, 325],
    ["electron", 985, 335],
    ["manifest-v3", 781, 447],
  ],
  independent: [
    ["context-compression", 1052, 310],
    ["workflow-orchestration", 1004, 247],
    ["data-contracts", 1115, 250],
    ["typescript", 1250, 170],
    ["react", 1378, 273],
    ["operator-control", 1117, 440],
  ],
  "ace-hardware": [["informatica", 174, 680]],
  "column-technologies": [
    ["atlassian", 1060, 762],
    ["ci-cd", 1030, 630],
    ["docker", 1370, 760],
  ],
};

const capitalAppearance: Readonly<
  Record<EmployerId, Readonly<{ visualWidth: number; footprintClass: FootprintClass }>>
> = Object.freeze({
  ninjaone: Object.freeze({ visualWidth: 170, footprintClass: "capital-deep" }),
  tanium: Object.freeze({ visualWidth: 188, footprintClass: "capital-wide" }),
  independent: Object.freeze({ visualWidth: 172, footprintClass: "capital-wide" }),
  "ace-hardware": Object.freeze({ visualWidth: 182, footprintClass: "capital-wide" }),
  "column-technologies": Object.freeze({ visualWidth: 168, footprintClass: "capital-standard" }),
});

const skillAppearance: Readonly<
  Record<string, Readonly<{ visualWidth: number; footprintClass: FootprintClass }>>
> = Object.freeze({
  "safe-writes": Object.freeze({ visualWidth: 44, footprintClass: "skill-wide" }),
  "data-contracts": Object.freeze({ visualWidth: 52, footprintClass: "skill-linear" }),
  go: Object.freeze({ visualWidth: 48, footprintClass: "skill-wide" }),
  redis: Object.freeze({ visualWidth: 54, footprintClass: "skill-linear" }),
  mcp: Object.freeze({ visualWidth: 42, footprintClass: "skill-standard" }),
  openapi: Object.freeze({ visualWidth: 40, footprintClass: "skill-tall" }),
  "workflow-orchestration": Object.freeze({ visualWidth: 46, footprintClass: "skill-large" }),
  "operator-control": Object.freeze({ visualWidth: 46, footprintClass: "skill-standard" }),
  react: Object.freeze({ visualWidth: 46, footprintClass: "skill-standard" }),
  aws: Object.freeze({ visualWidth: 50, footprintClass: "skill-large" }),
  postgresql: Object.freeze({ visualWidth: 38, footprintClass: "skill-tall" }),
  vmware: Object.freeze({ visualWidth: 46, footprintClass: "skill-large" }),
  macstadium: Object.freeze({ visualWidth: 40, footprintClass: "skill-wide" }),
  python: Object.freeze({ visualWidth: 46, footprintClass: "skill-wide" }),
  databricks: Object.freeze({ visualWidth: 48, footprintClass: "skill-large" }),
  docker: Object.freeze({ visualWidth: 46, footprintClass: "skill-standard" }),
  ai: Object.freeze({ visualWidth: 48, footprintClass: "skill-wide" }),
  csharp: Object.freeze({ visualWidth: 46, footprintClass: "skill-standard" }),
  localdb: Object.freeze({ visualWidth: 44, footprintClass: "skill-standard" }),
  electron: Object.freeze({ visualWidth: 44, footprintClass: "skill-large" }),
  "manifest-v3": Object.freeze({ visualWidth: 44, footprintClass: "skill-large" }),
  "context-compression": Object.freeze({ visualWidth: 40, footprintClass: "skill-tall" }),
  typescript: Object.freeze({ visualWidth: 34, footprintClass: "skill-tall" }),
  informatica: Object.freeze({ visualWidth: 48, footprintClass: "skill-wide" }),
  atlassian: Object.freeze({ visualWidth: 50, footprintClass: "skill-wide" }),
  "ci-cd": Object.freeze({ visualWidth: 52, footprintClass: "skill-linear" }),
});

const projectLayoutById = new Map(
  Object.values(projectLayouts).flat().map((layout) => [layout[0], layout]),
);
const skillLayoutByInstanceId = new Map<string, SkillLayoutTuple>();
for (const [employerId, layouts] of Object.entries(skillLayouts)) {
  for (const layout of layouts) {
    skillLayoutByInstanceId.set(
      `instance/${employerId}/skill/${layout[0]}/01`,
      layout,
    );
  }
}

function localPosition(employerId: EmployerId, position: WorldPoint): WorldPoint {
  const origin = employerById.get(employerId)!.anchor;
  return Object.freeze({ x: position.x - origin.x, y: position.y - origin.y });
}

const DEFAULT_GROUND_ANCHOR = Object.freeze({ x: 0.5, y: 0.96 });

export const scenePlacements: readonly ScenePlacement[] = Object.freeze(
  careerWorldRegistry.instances.map((instance) => {
    const employer = employerById.get(instance.employerId)!;
    if (instance.kind === "capital") {
      const appearance = capitalAppearance[instance.employerId];
      return Object.freeze({
        instanceId: instance.id,
        assetId: instance.assetId as CareerAssetId,
        employerId: instance.employerId,
        projectId: null,
        kind: instance.kind,
        localPosition: Object.freeze({ x: 0, y: 0 }),
        position: employer.anchor,
        footprintClass: appearance.footprintClass,
        footprint: FOOTPRINTS[appearance.footprintClass],
        visualWidth: appearance.visualWidth,
        groundAnchor: DEFAULT_GROUND_ANCHOR,
        minDetail: "territory" as const,
        labelDetail: "world" as const,
        paletteId: employer.palette,
      });
    }

    if (instance.kind === "project") {
      const layout = projectLayoutById.get(instance.projectId!);
      if (!layout) throw new Error(`Missing project scene placement for ${instance.id}`);
      const position = Object.freeze({ x: layout[1], y: layout[2] });
      return Object.freeze({
        instanceId: instance.id,
        assetId: instance.assetId as CareerAssetId,
        employerId: instance.employerId,
        projectId: instance.projectId!,
        kind: instance.kind,
        localPosition: localPosition(instance.employerId, position),
        position,
        footprintClass: layout[4],
        footprint: FOOTPRINTS[layout[4]],
        visualWidth: layout[3],
        groundAnchor: DEFAULT_GROUND_ANCHOR,
        minDetail: "territory" as const,
        labelDetail: "territory" as const,
        paletteId: employer.palette,
      });
    }

    const layout = skillLayoutByInstanceId.get(instance.id);
    const skillId = instance.assetId.replace(/^skill\/(.+)@v1$/, "$1");
    const appearance = skillAppearance[skillId];
    if (!layout || !appearance) {
      throw new Error(`Missing skill scene placement for ${instance.id}`);
    }
    const position = Object.freeze({ x: layout[1], y: layout[2] });
    return Object.freeze({
      instanceId: instance.id,
      assetId: instance.assetId as CareerAssetId,
      employerId: instance.employerId,
      projectId: null,
      kind: instance.kind,
      localPosition: localPosition(instance.employerId, position),
      position,
      footprintClass: appearance.footprintClass,
      footprint: FOOTPRINTS[appearance.footprintClass],
      visualWidth: appearance.visualWidth,
      groundAnchor: DEFAULT_GROUND_ANCHOR,
      minDetail: "district" as const,
      labelDetail: "district" as const,
      paletteId: employer.palette,
    });
  }),
);

export const ambientPlacements: readonly AmbientPlacement[] = Object.freeze([
  Object.freeze({ instanceId: "ambient/cargo-boat/01", assetId: "ambient/cargo-boat@v1" as CareerAssetId, employerId: null, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 555, y: 610 }), footprintClass: "ambient-water" as const, footprint: FOOTPRINTS["ambient-water"], visualWidth: 32, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
  Object.freeze({ instanceId: "ambient/cargo-boat/02", assetId: "ambient/cargo-boat@v1" as CareerAssetId, employerId: null, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 1050, y: 620 }), footprintClass: "ambient-water" as const, footprint: FOOTPRINTS["ambient-water"], visualWidth: 32, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
  Object.freeze({ instanceId: "ambient/marker-buoy/01", assetId: "ambient/marker-buoy@v1" as CareerAssetId, employerId: null, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 630, y: 645 }), footprintClass: "ambient-water" as const, footprint: FOOTPRINTS["ambient-water"], visualWidth: 20, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
  Object.freeze({ instanceId: "ambient/marker-buoy/02", assetId: "ambient/marker-buoy@v1" as CareerAssetId, employerId: null, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 980, y: 650 }), footprintClass: "ambient-water" as const, footprint: FOOTPRINTS["ambient-water"], visualWidth: 20, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
  Object.freeze({ instanceId: "ambient/shore-pier/ace", assetId: "ambient/shore-pier@v1" as CareerAssetId, employerId: "ace-hardware" as const, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 470, y: 660 }), footprintClass: "ambient-road" as const, footprint: FOOTPRINTS["ambient-road"], visualWidth: 34, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
  Object.freeze({ instanceId: "ambient/shore-pier/column", assetId: "ambient/shore-pier@v1" as CareerAssetId, employerId: "column-technologies" as const, projectId: null, kind: "ambient" as const, position: Object.freeze({ x: 1130, y: 670 }), footprintClass: "ambient-road" as const, footprint: FOOTPRINTS["ambient-road"], visualWidth: 34, groundAnchor: DEFAULT_GROUND_ANCHOR, minDetail: "territory" as const, labelDetail: null, paletteId: "ambient-neutral" as const }),
]);

export const sceneNodes: readonly SceneNode[] = Object.freeze([
  ...scenePlacements,
  ...ambientPlacements,
]);

export const worldRoutes: readonly RouteDefinition[] = Object.freeze([
  Object.freeze({ id: "mainland-city-loop", closed: true, points: Object.freeze([{ x: 350, y: 350 }, { x: 575, y: 335 }, { x: 800, y: 345 }, { x: 1050, y: 335 }, { x: 1300, y: 350 }, { x: 1110, y: 455 }, { x: 805, y: 475 }, { x: 500, y: 455 }]) }),
  Object.freeze({ id: "ace-ferry", closed: false, points: Object.freeze([{ x: 545, y: 540 }, { x: 500, y: 610 }, { x: 440, y: 675 }]) }),
  Object.freeze({ id: "column-ferry", closed: false, points: Object.freeze([{ x: 1040, y: 545 }, { x: 1085, y: 610 }, { x: 1150, y: 680 }]) }),
]);

export const scenePlacementByInstanceId = new Map(
  scenePlacements.map((placement) => [placement.instanceId, placement]),
);

export const projectScenePlacementByProjectId = new Map(
  scenePlacements
    .filter((placement) => placement.kind === "project" && placement.projectId)
    .map((placement) => [placement.projectId!, placement]),
);

export const projectScenePositionById = new Map(
  [...projectScenePlacementByProjectId].map(([projectId, placement]) => [
    projectId,
    placement.position,
  ]),
);

export const scenePlacementsByEmployer = new Map(
  careerWorldRegistry.employers.map((employer) => [
    employer.id,
    Object.freeze(
      scenePlacements.filter((placement) => placement.employerId === employer.id),
    ),
  ]),
);

if (scenePlacements.length !== careerWorldRegistry.instances.length) {
  throw new Error("Career World scene composition is incomplete");
}
