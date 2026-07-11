// Static portfolio evidence and the indexes derived from it.
export type NodeKind = "capability" | "system" | "technology";
export type NodeTone = "cyan" | "lime" | "coral" | "violet";
export type EvidenceClass =
  | "implementation"
  | "production"
  | "measured"
  | "deterministic"
  | "bounded-live";

export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  tone: NodeTone;
  description: string;
};

export type EvidenceRecord = {
  id: string;
  traceId: string;
  sequence: number;
  source: string;
  evidenceClass: EvidenceClass;
  title: string;
  detail: string;
  nodeIds: string[];
  weight: 1 | 2 | 3;
};

export type TraceArtifact = {
  label: string;
  detail: string;
  access: "public" | "portfolio-summary";
  href?: string;
};

export type EvidenceTrace = {
  id: string;
  index: string;
  title: string;
  shortTitle: string;
  period: string;
  statement: string;
  summary: string;
  proofLabel: string;
  evidenceClass: EvidenceClass;
  nodeIds: string[];
  evidenceIds: string[];
  outcomes: string[];
  limitations: string[];
  artifacts: TraceArtifact[];
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
  recordIds: string[];
};

export const graphNodes: GraphNode[] = [
  {
    id: "kaizen-agent-tools",
    label: "Kaizen agent tools",
    kind: "system",
    tone: "cyan",
    description:
      "A governed agent surface generated from service-owned contracts and API schemas.",
  },
  {
    id: "kinforge",
    label: "Kinforge",
    kind: "system",
    tone: "coral",
    description:
      "A simulation and protocol testbed for bounded agent control, replay, and evidence quality.",
  },
  {
    id: "skills-system",
    label: "Skills runtime",
    kind: "system",
    tone: "violet",
    description:
      "Routing, context-budget, run-ledger, and gate contracts for repeatable agent workflows.",
  },
  {
    id: "vendy",
    label: "Vendy VM platform",
    kind: "system",
    tone: "lime",
    description:
      "Self-service test-environment provisioning across AWS, VMware, and MacStadium.",
  },
  {
    id: "capability-contracts",
    label: "Capability contracts",
    kind: "capability",
    tone: "cyan",
    description:
      "Intent, safety, role, availability, and recovery rules expressed as machine-readable contracts.",
  },
  {
    id: "agent-boundaries",
    label: "Agent boundaries",
    kind: "capability",
    tone: "cyan",
    description:
      "Agents receive constrained tool surfaces while services retain business logic and authority.",
  },
  {
    id: "trusted-evidence",
    label: "Trusted evidence",
    kind: "capability",
    tone: "cyan",
    description:
      "Browser-observed context stays separate from actor-authorized backend facts.",
  },
  {
    id: "safe-writes",
    label: "Replay-safe writes",
    kind: "capability",
    tone: "violet",
    description:
      "Idempotency, correlation, sanitized failure handling, and auditability around agent actions.",
  },
  {
    id: "context-compression",
    label: "Context compression",
    kind: "capability",
    tone: "coral",
    description:
      "Bootstrap shared structure once, then transmit deltas, repairs, and bounded refreshes.",
  },
  {
    id: "context-budgeting",
    label: "Context budgets",
    kind: "capability",
    tone: "violet",
    description:
      "Explicit limits for coordinator carry, worker packets, references, reports, and tool output.",
  },
  {
    id: "evaluation",
    label: "Evaluation",
    kind: "capability",
    tone: "coral",
    description:
      "Paired comparisons, clean evidence classes, regression gates, and explicit non-claims.",
  },
  {
    id: "deterministic-replay",
    label: "Deterministic replay",
    kind: "capability",
    tone: "coral",
    description:
      "Identical seeds and decisions reproduce exact outcomes while seeded variance remains measurable.",
  },
  {
    id: "workflow-orchestration",
    label: "Workflow orchestration",
    kind: "capability",
    tone: "lime",
    description:
      "Long-running work with explicit state, retries, handoffs, and observable completion gates.",
  },
  {
    id: "operator-control",
    label: "Operator control",
    kind: "capability",
    tone: "lime",
    description:
      "Interfaces that expose lifecycle state and recovery without leaking backend ownership into the UI.",
  },
  {
    id: "data-contracts",
    label: "Data contracts",
    kind: "capability",
    tone: "cyan",
    description:
      "Schemas and source-of-truth rules prevent drift between producers, services, and interfaces.",
  },
  {
    id: "measured-impact",
    label: "Measured impact",
    kind: "capability",
    tone: "lime",
    description:
      "Outcomes are shown with their scope and evidence boundary instead of decorative counters.",
  },
  {
    id: "go",
    label: "Go",
    kind: "technology",
    tone: "cyan",
    description: "Service, orchestration, code generation, and protocol infrastructure.",
  },
  {
    id: "typescript",
    label: "TypeScript",
    kind: "technology",
    tone: "coral",
    description: "Simulation, test harnesses, browser surfaces, and typed contracts.",
  },
  {
    id: "react",
    label: "React",
    kind: "technology",
    tone: "lime",
    description: "Operator-facing workflows and evidence-driven interfaces.",
  },
  {
    id: "aws",
    label: "AWS",
    kind: "technology",
    tone: "lime",
    description: "VM provisioning, image workflows, migration, and platform infrastructure.",
  },
  {
    id: "postgresql",
    label: "PostgreSQL",
    kind: "technology",
    tone: "lime",
    description: "Durable platform state, reporting, and backend coordination.",
  },
  {
    id: "redis",
    label: "Redis",
    kind: "technology",
    tone: "violet",
    description: "Replay protection and operational coordination for agent-facing writes.",
  },
  {
    id: "mcp",
    label: "MCP",
    kind: "technology",
    tone: "cyan",
    description: "A thin agent transport over service-owned capability and authorization contracts.",
  },
  {
    id: "openapi",
    label: "OpenAPI",
    kind: "technology",
    tone: "cyan",
    description: "Parameter schemas merged with capability metadata to generate callable tools.",
  },
];

