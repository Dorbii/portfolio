import {
  nodeById,
  recordsForTrace,
  traceById,
} from "../../evidence-atlas/model/evidence-data";
import {
  careerWorldRegistry,
  instanceById,
  projectById,
  type CareerProjectId,
} from "./world-registry";

export const METRICS_EVIDENCE_TRACE_ID = "engineering-metrics-pipeline";

export function getProjectEvidence(projectId: CareerProjectId) {
  const careerProject = projectById.get(projectId);
  if (!careerProject) throw new Error(`Career World project is unavailable: ${projectId}`);
  if (careerProject.evidenceStatus === "identity-only") return null;
  if (careerProject.evidenceStatus !== "evidence-backed" || !careerProject.evidenceTraceId) {
    throw new Error(`Career World evidence contract is unavailable: ${projectId}`);
  }

  const trace = traceById.get(careerProject.evidenceTraceId);
  if (!trace) throw new Error(`Evidence Atlas trace is unavailable: ${careerProject.evidenceTraceId}`);

  const skillAssets = careerWorldRegistry.projectSkillLinks
    .filter((link) => link.projectId === projectId)
    .map((link) => {
      const instance = instanceById.get(link.skillInstanceId);
      const asset = instance && careerWorldRegistry.assets.find((candidate) => candidate.id === instance.assetId);
      if (!instance || !asset) throw new Error(`Career World skill asset is unavailable: ${link.skillInstanceId}`);
      return asset;
    });

  return Object.freeze({
    careerProject,
    project: trace,
    trace,
    records: recordsForTrace(trace.id),
    skillAssets: Object.freeze(skillAssets),
  });
}

export function isEvidenceEligibleProject(projectId: CareerProjectId) {
  return getProjectEvidence(projectId) !== null;
}

export function getKaizenMetricsEvidence() {
  const evidence = getProjectEvidence("engineering-metrics-pipeline");
  if (!evidence) throw new Error("Kaizen Metrics evidence trace is unavailable");
  return Object.freeze({
    ...evidence,
    nodeLabels: evidence.trace.nodeIds.map((nodeId) => nodeById.get(nodeId)?.label ?? nodeId),
  });
}
