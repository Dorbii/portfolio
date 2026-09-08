# Tanium c4-0 pond-bank and submerged-groove patch

Owner authorized one localized land-art repair, then requested that the existing carved line continue through the pond floor. Built-in ImageGen was used: two candidates, with the second following that revised instruction. No CLI/API fallback was used. Visual acceptance remains with the owner.

- Selected bank-art reference (its narrow generated crossing is replaced by canonical grooves): [candidate-submerged-line.png](quarantine/candidate-submerged-line.png).
- Exact final prompt: [prompt.txt](prompt.txt).
- Registration: [registration.json](registration.json).
- Permission mask: [permission-mask.png](permission-mask.png).
- Mechanical proof: [verification.json](verification.json).
- Materialized land source: art-source/career-world/l2-land/tanium/c4-0/c4-0-l2.png.
- Materialized bed texture/registration: public/career-world/layers/water/inland/submerged-groove-r9.json.

The cyan guide is removed from land alpha. Both submerged grooves are rebuilt from the original route and kerb by scripts/build-submerged-groove.mjs, using build-chain-layer.mjs --unmasked --cell c4-0. They are clipped by the current pond alpha and sampled as bed albedo before water optics. The generated crossing is not used. The final land patch keeps all pixels outside the permission mask unchanged; chain pixels inside it are replaced by the registered land/bed portions, preventing a second opaque line over the water.

Rebuild the materialized patch with node scripts/build-inland-pond-patch.mjs, which also rebuilds the canonical submerged grooves, then restitch T c4-0, export with --only-cells tanium:c4-0, rebuild the land mount, review/refresh its inventory source hash and rebuild water. Preserve this registered override if regenerating the chain artwork.
