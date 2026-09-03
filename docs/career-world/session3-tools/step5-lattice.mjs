// Step 5, phase A: put the world on a lattice and derive the capital from it.
//
// Owner rulings 2026-09-03: the authored grid is authoritative and expands as
// needed; the plane becomes 16 x 9 cells; NinjaOne's block sits at cell [3,1].
//
// The numbers that make this work out:
//
//   cell = 217 world px  ->  plane 16 x 9 cells = 3472 x 1953 px, aspect
//   exactly 16:9 with integer pixels. Cell ground 97.72 m against the authored
//   97.6 (0.12% off), and a region is 218 px, so a cell and a region are the
//   same thing to half a percent.
//
//   D05's master artboard is 1448 x 1086 = exactly 4:3, and 2 x 1.5 cells is
//   exactly 4:3. So the capital envelope IS 2 x 1.5 cells and its span stays
//   [1/8, 1/6] -- the value already in the tree. Only its ORIGIN moves, and
//   that now comes from plan.json's capital shelf instead of the old world.
//
// Every position below is an exact fraction: cell (c,r) sits at [c/16, r/9].
//
//   node docs/career-world/session3-tools/step5-lattice.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const S = "features/career-world/";
const R = "public/career-world/";

const CELL_PX = 217;
const COLS = 16, ROWS = 9;
const PLANE = [COLS * CELL_PX, ROWS * CELL_PX];        // 3472 x 1953
const BLOCK = [3, 1];                                  // owner-placed
const GRID = [5, 4];

// plan.json shelves: [cell col, cell row, offset within the cell]
const SHELVES = {
  capital: [2, 1, 0.45, 0.55],
  kaizen: [4, 0, 0.4, 0.6],
  "metrics-service": [0, 1, 0.55, 0.35],
  vendy: [1, 3, 0.5, 0.4],
  construction: [4, 3, 0.45, 0.45],
};
// world fraction of a point given in block-cell coordinates
const world = (c, r) => [(BLOCK[0] + c) / COLS, (BLOCK[1] + r) / ROWS];
const shelf = (id) => {
  const [c, r, ox, oy] = SHELVES[id];
  return world(c + ox, r + oy);
};

const ENVELOPE_SPAN = [2 / COLS, 1.5 / ROWS];          // [0.125, 1/6]
const capitalShelf = shelf("capital");
const ENVELOPE_ORIGIN = [
  capitalShelf[0] - ENVELOPE_SPAN[0] / 2,
  capitalShelf[1] - ENVELOPE_SPAN[1] / 2,
];

const changes = [];
function sub(path, find, replace, label, count = 1) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const hits = text.split(find).length - 1;
  if (hits === 0 && text.includes(replace)) { changes.push(`${path}  ${label}  (already applied)`); return; }
  if (hits !== count) throw new Error(`${path}: expected ${count} of ${JSON.stringify(find)}, found ${hits}`);
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? text.split(find).join(replace).replace(/\n/g, "\r\n") : text.split(find).join(replace));
}
function editJson(path, mutate, label) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const doc = JSON.parse(text);
  const before = JSON.stringify(doc);
  mutate(doc);
  if (JSON.stringify(doc) === before) { changes.push(`${path}  ${label}  (already applied)`); return; }
  const out = JSON.stringify(doc, null, 2) + "\n";
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? out.replace(/\n/g, "\r\n") : out);
}

// ------------------------------------------------------------ 1. the plane
sub(S + "shared/world.ts", "width: 3344,\n  height: 1882,",
  `width: ${PLANE[0]},\n  height: ${PLANE[1]},`, `WORLD_PLANE -> ${PLANE.join(" x ")} (${COLS} x ${ROWS} cells of ${CELL_PX} px)`);
sub("scripts/audit-career-world-town-surfaces.mjs",
  "const WORLD_PLANE = Object.freeze({ width: 3344, height: 1882 });",
  `const WORLD_PLANE = Object.freeze({ width: ${PLANE[0]}, height: ${PLANE[1]} });`, "audit WORLD_PLANE");

