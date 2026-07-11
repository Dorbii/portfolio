# Evidence Atlas feature

This folder owns the complete interactive portfolio experience. The public
entry point is `index.ts`; route files should import only `EvidenceAtlas`.

## Boundaries

- `components/` contains UI regions and the thin feature composition root.
- `hooks/` owns browser state: selection, trace replay, URL synchronization,
  keyboard clearing, and share-link feedback.
- `model/` owns evidence content, derived indexes, and deterministic query
  resolution. It contains no React or canvas code.
- `rendering/` owns deterministic graph layout and Canvas2D field rendering.
  It contains no React state.
- `styles/` owns the feature visual system.

## Invariants

- Manual selection is capped at three nodes.
- A trace step may select every node attached to its evidence record.
- The graph renders only the selected-node set; it does not interpret replay
  state.
- Opening the inspector must not resize or recompute the graph layout.
- Kaizen implementation details remain curated summaries. Public code must not
  expose internal paths, filenames, snippets, service URLs, identifiers, logs,
  or deployment configuration.
