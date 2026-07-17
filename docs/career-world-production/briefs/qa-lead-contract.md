# Task Packet: QA Lead Acceptance Contract

## Task

Turn the locked concept rules and provisional architecture into a testable cross-lane acceptance matrix. This is independent review planning only; do not edit product code.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `qa-lead-contract`
- parent thread id: `/root`
- role: QA lead
- route id: `qa/contract/career-world`
- spawn mode: qa-lane
- queue item id: `CW-001`
- context budget: acceptance criteria and current harness recon; max three full skills
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/qa-lead-contract.json`
- log artifact directory: `docs/career-world-production/logs/qa-lead-contract/`
- expected exit gate: testable matrix for art, code, interaction, accessibility, evidence, performance, and 3D gating

## Preconditions

- The canonical asset map and 2D-before-3D sequence are accepted.
- Architecture decision `D-010` is authoritative: generated concept sheets provide art direction and one selected traceable panel, while code-native master geometry owns runtime footprint, silhouette, projection identity, and every LOD.
- Architecture decision `D-011` is authoritative: employer anchors are non-visible district/camera coordinates, and each employer has exactly one capital instance backed by that employer's canonical `city/*` asset.
- Current test and lint baseline is green after media removal.
- Other agents may edit nearby files; preserve unrelated work.

## Allowed Files

- Read any tracked repository file needed to understand current tests and UI behavior.
- Write only `docs/career-world-production/briefs/qa-lead-contract.md` and `docs/career-world-production/reports/qa-lead-contract.json` for this contract correction.

## Forbidden Files

- All application, test, dependency, configuration, and asset files.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-asset-map.md`
- `docs/career-world-production/architecture.md`
- `docs/career-world-production/queue.yaml`
- `docs/career-world-production/reports/art-tracer-generation.json`
- `docs/career-world-production/reports/art-tracer-qa.json`
- `features/career-world/model/world-registry.ts`
- `features/career-world/rendering/world-camera.ts`
- `features/career-world/components/world-scene.tsx`
- `tests/career-world.test.mjs`
- `tests/evidence-atlas.test.mjs`
- Relevant current UI components and CSS

## Acceptance Criteria

- Define pass/fail checks for fixed IDs, coordinates, and exact code-native master geometry/path hashes across all zoom states.
- Require exactly five capital instances, one per employer, each using that employer's city asset; forbid legacy `kind: "city"` anchor instances and any visible city/capital geometry derived directly from employer anchors; preserve `instance/ninjaone/capital/01` at local `(420, 500)`; require collision review before fixing the other capital positions and before CW-007.
- Require one selected canonical trace panel per asset and one code-native master footprint, silhouette, orientation, and projection identity; lower LODs may hide interior detail only.
- Define art review checks for traceability, identity, projection, palette-only variants, style, and easter-egg restraint. Generated concepts remain non-runtime references and cannot serve as factual evidence.
- Do not treat AI concept-sheet cross-panel pixel equality, transparency, alpha masks, or multi-panel edge masks as runtime geometry authority.
- Define keyboard, pointer, touch, focus, reduced-motion, responsive, and overlay-state checks.
- Define explicit checks that illustrative visuals are not treated as factual evidence.
- Define initial-load and lazy-3D performance/fallback checks.
- Separate deterministic automated gates from browser/visual reviewer checks.
- Identify the exact hard gate that unblocks `CW-008`.

## Gate Commands

- Validate `docs/career-world-production/reports/qa-lead-contract.json` with a strict JSON parse after the controlled revision.
- No repository build, lint, or test run is required for this documentation-only planning packet.

## Stop Conditions

- A criterion cannot be made observable or testable.
- The current test harness cannot cover a critical behavior and no proportional browser proof is available; report the gap.

## Expected Output

Write the report in `templates/worker-report.template.json` shape. Include the acceptance matrix, exact evidence artifacts, cited claims, risks/blockers, ledger updates, the `D-010` and `D-011` precedence rulings, and a clear separation between accepted contract and current implementation readiness.
