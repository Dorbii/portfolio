# CW-004 Art Correction Replan

Status: **PROPOSED FOR QA-LEAD CRITIQUE AND DIRECTOR DECISION — NO CALLS AUTHORIZED**

Run ID: `career-world-2026-07-16`

Slice: `CW-004`

Machine-readable companion: `docs/career-world-production/reports/art-correction-replan.json`

## Decision boundary

This document is a correction replan, not a generation packet. It does not authorize image generation, image mutation, archival copies, candidate promotion, product-code work, runtime concept references, tracing, 3D work, queue or ledger mutation, staging, or commit.

The 45 assets that independent QA classified as `PASS` or `PASS_WITH_NOTES` are frozen and out of scope. Only the exact 11 `REGENERATE` assets below may enter a later Director-authorized correction packet.

## Trigger and current verdict

The frozen full-library QA result is:

- `PASS`: 30
- `PASS_WITH_NOTES`: 15
- `REGENERATE`: 11
- `REJECT`: 0
- material blocker assets: 11
- material blocker gate results: 19
- runtime references or byte-identical runtime copies: 0

The QA contract stops the correction wave when more than eight assets require regeneration. `11 > 8`, so the current verdict remains `STOP_DO_NOT_PROMOTE_FULL_LIBRARY`. The source manifest still hashes to `7FE7DE3DAA16BAE5F2B091063F151621A2530ACAF2B2FFD082FC2AB41E7A4D14`.

Authoritative evidence:

- `docs/career-world-production/reports/art-full-qa.json`
- `docs/career-world-production/reports/art-qa-batch-1.json`
- `docs/career-world-production/reports/art-qa-batch-2.json`
- `docs/career-world-production/reports/art-qa-batch-3.json`
- `docs/career-world-production/briefs/art-full-qa.md`
- `docs/career-world-production/architecture.md`, especially D-010
- `docs/career-world-asset-map.md`
- the three immutable generation reports and packets

## Authority conflict and ruling

| Claim | Source | Ruling |
|---|---|---|
| A normal targeted retry defaults to the unchanged manifest prompt plus one narrow addendum. | Frozen QA contract | Still applies to isolated retries, but the same contract stops this wave and requires an explicit brief/art-direction replan because 11 assets failed. |
| D-010 requires selection of one complete traceable panel and does not use generated cross-panel parity as runtime geometry authority. | Accepted architecture | Binding. It defines the useful output of concept generation. |
| The specific concept render format is not locked; identity, reuse, palette, projection, and LOD behavior are locked. | Accepted asset map | Binding. A one-panel r1 concept can preserve the locked visual system without mutating the v0 prompt. |
| This replan must consider one large unlabeled canonical hero panel with no multi-LOD grid, swatches, or text. | Current Director task | Highest and most specific instruction for the proposed r1 contract. |

Ruling: the original manifest, packets, prompts, PNGs, generation reports, and QA reports remain byte-for-byte immutable historical evidence. A later r1 packet may create a new derived prompt that supersedes **only** the v0 composition/framing and cross-panel-LOD clauses. It may not alter asset identity, required primary topology, projection, authored orientation, technical-cartography style, palette family or neutrality, material language, evidence boundary, avoid list, or easter-egg rule.

This avoids the unsafe alternative of appending a one-panel instruction to a still-active four-panel instruction. The r1 prompt must have one unambiguous composition authority.

### Alternatives considered

**Path A — immutable v0 prompt plus a narrow addendum:** This is the frozen default for an isolated retry. It minimizes textual change, but it keeps the four-panel grid and sheet-like presentation implicated in all eight topology/traceability failures and all three text failures. Adding a hero-only instruction would also leave the model with contradictory active composition requirements. Do not use Path A for this systemic wave.

**Path B — a separately versioned derived r1 prompt:** Preserve the v0 prompt and hash as history, extract its locked identity/style/projection/palette/evidence clauses, replace only its multi-panel composition and cross-panel clauses, and add the exact QA correction. This is the recommended path because it gives the model one composition authority and aligns the generated artifact with D-010's actual consumer: one canonical trace panel.

