import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "design", "career-world", "territories");

const ROLE = Object.freeze({
  capital: Object.freeze({ width: 176, depth: 112, height: 24, fill: "#65717b", edge: "#f1f4f6" }),
  project: Object.freeze({ width: 92, depth: 60, height: 17, fill: "#4d5962", edge: "#d8dee3" }),
  skill: Object.freeze({ width: 52, depth: 36, height: 11, fill: "#38424a", edge: "#aeb8c0" }),
});

// These reservations correct the seven regenerated silhouettes before final stitching.
// They change layout clearance only; source pixels and hierarchy scale remain untouched.
const ASSET_FOOTPRINT_OVERRIDES = Object.freeze({
  "city/tanium@v1": Object.freeze({ width: 204, depth: 126 }),
  "project/cablecar@v1": Object.freeze({ width: 132, depth: 48 }),
  "project/vendy-vm-platform@v1": Object.freeze({ width: 120, depth: 82 }),
  "skill/ai@v1": Object.freeze({ width: 66, depth: 46 }),
  "skill/java@v1": Object.freeze({ width: 54, depth: 40 }),
  "skill/openapi@v1": Object.freeze({ width: 70, depth: 34 }),
  "skill/react@v1": Object.freeze({ width: 66, depth: 48 }),
});

function roleFor(node) {
  const base = ROLE[node.kind];
  const override = ASSET_FOOTPRINT_OVERRIDES[node.assetId];
  return override ? { ...base, ...override } : base;
}

const skill = (employerId, id, label, x, y, evidenceStatus = "evidence-backed") => ({
  nodeId: "instance/" + employerId + "/skill/" + id + "/01",
  assetId: "skill/" + id + "@v1",
  kind: "skill",
  label,
  position: { x, y },
  evidenceStatus,
});

const project = (employerId, id, label, x, y, skillIds = [], evidenceStatus = "evidence-backed") => ({
  nodeId: "instance/" + employerId + "/project/" + id + "/01",
  assetId: "project/" + id + "@v1",
  projectId: id,
  kind: "project",
  label,
  position: { x, y },
  evidenceStatus,
  skillIds,
});

const capital = (employerId, assetSlug, label, x, y) => ({
  nodeId: "instance/" + employerId + "/capital/01",
  assetId: "city/" + assetSlug + "@v1",
  kind: "capital",
  label,
  position: { x, y },
  evidenceStatus: "evidence-backed",
});

