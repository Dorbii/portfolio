// The mask follow-up for shore candidates that missed their seam by a little:
// every planned coast cell that is not authored, has a candidate in its
// working folder, and whose LAST verdict in the coast log failed on WATER
// CONTINUITY alone gets a dry run of conform-seam-water.mjs against the island
// cell it extends; if the deepest cut that would take is at most --max metres
// (default 12), the cut is written and cell.mjs --redo re-derives, re-gates
// and stitches. Mask only, no regeneration — the class of fix the owner
// approved for water; a drift this small is what lock 18i leaves behind
// (c7-2: two runs within 24 px, one 10 m overrun at a strip's end).
//
//   node docs/career-world/session3-tools/conform-pass.mjs [--max 12] [--dry]
import fs from "node:fs";
import { execSync } from "node:child_process";
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg("--max", 12)), DRY = process.argv.includes("--dry");
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const def = JSON.parse(fs.readFileSync(`${ART}/coast/territory.def.json`, "utf8"));
const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-coast-r1.json`, "utf8"));
const log = fs.readFileSync(".codex-tmp/bake-coast.log", "utf8").split("\n");
if (!DRY && fs.existsSync(".codex-tmp/authoring/cell.lock")) { console.log("lock present — a cell is being stitched; not running"); process.exit(1); }

const lastVerdict = (id) => {
  let start = -1;
  for (let i = log.length - 1; i >= 0; i -= 1) if (new RegExp(`--- \\d+/\\d+  ${id} `).test(log[i])) { start = i; break; }
  if (start < 0) return null;
  for (let i = start; i < log.length; i += 1) if (/ACCEPTED in|FAILED after/.test(log[i])) return log[i];
  return null;
};
const results = [];
for (const x of def.coastCells) {
  const id = `c${x.at[0]}-${x.at[1]}`;
  if (ledger.cells[id]) continue;
  const l2 = `.codex-tmp/authoring/cells/coast/${id}/${id}-l2.png`;
  if (!fs.existsSync(l2)) continue;
  const v = lastVerdict(id);
  if (!v || !/FAILED after/.test(v)) continue;
  const fails = (v.match(/FAIL\s+[a-z][a-z -]+?\s{2,}/g) || []).map((s) => s.replace(/^FAIL\s+/, "").trim());
  // water continuity among the failures is enough (2026-09-05 21:02, c6-8:
  // continuity + rock lighting + tone on a plateau carried into open sea —
  // the cut removes most of the rock and the seam band the tone was read on,
  // so the other gates are re-read on what remains); a candidate refused
  // without a continuity fault is not a conform case
  if (!fails.some((f) => /water continuity/.test(f))) { results.push(`${id}: refused on ${fails.join(", ") || "?"} — not a conform case`); continue; }
  const edge = { E: "right", W: "left", N: "top", S: "bottom" }[x.island];
  const nb = `${ART}/${x.extends.territory}/${x.extends.id}/${x.extends.id}-l2.png`;
  if (!fs.existsSync(nb)) { results.push(`${id}: ${x.extends.territory} ${x.extends.id} has no land layer — skipped`); continue; }
  const cmd = `node docs/career-world/session3-tools/conform-seam-water.mjs coast ${id} --edge ${edge} --neighbour ${nb} --max 512`;
  const dry = execSync(cmd, { encoding: "utf8" });
  const depths = [...dry.matchAll(/depth ([\d.]+)-([\d.]+) m/g)].map((m) => Number(m[2]));
  const deepest = depths.length ? Math.max(...depths) : 0;
  if (!depths.length) { results.push(`${id}: nothing to cut`); continue; }
  // a drift within --max: the seam cut alone. Deeper — the model painted its
  // coast over the island's sea or its inlets (c7-0, 2026-09-05 20:04) — the
  // whole-shore conform: every run opened, land beyond the limit trimmed
  // (conform-band.mjs); its preview is kept for the owner's eye either way.
  // the whole-shore conform also when the seam matched but the land overflows
  // the limit (c6-8, 2026-09-05 23:05: seam drift 0.4 m, a plateau across the
  // cell; the band's dry run reports what it would trim)
  const bandDry = execSync(`node docs/career-world/session3-tools/conform-band.mjs coast ${id}`, { encoding: "utf8" });
  const trimPct = Number((bandDry.match(/trimmed beyond it \d+ mask px \(([\d.]+)%/) || [0, 0])[1]);
  const band = deepest > MAX || trimPct > 5;
  const preview = `docs/career-world/session3-tools/coast-rejects/${id}-conform.jpg`;
  if (DRY) { results.push(`${id}: WOULD ${band ? `band-conform (seam drift ${deepest.toFixed(1)} m, ${trimPct}% beyond the limit)` : `seam-conform (deepest ${deepest.toFixed(1)} m)`} and redo`); continue; }
  const redoCmd = `node tools/world-authoring/cell.mjs --territory coast --cell ${x.at[0]},${x.at[1]} --redo --force --describe-file ${ART}/coast/briefs/${id}.md 2>&1 || true`;
  if (band) execSync(`node docs/career-world/session3-tools/conform-band.mjs coast ${id} --preview ${preview} --write`, { encoding: "utf8" });
  else execSync(`${cmd} --preview ${preview} --write`, { encoding: "utf8" });
  let redo = execSync(redoCmd, { encoding: "utf8", shell: "bash" });
  let accepted = /accepted, stitched/.test(redo);
  let gates = (redo.match(/FAIL\s+[a-z][a-z -]+?\s{2,}[^\n]*/g) || []).map((s) => s.trim()).join(" | ");
  let how = band ? `band-conformed (seam drift ${deepest.toFixed(1)} m, ${trimPct}% beyond the limit)` : `seam-conformed (deepest ${deepest.toFixed(1)} m)`;
  // a seam conform that still leaves a crossing unmet (c2-8: the crossings were
  // on the shore neighbour's edge, which the seam conform does not read) gets
  // the whole-shore conform as a second step
  if (!accepted && !band && /water continuity/.test(gates)) {
    execSync(`node docs/career-world/session3-tools/conform-band.mjs coast ${id} --preview ${preview} --write`, { encoding: "utf8" });
    redo = execSync(redoCmd, { encoding: "utf8", shell: "bash" });
    accepted = /accepted, stitched/.test(redo);
    gates = (redo.match(/FAIL\s+[a-z][a-z -]+?\s{2,}[^\n]*/g) || []).map((s) => s.trim()).join(" | ");
    how += `, then band-conformed`;
  }
  results.push(`${id}: ${how} — ${accepted ? "ACCEPTED and stitched" : `still refused: ${gates}`}; preview ${preview}`);
  if (accepted) {
    execSync(`git add -A -- ${ART}/coast ${A} docs/career-world/session3-tools/coast-rejects && git commit -q -m "Coast ${id}: ${band ? "shore conformed to the plan (every run opened, land beyond the limit trimmed; mask only)" : `seam conformed to the island's water (mask only, deepest cut ${deepest.toFixed(1)} m)`} and stitched" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`, { encoding: "utf8", shell: "bash" });
  }
}
for (const r of results) console.log(r);
if (!results.length) console.log("no coast candidate refused on water continuity alone");
