import fs from "node:fs";
const [worldCommit] = process.argv.slice(2);
if (!worldCommit) throw new Error("usage: splice-r109.mjs <world commit hash>");
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R109")) { const k = "## Findings backlog"; const i = t.indexOf(k);
    const body = fs.readFileSync(".codex-tmp/session3/r109.md", "utf8").replace("WORLD_COMMIT", "`" + worldCommit + "`");
    t = t.slice(0, i) + body + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R109 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const a = "Next:\nlock change 8 (the two limits), then `--redo` 2,0 candidate 4.";
  const r = `**LOCK CHANGE 8 LANDED** (\`976743f2\`, rock \`0.16\`, tone \`21\`, suite 20/20)\nand **2,0 LANDED by \`--redo\` of candidate 4** (R109, world commit\n\`${worldCommit}\`): **THE TERRITORY IS 20 OF 20.** Owner's eye pending on 2,0's\nstitched previews. Next: the whole-territory review at reduced zoom (crown\ndrift, tints), the owner's-eye items (regular bench runs, 1,3's dry gully,\n0,0's south-edge pool), then the territory tier of the pyramid.`;
  if (t.includes(a)) { t = t.replace(a, r); console.log("state: 2,0 landed recorded"); } else if (t.includes("THE TERRITORY IS 20 OF 20")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n");
  const i30 = lines.findIndex((l) => l.startsWith("| 30 |"));
  if (i30 >= 0) lines[i30] = "| 30 | \"go ahead and do a 4th for the dark forest\" (2,0) | DONE: attempt 4 landed by `--redo` after lock change 8 recalibrated the two limits on the owner's eye (R109, `" + worldCommit + "`); 20 of 20 |";
  fs.writeFileSync(p, lines.join("\n")); console.log("state: row 30 closed"); }