const territories = [
  {
    id: "ninjaone",
    label: "NinjaOne",
    subtitle: "Relay plateau / protected service basin",
    canvas: { width: 1280, height: 880 },
    layoutWeight: 26,
    topography: {
      archetype: "concentric-relay-plateau",
      landPath: "M82 258 C118 128 300 68 470 96 C650 38 878 68 1055 142 C1198 216 1222 404 1160 562 C1124 720 910 810 706 792 C520 852 304 814 168 710 C62 606 46 422 82 258 Z",
      waterFeature: "protected southwest maintenance basin",
      contours: [
        "M146 281 C190 172 334 122 482 142 C650 92 840 116 1000 179 C1106 236 1140 376 1098 504",
        "M204 322 C258 236 378 198 510 211 C645 171 794 191 931 245 C1015 286 1041 390 1012 478",
        "M292 368 C351 300 455 278 552 286 C648 256 751 270 849 310 C912 340 930 414 904 466",
      ],
      cutouts: [
        "M67 603 C126 565 189 574 231 628 C213 702 155 742 93 711 Z",
      ],
      routeStyle: "radial ring and outer maintenance loop",
    },
    nodes: [
      capital("ninjaone", "ninjaone", "NinjaOne", 640, 365),
      project("ninjaone", "kaizen-agent-platform", "Kaizen Agent Platform", 350, 505, ["data-contracts", "go", "redis", "mcp", "openapi"]),
      project("ninjaone", "engineering-metrics-pipeline", "Kaizen Metrics", 600, 585, ["python", "databricks", "workflow-orchestration", "data-contracts", "go", "postgresql", "docker", "ai", "aws"]),
      project("ninjaone", "vendy-vm-platform", "Vendy VM Platform", 920, 430, ["workflow-orchestration", "operator-control", "data-contracts", "go", "react", "aws", "postgresql", "vmware", "macstadium"]),
      skill("ninjaone", "data-contracts", "Data contracts", 510, 225),
      skill("ninjaone", "go", "Go", 400, 345),
      skill("ninjaone", "redis", "Redis", 220, 365),
      skill("ninjaone", "mcp", "MCP", 235, 480),
      skill("ninjaone", "openapi", "OpenAPI", 810, 220),
      skill("ninjaone", "workflow-orchestration", "Workflow orchestration", 860, 575),
      skill("ninjaone", "operator-control", "Operator control", 735, 655),
      skill("ninjaone", "react", "React", 1040, 520),
      skill("ninjaone", "aws", "AWS", 950, 660),
      skill("ninjaone", "postgresql", "PostgreSQL", 480, 700),
      skill("ninjaone", "vmware", "VMware", 825, 740),
      skill("ninjaone", "macstadium", "MacStadium", 1060, 730),
      skill("ninjaone", "python", "Python", 310, 675),
      skill("ninjaone", "databricks", "Databricks", 150, 610),
      skill("ninjaone", "docker", "Docker", 400, 750),
      skill("ninjaone", "ai", "AI", 150, 505),
    ],
  },
  {
    id: "tanium",
    label: "Tanium",
    subtitle: "Inspection escarpment / sequential ridge",
    canvas: { width: 1160, height: 820 },
    layoutWeight: 23,
    topography: {
      archetype: "diagonal-inspection-escarpment",
      landPath: "M78 128 C212 62 374 72 508 126 L1061 312 C1120 350 1114 466 1052 522 L783 748 C696 810 552 792 464 734 L119 478 C48 424 29 207 78 128 Z",
      waterFeature: "southeast inspection channel and hard quay",
      contours: [
        "M134 152 L1008 420 C1046 433 1051 471 1014 500 L742 704",
        "M170 208 L944 441 C978 452 982 478 950 503 L700 674",
        "M208 268 L871 465 C903 474 905 496 877 517 L663 642",
        "M252 326 L797 487 C827 496 829 514 803 533 L627 606",
      ],
      cutouts: [
        "M766 700 L1054 511 C1094 486 1127 514 1118 561 L926 752 C870 796 815 783 766 700 Z",
      ],
      routeStyle: "single ridge spine with controlled cross-links",
    },
    nodes: [
      capital("tanium", "tanium", "Tanium", 590, 360),
      project("tanium", "uat-automation", "UAT Automation", 245, 220, ["csharp", "localdb", "operator-control", "workflow-orchestration", "data-contracts"]),
      project("tanium", "tanium-risk-assessment", "Tanium Risk Assessment", 405, 340, ["python", "go", "workflow-orchestration", "operator-control", "data-contracts"]),
      project("tanium", "cablecar", "CableCar", 830, 300, ["react", "electron", "workflow-orchestration", "operator-control", "data-contracts"]),
      project("tanium", "xsearch", "xSearch", 945, 465, ["data-contracts", "workflow-orchestration", "operator-control"]),
      project("tanium", "tmatch-eolmatch", "T-Match / EOLMatch", 680, 570, ["go", "data-contracts"]),
      skill("tanium", "python", "Python", 220, 440),
      skill("tanium", "go", "Go", 400, 610),
      skill("tanium", "workflow-orchestration", "Workflow orchestration", 900, 650),
      skill("tanium", "operator-control", "Operator control", 340, 140),
      skill("tanium", "data-contracts", "Data contracts", 505, 170),
      skill("tanium", "csharp", "C#", 145, 115),
      skill("tanium", "localdb", "LocalDB", 120, 300),
      skill("tanium", "react", "React", 1010, 260),
      skill("tanium", "electron", "Electron", 930, 155),
    ],
  },
  {
    id: "independent",
    label: "Independent",
    subtitle: "Maker peninsula / triangular review cut",
    canvas: { width: 920, height: 680 },
    layoutWeight: 14,
    topography: {
      archetype: "asymmetric-maker-peninsula",
      landPath: "M80 194 C137 86 286 58 413 101 C535 50 720 82 824 181 C903 257 883 402 814 485 C731 584 590 637 447 612 C327 663 178 612 106 520 C42 437 39 273 80 194 Z",
      waterFeature: "open southern working inlet and public pier",
      contours: [
        "M136 211 C196 132 300 114 407 145 C510 104 651 126 747 195",
        "M183 255 C245 194 326 183 412 206 C501 173 610 188 692 242",
        "M232 310 C287 263 351 255 417 272 C480 247 554 259 616 297",
      ],
      cutouts: [
        "M422 338 L515 451 L332 456 Z",
        "M659 570 C722 518 802 509 844 548 C809 625 730 649 659 570 Z",
      ],
      routeStyle: "diagonal discovery-to-delivery promenade",
    },
    nodes: [
      capital("independent", "independent", "Independent", 460, 315),
      project("independent", "contextforge", "ContextForge", 245, 410, ["context-compression", "workflow-orchestration", "data-contracts", "typescript"]),
      project("independent", "career-world-portfolio", "Career World Portfolio", 700, 390, ["react", "typescript", "operator-control", "data-contracts"]),
      skill("independent", "context-compression", "Context compression", 125, 320),
      skill("independent", "workflow-orchestration", "Workflow orchestration", 170, 180),
      skill("independent", "data-contracts", "Data contracts", 335, 165),
      skill("independent", "typescript", "TypeScript", 555, 125),
      skill("independent", "react", "React", 770, 230),
      skill("independent", "operator-control", "Operator control", 460, 525),
    ],
  },
  {
    id: "column-technologies",
    label: "Column Technologies",
    subtitle: "Engineered breakwater / protected basins",
    canvas: { width: 860, height: 640 },
    layoutWeight: 13,
    topography: {
      archetype: "rectilinear-engineered-breakwater",
      landPath: "M78 122 L687 79 L801 153 L809 454 L721 556 L209 576 L72 472 Z",
      waterFeature: "formal west harbor and straight service quay",
      contours: [
        "M130 154 L664 118 L752 174 L756 420 L687 512 L230 529",
        "M186 197 L638 166 L705 204 L708 391 L657 470 L258 486",
        "M249 239 L608 215 L657 238 L658 360 L623 425 L294 443",
      ],
      cutouts: [
        "M71 283 L215 268 L245 388 L78 410 Z",
        "M611 79 L735 104 L707 230 L584 206 Z",
      ],
      routeStyle: "orthogonal service grid and harbor spurs",
    },
    nodes: [
      capital("column-technologies", "column-technologies", "Column Technologies", 430, 260),
      project("column-technologies", "atlassian-platform-automation", "Atlassian Platform Automation", 230, 400, [], "identity-only"),
      project("column-technologies", "atlassian-data-center-resilience", "Atlassian Data Center Resilience", 650, 350, [], "identity-only"),
      project("column-technologies", "client-devops-delivery-implementations", "Client DevOps Delivery", 560, 500, [], "identity-only"),
      skill("column-technologies", "atlassian", "Atlassian", 205, 230, "employer-supported-unlinked"),
      skill("column-technologies", "ci-cd", "CI/CD", 350, 515, "employer-supported-unlinked"),
      skill("column-technologies", "docker", "Docker", 730, 500, "employer-supported-unlinked"),
    ],
  },
  {
    id: "ace-hardware",
    label: "ACE Hardware",
    subtitle: "Workshop cove / low cooperative island",
    canvas: { width: 780, height: 600 },
    layoutWeight: 11,
    topography: {
      archetype: "compact-workshop-cove",
      landPath: "M103 126 C221 62 393 70 522 111 C669 157 728 260 685 403 C649 519 501 555 355 536 C215 563 100 503 66 397 C31 289 40 185 103 126 Z",
      waterFeature: "east working cove and repair apron",
      contours: [
        "M143 157 C244 108 381 112 489 145 C604 179 655 257 622 367",
        "M187 199 C275 162 375 166 460 190 C545 216 584 269 558 342",
        "M235 243 C305 218 374 220 433 237 C486 253 510 284 493 324",
      ],
      cutouts: [
        "M600 171 C682 201 725 259 699 332 C653 351 606 325 576 283 Z",
      ],
      routeStyle: "branching service lanes around a civic rise",
    },
    nodes: [
      capital("ace-hardware", "ace-hardware", "ACE Hardware", 390, 255),
      project("ace-hardware", "qc-alm-extractor", "QC ALM Extractor", 170, 245, [], "identity-only"),
      project("ace-hardware", "ticket-validation-automation", "Ticket Validation Automation", 235, 410, [], "identity-only"),
      project("ace-hardware", "sap-table-update-integration", "SAP Table Update Integration", 560, 390, [], "identity-only"),
      skill("ace-hardware", "informatica", "Informatica", 545, 170, "employer-supported-unlinked"),
    ],
  },
];

