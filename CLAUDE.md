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
