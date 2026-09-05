# Working rules for this repo (owner: Steve)

- **Commit on a cadence, not only at landings.** Commit whatever is working at
  least every ~30 minutes of work and at every accepted step, on the lane
  branch, with a plain message. Uncommitted files cost context on every
  sub-agent and are lost when a session or a model budget ends. Never push
  unless asked. Scratch tooling that a session's STATE cites gets a tracked
  copy under `docs/career-world/` (the `.codex-tmp/` tree is gitignored).
- **Career World work resumes from `docs/career-world/STATE.md` only.** Read
  its RESUME block first; `tools/world-authoring/` is solidified (owner
  approval before and after any edit, recorded with `check-solidified.mjs`).
- **Review art on the grid, not in isolation and not as numbers.** Owner,
  2026-09-04: *"I much prefer this type of review where I see the cell in
  question on the grid like this."* Use
  `docs/career-world/session3-tools/world-mosaic.mjs <territory> [--level N]
  [--highlight c1-2,c2-2]`, which assembles a territory from its **stitched
  pyramid** (not the raw generations — the stitch cuts a content-aware seam, so
  butting raw images together shows joins the world does not have) and boxes the
  cells in question. Draw refused candidates in place too, outlined:
  `.codex-tmp/` is gitignored and `cell.mjs` clears stale deliverables at
  dispatch, so a reject nobody is shown is a reject nobody can rule on. When the
  gate is a *comparison* — palette conformance, water continuity — draw the
  comparison, with a strip of each authored neighbour along the shared edge.
  Numbers alone mislead: six cells were once refused on a "palette" gate reading
  `dBG 0.011-0.049` with `dLuma 14-56`, which is a lighting fault wearing a
  palette gate's name, and only the picture said so.
- **Ask the owner with the island picture, not a list of cell ids.** Owner,
  2026-09-04: *"that red box grid picture was perfect for me reviewing the ask
  ... keep doing that."* Anything that needs his call — a ruling, a choice
  between fixes, cells to accept — goes out as
  `node docs/career-world/session3-tools/island-grid.mjs --level 2 --margin 1
  --mark "T c1-1=why;N c0-3=why"` (after `world-mosaic.mjs <territory>
  --level 2 --bg 31,96,108 --out .codex-tmp/session4/island/mosaic-<territory>-L2.png`
  for each territory), sent as the JPEG it writes: every cell labelled, the
  sea drawn as sea, and each cell that needs him boxed in red with the
  question under it. He marks it up and sends crops back; the punch list
  (`docs/career-world/PUNCH-LIST-2026-09-04.md`) shows how a crop becomes a
  fix.