const expectedCounts = Object.freeze({
  ninjaone: 20,
  tanium: 15,
  independent: 9,
  "column-technologies": 7,
  "ace-hardware": 5,
});

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function edgePoint(from, to, role) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const radius = Math.max(role.width, role.depth) * 0.28;
  return {
    x: from.x + (dx / length) * radius,
    y: from.y + (dy / length) * radius,
  };
}

function connectionSvg(territory) {
  const byNode = new Map(territory.nodes.map((node) => [node.nodeId, node]));
  const bySkill = new Map(
    territory.nodes
      .filter((node) => node.kind === "skill")
      .map((node) => [node.assetId.slice("skill/".length, -"@v1".length), node]),
  );
  const cap = territory.nodes.find((node) => node.kind === "capital");
  const output = [];

  for (const node of territory.nodes.filter((candidate) => candidate.kind === "project")) {
    const start = edgePoint(cap.position, node.position, roleFor(cap));
    const end = edgePoint(node.position, cap.position, roleFor(node));
    output.push(
      '<path d="M ' + start.x + " " + start.y + " L " + end.x + " " + end.y +
      '" class="route route-primary" data-from="' + escapeXml(cap.nodeId) +
      '" data-to="' + escapeXml(node.nodeId) + '"/>',
    );
    for (const skillId of node.skillIds) {
      const target = bySkill.get(skillId);
      if (!target) {
        throw new Error("Missing local skill " + skillId + " for " + node.nodeId);
      }
      const a = edgePoint(node.position, target.position, roleFor(node));
      const b = edgePoint(target.position, node.position, roleFor(target));
      output.push(
        '<path d="M ' + a.x + " " + a.y + " L " + b.x + " " + b.y +
        '" class="route route-evidence" data-project="' + escapeXml(node.projectId) +
        '" data-skill="' + escapeXml(skillId) + '"/>',
      );
    }
  }

  if (byNode.size !== territory.nodes.length) {
    throw new Error("Duplicate local node map key in " + territory.id);
  }
  return output.join("\n");
}