export const evidenceRecords: EvidenceRecord[] = [
  {
    id: "kaizen-contract-generation",
    traceId: "governed-agent-tooling",
    sequence: 1,
    source: "Kaizen capability contracts",
    evidenceClass: "production",
    title: "Contracts generate the tool surface",
    detail:
      "Capability metadata supplies intent, roles, risk, and guardrails while OpenAPI supplies parameter shape. Generated tools replace a manually maintained agent catalog.",
    nodeIds: [
      "kaizen-agent-tools",
      "capability-contracts",
      "agent-boundaries",
      "mcp",
      "openapi",
      "go",
    ],
    weight: 3,
  },
  {
    id: "kaizen-role-filtering",
    traceId: "governed-agent-tooling",
    sequence: 2,
    source: "Kaizen MCP runtime",
    evidenceClass: "production",
    title: "Authorization changes what the agent can discover",
    detail:
      "JWT roles filter registration before tool discovery, so unavailable or unauthorized operations are absent rather than merely discouraged in prose.",
    nodeIds: [
      "kaizen-agent-tools",
      "agent-boundaries",
      "trusted-evidence",
      "mcp",
      "go",
    ],
    weight: 3,
  },
  {
    id: "kaizen-safe-writes",
    traceId: "governed-agent-tooling",
    sequence: 3,
    source: "Kaizen MCP runtime",
    evidenceClass: "production",
    title: "Writes carry replay and audit controls",
    detail:
      "Write tools can require idempotency keys, Redis-backed replay protection, correlation identifiers, sanitized errors, and audit events.",
    nodeIds: [
      "kaizen-agent-tools",
      "safe-writes",
      "agent-boundaries",
      "redis",
      "mcp",
      "go",
    ],
    weight: 3,
  },
  {
    id: "kaizen-backend-authority",
    traceId: "governed-agent-tooling",
    sequence: 4,
    source: "Kaizen Metrics assistant contract",
    evidenceClass: "production",
    title: "Display context cannot mint trusted facts",
    detail:
      "Browser context remains a navigation and display hint. Only actor-authorized backend resolvers can add trusted metric evidence.",
    nodeIds: [
      "kaizen-agent-tools",
      "trusted-evidence",
      "data-contracts",
      "agent-boundaries",
    ],
    weight: 3,
  },
  {
    id: "kinforge-reference-equivalence",
    traceId: "bounded-agent-context",
    sequence: 1,
    source: "Kinforge deterministic corpus",
    evidenceClass: "deterministic",
    title: "The compact surface preserved the reference policy",
    detail:
      "Six H160 profiles recorded zero priority mismatches across 480 paired comparisons and identical final tactical state.",
    nodeIds: [
      "kinforge",
      "context-compression",
      "evaluation",
      "deterministic-replay",
      "typescript",
    ],
    weight: 3,
  },
  {
    id: "kinforge-live-compression",
    traceId: "bounded-agent-context",
    sequence: 2,
    source: "Kinforge balanced H80 rotation",
    evidenceClass: "bounded-live",
    title: "Live context was materially smaller",
    detail:
      "Across three clean rotations on one seed, learned_compact averaged 76.0% less context than compact_tactical and 69.6% less than minimal.",
    nodeIds: [
      "kinforge",
      "context-compression",
      "evaluation",
      "measured-impact",
      "typescript",
    ],
    weight: 3,
  },
  {
    id: "kinforge-endurance",
    traceId: "bounded-agent-context",
    sequence: 3,
    source: "Kinforge H300 endurance run",
    evidenceClass: "bounded-live",
    title: "The learned lane remained operable over a long session",
    detail:
      "The run completed 705 accepted responses with zero decision rejections, gate rejections, or transport errors; the persistent learned lane completed all 300 windows.",
    nodeIds: [
      "kinforge",
      "context-compression",
      "evaluation",
      "workflow-orchestration",
      "typescript",
    ],
    weight: 2,
  },
  {
    id: "kinforge-composition",
    traceId: "bounded-agent-context",
    sequence: 4,
    source: "Kinforge held-out live trial",
    evidenceClass: "bounded-live",
    title: "One session composed unseen symbol pairs",
    detail:
      "A continuous thread decoded 12/12 held-out compounds while 12 fresh stateless controls correctly abstained. Replication across models, seeds, and domains remains open.",
    nodeIds: [
      "kinforge",
      "context-compression",
      "evaluation",
      "trusted-evidence",
    ],
    weight: 2,
  },
  {
    id: "skills-context-budgets",
    traceId: "bounded-agent-context",
    sequence: 5,
    source: "Skills context-budget policy",
    evidenceClass: "implementation",
    title: "Context limits are declared before execution",
    detail:
      "Coordinator carry, worker packets, loaded skills, reference files, tool output, and worker reports have explicit budgets instead of relying on conversational restraint.",
    nodeIds: [
      "skills-system",
      "context-budgeting",
      "agent-boundaries",
      "data-contracts",
    ],
    weight: 3,
  },
  {
    id: "skills-run-ledger",
    traceId: "bounded-agent-context",
    sequence: 6,
    source: "Skills run-ledger contract",
    evidenceClass: "implementation",
    title: "Decisions and gates survive without transcript carry",
    detail:
      "A file-backed ledger records active lanes, accepted decisions, artifacts, blockers, and latest green gates so the transcript does not become hidden authority.",
    nodeIds: [
      "skills-system",
      "context-budgeting",
      "workflow-orchestration",
      "evaluation",
      "data-contracts",
    ],
    weight: 3,
  },
  {
    id: "vendy-provider-surface",
    traceId: "cross-provider-orchestration",
    sequence: 1,
    source: "NinjaOne Vendy platform",
    evidenceClass: "production",
    title: "One request surface spans three infrastructure providers",
    detail:
      "Engineering and QA teams can provision test environments across AWS, VMware, and MacStadium through a shared lifecycle workflow.",
    nodeIds: [
      "vendy",
      "workflow-orchestration",
      "operator-control",
      "go",
      "react",
      "aws",
    ],
    weight: 3,
  },
  {
    id: "vendy-image-contracts",
    traceId: "cross-provider-orchestration",
    sequence: 2,
    source: "NinjaOne image workflows",
    evidenceClass: "production",
    title: "Image contracts reduce provider-specific drift",
    detail:
      "Custom AMIs, launch templates, and cross-platform image specifications standardize environments while keeping provider behavior explicit.",
    nodeIds: ["vendy", "data-contracts", "workflow-orchestration", "aws"],
    weight: 2,
  },
  {
    id: "vendy-lifecycle",
    traceId: "cross-provider-orchestration",
    sequence: 3,
    source: "NinjaOne checkout services",
    evidenceClass: "production",
    title: "The worker executes lifecycle state; it does not own it",
    detail:
      "Provisioning, retries, provider calls, and completion status remain coordinated through explicit backend state and operator-visible transitions.",
    nodeIds: [
      "vendy",
      "workflow-orchestration",
      "operator-control",
      "data-contracts",
      "go",
      "postgresql",
    ],
    weight: 3,
  },
  {
    id: "vendy-macstadium",
    traceId: "cross-provider-orchestration",
    sequence: 4,
    source: "NinjaOne accomplishment record",
    evidenceClass: "measured",
    title: "MacStadium support expanded the platform past 100 Mac VMs",
    detail:
      "The integration extended the same operating model to macOS workflows while reducing reliance on one-off provisioning knowledge.",
    nodeIds: [
      "vendy",
      "operator-control",
      "measured-impact",
      "workflow-orchestration",
    ],
    weight: 3,
  },
  {
    id: "vendy-migration",
    traceId: "cross-provider-orchestration",
    sequence: 5,
    source: "NinjaOne migration workflow",
    evidenceClass: "production",
    title: "Unsupported VMware systems gained a migration path",
    detail:
      "An OVF-to-S3 workflow moved otherwise unsupported systems toward AWS with less manual intervention.",
    nodeIds: ["vendy", "workflow-orchestration", "aws", "go"],
    weight: 2,
  },
];

