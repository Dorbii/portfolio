import fs from "node:fs";
const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
const lines = t.split("\n");
const i13 = lines.findIndex((l) => l.startsWith("| 13 |"));
if (i13 >= 0 && !lines[i13].includes("CLOSED")) {
  lines[i13] = "| 13 | \"close but a few seam issues\" (3,1 candidate 2 crops) | CLOSED 2026-09-02: candidate 3 stitched; owner on the stitched 3,1 and 2,2 sets: \"The images and seams look good to me!\" — the 2,2 east-third escarpment stands too |";
}
if (!lines.some((l) => l.startsWith("| 18 |"))) {
  const i17 = lines.findIndex((l) => l.startsWith("| 17 |"));
  lines.splice(i17 + 1, 0,
    "| 18 | \"sure you can make it the default if its been working\" (two-image edit call) | LANDED as lock change 5 part 2 (R080): every edit-mode packet mandates the canon as the second input of the single edit call; 1,2's third attempt is the first real bake on it |",
    "| 19 | \"Can I see what cells in the territory grid we have finished?\" | ANSWERED: `review/territory-grid-status.png` (grid-status.mjs renders it from the ledger and the L3 tiles) — 7 of 20 |");
}
fs.writeFileSync(p, lines.join("\n")); console.log("state: rows 13 closed, 18-19 added");
