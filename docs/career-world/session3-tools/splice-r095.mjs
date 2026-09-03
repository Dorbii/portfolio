import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R095")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r095.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R095 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**0,3 the sound corner DISPATCHED** (`brief-c0-3.md`; the\nsound arrives on 1,3's west edge from 58% down; log\n`.codex-tmp/session3/regen-c0-3.log`);";
  const repl = "**0,3 the sound corner ACCEPTED first attempt** (R095, commit\n`4c41a40`: seam tone `6.3`, 2 crossings met, crowns `106 px` — the first\ncell at the floor; the worker flags the meadow tone carrying too far into\nthe austere coast). **THIRTEEN CELLS STAND.** **2,0 the dark-forest gorge\nDISPATCHED** (`brief-c2-0.md`, the mill ledge; 2,1's north edge dry; log\n`.codex-tmp/session3/regen-c2-0.log`). `brief-c0-2.md` READY (the sound\nalong the west edge, a wide calm bay in the south-west for the submerged\nrun; 0,3's north edge dry, its sound holding its west edge from 53% down);";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 0,3 recorded"); } else if (t.includes("0,3 the sound corner ACCEPTED")) console.log("state: present"); else throw new Error("state anchor missing");
  fs.writeFileSync(p, t); }
