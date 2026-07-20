import type { CareerWorldPaletteId } from "../geometry/palettes";

export type WorldPoint = Readonly<{ x: number; y: number }>;

export type EmployerId =
  | "ninjaone"
  | "tanium"
  | "independent"
  | "ace-hardware"
  | "column-technologies";

export type CareerProjectId =
  | "kaizen-agent-platform"
  | "vendy-vm-platform"
  | "engineering-metrics-pipeline"
  | "tanium-risk-assessment"
  | "uat-automation"
  | "cablecar"
  | "xsearch"
  | "tmatch-eolmatch"
  | "contextforge"
  | "career-world-portfolio"
  | "ticket-validation-automation"
  | "sap-table-update-integration"
  | "qc-alm-extractor"
  | "atlassian-platform-automation"
  | "atlassian-data-center-resilience"
  | "client-devops-delivery-implementations";

type AssetCategory = "world" | "city" | "project" | "skill" | "ambient";
type EvidenceStatus =
  | "evidence-backed"
  | "identity-only"
  | "employer-supported-unlinked"
  | "user-required-unplaced"
  | "ambient";

export type CareerAsset = Readonly<{
  id: string;
  category: AssetCategory;
  evidenceStatus: EvidenceStatus;
  kind: AssetCategory;
  label: string;
}>;

export type Employer = Readonly<{
  id: EmployerId;
  label: string;
  assetId: string;
  anchor: WorldPoint;
  palette: CareerWorldPaletteId;
}>;

export type CareerProject = Readonly<{
  id: CareerProjectId;
  label: string;
  assetId: string;
  employerId: EmployerId;
  evidenceStatus: EvidenceStatus;
  evidenceTraceId: string | null;
}>;

export type CareerInstance = Readonly<{
  id: string;
  assetId: string;
  kind: "capital" | "project" | "skill";
  employerId: EmployerId;
  projectId?: CareerProjectId;
}>;

export type ProjectSkillLink = Readonly<{
  projectId: CareerProjectId;
  skillInstanceId: string;
}>;

export type CareerWorldRegistry = Readonly<{
  bounds: typeof WORLD_BOUNDS;
  assets: readonly CareerAsset[];
  employers: readonly Employer[];
  projects: readonly CareerProject[];
  instances: readonly CareerInstance[];
  projectSkillLinks: readonly ProjectSkillLink[];
}>;

export const WORLD_BOUNDS = Object.freeze({ width: 1600, height: 900 });

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

const employers: Employer[] = [
  { id: "ninjaone", label: "NinjaOne", assetId: "city/ninjaone@v1", anchor: { x: 360, y: 307 }, palette: "ninjaone" },
  { id: "tanium", label: "Tanium", assetId: "city/tanium@v1", anchor: { x: 792, y: 313 }, palette: "tanium" },
  { id: "independent", label: "Independent", assetId: "city/independent@v1", anchor: { x: 1252, y: 320 }, palette: "independent" },
  { id: "ace-hardware", label: "ACE Hardware", assetId: "city/ace-hardware@v1", anchor: { x: 295, y: 680 }, palette: "ace-hardware" },
  { id: "column-technologies", label: "Column Technologies", assetId: "city/column-technologies@v1", anchor: { x: 1160, y: 700 }, palette: "column-technologies" },
];