// ------------------------------------------ 2. the capital, from its shelf
// The span is unchanged (2 x 1.5 cells); only the origin moves, and it now
// derives from plan.json rather than from the old world.
editJson(R + "layers/terrain/authority/manifests/world-territories-r4.json", (d) => {
  const dev = d.territories.find((t) => t.id === "ninjaone").development;
  dev.capitalEnvelope.origin = ENVELOPE_ORIGIN;
  dev.capitalAnchor = capitalShelf;
}, "ninjaone capitalEnvelope.origin + capitalAnchor, from the capital shelf");

for (const [file, path] of [
  ["capitals/ninjaone/manifests/city-package-authority-r4.json", "worldOrigin"],
  ["capitals/ninjaone/environment/manifests/inland-water-r1.json", "worldOrigin"],
]) {
  editJson(R + file, (d) => { d.registration[path] = ENVELOPE_ORIGIN; }, `registration.${path}`);
}
for (const file of [
  "capitals/ninjaone/environment/manifests/environment-proof-r1.json",
  "capitals/ninjaone/environment/manifests/foliage-native-r4.json",
]) {
  editJson(R + file, (d) => { d.registration.boundingWorldView.origin = ENVELOPE_ORIGIN; },
    "registration.boundingWorldView.origin");
}

// ------------------------------- 3. the project cities, from their shelves
// Ground sizes are preserved; only placement comes from the plan.
const PLANE_M = PLANE.map((v) => v * 0.4503);
const OLD_PLANE_M = [3344 * 0.4503, 1882 * 0.4503];
const keepGround = (span) => [
  span[0] * OLD_PLANE_M[0] / PLANE_M[0],
  span[1] * OLD_PLANE_M[1] / PLANE_M[1],
];
editJson(R + "cities/kaizen-agent/manifests/base-runtime-r1.json", (d) => {
  d.plate.anchor = shelf("kaizen");
  d.plate.span = keepGround(d.plate.span);
}, "kaizen plate anchor from its shelf");
editJson(R + "layers/structures/manifests/project-structures-r1.json", (d) => {
  for (const n of d.nodes) {
    if (n.id !== "project-kaizen-agent") continue;
    n.territoryAnchor = shelf("kaizen");
    n.footprintSpan = keepGround(n.footprintSpan);
  }
}, "kaizen node from its shelf");
editJson(R + "layers/structures/manifests/skill-structures-r1.json", (d) => {
  // Kaizen's skills ride with Kaizen: keep their offsets from its old anchor.
  const OLD_KAIZEN = [0.1805, 0.154];
  const k = shelf("kaizen");
  for (const a of d.archetypes) a.footprintSpan = keepGround(a.footprintSpan);
  for (const i of d.instances) {
    i.territoryAnchor = [
      k[0] + (i.territoryAnchor[0] - OLD_KAIZEN[0]) * OLD_PLANE_M[0] / PLANE_M[0],
      k[1] + (i.territoryAnchor[1] - OLD_KAIZEN[1]) * OLD_PLANE_M[1] / PLANE_M[1],
    ];
  }
}, "kaizen skills, carried with Kaizen");

// -------------------------- 4. everything registered inside the capital
// The envelope SPAN is numerically unchanged, so moving its origin is a pure
// translation for anything registered against it. Artboard-space content
// (foliage instances, seam resources) does not move at all.
const D = [ENVELOPE_ORIGIN[0] - 0.125, ENVELOPE_ORIGIN[1] - 0];
const tr = (p) => [Number((p[0] + D[0]).toFixed(9)), Number((p[1] + D[1]).toFixed(9))];
const L = (p) => `[${p[0]}, ${p[1]}]`;

editJson(R + "capitals/ninjaone/environment/manifests/seam-integration-native-r2.json", (d) => {
  for (const cp of Object.values(d.selectorCheckpoints ?? {})) {
    if (cp.camera) cp.camera.origin = tr(cp.camera.origin);
  }
}, "seam checkpoint cameras");