function nodeSvg(node) {
  const role = roleFor(node);
  const x = node.position.x;
  const y = node.position.y;
  const halfW = role.width / 2;
  const halfD = role.depth / 2;
  const drop = role.height;
  const top = [
    [x, y - halfD],
    [x + halfW, y],
    [x, y + halfD],
    [x - halfW, y],
  ].map((point) => point.join(",")).join(" ");
  const left = [
    [x - halfW, y],
    [x, y + halfD],
    [x, y + halfD + drop],
    [x - halfW, y + drop],
  ].map((point) => point.join(",")).join(" ");
  const right = [
    [x, y + halfD],
    [x + halfW, y],
    [x + halfW, y + drop],
    [x, y + halfD + drop],
  ].map((point) => point.join(",")).join(" ");
  const labelY = y + halfD + drop + 19;
  const roleLabel = node.kind === "capital" ? "CAPITAL" : node.kind === "project" ? "PROJECT" : "SKILL";
  const maxChars = node.kind === "skill" ? 22 : 36;
  const displayLabel = node.label.length > maxChars ? node.label.slice(0, maxChars - 1) + "…" : node.label;

  return [
    '<g class="node node-' + node.kind + '" data-node-id="' + escapeXml(node.nodeId) + '" data-asset-id="' + escapeXml(node.assetId) + '">',
    '<ellipse cx="' + x + '" cy="' + (y + halfD + drop + 5) + '" rx="' + (halfW * 0.74) + '" ry="' + (halfD * 0.34) + '" class="node-shadow"/>',
    '<polygon points="' + left + '" fill="#20272c" stroke="' + role.edge + '"/>',
    '<polygon points="' + right + '" fill="#2b343b" stroke="' + role.edge + '"/>',
    '<polygon points="' + top + '" fill="' + role.fill + '" stroke="' + role.edge + '"/>',
    '<circle cx="' + x + '" cy="' + y + '" r="' + (node.kind === "capital" ? 8 : node.kind === "project" ? 5 : 3.5) + '" class="node-core"/>',
    '<text x="' + x + '" y="' + labelY + '" class="node-label">' + escapeXml(displayLabel) + "</text>",
    '<text x="' + x + '" y="' + (labelY + 13) + '" class="node-role">' + roleLabel + "</text>",
    "</g>",
  ].join("\n");
}