export const evidenceTraces: EvidenceTrace[] = [
  {
    id: "governed-agent-tooling",
    index: "01",
    title: "Governed agent tooling",
    shortTitle: "Agent tooling",
    period: "NinjaOne / current",
    statement:
      "Agent access should inherit the same contracts, permissions, and operational controls as the product it operates.",
    summary:
      "Kaizen turns service capability metadata and OpenAPI schemas into a discoverable MCP surface. The adapter stays thin; authorization and trusted evidence remain owned by backend services.",
    proofLabel: "Shipped system + contract evidence",
    evidenceClass: "production",
    nodeIds: [
      "kaizen-agent-tools",
      "capability-contracts",
      "agent-boundaries",
      "trusted-evidence",
      "safe-writes",
      "data-contracts",
      "go",
      "redis",
      "mcp",
      "openapi",
    ],
    evidenceIds: [
      "kaizen-contract-generation",
      "kaizen-role-filtering",
      "kaizen-safe-writes",
      "kaizen-backend-authority",
    ],
    outcomes: [
      "One generated tool surface instead of hand-maintained agent wrappers",
      "Unauthorized operations are removed from discovery",
      "Browser data cannot impersonate actor-authorized metric evidence",
    ],
    limitations: [
      "Internal source and deployment details are summarized rather than published.",
      "This demonstrates governed integration work, not a claim of novel authorization research.",
    ],
    artifacts: [
      {
        label: "Capability contract flow",
        detail: "Architecture and generation contract",
        access: "portfolio-summary",
      },
      {
        label: "Metrics assistant contract",
        detail: "Browser versus backend evidence boundary",
        access: "portfolio-summary",
      },
    ],
  },
  {
    id: "bounded-agent-context",
    index: "02",
    title: "Bounded agent context",
    shortTitle: "Context control",
    period: "Kinforge + Skills / active research",
    statement:
      "Useful context is not the largest prompt. It is the smallest scoped packet that preserves the decision contract and can recover when continuity fails.",
    summary:
      "Kinforge tests a learned compact protocol against paired reference surfaces. The Skills runtime applies the same discipline operationally through context budgets, routing contracts, run ledgers, and explicit gates.",
    proofLabel: "Deterministic + bounded live evidence",
    evidenceClass: "bounded-live",
    nodeIds: [
      "kinforge",
      "skills-system",
      "context-compression",
      "context-budgeting",
      "evaluation",
      "deterministic-replay",
      "workflow-orchestration",
      "agent-boundaries",
      "trusted-evidence",
      "data-contracts",
      "measured-impact",
      "typescript",
    ],
    evidenceIds: [
      "kinforge-reference-equivalence",
      "kinforge-live-compression",
      "kinforge-endurance",
      "kinforge-composition",
      "skills-context-budgets",
      "skills-run-ledger",
    ],
    outcomes: [
      "Zero priority mismatches across 480 deterministic paired comparisons",
      "76.0% less live context than the tactical surface in one balanced H80 batch",
      "A persistent learned lane completed 300 windows without protocol rejection",
    ],
    limitations: [
      "Lower context does not prove better strategy.",
      "The 12/12 compositional result is one controlled trial; cross-model, cross-seed, and cross-domain generalization remain unproven.",
      "Worker token use and protocol payload size are separate measurements.",
    ],
    artifacts: [
      {
        label: "Protocol evidence ledger",
        detail: "Claims, evidence classes, artifacts, and non-claims",
        access: "public",
        href: "https://github.com/Dorbii/Kinforge/blob/main/docs/protocol-evidence-claims.md",
      },
      {
        label: "Context-budget policy",
        detail: "Packet, reference, report, and tool-output limits",
        access: "public",
        href: "https://github.com/Dorbii/skills/blob/main/capabilities/context-budget-policy.yaml",
      },
      {
        label: "Run-ledger schema",
        detail: "Decisions and gates without transcript authority",
        access: "public",
        href: "https://github.com/Dorbii/skills/blob/main/schemas/run-ledger.schema.json",
      },
    ],
  },
  {
    id: "cross-provider-orchestration",
    index: "03",
    title: "Cross-provider orchestration",
    shortTitle: "VM platform",
    period: "NinjaOne / current",
    statement:
      "Infrastructure differences should stay visible to the system without becoming manual work for every operator.",
    summary:
      "Vendy coordinates self-service test environments across AWS, VMware, and MacStadium with standardized image contracts, provider-specific execution, and an operator-visible lifecycle.",
    proofLabel: "Shipped platform + measured reach",
    evidenceClass: "production",
    nodeIds: [
      "vendy",
      "workflow-orchestration",
      "operator-control",
      "data-contracts",
      "measured-impact",
      "go",
      "react",
      "aws",
      "postgresql",
    ],
    evidenceIds: [
      "vendy-provider-surface",
      "vendy-image-contracts",
      "vendy-lifecycle",
      "vendy-macstadium",
      "vendy-migration",
    ],
    outcomes: [
      "A shared provisioning workflow across AWS, VMware, and MacStadium",
      "Support for more than 100 Mac VMs",
      "A migration path for unsupported VMware systems through AWS",
    ],
    limitations: [
      "Private production telemetry and internal service links are not published.",
      "The portfolio reports platform reach; it does not invent utilization or reliability percentages that were not measured here.",
    ],
    artifacts: [
      {
        label: "Platform architecture",
        detail: "Service, worker, provider, and lifecycle responsibilities",
        access: "portfolio-summary",
      },
      {
        label: "Image and migration workflows",
        detail: "AMI, launch-template, Mac image, and OVF migration evidence",
        access: "portfolio-summary",
      },
    ],
  },
];

