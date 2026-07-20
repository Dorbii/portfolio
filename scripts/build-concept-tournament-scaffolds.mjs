import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tournamentRoot = path.join(repoRoot, "design", "career-world", "concept-tournaments");
const ledgerPath = path.join(tournamentRoot, "tournament-production-ledger.json");
const profilesPath = path.join(tournamentRoot, "domain-profiles.json");

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const archetypes = {
  project: [
    ["Canonical Amplification", "canonical-amplification", "refine and amplify the accepted baseline geometry while preserving its defining silhouette", "The accepted identity is tested at its most resolved supporting-landmark scale."],
    ["Process Spine", "process-spine", "recompose the landmark along a clear sequential service spine with repeated but unequal chambers", "A visible spatial sequence makes the project's process legible without arrows or diagrams."],
    ["Exchange Bridge", "exchange-bridge", "divide the major functions into unequal connected masses joined by one inhabited structural bridge", "A physical bridge tests whether handoff and exchange should dominate the identity."],
    ["Checkpoint Court", "checkpoint-court", "organize the building around a protected validation court with layered thresholds and one decisive exit", "A central court makes review, validation, or adjudication the primary metaphor."],
    ["Terraced Escalation", "terraced-escalation", "step the landmark upward through three or four connected terraces toward one compact focus", "Terraced hierarchy expresses staged progress and increasing commitment."],
    ["Modular Batch", "modular-batch", "build the landmark from repeatable unequal modules locked to one continuous service base", "Repeatable modules test batch, scale, and replaceability without detached pieces."],
    ["Guarded Recovery", "guarded-recovery", "place a protected core inside redundant connected routes with one visibly joined recovery annex", "Guardrails and recovery become architectural without implying an unverified implementation."],
    ["Asymmetric Landmark", "asymmetric-landmark", "concentrate height and mass off-center to create one singular project-scale skyline", "A deliberately asymmetric silhouette tests recognition at map scale."],
    ["Compact Deployment", "compact-deployment", "compress the domain into the smallest dense, coherent project building that retains the accepted identity", "Compression tests which visual cues are essential rather than merely decorative."],
    ["Domain Synthesis", "domain-synthesis", "balance the strongest baseline, process, validation, exchange, and recovery cues in one resolved composition", "The synthesis tests a mature all-around project identity without becoming a city capital."]
  ],
  skill: [
    ["Canonical Instrument", "canonical-instrument", "refine the accepted baseline into a precise compact technical instrument building", "The accepted skill identity is tested in its clearest production form."],
    ["Core Mechanism", "core-mechanism", "make the skill's defining mechanism the central architectural mass", "One unmistakable mechanism carries the identity."],
    ["Flow Spine", "flow-spine", "organize inputs, work, and outputs along one connected linear spine", "A legible flow tests the skill as a transformation process."],
    ["Interface Bridge", "interface-bridge", "join two unequal functional masses through one explicit inhabited interface bridge", "The skill is expressed as a reliable boundary between systems."],
    ["Layered System", "layered-system", "stack several connected layers with visibly different responsibilities", "Layering tests separation of concerns and system depth."],
    ["Modular Field", "modular-field", "repeat small interoperable units on one shared base with a clear coordinating core", "Modularity and composition become the identity."],
    ["Verified Core", "verified-core", "protect a compact central chamber behind explicit gates, checks, or controlled thresholds", "Correctness and validation dominate the architectural metaphor."],
    ["Scale Engine", "scale-engine", "extend the building through repeated service bays and resilient parallel paths", "Performance and scale are expressed through structure, not speed lines."],
    ["Compact Primitive", "compact-primitive", "reduce the skill to a minimal but complete map-readable technical building", "The primitive tests the smallest recognizable expression of the skill."],
    ["Skill Synthesis", "skill-synthesis", "combine mechanism, flow, interface, validation, and scale in one balanced supporting building", "The synthesis tests a complete skill identity while remaining subordinate to projects and cities."]
  ],
  ambient: [
    ["Canonical Production", "canonical-production", "refine the accepted baseline into its clearest production-ready map prop", "The accepted identity is tested in its most resolved reusable form."],
    ["Silhouette Contrast", "silhouette-contrast", "push the outer contour and negative spaces for instant recognition at map scale", "A distinct silhouette tests recognition without labels or color."],
    ["Weighted Asymmetry", "weighted-asymmetry", "shift the dominant mass off-center while preserving the asset's practical balance", "Controlled asymmetry creates identity without sacrificing function."],
    ["Functional Exposure", "functional-exposure", "make the asset's defining working parts structurally legible without diagrams", "Exposed function tests whether the object reads through construction rather than decoration."],
    ["Rugged Structure", "rugged-structure", "strengthen load-bearing edges, joints, guards, and contact points", "Rugged construction tests a durable working-world interpretation."],
    ["Modular Rhythm", "modular-rhythm", "organize repeated functional elements into a clear unequal rhythm on one coherent object or shared base", "A modular cadence tests reuse and system belonging."],
    ["Low Profile", "low-profile", "compress height and emphasize a long stable footprint while retaining every defining feature", "A low profile tests legibility in dense map placement."],
    ["Vertical Accent", "vertical-accent", "give one legitimate functional element a taller focal role while keeping the overall prop subordinate to buildings", "A vertical accent tests landmark readability without turning the prop into architecture."],
    ["Compact Primitive", "compact-primitive", "reduce the asset to the smallest complete form that preserves its exact identity and component count", "The primitive reveals which cues are essential."],
    ["Ambient Synthesis", "ambient-synthesis", "balance silhouette, function, construction, modular detail, and map-scale restraint in one production-ready prop", "The synthesis tests the complete ambient identity for repeated world use."]
  ]
};

