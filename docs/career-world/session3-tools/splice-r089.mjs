import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R089")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r089.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R089 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**OWNER RULING (2026-09-02, on 1,3 candidate 3's north seam):";
  const block = `**SESSION 4, EVENING (2026-09-02) — RESUME HERE.** **4,1 the coast headland
ACCEPTED first attempt** (R089: key-light \`0.0007\`, rock lighting \`0.07\`, 6
crossings met, \`130\` tiles, commit \`d06a81c\`); its 4,2 seam reads dLuma
\`5.7\` on all land. **TEN CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 / 2,3 / 2,2 /
3,1 / 1,2 / 2,1 / 4,1). Dev LoD feed regenerated for ten
(\`?landStream=l2dev\`). **1,3 PARKED** (three rock-lighting strikes; owner's
call: accept by eye at \`0.198\`, a fourth attempt on a rock-light landform
after lock change 6b, or leave). **BAKES ON HOLD until lock change 6 has
the owner's word:** every remaining cell is a biome change against an
authored neighbour, and the stark-seam class (R088) is not gated yet.
Lock change 6 is staged and anchor-verified
(\`.codex-tmp/session3/apply-lock6.mjs --check\`): (6a) the palette gate on
ALL land, tone dLuma \`> 20\` fails, with a +30-luma synthetic control; (6b)
the neighbour's edge tone blended into the edit target's grey across the
outer third, with a dry-run control on the ramp and the grey beyond it.
Next cells after it: 1,3 (fourth attempt if the owner wants it), 4,0
Kaizen, 3,0, 2,0, 1,1 the purple field, 0,x the sound coast.

`;
  if (!t.includes("SESSION 4, EVENING")) { t = t.replace(anchor, block + anchor); console.log("state: evening block inserted"); } else console.log("state: present");
  fs.writeFileSync(p, t); }
