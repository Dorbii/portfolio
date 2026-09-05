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
  if (!(fails.length === 1 && /water continuity/.test(fails[0]))) { results.push(`${id}: refused on ${fails.join(", ") || "?"} — not a conform case`); continue; }
  const edge = { E: "right", W: "left", N: "top", S: "bottom" }[x.island];
  const nb = `${ART}/${x.extends.territory}/${x.extends.id}/${x.extends.id}-l2.png`;
  if (!fs.existsSync(nb)) { results.push(`${id}: ${x.extends.territory} ${x.extends.id} has no land layer — skipped`); continue; }
  const cmd = `node docs/career-world/session3-tools/conform-seam-water.mjs coast ${id} --edge ${edge} --neighbour ${nb} --max 512`;
  const dry = execSync(cmd, { encoding: "utf8" });
  const depths = [...dry.matchAll(/depth ([\d.]+)-([\d.]+) m/g)].map((m) => Number(m[2]));
  const deepest = depths.length ? Math.max(...depths) : 0;
  if (!depths.length) { results.push(`${id}: nothing to cut`); continue; }
  if (deepest > MAX) { results.push(`${id}: deepest cut ${deepest.toFixed(1)} m > ${MAX} — to the owner's eye, not conformed`); continue; }
  if (DRY) { results.push(`${id}: WOULD conform (deepest ${deepest.toFixed(1)} m) and redo`); continue; }
  execSync(`${cmd} --write`, { encoding: "utf8" });
  const redo = execSync(`node tools/world-authoring/cell.mjs --territory coast --cell ${x.at[0]},${x.at[1]} --redo --force --describe-file ${ART}/coast/briefs/${id}.md 2>&1 || true`, { encoding: "utf8", shell: "bash" });
  const accepted = /accepted, stitched/.test(redo);
  const gates = (redo.match(/FAIL\s+[a-z][a-z -]+?\s{2,}[^\n]*/g) || []).map((s) => s.trim()).join(" | ");
  results.push(`${id}: conformed (deepest ${deepest.toFixed(1)} m) — ${accepted ? "ACCEPTED and stitched" : `still refused: ${gates}`}`);
  if (accepted) {
    execSync(`git add -A -- ${ART}/coast ${A} docs/career-world/session3-tools/coast-rejects && git commit -q -m "Coast ${id}: seam conformed to the island's water (mask only, deepest cut ${deepest.toFixed(1)} m) and stitched" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`, { encoding: "utf8", shell: "bash" });
  }
}
for (const r of results) console.log(r);
if (!results.length) console.log("no coast candidate refused on water continuity alone");
