// Static portfolio evidence and the indexes derived from it.
import type { NodeDomainId } from "./node-domains";

export type NodeKind = "capability" | "technology";
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
  primaryDomain: NodeDomainId;
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

export type PortfolioGroup = "current" | "prior" | "personal";

export type EvidenceTrace = {
  id: string;
  index: string;
  title: string;
  shortTitle: string;
  period: string;
  portfolioGroup: PortfolioGroup;
  statement: string;
  summary: string;
  proofLabel: string;
  evidenceClass: EvidenceClass;
  nodeIds: string[];
  evidenceIds: string[];
  replayStatus: "ready" | "overview";
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
    id: "capability-contracts",
    label: "Capability contracts",
    kind: "capability",
    primaryDomain: "architecture",
    description:
      "Intent, safety, role, availability, and recovery rules expressed as machine-readable contracts.",
  },
  {
    id: "agent-boundaries",
    label: "Agent boundaries",
    kind: "capability",
    primaryDomain: "assurance",
    description:
      "Agents receive constrained tool surfaces while services retain business logic and authority.",
  },
  {
    id: "trusted-evidence",
    label: "Trusted evidence",
    kind: "capability",
    primaryDomain: "assurance",
    description:
      "Browser-observed context stays separate from actor-authorized backend facts.",
  },
  {
    id: "safe-writes",
    label: "Replay-safe writes",
    kind: "capability",
    primaryDomain: "backend",
    description:
      "Idempotency, correlation, sanitized failure handling, and auditability around agent actions.",
  },
  {
    id: "context-compression",
    label: "Context compression",
    kind: "capability",
    primaryDomain: "architecture",
    description:
      "Bootstrap shared structure once, then transmit deltas, repairs, and bounded refreshes.",
  },
  {
    id: "context-budgeting",
    label: "Context budgets",
    kind: "capability",
    primaryDomain: "architecture",
    description:
      "Explicit limits for coordinator carry, worker packets, references, reports, and tool output.",
  },
  {
    id: "evaluation",
    label: "Evaluation",
    kind: "capability",
    primaryDomain: "assurance",
    description:
      "Paired comparisons, clean evidence classes, regression gates, and explicit non-claims.",
  },
  {
    id: "deterministic-replay",
    label: "Deterministic replay",
    kind: "capability",
    primaryDomain: "assurance",
    description:
      "Identical seeds and decisions reproduce exact outcomes while seeded variance remains measurable.",
  },
  {
    id: "workflow-orchestration",
    label: "Workflow orchestration",
    kind: "capability",
    primaryDomain: "architecture",
    description:
      "Long-running work with explicit state, retries, handoffs, and observable completion gates.",
  },
  {
    id: "operator-control",
    label: "Operator control",
    kind: "capability",
    primaryDomain: "frontend",
    description:
      "Interfaces that expose lifecycle state and recovery without leaking backend ownership into the UI.",
  },
  {
    id: "data-contracts",
    label: "Data contracts",
    kind: "capability",
    primaryDomain: "data",
    description:
      "Schemas and source-of-truth rules prevent drift between producers, services, and interfaces.",
  },
  {
    id: "measured-impact",
    label: "Measured impact",
    kind: "capability",
    primaryDomain: "data",
    description:
      "Outcomes are shown with their scope and evidence boundary instead of decorative counters.",
  },
  {
    id: "go",
    label: "Go",
    kind: "technology",
    primaryDomain: "backend",
    description: "Service, orchestration, code generation, and protocol infrastructure.",
  },
  {
    id: "typescript",
    label: "TypeScript",
    kind: "technology",
    primaryDomain: "frontend",
    description: "Simulation, test harnesses, browser surfaces, and typed contracts.",
  },
  {
    id: "react",
    label: "React",
    kind: "technology",
    primaryDomain: "frontend",
    description: "Operator-facing workflows and evidence-driven interfaces.",
  },
  {
    id: "aws",
    label: "AWS",
    kind: "technology",
    primaryDomain: "infrastructure",
    description: "VM provisioning, image workflows, migration, and platform infrastructure.",
  },
  {
    id: "postgresql",
    label: "PostgreSQL",
    kind: "technology",
    primaryDomain: "data",
    description: "Durable platform state, reporting, and backend coordination.",
  },
  {
    id: "redis",
    label: "Redis",
    kind: "technology",
    primaryDomain: "data",
    description: "Replay protection and operational coordination for agent-facing writes.",
  },
  {
    id: "mcp",
    label: "MCP",
    kind: "technology",
    primaryDomain: "architecture",
    description: "A thin agent transport over service-owned capability and authorization contracts.",
  },
  {
    id: "openapi",
    label: "OpenAPI",
    kind: "technology",
    primaryDomain: "architecture",
    description: "Parameter schemas merged with capability metadata to generate callable tools.",
  },
  {
    id: "python",
    label: "Python",
    kind: "technology",
    primaryDomain: "data",
    description: "Scheduled ingestion, API coordination, and data-quality validation.",
  },
  {
    id: "docker",
    label: "Docker",
    kind: "technology",
    primaryDomain: "infrastructure",
    description: "Repeatable packaging for repository-ingestion workers.",
  },
  {
    id: "databricks",
    label: "Databricks",
    kind: "technology",
    primaryDomain: "data",
    description: "Scheduled, sharded execution and validation for engineering metrics.",
  },
  {
    id: "csharp",
    label: "C#",
    kind: "technology",
    primaryDomain: "backend",
    description: "Desktop workflow automation and customer-specific operator tooling.",
  },
  {
    id: "localdb",
    label: "LocalDB",
    kind: "technology",
    primaryDomain: "data",
    description: "Local application state and result persistence for a standalone workflow.",
  },
  {
    id: "manifest-v3",
    label: "Manifest V3",
    kind: "technology",
    primaryDomain: "frontend",
    description: "Chrome extension packaging and browser integration.",
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
    nodeIds: ["data-contracts", "workflow-orchestration", "aws"],
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
    nodeIds: ["workflow-orchestration", "aws", "go"],
    weight: 2,
  },
  {
    id: "metrics-auth-pool",
    traceId: "engineering-metrics-pipeline",
    sequence: 1,
    source: "Owner-curated production summary",
    evidenceClass: "production",
    title: "Ingestion rotates a three-key authentication pool",
    detail:
      "Containerized Python ingestion workers rotate across three credentials to distribute Bitbucket API requests and reduce 429 pressure.",
    nodeIds: [
      "python",
      "docker",
      "workflow-orchestration",
    ],
    weight: 2,
  },
  {
    id: "metrics-databricks-shards",
    traceId: "engineering-metrics-pipeline",
    sequence: 2,
    source: "Owner-curated production summary",
    evidenceClass: "production",
    title: "A scheduled job partitions ingestion across three shards",
    detail:
      "Databricks schedules the Python workload across three bounded shards instead of treating repository ingestion as one opaque run.",
    nodeIds: [
      "python",
      "databricks",
      "workflow-orchestration",
    ],
    weight: 2,
  },
  {
    id: "metrics-quality-gates",
    traceId: "engineering-metrics-pipeline",
    sequence: 3,
    source: "Owner-curated production summary",
    evidenceClass: "production",
    title: "Data-quality checks gate downstream reporting",
    detail:
      "Validation runs before repository metrics are accepted downstream so failed ingestion does not silently become trusted reporting data.",
    nodeIds: [
      "databricks",
      "data-contracts",
      "trusted-evidence",
    ],
    weight: 2,
  },
  {
    id: "uat-workflow-model",
    traceId: "uat-automation",
    sequence: 1,
    source: "Owner-curated project summary",
    evidenceClass: "implementation",
    title: "The manual UAT process became explicit application state",
    detail:
      "A private bank workflow was reduced to bounded stages without exposing customer procedures or data.",
    nodeIds: ["workflow-orchestration", "operator-control", "csharp"],
    weight: 2,
  },
  {
    id: "uat-local-application",
    traceId: "uat-automation",
    sequence: 2,
    source: "Owner-curated project summary",
    evidenceClass: "implementation",
    title: "A standalone application owned the operator workflow",
    detail:
      "The custom C# UI used LocalDB for local state and results while keeping the application self-contained.",
    nodeIds: ["csharp", "localdb", "operator-control"],
    weight: 2,
  },
  {
    id: "uat-tanium-execution",
    traceId: "uat-automation",
    sequence: 3,
    source: "Resume outcome + owner clarification",
    evidenceClass: "measured",
    title: "The local workflow executed through the Tanium API",
    detail:
      "The resume reports a reduction from four FTEs to one and from one week to one hour; the exact measurement scope remains private and should be treated cautiously.",
    nodeIds: [
      "csharp",
      "data-contracts",
      "workflow-orchestration",
      "measured-impact",
    ],
    weight: 2,
  },
  {
    id: "xsearch-source-apis",
    traceId: "xsearch-extension",
    sequence: 1,
    source: "Owner-curated project summary",
    evidenceClass: "implementation",
    title: "Existing service APIs became one search surface",
    detail:
      "The extension queried available APIs across internal knowledge sources instead of introducing a new search backend.",
    nodeIds: ["data-contracts", "workflow-orchestration"],
    weight: 1,
  },
  {
    id: "xsearch-manifest-extension",
    traceId: "xsearch-extension",
    sequence: 2,
    source: "Owner-curated project summary",
    evidenceClass: "implementation",
    title: "Manifest V3 placed search in the browser workflow",
    detail:
      "A Google Chrome extension provided the operator surface without requiring a separate destination.",
    nodeIds: ["manifest-v3", "operator-control", "data-contracts"],
    weight: 1,
  },
  {
    id: "xsearch-result-aggregation",
    traceId: "xsearch-extension",
    sequence: 3,
    source: "Internal tooling summary",
    evidenceClass: "implementation",
    title: "The extension aggregated and presented the responses",
    detail:
      "The solo prototype was built in five business days. Rollout was delayed, and the commercial product was still purchased, so no avoided-spend claim is made.",
    nodeIds: ["data-contracts", "operator-control"],
    weight: 1,
  },
];