function territorySvg(territory) {
  const width = territory.canvas.width;
  const height = territory.canvas.height;
  const contourSvg = territory.topography.contours
    .map((d, index) => '<path d="' + d + '" class="contour contour-' + index + '"/>')
    .join("\n");
  const cutoutSvg = territory.topography.cutouts
    .map((d) => '<path d="' + d + '" class="water-cut"/>')
    .join("\n");
  const nodesSvg = territory.nodes
    .slice()
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map(nodeSvg)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" role="img" aria-labelledby="title desc">',
    "<title id=\"title\">" + escapeXml(territory.label) + " standalone territory layout</title>",
    "<desc id=\"desc\">" + escapeXml(territory.subtitle) + "; " + territory.nodes.length + " placed canonical nodes.</desc>",
    "<defs>",
    '<pattern id="iso-grid" width="48" height="28" patternUnits="userSpaceOnUse">',
    '<path d="M0 14 L24 0 L48 14 L24 28 Z" fill="none" stroke="#273039" stroke-width="0.65"/>',
    "</pattern>",
    '<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>',
    "</defs>",
    "<style>",
    ".frame{fill:#0a0d10}.grid{fill:url(#iso-grid);opacity:.7}.land{fill:#252c32;stroke:#a7b1ba;stroke-width:2.2}.land-inner{fill:none;stroke:#cbd2d8;stroke-width:1;opacity:.2}.contour{fill:none;stroke:#87939d;stroke-width:1.25;opacity:.52;stroke-dasharray:7 7}.water-cut{fill:#101820;stroke:#7f8b94;stroke-width:1.4}.route{fill:none;stroke-linecap:round}.route-primary{stroke:#d9e0e5;stroke-width:4;opacity:.45}.route-evidence{stroke:#aeb8c0;stroke-width:1.5;opacity:.28;stroke-dasharray:5 7}.node polygon{stroke-width:1.35;vector-effect:non-scaling-stroke}.node-shadow{fill:#000;opacity:.34;filter:url(#soft-shadow)}.node-core{fill:#f4f6f7;stroke:#111820;stroke-width:2}.node-label{fill:#f4f6f7;font:600 12px Inter,Segoe UI,sans-serif;text-anchor:middle;paint-order:stroke;stroke:#0a0d10;stroke-width:3px;stroke-linejoin:round}.node-role{fill:#93a0aa;font:700 8px Inter,Segoe UI,sans-serif;text-anchor:middle;letter-spacing:1.6px;paint-order:stroke;stroke:#0a0d10;stroke-width:2px}.heading{fill:#f6f8f9;font:700 22px Inter,Segoe UI,sans-serif;letter-spacing:.3px}.subheading{fill:#9da8b0;font:500 12px Inter,Segoe UI,sans-serif}.meta{fill:#7f8b94;font:600 10px Inter,Segoe UI,sans-serif;letter-spacing:1.1px}.legend-text{fill:#aeb7bf;font:500 10px Inter,Segoe UI,sans-serif}.safe-line{fill:none;stroke:#6d7780;stroke-width:1;stroke-dasharray:3 8;opacity:.35}",
    "</style>",
    '<rect class="frame" width="' + width + '" height="' + height + '"/>',
    '<rect class="grid" width="' + width + '" height="' + height + '"/>',
    '<path d="' + territory.topography.landPath + '" class="land"/>',
    '<path d="' + territory.topography.landPath + '" class="land-inner" transform="translate(0 5)"/>',
    contourSvg,
    cutoutSvg,
    '<rect x="54" y="54" width="' + (width - 108) + '" height="' + (height - 108) + '" rx="28" class="safe-line"/>',
    connectionSvg(territory),
    nodesSvg,
    '<g transform="translate(34 34)">',
    '<rect x="-14" y="-18" width="' + Math.min(width - 40, 470) + '" height="72" rx="10" fill="#0a0d10" opacity=".9" stroke="#39434b"/>',
    '<text class="heading" x="0" y="8">' + escapeXml(territory.label) + "</text>",
    '<text class="subheading" x="0" y="29">' + escapeXml(territory.subtitle) + "</text>",
    '<text class="meta" x="0" y="47">LOCAL ' + width + "×" + height + " · WEIGHT " + territory.layoutWeight + " · " + territory.nodes.length + " NODES</text>",
    "</g>",
    '<g transform="translate(' + (width - 274) + " " + (height - 39) + ')">',
    '<rect x="-13" y="-19" width="252" height="32" rx="8" fill="#0a0d10" opacity=".88" stroke="#39434b"/>',
    '<text class="legend-text" x="0" y="2">solid: capital route</text>',
    '<text class="legend-text" x="123" y="2">dashed: evidence link</text>',
    "</g>",
    "</svg>",
  ].join("\n");
}

