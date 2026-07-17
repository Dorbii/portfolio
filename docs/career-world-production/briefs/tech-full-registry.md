# Task Packet: CW-005A Full Canonical Registry

## Task

Expand the typed Career World registry from the three-project tracer subset to the complete promoted canonical identity, evidence-hold, and project-skill relationship model. Preserve the current rendered tracer as the only navigable map subset until collision-reviewed coordinates exist.

## Worker

- run id: `career-world-2026-07-16`
- slice id: `CW-005A`
- lane id: `tech-full-registry`
- thread id: `/root/tech_lead/cw005a_impl`
- parent thread id: `/root/tech_lead`
- model: cheapest capable bounded implementation worker
- harness: Codex multi-agent worker lane
- role: registry implementation worker
- route id: `frontend/career-world/full-registry`
- spawn mode: worker-lane
- queue item id: `CW-005`
- context budget: exact packet plus listed references; no broad repository exploration
- run ledger path: `docs/career-world-production/run-ledger.json` (read-only; recommend updates in the report)
- worker report path: `docs/career-world-production/reports/tech-full-registry.json`
- log artifact directory: `docs/career-world-production/logs/tech-full-registry/`
- compact skill cards: task packet compliance, anchored large-file editing, existing test-harness reuse
- loaded skills: `task-packet-execution`, `anchored-edit-discipline`, `test-harness-archaeology`
- allowed references: only the paths in Required Context
- expected exit gate: exact executable `56 / 5 / 16 / 27 / 53` registry invariants, evidence holds, frozen coordinates, and unchanged three-project tracer behavior with all repository gates green

## Preconditions

- `docs/career-world-production/concept-briefs.json` was verified by the tech lead against SHA-256 `46049BE50ED86776518C3410034656F7359DA2039F7B56EB36ABD8F5FA136B9D` before Director-owned output-path relocation.
- Director-owned relocation may change manifest `output_path` values and therefore the file hash during this lane. Asset IDs, categories, evidence statuses, project identities, links, and counts are frozen. Do not encode or assert the manifest hash or output paths in production code or tests.
- `docs/career-world-production/asset-inventory.md` is the promoted identity, link, evidence-hold, and coordinate authority.
- Architecture decisions D-005, D-006, and D-007 are accepted at `docs/career-world-production/architecture.md:94-96`.
- Current baseline is 13 passing Node tests. The existing CW-003A/CW-003B tracer is usable and must stay usable.
- Other agents may edit manifest output paths, concept art, reports, or nearby production artifacts. Never revert or absorb unrelated work.

## Authority Resolution

Use this order and do not blend conflicting shapes:

1. This packet and live Director instructions.
2. `asset-inventory.md` for canonical IDs, exact project-skill matrix, employer associations, holds, and accepted coordinates.
3. The verified `concept-briefs.json` content fields `id`, `category`, and `evidence_status`. Ignore `output_path` and file hash after the verified planning snapshot.
4. `architecture.md` for registry reuse, evidence, placement, and tracer-continuity rules.
5. Existing evidence trace IDs for references only; do not copy or reword factual content.
6. Current implementation for compatibility, not authority over the expanded model.

If any frozen content field changes while the lane is running, stop and report the exact conflict. Output-path-only relocation is expected and is not a conflict.

## Allowed Files

- `features/career-world/model/world-registry.ts`
- `features/career-world/hooks/use-career-world-state.ts` only for expanded project ID typing, positioned-project URL validation, or positioned-instance lookup
- `features/career-world/components/world-hit-targets.tsx` only to keep controls limited to positioned/navigable projects
- `tests/career-world.test.mjs`
- `docs/career-world-production/reports/tech-full-registry.json`
- `docs/career-world-production/logs/tech-full-registry/**`

## Forbidden Files

- This task packet after worker dispatch
- `docs/career-world-production/concept-briefs.json`, asset inventory, architecture, queue, run ledger, and all other planning artifacts
- `features/evidence-atlas/model/evidence-data.ts` and every factual string/source record
- Camera math, renderer/geometry, scene, modal/drawer, layout/CSS, app route, package/dependency, resume, media, public asset, concept-art, and 3D paths
- Any project/skill coordinate not already accepted
- Git staging, commits, resets, reverts, checkout, or other git mutations

## Required Context

- `docs/career-world-production/asset-inventory.md:5-12` — authority and evidence holds
- `docs/career-world-production/asset-inventory.md:14-111` — exact 56 canonical IDs and category counts
- `docs/career-world-production/asset-inventory.md:115-136` — exact supported matrix and unlinked/unplaced holds
- `docs/career-world-production/asset-inventory.md:138-160` — accepted world/local coordinates and no-new-coordinate rule
- `docs/career-world-production/concept-briefs.json` — read only `assets[].id`, `category`, and `evidence_status`; expected content counts are `world=1`, `city=5`, `project=16`, `skill=27`, `ambient=7`
- `docs/career-world-production/architecture.md:11-22` — one city/project/skill-instance reuse contract
- `docs/career-world-production/architecture.md:63-73` — typed registry, native SVG, immutable camera/placement contract
- `docs/career-world-production/architecture.md:90-98` — accepted decisions and evidence holds
- `features/career-world/model/world-registry.ts` — current tracer registry and validation
- `features/career-world/hooks/use-career-world-state.ts` — current URL/focus behavior
- `features/career-world/components/world-hit-targets.tsx` — current three-project control surface
- `tests/career-world.test.mjs` — existing Vinext/Vite SSR module harness and invariants
- `features/evidence-atlas/model/evidence-data.ts:578-951` — read-only existing trace IDs; do not copy or edit factual strings

