# CW-006A Task Packet — Generalize factual project drawers

## Task

Generalize the existing Career World factual evidence adapter and drawer from the Kaizen Metrics-only path to every public-safe evidence-backed project already represented by the promoted Career World registry and the live Evidence Atlas records.

This is a narrow AFK implementation slice. Preserve the existing three-project navigation and all Metrics behavior. Do not add navigation for position-null projects and do not author, edit, reinterpret, or supplement factual content.

## Worker

- run id: `career-world-2026-07-16`
- slice id: `CW-006A`
- lane id: `tech-evidence-drawers`
- parent thread id: `/root/tech_lead`
- model: cheapest capable bounded implementation worker
- model selection: implementation is mechanically bounded; architecture/source-authority and promotion remain with the parent reviewer
- harness: existing Vinext build plus `node:test`, Vite SSR module loading, SSR worker helper, and source-contract assertions in `tests/career-world.test.mjs`
- role: evidence adapter and drawer implementation worker
- route id: `task-packet-execution`
- spawn mode: one isolated worker, no subagents
- queue item id: `CW-006`
- context budget: read only the packet and exact references below; use ranged reads for `evidence-data.ts` and the test file
- run ledger path: `docs/career-world-production/run-ledger.json` (read-only; recommend updates in the report only)
- worker report path: `docs/career-world-production/reports/tech-evidence-drawers.json`
- log artifact directory: `docs/career-world-production/logs/tech-evidence-drawers/`
- compact skill cards: `task-packet-execution`, `test-harness-archaeology`, `lean-implementation-gate`
- loaded skills: read and use those three skills before editing; do not add more unless a stop condition requires escalation
- allowed references:
  - this packet
  - `docs/career-world-production/architecture.md`
  - `docs/career-world-production/asset-inventory.md`
  - `features/evidence-atlas/model/evidence-data.ts`
  - `features/career-world/model/world-registry.ts`
  - the five allowed production/test files below
  - `C:/Users/Steve/Documents/Github/skills/templates/worker-report.template.json`

## Preconditions

Verify these against the live workspace before editing:

- `npm.cmd test` baseline is 13 tests, 13 passes, 0 failures.
- `validateCareerWorldRegistry()` returns no issues.
- The registry contains exactly ten `evidence-backed` projects, each with the trace mapping listed below.
- Every listed trace exists in `traceById`; there are no additional Evidence Atlas traces.
- The six `identity-only` projects have `evidenceTraceId: null` and zero project-skill links.
- `positionedNavigableProjects` is exactly Agent, Vendy, and Metrics.
- Other agents may edit art, concept paths, production reports, or nearby artifacts. Never revert or absorb unrelated work.

If any precondition is false, stop and report instead of changing the evidence records or registry to make the packet fit.

## Source Authority

Use this precedence:

1. This packet and the current CW-006A direction.
2. `features/evidence-atlas/model/evidence-data.ts` for every factual title, statement, summary, proof label, record, record source, evidence class, outcome, limitation, and artifact.
3. `features/career-world/model/world-registry.ts` for Career World project identity, evidence eligibility, trace mapping, and exact project-skill links.
4. `docs/career-world-production/asset-inventory.md` for evidence holds and link non-goals.
5. Existing adapter/drawer behavior for interaction, modal accessibility, dismissal, and Metrics compatibility.

The concept manifest, concept output paths, generated art, and manifest SHA are not factual drawer sources and must not be imported, stored, or asserted.

## Exact Eligibility Contract

These ten Career World projects are eligible and must resolve to these existing Evidence Atlas traces:

| Career World project | Evidence Atlas trace |
|---|---|
| `kaizen-agent-platform` | `governed-agent-tooling` |
| `vendy-vm-platform` | `cross-provider-orchestration` |
| `engineering-metrics-pipeline` | `engineering-metrics-pipeline` |
| `tanium-risk-assessment` | `tanium-risk-assessment` |
| `uat-automation` | `uat-automation` |
| `cablecar` | `cablecar` |
| `xsearch` | `xsearch-extension` |
| `tmatch-eolmatch` | `tmatch-eolmatch` |
| `contextforge` | `bounded-agent-context` |
| `career-world-portfolio` | `evidence-atlas` |

These six identity-only projects are explicitly ineligible. They must return no factual evidence bundle and must never open a factual drawer:

- `ticket-validation-automation`
- `sap-table-update-integration`
- `qc-alm-extractor`
- `atlassian-platform-automation`
- `atlassian-data-center-resilience`
- `client-devops-delivery-implementations`

Eligibility is derived from the registry's project record and canonical trace mapping. Do not create a second handwritten factual-copy table.

## Lean Implementation Decision

- selected rung: parameterize the existing adapter, drawer, and drawer-eligibility helper around the current registry and Evidence Atlas maps
- skipped complexity: no new store, schema, context/provider, generic plugin system, route, navigation surface, copy layer, dependency, or Evidence Atlas rewrite
- justification threshold for more: stop and escalate if the existing maps cannot express a required invariant

## Allowed Files

