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

// The owner's model (gpt-6-astra, 2026-09-04) needs Codex 0.153+. The CLI on
// PATH was 0.149 while the Codex app carried 0.153 in its own bin dir, and the
// first three astra dispatches died in 0.1 min on "requires a newer version".
// So: find every codex on the machine, take the newest, hand it to cell.mjs.
import path from "node:path";
function newestCodex() {
  const cands = ["codex"];
  const bin = path.join(process.env.LOCALAPPDATA || "", "OpenAI", "Codex", "bin");
  if (fs.existsSync(bin)) for (const d of fs.readdirSync(bin)) {
    const f = path.join(bin, d, "codex.exe");
    if (fs.existsSync(f)) cands.push(f);
  }
  let best = "codex", bestV = "";
  for (const c of cands) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    const m = (r.stdout || "").match(/(\d+)\.(\d+)\.(\d+)/);
    if (!m) continue;
    const v = m.slice(1).map((n) => n.padStart(4, "0")).join(".");
    if (v > bestV) { bestV = v; best = c; }
  }
  return { bin: best, version: bestV.split(".").map((s) => String(Number(s))).join(".") };
}
const CODEX = newestCodex();
process.env.CODEX_BIN = CODEX.bin;
// --only c0-1,c1-1   bake just these, in the order given
// --force c4-1,c5-1  replace these even though they are already authored
//
// Order matters for the rune chain: a cell authored after its western neighbour
// gets the groove arriving as PIXELS in its edit target, not just as a
// percentage in prose. West to east is the whole point.
const listArg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
};
const ONLY = listArg("--only");
const FORCE = new Set(listArg("--force"));
// --review        a refused candidate is reviewed by a second Codex job and the
//                 worker gets ONE more attempt with the reviewer's addendum
//                 (owner 2026-09-04: review before the director, cut the cycles)
// --model M       the generation model (cell.mjs reads CELL_MODEL; default astra)
// --effort E      its reasoning effort (CELL_EFFORT; default high)
// REVIEW_MODEL    env, the reviewer's model (default gpt-6-astra)
const REVIEW = process.argv.includes("--review");
const modelArg = listArg("--model")[0], effortArg = listArg("--effort")[0];
if (modelArg) process.env.CELL_MODEL = modelArg;
if (effortArg) process.env.CELL_EFFORT = effortArg;
const REVIEW_MODEL = process.env.REVIEW_MODEL || "gpt-6-astra";
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
if (ONLY.length) {
  // --only takes ids like c0-1; the order given is the order baked
  ORDER.length = 0;
  for (const id of ONLY) {
    const k = id.replace(/^c/, "").replace("-", ",");
    if (!(k in def.cellBiomes)) throw new Error(`--only names ${id}, which is not in the plan`);
    ORDER.push(k);
  }
} else {
  const missing = planned.filter((k) => !ORDER.includes(k));
  if (missing.length) throw new Error(`the run order skips ${missing.join(", ")}`);
  if (ORDER.length !== planned.length) throw new Error(`order has ${ORDER.length} cells, plan has ${planned.length}`);
}
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

function bakeOnce(cell, describeFile, forced, t0) {
  const run = spawnSync(process.execPath, [
    "tools/world-authoring/cell.mjs",
    "--territory", TERRITORY,
    "--cell", cell,
    "--describe-file", describeFile,
    ...(forced ? ["--force"] : []),
  ], { encoding: "utf8", maxBuffer: 1 << 28 });
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  fs.appendFileSync(LOG, out + "\n");
  // Re-running this script after an interruption must not report finished work
  // as failure: cell.mjs refuses an already-authored cell, which is the correct
  // behaviour and the reason re-running is safe.
  const already = /already authored/.test(out);
  const ok = already || (run.status === 0 && /accepted, stitched/.test(out));
  return { run, out, already, ok, mins };
}

