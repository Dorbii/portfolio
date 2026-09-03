import fs from "node:fs";
const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
const a = "fix to be proposed on the evidence |";
const r = "PROPOSED as lock change 9, content-aware seams (the cut follows the minimum-error path through the two paints; prototype 3-4x less paint disagreement on every seam tried; design in `.codex-tmp/session3/next-lock-change.md`); awaiting the owner's words; 2,0 waits behind it |";
if (t.includes(a)) { fs.writeFileSync(p, t.replace(a, r)); console.log("row 32 updated"); } else if (t.includes("PROPOSED as lock change 9")) console.log("present"); else throw new Error("anchor missing");
