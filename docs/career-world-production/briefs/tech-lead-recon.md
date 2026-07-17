# Task Packet: Tech Lead Recon

## Task

Produce the repo-grounded technical architecture recommendation and implementation ticket split for the career-world rebuild. This is recon and design validation only; do not edit product code.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `tech-lead-recon`
- parent thread id: `/root`
- role: tech lead
- route id: `architecture/recon/frontend`
- spawn mode: worker-lane
- queue item id: `CW-001`
- context budget: focused repo recon, max three full skills
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/tech-lead-recon.json`
- log artifact directory: `docs/career-world-production/logs/tech-lead-recon/`
- expected exit gate: repo-grounded renderer, registry, camera, inspector, testing, and tracer recommendation

## Preconditions

- `docs/career-world-asset-map.md` exists and is authoritative.
- Current Blender/media removal diff is present and must not be reverted.
- Other agents may edit nearby files; preserve unrelated work.

## Allowed Files

- Read any tracked repository file needed for evidence.
- Write only `docs/career-world-production/reports/tech-lead-recon.json`.

## Forbidden Files

- All application, test, dependency, configuration, and asset files.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-asset-map.md`
- `docs/career-world-production/architecture.md`
- `features/evidence-atlas/`
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `package.json`, `tests/evidence-atlas.test.mjs`

## Acceptance Criteria

- Trace the current data, selection, camera/viewport, project inspector, styling, and test flows with `claim - path:line` evidence.
- Recommend the smallest credible 2D renderer and fixed-coordinate semantic-zoom contract.
- Identify what evidence data can be reused and what must be normalized.
- Define a one-employer/one-project tracer slice with exact files and tests.
- Identify dependency/performance/accessibility risks for the later lazy 3D phase without starting it.
- Provide a vertical-slice ticket proposal, dependencies, file fences, and gates.

## Gate Commands

Read-only inspection only. No repository test run is required for this recon packet.

## Stop Conditions

- The authoritative asset contract conflicts with current user direction.
- The report would require inventing missing project or skill facts.
- Two materially different renderer choices remain tied after repo evidence; report the decision boundary instead of guessing.

## Expected Output

Write the report in `templates/worker-report.template.json` shape. Include summary, files changed, gates run, cited claims, deviations, risks/blockers, follow-ups, and ledger updates.

