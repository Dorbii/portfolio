import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R094")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r094.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R094 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**4,0\nREPLACEMENT DISPATCHED** on `brief-c4-0-r2.md` (open soft-edged meadow, a\nnatural draw, nothing that reads as built; log `regen-c4-0.log` after\n`replace-start`);";
  const repl = "**4,0\nREPLACED and ACCEPTED** (R094, commit `e081f82`: key-light `0.0015`, seam\ntone `1.5`, the worker's own check \"road or station strip defect absent\";\ncrowns `49 px`). **0,3 the sound corner DISPATCHED** (`brief-c0-3.md`; the\nsound arrives on 1,3's west edge from 58% down; log\n`.codex-tmp/session3/regen-c0-3.log`);";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 4,0 replacement recorded"); } else if (t.includes("REPLACED and ACCEPTED** (R094")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i27 = lines.findIndex((l) => l.startsWith("| 27 |"));
  if (i27 >= 0) lines[i27] = "| 27 | \"this looks weird\" (4,0: the station strip as a pale graded band, a straight cut, short walls) | CLOSED: cause was my brief's \"strip\" and \"cutting\"; 4,0 replaced on brief-c4-0-r2.md and accepted (R094), the road gone; caution recorded — the land offers open ground and natural draws, never strips, cuttings, corridors or bands |";
  fs.writeFileSync(p, lines.join("\n")); console.log("state: row 27 closed"); }