export const evidenceTraces: EvidenceTrace[] = [
  {
    id: "governed-agent-tooling",
    index: "01",
    title: "Kaizen Agent Platform",
    shortTitle: "Kaizen Agent",
    period: "NinjaOne / current",
    portfolioGroup: "current",
    statement:
      "Agent access should inherit the same contracts, permissions, and operational controls as the product it operates.",
    summary:
      "Kaizen turns service capability metadata and OpenAPI schemas into a discoverable MCP surface. The adapter stays thin; authorization and trusted evidence remain owned by backend services.",
    proofLabel: "Shipped system + contract evidence",
    evidenceClass: "production",
    replayStatus: "ready",
    nodeIds: [
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
    title: "ContextForge",
    shortTitle: "ContextForge",
    period: "Kinforge + Skills / active research",
    portfolioGroup: "personal",
    statement:
      "Useful context is not the largest prompt. It is the smallest scoped packet that preserves the decision contract and can recover when continuity fails.",
    summary:
      "Kinforge tests a learned compact protocol against paired reference surfaces. The Skills runtime applies the same discipline operationally through context budgets, routing contracts, run ledgers, and explicit gates.",
    proofLabel: "Deterministic + bounded live evidence",
    evidenceClass: "bounded-live",
    replayStatus: "ready",
    nodeIds: [
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
    title: "Kaizen Vendy",
    shortTitle: "Vendy",
    period: "NinjaOne / current",
    portfolioGroup: "current",
    statement:
      "Infrastructure differences should stay visible to the system without becoming manual work for every operator.",
    summary:
      "Vendy coordinates self-service test environments across AWS, VMware, and MacStadium with standardized image contracts, provider-specific execution, and an operator-visible lifecycle.",
    proofLabel: "Shipped platform + measured reach",
    evidenceClass: "production",
    replayStatus: "ready",
    nodeIds: [
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
  {
    id: "engineering-metrics-pipeline",
    index: "04",
    title: "Kaizen Metrics",
    shortTitle: "Kaizen Metrics",
    period: "NinjaOne / current",
    portfolioGroup: "current",
    statement:
      "Operational reporting is only useful when ingestion survives API pressure and rejects bad data before it becomes a metric.",
    summary:
      "A containerized Python pipeline ingests Bitbucket data through a rotating three-key pool, runs as a three-shard Databricks job, and applies data-quality checks before downstream reporting.",
    proofLabel: "Production pipeline + scheduled validation",
    evidenceClass: "production",
    replayStatus: "ready",
    nodeIds: [
      "python",
      "docker",
      "databricks",
      "workflow-orchestration",
      "data-contracts",
      "trusted-evidence",
    ],
    evidenceIds: [
      "metrics-auth-pool",
      "metrics-databricks-shards",
      "metrics-quality-gates",
    ],
    outcomes: [
      "Repository ingestion is partitioned across three scheduled shards",
      "A three-key pool reduces concentration on one Bitbucket credential",
      "Validation gates downstream reporting data",
    ],
    limitations: [
      "Private source, credentials, job configuration, and operational telemetry are not published.",
      "Credential rotation mitigates rate-limit pressure; it does not remove upstream API limits.",
    ],
    artifacts: [
      {
        label: "Metrics pipeline summary",
        detail: "Ingestion, scheduling, rate-limit handling, and validation boundaries",
        access: "portfolio-summary",
      },
    ],
  },
  {
    id: "tanium-risk-assessment",
    index: "05",
    title: "Tanium Risk Assessment",
    shortTitle: "TRA",
    period: "Tanium / 2020-2025",
    portfolioGroup: "prior",
    statement:
      "A useful risk assessment has to turn endpoint evidence into a repeatable operator decision, not just another report.",
    summary:
      "Steve joined an existing proof of concept, led two Python refactors, and later helped move the workflow into Go. The project remains an overview until the safe public sequence is curated.",
    proofLabel: "Resume + owner-curated summary",
    evidenceClass: "implementation",
    replayStatus: "overview",
    nodeIds: [
      "python",
      "go",
      "workflow-orchestration",
      "operator-control",
      "data-contracts",
      "measured-impact",
    ],
    evidenceIds: [],
    outcomes: [
      "Two Python refactors followed by a later Go implementation",
      "The exact customer workflow and business metrics remain private",
    ],
    limitations: [
      "This is a role and architecture summary, not a claim that Steve created the original product concept.",
    ],
    artifacts: [],
  },
  {
    id: "uat-automation",
    index: "06",
    title: "UAT Automation",
    shortTitle: "UAT",
    period: "Tanium customer / 2020-2025",
    portfolioGroup: "prior",
    statement:
      "A private manual workflow became a standalone local application with a bounded API integration.",
    summary:
      "Steve built a custom C# UI backed by LocalDB for a bank customer. The only external integration was the Tanium API; customer procedures and data are intentionally omitted.",
    proofLabel: "Resume outcome + owner-curated summary",
    evidenceClass: "measured",
    replayStatus: "ready",
    nodeIds: [
      "csharp",
      "localdb",
      "operator-control",
      "workflow-orchestration",
      "data-contracts",
      "measured-impact",
    ],
    evidenceIds: [
      "uat-workflow-model",
      "uat-local-application",
      "uat-tanium-execution",
    ],
    outcomes: [
      "The resume reports a reduction from four FTEs to one",
      "The resume reports a reduction from one week to one hour",
    ],
    limitations: [
      "The bank identity, workflow stages, test data, and exact measurement scope are not public.",
    ],
    artifacts: [],
  },
  {
    id: "cablecar",
    index: "07",
    title: "CableCar",
    shortTitle: "CableCar",
    period: "Tanium / approximately 3.5 active years",
    portfolioGroup: "prior",
    statement:
      "A proprietary migration suite moved Tanium content from on-premises environments into Tanium Cloud.",
    summary:
      "Steve inherited CableCar after its original developer left, became technical lead, and maintained and expanded the React/Electron migration product. The internal migration stages remain intentionally sparse for now.",
    proofLabel: "Public workflow + private portfolio summary",
    evidenceClass: "implementation",
    replayStatus: "overview",
    nodeIds: [
      "react",
      "workflow-orchestration",
      "operator-control",
      "data-contracts",
      "trusted-evidence",
      "measured-impact",
    ],
    evidenceIds: [],
    outcomes: [
      "1,064 downloads reported by the internal tooling summary",
      "Two weeks / 80 hours saved per download is the owner-confirmed estimate",
    ],
    limitations: [
      "Customer content, transformation rules, internal architecture, and modeled financial savings are not published.",
    ],
    artifacts: [],
  },
  {
    id: "xsearch-extension",
    index: "08",
    title: "xSearch",
    shortTitle: "xSearch",
    period: "Tanium / internal prototype",
    portfolioGroup: "prior",
    statement:
      "A small browser extension can be the right answer when the problem is aggregation rather than a new search platform.",
    summary:
      "Steve built a Manifest V3 Chrome extension in five business days to aggregate results from existing service APIs. Rollout was delayed, and the commercial product was still purchased.",
    proofLabel: "Owner-curated implementation summary",
    evidenceClass: "implementation",
    replayStatus: "ready",
    nodeIds: [
      "manifest-v3",
      "data-contracts",
      "workflow-orchestration",
      "operator-control",
    ],
    evidenceIds: [
      "xsearch-source-apis",
      "xsearch-manifest-extension",
      "xsearch-result-aggregation",
    ],
    outcomes: [
      "A solo five-business-day prototype",
      "No avoided-spend or broad-adoption claim",
    ],
    limitations: [
      "Internal endpoints, credentials, company search data, and undocumented source behavior are not published.",
    ],
    artifacts: [],
  },
  {
    id: "tmatch-eolmatch",
    index: "09",
    title: "T-Match / EOLMatch",
    shortTitle: "T-Match",
    period: "Tanium use + public Go foundation",
    portfolioGroup: "prior",
    statement:
      "Inconsistent software inventory has to be normalized before lifecycle matching can be trusted.",
    summary:
      "The project applied fuzzy normalization and matching to end-of-life software detection. The public Go repository is evidence of the underlying approach, not proof that it is the exact private Tanium implementation.",
    proofLabel: "Public implementation + private-use summary",
    evidenceClass: "implementation",
    replayStatus: "overview",
    nodeIds: ["go", "evaluation", "data-contracts", "trusted-evidence"],
    evidenceIds: [],
    outcomes: [
      "A reusable Go matching foundation for inconsistent product names and versions",
    ],
    limitations: [
      "The public repository is not presented as the exact Tanium implementation.",
    ],
    artifacts: [
      {
        label: "EOLMatch",
        detail: "Public Go implementation of the matching foundation",
        access: "public",
        href: "https://github.com/Dorbii/EOLMatch",
      },
    ],
  },
  {
    id: "evidence-atlas",
    index: "10",
    title: "Evidence Atlas",
    shortTitle: "Portfolio",
    period: "Personal / current",
    portfolioGroup: "personal",
    statement:
      "A portfolio can make evidence relationships explorable without pretending proximity is proof.",
    summary:
      "This site uses an evidence-derived particle field, capability and technology nodes, project packets, deterministic layout, and explicit claim boundaries.",
    proofLabel: "Public implementation",
    evidenceClass: "implementation",
    replayStatus: "overview",
    nodeIds: [
      "react",
      "typescript",
      "operator-control",
      "data-contracts",
      "evaluation",
    ],
    evidenceIds: [],
    outcomes: [
      "A static, interactive portfolio with no application backend",
      "Project playback reuses the same evidence-selection model as manual graph exploration",
    ],
    limitations: [
      "The visualization communicates curated evidence relationships; it is not a statistical embedding.",
    ],
    artifacts: [],
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
