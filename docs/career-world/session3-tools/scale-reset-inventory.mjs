// The scale reset, enumerated before it is applied.
//
// `scale-reset-derive.mjs` settled WHAT the reset is (plane pixels double,
// m/px pinned at 0.4503, Option B). This script answers the question that
// stopped the step-2 attempt: WHICH values carry a world-normalized meaning,
// and what does each become. Step 2 failed by editing until the app stopped
// throwing; this inventory is what it should have started from.
//
// Two corrections to STATE's "5 manifests / 5 literals / ~17 constants":
//
//  * The manifest count is a floor, not the scope. Five manifests hold a COPY
//    OF THE ENVELOPE SPAN; several more hold world-registered CONTENT that
//    sits inside the envelope and must be re-derived with it or it tears free
//    of D05. Kaizen is the clearest case: its plate is registered in world
//    coordinates independently of the envelope, and left alone it ends up
//    outside the halved capital entirely.
//
//  * Ownership, not a rectangle, is the classifier. An early pass here tested
//    "is this point inside the envelope rectangle" and split coherent sets in
//    half (3 of 5 rural-outskirts anchors sit just outside) while sweeping in
//    66 world-wide stream tiles that merely overlap it. Same lesson STATE
//    already records for colour classifiers: coordinates describe pixels,
//    ownership describes objects.
//
//   node docs/career-world/session3-tools/scale-reset-inventory.mjs
import fs from "node:fs";

const R = "public/career-world/";
const S = "features/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const T = (p) => fs.readFileSync(p, "utf8");

const ENV_ORIGIN = [0.125, 0];
const ENV_SPAN = [0.25, 1 / 3];
const K = 0.5;                                   // the halving

const n = (v) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6))));
const P = (p) => `[${n(p[0])}, ${n(p[1])}]`;
// Content inside the capital keeps its GROUND place only if re-derived about
// the envelope origin, which does not move.
const point = (p) => [
  ENV_ORIGIN[0] + (p[0] - ENV_ORIGIN[0]) * K,
  ENV_ORIGIN[1] + (p[1] - ENV_ORIGIN[1]) * K,
];
const span = (s) => [s[0] * K, s[1] * K];

let rows = 0;
const row = (a, b, c) => { rows++; console.log(`    ${a}\n      ${b}  ->  ${c}`); };

console.log("SCALE RESET - INVENTORY (nothing applied)\n");
console.log(`plane        1672 x 941  ->  3344 x 1882      (m/px pinned at 0.4503)`);
console.log(`envelope     origin ${P(ENV_ORIGIN)} span ${P(ENV_SPAN)}`);
console.log(`             origin ${P(ENV_ORIGIN)} span ${P(span(ENV_SPAN))}   <- origin does NOT move\n`);

// ============================================================ A. registration
console.log("== A. ENVELOPE SPAN COPIES - the five STATE counted (arithmetic) ==");
for (const [file, trail] of [
  ["layers/terrain/authority/manifests/world-territories-r4.json", "territories[ninjaone].development.capitalEnvelope.span"],
  ["capitals/ninjaone/manifests/city-package-authority-r4.json", "registration.worldSpan"],
  ["capitals/ninjaone/environment/manifests/environment-proof-r1.json", "registration.boundingWorldView.span"],
  ["capitals/ninjaone/environment/manifests/foliage-native-r4.json", "registration.boundingWorldView.span"],
  ["capitals/ninjaone/environment/manifests/inland-water-r1.json", "registration.worldSpan"],
]) {
  if (!fs.existsSync(R + file)) { console.log(`    MISSING ${file}`); continue; }
  row(`${file}\n      .${trail}`, P(ENV_SPAN), P(span(ENV_SPAN)));
}

// ================================================ B. content inside the capital
// Declared by OWNERSHIP. Each entry names what the values mean so the
// classification can be argued with, not just re-run.
console.log("\n== B. WORLD-REGISTERED CONTENT INSIDE THE CAPITAL (re-derived, not halved) ==");
console.log("   Missed entirely by the step-2 attempt. Left alone, these tear free of D05.\n");