## Frozen Registry Contract

### Asset and evidence counts

- Exactly 56 unique canonical assets.
- Category counts: world 1, city 5, project 16, skill 27, ambient 7.
- Manifest evidence-status counts: evidence-backed 38, identity-only 6, employer-supported-unlinked 3, user-required-unplaced 1, ambient 8.
- Registry asset identity/category/evidence-status triplets must equal the manifest content snapshot. Do not store or assert concept output paths.

### Projects

Represent exactly these project IDs, employers, asset IDs, and project evidence statuses:

| Project ID | Employer | Asset ID | Evidence status | Existing evidence trace |
|---|---|---|---|---|
| `kaizen-agent-platform` | `ninjaone` | `project/kaizen-agent-platform@v1` | evidence-backed | `governed-agent-tooling` |
| `vendy-vm-platform` | `ninjaone` | `project/vendy-vm-platform@v1` | evidence-backed | `cross-provider-orchestration` |
| `engineering-metrics-pipeline` | `ninjaone` | `project/kaizen-metrics@v1` | evidence-backed | `engineering-metrics-pipeline` |
| `tanium-risk-assessment` | `tanium` | `project/tanium-risk-assessment@v1` | evidence-backed | `tanium-risk-assessment` |
| `uat-automation` | `tanium` | `project/uat-automation@v1` | evidence-backed | `uat-automation` |
| `cablecar` | `tanium` | `project/cablecar@v1` | evidence-backed | `cablecar` |
| `xsearch` | `tanium` | `project/xsearch@v1` | evidence-backed | `xsearch-extension` |
| `tmatch-eolmatch` | `tanium` | `project/tmatch-eolmatch@v1` | evidence-backed | `tmatch-eolmatch` |
| `contextforge` | `independent` | `project/contextforge@v1` | evidence-backed | `bounded-agent-context` |
| `career-world-portfolio` | `independent` | `project/career-world-portfolio@v1` | evidence-backed | `evidence-atlas` |
| `ticket-validation-automation` | `ace-hardware` | `project/ticket-validation-automation@v1` | identity-only | null |
| `sap-table-update-integration` | `ace-hardware` | `project/sap-table-update-integration@v1` | identity-only | null |
| `qc-alm-extractor` | `ace-hardware` | `project/qc-alm-extractor@v1` | identity-only | null |
| `atlassian-platform-automation` | `column-technologies` | `project/atlassian-platform-automation@v1` | identity-only | null |
| `atlassian-data-center-resilience` | `column-technologies` | `project/atlassian-data-center-resilience@v1` | identity-only | null |
| `client-devops-delivery-implementations` | `column-technologies` | `project/client-devops-delivery-implementations@v1` | identity-only | null |

Create exactly one project instance per project. Preserve the three placed NinjaOne project IDs and coordinates. The other 13 project instances must be explicit pending/null placements with both local and world position null.

### Exact supported project-skill matrix

Encode exactly 53 project-skill links. Repeated skills must target the same employer-local instance, never project-specific duplicate instances.

| Project ID | Skill IDs |
|---|---|
| `kaizen-agent-platform` | `safe-writes`, `data-contracts`, `go`, `redis`, `mcp`, `openapi` |
| `vendy-vm-platform` | `workflow-orchestration`, `operator-control`, `data-contracts`, `go`, `react`, `aws`, `postgresql`, `vmware`, `macstadium` |
| `engineering-metrics-pipeline` | `python`, `databricks`, `workflow-orchestration`, `data-contracts`, `go`, `postgresql`, `docker`, `ai`, `aws` |
| `tanium-risk-assessment` | `python`, `go`, `workflow-orchestration`, `operator-control`, `data-contracts` |
| `uat-automation` | `csharp`, `localdb`, `operator-control`, `workflow-orchestration`, `data-contracts` |
| `cablecar` | `react`, `electron`, `workflow-orchestration`, `operator-control`, `data-contracts` |
| `xsearch` | `manifest-v3`, `data-contracts`, `workflow-orchestration`, `operator-control` |
| `tmatch-eolmatch` | `go`, `data-contracts` |
| `contextforge` | `context-compression`, `workflow-orchestration`, `data-contracts`, `typescript` |
| `career-world-portfolio` | `react`, `typescript`, `operator-control`, `data-contracts` |

### Skill instances and holds