const projects: CareerProject[] = [
  { id: "kaizen-agent-platform", label: "Kaizen Agent Platform", assetId: "project/kaizen-agent-platform@v1", employerId: "ninjaone", evidenceStatus: "evidence-backed", evidenceTraceId: "governed-agent-tooling" },
  { id: "vendy-vm-platform", label: "Vendy VM Platform", assetId: "project/vendy-vm-platform@v1", employerId: "ninjaone", evidenceStatus: "evidence-backed", evidenceTraceId: "cross-provider-orchestration" },
  { id: "engineering-metrics-pipeline", label: "Kaizen Metrics", assetId: "project/kaizen-metrics@v1", employerId: "ninjaone", evidenceStatus: "evidence-backed", evidenceTraceId: "engineering-metrics-pipeline" },
  { id: "tanium-risk-assessment", label: "Tanium Risk Assessment", assetId: "project/tanium-risk-assessment@v1", employerId: "tanium", evidenceStatus: "evidence-backed", evidenceTraceId: "tanium-risk-assessment" },
  { id: "uat-automation", label: "UAT Automation", assetId: "project/uat-automation@v1", employerId: "tanium", evidenceStatus: "evidence-backed", evidenceTraceId: "uat-automation" },
  { id: "cablecar", label: "CableCar", assetId: "project/cablecar@v1", employerId: "tanium", evidenceStatus: "evidence-backed", evidenceTraceId: "cablecar" },
  { id: "xsearch", label: "xSearch", assetId: "project/xsearch@v1", employerId: "tanium", evidenceStatus: "evidence-backed", evidenceTraceId: "xsearch-extension" },
  { id: "tmatch-eolmatch", label: "T-Match / EOLMatch", assetId: "project/tmatch-eolmatch@v1", employerId: "tanium", evidenceStatus: "evidence-backed", evidenceTraceId: "tmatch-eolmatch" },
  { id: "contextforge", label: "ContextForge", assetId: "project/contextforge@v1", employerId: "independent", evidenceStatus: "evidence-backed", evidenceTraceId: "bounded-agent-context" },
  { id: "career-world-portfolio", label: "Career World Portfolio", assetId: "project/career-world-portfolio@v1", employerId: "independent", evidenceStatus: "evidence-backed", evidenceTraceId: "evidence-atlas" },
  { id: "ticket-validation-automation", label: "Ticket Validation Automation", assetId: "project/ticket-validation-automation@v1", employerId: "ace-hardware", evidenceStatus: "identity-only", evidenceTraceId: null },
  { id: "sap-table-update-integration", label: "SAP Table Update Integration", assetId: "project/sap-table-update-integration@v1", employerId: "ace-hardware", evidenceStatus: "identity-only", evidenceTraceId: null },
  { id: "qc-alm-extractor", label: "QC ALM Extractor", assetId: "project/qc-alm-extractor@v1", employerId: "ace-hardware", evidenceStatus: "identity-only", evidenceTraceId: null },
  { id: "atlassian-platform-automation", label: "Atlassian Platform Automation", assetId: "project/atlassian-platform-automation@v1", employerId: "column-technologies", evidenceStatus: "identity-only", evidenceTraceId: null },
  { id: "atlassian-data-center-resilience", label: "Atlassian Data Center Resilience", assetId: "project/atlassian-data-center-resilience@v1", employerId: "column-technologies", evidenceStatus: "identity-only", evidenceTraceId: null },
  { id: "client-devops-delivery-implementations", label: "Client DevOps Delivery Implementations", assetId: "project/client-devops-delivery-implementations@v1", employerId: "column-technologies", evidenceStatus: "identity-only", evidenceTraceId: null },
];

const skillDefinitions = [
  ["safe-writes", "Safe writes", "evidence-backed"], ["context-compression", "Context compression", "evidence-backed"], ["workflow-orchestration", "Workflow orchestration", "evidence-backed"], ["operator-control", "Operator control", "evidence-backed"], ["data-contracts", "Data contracts", "evidence-backed"], ["go", "Go", "evidence-backed"], ["typescript", "TypeScript", "evidence-backed"], ["react", "React", "evidence-backed"], ["aws", "AWS", "evidence-backed"], ["postgresql", "PostgreSQL", "evidence-backed"], ["redis", "Redis", "evidence-backed"], ["mcp", "MCP", "evidence-backed"], ["openapi", "OpenAPI", "evidence-backed"], ["python", "Python", "evidence-backed"], ["docker", "Docker", "evidence-backed"], ["databricks", "Databricks", "evidence-backed"], ["csharp", "C#", "evidence-backed"], ["localdb", "LocalDB", "evidence-backed"], ["manifest-v3", "Manifest V3", "evidence-backed"], ["java", "Java", "user-required-unplaced"], ["ai", "AI", "evidence-backed"], ["vmware", "VMware", "evidence-backed"], ["macstadium", "MacStadium", "evidence-backed"], ["electron", "Electron", "evidence-backed"], ["informatica", "Informatica", "employer-supported-unlinked"], ["atlassian", "Atlassian", "employer-supported-unlinked"], ["ci-cd", "CI/CD", "employer-supported-unlinked"],
] as const satisfies readonly (readonly [string, string, EvidenceStatus])[];
type CareerSkillId = (typeof skillDefinitions)[number][0];

