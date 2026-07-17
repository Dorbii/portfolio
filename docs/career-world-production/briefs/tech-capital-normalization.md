# CW-005C Task Packet - Normalize Employer Capitals Under D-011

## Task

Normalize the live Career World registry to accepted architecture decision D-011. Employer anchors remain non-visible district/camera coordinates. Remove the five duplicate anchor-level `kind: "city"` instances and represent exactly one `kind: "capital"` instance per employer using that employer's existing `city/*` asset.

This is a bounded registry normalization and regression-test slice. Do not begin CW-005B composition geometry or art integration.

## Worker

- run id: `career-world-2026-07-16`
- slice id: `CW-005C`
- lane id: `tech-capital-normalization`
- parent thread id: `/root/tech_lead`
- model: cheapest capable bounded implementation worker
- model selection: the architecture ruling is accepted; implementation is a small typed-registry/test correction and promotion remains with the parent reviewer
- harness: existing Vinext build plus `node:test` and Vite SSR module loading in `tests/career-world.test.mjs`
- role: D-011 registry normalization worker
- route id: `task-packet-execution`
- spawn mode: exactly one worker; no subagents
- queue item id: `CW-005C` (metadata only; do not edit a queue)
- context budget: read only this packet and the exact references below; use ranged reads for the test file
- run ledger path: `docs/career-world-production/run-ledger.json` (read-only; no update in this slice)
- worker report path: `docs/career-world-production/reports/tech-capital-normalization.json`
- log artifact directory: `docs/career-world-production/logs/tech-capital-normalization/`
- compact skill cards: `task-packet-execution`, `test-harness-archaeology`, `lean-implementation-gate`
- loaded skills: read and use exactly those three before editing; do not add skills unless a stop condition requires escalation
- expected exit gate: all implementation, test, full-gate, protected-hash, file-fence, and report checks pass; parent independently reviews

## Lean decision

Use the existing registry arrays, deep freeze, validator, Vite SSR test, and scene renderer. The smallest credible correction is:

1. one five-record capital construction in the existing `instances` array;
2. one narrowed instance-kind union;
3. direct validator changes for capital/category/cardinality/coordinate invariants;
4. replacement assertions and mutation tests in the existing registry test; and
5. deletion of the scene's obsolete `instance.kind !== "city"` predicate if narrowing the union makes it invalid.

Do not add a helper, module, dependency, migration adapter, alias kind, compatibility record, or generalized employer transform. A generalized transform becomes justified only when non-NinjaOne capital/project/skill coordinates are approved; all such positions remain `null` in this slice.

## Source authority

Apply these sources in order:

1. `docs/career-world-production/architecture.md` D-011 and the promoted implementation shape.
2. This packet's exact normalization contract.
3. `docs/career-world-production/asset-inventory.md` for accepted employer anchors and NinjaOne local coordinates.
4. The live registry for all protected assets, employers, projects, skills, links, evidence mappings, palettes, and coordinates not changed by D-011.
5. The existing test harness for SSR/Vite setup and protected invariant assertions.

If another artifact still expects visible anchor-level city instances, D-011 supersedes that expectation. Do not preserve duplicate records for compatibility.

## Preconditions

Verify all of these before editing:

- `docs/career-world-production/architecture.md` contains accepted D-011: anchors are non-visible district/camera coordinates and each employer has exactly one visible capital using its canonical city asset.
- Baseline `npm.cmd test` completes 13 tests with 13 passes and 0 failures.
- Baseline `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` pass.
- The current registry has exactly five `kind: "city"` anchor instances plus `instance/ninjaone/capital/01`.
- The current registry has exactly 56 assets, 5 employers, 16 projects, 37 skill instances, 53 project-skill links, and 3 positioned navigable projects.
- The accepted employer anchors and five NinjaOne local tuples match the existing exported fixtures.
- Other agents may be editing art, reports, or nearby untracked files. Never revert, absorb, format, stage, or commit unrelated work.

Dispatch-time hashes of the three allowed existing files:

