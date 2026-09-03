import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R100")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r100.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R100 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**2,0 attempt 3 DISPATCHED** on the reframed `brief-c2-0-r3.md` (log after\n`rebake3-start`; strike three parks the cell).";
  const repl = "**2,0 attempt 3 REJECTED by the two lighting gates only** (R100:\nkey-light `0.0117`, rock lighting `0.189`; the reframe fixed both seams\n(`5.7`), the water and the composition; the lit rock is the east third's\nplateau benches, not the forest floor — tested). **2,0 PARKED after three\nstrikes — OWNER CALL:** accept candidate 3 by eye with a recorded\nexception, a fourth attempt with the east benches explicitly flat-shaded,\nor leave it. **0,1 the Metrics-Service shelf DISPATCHED** (`brief-c0-1.md`;\nlog `.codex-tmp/session3/regen-c0-1.log`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 2,0 parked recorded"); } else if (t.includes("2,0 PARKED after three")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i29 = lines.findIndex((l) => l.startsWith("| 29 |"));
  if (i29 >= 0 && !lines.some((l) => l.startsWith("| 30 |"))) { lines.splice(i29 + 1, 0, "| 30 | (director-found) 2,0 the dark-forest gorge parked after three lighting strikes; seams and composition right on the third | OPEN: owner's call — accept by eye / fourth attempt with flat-shaded east benches / leave |"); t = lines.join("\n"); console.log("state: row 30 added"); }
  fs.writeFileSync(p, t); }
