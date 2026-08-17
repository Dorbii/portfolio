# Intent checks

This suite records current presentation, composition, and design expectations.
It is intentionally separate from the blocking regression suite because these
contracts may change during an approved visual or technical pivot.

Run it with `npm run test:intent`. A failure requires design review; it does not
by itself establish a product bug. Cross-layer ownership, frozen accepted asset
hashes, resource ceilings, camera behavior, and runtime correctness remain in
the blocking `npm test` suite.

The NinjaOne Capital intent check launches a fixed `1448x1086`-registered
capital capture and compares only the L4 city-region contribution against the
selected package master. UI and accepted L1-L3 background pixels are excluded.
Its `0.80` threshold is a visual-direction checkpoint, not a normal regression
gate. Use `npm run test:intent:city` for the focused capture and evidence bundle.
