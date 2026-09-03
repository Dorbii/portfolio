import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R106")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r106.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R106 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "2,0 the dark-forest gorge (parked after three\nlighting strikes with seams and composition right: accept candidate 3 by\neye / a fourth attempt with the east benches flat-shaded / leave).";
  const repl = "2,0 the dark-forest gorge (**fourth attempt** on the owner's order, R106:\nrock lighting `0.153` vs `0.15` and the 3,0 seam tone `20.0` vs `20` — both\nwithin the noise of their calibrations; key-light and crowns now pass;\n**OWNER CALL:** recalibrate the two limits on his eye (lock change 8: rock\n`0.16`, tone `21`) and `--redo` candidate 4, or a fifth attempt, or leave\nit). **1,1 the purple field, attempt 2 DISPATCHED** on the four-neighbour\n`brief-c1-1-r3.md` with lock change 7 in place (log `regen-c1-1.log` after\n`rebake2-start`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 2,0 attempt 4 recorded"); } else if (t.includes("fourth attempt** on the owner's order")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i30 = lines.findIndex((l) => l.startsWith("| 30 |"));
  if (i30 >= 0) lines[i30] = "| 30 | \"go ahead and do a 4th for the dark forest\" (2,0) | DONE: attempt 4 missed rock lighting by 0.003 and the plateau seam by 0.0 (R106); owner's call — recalibrate the two limits on his eye and re-derive, a fifth attempt, or leave |";
  fs.writeFileSync(p, lines.join("\n")); console.log("state: row 30 updated"); }
