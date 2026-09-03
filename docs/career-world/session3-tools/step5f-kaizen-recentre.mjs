// Step 5F: centre Kaizen's district on Kaizen.
//
// Step 5E translated the district by aligning one anchor -- [0.1805, 0.154] --
// onto the plan shelf. That anchor sat near the district's SOUTH edge, so
// aligning it to a shelf CENTRE carried the whole district 32 m north, off the
// top of cell [7,1] and into unauthored sea. Thirteen points ended up over
// water and five of the seven rural-fringe anchors with them.
//
// The rule the plan actually draws with is in `plan-territory.mjs`: a shelf is
// a circle CENTRED on `cell + off`. Two independent things already sit on that
// centre and were never wrong -- the Kaizen node's territoryAnchor and the
// Kaizen plate's anchor, both [0.4625, 0.17777777777777778]. So the district
// belongs centred on them, and this applies the residual translation that puts
// it there. Nothing deforms; it is one rigid move.
//
// Corroboration, not assertion: the rural fringe was not part of the objective
// and goes from 5 of 7 anchors over water to 0 of 7 at this same delta.
//
// REFUSES TO RUN TWICE. A translation is not idempotent, and step 5E had no
// guard -- re-running it would have moved the district again. This one measures
// the district's centre first and stops if it is already on the shelf.
//
//   node docs/career-world/session3-tools/step5f-kaizen-recentre.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const R = "public/career-world/";
const trim = (v) => Number(v.toFixed(9));

const plan = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/plan.json", "utf8"));
const shelf = plan.shelves.find((s) => s.id === "kaizen");
const BLOCK = [3, 1], COLS = 16, ROWS = 9;
const SHELF = [
  (BLOCK[0] + shelf.cell[0] + shelf.off[0]) / COLS,
  (BLOCK[1] + shelf.cell[1] + shelf.off[1]) / ROWS,
];

// The node and the plate agree with the plan to the ninth decimal. If they ever
// stop agreeing, the placement has more than one authority and this tool must
// not guess which one wins.
const NODE = JSON.parse(fs.readFileSync(R + "layers/structures/manifests/project-structures-r1.json", "utf8"))
  .nodes.find((n) => n.id.includes("kaizen")).territoryAnchor;
const PLATE = JSON.parse(fs.readFileSync(R + "cities/kaizen-agent/manifests/base-runtime-r1.json", "utf8"))
  .plate.anchor;
for (const [label, p] of [["node", NODE], ["plate", PLATE]]) {
  if (Math.abs(p[0] - SHELF[0]) > 1e-9 || Math.abs(p[1] - SHELF[1]) > 1e-9) {
    throw new Error(`the Kaizen ${label} is at [${p}] but the plan shelf is at [${SHELF}]; resolve that first`);
  }
}

const TOWNS = "layers/infrastructure/manifests/ninjaone-project-towns-r1.json";
const townDoc = JSON.parse(fs.readFileSync(R + TOWNS, "utf8"));
const townPoints = (pl) => [
  ...(pl.blocks ?? []).flatMap((b) => b.points),
  ...(pl.streets ?? []).flatMap((s) => s.waypoints),
  ...(pl.plazas ?? []).flatMap((z) => z.points),
  ...(pl.terrainSeams ?? []).flatMap((s) => s.waypoints),
  ...(pl.pedestrianLoops ?? []).flatMap((l) => l.waypoints),
  ...(pl.entrances ?? []).map((e) => e.point),
];
const all = townDoc.towns.flatMap((t) => townPoints(t.townPlan));
const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
const D = [trim(SHELF[0] - centre[0]), trim(SHELF[1] - centre[1])];

const M = 0.4503, PW = [3472, 1953];
console.log(`district centre  [${centre[0].toFixed(6)}, ${centre[1].toFixed(6)}]`);
console.log(`Kaizen shelf     [${SHELF[0].toFixed(6)}, ${SHELF[1].toFixed(6)}]   (node and plate agree)`);
console.log(`residual move    [${D[0]}, ${D[1]}]  = ${(D[0] * PW[0] * M).toFixed(1)} m east, ${(D[1] * PW[1] * M).toFixed(1)} m south\n`);

// Half a mask pixel is 0.47 m. Below that the district is already centred and
// there is nothing to apply.
if (Math.abs(D[0] * PW[0] * M) < 0.47 && Math.abs(D[1] * PW[1] * M) < 0.47) {
  console.log("Already centred on the shelf. Nothing to do.");
  process.exit(0);
}

const by = (d) => (p) => [trim(p[0] + d[0]), trim(p[1] + d[1])];
const k = by(D);
const changes = [];
function editJson(path, mutate, label) {
  const raw = fs.readFileSync(R + path, "utf8");
  const crlf = raw.includes("\r\n");
  const doc = JSON.parse(raw.replace(/\r\n/g, "\n"));
  mutate(doc);
  const out = JSON.stringify(doc, null, 2) + "\n";
  changes.push(`${path}  --  ${label}`);
  if (!DRY) fs.writeFileSync(R + path, crlf ? out.replace(/\n/g, "\r\n") : out);
}

editJson(TOWNS, (d) => {
  for (const town of d.towns) {
    const pl = town.townPlan;
    for (const b of pl.blocks ?? []) b.points = b.points.map(k);
    for (const s of pl.streets ?? []) s.waypoints = s.waypoints.map(k);
    for (const z of pl.plazas ?? []) z.points = z.points.map(k);
    for (const s of pl.terrainSeams ?? []) s.waypoints = s.waypoints.map(k);
    for (const l of pl.pedestrianLoops ?? []) l.waypoints = l.waypoints.map(k);
    for (const e of pl.entrances ?? []) e.point = k(e.point);
  }
}, "the town plan is the district");

// The three skill structures stand inside the district and were left behind by
// step 5E, which only moved the town, the fringe and the allocation.
editJson("layers/structures/manifests/skill-structures-r1.json", (d) => {
  for (const n of d.instances) n.territoryAnchor = k(n.territoryAnchor);
}, "the skill structures stand in the district");

editJson("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json", (d) => {
  for (const s of [...d.scenery, ...(d.easterEggSlots ?? [])]) s.anchor = k(s.anchor);
}, "the rural fringe is the district's fringe");

// ruralOutskirts.ts requires every fringe anchor to sit inside an accepted
// NinjaOne allocation, so the allocation has to travel with what it contains.
editJson("layers/structures/manifests/ninjaone-city-allocations-r1.json", (d) => {
  for (const a of d.allocations) a.bounds.origin = k(a.bounds.origin);
}, "the allocation contains the fringe and must travel with it");

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits`);
for (const c of changes) console.log(`  ${c}`);
console.log(`\nThe node, the plate and the capital envelope do not move -- they were `
  + `already right.\nRe-run kaizen-shelf-fit.mjs to confirm the centre now lands on the shelf.`);
