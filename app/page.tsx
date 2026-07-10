"use client";

import { useMemo, useState, type CSSProperties } from "react";

type MapMode = "capabilities" | "stack" | "projects" | "experience";
type NodeKind = "capability" | "stack" | "project" | "experience";

type MapNode = {
  id: string;
  label: string;
  kind: NodeKind;
  strength: number;
  x: number;
  y: number;
  summary: string;
  evidence: string[];
  related: string[];
};

const modeLabels: Record<MapMode, string> = {
  capabilities: "Capabilities",
  stack: "Stack",
  projects: "Projects",
  experience: "Experience",
};

const kindForMode: Record<MapMode, NodeKind> = {
  capabilities: "capability",
  stack: "stack",
  projects: "project",
  experience: "experience",
};

const nodes: MapNode[] = [
  {
    id: "agent-protocols",
    label: "Agent protocols",
    kind: "capability",
    strength: 6,
    x: 43,
    y: 23,
    summary: "Tooling that makes agent actions explicit, constrained, and traceable.",
    evidence: [
      "Built Kaizen's internal MCP service from capability contracts and OpenAPI/Swagger schemas.",
      "Implemented agent-to-service forwarding with role-filtered discovery, audit events, telemetry, and sanitized errors.",
    ],
    related: ["mcp", "openapi", "kinforge", "redis"],
  },
  {
    id: "workflow-orchestration",
    label: "Workflow orchestration",
    kind: "capability",
    strength: 6,
    x: 65,
    y: 31,
    summary: "Long-running systems with state, retries, handoffs, and an operator-visible lifecycle.",
    evidence: [
      "Built the orchestration layer for VM checkout, provisioning transitions, retries, backend coordination, and status tracking.",
      "Designed for cross-platform environments spanning AWS, VMware, and MacStadium.",
    ],
    related: ["vm-platform", "go", "aws", "postgres"],
  },
  {
    id: "context-compression",
    label: "Context compression",
    kind: "capability",
    strength: 4,
    x: 51,
    y: 51,
    summary: "Protocol work that makes bounded context inspectable and replayable rather than merely smaller.",
    evidence: [
      "Kinforge explores compact agent protocols with deterministic replay and comparison surfaces.",
      "Compression claims are kept scoped to controlled comparisons; this is not presented as proof of general model superiority.",
    ],
    related: ["kinforge", "agent-protocols", "typescript", "evaluation"],
  },
  {
    id: "reporting-systems",
    label: "Reporting systems",
    kind: "capability",
    strength: 5,
    x: 26,
    y: 60,
    summary: "Reporting that treats contracts, identity, and data quality as part of the product.",
    evidence: [
      "Expanded Kaizen Metrics with Databricks sync across 500+ Bitbucket repositories.",
      "Added schema validation and identity resolution for engineering dashboards and repository-level reporting.",
    ],
    related: ["databricks", "kaizen-metrics", "postgres", "react"],
  },
  {
    id: "operator-ux",
    label: "Operator UX",
    kind: "capability",
    strength: 4,
    x: 75,
    y: 61,
    summary: "Interfaces for operational work: clear state, usable control, and fewer hidden assumptions.",
    evidence: [
      "Built internal interfaces around provisioning, reporting, and document-migration workflows.",
      "React and Electron tooling automated conversion workflows that previously required substantial manual effort.",
    ],
    related: ["react", "vm-platform", "reporting-systems", "typescript"],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    kind: "capability",
    strength: 3,
    x: 61,
    y: 75,
    summary: "Making systems reviewable through controlled evidence, not decorative success metrics.",
    evidence: [
      "Kinforge uses deterministic replay to compare protocol behavior under controlled conditions.",
      "The portfolio separates demonstrated work from exploratory work instead of assigning invented confidence scores.",
    ],
    related: ["kinforge", "context-compression", "agent-protocols"],
  },
  {
    id: "go",
    label: "Go",
    kind: "stack",
    strength: 5,
    x: 54,
    y: 14,
    summary: "Backend services, matching logic, workflow coordination, and service boundaries.",
    evidence: [
      "Built a native Go Jaro-Winkler module for inconsistent endpoint inventory data.",
      "Used across platform and orchestration work.",
    ],
    related: ["workflow-orchestration", "vm-platform", "agent-protocols"],
  },
  {
    id: "typescript",
    label: "TypeScript",
    kind: "stack",
    strength: 5,
    x: 76,
    y: 45,
    summary: "Product interfaces, tooling surfaces, and interactive protocol exploration.",
    evidence: [
      "Used throughout full-stack internal tooling and the Kinforge simulation surface.",
      "Paired with React for operator-facing systems.",
    ],
    related: ["react", "kinforge", "operator-ux", "context-compression"],
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    kind: "stack",
    strength: 4,
    x: 35,
    y: 43,
    summary: "Durable product and workflow state behind internal platforms.",
    evidence: ["Used in full-stack platform work alongside service orchestration and reporting."],
    related: ["workflow-orchestration", "reporting-systems", "go"],
  },
  {
    id: "redis",
    label: "Redis",
    kind: "stack",
    strength: 4,
    x: 48,
    y: 36,
    summary: "Idempotency and write-retry safety where an agent can trigger real backend actions.",
    evidence: ["Implemented Redis-backed idempotency for MCP write retries."],
    related: ["agent-protocols", "mcp", "workflow-orchestration"],
  },
  {
    id: "aws",
    label: "AWS",
    kind: "stack",
    strength: 5,
    x: 81,
    y: 26,
    summary: "Infrastructure and AI-assisted reporting integration.",
    evidence: [
      "Provisioning platform spans AWS, VMware, and MacStadium.",
      "Integrated an AWS Bedrock-powered assistant into Kaizen Metrics.",
    ],
    related: ["vm-platform", "workflow-orchestration", "kaizen-metrics"],
  },
  {
    id: "databricks",
    label: "Databricks",
    kind: "stack",
    strength: 5,
    x: 18,
    y: 73,
    summary: "Contract-driven reporting and engineering-data synchronization.",
    evidence: ["Kaizen Metrics sync covers 500+ Bitbucket repositories with validation and identity resolution."],
    related: ["kaizen-metrics", "reporting-systems", "react"],
  },
  {
    id: "mcp",
    label: "MCP",
    kind: "stack",
    strength: 5,
    x: 37,
    y: 15,
    summary: "A constrained boundary between AI coding agents and existing backend services.",
    evidence: ["Generated tools from contracts and schemas instead of hand-maintained definitions."],
    related: ["agent-protocols", "openapi", "redis"],
  },
  {
    id: "openapi",
    label: "OpenAPI",
    kind: "stack",
    strength: 4,
    x: 30,
    y: 28,
    summary: "Schemas and capability contracts used as the source of truth for tool definitions.",
    evidence: ["Used OpenAPI/Swagger schemas to generate MCP tools."],
    related: ["mcp", "agent-protocols", "go"],
  },
  {
    id: "react",
    label: "React",
    kind: "stack",
    strength: 4,
    x: 84,
    y: 70,
    summary: "Operator-facing interfaces for internal tools and migration workflows.",
    evidence: ["Built React and Electron document-migration tooling and internal platform interfaces."],
    related: ["operator-ux", "typescript", "reporting-systems"],
  },
  {
    id: "kinforge",
    label: "Kinforge",
    kind: "project",
    strength: 4,
    x: 49,
    y: 86,
    summary: "A controlled simulation surface for compact agent protocols and replay-based evaluation.",
    evidence: [
      "Explores protocol adequacy and context compression through deterministic replay.",
      "Evidence is deliberately scoped: useful protocol evidence is not a blanket strategic-performance claim.",
    ],
    related: ["context-compression", "evaluation", "typescript", "agent-protocols"],
  },
  {
    id: "kaizen-metrics",
    label: "Kaizen Metrics",
    kind: "project",
    strength: 6,
    x: 14,
    y: 51,
    summary: "Reporting and AI-assisted tooling grounded in repository data, contracts, and operational constraints.",
    evidence: [
      "Databricks synchronization across 500+ repositories with schema validation and identity resolution.",
      "Bedrock-assisted metrics access plus contract-driven MCP tooling.",
    ],
    related: ["reporting-systems", "databricks", "agent-protocols", "aws"],
  },
  {
    id: "vm-platform",
    label: "VM platform",
    kind: "project",
    strength: 6,
    x: 88,
    y: 51,
    summary: "Self-service test-environment provisioning across multiple infrastructure providers.",
    evidence: [
      "Built cross-platform VM provisioning for QA and engineering teams.",
      "Covers checkout state, transitions, retries, coordination, and operational status.",
    ],
    related: ["workflow-orchestration", "aws", "go", "operator-ux"],
  },
];

