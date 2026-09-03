import fs from "node:fs";
const [suiteResult, commitHash] = process.argv.slice(2);
if (!suiteResult || !commitHash) throw new Error("usage: splice-r090.mjs <suite result e.g. 17/17> <commit hash>");
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R090")) { const k = "## Findings backlog"; const i = t.indexOf(k);
    const body = fs.readFileSync(".codex-tmp/session3/r090.md", "utf8").replace("SUITE_RESULT", suiteResult).replace("COMMIT_HASH", "`" + commitHash + "`");
    t = t.slice(0, i) + body + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R090 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**BAKES ON HOLD until lock change 6 has\nthe owner's word:** every remaining cell is a biome change against an\nauthored neighbour, and the stark-seam class (R088) is not gated yet.\nLock change 6 is staged and anchor-verified\n(`.codex-tmp/session3/apply-lock6.mjs --check`): (6a) the palette gate on\nALL land, tone dLuma `> 20` fails, with a +30-luma synthetic control; (6b)\nthe neighbour's edge tone blended into the edit target's grey across the\nouter third, with a dry-run control on the ramp and the grey beyond it.";
  const repl = `**LOCK CHANGE 6 LANDED** (owner "lock that down… go with that change";
R090; suite \`${suiteResult}\`; commit \`${commitHash}\`): (6a) the palette gate on ALL
land, tone dLuma \`> 20\` fails; (6b) the neighbour's edge tone blended into
the edit target's grey from full strength where the grey begins (256 px in,
past the bleed) to flat grey a third in. Bakes resume: **1,3 fourth attempt
DISPATCHED** on \`brief-c1-3-r4.md\` (a low-rock landform: shingle and sand
shores, grassy slopes over rounded rock, no columns, terraces or pavements;
the layout of candidates 2–3 kept) — the first bake with the ramp; measure
its seams on all land first. A suite-level lock on the test world is queued
(6d, tests only).`;
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: lock change 6 recorded"); } else if (t.includes("LOCK CHANGE 6 LANDED")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i24 = lines.findIndex((l) => l.startsWith("| 24 |"));
  if (i24 >= 0) lines[i24] = "| 24 | \"The seams are stark here… Need a better transition\" / \"lock that down\" (1,3 candidate 3) | LANDED as lock change 6 (R090): all-land tone gate at 20 + the tone ramp in the edit target; 1,3's fourth attempt is the first bake with it |";
  if (!lines.some((l) => l.startsWith("| 25 |"))) lines.splice(i24 + 1, 0, "| 25 | \"this landscape is fucking awesome… best results we have had this entire project\" | RECORDED: the owner's acceptance of the register and the ten-cell world as of 2026-09-02 |");
  fs.writeFileSync(p, lines.join("\n")); console.log("state: rows 24-25"); }
