# NinjaOne terrain contact repair r8

This revision retains every accepted r7 terrain repair and removes the active
C1-C2 source-row duplication at master `y=2160`, `x=2880..5760`.

The correction is deterministic and source-local:

- only one RGB row can change;
- alpha is byte-identical to r7;
- each repaired channel continues the two lower opaque source pixels with
  `2 * near - far`, clamped to 8-bit range;
- transparent and alpha-edge pixels are left untouched;
- there is no blur, opacity fade, runtime overlay, resampling, or projection
  change.

Rebuild and promote:

```powershell
python scripts/repair-ninjaone-c1-c2-contact-r8.py
python scripts/promote-terrain-contact-repair.py `
  --source art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png `
  --report art-source/career-world/ninjaone-environment/production-r2/seam-repair-r8/integration-report.json `
  --revision 8
```

The integration report records the exact input/output hashes, mutation fence,
changed-byte count, alpha invariant, and before/after contact metrics.
