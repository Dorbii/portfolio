# Task Packet: CW-002 Independent Art QA

## Task

Independently review the five saved tracer concepts against the accepted projection, identity, reuse, evidence, and extractability contract. Do not generate or edit images.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `art-tracer-qa`
- parent thread id: `/root/art_lead`
- role: art QA
- route id: `qa/art/tracer`
- spawn mode: qa-lane
- queue item id: `CW-002`
- context budget: five images, one inventory, one generation report
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/art-tracer-qa.json`
- log artifact directory: `docs/career-world-production/logs/art-tracer-qa/`
- expected exit gate: per-asset weighted verdict and exact targeted revision instructions

## Allowed Files

- Read the five tracer images and production contracts.
- Write only `docs/career-world-production/reports/art-tracer-qa.json`.

## Forbidden Files

- No image generation or edits.
- No application, test, configuration, registry, or factual copy changes.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-production/asset-inventory.md`
- `docs/career-world-production/reports/art-lead-recon.json`
- `docs/career-world-production/reports/art-tracer-generation.json`
- `design/career-world/concepts/tracer/*.png`
- The three supplied mock references named in the generation packet

## Acceptance Criteria

- Inspect all five files with `view_image`.
- Score every rubric criterion 0-4 and calculate the weighted result.
- A concept passes only at 90 or higher, no automatic blocker, and no critical criterion below 3.
- Confirm the Go concept is employer-neutral and can be mechanically recolored without geometry change.
- Confirm Kaizen Metrics retains the domed landmark identity and no easter egg implies a metric.
- Confirm the NinjaOne concept is one capital identity, not an alternate city layout.
- Confirm the world concept preserves one mainland/two islands and is label/UI-free.
- Confirm the evergreen cluster is reusable and traceable.
- Distinguish `PASS`, `REVISE`, and `REJECT`; give one precise revision request per failed concept.

## Expected Output

Write the worker-report JSON with per-asset scores, blockers, visual evidence, promotion verdict, and exact revision prompts. No free-text-only verdict.

