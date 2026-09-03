// The scale reset, applied in one pass.
//
// Enumerated by scale-reset-inventory.mjs, ruled by the owner 2026-09-03
// (Option B: the envelope fraction is derived, D05 does not move).
//
//   node docs/career-world/session3-tools/scale-reset-apply.mjs [--dry]
//
// The transform, and the reason there are two of them:
//
//   plane            1672 x 941 -> 3344 x 1882      (m/px pinned at 0.4503)
//   envelope span    halves, so D05's GROUND is unchanged
//   capital content  p' = o + (p - o) * 0.5 about o = [0.125, 0]
//   camera spans     halve, which cancels against the content and leaves
//                    every screen position and tier decision identical
//
// TERRAIN IS NOT TOUCHED. terrain-dem-r4 (shelves, mountain ranges),
// terrain-site-tiles-r2 and the stream tilesets are the terrain layer: it is
// addressed by fraction, it does not move, and re-cropping it is step 5's job.
// The capital therefore lands on terrain that is no longer its terrain until
// step 5 registers the L2 land underneath it. That is a known consequence of
// Option B, measured by scale-reset-landmask-check.mjs, not an oversight here.
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const R = "public/career-world/";
const S = "features/career-world/";
const O = [0.125, 0];

// Halving is exact in binary floating point; the re-derivation is not, so trim
// the noise it introduces rather than writing 0.17750000000000002 to a manifest.
const trim = (v) => Math.round(v * 1e12) / 1e12;
const pt = (p) => [trim(O[0] + (p[0] - O[0]) * 0.5), trim(O[1] + (p[1] - O[1]) * 0.5)];
const sp = (s) => [s[0] * 0.5, s[1] * 0.5];

const changes = [];
// The worktree checks out CRLF. Work in LF and put the file's own ending back,
// so an edit never rewrites every line of a file as a side effect.
const readLf = (path) => {
  const raw = fs.readFileSync(path, "utf8");
  return { text: raw.replace(/\r\n/g, "\n"), crlf: raw.includes("\r\n") };
};
function writeText(path, before, after, crlf, label) {
  if (before === after) throw new Error(`no-op edit: ${label} (${path})`);
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? after.replace(/\n/g, "\r\n") : after);
}
// Targeted text replacement, for files whose formatting a JSON round-trip
// would rewrite wholesale.
function sub(path, find, replace, label, count = 1) {
  const { text, crlf } = readLf(path);
  const hits = text.split(find).length - 1;
  // Text edits are exact, so one already present is a no-op rather than an
  // error. That keeps this file a re-runnable record when a later pass adds
  // an edit to it, as the capitalAnchor one below was.
  if (hits === 0 && text.includes(replace)) { changes.push(`${path}  ${label}  (already applied)`); return; }
  if (hits !== count) throw new Error(`${path}: expected ${count} of ${JSON.stringify(find)}, found ${hits}`);
  writeText(path, text, text.replace(find, replace), crlf, label);
}
// Unlike the text edits, the JSON mutations below are arithmetic (`* 0.5`,
// re-derive), so re-running them would halve twice. Detect a completed phase 1
// from the one value that cannot be anything else and skip them.
const PHASE1_APPLIED = fs.readFileSync(S + "shared/world.ts", "utf8").includes("3344");

// Round-trip, for files that are already exactly JSON.stringify(_, null, 2).
function editJson(path, mutate, label) {
  if (PHASE1_APPLIED) { changes.push(`${path}  ${label}  (already applied)`); return; }
  const { text, crlf } = readLf(path);
  const doc = JSON.parse(text);
  if (JSON.stringify(doc, null, 2) + "\n" !== text) {
    throw new Error(`${path}: not canonical 2-space JSON; use sub() instead`);
  }
  mutate(doc);
  writeText(path, text, JSON.stringify(doc, null, 2) + "\n", crlf, label);
}

const SPAN_OLD = "[0.25, 0.3333333333333333]";
const SPAN_NEW = `[0.125, ${1 / 6}]`;                       // 0.16666666666666666

// ------------------------------------------------------- 1. the plane itself
sub(S + "shared/world.ts", "width: 1672,\n  height: 941,",
  "width: 3344,\n  height: 1882,", "WORLD_PLANE -> 3344 x 1882");

// --------------------------------------------- 2. the five envelope span copies
sub(R + "layers/terrain/authority/manifests/world-territories-r4.json",
  `"origin": [0.125, 0],\n          "span": ${SPAN_OLD}`,
  `"origin": [0.125, 0],\n          "span": ${SPAN_NEW}`,
  "ninjaone capitalEnvelope.span");
