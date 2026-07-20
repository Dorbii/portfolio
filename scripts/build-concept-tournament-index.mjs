import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const careerWorldRoot = path.join(repoRoot, "design", "career-world");
const tournamentRoot = path.join(careerWorldRoot, "concept-tournaments");
const briefRoot = path.join(repoRoot, "docs", "career-world-production", "briefs");

const displayNameOverrides = new Map([
  ["ambient/rock-cluster@v1", "Rock Cluster"],
  ["ambient/shore-pier@v1", "Shore Pier"],
  ["ambient/evergreen-cluster@v1", "Evergreen Cluster"],
  ["ambient/service-truck@v1", "Service Truck"],
  ["ambient/marker-buoy@v1", "Marker Buoy"],
  ["ambient/cargo-boat@v1", "Cargo Boat"],
  ["ambient/roof-equipment-kit@v1", "Roof Equipment Kit"]
]);

const excludedAssetReasons = new Map([
  ["skill/manifest-v3@v1", "Resume coverage is too small to justify a dedicated Career World building."],
  ["skill/safe-writes@v1", "Implementation detail does not warrant a dedicated Career World building."]
]);

const variantKitPolicies = new Map([
  ["ambient/evergreen-cluster@v1", {
    minimumVariants: 4,
    reason: "Low-detail vegetation should use an interchangeable silhouette set rather than a tournament winner.",
    variationAxes: ["height", "canopy width", "branch density", "cluster footprint"]
  }],
  ["ambient/rock-cluster@v1", {
    minimumVariants: 4,
    reason: "Low-detail rocks should use an interchangeable formation set rather than a tournament winner.",
    variationAxes: ["stone count", "height", "spread", "angular profile"]
  }],
  ["ambient/rail-tram@v1", {
    minimumVariants: 3,
    reason: "Rail traffic needs several interchangeable map-scale consists but does not need art-direction review.",
    variationAxes: ["car length", "section count", "cab profile", "roof hardware"]
  }],
  ["ambient/marker-buoy@v1", {
    minimumVariants: 3,
    reason: "Navigation markers are low-detail world dressing and should vary automatically.",
    variationAxes: ["body profile", "top marker", "guard cage", "base width"]
  }],
  ["ambient/roof-equipment-kit@v1", {
    minimumVariants: 3,
    reason: "Roof equipment is supporting detail and should be assembled from a reusable variation kit.",
    variationAxes: ["unit count", "duct layout", "vent height", "service-frame footprint"]
  }],
  ["ambient/shore-pier@v1", {
    minimumVariants: 3,
    reason: "Piers are repeated shoreline infrastructure and need footprint variation without tournament review.",
    variationAxes: ["deck length", "branching", "post rhythm", "end platform"]
  }],
  ["ambient/street-furniture-kit@v1", {
    minimumVariants: 3,
    reason: "Street furniture is low-detail civic dressing and should ship as interchangeable prop groupings.",
    variationAxes: ["prop mix", "spacing", "planter footprint", "lamp and bench rhythm"]
  }]
]);

const iterationFolders = new Map([
  ["city/ace-hardware@v1", "ace-hardware-city-r2"],
  ["city/ninjaone@v1", "city-ninjaone-r2"],
  ["city/tanium@v1", "city-tanium-r2"],
  ["skill/csharp@v1", "skill-csharp-r2"],
  ["skill/go@v1", "skill-go-r2"],
  ["skill/java@v1", "skill-java-r2"],
  ["skill/mcp@v1", "skill-mcp-r2"],
  ["skill/python@v1", "skill-python-r2"],
  ["skill/typescript@v1", "skill-typescript-r2"]
]);