function buildEdges(records: EvidenceRecord[]): GraphEdge[] {
  const edges = new Map<string, GraphEdge>();

  for (const record of records) {
    const ids = [...new Set(record.nodeIds)].sort();
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        const source = ids[left];
        const target = ids[right];
        const key = `${source}::${target}`;
        const edge = edges.get(key) ?? {
          source,
          target,
          weight: 0,
          recordIds: [],
        };
        edge.weight += record.weight;
        edge.recordIds.push(record.id);
        edges.set(key, edge);
      }
    }
  }

  return [...edges.values()].sort((left, right) => right.weight - left.weight);
}

export const graphEdges = buildEdges(evidenceRecords);

const rawEvidenceStrength = Object.fromEntries(
  graphNodes.map((node) => [
    node.id,
    evidenceRecords
      .filter((record) => record.nodeIds.includes(node.id))
      .reduce((total, record) => total + record.weight, 0),
  ]),
);

const rawStrengthValues = Object.values(rawEvidenceStrength);
const minStrength = Math.min(...rawStrengthValues);
const maxStrength = Math.max(...rawStrengthValues);

export const evidenceStrengthByNode = Object.fromEntries(
  graphNodes.map((node) => {
    const raw = rawEvidenceStrength[node.id];
    const normalized =
      maxStrength === minStrength
        ? 3
        : 1 + Math.round(((raw - minStrength) / (maxStrength - minStrength)) * 5);
    return [node.id, Math.max(1, Math.min(6, normalized))];
  }),
);

export const nodeById = new Map(graphNodes.map((node) => [node.id, node]));
export const recordById = new Map(evidenceRecords.map((record) => [record.id, record]));
export const traceById = new Map(evidenceTraces.map((trace) => [trace.id, trace]));

export function recordsForTrace(traceId: string) {
  return evidenceRecords
    .filter((record) => record.traceId === traceId)
    .sort((left, right) => left.sequence - right.sequence);
}