```text
features/career-world/model/world-registry.ts              91B4957DF1CBFA6D29F8AD0E4FDF9921B15CFA7F78896618F038A1B145EE768A
features/career-world/components/world-scene.tsx            BCEA4A6486CC719DD0823FFE4701CEF250932663969166B7CB6C2C0650521433
tests/career-world.test.mjs                                  D447421180161767AC83E55B3209A15BB79F21E05FF9F0ED4A88C73258282F02
```

If any hash differs before the first edit, inspect the changed path. Stop if the change overlaps this packet or its authorship is ambiguous; do not overwrite it.

## Allowed files

- `features/career-world/model/world-registry.ts`
- `tests/career-world.test.mjs`
- `features/career-world/components/world-scene.tsx`, only to delete the now-obsolete `instance.kind !== "city"` filter term and the adjacent conjunction; no other scene change
- `docs/career-world-production/reports/tech-capital-normalization.json`
- `docs/career-world-production/logs/tech-capital-normalization/gate-summary.json`

The task packet is parent-owned and read-only.

## Forbidden files and surfaces

- `docs/career-world-production/architecture.md`
- `docs/career-world-production/run-ledger.json`
- any queue, manifest, art, image, concept, geometry, placement, or CW-007 evidence file
- `package.json` and all dependency manifests/lockfiles
- `features/career-world/rendering/world-camera.ts`
- `features/career-world/components/world-hit-targets.tsx`
- `features/career-world/components/career-world.tsx`
- `features/career-world/components/project-drawer.tsx`
- `features/career-world/hooks/use-career-world-state.ts`
- `features/career-world/model/evidence-adapter.ts`
- `features/career-world/styles/career-world.css`
- Evidence Atlas source and tests
- all app routes, public files, retired media, 3D/WebGL surfaces, and unrelated documentation
- git staging, commit, push, reset, checkout, or branch operations

## Required context

- `docs/career-world-production/architecture.md:64-75` and `88-104`
- `docs/career-world-production/asset-inventory.md:138-170`
- `features/career-world/model/world-registry.ts:52-110`, `131-207`, and `209-299`
- `features/career-world/components/world-scene.tsx:42-99`
- `tests/career-world.test.mjs:19-45`, `47-167`, `169-221`, and the nearest existing source-contract assertions later in the file
- `C:/Users/Steve/Documents/Github/skills/templates/worker-report.template.json`

Harness archaeology result: reuse the existing `keeps the full canonical registry...` Vite SSR test, its `cloneRegistry()` and `validationText()` mutation-test helpers, the existing SSR route test, and the existing camera identity test. Do not create a second test file, fixture, Vite server helper, or registry clone utility.

## Retrieval / output budget

- max carried command output chars: 20,000
- full command output: allowed for command execution, artifact capture, or machine parsing; do not paste it into the report
- max whole-file read size: 400 lines; use the specified ranges for larger files
- max search matches to inspect: 80; narrow before reading more
- production/test change budget: three existing files; the scene file is deletion-only as specified
- artifact budget: one canonical worker report and one compact JSON gate summary
- gate failure report: exact command, result summary, artifact path, first relevant error block, and final 80 lines
- required evidence form: structured `claim`, `path`, `line`, and concise evidence; no transcript or large code blocks in the report

## Implementation contract

### Instance type and construction

- Remove `"city"` from `CareerInstance.kind`; the exact union becomes `"capital" | "project" | "skill"`.
- Preserve asset category `"city"`. D-011 changes instances, not the five canonical city assets or employer asset references.
- Delete all five `instance/<employer>/city/01` anchor records.
- Construct exactly these five capital IDs in existing employer order:
  - `instance/ninjaone/capital/01`
  - `instance/tanium/capital/01`
  - `instance/independent/capital/01`
  - `instance/ace-hardware/capital/01`
  - `instance/column-technologies/capital/01`