const expansionAssets = [
  {
    id: "ambient/commuter-car@v1",
    category: "ambient",
    name: "Commuter Car",
    baselineBrief: "A coherent three-member personal car family at one map scale: a short-wheelbase upright open utility 4x4 inspired by 1994 Wrangler proportions, a compact Honda Civic-inspired daily driver with generation and body style still to be specified, and a wide sport sedan inspired by 2018 WRX proportions. Preserve recognizable class-level silhouettes without logos, badges, exact grilles, exact lamps, or one-to-one production geometry.",
    iterationDirective: "Replace the current single generic four-door batch with a coordinated three-vehicle family. Each member must remain an independently placeable asset while sharing projection, wheel scale, line density, and grayscale material treatment.",
    selectionMode: "variant-family",
    minimumVariants: 3
  },
  {
    id: "ambient/delivery-van@v1",
    category: "ambient",
    name: "Delivery Van",
    baselineBrief: "A compact last-mile delivery van with a tall enclosed cargo body, short cab, two side access zones, and a clipped rectangular footprint."
  },
  {
    id: "ambient/city-shuttle@v1",
    category: "ambient",
    name: "City Shuttle",
    baselineBrief: "A coordinated civic transit family with at least two distinct silhouettes: a short low-floor neighborhood shuttle and a longer single-body city bus, sharing wheel scale, doorway language, restrained roof equipment, and map-readable passenger volumes without operator markings.",
    iterationDirective: "Replace the single short-shuttle batch with a small transit family so repeated road traffic does not reuse one bus silhouette.",
    selectionMode: "variant-family",
    minimumVariants: 2
  },
  {
    id: "ambient/harbor-ferry@v1",
    category: "ambient",
    name: "Harbor Ferry",
    baselineBrief: "A compact twin-hull passenger ferry with a low central cabin, open foredeck, protected boarding edges, and a stable map-readable silhouette."
  },
  {
    id: "ambient/work-skiff@v1",
    category: "ambient",
    name: "Work Skiff",
    baselineBrief: "A small practical utility skiff with an open work deck, compact aft control shelter, reinforced bow, and simple rub rails."
  },
  {
    id: "ambient/rail-tram@v1",
    category: "ambient",
    name: "Rail Tram",
    baselineBrief: "A single articulated map-scale tram with two short passenger sections, a flexible center joint, visible bogies, and restrained roof hardware."
  },
  {
    id: "ambient/street-furniture-kit@v1",
    category: "ambient",
    name: "Street Furniture Kit",
    baselineBrief: "One reusable civic prop kit containing a lamp, bench, two bollards, a small waste bin, and a low planter arranged on a shared paving plate."
  }
];

