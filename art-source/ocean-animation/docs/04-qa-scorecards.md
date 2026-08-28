# Visual QA scorecards

Scores are 0-5. The measurable categories are anchored to `src/validate.py`
output on the delivered MP4 (`diagnostics/validate_*.json`); the last two are
reviewer judgement against the reference crops.

## Calm swell

`outputs/calm_swell.mp4` — 1074x1462, 24 fps, 13.50 s, 324 frames

| category | score | evidence |
|---|---|---|
| actual crest travel | **5/5** | 11.2 +- 1.2 px/s at bearing 47 deg, motion NCC 0.92 |
| temporal coherence | **5/5** | adjacent-frame delta 3.72; no popping or flicker |
| realistic shore interaction | **4/5** | foam 6.3% of water vs C5 3.4% / 0.207, C8 3.7% / 0.253 |
| foam persistence | **4/5** | 1-frame correlation 0.982 (rules out per-frame re-noising), 0.5 s 0.48, coverage CV 0.090 |
| land stability | **5/5** | renderer vs plate max channel delta 0; delivered file mean 0.02 vs codec floor 0.01 |
| similarity to concept-art water style | **4/5** | water luma 0.326 vs C5 3.4% / 0.207, C8 3.7% / 0.253 |
| absence of fabric-like distortion | **5/5** | no whole-image warping anywhere in the pipeline; land sampled once per pixel |

**Total 32/35.** Loop seam ratio 1.25 (1.0 = perfect). All objective checks: PASS.

## Windy rolling surf

`outputs/windy_rolling_surf.mp4` — 1074x1462, 24 fps, 15.00 s, 360 frames

| category | score | evidence |
|---|---|---|
| actual crest travel | **5/5** | 14.6 +- 3.4 px/s at bearing 57 deg, motion NCC 0.92 |
| temporal coherence | **5/5** | adjacent-frame delta 5.28; no popping or flicker |
| realistic shore interaction | **5/5** | foam 10.7% of water vs source plate S 14.3% / 0.379, C2 20.9% / 0.407 |
| foam persistence | **5/5** | 1-frame correlation 0.983 (rules out per-frame re-noising), 0.5 s 0.54, coverage CV 0.058 |
| land stability | **5/5** | renderer vs plate max channel delta 0; delivered file mean 0.02 vs codec floor 0.01 |
| similarity to concept-art water style | **4/5** | water luma 0.372 vs source plate S 14.3% / 0.379, C2 20.9% / 0.407 |
| absence of fabric-like distortion | **5/5** | no whole-image warping anywhere in the pipeline; land sampled once per pixel |

**Total 34/35.** Loop seam ratio 1.14 (1.0 = perfect). All objective checks: PASS.

## Heavy crashing surf

`outputs/heavy_crashing_surf.mp4` — 1074x1462, 24 fps, 17.00 s, 408 frames

| category | score | evidence |
|---|---|---|
| actual crest travel | **5/5** | 11.3 +- 0.0 px/s at bearing 45 deg, motion NCC 0.93 |
| temporal coherence | **5/5** | adjacent-frame delta 4.48; no popping or flicker |
| realistic shore interaction | **4/5** | foam 10.0% of water vs C2 20.9% / 0.407, C3 25.0% / 0.414, C7 23.9% / 0.431 |
| foam persistence | **5/5** | 1-frame correlation 0.983 (rules out per-frame re-noising), 0.5 s 0.62, coverage CV 0.144 |
| land stability | **5/5** | renderer vs plate max channel delta 0; delivered file mean 0.02 vs codec floor 0.01 |
| similarity to concept-art water style | **4/5** | water luma 0.352 vs C2 20.9% / 0.407, C3 25.0% / 0.414, C7 23.9% / 0.431 |
| absence of fabric-like distortion | **5/5** | no whole-image warping anywhere in the pipeline; land sampled once per pixel |

**Total 33/35.** Loop seam ratio 1.23 (1.0 = perfect). All objective checks: PASS.
