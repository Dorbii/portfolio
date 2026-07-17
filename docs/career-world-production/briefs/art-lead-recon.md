# Task Packet: Art Lead Recon

## Task

Define the complete concept-asset inventory, canonical art bible, generation batches, and art-review contract. Do not generate images yet and do not edit product code.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `art-lead-recon`
- parent thread id: `/root`
- role: art lead
- route id: `art/recon/concept-library`
- spawn mode: worker-lane
- queue item id: `CW-001`
- context budget: asset-map and current evidence inventory; max three full skills
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/art-lead-recon.json`
- log artifact directory: `docs/career-world-production/logs/art-lead-recon/`
- expected exit gate: complete asset list, projection/style bible, prompt batches, and art-QA rubric

## Preconditions

- `docs/career-world-asset-map.md` is authoritative.
- Existing mock images are concept references only, not reusable final assets.
- Other agents may edit nearby files; preserve unrelated work.

## Allowed Files

- Read repository evidence, the asset map, and the three supplied reference images if useful.
- Write only `docs/career-world-production/reports/art-lead-recon.json`.

## Forbidden Files

- All application, test, dependency, configuration, and image asset files.
- No image generation in this packet.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-asset-map.md`
- `docs/career-world-production/architecture.md`
- `features/evidence-atlas/model/evidence-data.ts`
- `features/evidence-atlas/model/project-relations.ts`
- `C:/Users/Steve/.codex/visualizations/2026/07/17/019f6de4-afa7-7ef1-9527-fb01bcab4419/career-world-mocks-v2/`
- `C:/Users/Steve/AppData/Local/Temp/codex-clipboard-0d3cbe0f-3d4e-48bf-ac25-49eaf9c8c118.png`
- `C:/Users/Steve/AppData/Local/Temp/codex-clipboard-5f71c2b6-fc21-4c18-93dd-79e248aaffca.png`
- `C:/Users/Steve/AppData/Local/Temp/codex-clipboard-13f4b5ee-d53b-4da4-ab9f-99a91767573e.png`

## Acceptance Criteria

- Enumerate world, employer-city, project-building, visible-skill-building, ambient, LOD, and UI-support asset classes.
- Distinguish canonical reusable assets from city instances and code-native geometry.
- Propose exact registry IDs and one concept deliverable per needed canonical identity.
- Identify unknown/unsafe ACE Hardware and Column Technologies details and avoid invented architecture based on confidential claims.
- Define projection, camera, materials, line weight, palette slots, lighting, density, negative constraints, and easter-egg rules.
- Propose generation batches that allow early tracer review before full production.
- Define an art-QA scorecard that catches geometry drift and generic AI concept-art failure.

## Gate Commands

Read-only inspection only. No image generation or product test run is required.

## Stop Conditions

- The asset inventory requires a factual mapping not present in approved evidence.
- A proposed concept cannot be reused under the canonical identity contract.

## Expected Output

Write the report in `templates/worker-report.template.json` shape. Put the structured asset inventory, art bible, prompt batches, review rubric, claims, risks, and ledger updates in the report.