const mobilityVariantPolicy = {
  cars: {
    assetId: "ambient/commuter-car@v1",
    minimumDistinctVariants: 3,
    requiredInspirations: ["1994 Wrangler", "Honda Civic - year/body style pending", "2018 WRX"],
    rule: "Use class-level silhouette and proportion cues only; omit branding and exact production trade dress."
  },
  buses: {
    assetId: "ambient/city-shuttle@v1",
    minimumDistinctVariants: 2,
    requiredRoles: ["short low-floor shuttle", "longer single-body city bus"]
  },
  boats: {
    assetIds: ["ambient/cargo-boat@v1", "ambient/harbor-ferry@v1", "ambient/work-skiff@v1"],
    rule: "Treat the three existing hull classes as one placement pool. Add a second superstructure variant only for any class repeated frequently enough to expose duplication."
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function slugFromId(id) {
  return id.replace(/@v\d+$/, "").replace("/", "-");
}

function folderFor(entry) {
  if (iterationFolders.has(entry.id)) return iterationFolders.get(entry.id);
  return `${slugFromId(entry.id)}-r1`;
}

function primaryRequest(prompt) {
  return (prompt.match(/^Primary request:\s*(.+)$/m) || [])[1] || null;
}

const artMap = await fs.readFile(path.join(careerWorldRoot, "art-reference-map.html"), "utf8");
const tableNames = new Map([...artMap.matchAll(
  /<span class="asset-name">([^<]+)<\/span><code class="asset-id">([^<]+)<\/code>/g
)].map(match => [match[2], match[1]]));

const canonicalEntries = [];
for (const fileName of ["art-batch-a.json", "art-batch-b.json", "art-batch-c.json"]) {
  const packet = JSON.parse(await fs.readFile(path.join(briefRoot, fileName), "utf8"));
  for (const asset of packet.assets) {
    if (asset.category === "world") continue;
    canonicalEntries.push({
      id: asset.id,
      category: asset.category,
      name: tableNames.get(asset.id) || displayNameOverrides.get(asset.id) || asset.id,
      baselineBrief: primaryRequest(asset.full_prompt),
      sourceBrief: path.relative(repoRoot, path.join(briefRoot, fileName)).replaceAll("\\", "/")
    });
  }
}

const entries = [...canonicalEntries, ...expansionAssets].sort((a, b) => {
  const categoryOrder = { city: 0, project: 1, skill: 2, ambient: 3 };
  return categoryOrder[a.category] - categoryOrder[b.category] || a.name.localeCompare(b.name);
});

for (const entry of entries) {
  entry.folder = folderFor(entry);
  const directory = path.join(tournamentRoot, entry.folder);
  let fileNames = [];
  try {
    fileNames = await fs.readdir(directory);
  } catch {}
  entry.imageCount = fileNames.filter(fileName => /\.png$/i.test(fileName)).length;
  entry.hasJsonManifest = fileNames.includes("tournament-set.json");
  entry.hasScriptManifest = fileNames.includes("tournament-set.js");
  entry.hasPromptRecord = fileNames.includes("concept-set.md");
  entry.exclusionReason = excludedAssetReasons.get(entry.id) || null;
  entry.variantKitPolicy = variantKitPolicies.get(entry.id) || null;
  entry.status = entry.exclusionReason
    ? "excluded"
    : entry.variantKitPolicy
      ? "variant-kit"
      : entry.imageCount === 10 && entry.hasJsonManifest && entry.hasScriptManifest && entry.hasPromptRecord
        ? "ready"
        : entry.imageCount > 0 ? "in-progress" : "queued";
  entry.manifestPath = `concept-tournaments/${entry.folder}/tournament-set.js`;
  entry.route = `../concept-tournament.html?set=concept-tournaments/${entry.folder}/tournament-set.js`;
}

const ledger = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  setCount: entries.length,
  activeSetCount: entries.filter(entry => entry.status !== "excluded").length,
  excludedSetCount: entries.filter(entry => entry.status === "excluded").length,
  reviewSetCount: entries.filter(entry => entry.status === "ready").length,
  variantKitSetCount: entries.filter(entry => entry.status === "variant-kit").length,
  preparedSetCount: entries.filter(entry => entry.status === "ready" || entry.status === "variant-kit").length,
  requestedImageCount: entries.filter(entry => entry.status !== "excluded").length * 10,
  mobilityVariantPolicy,
  readySetCount: entries.filter(entry => entry.status === "ready").length,
  readyImageCount: entries.filter(entry => entry.status === "ready" || entry.status === "variant-kit").reduce((sum, entry) => sum + entry.imageCount, 0),
  categories: Object.fromEntries(["city", "project", "skill", "ambient"].map(category => [
    category,
    entries.filter(entry => entry.category === category && entry.status !== "excluded").length
  ])),
  entries
};

await fs.writeFile(
  path.join(tournamentRoot, "tournament-production-ledger.json"),
  `${JSON.stringify(ledger, null, 2)}\n`,
  "utf8"
);

const catalog = {
  schemaVersion: 1,
  generatedAt: ledger.generatedAt,
  entries: entries.map(entry => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    folder: entry.folder,
    manifestPath: entry.manifestPath,
    status: entry.status,
    imageCount: entry.imageCount,
    exclusionReason: entry.exclusionReason,
    variantKitPolicy: entry.variantKitPolicy
  }))
};
await fs.writeFile(
  path.join(tournamentRoot, "tournament-catalog.js"),
  `window.__CONCEPT_TOURNAMENT_CATALOG__ = ${JSON.stringify(catalog, null, 2)};\n`,
  "utf8"
);