- Exactly 27 canonical skill definitions/assets.
- Exactly 37 employer-local skill instances across the five employers: NinjaOne 17, Tanium 10, Independent 6, ACE Hardware 1, Column Technologies 3.
- Only `instance/ninjaone/skill/go/01` is placed. Every other skill instance is explicit pending/null.
- Java is canonical asset-only/unplaced: zero instances and zero links.
- Employer-associated but project-unlinked instances: ACE Hardware -> Informatica; Column Technologies -> Atlassian, CI/CD, Docker. They exist as pending employer-local instances and have zero project links for those employers.
- The six identity-only ACE/Column projects have zero evidence trace IDs and zero skill links.
- One employer plus canonical skill pair may have at most one instance.

### Coordinates and tracer compatibility

- Preserve the five employer anchors exactly: NinjaOne `(340,370)`, Tanium `(800,350)`, Independent `(1240,380)`, ACE Hardware `(380,700)`, Column Technologies `(1200,700)`.
- Preserve the five accepted NinjaOne local tuples exactly: capital `(420,500)`, Agent `(620,245)`, Vendy `(780,500)`, Metrics `(600,760)`, Go `(825,700)`.
- Assign no other project or skill local/world coordinate.
- Export an explicit positioned/navigable project subset containing only Agent, Vendy, and Metrics.
- `WorldHitTargets` must render only that subset. Do not expose 13 null projects as controls/options.
- URL project state must accept only positioned/navigable projects; a pending-project deep link degrades without inventing map state.
- Preserve Metrics-only factual drawer eligibility and existing camera/focus/modal behavior.

## Retrieval / Output Budget

- max carried command output chars: 20000
- full command output: allowed for machine parsing or log capture; do not paste it into the report
- max whole-file read size: 400 lines; use ranged reads after the registry expands
- max search matches to inspect: 80; narrow before reading more
- required evidence form: `claim - path:line`
- do not read generated PNGs or manifest prompt bodies; only machine-read the manifest content fields needed above

## Acceptance Criteria

- A manifest-content parity test proves all 56 `id/category/evidence_status` triplets without asserting SHA or output paths.
- Executable tests prove exact counts `56 assets / 5 employers / 16 projects / 27 skills / 53 links / 37 employer-skill instances`.
- Executable tests compare the complete 16-project employer/evidence mapping and complete 10-row/53-link matrix to explicit expected literals.
- Tests prove all six identity-only projects and all employer-associated unlinked instances have no prohibited links; Java has no instance/link.
- Tests prove every link resolves to the correct shared employer-local skill instance and no employer/skill duplicate exists.
- Tests prove one project instance per project, exactly 13 pending project instances, and no coordinate beyond the existing accepted anchors/local tuples.
- Registry validation rejects dangling/mismatched/duplicate asset, project, skill, instance, and link relationships and returns no issues for the canonical registry.
- Current SSR/root tracer still exposes the exact five employers and only the three positioned NinjaOne project controls; pending project URL state is not navigable.
- Existing exact disclosure, modal evidence boundary, registry identity tuples, camera round trips, and 13 baseline tests remain green.
- No factual copy, geometry, concept art, media, 3D, dependency, or package change.

## Gate Commands

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
rg -n -i 'ProjectMediaStage|project-media|<video|autoplay|system-tour|WebGL|three|babylon' features/career-world package.json
```

Add focused machine checks for:

- canonical report required fields/status/path/line validity
- the exact allowed file fence
- unchanged hashes for camera, evidence adapter, and factual evidence data

## Verification Contract

- required gates: all commands above plus focused invariant and file-fence checks
- artifact paths: `docs/career-world-production/logs/tech-full-registry/`
- report format: canonical `templates/worker-report.template.json` shape at the required report path
- report status: one of `done`, `blocked`, `stood_down`, `needs_review`, `failed`
- `follow_ups` entries: objects, not strings
- max failed loops before stopping: two failures of the same gate after one materially different diagnosis
- no git mutation even though generic task-packet guidance normally permits a packet commit; this packet explicitly forbids it

## Communication Budget

- default mode: silent until final handoff
- allowed intermediate updates: source conflict, file-fence blocker, or repeated gate failure
- avoid routine progress narration

## Escalation Criteria

- manifest identity/category/evidence-status content changes
- exact matrix or employer ownership cannot be reconciled from promoted sources
- preserving the browser tracer requires an out-of-fence edit
- a new coordinate appears necessary
- factual evidence would need rewording

## Stop Conditions

- a precondition fails other than expected output-path relocation
- completing the task requires a forbidden file
- any new project/skill coordinate would be invented
- identity-only or employer-unlinked holds cannot be represented without a prohibited link
- the same gate fails twice and one different diagnosis has failed

## Expected Output

Write `docs/career-world-production/reports/tech-full-registry.json` with:

- summary: one paragraph
- files_changed: exact path plus section/function
- tests_run/gates_run: exact commands, counts versus the 13-test baseline, summaries, and log paths
- claims: every load-bearing invariant as `claim - path:line`
- deviations: every departure, including source conflicts; may be empty
- risks_blockers: may be empty
- follow_ups: object-shaped parked items
- ledger_updates: recommended only; do not edit the ledger

Return a concise handoff with exact changed files, gates, counts, deviations, and residual risks. Do not claim art, browser-visual, or 3D completion.
