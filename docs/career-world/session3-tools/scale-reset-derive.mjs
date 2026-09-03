// The world scale reset, derived rather than asserted.
//
// STATE records the reset as owner-approved 2026-08-31 ("world plane x2, land
// fraction 2/3") but the re-derivation was never done, which is why the L2
// land is still "territory-local; world registration deliberately pending the
// scale-reset re-derivation". This script computes every number the
// registration needs, and checks each one against a figure STATE already
// states, so a wrong reading of "x2" cannot pass silently.
//
//   node .codex-tmp/session3/scale-reset-derive.mjs
import fs from "node:fs";

const ok = [];
const bad = [];
function check(label, got, want, tol = 0.02) {
  const pass = Math.abs(got - want) / Math.abs(want) <= tol;
  (pass ? ok : bad).push(`${pass ? "OK  " : "FAIL"} ${label}: derived ${typeof got === "number" ? got.toFixed(2) : got} vs STATE ${want}`);
  return pass;
}

// ---------------------------------------------------------------- current ----
const PLANE_PX = [1672, 941];          // world plate, STATE registration line
const M_PER_WORLDPX = 0.4503;          // STATE: "0.4503 m per world pixel"
const MASTER = [1448, 1086];           // D05 master bounds
const ENVELOPE = { origin: [0.125, 0], span: [0.25, 1 / 3] };   // NinjaOne capitalEnvelope
const REGION_PX = 218;                 // STATE: "218 x 218 world px, about 98 m x 98 m"

const planeM = PLANE_PX.map((p) => p * M_PER_WORLDPX);
check("current plane width m", planeM[0], 753);
check("current plane height m", planeM[1], 424);
check("region ground m", REGION_PX * M_PER_WORLDPX, 98);
const envPxNow = [ENVELOPE.span[0] * PLANE_PX[0], ENVELOPE.span[1] * PLANE_PX[1]];
const envMNow = envPxNow.map((p) => p * M_PER_WORLDPX);
const mPerMasterUnit = envMNow[0] / MASTER[0];
check("m per master unit (D05)", mPerMasterUnit, 0.13);

// -------------------------------------------------------- the L2 land as built ----
const plan = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/plan.json", "utf8"));
const ledger = JSON.parse(fs.readFileSync("public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json", "utf8"));
const CELL_ART = plan.cell.keptPx;                       // 2048
const ART_PER_WORLDPX = ledger.contract.artPxPerWorldPx; // 9.45
const cellWorldPx = CELL_ART / ART_PER_WORLDPX;
const cellM = cellWorldPx * M_PER_WORLDPX;
check("cell ground m", cellM, plan.cell.groundMetres);
const terrWorldPx = [plan.grid.cols * cellWorldPx, plan.grid.rows * cellWorldPx];
const terrM = terrWorldPx.map((p) => p * M_PER_WORLDPX);
check("territory width m", terrM[0], plan.territoryMetres[0]);
check("territory height m", terrM[1], plan.territoryMetres[1]);

// ------------------------------------------------------------------ the reset ----
// "x2" is ambiguous on its own. Two readings give the same GROUND size but
// differ on pixels; the region definition settles it, because a region is
// BOTH 218 world px AND ~98 m, so m/px cannot change.
const RESET_PLANE_PX = PLANE_PX.map((p) => p * 2);
const resetPlaneM = RESET_PLANE_PX.map((p) => p * M_PER_WORLDPX);
const LAND_FRACTION = 2 / 3;
const landPx2 = RESET_PLANE_PX[0] * RESET_PLANE_PX[1] * LAND_FRACTION;
const regions = landPx2 / (REGION_PX * REGION_PX);
check("regions to author at x2, land 2/3", regions, 88, 0.03);

// territory budget: NinjaOne 21 regions
const NINJAONE_REGIONS = 21;
const ninjaOneM2 = NINJAONE_REGIONS * (REGION_PX * M_PER_WORLDPX) ** 2;
check("NinjaOne budget side m (sqrt of 21 regions)", Math.sqrt(ninjaOneM2), 450, 0.03);

// and what was actually authored, in the same unit
const authoredRegions = (terrWorldPx[0] * terrWorldPx[1]) / (REGION_PX * REGION_PX);