The new evidence invalidates one assumption only: that the normal unchanged-base-prompt retry is adequate for this 11-asset correction wave. It does not invalidate D-010 or any locked identity, reuse, projection, style, palette, evidence, or isolation decision. The affected scope is exactly the 11 blockers.

Path B creates a mixed source-sheet presentation: 45 accepted assets retain multi-panel v0 sheets while up to 11 corrected assets use single-panel r1 sheets. That is a real documentation-consistency risk, but regenerating 45 accepted assets for cosmetic consistency would be unjustified. Mitigation is to record `composition_version`, selected trace crop, source prompt hash, and derived prompt hash for every r1 asset and to treat sheet layout as non-authoritative. Any later uniform presentation should be code-native documentation derived from accepted geometry, not another concept-art wave.

## Exact blocker set

The blocked set is the independent-QA union, not the generation self-flag set.

| Asset | QA / generation | Blocked gates | Concrete visible evidence | Required invariant and smallest correction |
|---|---|---|---|---|
| `skill/operator-control@v1` | QA-1 / A | topology; traceability | Every usable panel has one exposed switchback access system. A second would require invention. | Show exactly two separately readable switchback ramp assemblies and landings; preserve the cabin, stepped plinth, rear hall, neutral palette, projection, and no-text rules. |
| `project/vendy-vm-platform@v1` | QA-1 / B | topology; traceability | The gantry is one straight tower-to-tower span in every panel; no fork or branch exists. | Show one unmistakably branching connected overhead gantry with a readable branch landing; preserve both towers, dock, kiosk, apron, palette, projection, and evidence boundary. |
| `skill/workflow-orchestration@v1` | QA-1 / C | topology; traceability | Seven distinct low perimeter bays are visible. | Show exactly six separately readable staggered bays; preserve the drum, interrupted ring ramp, neutral palette, projection, and no-diagram/no-text rules. |
| `skill/atlassian@v1` | QA-1 / C | text/logo/watermark absence | The PNG prints `BACKGROUND`, `SURFACE`, `LIT FACE`, `SHADOW FACE`, `INK`, `FOCUS`, `ACCENT`, and `EMISSIVE`, plus pseudo-label marks. | Render no words, legends, swatches, pseudo-text, product marks, or marked sign area; preserve the accepted chevron hall and neutral palette. |
| `city/ninjaone@v1` | QA-2 / A | topology; traceability | Only two independently readable radial annexes exist; the entrance vestibule is not a third annex. | Show exactly three separately visible, connected, unoccluded low radial annexes; preserve the octagonal hall, beacon, clipped-diamond footprint, teal palette, projection, and blank sign slot. |
| `skill/java@v1` | QA-2 / A | text/logo/watermark absence | A pseudo-letter-like mark appears above the entrance where the sign slot must be blank. | Render a completely blank sign plane and no text or pseudo-text anywhere; preserve the long-span hall, tower, colonnade, two wings, neutral palette, and projection. |
| `skill/openapi@v1` | QA-2 / B | text/logo/watermark absence | The lower panels print `LOD-0`, `LOD-1`, and `LOD-2`. | Render no captions, words, numbers, legends, pseudo-text, or marks anywhere; preserve the portals, vault, ramps, canopy, neutral palette, and projection. |
| `project/tanium-risk-assessment@v1` | QA-2 / C | topology; traceability | Every detail panel has only two independently readable wedge halls before the tower. | Show exactly three distinct connected and interlocked wedge halls; preserve the forecourt, zigzag trench, audit tower, orange palette, projection, and no-metric/security-symbol boundary. |
| `skill/react@v1` | QA-3 / A | topology; traceability | Every panel shows two terrace wings plus the rear bar; the third wing and three-wing pinwheel are absent. | Show exactly three distinct cascading terrace wings around the stage plus a separate rear bar; preserve neutral palette, projection, blank sign area, and symbol/text bans. |
| `project/contextforge@v1` | QA-3 / B | topology; traceability | The fabrication hall reads as one long rectangle; no complete perpendicular leg establishes an L-shaped footprint. | Show one fully visible, unmistakable L-shaped hall with the sawtooth bank, tower at the offset elbow, bridge, and cylinder preserved. |
| `skill/context-compression@v1` | QA-3 / B | topology; traceability | Every panel contains three decreasing freestanding frames around the core. | Show exactly four distinct progressively smaller freestanding rectangular frames seated on the tapered base; preserve neutral palette, projection, and text/symbol bans. |

