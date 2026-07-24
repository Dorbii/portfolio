# Career World portfolio

This repository is the clean Career World portfolio foundation. The world view
is the source of truth: land, water, interaction, and future detail all share
one fixed orthographic coordinate plane.

## Commands

```text
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
python scripts/build-career-world-assets.py --check
```

The accepted authored assets live under
`public/career-world/layers/<layer-name>/`. Runtime implementations live under
the matching `features/career-world/layers/<layer-name>/` directory.

`scripts/build-career-world-assets.py` deterministically compiles the Phase 3
terrain, coast, and hydrology derivatives. It does not rewrite the accepted
world-water albedo unless the author explicitly passes
`--refresh-locked-water`.
