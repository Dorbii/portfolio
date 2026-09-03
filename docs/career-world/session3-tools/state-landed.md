**PIPELINE CHANGE LANDED (owner approved 2026-09-01; lock history has the
before and after entries; suite 9/9; hash gate intact):**

- (a) **Edit-mode authoring.** For any cell with an authored neighbour,
  `cell.mjs` builds `context/edit-target.png` — the full 2560 canvas with the
  neighbours' CONCEPT paint wherever their canvases cover it, the replaced
  cell's own old paint never included, neutral grey `rgb(96,104,88)`
  elsewhere — and the packet mandates ONE built-in `image_gen` EDIT call on
  it, prompt = the verbatim square-framing preamble + the brief written as
  what continues (never coordinates). Frontier cells stay in generate mode
  with the seed as reference. Controls: target byte-exact where the neighbour
  owns or bleeds, grey elsewhere, frontier gets none; a replacement's target
  never carries its own paint.
- (b) **48 px water-fringe gate** (`<1%`, same classifier as the 6 px ring,
  bridge bands skipped). Real-data calibration through `--redo`: saddle
  `0.01%` (re-stitched byte-identical, 143 tiles), quarry `0.17%`, the
  rejected coast candidate `6.15%`. Control: paint 12–40 px beyond the mask
  fails the 48 px ring while the 6 px ring passes and the world is untouched.
- The bridge reach stays at 150. The quarry's own `--redo` is now refused by
  the continuity gate because its neighbour is the OLD coast with the 700 px
  miss — expected; the coast regenerates first under the new path anyway.
- Not yet exercised on a real bake: a cell with TWO orthogonal authored
  neighbours (an L-shaped painted band); the second regenerated cell is the
  test.

**REGENERATION PLAN (waits only on Q1, the seed canon):**

1. Canon: the chosen candidate copied to
   `art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r2-source.png`
   (1254) with its 2560 lanczos upscale as `L2-seed-region-r2.png`; r1 deleted
   once all three cells are regenerated under r2.
2. Briefs ready in the new register under the variance map, written as
   continuation with no coordinates: `.codex-tmp/authoring/brief-c4-3-r2.md`,
   `brief-c3-3-r2.md`, `brief-c4-2-r2.md`.
3. Wipe the L2 world (tiles `l2-ninjaone-r1/`, the manifest, the three
   `art-source` cells) — git-reversible, owner-approved with the register
   change — then regenerate in adjacency order: `4,3` (frontier, generate
   mode from the seed) → `3,3` → `4,2` (edit mode). ~13 min each. Review at
   1:1 and 1/4 after each; the second and third are the first real
   edit-mode bakes.