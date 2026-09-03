import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R076")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r076.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R076 spliced"); } else console.log("ledger: R076 present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**Attempt 2 DISPATCHED** on `brief-c1-2-r2.md` (the emboss named\nexactly, size anchors in crowns; log after `rebake2-start`) — the\nexperiment: do concrete words move the global moment as they moved the\nrock-only one on 3,1? If not, lock change 5h (headroom flag + a canon\nghost in the edit target) is the lever. Candidate 1 at\n`.codex-tmp/session3/rejected/c1-2-cand1/`.";
  const repl = "**Attempt 2 REJECTED on the same gate** (R076): `0.0186 @ 36°`\nfrom `0.021 @ 33°` — the concrete no-lit-side brief moved the emboss by a\ntenth and the direction not at all; crowns recovered to `69 px` once tied\nto the largest arriving crowns; the sheltering outcrop came out as a\nregular column fence. **Two strikes: no third bake under the same\nconditions.** 1,2 waits on a pipeline anchor for the lineage (lock change\n5h): first probe whether the built-in edit call accepts the canon as a\nSECOND input image (packet text only); failing that, ghost the canon's\npaint into the target's grey at low opacity. One owner-authorised probe\nrun outside the pipeline decides it (measure the moment and the seam\nfidelity). Candidates at `.codex-tmp/session3/rejected/c1-2-cand{1,2}/`.";
  if (t.includes(anchor)) { t = t.replace(anchor, repl); console.log("state: 1,2 attempt 2 recorded"); } else if (t.includes("Attempt 2 REJECTED on the same gate")) console.log("state: present"); else throw new Error("state anchor missing");
  const lines = t.split("\n"); const i = lines.findIndex((l) => l.startsWith("| 13 |"));
  if (i >= 0 && !lines.some((l) => l.startsWith("| 14 |"))) {
    lines.splice(i + 1, 0,
      "| 14 | \"youre being way too harsh… just fix that water issue… all of these look pretty great\" (3,1 candidate 3) | OWNER RULING 2026-09-02: candidate 3 stands, subject to the mask; the seam at `dBG 0.189` reads fine, so the palette limit recalibrates to `0.20`; mask completion by growth fixes the water by construction; `--redo` 3,1 once lock change 5 part 1 lands (the lock record needs the owner's own keystroke) |",
      "| 15 | \"the water falls into a cavern perfectly fine\" (3,1 fall and pool crop) | NOTED: the art stands; the growth adds only the painted pool surface before the overhang and the tarn's south edge |",
      "| 16 | \"you can run it thats fine\" (the lock record) | the director's run of the record command is blocked by the permission classifier regardless; owner runs it or adds a permission rule |");
    t = lines.join("\n"); console.log("state: rows 14-16 added");
  }
  fs.writeFileSync(p, t); }
