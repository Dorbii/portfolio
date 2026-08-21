# Agent Flow Experiments — Career World

Maintained by Claude (director). One entry per dispatched run (desktop thread task or `codex exec` dispatch). Purpose: build a dataset of which model tiers, effort levels, and packet shapes each pipeline stage actually needs, so later cities get cheaper and smoother.

## Summary table

| Run | Date | Task | Lane | Model | Effort | Wall time | Outcome | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R000 | 2026-08-21 | I24 checkpoint + T1 grammar r1 | desktop thread | (Steve: fill in — app default) | default | ~28 min | **partial** (r1 rejected, machinery approved) | fresh-session baseline under v2 contract |
| R001 | 2026-08-21 | T1-r2 grammar revision | codex exec | gpt-5.6-terra | medium | — | dispatched | Terra probe on a mechanical packet with explicit criteria |

## Run log

### R000 — 2026-08-21 — I24 old-lane checkpoint + T1 grammar extraction (desktop thread)

- **Setup:** fresh desktop session (id `01a02544-…adf9c`), cold start on AGENTS.md + QA-REVIEW.md. Model = app default (Steve to record which tier the desktop app is set to).
- **Observations so far:**
  - Correctly ingested both steering docs on first turn; explicitly cited them as authority and scoped itself to "I24 checkpoint plus one active T1 slice" — the fresh-context reset worked; no old-lane vocabulary reappeared.
  - Self-selected local skills (`plan-evidence-verification`, `task-packet-execution`, `gate-discipline`). Watch item: Steve suspects some local skills are stale; note any skill-driven weirdness here.
  - Chose to run the **full** gate suite before committing a checkpoint of already-finished work — good attribution discipline, but ~5 min of wall time dominated by the 145 s exhaustive camera-sweep test. Flow finding: the packet should state which gate tier a checkpoint needs (focused vs full) so workers don't overspend on ceremony.
- **Verdict:** PARTIAL. I24 checkpoint (`ca6ebde`) clean and well-scoped. T1 r1 delivered working deterministic machinery, reproducible outputs, and correctly-shaped property checks in ~20 min — but fidelity failed review: landmarks missed (palace, train hall, observatory), 45 uniform stamps vs ~150+ structures, sparse circulation (east ridge/industrial empty), abstract bridge diagonals over rooftops. Model-attributable read: the worker satisfied every *written* criterion and stopped at the minimum viable interpretation of "faithful" — the packet under-specified fidelity, so this is as much a packet-authoring finding as a model finding. F3 logged.
- **Wall time:** ~28 min total (~5 min of it full-suite gate ceremony on the checkpoint — see F1).

### R001 — 2026-08-21 — T1-r2 grammar revision (codex exec, gpt-5.6-terra, effort=medium)

- **Setup:** first headless dispatch. Packet `.codex-tmp/qa/T1/packet-t1-r2.md` with explicit numeric fidelity criteria (≥100 footprints, structure-dominance validation, ≥70% on-path polyline samples, landmark class, bridge-span rule). Sandbox workspace-write; no-commit; focused gates only.
- **Hypothesis being tested:** a mid-tier model with a *fully specified* mechanical packet matches flagship output quality on extraction/scripting work.
- **False start 1:** dispatch died at launch — stale PATH CLI (see F4). Redispatched 12:40 on the app's v0.149-alpha engine.
- **False start 2:** worker blocked — sandbox denied Node execution; honest blocker report, no commit, clean stop (left an unverified builder draft).
- **False start 3:** PATH-preamble fix insufficient — execpolicy denies system Node script execution outright (probe matrix + rules-file archaeology pinned it down; see F5). Worker again reported honestly and claimed nothing. Its blind draft crashes at `buildFootprints` — noted in the packet for the next attempt.
- **Attempt 4 (first fair attempt, ~13:25):** dispatched with bundled-node instructions (F5 unlock) and the known draft crash called out.
- **Verdict: STRUCTURED FAIL — high-quality failure.** Terra fixed the draft crash (`structureFootprint` missing return), ran builder + check + lint, and correctly diagnosed that the *approach* was invalid: splitting the registered abstract routes cannot satisfy the ≥70% on-path property (worst edge 18.75%) because layout anchors are not street geometry. It invoked the two-strikes rule, refused to weaken the classifier, requested a director reframe, claimed nothing, committed nothing. Model-attributable: at medium effort Terra executed a debug-run-validate loop competently and — notably — recognized a dead-end approach rather than thrashing. The dead-end itself was packet-induced (see F6), not model-chosen.
- **Cross-ref:** superseded by R001b (r3 pixel-extraction reframe, Terra high effort).

