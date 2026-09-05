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

## E. Resolved after the owner's second markup

- **T c4-1**: the outline traced the groove from the east edge past the tarn
  down INTO the fall on the west rim ("idk what this part is for") — the
  black smear is the tarn's outlet cut as water (the water layer will draw the
  fall), but the groove ends in it instead of leaving the west edge at 48%.
  Brief 4,1 rewritten (the fall 15 m south of the groove; the groove crosses
  edge to edge); forced rebake. status: prepped.
- **T c5-2**: the growth tool's blue-leaning classifier cannot see the pale
  gravel beds and a pale-gravel mode picks stones instead, so the mask route
  is out. Brief 5,2 now says the becks are cut water the full width of their
  painted beds; forced rebake. status: prepped.
- **D, revised by the owner** (*"generate those in the tiles next to the
  placed art ... not replacing those tiles just extending them into the
  neighbor to transition better"*): no accepted cell is rebaked for its
  coast. The **coast territory** (`coast-plan.mjs`, `coast-briefs.mjs`;
  sparse 9x9 block at lattice [1,0]) holds nine shore cells beside the island
  — NinjaOne's north row (coast c2-0..c6-0), its west (c1-1, c1-2), its east
  (c7-1), Tanium's west (c0-6) — each continuing the island's arriving paint
  15-40 m and ending it at the shore, with the perspective rule per shore.
  cell.mjs now finds neighbours across territories (lock 18f), so the island's
  pixels arrive in the edit target and the gates judge the shared edge.
  status: prepped; bakes after the run.
- **Two seams have no sea cell to extend into and need the owner's call**:
  the NinjaOne–Tanium sound edge (N c0-3 / c1-3 end mid-ground against
  T c1-0 / c2-0's water), and T c3-2's south edge (row 8 stays sea by the
  owner's ruling; a shore cell there would put a coast foot in that row).

## Status as of 01:35

- A (mask fixes): **c0-1 done, c2-2 done** (re-derived 01:25); c3-2 refused
  on the seam with c4-2 the owner accepted (tone 38.3) — re-derives under his
  acceptance after the chain (`after-chain.sh`); c5-1 did not take — re-run
  with full output after the chain. c5-2 → to the owner ("rebake, or good
  enough?").
- B: c4-2 **accepted by the owner on his eye**, stitched with the override
  (Tanium 15 of 21). c1-2 refused twice (second close: only veg colour);
  c1-2, c2-1, c3-1, c6-2, c4-0 are in his picture as refused candidates in
  place; c1-1 queued for one regeneration.
- C: c6-1 baking now (the chain's seaward end).
- D: eleven coast cells queued behind c6-1, one attempt each.
- E: c4-1 → to the owner ("rebake, or good enough?").
- Policy (owner 01:20): one attempt per cell; refusals go to his picture;
  retries only for cells he sends back.

## The owner on the seven-cell picture (01:40-01:50)

- *"the chain between these doesnt line up"* (c2-1 / c3-1 candidates, and
  c3-1 / c4-1 where c4-1's groove dives into the fall): **c4-1 rebakes**
  (one attempt; brief pins the groove to the west edge); c2-1 regenerates
  once against c3-1's real pixels after c3-1 is in the world. **c3-1's
  acceptance is the one open call.**
- *"the bottom row looks fine I think"*: **c1-2's second candidate and c6-2's
  candidate accepted on his eye** (override queued in `after-chain.sh`).
- c1-2: *"this is fine ... idk why its failed 2 times"* — the palette gate's
  colour arm (0.289 against 0.20) read the forest's cool understory against
  the coast's pale grass as a clash; the tone arm had passed.
- c5-2: *"the water doesnt seem to line up with the banks"* — the cut is a
  thread beside the painted bed; three mask classifiers (blue-leaning, pale,
  bed-colour) all picked stones, so **c5-2 regenerates once** (brief 5,2:
  the becks fill their beds).
- Pictures are outline-only from now on (*"when they have a red mask I cant
  judge color correctness"*).

## Order (as of 00:35)

1. The run of 00:16 finishes (c4-2, c1-2, c2-1, c3-1, c6-2, c4-0), on
   gpt-5.6-sol with review-and-retry.
2. `.codex-tmp/session4/after-run.sh`: the four mask re-derives (A), then
   c6-1 + c4-1 forced (C, E), then the nine coast cells (D), then c5-2.
3. The owner's two seam calls; c1-1's key-light ruling.
