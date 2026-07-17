# Task Packet: Full Concept Prompt Manifest

## Task

Create the complete, generation-ready manifest for all 56 accepted concept targets. Do not generate images.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `art-full-manifest`
- parent thread id: `/root`
- role: prompt architect
- route id: `art/prompt-manifest`
- spawn mode: worker-lane
- queue item id: `CW-004-prep`
- context budget: exact inventory, art report, and imagegen prompt guidance only
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/art-full-manifest.json`
- log artifact directory: `docs/career-world-production/logs/art-full-manifest/`
- expected exit gate: 56 unique, exact, generation-ready prompts with validated paths and evidence statuses

## Allowed Files

- `docs/career-world-production/concept-briefs.json`
- `docs/career-world-production/reports/art-full-manifest.json`

## Forbidden Files

- No image generation.
- No product, test, configuration, registry, asset, or factual-copy changes.
- Do not commit, stage, reset, or revert.

## Required Context

- `docs/career-world-production/asset-inventory.md` — authoritative 56-item list and override decisions
- `docs/career-world-production/reports/art-lead-recon.json` — shared style bible and review rules, except its Java/AI and six held-project exclusions are superseded
- Imagegen prompting and sample-prompt references

## Manifest Contract

Write valid JSON with:

```text
schema_version
run_id
shared_prompt
projection
palette_slots
reference_images
assets[56]
```

Every asset entry must include:

```text
id
category
status: planned
evidence_status: evidence-backed | identity-only | employer-supported-unlinked | user-required-unplaced | ambient
output_path
reference_roles
asset_brief
easter_egg_rule
full_prompt
avoid
```

Path groups:

```text
design/career-world/concepts/world/
design/career-world/concepts/cities/
design/career-world/concepts/projects/
design/career-world/concepts/skills/
design/career-world/concepts/ambient/
```

Prompt rules:

- One isolated canonical identity per generated image except the wide world geography reference.
- Building/ambient sheets show LOD-0, LOD-1, LOD-2, and one solid silhouette inset.
- Locked projection and technical-cartography style from the inventory.
- No generated text/logo/mascot/pseudo-text/watermark.
- Each project and skill must have architecture-led identity; if identity depends on a logo or prompt explanation, the brief fails.
- The six ACE/Column projects get unique entertainment-only landmark briefs derived only from their approved names, with explicit prohibition on factual architecture, real-campus implication, metrics, or skill symbolism.
- Java gets a reusable architecture brief and `user-required-unplaced` status.
- AI gets an evidence-backed Kaizen Metrics-compatible architecture brief without brain imagery or provider logos.
- VMware, MacStadium, Electron, Informatica, Atlassian, and CI/CD use resume-supported high-level motifs and no marks.
- Easter eggs are optional LOD-2 details only and never evidence.

## Acceptance Criteria

- Exactly 56 assets: 1 world, 5 cities, 16 projects, 27 skills/capabilities, 7 ambient.
- All IDs exactly match `asset-inventory.md` with no duplicates or omissions.
- All output paths are unique and stable.
- All 16 project briefs and 27 skill briefs are visibly distinct in massing/silhouette, not logo plinth variants.
- JSON parses and a mechanical count/uniqueness/category check passes.
- The worker report records the exact validation command/results and any unresolved prompt risk.

## Stop Conditions

- Any inventory/source conflict remains after applying the direct-user overrides in `asset-inventory.md`.
- A unique brief would require inventing a factual project claim.

## Expected Output

Save the manifest and worker report; return counts, validation result, and the five highest-risk briefs for art-lead review.