sub(R + "capitals/ninjaone/manifests/city-package-authority-r4.json",
  `"worldSpan": ${SPAN_OLD}`, `"worldSpan": ${SPAN_NEW}`, "registration.worldSpan");
// capitalAnchor sits beside the envelope in the same manifest and is capital
// content in world coordinates, so it re-derives. Missed on the first pass
// because the inventory's scanner skipped points in any file that already
// held an envelope-span copy - a self-inflicted blind spot. Left alone it
// lands outside its own halved envelope and assets.test.mjs catches it.
sub(R + "layers/terrain/authority/manifests/world-territories-r4.json",
  `"capitalAnchor": [0.295, 0.23827],`,
  `"capitalAnchor": [${pt([0.295, 0.23827])}],`, "ninjaone capitalAnchor");
for (const [file, label] of [
  ["capitals/ninjaone/environment/manifests/environment-proof-r1.json", "registration.boundingWorldView.span"],
  ["capitals/ninjaone/environment/manifests/foliage-native-r4.json", "registration.boundingWorldView.span"],
  ["capitals/ninjaone/environment/manifests/inland-water-r1.json", "registration.worldSpan"],
]) {
  editJson(R + file, (d) => {
    const reg = d.registration;
    const target = reg.boundingWorldView ?? reg;
    const key = reg.boundingWorldView ? "span" : "worldSpan";
    target[key] = [0.125, 1 / 6];
  }, label);
}

// ------------------------------------ 3. capital content, re-derived about O
// This manifest is minified onto one line, so it is edited as text.
sub(R + "cities/kaizen-agent/manifests/base-runtime-r1.json",
  `"anchor":[0.236,0.308],"span":[0.1065,0.1893]`,
  `"anchor":[${pt([0.236, 0.308])}],"span":[${sp([0.1065, 0.1893])}]`,
  "Kaizen plate anchor + span");

editJson(R + "layers/structures/manifests/project-structures-r1.json", (d) => {
  for (const node of d.nodes) {
    if (node.id !== "project-kaizen-agent") continue;
    node.territoryAnchor = pt(node.territoryAnchor);
    node.footprintSpan = sp(node.footprintSpan);
  }
}, "kaizen node anchor + footprint");

editJson(R + "layers/structures/manifests/skill-structures-r1.json", (d) => {
  for (const a of d.archetypes) a.footprintSpan = sp(a.footprintSpan);
  for (const i of d.instances) i.territoryAnchor = pt(i.territoryAnchor);
}, "8 archetype footprints + 3 instance anchors");

editJson(R + "layers/infrastructure/manifests/ninjaone-project-towns-r1.json", (d) => {
  for (const town of d.towns) {
    const plan = town.townPlan;
    for (const b of plan.blocks ?? []) b.points = b.points.map(pt);
    for (const s of plan.streets ?? []) s.waypoints = s.waypoints.map(pt);
    for (const p of plan.plazas ?? []) p.points = p.points.map(pt);
    for (const t of plan.terrainSeams ?? []) t.waypoints = t.waypoints.map(pt);
    for (const l of plan.pedestrianLoops ?? []) l.waypoints = l.waypoints.map(pt);
    for (const e of plan.entrances ?? []) e.point = pt(e.point);
  }
  // An offset is a delta, not a position: it halves rather than re-deriving.
  for (const [k, v] of Object.entries(d.townOffsets ?? {})) d.townOffsets[k] = sp(v);
}, "160 town points + offsets");

editJson(R + "layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json", (d) => {
  for (const s of [...d.scenery, ...(d.easterEggSlots ?? [])]) {
    s.anchor = pt(s.anchor);
    s.footprintSpan = sp(s.footprintSpan);
  }
}, "7 outskirt anchors + footprints");

// The Kaizen allocation is a world-normalized rect (DevelopmentOverlay draws
// it at origin * WORLD_PLANE), so it shrinks with the capital it allocates.
editJson(R + "layers/structures/manifests/ninjaone-city-allocations-r1.json", (d) => {
  for (const a of d.allocations) {
    a.bounds.origin = pt(a.bounds.origin);
    a.bounds.span = sp(a.bounds.span);
  }
}, "kaizen allocation bounds");

