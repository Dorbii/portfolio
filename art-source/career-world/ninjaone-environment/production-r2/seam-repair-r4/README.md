# Terrain contact repair workflow

This directory contains the accepted inputs and proof for repairing visible contacts in the registered `B1 B2 / C1 C2` terrain cohort. The workflow changes texture only. It must not change the master dimensions, alpha mask, projection, geography, or tile registration.

## Workflow

1. Build overlapping contexts from the current accepted predecessor master:

   ```powershell
   python scripts/build-terrain-contact-contexts.py
   ```

   The default source is the harmonized r3 master. The builder extracts the `B1-B2` east contact and `B1-C1` south contact with neighboring art on both sides, then makes a transparent center band for image completion.

2. Fill each `*-outpaint.png` without moving, scaling, rotating, or redrawing the opaque context. Store the chosen full result as `contexts/generated/<context-id>.png`. Image generation is not deterministic; these selected outputs are retained as source evidence.

3. Integrate the selected contact art deterministically:

   ```powershell
   python scripts/integrate-terrain-contact-repairs.py
   ```

   The checked-in defaults match r4: 96 px core, 96 px contact feather, 96 px context-window feather, and 48 px color-field radius. The compositor retains the source low-frequency color field and admits only generated high-frequency detail through a narrow feathered band. Source alpha is copied byte-for-byte.

4. Inspect the exact registered camera at close zoom with `L2_1` terrain detail and `L2_2` wildlife disabled. Reject the candidate if any contact cuts a tree or rock, changes terrain orientation, becomes softer than adjacent cells, or reveals a horizontal/vertical material boundary.

5. Promote only after visual acceptance:

   ```powershell
   python scripts/promote-terrain-contact-repair.py
   ```

   Promotion fails closed unless `integration-report.json` names the candidate, its SHA-256 matches, alpha is preserved, and projection drift is false. It then builds all four LOD plates and updates the runtime manifest.

## Required gates

- Master dimensions are unchanged.
- Alpha is byte-identical to the accepted predecessor.
- Tile coordinates, camera registration, coastline, and geography are unchanged.
- All generated contexts come from the same predecessor revision as the integration source.
- Close-zoom A/B inspection covers both repaired contacts and their intersection.
- Runtime LODs share one revision and source master.

Do not widen or blur a failed contact blindly. A persistent seam usually means mismatched source provenance, incompatible material structure, or a context window that cuts semantic features. Diagnose that cause and rebuild the contexts.

## Rejected approaches

- Regenerating a complete terrain plate with image generation.
- Editing an isolated crop without neighboring registered art.
- Using r2 context anchors against the harmonized r3 base.
- Hiding the boundary with low-frequency blur alone.
- Averaging source and generated pixels at a fixed 50/50 ratio.

Rollback is manifest-only: point the geology layer back to the complete r3 LOD cohort. Never overwrite the predecessor master.
