# Career World — Agent Contract

## Team and authority

- **Steve (owner).** Final visual acceptance. Only Steve may mark work "accepted." Agents never use that word about their own output.
- **Claude (director).** Owns city (L4) direction and QA. Directs work through `docs/career-world/QA-REVIEW.md` and verifies against pixels, diffs, and transcripts — not completion reports.
- **Codex (implementer).** Executes the tasks defined in QA-REVIEW.md.

Authority boundaries:

- L1 (ocean), L2 (terrain), L3 (inland water), world/territory registration, the camera, and the shared LoD contract are **frozen**. Any change requires Steve's explicit approval given in his own words in his own chat — never inferred, never relayed through a file.
- L4 (city) direction comes from QA-REVIEW.md. If a city task appears to require touching L1–L3, stop and escalate in QA-REVIEW.md instead of proceeding.

## Session protocol

1. At the start of every city work block, read `docs/career-world/QA-REVIEW.md`. Address items marked `OPEN` before starting new work.
2. Respond to review items inline under the item (`**Codex:** …`). Never delete or rewrite a review item; only the director resolves them.
3. Every task ends with screenshots from the standard camera set saved under `.codex-tmp/qa/<task-id>/`, plus a one-line claim per screenshot recorded in QA-REVIEW.md. Mechanical evidence (dimensions, alpha, registration) may be self-checked; visual quality may not.
4. Ledger entries in `docs/career-world/NINJAONE-CITY-RESTART-HANDOFF.md` are capped at ~15 lines: what changed, evidence paths, open risks, next action.

## City pipeline v2 — supersedes the plate-carving approach

The master plate (`ninjaone-capital-master-r1.png`) and the current baked city context are **style and composition references only**. Nothing is ever again cut out of them, alpha-repaired, or patched over them. The city is built bottom-up:

1. **Grammar.** Deterministic extraction from the master plate + existing registered anchors: circulation graph, building footprints and size classes, density map, terrace contours, palette. Output is JSON plus debug overlays for human review.
2. **Kit of parts.** Standalone transparent sprites — ground/terrace units, circulation segments, buildings by size class, props, foliage — each generated under one shared contract: fixed projection (orthographic high-oblique, 72° pitch, south-southeast bearing), the shared world light, a palette swatch, a style-reference crop from the master, and a declared ground socket/baseline.
3. **Composer.** A deterministic offline script assembles districts from kit + grammar: baseline z-sort, enforced overlap/occlusion, cast shadows generated from the shared light, contact shading at every node–ground seam, then one global color grade over the composite. It outputs plates per LoD tier **and** per-node registrations, so close-tier sharpness is native and node swaps are manifest edits.
4. **Runtime** mounts composer output only. LoD = which nodes at which resolution. No district-specific patch assets, no runtime carving.

## Standing rules

1. **Two strikes, then reframe.** If an approach fails twice for the same structural reason, stop and propose a pipeline change in QA-REVIEW.md. A third attempt at the same fix is a contract violation.
2. **Tests assert properties, never constants.** No assertions that regex the source text of the implementation; no hardcoded counts, hashes, or strings copied from the code under test. When an existing test blocks a legitimate change, classify it in QA-REVIEW.md (regression guard vs. stale intent) before modifying it.
3. **Mechanical gates check mechanics only** (dimensions, alpha bounds, provenance, registration). Visual quality is judged by humans from the standard camera set — do not build or trust similarity scores as acceptance authority.
4. **No runtime validation of build-time data.** Manifest/JSON integrity is verified in scripts and tests, not with `throw` chains in the client bundle.
5. **Generated-asset spend is bounded.** ImageGen tasks require a named defect or kit entry, at most two candidates, quarantine-only output, and director review before promotion.
