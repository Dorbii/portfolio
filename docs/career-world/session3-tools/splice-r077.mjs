import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R077")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r077-079.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R077-R079 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**SESSION 4 (2026-09-02) — RESUME HERE.**";
  const block = `**SESSION 4, LATER (2026-09-02, owner online) — RESUME HERE.** The owner
overruled the 3,1 rejection ("way too harsh… just fix that water issue…
all of these look pretty great"; the fall and pool "perfectly fine") and
the director landed **lock change 5 part 1** on it (R077; lock history
before/after; suite \`16/16\`; hash gate intact; commit \`6f2e14c\`): (a) the
suite's working dir follows \`L2_OUT_ROOT\` and the suite asserts the real
cells' dirs untouched; (b) **mask completion by bounded growth** (48 px
into contiguous painted water, speckle holes ≤64 px, bridge bands exempt,
before the cut — a gate-table row and a ledger field); (c) **palette limit
\`0.20\`** on the owner's eye (fine \`0.109/0.189\`, clash \`0.218/0.294\`).
Then **3,1 candidate 3 was re-derived and ACCEPTED** (R079): mask
completion \`+3,880 px\`, fringe \`0.54% / 0.89%\`, palette \`0.189\`, \`156\`
tiles, commit \`272f614\`. **SEVEN CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 /
2,3 / 2,2 / 3,1). The real stitched seam reads clean at 1:1
(\`review/stitched-c3-1-*\`). **Lineage probe (R078, owner-authorised):**
the built-in edit call ACCEPTS the canon as a second input image; with it,
1,2's key-light moment reads \`0.0093\` (under the gate) against
\`0.019–0.020\` for the two pipeline attempts, seam-band fidelity \`r 0.759\`
(attempts \`0.84–0.88\`; the edit path was adopted at \`0.74\`). **Lock change
5 part 2 proposed and staged** (\`.codex-tmp/session3/apply-lock5-part2.mjs\`
+ a dry-run control): every edit-mode packet mandates the canon source as
the second input of the single edit call with the reference paragraph
verbatim. Needs the owner's word; then 1,2's third attempt is the first
real bake on it. The lock record needs the owner's keystroke when the
classifier blocks the director (it allowed the two records today after the
owner's explicit instruction). Next cells by adjacency after 1,2: 4,1
(brief ready: \`brief-c4-1.md\`), then 2,1 the capital.

`;
  if (!t.includes("SESSION 4, LATER")) { t = t.replace(anchor, block + anchor); console.log("state: later block inserted"); } else console.log("state: present");
  const lines = t.split("\n"); const i = lines.findIndex((l) => l.startsWith("| 16 |"));
  if (i >= 0 && !lines.some((l) => l.startsWith("| 17 |"))) {
    lines[lines.findIndex((l) => l.startsWith("| 14 |"))] = "| 14 | \"youre being way too harsh… just fix that water issue… all of these look pretty great\" (3,1 candidate 3) | CLOSED: lock change 5 part 1 landed (mask completion, palette `0.20`, suite isolation); candidate 3 re-derived and stitched (`272f614`) |";
    lines[lines.findIndex((l) => l.startsWith("| 16 |"))] = "| 16 | \"you can run it thats fine\" / \"got this but you can run it idc\" (the lock record) | CLOSED: both records made by the director on the owner's instruction after his own run hit the wrong checkout |";
    lines.splice(i + 1, 0, "| 17 | \"go ahead and run the probe if you need it\" | CLOSED: probe run (R078) — two-image edit accepted, key light halved; part 2 staged for the owner's word |");
    t = lines.join("\n"); console.log("state: rows 14/16 closed, 17 added");
  }
  fs.writeFileSync(p, t); }
{ const q = ".codex-tmp/session3/next-lock-change.md"; let u = fs.readFileSync(q, "utf8");
  if (!u.includes("PART 1 LANDED")) {
    u = u.replace("# Lock change 5 (draft, 2026-09-02) — owner approval needed BEFORE any edit",
      "# Lock change 5 (2026-09-02)\n\n> PART 1 LANDED 2026-09-02 (5a, 5b, the palette limit 0.20; suite 16/16; commit `6f2e14c`).\n> PART 2 STAGED (`apply-lock5-part2.mjs`): the canon as the second input of the edit call — probe R078:\n> key light `0.0093` vs `0.019–0.020`, band fidelity `0.759` vs `0.84–0.88`. Needs the owner's word.\n> Still open below: 5c seam-step gate, 5d vocabulary lines, 5e crown report, 5g parked.");
    fs.writeFileSync(q, u); console.log("draft marked");
  } else console.log("draft already marked"); }