function rectFor(node, pad = 0) {
  const role = roleFor(node);
  return {
    left: node.position.x - role.width / 2 - pad,
    right: node.position.x + role.width / 2 + pad,
    top: node.position.y - role.depth / 2 - pad,
    bottom: node.position.y + role.depth / 2 + role.height + 34 + pad,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function validateLayouts() {
  const failures = [];
  const globalIds = new Set();
  const expectedTotal = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
  const actualTotal = territories.reduce((sum, territory) => sum + territory.nodes.length, 0);
  if (expectedTotal !== 56 || actualTotal !== 56) {
    failures.push("Expected and actual total node count must both equal 56; got " + expectedTotal + " and " + actualTotal);
  }

  for (const territory of territories) {
    if (territory.nodes.length !== expectedCounts[territory.id]) {
      failures.push(territory.id + " expected " + expectedCounts[territory.id] + " nodes but has " + territory.nodes.length);
    }
    for (const node of territory.nodes) {
      if (globalIds.has(node.nodeId)) {
        failures.push("Duplicate global node ID " + node.nodeId);
      }
      globalIds.add(node.nodeId);
      if (node.assetId === "skill/safe-writes@v1" || node.assetId === "skill/manifest-v3@v1") {
        failures.push("Excluded asset present: " + node.assetId);
      }
      if (!node.nodeId.startsWith("instance/" + territory.id + "/")) {
        failures.push("Non-local node ID " + node.nodeId + " in " + territory.id);
      }
      const rect = rectFor(node, 0);
      if (rect.left < 54 || rect.top < 54 || rect.right > territory.canvas.width - 54 || rect.bottom > territory.canvas.height - 54) {
        failures.push("Node outside safe inset: " + node.nodeId);
      }
    }
    for (let i = 0; i < territory.nodes.length; i += 1) {
      for (let j = i + 1; j < territory.nodes.length; j += 1) {
        if (overlaps(rectFor(territory.nodes[i], 8), rectFor(territory.nodes[j], 8))) {
          failures.push("Reserved footprint overlap in " + territory.id + ": " + territory.nodes[i].nodeId + " / " + territory.nodes[j].nodeId);
        }
      }
    }
    if ((territory.id === "ace-hardware" || territory.id === "column-technologies") &&
        territory.nodes.some((node) => node.kind === "project" && node.skillIds.length > 0)) {
      failures.push("Identity-only territory contains a project-to-skill link: " + territory.id);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    expectedTerritories: 5,
    actualTerritories: territories.length,
    expectedNodes: 56,
    actualNodes: actualTotal,
    excludedAssetsAbsent: !territories.some((territory) =>
      territory.nodes.some((node) => node.assetId === "skill/safe-writes@v1" || node.assetId === "skill/manifest-v3@v1")),
    finalStitchCreated: false,
  };
}

async function optionalSharp() {
  const localRequire = createRequire(import.meta.url);
  try {
    return localRequire("sharp");
  } catch {
    // Fall through to the optional bundled runtime used by Codex workspaces.
  }
  const moduleRoot = process.env.CW_NODE_MODULES;
  if (!moduleRoot) {
    return null;
  }
  const requireFromRuntime = createRequire(pathToFileURL(path.join(moduleRoot, "career-world-territory-render.cjs")));
  try {
    return requireFromRuntime(path.join(moduleRoot, "sharp"));
  } catch {
    return null;
  }
}

fs.mkdirSync(outputDir, { recursive: true });

const gate = validateLayouts();
if (!gate.passed) {
  throw new Error("Territory layout validation failed:\n" + gate.failures.join("\n"));
}

const registryModule = await import(
  pathToFileURL(path.join(repoRoot, "features", "career-world", "model", "world-registry.ts")).href
);
const excludedAssets = new Set(["skill/safe-writes@v1", "skill/manifest-v3@v1"]);
const expectedRegistryIds = registryModule.careerWorldRegistry.instances
  .filter((instance) => !excludedAssets.has(instance.assetId))
  .map((instance) => instance.id)
  .sort();
const placedIds = territories.flatMap((territory) => territory.nodes.map((node) => node.nodeId)).sort();
const missingRegistryIds = expectedRegistryIds.filter((id) => !placedIds.includes(id));
const unexpectedLayoutIds = placedIds.filter((id) => !expectedRegistryIds.includes(id));
if (missingRegistryIds.length || unexpectedLayoutIds.length) {
  throw new Error(
    "Registry/layout reconciliation failed:\nmissing=" + missingRegistryIds.join(",") +
    "\nunexpected=" + unexpectedLayoutIds.join(","),
  );
}
gate.registryReconciliation = {
  status: "PASS",
  registryInstancesAfterExclusions: expectedRegistryIds.length,
  placedInstances: placedIds.length,
  missingRegistryIds,
  unexpectedLayoutIds,
};

const layoutArtifact = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  authority: "docs/career-world-production/regional-territory-contract.md",
  coordinateSystem: {
    origin: "top-left",
    unit: "territory-local-layout-unit",
    finalStitchStatus: "not-created",
    inheritedGlobalCoordinates: false,
  },
  exclusions: ["skill/safe-writes@v1", "skill/manifest-v3@v1"],
  mixedTransportPool: [
    "ambient/city-shuttle@v1",
    "ambient/commuter-car@v1",
    "ambient/delivery-van@v1",
    "ambient/cargo-boat@v1",
    "ambient/harbor-ferry@v1",
    "ambient/service-truck@v1",
    "ambient/work-skiff@v1",
  ],
  territories: territories.map((territory) => ({
    id: territory.id,
    label: territory.label,
    subtitle: territory.subtitle,
    canvas: territory.canvas,
    layoutWeight: territory.layoutWeight,
    topography: territory.topography,
    nodeCount: territory.nodes.length,
    counts: {
      capital: territory.nodes.filter((node) => node.kind === "capital").length,
      projects: territory.nodes.filter((node) => node.kind === "project").length,
      skills: territory.nodes.filter((node) => node.kind === "skill").length,
    },
    nodes: territory.nodes.map((node) => ({
      ...node,
      reservedFootprint: {
        width: roleFor(node).width,
        depth: roleFor(node).depth,
        renderedHeight: roleFor(node).height,
      },
    })),
  })),
};

const layoutJson = JSON.stringify(layoutArtifact, null, 2) + "\n";
const layoutHash = crypto.createHash("sha256").update(layoutJson).digest("hex");
fs.writeFileSync(path.join(outputDir, "territory-layouts.json"), layoutJson, "utf8");

const sharp = await optionalSharp();
const renderResults = [];
for (const territory of territories) {
  const svg = territorySvg(territory);
  const svgPath = path.join(outputDir, territory.id + "-territory.svg");
  const pngPath = path.join(outputDir, territory.id + "-territory.png");
  fs.writeFileSync(svgPath, svg, "utf8");
  if (sharp) {
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    renderResults.push({ id: territory.id, svg: path.relative(repoRoot, svgPath), png: path.relative(repoRoot, pngPath), rasterized: true });
  } else {
    renderResults.push({ id: territory.id, svg: path.relative(repoRoot, svgPath), png: null, rasterized: false });
  }
}

const indexHtml = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '<meta charset="utf-8"/>',
  '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
  "<title>Career World standalone territory layouts</title>",
  "<style>html{background:#080b0e;color:#eef2f4;font-family:Inter,Segoe UI,sans-serif}body{margin:0;padding:32px}header{max-width:900px;margin:0 auto 26px}h1{margin:0 0 8px;font-size:28px}p{color:#9ca8b1;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px}.card{background:#11161b;border:1px solid #303942;border-radius:14px;overflow:hidden}.card h2{font-size:16px;margin:16px 18px 6px}.card p{font-size:12px;margin:0 18px 16px}.card img{display:block;width:100%;height:auto;background:#0a0d10}</style>",
  "</head>",
  "<body>",
  "<header><h1>Standalone territory layouts</h1><p>Five independent local coordinate systems. No global map or final stitch is present.</p></header>",
  '<main class="grid">',
  ...territories.map((territory) =>
    '<article class="card"><h2>' + escapeXml(territory.label) + '</h2><p>' +
    escapeXml(territory.subtitle) + " · " + territory.nodes.length + ' nodes</p><img src="' +
    territory.id + '-territory.svg" alt="' + escapeXml(territory.label) + ' territory layout"/></article>'),
  "</main>",
  "</body>",
  "</html>",
].join("\n");
fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml, "utf8");

const gateReport = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: "PASS",
  layoutSha256: layoutHash,
  checks: gate,
  renders: renderResults,
  stopBoundary: {
    standaloneTerritoriesComplete: true,
    finalStitchCreated: false,
    runtimeMapModifiedByThisScript: false,
  },
};
fs.writeFileSync(path.join(outputDir, "layout-gate-report.json"), JSON.stringify(gateReport, null, 2) + "\n", "utf8");

process.stdout.write(JSON.stringify({
  status: "PASS",
  territories: territories.length,
  nodes: gate.actualNodes,
  layoutSha256: layoutHash,
  rasterized: Boolean(sharp),
  outputDir,
}, null, 2) + "\n");
