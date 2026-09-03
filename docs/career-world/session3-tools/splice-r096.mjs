import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R096")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r096.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R096 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**2,0 the dark-forest gorge\nDISPATCHED** (`brief-c2-0.md`, the mill ledge; 2,1's north edge dry; log\n`.codex-tmp/session3/regen-c2-0.log`).";
  const repl = "**2,0 the dark-forest gorge, first attempt REJECTED by a hair on two\ngates** (R096: rock lighting `0.155`, and the new all-land tone gate at\n`20.0` — the forest painted to the line against the capital's moor, the\nneighbour's own bleed re-rendered darker; profile `74/80/80` vs\n`58/59/57`); re-bake queued on `brief-c2-0-r2.md` (the south third as open\nmoor at the ARRIVING brightness, walls uncapped, one water system).\n**3,0 the bare plateau DISPATCHED** (`brief-c3-0.md`, the walk-under arch;\n3,1's north and 4,0's west edges dry; log `.codex-tmp/session3/regen-c3-0.log`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 2,0 attempt 1 recorded"); } else if (t.includes("2,0 the dark-forest gorge, first attempt REJECTED")) console.log("state: present"); else throw new Error("state anchor missing");
  fs.writeFileSync(p, t); }