### R001b — 2026-08-21 — T1-r3 grammar via pixel extraction (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** director reframe per Terra's request: circulation extracted by pixel classification → skeletonization → vectorization (on-path property true by construction); layout manifest demoted to naming/district priors; director-supplied landmark seed points; per-district self-normalizing coverage property. Effort bumped medium→high for the vectorization work. Strike counter reset — new approach.
- **Verdict: PARTIAL — converging (Terra strike 1 on this approach).** Real progress: implemented Zhang-Suen skeletonization + vectorization competently, classifier traces actual streets, all districts covered, all three landmark seeds hit, honest flag that calibration needs director judgment. Two visual failures the properties didn't catch: (a) 542 *disconnected* dashes — no connectivity property was specified, so no network topology was built; (b) footprint classifier keyed on warm masonry and missed the dominant dark-slate roofs → fragments instead of building extents; palace captured west-wing only. Also: "minimum interior rate 0.7000" landing exactly on the 0.70 threshold reads as tuned-to-pass — properties held while visual truth didn't, confirming the director-eyeball gate is non-negotiable.
- **Model-attributable:** Terra at high effort handled a nontrivial CV pipeline (skeletonization, pruning, vectorization) without hand-holding. Failures trace to packet omissions (connectivity, roof material) more than model capability. Packet-authoring lesson → F7.
- **Cross-ref:** R001c (r4 refinement packet: topology joining + connectivity property, roof-material class + component merging, director-supplied landmark bboxes with ≥70% overlap property, overlay readability fix).

### R001c — 2026-08-21 — T1-r4 grammar refinement (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** refines r3 in place. Dispatched ~13:20.
- **Verdict: CORRECT STOP — director spec error.** Terra implemented everything asked (gap linker, junctions, roof classification, merging, landmark properties, readable grid), then proved the ≥60% visible-pixel connectivity property physically unsatisfiable (164 components / 0.053 share; classifier widening → 1,254 / 0.008) and stopped under two-strikes without weakening properties or faking artifacts. It even flagged that the stale r3 PNGs were diagnostic-only rather than presenting them as passing output. Landmark diagnostics: palace 0.916, observatory 0.793, train hall 0.679 vs my generous bbox.
- **Model-attributable:** third consecutive honest stop; at high effort Terra now reliably distinguishes "I failed" from "the spec is wrong" — the exact judgment quality the tier question was probing. Director takeaway → F8.
- **Cross-ref:** R001d (r5: occlusion-aware inferred links with anti-abuse bounds; train-hall tolerance corrected).