for (const [file, find] of [
  ["layers/inland-water/geometry.ts", "regionOrigin: Object.freeze([0.125, 0] as const)"],
  ["layers/inland-water/rendering/NinjaOneInlandWaterRenderer.ts", "const REGION_ORIGIN = Object.freeze([0.125, 0] as const)"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts", "const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair)"],
  ["layers/terrain/detail/model/ninjaOneEnvironmentNativeDetail.ts", "const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair)"],
]) {
  sub(S + file, find, find.replace("[0.125, 0]", L(ENVELOPE_ORIGIN)), "envelope origin");
}
sub(S + "layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts",
  'boundingWorldView.origin.join(",") !== "0.125,0"',
  `boundingWorldView.origin.join(",") !== "${ENVELOPE_ORIGIN.join(",")}"`, "foliage origin guard");
sub(S + "layers/terrain/model/ninjaOneEnvironmentProof.ts",
  "origin: Object.freeze([0.11, 0] as Pair)",
  `origin: Object.freeze(${L(tr([0.11, 0]))} as Pair)`, "NINJAONE_ENVIRONMENT_CAMERA origin");
sub(S + "layers/city/model/ninjaOneCapitalCityLayer.ts",
  "origin: Object.freeze([5 / 48, 0] as Pair)",
  `origin: Object.freeze(${L(tr([5 / 48, 0]))} as Pair)`, "city layer camera origin");

sub("scripts/build-ninjaone-environment-foliage-r4.mjs",
  "origin: [0.125, 0],", `origin: ${L(ENVELOPE_ORIGIN)},`, "foliage generator origin");
sub("scripts/build-ninjaone-city-composer-r2.mjs",
  "const CITY_WORLD_ORIGIN = Object.freeze([0.125, 0]);",
  `const CITY_WORLD_ORIGIN = Object.freeze(${L(ENVELOPE_ORIGIN)});`, "composer origin");
sub("scripts/lib/ninjaone-environment-mvp-verification.mjs",
  "const ENVIRONMENT_ORIGIN = Object.freeze([0.125, 0]);",
  `const ENVIRONMENT_ORIGIN = Object.freeze(${L(ENVELOPE_ORIGIN)});`, "mvp ENVIRONMENT_ORIGIN");
sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
  "      (camera.origin[0] - 0.125) / 0.125 * ARTBOARD[0],\n      camera.origin[1] / (1 / 6) * ARTBOARD[1],",
  `      (camera.origin[0] - ${ENVELOPE_ORIGIN[0]}) / ${ENVELOPE_SPAN[0]} * ARTBOARD[0],\n      (camera.origin[1] - ${ENVELOPE_ORIGIN[1]}) / (1 / 6) * ARTBOARD[1],`,
  "cameraArtboardView origin mapping");
for (const [ox, oy, label] of [
  [0.14625, 0.115, "seam gen B2 camera"],
  [0.20875, 0.115, "seam gen C2 camera"],
]) {
  sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
    `origin: Object.freeze([${ox}, ${oy}]),`,
    `origin: Object.freeze(${L(tr([ox, oy]))}),`, label);
}

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits\n`);
for (const c of changes) console.log(`  ${c}`);
console.log(`
lattice          ${COLS} x ${ROWS} cells of ${CELL_PX} px = ${PLANE.join(" x ")} px = ${PLANE_M.map((v) => v.toFixed(1)).join(" x ")} m
cell             ${CELL_PX} px = ${(CELL_PX * 0.4503).toFixed(2)} m   (authored 97.6, region 218 px)
NinjaOne block   cell [${BLOCK}] .. [${BLOCK[0] + GRID[0]}, ${BLOCK[1] + GRID[1]}]  origin [${world(0, 0)}]

capital envelope 2 x 1.5 cells   span [${ENVELOPE_SPAN}]  origin [${ENVELOPE_ORIGIN}]
shelves, world:`);
for (const id of Object.keys(SHELVES)) {
  console.log(`  ${id.padEnd(17)} cell [${SHELVES[id][0]}, ${SHELVES[id][1]}]  ->  [${shelf(id).map((v) => Number(v.toFixed(6))).join(", ")}]`);
}