const rows = entries.map(entry => `
          <tr data-status="${entry.status}" data-category="${entry.category}">
            <td><span class="kind">${escapeHtml(entry.category)}</span></td>
            <td><strong>${escapeHtml(entry.name)}</strong><code>${escapeHtml(entry.id)}</code></td>
            <td><span class="status ${entry.status}">${entry.status}</span></td>
            <td>${entry.imageCount} / 10</td>
            <td>${entry.status === "ready" ? `<a href="${escapeHtml(entry.route)}">Open tournament</a>` : "—"}</td>
            <td>${entry.exclusionReason
              ? escapeHtml(entry.exclusionReason)
              : entry.variantKitPolicy
                ? `${escapeHtml(entry.variantKitPolicy.reason)} Minimum ${entry.variantKitPolicy.minimumVariants} variants.`
                : entry.hasPromptRecord ? `<a href="${escapeHtml(`${entry.folder}/concept-set.md`)}">Research & prompts</a>` : "—"}</td>
          </tr>`).join("");

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Career World Concept Tournaments</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #080b10; color: #f0eee7; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1280px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 48px); }
    p { color: #aab4c0; }
    .metrics { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
    .metric { min-width: 150px; border: 1px solid #283446; border-radius: 10px; padding: 14px 16px; background: #0d1219; }
    .metric strong { display: block; font-size: 24px; }
    .metric span { color: #8f9baa; font-size: 13px; }
    .table-wrap { overflow-x: auto; border: 1px solid #283446; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; background: #0d1219; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #202a38; }
    th { color: #8ce8f8; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    code { display: block; margin-top: 4px; color: #7f8b99; font-size: 11px; }
    a { color: #8ce8f8; }
    .kind { color: #aab4c0; text-transform: uppercase; font-size: 11px; letter-spacing: .08em; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; }
    .status.ready { color: #b8f5c8; background: #173322; }
    .status.in-progress { color: #ffe4a3; background: #3a2d11; }
    .status.queued { color: #9aa6b4; background: #202833; }
    .status.excluded { color: #d8b4b4; background: #382020; }
    .status.variant-kit { color: #b6d9ef; background: #183047; }
  </style>
</head>
<body>
  <main>
    <h1>Career World Concept Tournaments</h1>
    <p>Ten researched grayscale isometric concepts per table or living-map asset. Ready sets open directly in the generalized bracket.</p>
    <p><a href="../art-reference-map.html">Art reference map</a> · <a href="../concept-tournament.html">Blank tournament</a></p>
    <section class="metrics" aria-label="Production metrics">
      <div class="metric"><strong>${ledger.preparedSetCount} / ${ledger.activeSetCount}</strong><span>active sets prepared</span></div>
      <div class="metric"><strong>${ledger.readyImageCount} / ${ledger.requestedImageCount}</strong><span>images ready</span></div>
      <div class="metric"><strong>${ledger.reviewSetCount}</strong><span>tournament sets</span></div>
      <div class="metric"><strong>${ledger.variantKitSetCount}</strong><span>production variant kits</span></div>
      <div class="metric"><strong>${ledger.excludedSetCount}</strong><span>sets excluded</span></div>
      <div class="metric"><strong>${ledger.categories.city}</strong><span>cities</span></div>
      <div class="metric"><strong>${ledger.categories.project}</strong><span>projects</span></div>
      <div class="metric"><strong>${ledger.categories.skill}</strong><span>skills</span></div>
      <div class="metric"><strong>${ledger.categories.ambient}</strong><span>ambient / mobility</span></div>
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Kind</th><th>Asset</th><th>Status</th><th>Images</th><th>Bracket</th><th>Notes</th></tr></thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>`;

await fs.writeFile(path.join(tournamentRoot, "index.html"), indexHtml, "utf8");
console.log(`sets=${ledger.setCount} review=${ledger.reviewSetCount} kits=${ledger.variantKitSetCount} excluded=${ledger.excludedSetCount} images=${ledger.readyImageCount}/${ledger.requestedImageCount}`);
