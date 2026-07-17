# CW-004 Full Concept Library QA Contract

Status: frozen before terminal inspection of the generated 56-asset library.

Packet: `CW-004-QA`

Source manifest: `docs/career-world-production/concept-briefs.json`

Source manifest SHA-256: `7FE7DE3DAA16BAE5F2B091063F151621A2530ACAF2B2FFD082FC2AB41E7A4D14`

Machine-readable partition: `docs/career-world-production/briefs/art-qa-batches.json`

## Purpose and scope

This packet defines the independent acceptance gate for the 56 canonical concept PNGs before any of them become tracing inputs for runtime geometry. It covers one world, five employer cities, sixteen projects, twenty-seven skills, and seven ambient assets.

The QA lane is read-only for images. Reviewers may inspect files and write reports. They may not generate or edit art, change prompts or the manifest, touch product code, begin 3D work, update the queue or ledger, stage, or commit.

A terminal library verdict is prohibited until all three generation lanes have reported complete and all 56 exact manifest outputs exist. Reviewers may record non-terminal observations while generation is active, but those observations are not promotion evidence.

## Authority order

Apply these sources in order:

1. `docs/career-world-production/concept-briefs.json` at the exact SHA above: asset ID, category, output path, evidence status, `asset_brief`, easter-egg rule, prompt constraints, and avoid list.
2. `docs/career-world-production/architecture.md`, especially the locked product contract and D-010.
3. `docs/career-world-asset-map.md`: identity, reuse, palette, projection, evidence, and anti-drift rules.
4. The three generation packets: exact one-call-per-asset and runtime-isolated output contract.
5. Tracer generation and QA reports as historical failure evidence only. Their cross-panel pixel-parity rejection does not override D-010.

If the manifest SHA changes, stop. Do not silently review against a different brief.

## D-010 interpretation

Generated multi-panel equality is not a runtime geometry gate. For each asset, QA must identify one complete, unoccluded, safely traceable canonical panel. That selected panel defines the visual identity that code-native master geometry will reconstruct. Runtime LODs are then derived from that one master and may remove interior detail only.

Consequences:

- Cross-panel pixel equality, silhouette IoU, equal tier counts, and exact generated LOD parity are not acceptance gates.
- A secondary panel with a different small prop, seam pattern, detail density, or simplified edge is a note when one safe canonical panel remains unambiguous.
- Do not average, blend, or borrow geometry from conflicting generated panels.
- Cross-panel inconsistency becomes material only when no single panel safely defines the requested primary topology, the apparent identity changes, the selected panel is occluded or truncated, or the contradiction makes the `asset_brief` ambiguous.
- A silhouette inset alone is not the canonical source when the asset requires readable exterior topology; select a complete primary-form panel.

The Evergreen tracer history is the explicit lesson: its repeated panel-profile mismatch was a failure under the former parity test, not proof that code-native geometry must drift. Full-library QA asks whether one panel clearly defines the three-form cluster and shared pad in the locked style.

## Review procedure

For every assigned asset:

1. Resolve the exact manifest record by ID and verify the output path byte-for-byte.
2. Recompute SHA-256 and inspect the PNG header and pixel dimensions from disk.
3. Inspect the complete image at original detail. Cropped follow-up inspection is allowed, but it does not replace the whole-sheet inspection.
4. Select one canonical trace panel. Record its semantic role, a plain-language sheet-region descriptor that another reviewer could find without guessing, and normalized crop bounds relative to the complete image.
5. Evaluate every hard gate below against the exact `asset_brief`, easter-egg rule, prompt constraints, and category-specific rules.
6. Record concrete visible evidence. Do not infer missing structure, excuse a generated mark as harmless, or treat intended prompts as proof of the resulting pixels.
7. Return one of `PASS`, `PASS_WITH_NOTES`, `REGENERATE`, or `REJECT`.

Normalized crop bounds use `[0,1]` image coordinates with origin at the upper-left:

```text
x_min >= 0
y_min >= 0
x_max <= 1
y_max <= 1
x_min < x_max
y_min < y_max
```

The descriptor must include position and recognizable form, for example: `upper-left large panel containing the complete domed observatory and square base`. Labels such as `panel 1` or `best one` are not sufficient.

## Required per-asset record

Every review record must contain:

