import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R102")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r102.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R102 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**0,0 the moor with\nthe shepherd's fold DISPATCHED** (`brief-c0-0.md`; 0,1's north edge dry;\nlog `.codex-tmp/session3/regen-c0-0.log`).";
  const repl = "**0,0 the moor with\nthe shepherd's fold ACCEPTED first attempt** (R102, commit `1b741c2`:\nseam tone `13.0`, veg `0.080`, the hollow unmistakable, `120` tiles; a small\npool touches its south edge, the owner's eye at the seam). **SEVENTEEN\nCELLS STAND.** **1,0 the bare plateau DISPATCHED** (`brief-c1-0.md`, the\ncrater tarn and the column altar; 0,0's east edge dry; 1,1 and 2,0 not yet\nauthored; log `.codex-tmp/session3/regen-c1-0.log`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 0,0 recorded"); } else if (t.includes("0,0 the moor with\nthe shepherd's fold ACCEPTED")) console.log("state: present"); else throw new Error("state anchor missing");
  fs.writeFileSync(p, t); }
