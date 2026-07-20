# Art concept tournament

This is a local, catalog-driven art-direction review tool. It is intentionally usable from a `file://` URL so reviewing concept batches does not require a development server.

## Structure

- `concept-tournament.html` contains the semantic screens and controls.
- `concept-tournament.css` owns layout, responsive behavior, and annotation presentation.
- `concept-tournament.js` owns tournament state, telemetry, local persistence, final review, and export behavior.
- `concept-tournaments/tournament-catalog.js` supplies the available asset sets.
- `tests/concept-tournament-dom-test.cjs` runs the complete local workflow without a browser dependency.

Open `concept-tournament.html` directly, optionally with a catalog manifest route:

```text
concept-tournament.html?set=concept-tournaments/<set-folder>/tournament-set.js
```

## Review model

Each asset set receives two independently seeded brackets followed by balanced top-four calibration. The final review board then shows every concept and records:

- exact image regions to keep, change, or avoid;
- a controlled art-direction category and optional explanation for each region;
- overall review notes;
- whether to refine one concept, combine multiple concepts, fully redesign, remove, or approve a direction as production art.

Marks and notes auto-save as a local draft. The explicit **Save review** action confirms that feedback for telemetry export. **Approve as production art** is separate: it means the selected concept needs no further iteration and should become the production asset.

Every **Start review** and **Run same set again** action creates a new choice-telemetry session. Batch storage retains only the latest completed attempt for each asset, so a refresh or repeated review cannot cause older choice sessions to be counted alongside the current one. Confirmed notes, annotations, dispositions, and production-art approval remain separate persistent review state.

Image regions use percentages rather than rendered pixels, so annotations remain aligned across viewport sizes. All progress stays in browser local storage until JSON export. The generic `art-review-concept-tournament-batch-v1` key automatically reads the earlier Career World key for backward compatibility.

## Catalog contract

Catalog entries need a stable `id`, display `name`, `category`, and local `manifestPath`. Any category is accepted; known art categories receive curated group labels and unknown categories are title-cased automatically.

Manifest assets need stable IDs and image sources. Stable IDs are required because bracket decisions, annotations, production approvals, and later design passes all refer to them.

## Verification

Run the repository-local regression harness:

```powershell
node design/career-world/tests/concept-tournament-dom-test.cjs
```

It covers startup, generalized bracket sizes, reseeding, mirrored repeats, byes, calibration, catalog routing, draft and confirmed notes, region annotations, card direction states, refine/combine/redesign/remove outcomes, production approval, and individual/batch exports.
