import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R097")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r097.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R097 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**3,0 the bare plateau DISPATCHED** (`brief-c3-0.md`, the walk-under arch;\n3,1's north and 4,0's west edges dry; log `.codex-tmp/session3/regen-c3-0.log`).";
  const repl = "**3,0 the bare plateau ACCEPTED first attempt** (R097, commit `71a74f1`:\nkey-light `0.0003`, rock lighting `0.114`, seam tone `4.1` over two seams,\nthe walk-under arch legible, crowns `73 px`; the worker flags repeated\ncolumns on long bench walls for the owner's eye). **FOURTEEN CELLS STAND.**\n**2,0 attempt 2 DISPATCHED** (`brief-c2-0-r2.md`; log `regen-c2-0.log`\nafter `rebake2-start`). Remaining: 1,1 (after lock change 7), 0,2 (brief\nready), 1,0, 0,1, 0,0 (briefs after their neighbours land).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 3,0 recorded"); } else if (t.includes("3,0 the bare plateau ACCEPTED")) console.log("state: present"); else throw new Error("state anchor missing");
  fs.writeFileSync(p, t); }