// These two are PINNED to DETAIL_POLICY by a fail-closed guard in
// ninjaOneCapitalCityRepresentations.ts, so they must move with it. This is
// the exact shape of guard that stopped the step-2 attempt.
editJson(R + "capitals/ninjaone/manifests/city-lod-representations-r1.json", (d) => {
  const h = d.authority.territoryRegister.canonHandoff;
  h.startsAtMaximumCameraSpan *= 0.5;      // pinned to tierMaximumSpan.capital
  h.completesAtMaximumCameraSpan *= 0.5;   // pinned to territoryToCapital.endSpan
}, "canonHandoff camera spans");

editJson(R + "capitals/ninjaone/environment/manifests/seam-integration-native-r2.json", (d) => {
  for (const cp of Object.values(d.selectorCheckpoints ?? {})) {
    if (!cp.camera) continue;
    cp.camera.origin = pt(cp.camera.origin);
    cp.camera.span = sp(cp.camera.span);
  }
}, "2 checkpoint cameras");

// ------------------------------------------------- 4. hardcoded TS literals
for (const [file, label] of [
  ["layers/inland-water/geometry.ts", "regionSpan"],
  ["layers/inland-water/rendering/NinjaOneInlandWaterRenderer.ts", "REGION_SPAN"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts", "ENVIRONMENT_WORLD_SPAN"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentNativeDetail.ts", "ENVIRONMENT_WORLD_SPAN"],
]) sub(S + file, "[0.25, 1 / 3]", "[0.125, 1 / 6]", label);

sub(S + "layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts",
  "!== `0.25,${1 / 3}`", "!== `0.125,${1 / 6}`", "foliage span guard");

sub(S + "layers/city/model/ninjaOneCapitalD05Concept.ts",
  "// The capital envelope's world span is immutable at 0.25 (world-territories-r4,\n// asserted by test) and the master artboard is 1448 wide.\nconst MASTER_ARTBOARD_WIDTH = 1448;\nconst CAPITAL_ENVELOPE_WORLD_SPAN_X = 0.25;",
  "// The capital envelope's world span is DERIVED, not immutable: it expresses\n// D05's ground footprint against the world plane, so it halved to 0.125 when\n// the plane's pixels doubled (owner ruling 2026-09-03, Option B). D05 itself\n// does not move, and the master artboard is still 1448 wide.\nconst MASTER_ARTBOARD_WIDTH = 1448;\nconst CAPITAL_ENVELOPE_WORLD_SPAN_X = 0.125;",
  "CAPITAL_ENVELOPE_WORLD_SPAN_X + its 'immutable' comment");

sub(S + "layers/city/model/ninjaOneCapitalCityLayer.ts",
  "origin: Object.freeze([1 / 12, 0] as Pair),\n  span: Object.freeze([1 / 3, 1 / 3] as Pair),",
  // 1/8 + (1/12 - 1/8) / 2 = 5/48
  "origin: Object.freeze([5 / 48, 0] as Pair),\n  span: Object.freeze([1 / 6, 1 / 6] as Pair),",
  "NINJAONE_CAPITAL_CITY_LAYER_CAMERA");

sub(S + "layers/terrain/model/ninjaOneEnvironmentProof.ts",
  "origin: Object.freeze([0.095, 0] as Pair),\n  span: Object.freeze([0.36, 0.36] as Pair),",
  "origin: Object.freeze([0.11, 0] as Pair),\n  span: Object.freeze([0.18, 0.18] as Pair),",
  "NINJAONE_ENVIRONMENT_CAMERA");

// --------------------------------------------- 5. camera / LoD thresholds
sub(S + "shared/camera.ts", "export const CAMERA_MINIMUM_SPAN = 0.04;",
  "export const CAMERA_MINIMUM_SPAN = 0.02;", "CAMERA_MINIMUM_SPAN");
sub(S + "shared/lod/policy.ts",
  'typeof import("../camera.ts").CAMERA_MINIMUM_SPAN = 0.04;',
  'typeof import("../camera.ts").CAMERA_MINIMUM_SPAN = 0.02;', "POLICY_CAMERA_MINIMUM_SPAN");