- Each capital uses the exact `assetId` already owned by that employer and `kind: "capital"`.
- Preserve NinjaOne local position `{ x: 420, y: 500 }` and its existing derived world position exactly.
- Tanium, Independent, ACE Hardware, and Column Technologies capitals have `localPosition: null` and `worldPosition: null`. Do not choose coordinates.
- Employer anchors, labels, palettes, assets, project records, skill records, project-skill links, and all accepted project/skill coordinates remain byte-for-byte semantically unchanged.
- Keep capital construction local to the existing instance array. Do not export a second capital table unless a testable invariant cannot otherwise be expressed.

### Validator

The validator must enforce all of the following:

- each employer has exactly one `kind: "capital"` instance;
- that capital's `employerId` and `assetId` match the employer record;
- the capital asset exists and has category `"city"`;
- duplicate or missing capitals fail validation;
- a mismatched/non-city capital asset fails validation;
- a legacy/unknown `kind: "city"` anchor record fails validation even when supplied through a JSON-cloned malformed registry;
- no city-category asset instance may sit directly on an employer anchor;
- NinjaOne's accepted capital coordinate and derived world coordinate remain exact;
- every other capital remains unpositioned until later placement approval;
- the existing project, skill, link, evidence, asset, coordinate, and deep-freeze validations continue to pass.

Prefer direct checks in the existing validator. Do not introduce a generic schema library or a second validation pass.

### Scene compatibility

The overview's abstract district diamonds/labels continue to derive directly from `careerWorldRegistry.employers` at their anchors. Do not change that rendering.

Because `CareerInstance.kind` no longer includes `"city"`, delete only the obsolete `instance.kind !== "city"` term from the NinjaOne positioned-instance filter. With the five anchor instances gone, this is behavior-neutral. Do not render pending capitals, add art, add coordinates, change LOD behavior, change labels, or edit CSS.

### Tests

Extend the existing registry test rather than adding a new harness. Assert:

- exact capital count is five;
- exact capital tuple order is employer order and each tuple contains the expected ID, city asset, employer, local position, and world position;
- NinjaOne remains `(420, 500)` with derived world position `{ x: 316.08, y: 366.88 }`;
- the other four capital positions are both `null`;
- every employer has exactly one capital backed by its own city-category asset;
- no instance has `kind: "city"`;
- no city-category instance has a world position equal to any employer anchor;
- total instances normalize from 59 to 58 while assets/projects/skills/links remain `56/16/37/53`;
- all five accepted employer anchors, all five accepted NinjaOne local tuples, the three positioned projects, controls, camera identity, evidence mappings, identity-only holds, and skill/link counts remain unchanged.

Add negative validator mutations using the existing clone helpers:

- remove one employer capital -> validation issue;
- duplicate one employer capital under a distinct ID -> validation issue;
- replace a capital's asset with a project or skill asset -> validation issue;
- append a legacy `kind: "city"` record at an employer anchor -> validation issue.

Assert the relevant issue text, not only a non-empty issue array. Do not snapshot the entire registry or add brittle source formatting assertions where runtime assertions suffice.

## Protected dispatch hashes

These files are forbidden and must retain their dispatch-time hashes unless another live lane changes them. Any mismatch requires a report and authorship check; do not edit or restore the file.

```text
features/career-world/rendering/world-camera.ts             72E9EB2FFE352D63C403766CF417343E6473F8DF201543EFBE5C7F3B436B9A6A
features/career-world/model/evidence-adapter.ts             2076239AD6300E870BEE31BA57E2CB165A277C41A28138FCBC612DC9DAD4441F
features/career-world/components/world-hit-targets.tsx       9B298E205B3CE4D4D8518F4FE6D16489E6FDD2A3E4DE62A05B4F2FBC3CFB8E6A
docs/career-world-production/architecture.md                 6D93DBD720690A8317304270C22FD80E648C67D588D9B5105357488589FAC5EB
package.json                                                  A0C512B31CCA460BE20758F892752443AFA2CAF4D2C6A2AC40F2AB69EAEAFE8F
```

## Acceptance criteria

