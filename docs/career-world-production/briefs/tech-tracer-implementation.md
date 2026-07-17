# Task Packet: CW-003A Fixed-Scene Technical Tracer

## Task

Implement a bounded world -> NinjaOne -> Kaizen Metrics -> factual project-summary tracer using placeholder deterministic SVG geometry. The same registry instances and coordinates must survive every zoom. Art concepts may arrive in parallel and must not be embedded as layout truth.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `tech-tracer-implementation`
- parent thread id: `/root/tech_lead`
- role: frontend implementation worker
- route id: `frontend/career-world/tracer`
- spawn mode: worker-lane
- queue item id: `CW-003`
- context budget: exact packet, accepted inventory, tech recon, and local feature/test precedents
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/tech-tracer-implementation.json`
- log artifact directory: `docs/career-world-production/logs/tech-tracer-implementation/`
- expected exit gate: fixed-instance semantic zoom tracer with factual modal drawer and green repository gates

## Preconditions

- `docs/career-world-production/asset-inventory.md` and D-005/D-006 are accepted.
- Current Blender/media removal diff must remain intact.
- Other agents may edit concept-art/report paths; never revert unrelated work.

## Allowed Files

- Create `features/career-world/**` except generated concept PNGs.
- Create `tests/career-world.test.mjs`.
- Modify `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `package.json`, and the minimum root-route expectations in `tests/evidence-atlas.test.mjs` needed to reflect Career World becoming the default route.
- Write `docs/career-world-production/reports/tech-tracer-implementation.json` and gate logs under the packet log directory.

## Forbidden Files

- Do not change factual strings in `features/evidence-atlas/model/evidence-data.ts`.
- Do not delete the old evidence feature in this tracer slice.
- Do not edit generated concept art, resume files, or production planning contracts.
- No 2D or 3D rendering dependency; no WebGL; no video/system-tour path.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-production/architecture.md`
- `docs/career-world-production/asset-inventory.md`
- `docs/career-world-production/reports/tech-lead-recon.json`
- `docs/career-world-production/reports/qa-lead-contract.json`
- Current evidence data and ProjectInspector behavior as read-only precedent
- Current viewport math as read-only precedent; copy only the minimal generic math needed into the new feature boundary

## Functional Contract

- Root route renders Career World, not Evidence Atlas.
- One `1600 x 900` immutable registry contains all five employer anchors, the NinjaOne capital, three NinjaOne projects, and one city-local Go instance at the accepted coordinates.
- One native SVG scene stays mounted. World, employer, project, and summary states change camera/focus/LOD only.
- A semantic HTML control layer exposes real employer/project controls; decorative SVG is `aria-hidden`.
- World -> NinjaOne focuses the same city instance. NinjaOne -> Kaizen Metrics focuses the same project instance and reveals the existing Go instance plus all currently evidence-supported Metrics skill links represented by placeholders if exact positions are not yet accepted.
- Opening the project summary does not change camera or registry data. Treat it as a modal overlay: background interaction becomes inert, focus enters the drawer, Escape/close restores the project control.
- Show the exact disclosure: `Illustrative world — visual scale and activity are not measured outcomes.`
- Reuse the existing Kaizen Metrics factual evidence through one adapter. Illustrative records can never populate factual fields.
- Keep the retired video/system-tour absent.
- Reduced motion reaches the same camera targets without interpolation. Support pointer activation, keyboard activation, back, zoom in/out/reset, and a mobile project index.
- URL state supports employer/project IDs and degrades invalid IDs to world without inventing content.

## Acceptance Criteria

- Registry tests cover unique IDs, one employer city, one project asset per project, one employer/skill instance, resolving links, and stable identity tuples.
- Camera round trips and anchor-preserving zoom pass; LOD visibility never changes registry tuples.
- Opening/closing the drawer preserves camera, focus target, and all instance coordinates exactly.
- SSR includes Career World, the disclosure, resume links, five employer labels, NinjaOne projects, and no retired-media markup.
- No initial 3D dependency or WebGL usage.
- The tracer is usable at desktop, compact, and phone sizes without relying on hover.
- Existing factual project content is not reworded.

## Gate Commands

- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- focused retired-media/import scan

## Stop Conditions

- The fixed coordinate contract cannot fit the tracer without changing accepted anchors.
- Factual evidence reuse requires rewording or inventing data.
- A required edit exceeds the allowed file fence.
- The same gate fails twice without a new diagnosis.

## Expected Output

Write the worker-report JSON with exact files, gate commands/counts/logs, claim -> path:line evidence, deviations, risks, and ledger updates. Do not claim visual fidelity to concepts; this is a placeholder geometry tracer.

