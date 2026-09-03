import fs from "node:fs";
const [restitchResult, worldCommit] = process.argv.slice(2);
if (!restitchResult || !worldCommit) throw new Error("usage: splice-r108.mjs <restitch result> <world commit hash>");
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R108")) { const k = "## Findings backlog"; const i = t.indexOf(k);
    const body = fs.readFileSync(".codex-tmp/session3/r108.md", "utf8")
      .replace("SUITE_RESULT", "`20/20` with the change (three new controls); on the pipeline as it was, the three failed as designed and three mask controls failed by cascade from the manifest control's cleanup not running")
      .replace("RESTITCH_RESULT", restitchResult + "; world commit `" + worldCommit + "`");
    t = t.slice(0, i) + body + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R108 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const a = "**RESTITCH OF THE 19 ACCEPTED CELLS IN PROGRESS**\n(`.codex-tmp/session3/restitch-world.sh`, log `restitch-world.log`); then\nthe dev feed, after-strips at every seam for the owner's eye, R108. Lock\nchange 8 (the two limits) follows, then `--redo` 2,0 candidate 4.";
  const r = `**The 19 accepted cells RESTITCHED** on the new seams (R108; world commit\n\`${worldCommit}\`; dev feed regenerated; before/after strips at every seam in\n\`review/seams-compare-{vertical,horizontal}.png\` for the owner's eye). Next:\nlock change 8 (the two limits), then \`--redo\` 2,0 candidate 4.`;
  if (t.includes(a)) { t = t.replace(a, r); console.log("state: restitch recorded"); } else if (t.includes("RESTITCHED** on the new seams")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i = lines.findIndex((l) => l.startsWith("| 32 |"));
  if (i >= 0) lines[i] = "| 32 | \"the seam on this one is too noticeable\" / \"trees and other features are legit cut in half\" (strip of the 2,0 candidate-4 west seam against 1,0) | LANDED as lock change 9, content-aware seams (`54927a8c`, suite 20/20) and the world restitched (`" + worldCommit + "`); before/after strips at every seam sent for the owner's eye |";
  fs.writeFileSync(p, lines.join("\n")); console.log("state: row 32 updated"); }
