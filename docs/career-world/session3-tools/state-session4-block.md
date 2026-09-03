**SESSION 4 (2026-09-02) — RESUME HERE.** Both queued bakes landed and
were REJECTED (ledger R071/R072). **3,1 attempt 3:** water fringe
`4.9% / 2.49%` (the tarn's south shore in the SE bleed and the luminous
pool's west shore lie outside the mask — `review/regen-c3-1-cand3-fringe-map.png`)
plus palette `dBG 0.189` vs `0.18` at the 3,2 seam (attempt 2: `0.218`);
rock lighting `0.116` (best of three), continuity ok, the tarn corner
continued. Eyes at 1:1 (`review/regen-c3-1-cand3-seam-S-{west,east}.png`):
the crag and rim wall now cross the line at one scale; the join is a
texture/tone line, not a structural clash. Profile
(`haze-profile.mjs`): the candidate continues the arriving tint for
about 128 px and then paints a far colder cell (whole-cell veg b/g `0.93`
vs 3,2 `0.61`). Candidate 3 kept in full at
`.codex-tmp/session3/rejected/c3-1-cand3/` and still in place under
`.codex-tmp/authoring/cells/c3-1/` (a mask re-trace job + `--redo` clears
the fringe gate; the palette needs the owner's eye on the 1:1 seam or a
fourth generation). **2,2 attempt 2:** palette `dBG 0.266` (its east
forest painted yellow-green, `0.29` vs the arriving `0.56`); fringe
`0/0%`; and the palisade walls are still there by the worker's own report
and by eye (`review/regen-c2-2-cand2-quarter.png`). Diagnosis: the biome's
own words describe continuous terrace walls. **2,2 attempt 3 DISPATCHED**
on a reframed landform (`brief-c2-2-r3.md`: broken bench country —
scattered tors, short broken scarps two to six crowns long, no continuous
edge; the arriving cool green held across the whole east third); log
`.codex-tmp/session3/regen-c2-2.log` after `rebake3-start`. **Incident
fixed (R073):** the control suite shares `.codex-tmp/authoring/cells` with
the real world (`WORK` is not relocated by `L2_OUT_ROOT`); a test stub
reached 4,3's ledger record (`waterZones ["lake"]`); restored from git,
re-recorded with `--redo --force`, every tile hashed before and after:
`0 written, 124 byte-identical`; committed `97eb0d6`. **LOCK CHANGE 5
DRAFTED** (`.codex-tmp/session3/next-lock-change.md`; owner approval
needed before any edit): WORK relocation + suite assertion; mask
completion by bounded growth (the delivered mask grows into contiguous
water-classified pixels up to 48 px — four candidates so far were rejected
on mask tracing, not art); seam-step gate; vocabulary lines (haze
continues at the arriving tint; "every column face one flat value"
verbatim in the geology rule; mixed-bench reworded to broken bench
country if attempt 3 lands); crown size printed report-only on both sides
of each seam. Session tooling added: `cand-preview.mjs` (candidate in the
world's tiles, quarter + 1:1 seam halves), `fringe-map.mjs` (gate replica
to the pixel, per-block tallies, red map), `haze-profile.mjs`,
`crown-size.mjs`.