- `asset_id`, `category`, `evidence_status`, and exact `output_path`.
- Recomputed lowercase or uppercase SHA-256, file byte count, PNG format, width, and height.
- `canonical_trace_panel` with:
  - `panel_role`: `lod_0`, `lod_1`, `lod_2`, or `unspecified_detail_panel`;
  - unambiguous `region_descriptor`;
  - `normalized_crop_bounds` with `x_min`, `y_min`, `x_max`, and `y_max`;
  - whether the complete primary form is visible, unoccluded, and internally consistent;
  - a concise reason this panel can serve as the sole master-geometry reference.
- One result for every gate: `pass`, `note`, `blocker`, or `not_applicable`, plus visible evidence and manifest evidence when relevant.
- Cross-panel observations, explicitly classified as nonblocking or material under D-010.
- Outcome, findings, targeted correction if needed, and reviewer identity.

No aggregate numeric score is used. A score cannot make a blocker disappear, so this contract avoids the false precision entirely.

## Hard gates

### 1. Artifact integrity and identity

- Exact manifest ID and exact output path exist once.
- File is a non-empty, decodable PNG with recorded hash and dimensions.
- The image contains one canonical identity only, except the world asset's explicit five-district geography exception.
- The result is visibly the requested asset, not a neighboring asset, generic replacement, or alternate concept.

Missing or corrupt output is `REGENERATE`. An ID/path mismatch or wrong asset under the path is `REJECT` until provenance is corrected.

### 2. Canonical panel and primary topology

- One complete panel can be selected without blending other panels.
- Its primary masses, count, arrangement, connection pattern, footprint language, and defining topology match `asset_brief`.
- It is not clipped, heavily occluded, melted, or too ambiguous to trace.
- Small facade details may differ from other panels; wrong or missing primary topology is a blocker.

### 3. Projection and authored orientation

- Orthographic true-isometric presentation is visually credible.
- Ground axes remain parallel, verticals remain vertical, and there is no material perspective convergence.
- The selected panel does not use a conflicting rotation or cinematic camera.

Minor hand-drawn imprecision is a note. Obvious perspective or a different authored view is `REGENERATE`.

### 4. Technical-cartography style and palette suitability

- Near-black navy drafting field, matte low-value faces, thin construction strokes, restrained emissive accents, minimal bloom, and hard traceable edges remain legible.
- No photorealism, PBR showcase, generic cyberpunk neon, painterly treatment, dashboard, relationship graph, or logo-plinth composition.
- Skill concepts remain employer-neutral in geometry and color ownership. Their structure, linework, accents, and sign/glyph area must be separable enough for later employer palette slots.
- Employer city and project palettes may carry their manifest-authorized family, but cannot depend on generated branding.

### 5. Primary-form traceability

- The selected panel exposes the complete outer form and all identity-defining connections needed for deterministic SVG reconstruction.
- Edges are separable from the background and from decoration.
- The reviewer can describe the master silhouette and primary masses without inventing hidden geometry.

An attractive sheet with no safe trace panel is `REGENERATE`.

### 6. Text, logo, watermark, and branding safety

- No generated words, initials, numbers, pseudo-text, labels, captions, UI, logo, wordmark, mascot, provider mark, or watermark.
- Blank sign or glyph slots may exist only when the manifest permits them; they must remain blank in the concept PNG.
- A recognizable generated brand mark is not excused because the underlying technology is real.

Any visible generated text, logo, or watermark is a blocker.

### 7. Connected and physically readable primary structure

- Primary masses that the brief defines as one structure are visibly connected by plausible foundations, necks, corridors, platforms, or joints.
- No floating major mass, accidental tangency, broken bridge, impossible stair, melted facade, detached required pod, or incoherent load path.
- Optional decoration may be detached only when the brief explicitly defines it as a separate object.

Disconnected or impossible primary structure is `REGENERATE`.

### 8. Evidence and entertainment boundary

- The concept remains illustrative navigation art. It does not claim measured scale, traffic, throughput, metrics, outcomes, real-campus architecture, or private system detail.
- Easter eggs are physical decorations only and must match the exact manifest rule. They cannot become labels, dashboards, factual diagrams, or evidence.
- Evidence-backed records may visualize only their approved brief.
- The six `identity-only` ACE Hardware and Column Technologies project concepts must contain no stack symbols, technical architecture, metrics, outcome claims, real-campus implication, or easter egg.
- `skill/java@v1` is user-required but unplaced; its image cannot imply an employer or project link.
- Employer-supported but unlinked skills cannot imply a project association.

