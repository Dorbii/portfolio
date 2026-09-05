# Punch list — the owner's markup of the big island, 2026-09-04 evening

Source: 18 crops of `session3-tools/island-grid.mjs` (level 2, 512 px per
cell, one-cell sea margin) marked in red by Steve. His words: *"First 11 have
defects or need a regen. Tc6-1 is from our old idea for the chain and should
be fixed imo. The ones with that ocean buffer are after that and are cells
that have an unnatural transition to the ocean."*

Status key: **open** · **in run** (the review-and-retry run of 00:09) ·
**prepped** (regions/briefs ready, needs the lock) · **done**.

## A. Accepted cells — painted water the mask did not cut (no regeneration)

Fix: `grow-water-along-stream.mjs <cell> --write` with `GROW_REGIONS`, then
`cell.mjs --redo --force` — the c0-1 method, owner-approved. Regions below are
canvas px (2560 canvas, 256 bleed), read off the crops.

| cell | the mark | region(s) | status |
|---|---|---|---|
| T c0-1 | two more stretches: the bank patch at the stream's upper bend; the join where the stream meets the groove's pool | `2015,716,2175,876` · `1409,1112,1569,1272` | open |
| T c2-2 | the stream's entry at the north edge, a wet patch left as land | `1930,180,2130,440` | open |
| T c3-2 | a painted gully on the upper-left bench; two spots at falls (lower-left stream above its wall; right stream at a wall) | `520,840,880,1160` · `700,1650,850,1800` · `1770,1400,1920,1550` | open |
| T c5-1 | the wet patch below the tarn's spillway | `1680,760,2020,1000` | open |
| T c5-2 | both streams: the cut covers a thread, the painted channel is wider (a pale dry bed beside the water) | `400,256,660,1760` · `1840,900,2160,1760` | open — growth classifies blue-leaning paint; a pale gravel bed may need the widen tool along the channel instead |

## B. Cells in the run (marks are on refused candidates; the rebake is the fix)

| cell | the mark | status |
|---|---|---|
| T c4-2 | five marks along both becks (channel/cut mismatch on the candidate) | in run |
| T c6-2 | the cove pool at the south-west corner not joined to the sea | in run |
| T c4-0 | the border river must meet N c3-3's at the seam | in run (last) |
| T c1-2 / c1-1 | the gorge river across the c1-1/c1-2 seam | c1-2 in run; c1-1 waits on the owner's key-light ruling |

## C. T c6-1 — the colonnade goes; the chain's seaward end replaces it

Owner: *"from our old idea for the chain and should be fixed imo."* Definition
change: biome `linked-colonnade` → `coast-cliff`; the `colonnade-head` site
becomes the chain's end (the last panels on the cliff-top bench, the groove cut
to the lip, the line continuing as a cut across the stack beyond); `B["6,1"]`
rewritten; forced rebake through the review loop. status: prepped when the
brief is committed; needs the lock.

## D. Unnatural transitions to the ocean — coast rebakes

| cell(s) | what is wrong | what the fix is | status |
|---|---|---|---|
| N c0-0, c1-0, c2-0, c3-0, c4-0 (the north row) | inland ground to the top edge; sea beyond | an outer-edge rule in NinjaOne's def ("open sea beyond this edge: a coast"), coast briefs, rebakes | open — NinjaOne has no brief writer yet and the runner is Tanium-only |
| N c0-0, c0-1 (west) | land to the west edge; c0-2/c0-3 below have their sound coast | same | open |
| N c0-3, c1-3 (south edges) | must open into the SOUND per the north-border ruling; they end mid-ground against T c1-0/c2-0's water | same | open |
| T c0-1 (west) | the cable-car shelf runs to the edge where the chain "comes out of the sea" | forced rebake with an explicit west coast; the chain node stays | open |
| T c3-2 (south) | the lowest bench ends in a straight line against the sea | forced rebake with a coast foot; keep the widened north seam | open |
| T c6-1, c6-2 (east) | c6-1 the colonnade (C); c6-2 in the run | see C and B | — |

## E. Unclear

- **T c4-1**: no red mark in the crop. Either the fall's cut reading as a
  black smear on the west wall, or the groove touching the tarn. Asked.

## Order

1. The run of 00:09 finishes (c4-2, c1-2, c2-1, c3-1, c6-2, c4-0).
2. A — five mask fixes, minutes each, no Codex.
3. C — c6-1.
4. D — Tanium's c0-1 and c3-2, then NinjaOne's eight once its def carries an
   outer-edge rule and the runner takes `--territory`.