// The reviewer sees what the director would see: the candidate small enough
// for its viewer, a strip of every authored neighbour along the shared edge,
// the gate block, the worker's report and the brief — and never a conclusion.
// It answers under fixed headings; section 3 is the addendum the second
// attempt is dispatched with. Everything lands in .codex-tmp/review/<id>-aN/
// where the dialog page picks it up.
function reviewCandidate(id, cell, biome, out) {
  const [c, r] = cell.split(",").map(Number);
  const cellDir = `.codex-tmp/authoring/cells/${TERRITORY}/${id}`;
  let n = 1;
  while (fs.existsSync(`.codex-tmp/review/${id}-a${n}`)) n += 1;
  const dir = `.codex-tmp/review/${id}-a${n}`;
  fs.mkdirSync(dir, { recursive: true });
  const node = (args) => spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  // the candidate at 1024 px (astra's viewer refuses the 2560 px originals)
  node(["-e", `import("sharp").then(s=>s.default(${JSON.stringify(`${cellDir}/${id}-l2.png`)}).resize(1024,1024).png().toFile(${JSON.stringify(`${dir}/candidate-l2-1024.png`)}))`]);
  const webp = `${REJECTS}/${id}.webp`;
  if (fs.existsSync(webp)) fs.copyFileSync(webp, `${dir}/candidate-attempt${n}.webp`);
  // seam strips against every authored orthogonal neighbour
  const strips = [];
  for (const [edge, nc, nr, where] of [["N", c, r - 1, "the neighbour above the line, the candidate below"], ["S", c, r + 1, "the candidate above the line, the neighbour below"], ["W", c - 1, r, "the neighbour left of the line, the candidate right"], ["E", c + 1, r, "the candidate left of the line, the neighbour right"]]) {
    const nb = `c${nc}-${nr}`;
    const nbConcept = `art-source/career-world/l2-land/${TERRITORY}/${nb}/${nb}-concept.png`;
    if (!fs.existsSync(nbConcept)) continue;
    const outPng = `${dir}/seam-${edge}-${nb}.png`;
    const s = node(["docs/career-world/session3-tools/seam-strips.mjs", `${cellDir}/${id}-concept.png`, edge, nbConcept, outPng]);
    if (s.status === 0) strips.push(`  - ${edge === "N" ? "north" : edge === "S" ? "south" : edge === "W" ? "west" : "east"} seam, ${where}: \`${outPng}\``);
  }
  // the gate block, from the first derived/mask line to the verdict
  const lines = out.split("\n");
  const a = lines.findIndex((l) => /^\s{2}(mask|derived|bridge)|^\s{6}(palette|continuity)/.test(l));
  const b = lines.findIndex((l) => /cell NOT accepted/.test(l));
  const gateBlock = a >= 0 && b > a ? lines.slice(a, b + 1).join("\n") : lines.filter((l) => /PASS|FAIL/.test(l)).join("\n");
  const x0 = c * 2048, y0 = r * 2048;
  const packet = `# REVIEW — refused L2 land cell ${id} (${TERRITORY}, ${biome}), attempt ${n}

You are the reviewer in a two-model loop. A worker generated this cell, the
pipeline's gates refused it, and you review the candidate BEFORE the director
sees it, so the second attempt can be dispatched with your notes. Work
quarantine-only: the ONLY file you may write is \`${dir}/codex-review.md\`.
Do not generate images, do not run the pipeline, do not modify any other file.

## The evidence — look at every image with \`view_image\`

- **The brief** the worker was given, verbatim: \`${BRIEFS}/${id}.md\`
- **The candidate**, 1024 px, water already cut out (transparent): \`${dir}/candidate-l2-1024.png\`
- **The candidate as painted**, 768 px: \`${dir}/candidate-attempt${n}.webp\`
- **Seam strips** — the 18 m band either side of a shared edge, the neighbour's real art beside the candidate's, magenta line on the seam:
${strips.join("\n") || "  (no authored neighbour)"}
- **The worker's own report** (its self-checks are honest and worth reading): \`${cellDir}/${id}-report.json\`
- The full-resolution files are in \`${cellDir}/\` if you need a native-pixel crop; read them in memory, write nothing.

## The gate block, verbatim

\`\`\`
${gateBlock}
\`\`\`

How to read a continuity line: positions are territory pixels along the shared
edge; this cell's kept area spans ${x0}-${x0 + 2048} along x (west to east) and
${y0}-${y0 + 2048} along y (north to south), 2048 px = 97.6 m, 4.8 cm per px.
"nearest none" means the neighbour has no water run of 30 px or more within
8 px of that line anywhere. Crossings match by centre within 48 px (2.3 m).
A palette line compares the 16-176 px band inside each side of the seam: all-land
tone median (limit 21) and vegetation median (limits dBG 0.20, dLuma 13).

## What to write — \`${dir}/codex-review.md\`, under EXACTLY these headings

## 1. Why it was refused
The defect(s) in the picture, with positions in percent along the edge or
metres from a corner. Say what you looked at.

## 2. What else is wrong against the brief
Semantic misses no gate measures: a feature drawn as the wrong thing, a rule
ignored, a site missing. Cite the image.

## 3. Addendum for the second attempt
The exact paragraph(s) to append to the brief, at most 140 words, numbers and
instructions only, no reasoning. The worker reads it as part of the same
brief. Where the gate and the neighbour's paint disagree, tell the worker what
the GATE will accept — the gate is the arbiter until the director changes it.

## 4. Problems in the brief itself
Anything contradictory or misleading.

## 5. Confidence
One line, and the one measurement that would confirm or refute your read.

Keep the whole file under 700 words.
`;
  fs.writeFileSync(`${dir}/review-packet.md`, packet);
  const rv = spawnSync(CODEX.bin, ["exec", "--sandbox", "workspace-write", "-c", `model=${REVIEW_MODEL}`, "-c", "model_reasoning_effort=high", packet],
    { encoding: "utf8", maxBuffer: 1 << 26, input: "" });
  fs.writeFileSync(`${dir}/codex.log`, `${rv.stdout ?? ""}${rv.stderr ?? ""}`);
  const reviewFile = `${dir}/codex-review.md`;
  if (!fs.existsSync(reviewFile)) { say(`    reviewer wrote nothing (exit ${rv.status}) — see ${dir}/codex.log`); return null; }
  const review = fs.readFileSync(reviewFile, "utf8").replace(/\r\n/g, "\n");
  const m = review.match(/^##\s*3\.[^\n]*\n([\s\S]*?)(?=^##\s*\d\.|\s*$)/m);
  const addendum = m ? m[1].trim() : "";
  if (!addendum) { say(`    reviewer gave no addendum — see ${reviewFile}`); return null; }
  const why = (review.match(/^##\s*1\.[^\n]*\n([\s\S]*?)(?=^##)/m) || [])[1] || "";
  const summary = why.trim().split("\n").find((l) => l.trim()) || "(no summary)";
  const brief = fs.readFileSync(`${BRIEFS}/${id}.md`, "utf8").replace(/\r\n/g, "\n");
  const brief2 = `${dir}/brief-attempt2.md`;
  fs.writeFileSync(brief2, `${brief.trimEnd()}

---

**SECOND ATTEMPT.** The first candidate was refused by the gates, and a
reviewer compared it with this brief and with the neighbours' art. Everything
above still holds. In addition, do exactly this:

${addendum}
`);
  return { addendum, summary: summary.slice(0, 200), brief2 };
}

say(`bake ${TERRITORY}: ${ORDER.length} cells, sequential, failures do not stop the run`);
if (REVIEW) say(`review-and-retry ON: reviewer ${REVIEW_MODEL}, generation ${process.env.CELL_MODEL || "(cell.mjs default)"} at ${process.env.CELL_EFFORT || "high"}`);
say(`codex ${CODEX.version} at ${CODEX.bin}`);
if (DRY) { say("--dry: order and briefs check out, nothing dispatched"); process.exit(0); }

const results = [];
let instant = 0;                      // consecutive sub-30s failures
const started = Date.now();
for (const [i, cell] of ORDER.entries()) {
  const [c, r] = cell.split(",");
  const id = `c${c}-${r}`;
  const biome = def.cellBiomes[cell];
  const t0 = Date.now();
  say(`--- ${i + 1}/${ORDER.length}  ${id}  ${biome}`);

  const forced = FORCE.has(id);
  let { out, already, ok, mins } = bakeOnce(cell, `${BRIEFS}/${id}.md`, forced, t0);
  let attempts = 1;
  // Review-and-retry: a refused candidate goes to a reviewer before anyone
  // else sees it, and the worker gets ONE more attempt with the reviewer's
  // addendum appended to the same brief. A dispatch failure (no candidate)
  // is not reviewed — there is nothing to look at.
  if (REVIEW && !ok && !already && fs.existsSync(`.codex-tmp/authoring/cells/${TERRITORY}/${id}/${id}-l2.png`)) {
    say(`    refused after ${mins} min — sending the candidate to the reviewer (${REVIEW_MODEL})`);
    keepReject(id, biome, out);
    const rv = reviewCandidate(id, cell, biome, out);
    if (rv) {
      say(`    reviewer: ${rv.summary}`);
      say(`    second attempt with the addendum (${rv.addendum.split(/\s+/).length} words) -> ${rv.brief2}`);
      const t1 = Date.now();
      ({ out, already, ok, mins } = bakeOnce(cell, rv.brief2, forced, t1));
      attempts = 2;
    }
  }
  results.push({ cell, id, biome, ok, already, mins, attempts });

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
    // Fall back to the tail of the output when nothing matches: a run once
    // failed all 21 cells in nine seconds against a stale lockfile and reported
    // an EMPTY reason every time, because "another run holds the lock" matches
    // none of these words. A failure with no stated reason is a failure you
    // cannot act on.
    const why = out.split("\n").filter((l) => /FAIL|refus|Error|die|gate|lock/i.test(l)).slice(-4).join(" | ")
      || out.trim().split("\n").slice(-3).join(" | ")
      || "(no output at all)";
    say(`    FAILED after ${mins} min — world untouched. ${why.slice(0, 300)}`);
    // Nine seconds is not a bake. If several cells fail that fast, something is
    // wrong with the run itself rather than with the art, and grinding through
    // the rest wastes the night.
    if (Number(mins) < 0.5) instant += 1; else instant = 0;
    if (instant >= 3) {
      say(`\n!! three cells failed in under 30 s each — this is the run, not the art.`);
      say(`   Check for a stale lock at .codex-tmp/authoring/cell.lock and re-run.`);
      break;
    }
    // Keep the rejected art. The gates leaving the world untouched is right,
    // but .codex-tmp is gitignored, and the candidate is the only evidence for
    // whether the gate was correct to refuse it. A rejected cell nobody ever
    // sees cannot be ruled on.
    keepReject(id, biome, out);
  }
}

const ok = results.filter((r) => r.ok);
say(`\n=== done in ${((Date.now() - started) / 3600000).toFixed(1)} h — ${ok.length} of ${results.length} accepted`);
for (const r of results) say(`  ${r.already ? "skip" : r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(6)} ${r.biome.padEnd(17)} ${r.mins} min${r.attempts === 2 ? " (2nd attempt, after review)" : ""}`);
if (ok.length < results.length) {
  say(`\nthe failures left the world untouched; re-run one with:`);
  say(`  node tools/world-authoring/cell.mjs --territory ${TERRITORY} --cell C,R --describe-file ${BRIEFS}/cC-R.md`);
}
fs.writeFileSync(`.codex-tmp/bake-${TERRITORY}-results.json`, JSON.stringify(results, null, 1));
