import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R088")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r088.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R088 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**SESSION 4, AFTERNOON (2026-09-02) — RESUME HERE.**";
  const block = `**OWNER RULING (2026-09-02, on 1,3 candidate 3's north seam): "The seams
are stark here, assuming because its a new biome. Need a better
transition."** Measured (R088, \`tone-seam.mjs\`): the palette gate skipped
that seam ("no vegetated seams" — olive moor is not green to its
classifier) while the all-land luma step reads \`24.5\` against \`2.3–17.4\` on
every accepted seam. **LOCK CHANGE 6 PROPOSED** (\`next-lock-change.md\`,
awaiting the owner's word): (6a) the palette gate on ALL land, dLuma \`> 20\`
fails; (6b) the neighbour's edge tone blended into the edit target's grey
across the outer third so the transition is given as pixels, not words;
(6c) the seam-step gate. 1,3's fourth attempt, if the owner wants one,
should wait for 6b.

`;
  if (!t.includes("OWNER RULING (2026-09-02, on 1,3 candidate 3")) { t = t.replace(anchor, block + anchor); console.log("state: seam ruling recorded"); } else console.log("state: present");
  const lines = t.split("\n"); const i23 = lines.findIndex((l) => l.startsWith("| 23 |"));
  if (i23 >= 0 && !lines.some((l) => l.startsWith("| 24 |"))) { lines.splice(i23 + 1, 0, "| 24 | \"The seams are stark here… Need a better transition\" (1,3 candidate 3) | MEASURED (R088): a gate blind spot (vegetation-only medians) and a transition the words did not place; lock change 6 proposed (all-land tone gate + a tone ramp in the target) — owner's word pending |"); t = lines.join("\n"); console.log("state: row 24 added"); }
  fs.writeFileSync(p, t); }
