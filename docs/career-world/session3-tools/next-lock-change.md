# Lock change 5 (2026-09-02)

> PART 1 LANDED 2026-09-02 (5a, 5b, the palette limit 0.20; suite 16/16; commit `6f2e14c`).
> PART 2 LANDED 2026-09-02 (commit 61f0dd7, suite 16/16): the canon as the second input of the edit call — probe R078:
> key light `0.0093` vs `0.019–0.020`, band fidelity `0.759` vs `0.84–0.88`. First real bake: 1,2 attempt 3.
> Still open below: 5c seam-step gate, 5d vocabulary lines, 5e crown report, 5g parked.

Procedure per `tools/world-authoring/AGENTS.md`: `check-solidified.mjs --approve`
(before) → controls in the suite → edit → suite → `--approve` (after) → hash
gate → commit. Items 1, 2, 2b, 2c, 3 of the previous draft LANDED as lock
change 4 (2026-09-01). Everything below is open.

## 5a. WORK relocated under L2_OUT_ROOT — cell.mjs + suite (incident R073)

`WORK = ".codex-tmp/authoring/cells"` is not relocated when `L2_OUT_ROOT` is
set, so the control suite writes synthetic artefacts into the REAL working
dirs (`--from` copies into `WORK/<id>`; the stale-deliverable control wipes
`WORK/c3-2`'s deliverables; the rock-lighting control left a stub water.json
in `WORK/c4-3` that the lock-change-4 re-record read into the ledger).
Change: `const WORK = process.env.L2_OUT_ROOT ? path.join(L2_OUT_ROOT, "work")
: ".codex-tmp/authoring/cells"`. Control: the suite hashes the tree under
`.codex-tmp/authoring/cells` at start and asserts it unchanged at the end
(and the stale-deliverable control points at the relocated dir).

## 5b. Mask completion by bounded growth — cell.mjs (R071; four candidates rejected on tracing)

The delivered mask is grown into CONTIGUOUS pixels the fringe classifier
calls water (`mx>40, sat>.25, b>r, b>=g`), up to 48 px from the delivered
mask, then hole-filled; the grown mask becomes `<id>-water.png` and the
fringe gates run on it as today. A polyline mask with dry paint between it
and the painted water still fails (the growth stops at dry pixels) — that
defect stays the worker's. What it removes: the "mask stops a few px short
of the shore" class (c4-2 candidate `7.78%`, c3-1 candidates 1 and 3, the
coast's `0.09%` tail). Risk: blue-grey mist or haze touching water gets
absorbed — bound the growth by saturation (`sat>.25` already excludes flat
haze) and by the 48 px reach; report the grown area in the gate table.
Controls: (i) a synthetic disc whose mask is 20 px undersize passes after
growth and the ring reads `0%`; (ii) the existing 48 px painted-ring control
(dry strip between) still fails; (iii) a haze patch of `sat<.25` adjoining
the disc is NOT absorbed. Real calibration: run on the five accepted cells'
sources — the grown masks must be supersets of the delivered ones within a
few px (IoU reported), tiles byte-identical where nothing grew.

**Prototype run (2026-09-02, `mask-grow.mjs`, reach 48, growth only through
opaque land the classifier calls water, plus the cut feather):** the five
accepted cells grow by `0 / 0 / 103 / 9 / 0` opaque px (quarry, saddle,
coast, gorge, moor) — their masks were complete, nothing changes; the 3,1
candidate grows by `3,248` opaque px (2.3% of its mask), exactly the pool's
west shore and the tarn's south edge the gate flagged, and its rings fall
from `4.90% / 2.49%` to `0.73% / 0.82%` — a pass. The misty chasm-floor
stream (`sat < .25`) is not absorbed. Map:
`review/regen-c3-1-cand3-maskgrow.png` (blue delivered, red grown).

## 5c. Seam-step gate — cell.mjs (owner's eye on c3-1 attempt 2)