const toneByKind: Record<NodeKind, string> = {
  capability: "cyan",
  stack: "lime",
  project: "coral",
  experience: "violet",
};

function MapNodeButton({
  node,
  active,
  subdued,
  onSelect,
}: {
  node: MapNode;
  active: boolean;
  subdued: boolean;
  onSelect: (id: string) => void;
}) {
  const dots = Array.from({ length: 9 + node.strength * 4 });
  const style = {
    "--x": `${node.x}%`,
    "--y": `${node.y}%`,
    "--strength": node.strength,
  } as CSSProperties;

  return (
    <button
      className={`map-node tone-${toneByKind[node.kind]} ${active ? "is-active" : ""} ${subdued ? "is-subdued" : ""}`}
      style={style}
      type="button"
      aria-pressed={active}
      aria-label={`${node.label}, evidence strength ${node.strength} of 6`}
      onClick={() => onSelect(node.id)}
    >
      <span className="node-field" aria-hidden="true">
        {dots.map((_, index) => (
          <i key={index} style={{ "--dot": index } as CSSProperties} />
        ))}
      </span>
      <span className="node-copy">
        <span>{node.label}</span>
        <small>evidence {node.strength} / 6</small>
      </span>
    </button>
  );
}

export default function Home() {
  const [mode, setMode] = useState<MapMode>("capabilities");
  const [selectedId, setSelectedId] = useState("agent-protocols");
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  const visibleNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        modeMatch: node.kind === kindForMode[mode],
      })),
    [mode],
  );

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#map" aria-label="Steven Doris home">
          STEVEN DORIS
        </a>
        <nav aria-label="Primary navigation">
          <a href="#map">Map</a>
          <a href="#work">Work</a>
          <a href="#resume">Resume</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero" id="map" aria-labelledby="hero-title">
        <div className="hero-intro">
          <p className="eyebrow">Evidence map / 2026</p>
          <h1 id="hero-title">I build systems that turn complexity into controlled work.</h1>
          <p className="lede">
            Full-stack platform engineering across workflows, data systems, and agent-facing tooling. Select a node to trace the work behind it.
          </p>
        </div>

        <div className="map-shell">
          <div className="map-instruction">
            <span>Relationship map</span>
            <p>Field density reflects the amount of direct evidence represented here, on a 1–6 scale.</p>
          </div>
          <div className="map-canvas" aria-label="Interactive capability and project map">
            <div className="field-haze haze-cyan" aria-hidden="true" />
            <div className="field-haze haze-lime" aria-hidden="true" />
            <div className="field-haze haze-coral" aria-hidden="true" />
            {visibleNodes.map((node) => (
              <MapNodeButton
                key={node.id}
                node={node}
                active={node.id === selectedId}
                subdued={selectedId !== node.id && !selected.related.includes(node.id) && !node.related.includes(selectedId) && !node.modeMatch}
                onSelect={setSelectedId}
              />
            ))}
          </div>

          <div className="map-controls" role="group" aria-label="Highlight map evidence by category">
            {(Object.keys(modeLabels) as MapMode[]).map((key) => (
              <button
                key={key}
                type="button"
                className={mode === key ? "is-selected" : ""}
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
              >
                <span className={`legend-dot ${key}`} />
                {modeLabels[key]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="evidence-detail" aria-live="polite" aria-labelledby="selected-title">
        <div>
          <p className="eyebrow">Selected evidence</p>
          <h2 id="selected-title">{selected.label}</h2>
          <p>{selected.summary}</p>
        </div>
        <div className="evidence-list">
          {selected.evidence.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="work-section" id="work" aria-labelledby="work-title">
        <div className="section-heading">
          <p className="eyebrow">Selected work</p>
          <h2 id="work-title">The map is the index. These are the cases.</h2>
        </div>
        <div className="work-grid">
          <article>
            <p className="case-tag coral">Kinforge</p>
            <h3>Compact protocol evaluation</h3>
            <p>A controlled environment for exploring context compression, protocol integrity, and deterministic replay.</p>
            <button type="button" onClick={() => setSelectedId("kinforge")}>Inspect evidence <span aria-hidden="true">→</span></button>
          </article>
          <article>
            <p className="case-tag cyan">Platform systems</p>
            <h3>Workflow control across real infrastructure</h3>
            <p>Self-service VM environments with lifecycle state, retries, backend coordination, and operational visibility.</p>
            <button type="button" onClick={() => setSelectedId("vm-platform")}>Inspect evidence <span aria-hidden="true">→</span></button>
          </article>
          <article>
            <p className="case-tag lime">Kaizen Metrics</p>
            <h3>Contracts, reporting, and agent-facing tooling</h3>
            <p>Repository-scale reporting and MCP tooling built around schemas, validation, identity, and safety boundaries.</p>
            <button type="button" onClick={() => setSelectedId("kaizen-metrics")}>Inspect evidence <span aria-hidden="true">→</span></button>
          </article>
        </div>
      </section>

      <section className="resume-section" id="resume" aria-labelledby="resume-title">
        <div className="section-heading">
          <p className="eyebrow">Resume</p>
          <h2 id="resume-title">Senior full-stack / platform engineer.</h2>
        </div>
        <div className="resume-grid">
          <p>Current work centers on internal platforms where engineering workflows, data systems, automation, and AI-assisted tooling meet.</p>
          <ul>
            <li><span>Now</span> NinjaOne — internal tools &amp; development</li>
            <li><span>Before</span> Tanium — internal tools &amp; development</li>
            <li><span>Earlier</span> DevOps architecture, enterprise automation, systems administration</li>
          </ul>
        </div>
      </section>

      <footer id="contact">
        <p>Available for senior platform, internal-tools, and agent-systems conversations.</p>
        <a href="mailto:stevemdoris@gmail.com">stevemdoris@gmail.com</a>
        <a href="https://github.com/Dorbii">GitHub</a>
        <a href="https://www.linkedin.com/in/stevendoris">LinkedIn</a>
      </footer>
    </main>
  );
}