// ------------------------------------------------- the one unresolved choice ----
// The envelope is a NORMALIZED fraction, so doubling the plane's pixels doubles
// the envelope's ground size unless the fraction is reduced. STATE asserts both
// "capitalEnvelope ... is IMMUTABLE" and "D05 remains the scale anchor and does
// not move" - and with m/px fixed those two cannot both hold.
const optionA = {   // keep the fraction: the envelope doubles in metres, D05 shrinks within it
  span: ENVELOPE.span,
  envM: [ENVELOPE.span[0] * RESET_PLANE_PX[0] * M_PER_WORLDPX, ENVELOPE.span[1] * RESET_PLANE_PX[1] * M_PER_WORLDPX],
};
optionA.d05FractionOfEnvelope = (MASTER[0] * mPerMasterUnit) / optionA.envM[0];
const optionB = {   // keep D05 at 0.13 m/MU: halve the fraction, D05 keeps its exact footprint
  span: [ENVELOPE.span[0] / 2, ENVELOPE.span[1] / 2],
};
optionB.envM = [optionB.span[0] * RESET_PLANE_PX[0] * M_PER_WORLDPX, optionB.span[1] * RESET_PLANE_PX[1] * M_PER_WORLDPX];
optionB.mPerMasterUnit = optionB.envM[0] / MASTER[0];

// ---------------------------------------------------------------------- out ----
const L = [];
const p = (s) => L.push(s);
p("WORLD SCALE RESET - derivation (owner-approved 2026-08-31, never applied)\n");
p("Checks against figures STATE already states:");
for (const line of ok) p("  " + line);
for (const line of bad) p("  " + line);
p("");
p("SETTLED - what 'world plane x2' must mean:");
p(`  A region is defined as BOTH ${REGION_PX} world px AND ~98 m of ground, so`);
p(`  metres-per-world-pixel CANNOT change. It stays ${M_PER_WORLDPX}.`);
p(`  Therefore the plane's PIXELS double: ${PLANE_PX.join(" x ")} -> ${RESET_PLANE_PX.join(" x ")}`);
p(`  Ground: ${planeM.map((v) => v.toFixed(0)).join(" x ")} m -> ${resetPlaneM.map((v) => v.toFixed(0)).join(" x ")} m`);
p(`  Land at ${(LAND_FRACTION * 100).toFixed(0)}% of the plane = ${regions.toFixed(1)} regions to author (STATE says ~88).`);
p(`  Territory plate stays world x4: ${RESET_PLANE_PX.map((v) => v * 4).join(" x ")}`);
p("");
p("KEY FINDING - the authored land already fits the POST-reset budget:");
p(`  One cell  = ${CELL_ART} art px / ${ART_PER_WORLDPX} = ${cellWorldPx.toFixed(1)} world px = ${cellM.toFixed(1)} m`);
p(`  Territory = ${plan.grid.cols} x ${plan.grid.rows} cells = ${terrWorldPx.map((v) => v.toFixed(0)).join(" x ")} world px = ${terrM.map((v) => v.toFixed(0)).join(" x ")} m`);
p(`  That is ${authoredRegions.toFixed(1)} regions against NinjaOne's budget of ${NINJAONE_REGIONS} (~450 m).`);
p(`  So the 20 authored cells DO NOT need rescaling. They were authored to the`);
p(`  post-reset budget. What has to change is the world plane around them.`);
p("");
p("BLOCKING CHOICE - two STATE rules collide and only the owner can pick:");
p(`  STATE says the capitalEnvelope origin [0.125,0] span [0.25,1/3] is IMMUTABLE.`);
p(`  STATE also says D05 remains the scale anchor and does not move.`);
p(`  With m/px fixed and the plane's pixels doubled, those cannot both hold:`);
p("");
p(`  Option A - keep the envelope FRACTION [${ENVELOPE.span[0]}, 1/3]:`);
p(`    envelope becomes ${optionA.envM.map((v) => v.toFixed(0)).join(" x ")} m (was ${envMNow.map((v) => v.toFixed(0)).join(" x ")} m)`);
p(`    D05's 125 m capital then fills ${(optionA.d05FractionOfEnvelope * 100).toFixed(0)}% of the envelope width instead of 100%.`);
p(`    D05 keeps 0.13 m per master unit only if its master->world mapping is re-derived.`);
p("");
p(`  Option B - keep D05's footprint exactly, halve the fraction to [${optionB.span[0]}, 1/6]:`);
p(`    envelope stays ${optionB.envM.map((v) => v.toFixed(0)).join(" x ")} m and ${optionB.mPerMasterUnit.toFixed(3)} m per master unit`);
p(`    D05 does not move by a single world pixel; the ENVELOPE NUMBER changes.`);
p(`    New registration: world = ([0.125,0] + master/[${MASTER.join(",")}] * [${optionB.span[0]}, 1/6]) * [${RESET_PLANE_PX.join(",")}]`);
p("");
p("  Option B is the one that honours 'D05 does not move'; Option A honours the");
p("  literal envelope numbers. Everything downstream depends on which.");
const out = L.join("\n");
console.log(out);
fs.writeFileSync(".codex-tmp/session3/scale-reset-derivation.txt", out + "\n");
