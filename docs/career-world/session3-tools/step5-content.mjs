// Step 5E: the two content layers that did not follow what they belong to.
//
// Kaizen's foundry town plan is Kaizen's district, and the rural outskirts are
// the capital's fringe. Both are registered in world coordinates, so neither
// moved when Kaizen went to its plan shelf and the capital envelope went to
// its own. They were left standing on the old positions, and against the new
// land mask most of their points are in the sea.
//
//   node docs/career-world/session3-tools/step5-content.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const R = "public/career-world/";
const trim = (v) => Number(v.toFixed(9));

// The capital envelope's span did not change, so its content translates.
const CAPITAL_D = [0.153125, 0.2];
// Kaizen moved from its old world anchor to the plan's kaizen shelf.
const KAIZEN_OLD = [0.1805, 0.154];
const KAIZEN_NEW = [0.4625, 0.17777777777777778];
const KAIZEN_D = [KAIZEN_NEW[0] - KAIZEN_OLD[0], KAIZEN_NEW[1] - KAIZEN_OLD[1]];
const by = (d) => (p) => [trim(p[0] + d[0]), trim(p[1] + d[1])];

const changes = [];
function editJson(path, mutate, label) {
  const raw = fs.readFileSync(R + path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const doc = JSON.parse(text);
  const before = JSON.stringify(doc);
  mutate(doc);
  if (JSON.stringify(doc) === before) { changes.push(`${path}  ${label}  (already applied)`); return; }
  const out = JSON.stringify(doc, null, 2) + "\n";
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(R + path, crlf ? out.replace(/\n/g, "\r\n") : out);
}

const k = by(KAIZEN_D);
editJson("layers/infrastructure/manifests/ninjaone-project-towns-r1.json", (d) => {
  for (const town of d.towns) {
    const pl = town.townPlan;
    for (const b of pl.blocks ?? []) b.points = b.points.map(k);
    for (const s of pl.streets ?? []) s.waypoints = s.waypoints.map(k);
    for (const z of pl.plazas ?? []) z.points = z.points.map(k);
    for (const s of pl.terrainSeams ?? []) s.waypoints = s.waypoints.map(k);
    for (const l of pl.pedestrianLoops ?? []) l.waypoints = l.waypoints.map(k);
    for (const e of pl.entrances ?? []) e.point = k(e.point);
  }
}, "the foundry district moves with Kaizen");

const c = by(CAPITAL_D);
editJson("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json", (d) => {
  for (const s of [...d.scenery, ...(d.easterEggSlots ?? [])]) s.anchor = c(s.anchor);
}, "the rural fringe moves with the capital");
editJson("layers/structures/manifests/ninjaone-city-allocations-r1.json", (d) => {
  for (const a of d.allocations) a.bounds.origin = k(a.bounds.origin);
}, "the Kaizen allocation moves with Kaizen");

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits`);
for (const ch of changes) console.log(`  ${ch}`);
console.log(`  capital delta [${CAPITAL_D}]   kaizen delta [${KAIZEN_D.map(trim)}]`);