for (const [find, replace, label] of [
  ["territoryAssetPreloadSpan: 0.9,", "territoryAssetPreloadSpan: 0.45,", "territoryAssetPreloadSpan"],
  ["capitalAssetPreloadSpan: 0.4,", "capitalAssetPreloadSpan: 0.2,", "capitalAssetPreloadSpan"],
  ["siteAssetPreloadSpan: 0.16,", "siteAssetPreloadSpan: 0.08,", "siteAssetPreloadSpan"],
  ["closeAssetPreloadSpan: 0.1,", "closeAssetPreloadSpan: 0.05,", "closeAssetPreloadSpan"],
  ["    territory: 0.78,", "    territory: 0.39,", "tierMaximumSpan.territory"],
  ["    capital: 0.34,", "    capital: 0.17,", "tierMaximumSpan.capital"],
  ["    site: 0.1,", "    site: 0.05,", "tierMaximumSpan.site"],
  ["    close: 0.075,", "    close: 0.0375,", "tierMaximumSpan.close"],
  ["    startSpan: 0.86,", "    startSpan: 0.43,", "worldToTerritory.startSpan"],
  ["    endSpan: 0.64,", "    endSpan: 0.32,", "worldToTerritory.endSpan"],
  ["    startSpan: 0.38,", "    startSpan: 0.19,", "territoryToCapital.startSpan"],
  ["    endSpan: 0.27,", "    endSpan: 0.135,", "territoryToCapital.endSpan"],
  ["    startSpan: 0.15,", "    startSpan: 0.075,", "capitalToSite.startSpan"],
  ["    endSpan: 0.1,", "    endSpan: 0.05,", "capitalToSite.endSpan"],
  ["    startSpan: 0.09,", "    startSpan: 0.045,", "siteToClose.startSpan"],
  ["    endSpan: 0.075,", "    endSpan: 0.0375,", "siteToClose.endSpan"],
]) sub(S + "shared/lod/policy.ts", find, replace, label);
// tierMaximumSpan.world stays 1: a sentinel for "coarser than territory", and
// normalizeCameraView clamps span to <= 1.

sub(S + "layers/city/model/ninjaOneCapitalCityRepresentations.ts",
  "closeAssetPreloadSpan: 0.12,", "closeAssetPreloadSpan: 0.06,", "representations closeAssetPreloadSpan");
sub(S + "layers/city/model/ninjaOneCapitalD05Concept.ts",
  "NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN = 0.0825;",
  "NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN = 0.04125;", "D05 canon 1:1 span");
sub(S + "layers/city/model/ninjaOneCapitalD05Concept.ts",
  "// 0.0825 above is a bare span,", "// 0.04125 above is a bare span,", "D05 canon comment");

// The foliage eligibility spans live in the manifest AND in the guard.
editJson(R + "capitals/ninjaone/environment/manifests/foliage-native-r4.json", (d) => {
  d.eligibility.maxDetailEnterSpan *= 0.5;
  d.eligibility.maxDetailRetainSpan *= 0.5;
  // viewportOverscanRatio is dimensionless - it multiplies a span by
  // (1 + ratio * 2). It does NOT halve.
}, "eligibility detail spans");
sub(S + "layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts",
  "maxDetailEnterSpan !== 0.12", "maxDetailEnterSpan !== 0.06", "foliage enter-span guard");
sub(S + "layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts",
  "maxDetailRetainSpan !== 0.14", "maxDetailRetainSpan !== 0.07", "foliage retain-span guard");

// These validate a world-normalized footprintSpan, so they carry ground meaning.
sub(S + "layers/terrain/detail/model/ruralOutskirts.ts",
  "const MIN_FOOTPRINT_SPAN = 0.003;\nconst MAX_FOOTPRINT_SPAN = 0.03;",
  "const MIN_FOOTPRINT_SPAN = 0.0015;\nconst MAX_FOOTPRINT_SPAN = 0.015;",
  "rural footprint bounds");

// ------------------------------------ 6. assertions that encode the ruling
sub("tests/world-territory-resegmentation.test.mjs",
  "span: [0.25, 0.3333333333333333],", `span: [0.125, ${1 / 6}],`,
  "resegmentation expected span");
sub("tests/ninjaone-environment-proof.test.mjs",
  "NINJAONE_ENVIRONMENT_WORLD_SPAN, [0.25, 1 / 3]", "NINJAONE_ENVIRONMENT_WORLD_SPAN, [0.125, 1 / 6]",
  "environment-proof expected span");
sub("tests/intent/ninjaone-capital-visual-similarity.test.mjs",
  "capture.camera.span, [0.25, 1 / 3]", "capture.camera.span, [0.125, 1 / 6]",
  "visual-similarity expected camera span");

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits:\n`);
for (const c of changes) console.log(`  ${c}`);
console.log(`\ncamera.test.mjs is deliberately untouched: its [0.25, 1/3] is an`);
console.log(`arbitrary bounds rectangle in a clamping-arithmetic test, and its`);
console.log(`[1672, 941] is a literal passed to cameraViewBox, not WORLD_PLANE.`);