const ambientDefinitions = [
  ["evergreen-cluster", "Evergreen cluster"], ["rock-cluster", "Rock cluster"], ["service-truck", "Service truck"], ["cargo-boat", "Cargo boat"], ["marker-buoy", "Marker buoy"], ["shore-pier", "Shore pier"], ["roof-equipment-kit", "Roof equipment kit"],
] as const;

const assets: CareerAsset[] = [
  { id: "world/career-world@v1", category: "world", evidenceStatus: "ambient", kind: "world", label: "Career World" },
  ...employers.map((employer) => ({ id: employer.assetId, category: "city" as const, evidenceStatus: "evidence-backed" as const, kind: "city" as const, label: employer.label })),
  ...projects.map((project) => ({ id: project.assetId, category: "project" as const, evidenceStatus: project.evidenceStatus, kind: "project" as const, label: project.label })),
  ...skillDefinitions.map(([id, label, evidenceStatus]) => ({ id: `skill/${id}@v1`, category: "skill" as const, evidenceStatus, kind: "skill" as const, label })),
  ...ambientDefinitions.map(([id, label]) => ({ id: `ambient/${id}@v1`, category: "ambient" as const, evidenceStatus: "ambient" as const, kind: "ambient" as const, label })),
];

export const METRICS_SKILL_IDS = ["python", "databricks", "workflow-orchestration", "data-contracts", "go", "postgresql", "docker", "ai", "aws"] as const;

const projectSkillMatrix: Readonly<Record<CareerProjectId, readonly CareerSkillId[]>> = {
  "kaizen-agent-platform": ["safe-writes", "data-contracts", "go", "redis", "mcp", "openapi"],
  "vendy-vm-platform": ["workflow-orchestration", "operator-control", "data-contracts", "go", "react", "aws", "postgresql", "vmware", "macstadium"],
  "engineering-metrics-pipeline": METRICS_SKILL_IDS,
  "tanium-risk-assessment": ["python", "go", "workflow-orchestration", "operator-control", "data-contracts"],
  "uat-automation": ["csharp", "localdb", "operator-control", "workflow-orchestration", "data-contracts"],
  cablecar: ["react", "electron", "workflow-orchestration", "operator-control", "data-contracts"],
  xsearch: ["manifest-v3", "data-contracts", "workflow-orchestration", "operator-control"],
  "tmatch-eolmatch": ["go", "data-contracts"],
  contextforge: ["context-compression", "workflow-orchestration", "data-contracts", "typescript"],
  "career-world-portfolio": ["react", "typescript", "operator-control", "data-contracts"],
  "ticket-validation-automation": [], "sap-table-update-integration": [], "qc-alm-extractor": [],
  "atlassian-platform-automation": [], "atlassian-data-center-resilience": [], "client-devops-delivery-implementations": [],
};

const employerSkillIds: Readonly<Record<EmployerId, readonly CareerSkillId[]>> = {
  ninjaone: ["safe-writes", "data-contracts", "go", "redis", "mcp", "openapi", "workflow-orchestration", "operator-control", "react", "aws", "postgresql", "vmware", "macstadium", "python", "databricks", "docker", "ai"],
  tanium: ["python", "go", "workflow-orchestration", "operator-control", "data-contracts", "csharp", "localdb", "react", "electron", "manifest-v3"],
  independent: ["context-compression", "workflow-orchestration", "data-contracts", "typescript", "react", "operator-control"],
  "ace-hardware": ["informatica"],
  "column-technologies": ["atlassian", "ci-cd", "docker"],
};