No gate measures structure continuity at the seam. `seam-step.mjs` (local
luma step 10..34 px either side of the ownership curve, windows averaged)
separates the old world's bad seam (`26.0`) from accepted ones (`20.3`,
`20.8`) with interior lines at `15.6–25.3`. Gate: compose the seam band from
sources before the stitch (composeTile with the candidate's l2 as a
temporary source), walk the ownership curve, compute mean/p90 step, compare
to the same measure on lines 400–800 px inside each cell; fail when the seam
exceeds the interior mean by more than ~25% (bad seam `+49%`, accepted
`+7%`). Report both numbers. Control: the synthetic F|G pair passes; a G'
with a 40-luma offset in its west band fails.

## 5d. Vocabulary and rule lines — plan-territory.mjs

- dark-forest, magical-gorge (any biome with haze or glow): "haze/glow
  continues across seams at the tint it arrives with, thinning only with
  distance from its source" (R069: the haze stopped at the line).
- geology rule, verbatim: "every column face ONE FLAT VALUE; joints as thin
  dark lines only; no bright edge, no dark edge, no cylinder rounding;
  ambient occlusion only" (fixed 3,1: `0.31 → 0.143`; missing from 2,2's
  first brief: `0.20`).
- mixed-bench reworded to broken bench country (R072): heather flats in
  shallow steps read from scree fans, ramps and scattered outcrops — tors,
  knolls, short broken scarps two to six crowns long — never a continuous
  edge. Apply only if 2,2's third attempt shows the wording lands.
- Transitions packet line: "atmosphere (haze, glow, mist) arriving at an
  edge continues at the same tint".
Control: dry-run packets for 3,2 / 3,1 / 2,2 assert the lines.

## 5e. Crown size, report-only — cell.mjs (watch item since c3-2)

Print the director's blob measure (`crown-size.mjs`: dark-conifer
components 300–20,000 px, median bbox) for the candidate's band and the
neighbour's band on each authored seam, plus the ratio. Not a gate: the
measure is biased by canopy merging (n 5–27 per band; accepted cells
`51–111 px` medians). Calibrate against a resized control (trees at 0.6x
must read ~0.6) before it can gate.

## 5f. Neighbour water in the bleed ORed into the delivered mask — NOT needed so far

A neighbour's water body crossing a cell line is legitimate. Attempt 2 and
3 of 3,1 continued the tarn corner once the brief stated it as permission.
Keep as a fallback only.

## 5g. Palisade measure — TRIED, does not separate (parked)

The owner rejects regular column walls on sight (c4-2 candidate 1, c2-2
candidates 1 and 2). A straight-run walker over strong rock edges
(`palisade.mjs` at 1:1 with a 2 px gap tolerance; `palisade-q.mjs` at 1/4
scale) reads a mean run of `2.4–3.5 px` and under `1%` of edges on runs
over 96 px for EVERY image — rejected candidates and accepted cells alike:
painted rock breaks every wall edge into joint-length pieces at the pixel
level, so the perceptual "long wall" never exists as one edge. Next thing
to try if it matters: Hough-style line accumulation on a downscaled
rock-edge map (a wall votes for one line whatever its texture). Until then
the owner's eye is the check, and the landform wording (5d) is the lever.

## 5h. Lineage drift needs a pipeline anchor — cell.mjs (R075)

Along the edit-mode chain each cell continues its neighbour's hand and adds
its own drift: key-light `0.0052 → 0.0121 → 0.0205` (3,2 → 2,2 → 1,2, one
direction from 3,2 on), crowns `71 → 57 → 45 px`. The canon never reaches
the image model in edit mode (the edit target is the only image it sees).
Two things: (i) HEADROOM — a cell that passes the key-light gate above
~0.008 is accepted but flagged "no headroom for neighbours" in the ledger,
and its neighbours' packets carry the no-lit-side paragraph verbatim;
(ii) an ANCHOR to test — when the lit-side paragraph alone does not move
the moment (1,2 attempt 2 is the experiment), compose the edit target so
the grey "to paint" area is replaced by the CANON's paint at low opacity
(a ghost the model paints over) so the hand it continues is the canon's,
not only the neighbour's; measure whether the seam fidelity (r 0.74) and
the moment both hold. Owner call either way.