Full v0 hashes, dimensions, byte counts, archive paths, candidate paths, and gate evidence are frozen in the companion JSON report.

## Systemic diagnosis

Confirmed findings:

1. Eight of eleven assets fail primary topology and traceability. Six are exact-count failures, one is a required connection-pattern failure, and one is a required footprint-language failure. The defect repeats across every usable panel, so D-010 cannot select around it.
2. Three of eleven assets fail the unconditional whole-PNG text gate. The contamination appears as an LOD caption, a palette legend, or pseudo-text on a sign area.
3. The failures are distributed across original generation batches A/B/C as 4/4/3. This is not isolated to one worker or one packet.
4. Generation self-screening flagged nine of the eleven. Vendy was marked ready; ContextForge was marked ready despite its generation record already noting that the L-shaped footprint read rectangular. Independent QA must remain authoritative.
5. The eleven blockers do not establish a projection, palette, technical-cartography, or evidence-boundary system failure. Redesigning those accepted dimensions would add risk without addressing the observed gates.

Best-supported inference, not model telemetry:

- The four-panel reference-sheet composition makes the model repeat exact geometry several times while also inviting captions, legends, swatches, and sign-like graphic treatment. That likely competes with exact count, connection, and footprint fidelity.
- Replacing the sheet grid with one large canonical panel removes the repeated-geometry requirement and the graphic-design affordances that produced all three text failures. It is the smallest systemic change aligned with D-010.

This inference is testable. It must pass a three-asset calibration cohort before the remaining eight assets can be released.

## Proposed r1 generation contract

### Immutable inputs

Every r1 record must reference, without changing:

- the frozen manifest record and manifest SHA;
- the original generation packet and full-prompt SHA;
- the v0 output path, SHA, dimensions, and byte count;
- the independent QA record, blocked gates, visible defect, required invariant, and smallest correction;
- the locked asset identity, evidence status, palette ownership or neutrality, projection, style, materials, avoid list, and easter-egg rule.

### Sole composition authority

The r1 prompt must use this composition contract:

```text
PRIMARY GEOMETRY INVARIANT — HIGHEST PRIORITY:
{asset-specific exact count, connection, or footprint invariant}

Render exactly one large, complete, unoccluded canonical hero view of this one asset.
Use the locked orthographic true-isometric camera and authored orientation.
Center the complete primary form with generous margin on the near-black navy drafting field.
Expose every identity-defining mass, connection, landing, footprint turn, and base contact needed for deterministic SVG tracing.

Do not render a second view, alternate angle, LOD grid, inset, silhouette panel, comparison panel, palette strip, swatch, legend, caption, annotation, UI, border title, word, letter, number, logo, watermark, or pseudo-text.
Apply the locked palette values to the geometry only; never visualize the palette as a labeled or unlabeled swatch strip.
Keep every sign or glyph plane completely blank and unmarked.

Preserve verbatim from the source record: asset identity and all nonfailed primary forms; projection and authored orientation; technical-cartography style; palette family or neutral palette; material language; evidence and entertainment boundary; avoid list; easter-egg rule.
```

Each asset adds one narrow correction clause from the blocker table. No generic `make it better`, speculative redesign, or neighboring-asset change is allowed.

### Call and output rules

- One distinct built-in imagegen call per asset.
- Fresh generation only. Omit both `referenced_image_paths` and `num_last_images_to_include`.
- The v0 candidate, tracer art, accepted peer art, and other r1 output may not be supplied as input.
- No CLI fallback, image edit, compositing, copy-as-generation, manual paintover, or model/3D pipeline.
- One returned candidate consumes the asset's sole r1 attempt. A tool error, absent output, wrong output path, or unusable artifact stops that asset and returns to the Director; it does not imply a second call.
- Generators record facts and technical deviations only. They may not assign `PASS`, promote, or perform independent re-QA.

