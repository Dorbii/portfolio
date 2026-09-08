# Neutral land lighting performance fix — 2026-09-07

Animated water exposed a browser compositing stall while the land's SVG lighting filter was attached. At the default 13:00 / 0.45 weather setting, all land RGB gains are exactly one and cloud attenuation is zero: the filter changes no illumination, but still creates a filter/compositing surface.

`LandLighting` now omits that identity filter. `needsLandLightingFilter` checks the actual illumination factors, not the clock alone. Every non-neutral light retains the original linearRGB filter chain, cloud registration and alpha behavior. The land child stays mounted in the same wrapper. Ocean shaders, water animation cadence, terrain assets and LOD policy are unchanged.

## Matched workload

- Windows, RTX 3080 Ti, ANGLE D3D11; headless Edge 152, 1444 × 1318 viewport, device scale 1.
- Frame `pool · tanium candidate closed pool` through the Inland review control: origin approximately `[0.38281246, 0.61672222]`, span `[0.03500009, 0.035]`.
- All land and ocean effects enabled. Warm up 4.5 seconds, then sample browser requestAnimationFrame cadence for 4 seconds. Pause the separate in-app water preview while Edge runs.
- Raw JSON, screenshots, benchmark scripts and gate logs: `.codex-tmp/qa/lighting-perf-r11/`. `before/` is commit 5261a6b7; `final/` is the shipped patch. `after/` and `transitions/` are intermediate experiments, not the final implementation.

| Case | Browser fps | Frame interval p95 | Water GPU timer p95 |
| --- | ---: | ---: | ---: |
| Before, first filter-on sample | 29.89 | 33.5 ms | 22.187 ms |
| Before, L5_1 disabled control | 59.88 | 16.9 ms | 0.659 ms |
| Final, normal daylight | 59.80 | 16.9 ms | 0.910 ms |
| Final, L5_1 re-enabled | 59.72 | 16.9 ms | 0.902 ms |
| Final, night | 59.63 | 16.8 ms | 0.648 ms |
| Final, storm | 59.83 | 16.8 ms | 0.661 ms |
| Final, return to daylight | 59.71 | 16.9 ms | 0.911 ms |

The original filter sometimes became fast after toggling: the before re-enabled control reached 59.65 fps. This is a state-dependent browser cost, not a claim that every old frame cost 22 ms. The water timer includes cross-canvas copy/wait effects and does not isolate shader ALU time. Water's intentional approximately 30 Hz animation cadence remains unchanged.

The final in-app preview independently measured 59.86 fps idle and 59.79 fps during the same 40-key pan pattern used in the earlier investigation. Its map viewport was smaller (1053 × 592), so its absolute GPU timings are not a matched comparison against the earlier 1392 × 783 in-app run. Default computed land filter is `none`; water and seabed report `ready`.

## Validation and limits

- Inspected before/final daylight and night screenshots, final storm and in-app pond screenshots. An intermediate attempt to simplify the non-neutral filter changed dark-tone rounding and was reverted. Non-neutral lighting keeps its original filter primitives.
- Lighting tests reuse the actual world-light manifest and sample daylight/weather/cloud ranges, checking that every bypassed filter has unit illumination. Full suite: 134 tests, 129 pass, 4 existing failures, 1 skipped. The failures remain Tanium capital envelope, NinjaOne paving coverage, territory resegmentation and Kaizen topography.
- Typecheck and production build pass. Lint: 0 errors, 32 existing warnings. No assets or world-authoring files changed.
- The demonstrated default-daylight stall is addressed. This is not an all-device performance guarantee or a general rewrite of night/storm compositing; those retain the original browser filter path. Visual acceptance remains with Steve.