- `features/career-world/model/evidence-adapter.ts`
- `features/career-world/hooks/use-career-world-state.ts`
- `features/career-world/components/project-drawer.tsx`
- `features/career-world/components/career-world.tsx`
- `tests/career-world.test.mjs`
- `docs/career-world-production/reports/tech-evidence-drawers.json`
- `docs/career-world-production/logs/tech-evidence-drawers/**`

## Forbidden Files

- `features/evidence-atlas/model/evidence-data.ts` and every other Evidence Atlas file
- `features/career-world/model/world-registry.ts`
- `features/career-world/components/world-hit-targets.tsx`
- `features/career-world/components/world-scene.tsx`
- `features/career-world/styles/career-world.css`
- `features/career-world/rendering/**`
- `app/**`, `package.json`, lockfiles, and dependencies
- `design/**`, `public/**`, generated art, concept manifests, and media
- `docs/career-world-production/run-ledger.json`, `queue.yaml`, and reports/logs owned by other lanes
- this packet after dispatch
- all git staging, commits, pushes, resets, checkouts, and branch operations

## Required Context

- `docs/career-world-production/architecture.md:38-45`, `66-75`, `92-98`
- `docs/career-world-production/asset-inventory.md:34-60`, `115-136`, `138-160`
- `features/evidence-atlas/model/evidence-data.ts:20-59`, `576-976`, `1030-1037`
- `features/career-world/model/world-registry.ts:52-83`, `112-205`
- `features/career-world/model/evidence-adapter.ts:1-18`
- `features/career-world/hooks/use-career-world-state.ts:18-85`, `87-150`
- `features/career-world/components/project-drawer.tsx:1-94`
- `features/career-world/components/career-world.tsx:13-108`
- `tests/career-world.test.mjs:47-167`, `190-221`, `250-289`

## Retrieval / Output Budget

- max carried command output chars: 20,000
- full command output: allowed for command execution, artifact capture, or machine parsing; do not paste it into the report
- max whole-file read size: 400 lines; use the ranges above for larger files
- max search matches to inspect: 80; narrow before reading more
- production/test change budget: five existing files; do not add a new module
- gate failure report: exact command, result summary, artifact path, first relevant error block, and final 80 lines
- required evidence form: structured `claim`, `path`, `line`, and concise evidence in the canonical report

## Implementation Contract

### Adapter

- Add one generic project-evidence lookup keyed by `CareerProjectId`.
- Resolve the Career World project from the registry, then resolve its existing trace through `evidenceTraceId` and `traceById`.
- Return `null` for identity-only projects. Do not infer a trace from names, labels, employer, graph proximity, or skill overlap.
- Treat an `evidence-backed` registry project with a missing trace as contract drift; fail loudly rather than fabricating or silently downgrading evidence.
- Preserve direct source provenance: the bundle's trace and ordered records must come directly from `traceById` and `recordsForTrace`; record `source`, `evidenceClass`, title, detail, and sequence must remain unchanged.
- Derive drawer skill assets from `careerWorldRegistry.projectSkillLinks` plus the linked instances/assets. Do not use Evidence Atlas `nodeIds` as the full Career World link source: Vendy, Metrics, and CableCar have accepted registry additions not present in those graph-node lists.
- Keep `getKaizenMetricsEvidence()` as a thin compatibility wrapper over the generic lookup. It must retain the current Metrics trace, five ordered records, seven Evidence Atlas node IDs, and nine Career World skill links without copied logic or copy.
- A small exported eligibility predicate/list is acceptable only if it is derived from the same registry/trace contract and is used by state/tests. Do not add a second eligibility table.

### Drawer and state

- Parameterize `ProjectDrawer` with the eligible `CareerProjectId` supplied by Career World state.
- Render the same factual trace fields currently used by Metrics. Record provenance must remain visible by rendering each existing record's `source`; do not write new explanatory copy.
- Render the exact registry-derived skill assets for the selected project. Do not keep the Metrics-only skill constant in the generic drawer.
- Avoid an empty evidence-record list for overview traces that intentionally have zero records; keep their existing trace summary, proof label, outcomes, and limitations intact.
- Preserve dialog semantics, inert background, Escape handling, focus trap, dismissal, and visible-control focus restoration. The close accessible name must use the active trace title, so Metrics remains `Close Kaizen Metrics summary`.
- Generalize `drawerProjectForFocus` and dismissal to evidence-eligible project IDs. Agent, Vendy, and Metrics are all currently positioned and therefore may open factual drawers.
- Do not change URL validation, camera behavior, navigation controls, or scene rendering. Position-null evidence-backed projects remain adapter/drawer eligible in the model but unreachable from the current semantic tracer until coordinates are separately approved.
- Identity-only projects remain ineligible even if a caller manually constructs a project focus.

## Acceptance Criteria

