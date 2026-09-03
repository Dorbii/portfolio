import fs from "node:fs";
const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
const a1 = "every\ngate green; owner's eye pending on `review/regen-c1-1-st-*.png`)";
const r1 = "every\ngate green; **owner's eye: \"those transitions look fine\"** on the stitched\nseams)";
if (t.includes(a1)) { t = t.replace(a1, r1); console.log("state: 1,1 owner acceptance recorded"); } else if (t.includes("those transitions look fine")) console.log("state: present"); else throw new Error("anchor missing");
const lines = t.split("\n"); const i32 = lines.findIndex((l) => l.startsWith("| 32 |")); const has33 = lines.some((l) => l.startsWith("| 33 |"));
if (i32 >= 0 && !has33) lines.splice(i32 + 1, 0, "| 33 | \"those transitions look fine, not gonna get a smooth one with all that purple\" (the purple field's four seams) | DONE: 1,1 accepted by the owner's eye; stays as committed (`6f1577cc`) |");
fs.writeFileSync(p, lines.join("\n")); console.log("state: row 33 written");