## Rejected-candidate preservation and candidate isolation

No r1 call may occur until the corresponding v0 bytes are preserved.

Proposed noncanonical roots:

- rejected evidence: `design/career-world/rejected-candidates/cw004-v0/`
- r1 candidates: `design/career-world/correction-candidates/cw004-r1/`

Both roots remain design-only and outside `design/career-world/concepts/`. The existing D-012 rule covers only `design/career-world/concepts/**/*.png`; it does **not** cover either proposed root. Before any archive directory, archive PNG, candidate directory, or imagegen call is created, a separate Director-authorized `.gitattributes` change must activate these exact rules:

```gitattributes
design/career-world/rejected-candidates/**/*.png filter=lfs diff=lfs merge=lfs -text
design/career-world/correction-candidates/**/*.png filter=lfs diff=lfs merge=lfs -text
```

The executor must verify both proposed paths with `git check-attr filter diff merge text -- <path>` and require `lfs`, `lfs`, `lfs`, and `unset`. Storing either PNG family as raw Git blobs is forbidden. This replan does not authorize or make the `.gitattributes` change.

Canonical closure is defined as the exact 56 manifest ID/path pairs under `design/career-world/concepts/`; nothing else can satisfy or replace one of those paths. Rejected and r1 files are noncanonical extras and must be maintained in separate exact inventories with their own expected counts, paths, hashes, dimensions, bytes, provenance, and statuses. They are not counted as canonical-path extras, but they also may not be ignored by integrity or isolation checks.

Runtime-isolation scans must cover all three design roots: canonical concepts, rejected candidates, and correction candidates. For every inventoried PNG, scan `app/`, `features/`, `tests/`, and `public/` for exact-path and basename references and for same-name or byte-identical copies. The expected result remains zero runtime references and zero runtime copies. The intentional design-only archive duplicate is recorded as preservation evidence, not mistaken for a runtime copy.

Per asset, a later authorized executor must:

1. Verify the two exact D-012 LFS rules and path-level attributes above. Stop before creating a directory or binary if either path is not LFS-covered.
2. Recompute the canonical v0 SHA, dimensions, byte count, and PNG signature and match the frozen QA record.
3. Copy the exact bytes to the proposed hash-bearing rejected-evidence path. If that path already exists with a different hash, stop. Do not delete or overwrite either copy.
4. Recompute the archive SHA and require byte-for-byte equality before any generation call.
5. Generate the r1 image only at the separate candidate path. The canonical path remains unchanged during generation and re-QA.
6. Record v0 canonical path, rejected-evidence path and hash, r1 candidate path and hash, source prompt hash, derived r1 prompt hash, generator identity, call count, and tool result.
7. Maintain separate canonical, rejected-evidence, and r1-candidate inventories and include all three in runtime-reference/copy scans.
8. Never use the rejected archive or r1 candidate as runtime content, as a raster input, or as a raw Git PNG blob.

Promotion is a later, separate Director decision. Only after a candidate passes independent re-QA may a promotion packet propose replacing its canonical path. The immutable v0 generation and QA reports are never rewritten.

## Disjoint generation batches and staged release

The proposed generation batches are pairwise disjoint and their union is the exact 11-asset blocker set. Each contains assets from original generation lanes A, B, and C.

| r1 generation batch | Calibration item first | Remaining items, held until calibration passes |
|---|---|---|
| `r1-generation-a` | `project/contextforge@v1` — footprint-language failure | `city/ninjaone@v1`, `skill/react@v1`, `skill/atlassian@v1` |
| `r1-generation-b` | `skill/openapi@v1` — generated-text failure | `skill/operator-control@v1`, `project/vendy-vm-platform@v1`, `project/tanium-risk-assessment@v1` |
| `r1-generation-c` | `skill/workflow-orchestration@v1` — exact-count failure | `skill/java@v1`, `skill/context-compression@v1` |

