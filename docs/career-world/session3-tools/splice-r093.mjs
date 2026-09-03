import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R093")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r093.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R093 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**SESSION 4, EVENING (2026-09-02) — RESUME HERE.**";
  const block = `**SESSION 4, LATE (2026-09-02) — RESUME HERE.** Twelve cells stand.
**Owner rejected 4,0's drawn station strip by eye** ("this looks weird";
my brief asked for a "strip" and a "cutting" as geometry) — **4,0
REPLACEMENT DISPATCHED** on \`brief-c4-0-r2.md\` (open soft-edged meadow, a
natural draw, nothing that reads as built; log \`regen-c4-0.log\` after
\`replace-start\`); 2,1's strip stays by the owner's word (the city covers
it). **1,1 the purple field, first attempt REJECTED on a gate defect**
(R093): the water tools' "blue-leaning" test reads violet ground as water
— fringe \`14.35% / 16.67%\`, growth \`+31,976 px\` into the purple; with a
hue window (150–225) the rings read \`0.12 / 0.03%\`, accepted cells
unchanged. **LOCK CHANGE 7 proposed and staged** (\`apply-lock7.mjs\`
--check ok): one \`isWaterPaint\` with the hue window for both rings and the
growth; control: a violet annulus beside a water disc is neither fringe nor
grown into. Awaiting the owner's word. The candidate also drew a bare-soil
path and ran purple to the seams; \`brief-c1-1-r2.md\` is ready (no line of
any kind; the outer thirds as the moor; the knoll north-west). A chroma
term in the tone gate (7b) is the candidate for hue seams the luma gate
cannot see. Order after the owner's word: land 7 → 1,1 attempt 2 → 0,3 →
2,0 → 3,0 (after the 4,0 replacement) → 0,2 → 1,0 → 0,1 → 0,0.

`;
  if (!t.includes("SESSION 4, LATE (2026-09-02)")) { t = t.replace(anchor, block + anchor); console.log("state: late block inserted"); } else console.log("state: present");
  const lines = t.split("\n"); const i28 = lines.findIndex((l) => l.startsWith("| 28 |"));
  if (i28 >= 0 && !lines.some((l) => l.startsWith("| 29 |"))) { lines.splice(i28 + 1, 0, "| 29 | (director-found) the purple field reads as water to the fringe rings and the mask growth | lock change 7 staged (hue window on the water test) — owner's word pending; then 1,1 attempt 2 on brief r2 |"); t = lines.join("\n"); console.log("state: row 29 added"); }
  fs.writeFileSync(p, t); }
{ const q = ".codex-tmp/session3/next-lock-change.md"; let u = fs.readFileSync(q, "utf8");
  if (!u.includes("# Lock change 7")) { u += `

# Lock change 7 (proposed 2026-09-02) — the water-paint test gets a hue window (R093)

## 7a. isWaterPaint with hue 150..225 — cell.mjs — STAGED (\`apply-lock7.mjs\`)

The fringe rings and the mask growth call any saturated pixel with b > r and
b >= g "water"; violet ground (hue 240-300) qualifies, so the purple field
read 14-17% fringe and the growth ate 32k px of it. One shared test with a
cyan-to-blue hue window; accepted cells unchanged (1,3 0/0, 4,2 0.09/0.06,
3,1's real water still flagged). Control: a violet annulus beside a water
disc is neither fringe nor grown into; the blue-ring control still fails.

## 7b. A chroma term in the all-land tone gate — cell.mjs (candidate)

The luma-only tone gate read 7.3 across a seam where the hue flips from
olive to violet. Add a chroma distance (median r-g and b-g, or hue/sat) with
its own limit, calibrated on the accepted seams; the purple field's edge is
meant to be inside the cell, not on it, so the gate should see it.
`; fs.writeFileSync(q, u); console.log("draft: lock change 7 added"); } else console.log("draft: present"); }