export const ACCEPTED_EMPLOYER_ANCHOR_TUPLES = [
  ["ninjaone", 360, 307], ["tanium", 792, 313], ["independent", 1252, 320], ["ace-hardware", 295, 680], ["column-technologies", 1160, 700],
] as const;

const instances: CareerInstance[] = [
  ...employers.map((employer) => ({ id: `instance/${employer.id}/capital/01`, assetId: employer.assetId, kind: "capital" as const, employerId: employer.id })),
  ...projects.map((project) => ({ id: `instance/${project.employerId}/project/${project.id}/01`, assetId: project.assetId, kind: "project" as const, employerId: project.employerId, projectId: project.id })),
  ...employers.flatMap((employer) => employerSkillIds[employer.id].map((skillId) => ({ id: `instance/${employer.id}/skill/${skillId}/01`, assetId: `skill/${skillId}@v1`, kind: "skill" as const, employerId: employer.id }))),
];

const projectSkillLinks: ProjectSkillLink[] = projects.flatMap((project) =>
  projectSkillMatrix[project.id].map((skillId) => ({ projectId: project.id, skillInstanceId: `instance/${project.employerId}/skill/${skillId}/01` })),
);

export const careerWorldRegistry: CareerWorldRegistry = deepFreeze({ bounds: WORLD_BOUNDS, assets, employers, projects, instances, projectSkillLinks });
export const employerById = new Map(careerWorldRegistry.employers.map((employer) => [employer.id, employer]));
export const projectById = new Map(careerWorldRegistry.projects.map((project) => [project.id, project]));
export const instanceById = new Map(careerWorldRegistry.instances.map((instance) => [instance.id, instance]));
export const projectInstanceByProjectId = new Map(careerWorldRegistry.instances.filter((instance) => instance.kind === "project" && instance.projectId).map((instance) => [instance.projectId!, instance]));
export const registryIdentityTuples = careerWorldRegistry.instances.map((instance) => [instance.id, instance.assetId, instance.employerId, instance.projectId ?? ""] as const);