There are two possible release decisions, neither granted by this document:

1. `CALIBRATION_RELEASE`: after QA-lead critique and explicit Director approval, at most the first item in each generation batch may run in parallel.
2. `REMAINDER_RELEASE`: only after all three calibration candidates independently receive `PASS` or valid `PASS_WITH_NOTES`, the Director may separately release the remaining eight one-call records.

Any note touching primary topology, traceability, text, logo, watermark, projection, style, palette ownership, evidence boundary, or runtime isolation is not a valid `PASS_WITH_NOTES`; it is a blocker under the frozen QA contract.

## Independent r1 re-QA

Three non-generator QA workers receive a remixed, disjoint 4/4/3 partition. Every QA batch includes candidates from all three generation batches:

- `r1-qa-1`: ContextForge, operator-control, Java, Atlassian.
- `r1-qa-2`: OpenAPI, NinjaOne, context-compression, Tanium risk assessment.
- `r1-qa-3`: workflow-orchestration, Vendy VM platform, React.

The generation workers and QA workers must be different people/agents. Each reviewer must inspect the whole candidate at original detail, recompute hash/dimensions/bytes, select and record the one canonical trace panel and normalized crop, and rerun all nine frozen hard gates—not only the repaired gate.

An r1 candidate is promotion-eligible only with `PASS` or valid `PASS_WITH_NOTES`. Any r1 blocker makes that candidate `REJECT` for this cycle. No r2 call is allowed without another explicit brief/art-direction replan.

## Stop conditions

Stop before any call if:

- QA lead has not critiqued the proposed contract or the Director has not explicitly approved the relevant release;
- the exact D-012 LFS rules for `rejected-candidates/**/*.png` and `correction-candidates/**/*.png` are not active and verified at the proposed paths, or raw Git PNG storage is proposed;
- the manifest, source generation report, source QA report, source prompt hash, v0 artifact hash, dimensions, bytes, or PNG signature drifts;
- the 11-asset union, pairwise disjoint batches, archive paths, or candidate paths do not validate;
- canonical closure is not the exact 56 manifest ID/path pairs, the rejected/candidate inventories are incomplete, or any of the three design roots is omitted from runtime-reference/copy scans;
- any of the 45 nonblocked candidate hashes changes;
- v0 rejected evidence is not preserved and independently hash-verified first;
- a candidate path already exists, a raster input is proposed, or any output is under a canonical or runtime-served path;
- the derived prompt changes identity, nonfailed topology, projection, style, palette ownership, evidence boundary, avoid list, or easter-egg rule;
- any product, runtime, test, public, queue, ledger, 3D, git staging, or commit mutation is bundled into the correction wave.

Stop the wave after calibration if any of the three calibration candidates is `REGENERATE` or `REJECT`, or if the shared contract causes a new hard-gate failure. Do not release the remaining eight.

After remainder release, stop the affected asset on any technical failure or hard-gate blocker. Do not make a second call. Full-library promotion remains blocked until all 11 r1 candidates independently pass, all 45 nonblocked hashes remain unchanged, the canonical set is exactly 56, rejected v0 evidence is preserved, and runtime isolation remains clean.

## Requested critique and decision

QA lead should return `GO`, `GO_WITH_REQUIRED_CORRECTIONS`, or `NO_GO` on:

1. the composition-only supersession ruling;
2. the one-panel contract and whole-PNG text ban;
3. rejected-evidence and r1 candidate path isolation;
4. the three-item calibration gate and 4/4/3 re-QA partition;
5. the no-r2 and no-product/no-3D stop conditions.
6. the D-012 LFS precondition, raw-Git prohibition, separate binary inventories, exact-56 canonical closure, and all-root runtime-isolation scans.

Only the Director may then approve, revise, or reject the replan and issue a generation release. Until that happens, the required action is `WAIT_FOR_QA_LEAD_CRITIQUE_AND_DIRECTOR_DECISION`.