function categoryBase(profile, ledgerEntry) {
  if (profile.category === "project") {
    return `Create one production concept image for the Career World project landmark "${profile.name}". This is a supporting project building: highly detailed and distinctive, but clearly smaller and less ceremonial than an employer city capital. Research-grounded domain summary: ${profile.domainSummary} Accepted baseline identity: ${ledgerEntry.baselineBrief}`;
  }
  if (profile.category === "ambient") {
    return `Create one production concept image for the Career World ambient map asset "${profile.name}". This is a reusable, map-scale ${profile.assetClass || "prop"}, never a building or scene. It must remain subordinate to skills, projects, and city capitals while still being mechanically specific and instantly readable. Domain summary: ${profile.domainSummary} Accepted baseline identity: ${ledgerEntry.baselineBrief}`;
  }
  return `Create one production concept image for the Career World skill building "${profile.name}". This is a compact supporting skill structure: highly detailed and distinctive, smaller than project landmarks and much smaller than city capitals. Research-grounded domain summary: ${profile.domainSummary} Accepted baseline identity: ${ledgerEntry.baselineBrief}`;
}

function sharedVisualContract() {
  return "One isolated complete asset in exact orthographic 2.5D isometric perspective, viewed from above at a consistent three-quarter angle. Grayscale only: neutral black, white, and gray with no color tint. Dark near-black technical drafting background with a faint isometric grid. Restrained architectural wireframe line art, matte low-value faces, crisp traced edges, fine parallel construction lines, controlled dense detail, no glow. One image only: no second panel, thumbnails, inset, silhouette swatch, contact sheet, before/after, or detached props. Center the whole coherent structure with generous margin. All roofs, stairs, bridges, annexes, and masses must be buildable and physically connected. No words, letters, numbers, signage, logos, brand marks, UI, charts, arrows, people, vehicles, landscapes, photorealism, fantasy, or real-world facility resemblance.";
}

function ambientVisualContract() {
  return "One isolated complete map prop in exact orthographic 2.5D isometric perspective, viewed from above at a consistent three-quarter angle. Grayscale only: neutral black, white, and gray with no color tint. Dark near-black technical drafting background with a faint isometric grid. Restrained wireframe product line art, matte low-value faces, crisp traced edges, fine construction lines, controlled functional detail, no glow. One image only: no second panel, thumbnails, inset, silhouette swatch, contact sheet, exploded view, or alternate angle. Center the entire prop with generous margin and show it completely inside frame. Preserve the requested object and component count exactly. Any kit or cluster must sit on one compact shared base; no detached pieces. No buildings, city blocks, roads, rails, tracks, water, shoreline scene, landscape, people, passengers, cargo piles, words, letters, numbers, signage, logos, brand marks, UI, charts, arrows, photorealism, fantasy, or real-world product copy.";
}

const [ledger, profileDocument] = await Promise.all([
  fs.readFile(ledgerPath, "utf8").then(JSON.parse),
  fs.readFile(profilesPath, "utf8").then(JSON.parse)
]);
const ledgerById = new Map(ledger.entries.map((entry) => [entry.id, entry]));

