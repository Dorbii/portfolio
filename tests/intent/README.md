# Intent checks

This suite records current presentation, composition, and design expectations.
It is intentionally separate from the blocking regression suite because these
contracts may change during an approved visual or technical pivot.

Run it with `npm run test:intent`. A failure requires design review; it does not
by itself establish a product bug. Cross-layer ownership, frozen accepted asset
hashes, resource ceilings, camera behavior, and runtime correctness remain in
the blocking `npm test` suite.