export function validateCareerWorldRegistry(registry: CareerWorldRegistry = careerWorldRegistry) {
  const issues: string[] = [];
  const assetById = new Map<string, CareerAsset>();
  const employerIds = new Set<string>();
  const projectIds = new Set<string>();
  const instanceIds = new Set<string>();
  const employerSkillKeys = new Set<string>();
  const linkKeys = new Set<string>();
  const instanceByRegistryId = new Map<string, CareerInstance>();

  for (const asset of registry.assets) {
    if (assetById.has(asset.id)) issues.push(`duplicate asset ${asset.id}`);
    assetById.set(asset.id, asset);
    if (asset.category !== asset.kind) issues.push(`mismatched asset category ${asset.id}`);
  }
  for (const employer of registry.employers) {
    if (employerIds.has(employer.id)) issues.push(`duplicate employer ${employer.id}`);
    employerIds.add(employer.id);
    if (assetById.get(employer.assetId)?.category !== "city") issues.push(`mismatched employer asset ${employer.id}`);
  }
  for (const project of registry.projects) {
    if (projectIds.has(project.id)) issues.push(`duplicate project ${project.id}`);
    projectIds.add(project.id);
    if (!employerIds.has(project.employerId)) issues.push(`unknown project employer ${project.id}`);
    if (assetById.get(project.assetId)?.category !== "project") issues.push(`mismatched project asset ${project.id}`);
    if (project.evidenceStatus === "identity-only" ? project.evidenceTraceId !== null : project.evidenceTraceId === null) issues.push(`mismatched project evidence ${project.id}`);
  }
  for (const instance of registry.instances) {
    if (instanceIds.has(instance.id)) issues.push(`duplicate instance ${instance.id}`);
    instanceIds.add(instance.id);
    instanceByRegistryId.set(instance.id, instance);
    if (!employerIds.has(instance.employerId)) issues.push(`unknown instance employer ${instance.id}`);
    const asset = assetById.get(instance.assetId);
    if (!asset) issues.push(`unknown asset ${instance.assetId}`);
    if (!["capital", "project", "skill"].includes(instance.kind)) issues.push(`unknown instance kind ${instance.id}`);
    if (asset?.category === "city" && instance.kind !== "capital") issues.push(`city asset on non-capital instance ${instance.id}`);
    if (instance.kind === "capital" && asset?.category !== "city") issues.push(`non-city asset on capital instance ${instance.id}`);
    if (instance.kind === "skill") {
      if (asset?.category !== "skill") issues.push(`mismatched skill asset ${instance.id}`);
      const key = `${instance.employerId}:${instance.assetId}`;
      if (employerSkillKeys.has(key)) issues.push(`duplicate employer skill ${key}`);
      employerSkillKeys.add(key);
    }
  }
  for (const project of registry.projects) {
    const projectInstances = registry.instances.filter((instance) => instance.kind === "project" && instance.projectId === project.id);
    if (projectInstances.length !== 1) issues.push(`project instance count ${project.id}`);
    else if (projectInstances[0].assetId !== project.assetId || projectInstances[0].employerId !== project.employerId) issues.push(`mismatched project instance ${project.id}`);
  }
  for (const employer of registry.employers) {
    const capitals = registry.instances.filter((instance) => instance.kind === "capital" && instance.employerId === employer.id);
    if (capitals.length !== 1) issues.push(`capital instance count ${employer.id}`);
    else {
      const capital = capitals[0];
      if (capital.employerId !== employer.id || capital.assetId !== employer.assetId) issues.push(`mismatched employer capital ${employer.id}`);
      if (assetById.get(capital.assetId)?.category !== "city") issues.push(`mismatched capital asset ${employer.id}`);
    }
    for (const skillId of employerSkillIds[employer.id]) {
      if (!employerSkillKeys.has(`${employer.id}:skill/${skillId}@v1`)) issues.push(`missing employer skill ${employer.id}:${skillId}`);
    }
  }
  for (const [employerId, x, y] of ACCEPTED_EMPLOYER_ANCHOR_TUPLES) {
    const employer = registry.employers.find((candidate) => candidate.id === employerId);
    if (!employer || employer.anchor.x !== x || employer.anchor.y !== y) issues.push(`employer coordinate drift ${employerId}`);
  }
  for (const project of registry.projects) {
    const expectedSkills = new Set(projectSkillMatrix[project.id]);
    const links = registry.projectSkillLinks.filter((link) => link.projectId === project.id);
    if (links.length !== expectedSkills.size) issues.push(`project link count ${project.id}`);
    for (const link of links) {
      const skill = instanceByRegistryId.get(link.skillInstanceId);
      const skillId = skill?.assetId.replace(/^skill\/(.+)@v1$/, "$1");
      if (!skill || skill.kind !== "skill") issues.push(`unknown skill link ${link.skillInstanceId}`);
      else if (skill.employerId !== project.employerId) issues.push(`cross-employer skill link ${link.skillInstanceId}`);
      else if (!skillId || !expectedSkills.has(skillId as CareerSkillId)) issues.push(`unsupported project skill link ${link.projectId}:${link.skillInstanceId}`);
    }
  }
  for (const link of registry.projectSkillLinks) {
    const key = `${link.projectId}:${link.skillInstanceId}`;
    if (linkKeys.has(key)) issues.push(`duplicate project skill link ${key}`);
    linkKeys.add(key);
    if (!projectIds.has(link.projectId)) issues.push(`unknown project link ${link.projectId}`);
  }
  return issues;
}