for (const profile of profileDocument.profiles) {
  const ledgerEntry = ledgerById.get(profile.id);
  if (!ledgerEntry) throw new Error(`Profile ${profile.id} is missing from the production ledger`);
  if (!archetypes[profile.category]) throw new Error(`Unsupported scaffold category ${profile.category}`);
  if (!Array.isArray(profile.qualities) || profile.qualities.length < 5) {
    throw new Error(`Profile ${profile.id} must define at least five research-grounded qualities`);
  }

  const folder = path.join(tournamentRoot, ledgerEntry.folder);
  await fs.mkdir(folder, { recursive: true });
  const prefix = ledgerEntry.folder;
  const variants = archetypes[profile.category];
  const assets = variants.map(([label, variantSlug, direction, thesis], index) => {
    const ordinal = String(index + 1).padStart(2, "0");
    const quality = profile.qualities[index % profile.qualities.length];
    return {
      id: `${prefix}-${ordinal}-${variantSlug}`,
      name: `${profile.name} · ${label}`,
      src: `${prefix}-${ordinal}-${variantSlug}.png`,
      role: index === variants.length - 1 ? "synthesis" : "broad-concept",
      controlledVariable: `${direction}; emphasize ${quality}`,
      parentConcept: `${profile.name} research profile`,
      tags: [profile.category, variantSlug, slug(quality), ...(profile.tags || [])],
      thesis: `${thesis} This version emphasizes ${quality}.`,
      businessCue: quality
    };
  });

  const manifest = {
    schemaVersion: 1,
    id: `${prefix}-2026-07-18`,
    name: `${profile.name} · Round 1`,
    sourcePath: `design/career-world/concept-tournaments/${ledgerEntry.folder}`,
    domainSummary: profile.domainSummary,
    evidenceBoundary: profile.evidenceBoundary,
    researchSources: profile.researchSources,
    assets
  };

  const prompts = assets.map((asset, index) => {
    const [label, , direction] = variants[index];
    const quality = profile.qualities[index % profile.qualities.length];
    const correction = profile.promptCorrections?.[String(index + 1)];
    return {
      ordinal: index + 1,
      assetId: asset.id,
      output: asset.src,
      concept: label,
      quality,
      prompt: `${categoryBase(profile, ledgerEntry)}\n\nExploration ${index + 1} — ${label}: ${direction}. Specifically emphasize this researched quality: ${quality}. ${profile.evidenceBoundary}${profile.visualConstraint ? `\n\n${profile.visualConstraint}` : ""}${correction ? `\n\n${correction}` : ""}\n\n${profile.category === "ambient" ? ambientVisualContract() : sharedVisualContract()}`
    };
  });

  const sourceRows = profile.researchSources.map((source) => {
    const target = source.url || `../../../../${source.path}`;
    return `- [${source.title}](${target}) — ${source.use}`;
  }).join("\n");
  const conceptRows = prompts.map((prompt) => `| ${String(prompt.ordinal).padStart(2, "0")} | ${prompt.concept} | ${prompt.quality} |`).join("\n");
  const markdown = `# ${profile.name} · Round 1\n\n## Research basis\n\n${profile.domainSummary}\n\n${sourceRows}\n\nEvidence boundary: ${profile.evidenceBoundary}\n\n## Generation method\n\n- Generator: built-in OpenAI image generation\n- Mode: fresh generation with no raster input\n- Output target: one complete 1536 × 1024 concept per PNG\n- Projection: orthographic true-isometric, approximately 225° azimuth and 35.264° elevation\n- Style: exact-grayscale 2.5D wireframe architecture on a dark technical-grid field\n- Hierarchy: ${profile.category === "project" ? "supporting project landmark; below cities, above skills" : profile.category === "ambient" ? "neutral repeatable map prop; below all architectural assets" : "compact supporting skill building; below projects and cities"}\n- Postprocess: exact RGB grayscale and non-destructive fit to the standard canvas\n\n## Concept hypotheses\n\n| # | Exploration | Research cue emphasized |\n|---:|---|---|\n${conceptRows}\n\n## Tournament route\n\n\`concept-tournament.html?set=concept-tournaments/${ledgerEntry.folder}/tournament-set.js\`\n`;

  await Promise.all([
    fs.writeFile(path.join(folder, "tournament-set.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(folder, "prompt-set.json"), `${JSON.stringify({ schemaVersion: 1, profileId: profile.id, prompts }, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(folder, "concept-set.md"), markdown, "utf8")
  ]);
  console.log(`${profile.id} -> ${path.relative(repoRoot, folder)}`);
}