const contentSets = [
  {
    file: "cities/kaizen-agent/manifests/base-runtime-r1.json",
    why: "Kaizen is a capital district by owner acceptance; its plate is registered in WORLD coords, not envelope coords",
    read: (d) => [
      ["plate.anchor", "point", d.plate.anchor],
      ["plate.span", "span", d.plate.span],
    ],
  },
  {
    file: "layers/structures/manifests/project-structures-r1.json",
    why: "project-kaizen-agent sits inside the envelope; Metrics-Service and Vendy do not and keep their fractions",
    read: (d) => d.nodes.filter((x) => x.id === "project-kaizen-agent")
      .map((x) => [`nodes[${x.id}].territoryAnchor`, "point", x.territoryAnchor]),
  },
  {
    file: "layers/structures/manifests/skill-structures-r1.json",
    why: "all three instances are project-kaizen-agent-*",
    read: (d) => d.instances.map((x) => [`instances[${x.id}].territoryAnchor`, "point", x.territoryAnchor]),
  },
  {
    file: "layers/terrain/authority/manifests/terrain-site-tiles-r2.json",
    why: "one of five capital site tiles is Kaizen's; the other four are placeholder capitals that keep their fractions",
    read: (d) => d.tiles.filter((t) => t.id.startsWith("project-kaizen"))
      .flatMap((t) => [
        [`tiles[${t.id}].worldBounds.origin`, "point", t.worldBounds.origin],
        [`tiles[${t.id}].worldBounds.span`, "span", t.worldBounds.span],
      ]),
  },
  {
    file: "layers/terrain/authority/manifests/terrain-dem-r4.json",
    why: "shelves 5-8 are ninjaone capital shelves; shelf 0 (ninjaone-development-basin) is TERRITORY content outside the envelope and keeps its fraction",
    read: (d) => d.developmentShelves
      .filter((s) => s.id.startsWith("ninjaone-") && s.id !== "ninjaone-development-basin")
      .flatMap((s) => [
        [`developmentShelves[${s.id}].center`, "point", s.center],
        [`developmentShelves[${s.id}].radius`, "scalar", s.radius],
      ]),
  },
  {
    file: "layers/infrastructure/manifests/ninjaone-project-towns-r1.json",
    why: "towns[0] is kaizen-agent-foundry-district - a district of the capital",
    read: (d) => d.towns.flatMap((t) =>
      (t.townPlan?.entrances ?? []).map((e, i) => [`towns[${t.id}].entrances[${i}].point`, "point", e.point])),
  },
  {
    file: "layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json",
    why: "the capital's rural fringe - all five are ninjaone-*, and three sit just OUTSIDE the rectangle. Ownership classifies them, not coordinates",
    read: (d) => d.scenery.map((s) => [`scenery[${s.id}].anchor`, "point", s.anchor]),
  },
  {
    file: "capitals/ninjaone/environment/manifests/seam-integration-native-r2.json",
    why: "selector checkpoint cameras framing the capital environment",
    read: (d) => Object.entries(d.selectorCheckpoints ?? {}).flatMap(([k, v]) =>
      v.camera ? [[`selectorCheckpoints.${k}.camera.origin`, "point", v.camera.origin],
        [`selectorCheckpoints.${k}.camera.span`, "span", v.camera.span]] : []),
  },
];

for (const set of contentSets) {
  if (!fs.existsSync(R + set.file)) { console.log(`  MISSING ${set.file}`); continue; }
  let entries;
  try { entries = set.read(J(R + set.file)); } catch (e) { console.log(`  ERROR ${set.file}: ${e.message}`); continue; }
  console.log(`  ${set.file}`);
  console.log(`    why: ${set.why}`);
  for (const [trail, kind, value] of entries) {
    if (value === undefined) continue;
    const after = kind === "point" ? point(value) : kind === "span" ? span(value) : value * K;
    row(`.${trail}`,
      kind === "scalar" ? n(value) : P(value),
      kind === "scalar" ? n(after) : P(after));
  }
}

console.log("\n  NOT in this class, and it matters:");
console.log("    terrain-stream-runtime-r4.json / terrain-stream-tiles-r3.json");
console.log("      214 tiles each, a 23x16 grid spanning x 0.042-0.958, y 0-1.0 - they tile");
console.log("      the WHOLE plane, which is still [0,1]. 33 of them merely overlap the");
console.log("      envelope. Re-deriving those would tear the grid. They also die at step 7.");
console.log("    capitals/ninjaone/manifests/city-master-node-layout-r3.json");
console.log("      master-artboard space (1448x1086), which Option B does not change.");
console.log("    capitals/ninjaone/city-v2/composition/d05-placements-r3.json / -r4.json");
console.log("      composition-time artifacts; zero references from features/ or tests/.");

