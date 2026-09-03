import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R103")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r103.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R103 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**1,0 the bare plateau DISPATCHED** (`brief-c1-0.md`, the\ncrater tarn and the column altar; 0,0's east edge dry; 1,1 and 2,0 not yet\nauthored; log `.codex-tmp/session3/regen-c1-0.log`).";
  const repl = "**1,0 the bare plateau, first attempt REJECTED by rock lighting alone**\n(R103: `0.171` on 49,841 strong edges — lit bench tops; seams `0.8`, the\ncrater tarn present); **attempt 2 DISPATCHED** on `brief-c1-0-r2.md` (the\nlit rock named, one flat value per face verbatim, bench edges that wander,\nthe altar as weather-made rock; log after `rebake2-start`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 1,0 attempt 1 recorded"); } else if (t.includes("1,0 the bare plateau, first attempt REJECTED")) console.log("state: present"); else throw new Error("state anchor missing");
  fs.writeFileSync(p, t); }
