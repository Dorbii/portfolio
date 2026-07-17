import type { CareerAssetId } from "../geometry/types";
import {
  careerWorldRegistry,
  employerById,
  type CareerProjectId,
  type EmployerId,
  type WorldPoint,
} from "./world-registry";

export type ScenePlacement = Readonly<{
  instanceId: string;
  assetId: CareerAssetId;
  employerId: EmployerId;
  projectId: CareerProjectId | null;
  kind: "capital" | "project" | "skill";
  position: WorldPoint;
  scale: number;
}>;

type OffsetTuple = readonly [id: string, x: number, y: number];

const projectOffsets: Readonly<Record<EmployerId, readonly OffsetTuple[]>> = {
  ninjaone: [
    ["kaizen-agent-platform", -126, -74],
    ["vendy-vm-platform", 132, -62],
    ["engineering-metrics-pipeline", 10, 112],
  ],
  tanium: [
    ["tanium-risk-assessment", -132, -72],
    ["uat-automation", 0, -102],
    ["cablecar", 138, -58],
    ["xsearch", 104, 86],
    ["tmatch-eolmatch", -92, 92],
  ],
  independent: [
    ["contextforge", -116, 36],
    ["career-world-portfolio", 124, 30],
  ],
  "ace-hardware": [
    ["ticket-validation-automation", -126, -64],
    ["sap-table-update-integration", 126, -52],
    ["qc-alm-extractor", 8, 102],
  ],
  "column-technologies": [
    ["atlassian-platform-automation", -128, -58],
    ["atlassian-data-center-resilience", 126, -58],
    ["client-devops-delivery-implementations", 0, 104],
  ],
};

const skillOffsets: Readonly<Record<EmployerId, readonly OffsetTuple[]>> = {
  ninjaone: [
    ["safe-writes", -242, -18],
    ["data-contracts", -226, -82],
    ["go", -184, -132],
    ["redis", -120, -158],
    ["mcp", -48, -170],
    ["openapi", 30, -168],
    ["workflow-orchestration", 108, -150],
    ["operator-control", 178, -118],
    ["react", 226, -68],
    ["aws", 246, -4],
    ["postgresql", 224, 62],
    ["vmware", 178, 112],
    ["macstadium", 108, 144],
    ["python", 28, 158],
    ["databricks", -58, 154],
    ["docker", -142, 128],
    ["ai", -210, 80],
  ],
  tanium: [
    ["python", -224, -58],
    ["go", -160, -130],
    ["workflow-orchestration", -58, -162],
    ["operator-control", 58, -158],
    ["data-contracts", 164, -124],
    ["csharp", 226, -48],
    ["localdb", 218, 58],
    ["react", 132, 132],
    ["electron", 16, 158],
    ["manifest-v3", -126, 132],
  ],
  independent: [
    ["context-compression", -218, -70],
    ["workflow-orchestration", -100, -148],
    ["data-contracts", 42, -162],
    ["typescript", 174, -106],
    ["react", 218, 38],
    ["operator-control", -148, 134],
  ],
  "ace-hardware": [["informatica", -198, 116]],
  "column-technologies": [
    ["atlassian", -206, 112],
    ["ci-cd", 10, -166],
    ["docker", 210, 108],
  ],
};

function atOffset(employerId: EmployerId, offset: OffsetTuple): WorldPoint {
  const anchor = employerById.get(employerId)!.anchor;
  return Object.freeze({ x: anchor.x + offset[1], y: anchor.y + offset[2] });
}

const offsetsByInstanceId = new Map<string, OffsetTuple>();
for (const employer of careerWorldRegistry.employers) {
  for (const offset of projectOffsets[employer.id]) {
    offsetsByInstanceId.set(
      `instance/${employer.id}/project/${offset[0]}/01`,
      offset,
    );
  }
  for (const offset of skillOffsets[employer.id]) {
    offsetsByInstanceId.set(
      `instance/${employer.id}/skill/${offset[0]}/01`,
      offset,
    );
  }
}

export const scenePlacements: readonly ScenePlacement[] = Object.freeze(
  careerWorldRegistry.instances.map((instance) => {
    const employer = employerById.get(instance.employerId)!;
    if (instance.kind === "capital") {
      return Object.freeze({
        instanceId: instance.id,
        assetId: instance.assetId as CareerAssetId,
        employerId: instance.employerId,
        projectId: null,
        kind: instance.kind,
        position: employer.anchor,
        scale: 0.22,
      });
    }

    const offset = offsetsByInstanceId.get(instance.id);
    if (!offset) throw new Error(`Missing scene placement for ${instance.id}`);
    return Object.freeze({
      instanceId: instance.id,
      assetId: instance.assetId as CareerAssetId,
      employerId: instance.employerId,
      projectId: instance.projectId ?? null,
      kind: instance.kind,
      position: atOffset(instance.employerId, offset),
      scale: instance.kind === "project" ? 0.17 : 0.12,
    });
  }),
);

if (scenePlacements.length !== careerWorldRegistry.instances.length) {
  throw new Error("Career World scene composition is incomplete");
}

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