// ==================================================== C. hardcoded TS literals
console.log("\n== C. HARDCODED SPAN LITERALS IN TS (arithmetic) ==");
const literals = [
  ["layers/inland-water/geometry.ts", "regionSpan", "[0.25, 1/3] -> [0.125, 1/6]"],
  ["layers/inland-water/rendering/NinjaOneInlandWaterRenderer.ts", "REGION_SPAN", "[0.25, 1/3] -> [0.125, 1/6]"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts", "ENVIRONMENT_WORLD_SPAN", "[0.25, 1/3] -> [0.125, 1/6]"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts", 'join(",") !== `0.25,${1 / 3}`', "guard string -> `0.125,${1 / 6}`"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentNativeDetail.ts", "ENVIRONMENT_WORLD_SPAN", "[0.25, 1/3] -> [0.125, 1/6]"],
  ["layers/city/model/ninjaOneCapitalD05Concept.ts", "CAPITAL_ENVELOPE_WORLD_SPAN_X", "0.25 -> 0.125  (comment calls it 'immutable at 0.25' - retire that wording)"],
  ["layers/city/model/ninjaOneCapitalCityLayer.ts", "NINJAONE_CAPITAL_CITY_LAYER_CAMERA", "origin [1/12, 0] -> [0.104167, 0], span [1/3, 1/3] -> [1/6, 1/6]"],
  ["layers/terrain/model/ninjaOneEnvironmentProof.ts", "NINJAONE_ENVIRONMENT_CAMERA", "origin [0.095, 0] -> [0.11, 0], span [0.36, 0.36] -> [0.18, 0.18]"],
];
for (const [file, needle, change] of literals) {
  const body = T(S + file);
  const key = needle.includes("join(") ? "boundingWorldView.span.join" : needle.replace(/`/g, "").split("$")[0];
  const idx = body.split("\n").findIndex((l) => l.includes(key));
  rows++;
  console.log(`    ${file}:${idx + 1}  ${needle}`);
  console.log(`      ${body.includes(key) ? change : "NEEDLE NOT FOUND - inventory is stale"}`);
}

// =============================================== D. camera / LoD thresholds
const policy = T(S + "shared/lod/policy.ts");
const g = (name) => {
  const m = policy.match(new RegExp(`${name.replace(".", "\\.[\\s\\S]*?")}:\\s*([0-9.]+)`));
  return m ? Number(m[1]) : null;
};
console.log("\n== D. NORMALIZED CAMERA / LoD THRESHOLDS (arithmetic - see the proof below) ==");
const cams = [
  ["shared/camera.ts", "CAMERA_MINIMUM_SPAN", 0.04],
  ["shared/lod/policy.ts", "POLICY_CAMERA_MINIMUM_SPAN (typed mirror)", 0.04],
  ["shared/lod/policy.ts", "territoryAssetPreloadSpan", g("territoryAssetPreloadSpan")],
  ["shared/lod/policy.ts", "capitalAssetPreloadSpan", g("capitalAssetPreloadSpan")],
  ["shared/lod/policy.ts", "siteAssetPreloadSpan", g("siteAssetPreloadSpan")],
  ["shared/lod/policy.ts", "closeAssetPreloadSpan", g("closeAssetPreloadSpan")],
  ["shared/lod/policy.ts", "tierMaximumSpan.territory", 0.78],
  ["shared/lod/policy.ts", "tierMaximumSpan.capital", 0.34],
  ["shared/lod/policy.ts", "tierMaximumSpan.site", 0.1],
  ["shared/lod/policy.ts", "tierMaximumSpan.close", 0.075],
  ["shared/lod/policy.ts", "worldToTerritory.startSpan", 0.86],
  ["shared/lod/policy.ts", "worldToTerritory.endSpan", 0.64],
  ["shared/lod/policy.ts", "territoryToCapital.startSpan", 0.38],
  ["shared/lod/policy.ts", "territoryToCapital.endSpan", 0.27],
  ["shared/lod/policy.ts", "capitalToSite.startSpan", 0.15],
  ["shared/lod/policy.ts", "capitalToSite.endSpan", 0.1],
  ["shared/lod/policy.ts", "siteToClose.startSpan", 0.09],
  ["shared/lod/policy.ts", "siteToClose.endSpan", 0.075],
  ["city/model/...Representations.ts", "closeAssetPreloadSpan", 0.12],
  ["city/model/...D05Concept.ts", "D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN", 0.0825],
  ["foliage-native-r4.json", "eligibility.maxDetailEnterSpan", 0.12],
  ["foliage-native-r4.json", "eligibility.maxDetailRetainSpan", 0.14],
];
for (const [where, name, v] of cams) {
  rows++;
  console.log(`    ${String(v).padStart(7)} -> ${String(v * K).padEnd(8)} ${name}   (${where})`);
}
console.log(`          1 -> 1        tierMaximumSpan.world   (SENTINEL - keep)`);
console.log(`            it means "everything coarser than territory", and normalizeCameraView`);
console.log(`            clamps span to <= 1. Halving it to 0.5 is behaviourally IDENTICAL`);
console.log(`            (resolveDetailState falls back to the last tier, world), so keeping`);
console.log(`            1 is a clarity call, not a risk.`);

console.log("\n== E. NOT TOUCHED - dimensionless despite span-like names ==");
console.log("    eligibility.viewportOverscanRatio = 0.25   (foliage-native-r4.json)");
console.log("      multiplies view.span by (1 + ratio*2) - a ratio OF a span, not a span.");
console.log("      STATE's '~17 normalized span constants' names this one; it must NOT halve.");
console.log("    renderScale.*                             device-pixel gains");
console.log("    DESTINATION_MARKER_HANDOFF.*              visibility fractions");
console.log("    MIN/MAX_FOOTPRINT_SPAN (ruralOutskirts)   artboard-relative, not world");
console.log("    MASTER_ARTBOARD_WIDTH = 1448              Option B keeps the D05 master");

// ================================================================= the proof
console.log("\n== PROOF: halving the thresholds PRESERVES current behaviour exactly ==");
console.log("   Screen position of a feature = (n - camera.origin) / camera.span.");
console.log("   For capital content, n' = o + (n - o)/2 and a camera framing it has");
console.log("   origin' = o + (origin - o)/2, span' = span/2. Then");
console.log("     (n' - origin')/span' = [(n-o)/2 - (origin-o)/2] / (span/2) = (n - origin)/span.");
console.log("   Identical. And every tier test compares max(camera.span) against a constant,");
console.log("   so halving both sides leaves every tier decision unchanged.\n");

const samples = [
  ["Kaizen plate anchor", J(R + "cities/kaizen-agent/manifests/base-runtime-r1.json").plate.anchor],
  ["D05 envelope centre", [ENV_ORIGIN[0] + ENV_SPAN[0] / 2, ENV_ORIGIN[1] + ENV_SPAN[1] / 2]],
  ["a Kaizen skill anchor", J(R + "layers/structures/manifests/skill-structures-r1.json").instances[0].territoryAnchor],
];
const cameras = [
  ["capital tier entry", [0.125, 0], [0.34, 0.34]],
  ["site tier entry", [0.2, 0.08], [0.1, 0.1]],
];
let worst = 0;
for (const [cn, co, cs] of cameras) {
  for (const [sn, p] of samples) {
    const before = [(p[0] - co[0]) / cs[0], (p[1] - co[1]) / cs[1]];
    const co2 = point(co), cs2 = span(cs), p2 = point(p);
    const after = [(p2[0] - co2[0]) / cs2[0], (p2[1] - co2[1]) / cs2[1]];
    const d = Math.max(Math.abs(before[0] - after[0]), Math.abs(before[1] - after[1]));
    worst = Math.max(worst, d);
    console.log(`   ${cn.padEnd(20)} ${sn.padEnd(22)} screen ${P(before)} -> ${P(after)}  delta ${d.toExponential(1)}`);
  }
}
console.log(`\n   worst screen delta across the set: ${worst.toExponential(1)}  ${worst < 1e-12 ? "(identical)" : "(NOT IDENTICAL - investigate)"}`);

// The anomaly repair, measured.
console.log("\n== The anomaly repair, measured ==");
console.log("   On-screen width of a capital at the moment its tier engages:");
const terr = J(R + "layers/terrain/authority/manifests/world-territories-r4.json").territories;
for (const t of terr) {
  const e = t.development?.capitalEnvelope;
  if (!e) continue;
  const isNinja = t.id === "ninjaone" || t.id?.includes("ninjaone");
  const beforeFrac = e.span[0] / 0.34;
  const afterSpan = isNinja ? e.span[0] * K : e.span[0];
  const afterFrac = afterSpan / (0.34 * K);
  console.log(`     ${String(t.id).padEnd(22)} ${(beforeFrac * 100).toFixed(0).padStart(4)}%  ->  ${(afterFrac * 100).toFixed(0).padStart(4)}%${isNinja ? "   (only fraction that changes)" : ""}`);
}
console.log("   NinjaOne stops being the outlier: it lands exactly on Tanium, the other");
console.log("   4-project capital (74% each). The 2- and 3-project capitals stay");
console.log("   proportionally smaller, which is the intent. SCALE-RESET-APPLY's wording");
console.log("   'makes all five consistent' is too strong - they become consistent WITH");
console.log("   PROJECT COUNT, which is the anomaly that was actually worth repairing.");

console.log(`\n-- ${rows} values enumerated. Nothing applied. --`);
