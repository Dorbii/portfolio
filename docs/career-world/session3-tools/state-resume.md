### RESUME POINT — 2026-09-01, session 3 handoff (landed work committed on `codex/land-lod-completion`)

**What happened this session, in order.** Control suite `6/6` and the hash
gate were green before anything ran. Then:

1. **c3-3 saddle REPLACED** by `--redo --force` from the already-generated
   deep-green candidate — no bake. All seven gates PASS: key-light `0.0012`,
   land `98.4%`, water cut `0 px`, fringe `0%`, continuity ok, palette worst
   `dBG 0.130 / dLuma 11.7` (it IS the third calibration point). `143` tiles
   rewritten (`90/30/12/6/2/2/1`). Director eyes at 1:1, 1/4 and the L3
   tier: it joins the quarry; residuals listed below. Committed `5605a3d`.
2. **c4-2 replacement bake REJECTED by three gates** (`gpt-5.6-sol`, effort
   high, `12m46s`, `140,967` tokens; bakes are ~13 min, not 35): water
   continuity — stream at gen-x `8644` vs the quarry's `8435`, a **209 px
   miss** (bridge reach 150); water fringe **8.45%** (limit `<1%`; the
   worker authored its mask as a 16 px POLYLINE, leaving painted water beside
   the cut — director reproduction of the gate's classifier at ring 6/48:
   accepted c4-3 `0.22/0.18%`, c3-3 `0.00/0.01%`, candidate `7.78/6.27%`);
   palette **dBG 0.301** (limit `0.18`). World unchanged; candidate
   quarantined in `.codex-tmp/authoring/cells/c4-2/`. **c4-2 stays the OLD
   version** with its known stream miss at the c4-3 seam.
