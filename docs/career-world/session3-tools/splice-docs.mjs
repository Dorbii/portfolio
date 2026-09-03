import fs from "node:fs";
// 1. ledger
{
  const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (t.includes("### R071")) console.log("ledger: already spliced");
  else { const k = "## Findings backlog"; const i = t.indexOf(k); if (i < 0) throw new Error("ledger anchor missing");
    t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r071-073.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: spliced R071-R073"); }
}
// 2. STATE
{
  const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  if (t.includes("SESSION 4 (2026-09-02)")) console.log("state: block already present");
  else { const k = "**IMMEDIATE NEXT ACTIONS, in order (as of the end of session 3):**"; const i = t.indexOf(k); if (i < 0) throw new Error("state anchor missing");
    t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/state-session4-block.md", "utf8") + t.slice(i); console.log("state: block inserted"); }
  const row12 = t.split("\n").findIndex((l) => l.startsWith("| 12 |"));
  if (row12 < 0) throw new Error("row 12 missing");
  const lines = t.split("\n");
  if (!lines.some((l) => l.startsWith("| 13 |"))) {
    lines.splice(row12 + 1, 0,
      "| 13 | \"close but a few seam issues\" (3,1 candidate 2 crops) | OPEN: attempt 3 holds the wall's drum size across the line; the haze step is now a mild tone line (`dBG 0.189` vs `0.18`); owner rules on candidate 3's 1:1 seam or approves lock change 5 before a fourth attempt |",
      "| — | director-found: the control suite shares the real working dirs | FIXED for 4,3 (R073, `97eb0d6`); WORK relocation is lock change 5a |",
      "| — | director-found: fringe rejections are mask tracing, not art (four candidates) | lock change 5b: mask completion by bounded growth |");
    console.log("state: rows 13 and two director-found rows added");
  } else console.log("state: rows already present");
  fs.writeFileSync(p, lines.join("\n"));
}
