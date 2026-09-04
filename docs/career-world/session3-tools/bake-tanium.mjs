// Bake Tanium's 21 cells, one at a time, unattended.
//
// Owner 2026-09-04: "go for it now ... please render it all and ill review in
// the morning and then we can handle any rebakes".
//
// STRICTLY SEQUENTIAL. cell.mjs holds a lockfile precisely because two
// generations over one output tree destroyed 106 tile files earlier in this
// project; this runner never overlaps two, and never retries a cell into a
// second concurrent process.
//
// A FAILED CELL DOES NOT STOP THE RUN. The gates leave the world untouched on
// failure, so a refusal costs only that cell. Stopping would waste the night on
// the first hard cell, and the owner has said rebakes are expected.
//
// Order is chosen so that every cell after the first has an authored
// neighbour — that is what puts the pipeline in edit mode and keeps seams
// continuous — and so the two riskiest cells go first: 3,0 and 4,0 are the
// connecting ground to NinjaOne, the only cells whose success depends on
// meeting a coastline that already exists.
//
//   node docs/career-world/session3-tools/bake-tanium.mjs [--dry]
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const TERRITORY = "tanium";
const BRIEFS = `art-source/career-world/l2-land/${TERRITORY}/briefs`;
const LOG = `.codex-tmp/bake-${TERRITORY}.log`;

const ORDER = [
  "3,0", "4,0",                                  // the handover: hardest first
  "2,0", "1,0", "0,0", "5,0", "6,0",             // rest of the north row
  "0,1", "1,1", "2,1", "3,1", "4,1", "5,1", "6,1",
  "0,2", "1,2", "2,2", "3,2", "4,2", "5,2", "6,2",
];

const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${TERRITORY}/territory.def.json`, "utf8"));
const planned = Object.keys(def.cellBiomes).sort();
const missing = planned.filter((k) => !ORDER.includes(k));
if (missing.length) throw new Error(`the run order skips ${missing.join(", ")}`);
if (ORDER.length !== planned.length) throw new Error(`order has ${ORDER.length} cells, plan has ${planned.length}`);
for (const k of ORDER) {
  const [c, r] = k.split(",");
  const f = `${BRIEFS}/c${c}-${r}.md`;
  if (!fs.existsSync(f)) throw new Error(`no brief at ${f}`);
}

fs.mkdirSync(".codex-tmp", { recursive: true });
const say = (line) => {
  const stamped = `[${new Date().toISOString().slice(11, 19)}] ${line}`;
  console.log(stamped);
  fs.appendFileSync(LOG, stamped + "\n");
};

const REJECTS = `docs/career-world/session3-tools/${TERRITORY}-rejects`;
function keepReject(id, biome, out) {
  const src = `.codex-tmp/authoring/cells/${TERRITORY}/${id}/${id}-l2.png`;
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(REJECTS, { recursive: true });
  const m = out.match(/FAIL\s+(\S+(?: \S+)*?)\s{2,}([0-9.]+)/);
  const r = spawnSync(process.execPath, ["-e",
    `import("sharp").then(s=>s.default(${JSON.stringify(src)})`
    + `.resize(768,768,{fit:"cover"}).webp({quality:82})`
    + `.toFile(${JSON.stringify(`${REJECTS}/${id}.webp`)}))`,
  ], { encoding: "utf8" });
  if (r.status !== 0) { say(`    (could not keep the candidate: ${(r.stderr || "").trim().slice(0, 120)})`); return; }
  fs.appendFileSync(`${REJECTS}/README.md`,
    `- \`${id}\` ${biome} — rejected on **${m ? m[1] : "a gate"} ${m ? m[2] : ""}**\n`);
  say(`    candidate kept at ${REJECTS}/${id}.webp`);
}

say(`bake ${TERRITORY}: ${ORDER.length} cells, sequential, failures do not stop the run`);
if (DRY) { say("--dry: order and briefs check out, nothing dispatched"); process.exit(0); }

const results = [];
const started = Date.now();
for (const [i, cell] of ORDER.entries()) {
  const [c, r] = cell.split(",");
  const id = `c${c}-${r}`;
  const biome = def.cellBiomes[cell];
  const t0 = Date.now();
  say(`--- ${i + 1}/${ORDER.length}  ${id}  ${biome}`);

  const run = spawnSync(process.execPath, [
    "tools/world-authoring/cell.mjs",
    "--territory", TERRITORY,
    "--cell", cell,
    "--describe-file", `${BRIEFS}/${id}.md`,
  ], { encoding: "utf8", maxBuffer: 1 << 28 });

  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  fs.appendFileSync(LOG, out + "\n");
  // Re-running this script after an interruption must not report finished work
  // as failure: cell.mjs refuses an already-authored cell, which is the correct
  // behaviour and the reason re-running is safe.
  const already = /already authored/.test(out);
  const ok = already || (run.status === 0 && /accepted, stitched/.test(out));
  results.push({ cell, id, biome, ok, already, mins });

  if (already) {
    say(`    already authored — skipped`);
  } else if (ok) {
    say(`    ACCEPTED in ${mins} min`);
    // Commit each accepted cell on its own: the tiles and sources are large,
    // and an interrupted night should leave every finished cell landed rather
    // than one enormous uncommitted pile.
    spawnSync("git", ["add", "-A"], { encoding: "utf8" });
    const msg = `Tanium ${id}: ${biome}\n\nBaked unattended from `
      + `art-source/career-world/l2-land/tanium/briefs/${id}.md, gates passed, `
      + `stitched into the l2-tanium-r1 pyramid.\n\n`
      + `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`;
    const commit = spawnSync("git", ["commit", "-q", "-m", msg], { encoding: "utf8" });
    if (commit.status !== 0) say(`    (commit said: ${(commit.stdout || commit.stderr || "").trim().slice(0, 120)})`);
  } else {
    const why = out.split("\n").filter((l) => /FAIL|refus|Error|die|gate/i.test(l)).slice(-4).join(" | ");
    say(`    FAILED after ${mins} min — world untouched. ${why.slice(0, 300)}`);
    // Keep the rejected art. The gates leaving the world untouched is right,
    // but .codex-tmp is gitignored, and the candidate is the only evidence for
    // whether the gate was correct to refuse it. A rejected cell nobody ever
    // sees cannot be ruled on.
    keepReject(id, biome, out);
  }
}

const ok = results.filter((r) => r.ok);
say(`\n=== done in ${((Date.now() - started) / 3600000).toFixed(1)} h — ${ok.length} of ${results.length} accepted`);
for (const r of results) say(`  ${r.already ? "skip" : r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(6)} ${r.biome.padEnd(17)} ${r.mins} min`);
if (ok.length < results.length) {
  say(`\nthe failures left the world untouched; re-run one with:`);
  say(`  node tools/world-authoring/cell.mjs --territory ${TERRITORY} --cell C,R --describe-file ${BRIEFS}/cC-R.md`);
}
fs.writeFileSync(`.codex-tmp/bake-${TERRITORY}-results.json`, JSON.stringify(results, null, 1));