## 5i. Arriving water crossings listed in the packet — cell.mjs (R083)

The continuity gate already computes each authored neighbour's crossings on
the shared line (`theirs` in the bridge block). Put them in the packet under
Transitions: "water arrives at your NORTH edge at about 46% along it, 75 px
wide (a beck): continue it" — so no brief can deny what the paint delivers.
1,3's first attempt was lost to exactly that. Control: a dry run for a cell
whose authored neighbour has a crossing on the shared line asserts the line.

## 5j. A per-biome reference image beside the canon — STRUCK 2026-09-02 (R087: the tool took a third image and the rock-only moment did not move, 0.187 → 0.198)

The canon as the second input flattened a moor's tussock emboss (R081) but
not a coast cell's lit rock (R086: rock-only moment `0.288 → 0.187` across
two briefs, global, on few strong edges). If attaching the accepted coast
cell's source as a THIRD input fixes 1,3, make it mechanism: the plan's
biome entry names a reference image (an accepted cell of that biome, or the
canon), the packet mandates it as the third input with a paragraph "the rock
in the third image is how rock is shaded here", the pipeline refuses edit
mode if the file is missing. Control: the dry-run packet for a coast cell
names the coast reference; for a moor cell the canon only.

# Lock change 6 (LANDED 2026-09-02, commit 09a019c, suite 17/17; owner: "the seams are stark here… need a better transition", "lock that down")

## 6a. Palette gate on ALL land, not vegetation only — cell.mjs — LANDED

The vegetation-median gate skipped 1,3's seams ("no vegetated seams": the
moor's olive is not green to the classifier) and passed a stark tonal
step. `tone-seam.mjs` (medians of luma and of r-g / b-g over all opaque land
in the 16..176 px bands): the stark seam reads dLuma `24.5` (d(b-g) `16`);
every accepted seam reads `2.3–17.4` (the quarry seams `17.4` and `14.0` are
the owner-accepted top). Gate: all-land dLuma `> 20` fails, the three
numbers reported; the vegetation b/g check stays where vegetation exists.
Control: the synthetic F|G pair passes (same luma); a G' with +30 luma in
its west band fails.

## 6b. A tone ramp in the edit target — cell.mjs — LANDED (full tone where the grey begins at 256 px in, flat grey a third in)

The Transitions text ("change inside your outer third, never on the seam")
does not land when the brief asks for a brighter biome: the model changes
tone at the line. Give the model the transition as pixels: where the
target is grey "to paint", blend the neighbour's edge-band tone (its median
colour per 64 px along the edge) into the grey across the outer third,
fading to the flat grey. The model continues a tone it sees. Control: the
target's grey beyond a third is byte-exact grey; inside the third the
tone matches the neighbour's band median within a few units.

## 6c. Seam-step gate — see 5c (the local step along the ownership curve).

## 6d. The suite takes its own lock on the test world — tests (director-found 2026-09-02)

Two suite runs started a few minutes apart shared `.codex-tmp/dir-stitch/test-world`;
the second's `rmSync(OUT)` raced the first's writes (ENOTEMPTY, then missing
sources) and both reported garbage. The cell lock only guards cell.mjs's
writes, not the suite's own wipe. Fix: the suite creates `test-world.lock`
(mkdir, fail closed) at load and removes it at exit; a second run refuses with
a clear message. Not solidified (tests/), no owner approval needed — do it
with the next suite edit.


## 5k. Packet wording for rail and shelf ground — cell.mjs / plan (owner "this looks weird", 4,0)

The director's brief asked 4,0 for a "treeless strip three crowns wide" and a
"straight cutting"; the model drew a graded road, a ditch and short walls —
built shapes on terrain-only ground. Rule for every packet and brief: the
land offers OPEN ground (wide, level, soft-edged, texture unbroken) and
NATURAL draws (gullies with rounded sides); never strips, bands, cuttings,
corridors or ledges described as lines. Check the packet's Rail features and
shelf sections for the same words.