- Exact eligible project IDs and trace mappings equal the ten-row table above.
- Exact ineligible IDs equal the six-row hold list above.
- Every eligible evidence bundle references the registry project, canonical Evidence Atlas trace, ordered canonical record objects, and exact registry-derived skill assets.
- Every record retains its canonical `source` and `evidenceClass`; the drawer renders the source from the record.
- Metrics retains trace `engineering-metrics-pipeline`, five ordered records, current factual fields, nine registry skill links, dialog behavior, dismissal, camera identity, and focus restoration.
- Agent and Vendy use their existing factual traces when opened from the existing three-project controls.
- The six identity-only projects return no evidence and no drawer eligibility.
- The positioned/navigable list remains exactly Agent, Vendy, and Metrics; no new coordinate, control, option, SVG landmark, or URL-accessible pending project is added.
- No factual data, trace, evidence record, outcome, limitation, artifact, evidence class, skill link, or employer association is edited or invented.
- No concept path/SHA, art, layout, geometry, 3D, dependency, or retired media change.

## Test / Validation Plan

Extend the existing Vite SSR module-loading tests rather than adding a second harness.

Required exact assertions:

- eligible IDs and project-to-trace pairs equal the exact ten-row contract
- each adapter trace is the object returned by `traceById` for the registry's `evidenceTraceId`
- each adapter record list is ordered and object-identical to `recordsForTrace`; compare canonical IDs, sources, and evidence classes
- each adapter skill asset list equals the existing registry link order and contains no extra inferred node/skill
- Metrics retains five records, its seven trace node IDs, and its nine registry skill IDs including `ai` and `aws`
- all six identity-only projects return `null`/false and remain link-free
- state returns drawers for Agent, Vendy, and Metrics, supports per-project dismissal, and rejects a manually constructed identity-only project focus
- a pending Tanium URL still degrades to employer focus and does not become a navigable project
- source-contract checks prove the drawer receives `projectId`, uses the generic adapter, renders `record.source`, and no longer imports `METRICS_SKILL_IDS`
- existing three-control, coordinate, modal, camera, registry, and SSR assertions remain green

## Gate Commands

Run and record:

```text
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Also run scoped checks proving:

- no prohibited retired-media, video/autoplay, WebGL, Three.js, or Babylon reference in changed Career World files or `package.json`
- forbidden/protected paths retain their dispatch-time hashes unless another live lane changed them; stop and report any ambiguous overlap
- the worker report parses as JSON and follows `C:/Users/Steve/Documents/Github/skills/templates/worker-report.template.json`
- every report claim path exists and every cited line is valid
- changed paths stay inside the allowed file fence

Baseline: 13 tests, 13 passes, 0 failures. The test count may remain 13 if existing tests are expanded; reconcile the count exactly in the report.

## Verification Contract

- required gates: test, lint, build, whitespace, prohibited-surface scan, protected-path check, report-shape check, file-fence check
- artifact paths: canonical JSON report plus `docs/career-world-production/logs/tech-evidence-drawers/gate-summary.json`
- full log artifact rule: full output may be captured for audit, but the final report carries only summary, failure block, tail, and artifact path
- report format: canonical `C:/Users/Steve/Documents/Github/skills/templates/worker-report.template.json` shape, including `schema_version`, skill-use fields, structured claims, deviations, risks, follow-ups, and telemetry
- max failed loops before stopping: two failures of the same gate with one materially different diagnosis/workaround
- no git mutations, even though generic worker skill guidance normally permits one green commit; this packet explicitly overrides that default

## Communication Budget

- default mode: silent until final handoff
- allowed intermediate updates: blocker, required approval, real source-authority conflict, forbidden-file dependency, or repeated gate failure
- avoid routine progress narration and command-by-command updates

## Escalation Criteria

Escalate to the parent reviewer when:

- registry trace mappings do not exactly match the ten Evidence Atlas traces
- a factual field or link appears necessary but is absent from current authoritative data
- completing the slice requires an Evidence Atlas data edit, registry edit, navigation change, style/layout change, dependency, or new abstraction layer
- a position-null project would need a new control or coordinate to prove the model
- a required gate cannot prove source provenance or negative eligibility

## Stop Conditions

Stop and report if:

- any precondition fails
- an identity-only project appears to have gained a trace, factual copy, or project link
- factual data would need to be composed, rewritten, inferred, or copied into a new table
- a required edit falls outside the allowed files
- an unrelated live edit overlaps an allowed file and cannot be isolated safely
- the same gate fails twice and one materially different correction also fails
- a git mutation would be required

## Expected Output

Write `docs/career-world-production/reports/tech-evidence-drawers.json` using the canonical worker-report template. It must include:

- summary: one paragraph
- skills: requested, loaded, used with reasons, and skipped
- files_changed: every allowed path actually changed, with sections
- gates_run: exact commands, result, artifact path, summary, failure block, and tail
- claims: structured claim/path/line/evidence entries
- telemetry: test counts, dependency additions, and prohibited-surface scan count
- deviations: every packet departure, may be empty
- risks_blockers: may be empty
- follow_ups: object-shaped parked items
- ledger_updates: compact recommendations only; do not edit the ledger

Return the same compact summary to the parent with the report and gate-log paths. Do not claim promotion; the parent owns independent review and the `PROMOTE` / `REVISE` verdict.