Factual drift or an evidence-hold violation is a blocker even when the image is aesthetically good.

### 9. Runtime isolation

- Canonical concept art stays under `design/career-world/concepts/`.
- The exact output path is not referenced by `app/`, `features/`, `tests/`, or `public/` and is not copied into a runtime-served concept directory.
- The PNG remains design evidence only; code-native geometry and registries remain runtime authority.

Any runtime concept-art dependency blocks library promotion until removed. It normally requires a code/path correction, not image regeneration.

## Category-specific checks

- `world`: one coherent authored geography with the exact manifest topology and five empty buildable anchors; no city, project, or skill architecture.
- `city`: one employer-capital identity, not an entire alternate city plan and not a real-campus claim; no embedded project or skill buildings.
- `project`: one unique project landmark matching the requested primary topology. It must not duplicate a skill building or introduce an unsupported stack claim.
- `skill`: one neutral reusable building geometry; no employer baked into structure, logo, palette ownership, or factual association.
- `ambient`: one isolated reusable prop identity with a complete traceable form; no unrequested scene, building, brand, or factual meaning.

## Outcomes

`PASS`

- Every hard gate passes.
- One safe canonical panel and crop are locked.
- No material caveat remains.

`PASS_WITH_NOTES`

- Every hard gate passes and no gate is `blocker`.
- Notes are limited to non-authoritative secondary-panel inconsistency, minor decorative ambiguity outside the selected panel, or a tracing caution that does not require invention.
- The selected panel still fully defines the requested primary topology.

`REGENERATE`

- The manifest brief is valid, but the image has a correctable material visual failure: wrong or missing primary topology, no usable canonical panel, projection/style failure, generated text/logo/watermark, disconnected impossible primary structure, or factual/evidence drift.
- The report must name the exact visible defect, the required invariant, and the smallest correction. Generic requests such as `make it better` are invalid.

`REJECT`

- Provenance or identity is wrong, the artifact cannot be trusted under its manifest ID, a targeted retry failed again, or the result would require changing the accepted brief rather than correcting execution.
- Rejected assets are not promoted or traced.

Any hard-gate blocker forces `REGENERATE` or `REJECT`. `PASS_WITH_NOTES` is never a soft-blocker bucket.

## Targeted regeneration contract

Reviewers may recommend regeneration but may not perform or authorize it. Only the Director may authorize a retry after the art lead confirms the defect and frozen invariants.

- Retry one failed asset only; never regenerate an accepted batch or neighboring asset.
- Preserve the failed candidate and its hash as rejected evidence before replacing the canonical path.
- Default to one fresh built-in imagegen call using the unchanged manifest prompt plus one narrow corrective addendum. No CLI, cross-asset raster reference, prompt redesign, or product-code change.
- One retry maximum per asset in this QA cycle. A second failure becomes `REJECT` and requires an explicit brief/art-direction replan before any further call.
- Stop the correction wave if more than eight of the 56 assets require regeneration. That rate indicates a batch or prompt-system failure and must be diagnosed before spending further calls.
- Every replacement receives independent re-QA by someone other than its generator.

## Independent batch assignment

The machine-readable packet remixes the generation lanes by index:

```text
qa_index = (generation_index + source_offset) mod 3
source_offset: A=0, B=1, C=2
```

This produces disjoint QA batches of 19, 19, and 18 assets. Every QA batch contains assets from all three generation lanes, so no generation packet can be rubber-stamped as a unit. A reviewer must not have generated, edited, or self-scored any assigned asset; assign different people if a proposed reviewer overlaps any source asset.

## Promotion rule

The art lead may recommend full-library promotion only when:

- the source manifest still hashes to the frozen SHA;
- all 56 expected IDs and paths exist exactly once and no extra canonical outputs are substituted;
- the three QA batches are disjoint and their union equals the manifest;
- all 56 records are `PASS` or `PASS_WITH_NOTES` with no blocker;
- every asset has a recomputed hash, dimensions, selected canonical panel, normalized crop, and concrete gate evidence;
- every `PASS_WITH_NOTES` note is carried into the later tracing packet;
- runtime-isolation scans are clean; and
- any regenerated asset has a separate re-QA record and preserved rejected hash.

The Director makes the final promotion decision. Promotion accepts concept references, not runtime SVG accuracy. Runtime geometry still requires its own trace, reuse, zoom-continuity, code, visual, accessibility, and performance gates.