3. **Owner asked why the seams are obvious and why the neighbour context
   doesn't land the water. Measured** (`.codex-tmp/session3/{seam-geometry,
   seam-stats,seam-step,context-fidelity}.mjs`, overlay
   `review/seam-diag/seam-33-43-sourcemap-half.png`):
   - the stitch's jitter IS applied (ownership boundary wanders `-121..+78`
     px, blend `~11` px) but the wiggle is a 5-point smooth curve: the middle
     1000 px of the c3-3|c4-3 seam are straight within `±3` px;
   - band averages either side match (dLuma `1.8`), yet the LOCAL luma step
     along the seam curve is `21.8` (c3-3|c4-3) and `26.0` (c4-2|c4-3) vs
     `12.6–20.8` for straight lines inside the cells — a genuine
     discontinuity, ~1.5x interior;
   - **the generator never used the context pixels**: each cell's overlap
     strip correlates with the neighbour's paint at `r -0.015 / -0.012 /
     0.08`, the same as an unrelated patch (`0.09–0.15`). The packet shows
     the paint; the built-in tool in GENERATE mode takes it as a style
     reference only. Continuation happens solely at the stitch, where the
     neighbour wins the seam band and the new cell's bleed is discarded.
4. **Two owner-authorised probes of the built-in `image_gen` EDIT mode**
   (ledger R056/R057; no API key — Codex's ChatGPT login): the director
   built a 2560 edit target with the neighbours' CONCEPT paint in the bottom
   512 px and neutral grey elsewhere. Take 1 ("extend upward") returned a
   `1024x1536` portrait, band re-rendered at `r 0.357`. **Take 2, with the
   framing pinned in the prompt ("SQUARE, same framing and extent, band
   stays in place"): `1254x1254` (= MIN_SRC), band follows the quarry at
   `r 0.739` (ceiling control `1.000`; generate-mode `~0`), join row step
   `18.8` vs interior `14.7–20.0`, and the SIMULATED stitch along the real
   ownership curve measures `20.2` mean step — inside the no-seam interior
   range `15.6–22.7` — against `26.2` for the current world. The stream
   reaches the shared line within ~10–20 px of the quarry's crossing at
   `498` (48 px gate: pass, no bridge). Seam not findable by eye at 1:1.**
   Evidence: `.codex-tmp/session3/probe/builtin2-stitch-stream-1to1.png`
   (vs `...-CURRENT-1to1.png`), `probe-sheet.png`. One sample each; the
   real bake's gates are the replication.

**RECOMMENDED PATH (needs owner approval — `cell.mjs` is solidified):**

- (a) **Edit-mode authoring.** `cell.mjs` builds `context/edit-target.png`
  (2560 square: neighbour CONCEPT paint wherever an authored neighbour's
  canvas covers the overlap, neutral grey `rgb(96,104,88)` elsewhere; the
  old cell's own paint is NEVER included when replacing) and the packet
  mandates: `view_image` it, ONE `image_gen` call in EDIT mode, prompt =
  the framing preamble (verbatim from
  `.codex-tmp/session3/probe/prompt-c4-2-outpaint-square.md`, first
  paragraph) + the brief as a continuation with no coordinates; deliver the
  raw output unresized. Record the approval in `solidified.json` first; add
  a control to the suite (the target builder's band is byte-equal to the
  neighbours' concept crops); then re-bake c4-2.
- (b) **Wide-ring painted-water-outside-mask gate** (ring 48, `<1%`;
  accepted `0.18/0.01%` vs the rejected candidate `6.27%`) — workers still
  author the mask, and the polyline shortcut must fail at the gate.
- The bridge-reach extension (150 → 256) is no longer needed if (a) lands;
  keep 150.
- Not measured and not claimed: how (a) behaves with TWO orthogonal authored
  neighbours (an L-shaped band) and at the capital; the first such cell is
  the test.

**World state:** c4-3 quarry GOOD (accepted canon). c3-3 saddle NEW — deep
green, gates green, **owner review pending** (sheets 1–4). c4-2 OLD — known
stream miss at the c4-3 seam; generate-mode replacement rejected.

**Residual defects flagged on the c3-3 landing (sheets 1–4):**

- c3-3|c4-3 seam, upper ~700 px (meadow-to-meadow): a mild texture/tone step
  at 1:1 — the `dLuma 11.7` point; faint at 1/4, invisible at the L3 tier.
  Now understood: an unrelated painting on each side along a near-straight
  cut (item 3 above); (a) is the remedy, not the stitch.
- c3-3's beck rises in a round dark source pool on the plateau that reads as
  a black dot at reduced zoom; L3 will render it as a small tarn.
- the three-way corner pocket in unauthored c3-2 is bleed-only smudge —
  provisional by design until c3-2 is authored.
- c4-2|c4-3 seam: unchanged — the old stream miss remains (sheets 3/3b).

**Review tooling (scratch, gitignored, `.codex-tmp/session3/`):**
`review.mjs <tag>` assembles proofs from the STITCHED TILES only; `sheet.mjs
<tag> [beforeTag]` composes the labelled sheets (final set:
`review/final/sheet-{1..5}*.png`); seam diagnostics `seam-geometry.mjs`,
`seam-stats.mjs`, `seam-step.mjs`, `context-fidelity.mjs`; probe tooling
`probe-target.mjs`, `probe-measure.mjs`, `probe-stitch-sim.mjs`,
`probe-edit.mjs` (API path, unused: no key), packets and prompts under
`probe/`. `misfit.mjs` and `peg-evidence.mjs` are the c4-2 rejection
measurements.

**IMMEDIATE NEXT ACTIONS, in order:**

1. Owner reviews sheets 1–5 and `probe-sheet.png`; records acceptance or
   defects for c3-3; rules on (a) and (b).
2. Director, on approval: record it in `solidified.json` history → control
   first (suite) → edit `cell.mjs` → `npm run check:world-authoring` →
   re-bake c4-2 (`--force`, brief unchanged; the pegs become the edit
   target's paint, not prose) → review at 1:1 and 1/4 → commit.
3. Then continue by adjacency toward the capital `2,1`, one cell per
   dispatch, briefs per `.codex-tmp/territory/ninjaone-plan.json`.

**Gates (all thresholds calibrated, provenance in the lock):** key-light
asymmetry `<0.011` (sunned D05 `0.0318`, canon `<=0.004`); water cut-clear
exact-zero; fringe `<1%` (accepted `0.0/0.22/0%`); water continuity
(crossings matched `48 px`, bridge to `150`); palette conformance at authored
seams (veg-median `dBG<=0.18`, `dLuma<=13`, eyes-calibrated on three points).

**Standing owner rulings:** Tanium/NinjaOne share BOTH border types (bound in
`plan.rules.southBorder`: sound under `0,3`/`1,3`, land under `2,3`/`3,3`,
bay at `4,3`); water bridge approved at 150; palette gate-and-regenerate
approved; `OPENAI_API_KEY` for the API image path still an open offer — no
longer needed for outpainting after R057, still the route to native-2048
density (`4.63 -> 7.56` px/world px) and true masks.

**Durability gap, still open:** `.codex-tmp/territory/ninjaone-plan.json`
and its generator are gitignored scratch that `cell.mjs` requires; moving
them touches a solidified path constant — owner approval needed.

**Unresolved, owner call:** the `407` uncommitted stream-r3 modifications in
this worktree (shoreline-erosion re-bake + v3 coast fill, obsolescent) —
commit as an interim fix for the old-world serving, or discard. Untouched
this session; NOT in this session's commits. Side cost: every worker runs
`git status` and swallows those 400 lines into its context.

**Cautions that cost lanes (carry forward):** measure against the CURRENT
accepted artefact, never a discarded attempt's numbers; prose spatial pegs
do not land — hand the model paint, not coordinates; pin the frame in the
prompt or the tool changes the aspect; review at reduced zoom as well as
1:1; eyes on flagged pixels before believing or tuning any gate (the
colour-based stream finder was unreliable — eyes with a tick crop were not);
corner-pocket smudges in unauthored ground are provisional; a bake is ~13
min — dispatch as a background shell (the Bash timeout does not kill
background runs; verified) and read `.codex-tmp/authoring/cells/<id>/<id>.log`
for `tokens used`, never the process list; worker self-reports are claims —
this session's workers reported tool truth honestly and were still measured.
