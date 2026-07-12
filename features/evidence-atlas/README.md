# Evidence Atlas feature

This folder owns the complete interactive portfolio experience. The public
entry point is `index.ts`; route files should import only `EvidenceAtlas`.

## Boundaries

- `components/` contains UI regions and the thin feature composition root.
- `hooks/` owns browser state: selection, project replay, URL synchronization,
  keyboard clearing, and share-link feedback.
- `model/` owns evidence content, derived indexes, and deterministic query
  resolution. It contains no React or canvas code.
- `rendering/` owns deterministic graph layout, viewport math, semantic-token
  definitions, and Canvas2D field rendering. It contains no React state.
- `styles/` owns the feature visual system.

## Invariants

- Manual selection is capped at three nodes.
- A project step may select every node attached to its evidence record.
- Projects are metadata and packet identities, never graph nodes. The graph is
  limited to capabilities and technologies.
- The graph renders only the selected-node set; it does not interpret replay
  state.
- Opening the inspector must not resize or recompute the graph layout.
- Zoom and pan transform the existing layout; they do not recompute evidence
  positions or create new relationships.
- An open evidence drawer changes viewport travel and token culling, not graph
  layout or evidence resolution.
- Kaizen implementation details remain curated summaries. Public code must not
  expose internal paths, filenames, snippets, service URLs, identifiers, logs,
  or deployment configuration.
