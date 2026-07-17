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
- Project gravity wells may anchor layout and motion, but they remain excluded
  from manual selection and evidence-query traversal.
- Each graph node is rendered once. Its deterministic position comes from the
  weighted barycenter of the projects with evidence for that node; nodes tied
  to one project orbit that project.
- Ambient bridges and selection wakes use canonical project-to-skill
  relationships only. No skill-to-skill relationship is inferred for motion.
- The graph renders only the selected-node set; it does not interpret replay
  state.
- Opening the inspector must not resize or recompute the graph layout.
- Zoom and pan transform the existing layout; they do not recompute evidence
  positions or create new relationships.
- Wheel zoom may enter an authored project only after the viewport is centered
  near its neutral portal and crosses the project-entry threshold. This changes
  presentation state, never evidence selection or ontology.
- An open evidence drawer changes viewport travel and token culling, not graph
  layout or evidence resolution.
- Kaizen implementation details remain curated summaries. Public code must not
  expose internal paths, filenames, snippets, service URLs, identifiers, logs,
  or deployment configuration.
