# NinjaOne terrain contact repair r7

This revision replaces the blurred B1-to-B2 horizontal contact with a
two-sided overlap repair. It deliberately starts from the sharp r2 master so
the rejected r3-r6 low-frequency seam treatments are not inherited.

## Authority contract

- The r2 terrain master remains the geography, projection, and alpha authority.
- `contexts/west/generated/south-full.png` and
  `contexts/east/generated/south-full.png` are the only nondeterministic
  generated artifacts retained by this revision.
- Generated terrain is inserted between irregular minimum-error hard cuts.
  There is no horizontal fade, opacity feather, or broad color wash.
- The two generated windows meet through a measured vertical overlap at master
  columns `1344..1536`.
- The previously accepted vertical-contact artifact is retained under
  `contexts/vertical/` and reapplied last as an isolated operation. No rejected
  predecessor master is used as an input.
- The output alpha is byte-identical to r2 and no layout coordinates change.

## Rebuild

The context manifests retain the exact source boxes. If the opaque and
transparent context previews are needed again, rerun
`build-terrain-contact-contexts.py` with the recorded manifest parameters.
Do not regenerate the two retained `generated/south-full.png` files unless a
new art review explicitly rejects them.

Build each side into temporary full-master candidates:

```powershell
python scripts/quilt-terrain-contact-repair.py `
  --source art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r2.png `
  --contexts art-source/career-world/ninjaone-environment/production-r2/seam-repair-r7/contexts/west `
  --context-id south-full --output .codex-tmp/r7-west.png `
  --report .codex-tmp/r7-west.json `
  --entry-band 96 288 --leave-band 640 896 --exit-band 1488 1536 `
  --anchor 96 --max-step 3 --smoothness 6 --edge-penalty 12 `
  --feature-penalty 160 --feature-radius 14 `
  --boundary-anchor-radius 16 --boundary-sample-radius 3
```

Repeat that command with `contexts/east`, then join the full-master candidates:

```powershell
python scripts/stitch-terrain-contact-overlaps.py `
  --left .codex-tmp/r7-west.png --right .codex-tmp/r7-east.png `
  --output .codex-tmp/r7-horizontal.png --report .codex-tmp/r7-stitch.json `
  --overlap 1344 1536 --edge-penalty 12 `
  --feature-penalty 160 --feature-radius 14 `
  --max-step 2 --smoothness 8
```

Finally, reapply only the accepted vertical contact:

```powershell
python scripts/integrate-terrain-contact-repairs.py `
  --source .codex-tmp/r7-horizontal.png `
  --contexts art-source/career-world/ninjaone-environment/production-r2/seam-repair-r7/contexts/vertical `
  --output art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r7.png `
  --report .codex-tmp/r7-vertical.json `
  --core 520 --feather 240 --window-feather 96 `
  --color-field-method generated-anchored --contact east
```

`integration-report.json` records the retained generated hashes, output hash,
contact boxes, cut parameters, and proof paths used for promotion.
