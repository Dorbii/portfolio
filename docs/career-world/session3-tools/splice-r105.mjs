import fs from "node:fs";
const [suiteResult, commitHash] = process.argv.slice(2);
if (!suiteResult || !commitHash) throw new Error("usage: splice-r105.mjs <suite result> <commit hash>");
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R105")) { const k = "## Findings backlog"; const i = t.indexOf(k);
    const body = fs.readFileSync(".codex-tmp/session3/r105.md", "utf8").replace("SUITE_RESULT", suiteResult).replace("COMMIT_HASH", "`" + commitHash + "`");
    t = t.slice(0, i) + body + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R105 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "1,1 the purple field (lock\nchange 7 staged and anchor-verified: the hue window on the water test;\nthen `brief-c1-1-r2.md`)";
  const repl = `1,1 the purple field (**LOCK CHANGE 7 LANDED** — owner "go"; R105; suite \`${suiteResult}\`; commit \`${commitHash}\`: the hue window on the water test for both rings and the growth; **1,1 attempt 2 is next on the lock** on \`brief-c1-1-r2.md\`)`;
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: lock change 7 recorded"); } else if (t.includes("LOCK CHANGE 7 LANDED")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i31 = lines.findIndex((l) => l.startsWith("| 31 |"));
  if (i31 >= 0) lines[i31] = "| 31 | \"so whats the ask here? Cant we just manually pass it?\" / \"go\" (the purple field and lock change 7) | LANDED as lock change 7 (R105): the hue window on the water test; 1,1's second attempt follows |";
  fs.writeFileSync(p, lines.join("\n")); console.log("state: row 31 closed"); }
{ const q = ".codex-tmp/session3/next-lock-change.md"; let u = fs.readFileSync(q, "utf8");
  u = u.replace("# Lock change 7 (proposed 2026-09-02) — the water-paint test gets a hue window (R093)", `# Lock change 7 (LANDED 2026-09-02, commit ${commitHash}, suite ${suiteResult}) — the water-paint test gets a hue window (R093)`);
  u = u.replace("## 7a. isWaterPaint with hue 150..225 — cell.mjs — STAGED (`apply-lock7.mjs`)", "## 7a. isWaterPaint with hue 150..225 — cell.mjs — LANDED");
  fs.writeFileSync(q, u); console.log("draft marked"); }