- `validateCareerWorldRegistry()` returns `[]` for the normalized live registry.
- There are exactly five capital instances, one per employer, and zero city-kind/anchor asset instances.
- Every capital references its employer's existing canonical city asset and no other city identity instance exists.
- NinjaOne capital ID/local/world coordinates remain exact; the four new capitals are position-null.
- `CareerInstance.kind` excludes `"city"`; the only scene change is removal of the obsolete filter term.
- Assets, employer anchors/palettes, projects, skill instances, project-skill links, evidence mappings, controls, camera behavior, drawer behavior, and source manifest equality remain unchanged.
- Test count remains 13 unless the existing suite is intentionally split; any count change is explained and reconciled.
- No scene art, geometry, placement, navigation, concept path, 3D, dependency, retired-media, queue, ledger, commit, or stage change.

## Gate commands

Run and record all of these after the implementation:

```text
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Baseline: 13 tests, 13 passes, 0 failures; lint/build/diff-check pass.

Also run scoped checks proving:

- exact `5` capital / `0` city-kind / `58` total-instance counts and `validateCareerWorldRegistry() === []`;
- exact protected hashes or a clearly attributable non-worker concurrent change;
- zero prohibited concept/image, geometry, 3D/WebGL, dependency, retired-media, navigation, camera, evidence, queue, or ledger changes;
- changed paths remain within the allowed file fence;
- report and gate summary parse as JSON;
- every report claim path exists and cited line is valid;
- `git status` contains no stage/commit evidence from this worker.

## Verification contract

- required gates: full test, lint, build, whitespace, scoped registry runtime check, protected-hash check, prohibited-surface check, file-fence check, report-shape/claim-line check
- artifact paths: canonical worker report plus `docs/career-world-production/logs/tech-capital-normalization/gate-summary.json`
- full log artifact rule: full command output may be used for audit, but the report carries only summary, failure block, tail, and artifact path
- report format: canonical `C:/Users/Steve/Documents/Github/skills/templates/worker-report.template.json` shape
- max failed loops before stopping: two failures of the same gate after one materially different diagnosis/correction
- git mutation policy: no commit or stage even though generic task-packet guidance normally permits one green commit; this packet overrides it

## Communication budget

- default mode: silent until final handoff
- allowed intermediate updates: failed precondition, overlapping live edit, required out-of-fence change, source-authority conflict, or repeated gate failure
- avoid routine progress narration and command-by-command updates

## Escalation criteria

Escalate to the parent reviewer when:

- D-011 conflicts with a current promoted contract not named here;
- removing `city` from the instance union requires a scene/state/navigation behavior change beyond deleting the stale filter term;
- another live lane changed an allowed or protected file ambiguously;
- a non-NinjaOne capital appears to require a position or generalized transform;
- a full gate exposes an unrelated regression that cannot be classified safely;
- any requirement would need a dependency, new module, architecture change, or evidence/data edit.

## Stop conditions

Stop and report if:

- any precondition fails;
- an allowed-file dispatch hash changed before the worker's first edit and the overlap cannot be isolated;
- the task requires moving an accepted anchor or NinjaOne coordinate;
- the task requires placing any pending capital;
- a required change falls outside the allowed files or exceeds the scene deletion-only allowance;
- protected project/skill/link/evidence/control/camera behavior would change;
- another lane overlaps an allowed file;
- the same gate fails twice after one materially different correction;
- a git mutation would be required.

## Expected output

Write `docs/career-world-production/reports/tech-capital-normalization.json` using the canonical worker-report template and write the compact gate artifact at the designated log path. The report must include:

- summary: one paragraph
- skills: requested, loaded, used with reasons, and skipped
- files_changed: every path actually changed with sections
- gates_run: exact commands, result, artifact path, summary, failure block, and tail
- claims: structured claim/path/line/evidence entries
- telemetry: baseline/final test counts, capital/city-kind/total-instance counts, dependency additions, and prohibited-surface count
- deviations: every packet departure, may be empty
- risks_blockers: may be empty
- follow_ups: parked out-of-fence discoveries, may be empty
- ledger_updates: empty; do not edit the ledger

Return the same compact summary to the parent with report and gate-artifact paths. Do not claim promotion; the parent performs independent severity-first review and owns the final `PROMOTE` or `REVISE` verdict.
