import { evidenceRecords, evidenceTraces } from "./evidence-data";

export type ProjectRelationshipSupportKind =
  | "direct-evidence"
  | "curated-summary";

export type ProjectSkillRelationship = {
  projectId: string;
  nodeId: string;
  supportKind: ProjectRelationshipSupportKind;
  evidenceWeight: number;
  layoutWeight: number;
  evidenceIds: string[];
};

export const projectSkillRelationships: ProjectSkillRelationship[] =
  evidenceTraces.flatMap((project) =>
    project.nodeIds.map((nodeId) => {
      const evidence = evidenceRecords.filter(
        (record) =>
          record.traceId === project.id && record.nodeIds.includes(nodeId),
      );
      const evidenceWeight = evidence.reduce(
        (total, record) => total + record.weight,
        0,
      );
      return {
        projectId: project.id,
        nodeId,
        supportKind:
          evidenceWeight > 0 ? "direct-evidence" : "curated-summary",
        evidenceWeight,
        // Curated project summaries still influence placement without being
        // presented as record-backed visual density.
        layoutWeight: Math.max(0.35, evidenceWeight),
        evidenceIds: evidence.map((record) => record.id),
      };
    }),
  );

export const projectSkillRelationshipsByNode = new Map(
  evidenceTraces
    .flatMap((project) => project.nodeIds)
    .filter((nodeId, index, nodeIds) => nodeIds.indexOf(nodeId) === index)
    .map((nodeId) => [
      nodeId,
      projectSkillRelationships.filter(
        (relationship) => relationship.nodeId === nodeId,
      ),
    ]),
);

export const projectSkillRelationshipsByProject = new Map(
  evidenceTraces.map((project) => [
    project.id,
    projectSkillRelationships.filter(
      (relationship) => relationship.projectId === project.id,
    ),
  ]),
);