# Lock change 7 (LANDED 2026-09-02, commit dadbf1f, suite 18/18) — the water-paint test gets a hue window (R093)

## 7a. isWaterPaint with hue 150..225 — cell.mjs — LANDED

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

# Lock change 8 (LANDED 2026-09-02, commit 976743f2, suite 20/20) — two limits recalibrated on the owner's eye

## 8a. rock lighting 0.15 -> 0.16, all-land seam tone 20 -> 21 — cell.mjs + the tone control's lift 30 -> 34 — STAGED (`apply-lock8.mjs --check` anchors ok)
- Why: candidate 4 measures `0.153` and `20.0`; the accepted world already reaches `0.144` and `17.4`, so both misses are inside the noise of their calibrations. If the owner rules the candidate right by eye, the limits move (as the palette limit did, R077) and candidate 4 is re-derived with `--redo`; if he wants a fifth attempt or leaves the cell, nothing here lands.
- Needs: the owner's words in the conversation, `--approve` before and after, the tone control re-run (its lift moves to 34 so it stays a control over the new limit), suite green, hash gate intact.

# Lock change 9 (LANDED 2026-09-02, commit 54927a8c, suite 20/20, world restitched e4e33f73) - content-aware seams: the cut runs where the two paints agree

## Why
The owner's strip (row 32): features cut in half at the 2,0 candidate-4 west seam. The stitch draws a fixed geometric boundary (corner jitter 64 + wiggle 64, feather 8) that cuts whatever straddles it; both paints cover the whole +-256 px band (each canvas carries a 256 px bleed), so the boundary can instead follow the minimum-error path (image quilting, Efros and Freeman 2001). Prototype `.codex-tmp/session3/mincut-seam.mjs`: mean paint disagreement along the boundary falls 3-4x on every seam tried (flagged seam 46.6 -> 12.8; 0,0|1,0 36.5 -> 11.6; 2,0c4|3,0 49.5 -> 13.9; 2,1|3,1 35.4 -> 9.1; 1,2|2,2 26.9 -> 8.6), the cut within 125 px of the nominal line (tab reach 160). Hard-edge excess (`seam-edge2.mjs`) did NOT separate the flagged seam (x0.88) from accepted ones (x0.70-1.88): busy jointed rock hides cut features from a luma-step rate, so that statistic is a diagnostic only.

## 9a. makeSeam takes the two sources per authored-authored edge - cell.mjs
- Per shared edge between two AUTHORED cells: a DP boundary from corner to corner within +-128 px of the nominal line, cost = RGB distance between the two l2 canvases, +-1 px lateral step per row with a small step penalty, pinned at the jittered corner points with a taper envelope near the corners (as the wiggle tapers) so the vertical and horizontal decisions stay consistent at corners. Edges to UNAUTHORED ground keep the geometric boundary (nothing to compare against) - bleed over unauthored ground as today.
- Deterministic from the two sources alone, so both cells derive the same boundary; a replacement (`--force`) recomputes its four seams and the dirty window (+-256) covers the band.
- Feather stays 8 px. Water cut, gates, edit targets unchanged. Paint is never altered: only which cell's paint shows in the band.

## 9b. `--restitch` - stitch an accepted cell from art-source without dispatch or gates
- Needed to carry the new seams through the 19 accepted cells (deterministic, no bakes); `--redo` re-gates from a WORK dir and would re-judge old cells under newer gates.

## Controls (suite, before the change)
- Synthetic pair: flat ground on both, one crown straddling the nominal line on ONE paint only: the geometric seam cuts it (disagreement high), the min-cut routes round it (disagreement near zero) and stays inside +-128 px; both cells derive an identical boundary; corner pins hold.
- Real-dir fingerprint stays; hash gate `npm run check:world-authoring` intact; `--approve` before and after with the owner's words.

## After
- `--restitch` all 19 cells, regenerate the dev feed, owner-format strips at every seam for his eye; ledger entry; then 2,0 (lock change 8 + `--redo` candidate 4, or a fifth attempt).