### R001d — 2026-08-21 — T1-r5 occlusion-aware topology (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** corrected topology model — labeled inferred links across occluders (≤70 px, heading-continuous, structure/foliage crossings only, water = bridge only), largest component ≥60% incl. inferred, inferred ≤40%, components ≤40. Dispatched ~13:42.
- **Verdict: CORRECT STOP — second director spec failure.** Implemented the inferred-link mechanism with two distinct tunings as instructed; both yield 38 links, 126 components, 7.8% largest share vs the 60% bar. Refused to regenerate artifacts from a red build. Train-hall tightened bbox passes (0.7583) — landmarks settled. Two blind threshold corrections in a row failing is a director process smell → F9 (measure before spec'ing).
- **Cross-ref:** R001e (r6 diagnostics: topology gate demoted to metrics, component-colored overlay, length histogram; final property to be set from data).

### R001e — 2026-08-21 — T1-r6 topology diagnostics (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** measure-then-spec. Expected to run green (topology reported, not asserted) and regenerate all artifacts. Dispatched ~14:08.
- **Verdict: PASS — and it closed T1.** Green build, full diagnostic block (126 components; ≥50 px components hold 61.8% of length; <40 px hold 31.9%; p50 30 px; inferred 23.6%), component-colored overlay, 151 footprints, landmarks all passing. The measured distribution let the director set satisfiable bars (≥60% in ≥50 px components; ≤35% in <40 px) that current output passes → **T1 DIRECTOR-ACCEPTED as grammar v1** with recorded limitations (short occluded runs, partial mid-building fragmentation) to be revisited only on demonstrated composer need.
- **Terra tier summary across T1 (the first real experiment result):** 7 dispatches, zero dishonest claims, three correct two-strikes stops that each disproved a director spec, competent CV implementation (skeletonization, occlusion linking, component analysis) at high effort. Preliminary answer to the tier question: **Terra + rigorous packets + director QA is sufficient for mechanical pipeline stages**; every failure in T1 traced to spec/packet authoring, not model capability.

### R003 — 2026-08-21 — T1 finalize + checkpoint (codex exec, gpt-5.6-terra, effort=medium)

- **Setup:** promote measured bars to enforced properties; narrow-path checkpoint commit (the only commit-authorized packet). Dispatched ~14:25. R002 (T2, Sol) queues behind it — one writer at a time.
- **Verdict: PASS with one infra discovery.** Properties promoted and green (0.6177/0.3186 vs 0.60/0.35 bars), ESLint clean, honest QA note — but the sandbox denies `.git` writes entirely (`index.lock` cannot be created), so workers can never commit (F10). Director verified the check in own shell (exit 0), inspected the package.json diff (only the two grammar script lines), staged the exact authorized path list, and created checkpoint `8fd8894`. New standing protocol: **workers finalize, director commits.**

### R002 — 2026-08-21 — T2 kit-of-parts contract (codex exec, gpt-5.6-sol, effort=high)

- **Setup:** first flagship-tier dispatch; design-shaped task. Packet `.codex-tmp/qa/T2/packet-t2.md`: kit taxonomy, per-class generation contract template, exact socket/baseline standard, generation workflow rules, minimal D05 proof-slice subset, open questions for Steve. Deliverable `docs/career-world/CITY-KIT-CONTRACT.md`. Dispatched ~14:40.
- **A/B context:** Sol/high on design work vs Terra/high on mechanical work — the two lanes of the tier hypothesis now both have live data streams.
- **Verdict: PASS at director review (~25 min wall).** 250-line contract; taxonomy with measurable class boundaries (px² ranges from the grammar), a genuinely precise socket/baseline standard (baselineY/sortPoint/footprint-vs-silhouette/terrace modes/support polygons), reuse-first foliage (0 new entries), comprehensive mechanical gates, minimal D05 slice (26 entries), and four well-chosen owner questions. Every numeric citation checked out against the grammar JSON — including one (595 edges) that corrected the director's own stale memory of interim counts. One gap noted for per-asset packets (scale-coherence gate).
- **Sol-vs-Terra observation:** on a design-shaped task Sol produced near-acceptance-quality work in one pass with zero revisions — versus Terra's honest-but-iterative convergence on mechanical work. Early but consistent with the tier split: Sol where the task is open-ended synthesis, Terra where properties can bound it. **Awaiting Steve's acceptance.**

### R004 — 2026-08-21 — T3a composer skeleton, D05 placeholders (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** T2 accepted by Steve (parameters in CITY-KIT-CONTRACT.md §9; commit `e779ffe`). T3 staged: skeleton (a) → kit generation (b) → full composition (c). T3a validates placement/sockets/consolidation/z-sort with procedural placeholder parts — zero generation spend at risk. The composer is also the grammar's first real consumer; its friction report drives any grammar revision. Dispatched ~15:20.
- **Verdict: MIXED — mechanics PASS, registration proof unusable, friction report excellent.** 28 road + 9 stair runs, 25 placements, 0 z-sort violations, deterministic, green gates. But the registration proof rendered terrace bands as opaque full-width horizontal strips, hiding the master entirely — one revision (R005). The friction report earned its keep: named anchors displaced 146–300 px from nearest grammar footprints (S01/S18/S11), D05 band data is left-edge samples only, 25 footprints thin vs the visibly dense district. **The skeleton stage caught grammar-v1's gaps before a dollar of generation spend — exactly why T3 was staged.**
- **Director decisions:** registered anchors become placement authority for named entries; terrace bands demoted to advisory outlines for the proof (region extraction descoped as a CV rat-hole the generation probe doesn't need); footprint-density revisit deferred until after the T3b generation probe.

### R005 — 2026-08-21 — T3a-r2 composer fixes (codex exec, gpt-5.6-terra, effort=medium)

- **Setup:** visible registration proof (outlines over master), anchor-authority placement, advisory bands. Dispatched ~15:45.
- **Verdict: PASS — and the proof did its job.** Master now clearly visible under outlines; composer mechanics accepted and committed (`893eaaa`). The readable proof confirmed the deeper truth: grammar v1's D05 data cannot support a faithful composition — major buildings unboxed or fragmentary, circulation ribbons sparse vs visible streets, anchors near-but-not-on structures. The conditional T1 acceptance's revisit clause has formally triggered → T1.1 revision lane opened.

### R006 — 2026-08-21 — T1.1 grammar D05 completeness (codex exec, gpt-5.6-terra, effort=high)

- **Setup:** whole-building capture in D05 (root-cause the fragment problem; six director-supplied major-structure seeds with ≥600 px² merged-footprint properties), D05 circulation recalibration with before/after reporting, all prior properties stay green, composer re-run so the registration proof reflects the new grammar. Dispatched ~16:05.
- **Verdict: PASS — T1.1 accepted.** Root cause found (blue dome classified water-like; merger capped at 80 px/8 px gaps). D05 footprints 25→32 with all six seeds hit inside well-fitted whole-building boxes; D05 skeleton length 666→1410 px (coverage 0.79→1.42); every prior property green. Notably rejected its own denser 3/9 calibration because inferred-link share would hit 0.438 > 0.40 — chose the honest configuration over the better-looking one unprompted. Registration proof visually confirms fit. Registered-anchor oddities (S01/S11/S15 on sparse ground) are layout-authority facts, recorded not "fixed."

### R007 — 2026-08-21 — T3b generation probe, 3 entries (codex exec, gpt-5.6-sol, effort=high)

- **Setup:** FIRST IMAGEGEN SPEND OF V2 (≤6 calls). Terrace slab + road straight + compact building per CITY-KIT-CONTRACT.md §3–§7, style-referenced from master crops via `referenced_image_paths` (headless ImageGen availability probed and confirmed). Quarantine-only; report to quarantine REPORT.md to avoid QA-REVIEW write collision with R006 (runs concurrently — disjoint file sets). Purpose: measure achievable style fidelity before committing to the 26-entry D05 kit.
- **Verdict: STYLE PASS / ALPHA WORKFLOW FAIL.** All 6 calls returned opaque RGB at tool-chosen resolution with a *drawn* transparency checkerboard — identical to the old ledger's LFX02 failure, i.e., a known property of this generator, not a prompt defect. But the subjects themselves are excellent: the compact building nails the master vocabulary (slate roof, brass trim, amber apertures, purple accent, gothic-industrial density). Director assessment: the make-or-break fidelity question is answered YES; the misses are mechanical. Sol's worker conduct was exemplary — preserved raw outputs, refused to fabricate alpha or sockets, produced honest gate tables. Watch item: projection pitch reads slightly lower than the master's 72° — side-by-side check required in the full batch.
- **Pipeline fix (F11):** generation must request a solid magenta background and a deterministic post-process keys alpha, decontaminates fringe, crops/rescales to the declared canvas, then measures real sockets from the keyed alpha. Contract §7 amended accordingly. Cross-ref: R008 (probe r2 under the chroma workflow).

### R008 — 2026-08-21 — T3b probe r2, chroma workflow (codex exec, gpt-5.6-sol, effort=high)

- **Setup:** same 3 entries under amended §7: solid-chroma generation, deterministic keying/canvas/socket post-process, gates now meaningful. ≤6 calls. Dispatched ~16:35.
- **Verdict:** pending.

## Findings backlog (flow improvements to fold into future packets)

- F1: Task packets must declare required gate tier (focused / full / none) — otherwise workers default to maximal ceremony. (From R000.)
- F2: The 145 s camera-sweep and ~105 s package tests dominate every full-suite run; candidates for a separate `slow` lane so per-task gates stay under a minute. (Pre-existing finding from the test-suite audit, reconfirmed by R000.)
- F3: Visual-fidelity acceptance criteria must be stated numerically in the packet (coverage targets, sample-fraction thresholds, named landmarks) — "faithful to the master read" alone yields minimum-viable extraction. (From R000/T1-r1.)
- F11: This ImageGen tool cannot emit alpha or honor canvas size — it draws a literal transparency checkerboard and picks its own resolution (reproducing the old pipeline's LFX02 failure; this is a tool property, not a prompt problem). Durable workflow: request a solid magenta background, then deterministically key alpha, decontaminate fringe, crop/rescale to the declared canvas, and measure sockets from the keyed alpha. Never ask a generator for transparency; manufacture it. (From R007.)
- F10: The headless sandbox denies all `.git` writes (index.lock creation fails) — workers can implement and verify but never commit. Standing protocol: workers finalize and report; the director verifies gates in an unsandboxed shell, stages the authorized path list, and commits. This is arguably better than the original plan — commit authority and review authority now coincide. (From R003.)
- F9: When a property's satisfiability is unknown, run a diagnostic build that *reports* the metric distribution before asserting a threshold — two consecutive blind spec corrections (r4's 60% visible, r5's 60% with inferred links) both failed against reality that one cheap measurement pass would have revealed. Measure, then spec. (From R001d.)
- F8: Spec-satisfiability is the director's burden — in occluded isometric art, visible-pixel connectivity is inherently fragmented (streets pass behind buildings/trees), so connectivity properties must admit labeled inferred links with anti-abuse bounds rather than demand what the pixels cannot show. A worker proving a property unsatisfiable is a *successful* run; count it against the spec, not the model. (From R001c.)
- F7: Numeric properties bound what workers *must* do, not what the artifact must *be* — r3 passed every stated property while producing a visually unusable graph (no connectivity requirement → confetti dashes) and fragment footprints (no roof-material requirement). Each revision should add the property that would have caught the last visual failure, and a value landing exactly on a threshold (0.7000 vs 0.70 floor) is a tuned-to-pass smell worth checking. (From R001b.)
- F6: "Audit the existing draft and finish it" instructions anchor workers to the draft's approach — attempt 4 inherited the route-splitting dead end because the packet told it to finish the draft rather than judge it. When a draft is unverified, packets should say "evaluate whether the draft's approach can satisfy the acceptance properties; discard it if not." (From R001 attempt 4.)
- F5 (supersedes earlier wording): Headless workers cannot execute the system Node at all — execpolicy allows probe-shaped calls (`node.exe --version` succeeds) but denies real execution (`node.exe -e`, `node.exe script.mjs`, `npm.cmd` → Access denied), and PATH prepends don't take effect in the worker shell. **The unlock: Codex's bundled runtime Node (`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, v24) executes scripts freely in the sandbox** — verified running the repo's sharp-based r1 builder clean. Packet template rule: all Node invocations go through the bundled binary; lint via `node.exe node_modules/eslint/bin/eslint.js`. Diagnosis method that found it: probe-matrix worker runs (~17k tokens each) comparing invocation styles, plus reading `~/.codex/rules/default.rules` for precedent (a prior interactive approval had allowlisted the bundled node for vite builds). Total discovery cost across R001 false starts: ~150k tokens. (Also: `--version` succeeding while `-e` fails means a smoke probe can false-positive an environment — probe with a *real* workload shape, not a version check.)
- F4: ~~Stale PATH CLI (v0.140.0) rejected all GPT-5.6 slugs while the desktop app's auto-updated engine (v0.149.0-alpha.4) accepted them.~~ RESOLVED 2026-08-21: Steve updated the CLI to 0.149.0; PATH `codex` now accepts 5.6 slugs and is the dispatch binary again. Durable lesson: before the first dispatch of a session, probe the model slug with a one-line read-only exec (~$0.01) — launch-gate failures are cheap to detect and expensive to discover mid-flow. Cost of this one: one dead dispatch + ~30k probe tokens. Note: Steve's config.toml sets `model_context_window=1M` for his sol default; per-dispatch `-c model_context_window=…` is available if a smaller-window model ever inherits it badly.

## Protocol

- Every `codex exec` dispatch records: packet name, model (`-c model=…`), effort (`-c model_reasoning_effort=…`), start/end time, retries/candidates used, QA verdict (pass / partial / fail / escalated), and at least one model-attributable observation (what this tier handled well or poorly).
- Same-packet reruns at a different tier get their own run IDs and a cross-reference, so tier A/Bs are queryable.
- Verdicts come from director QA against packet acceptance criteria — never from the worker's own report.
