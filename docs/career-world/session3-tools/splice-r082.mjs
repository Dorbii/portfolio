import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R082")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r082.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R082 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**2,1 the capital DISPATCHED** (`brief-c2-1.md`: the shelf a third\nof the cell, luminous gold-green, the station strip, the line's ground\nwest-to-east, closed water; log `.codex-tmp/session3/regen-c2-1.log`).";
  const repl = "**2,1 the capital ACCEPTED on all ten gates** (R082: key-light `0.0028`,\nrock lighting `0.038`, `139` tiles, commit `efdbcc7`) — **NINE CELLS\nSTAND** — **but the shelf did not land:** by the worker's own checks and\nby eye (`review/stitched-c2-1-cell-half.png`) the cell is olive moor with\na stream and a pool, no raised table, no brighter meadow, no station\nstrip. No gate measures composition; the owner's eye decides. A forced\nreplacement brief is ready (`brief-c2-1-r2.md`: the shelf as a raised\ntable two steps brighter, bounded by broken terraces, a treeless station\nstrip three crowns wide, the ramps for the line) — director recommends\nreplacing; awaiting the owner's word. **1,3 Vendy shelf on the sound\nDISPATCHED** (`brief-c1-3.md`: the inlet a few crowns wide at the\ncrossing, the director's default pending the owner's choice; log\n`.codex-tmp/session3/regen-c1-3.log`).";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 2,1 result recorded"); } else if (t.includes("2,1 the capital ACCEPTED")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i21 = lines.findIndex((l) => l.startsWith("| 21 |"));
  if (i21 >= 0 && !lines.some((l) => l.startsWith("| 22 |"))) {
    lines.splice(i21 + 1, 0, "| 22 | (director-found) the capital's shelf did not land in 2,1 though every gate passed | OPEN: owner to say replace (brief r2 ready) or keep |");
    t = lines.join("\n"); console.log("state: row 22 added");
  }
  fs.writeFileSync(p, t); }
