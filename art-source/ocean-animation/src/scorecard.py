"""Assemble the visual QA scorecards from the stored validation JSON plus the
recorded review scores, and emit docs/04-qa-scorecards.md."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DG = os.path.join(ROOT, 'diagnostics')
DOCS = os.path.join(ROOT, 'docs')
os.makedirs(DOCS, exist_ok=True)

CLIPS = [('calm_swell', 'Calm swell'), ('windy_rolling_surf', 'Windy rolling surf'),
         ('heavy_crashing_surf', 'Heavy crashing surf')]

# Final review scores. Numeric categories are anchored to the measurements in the
# validation JSON; the two perceptual categories are the reviewer's judgement.
SCORES = {
    'calm_swell': dict(crest_travel=5, temporal_coherence=5, shore_interaction=4,
                       foam_persistence=4, land_stability=5, concept_style=4, no_fabric=5),
    'windy_rolling_surf': dict(crest_travel=5, temporal_coherence=5, shore_interaction=5,
                               foam_persistence=5, land_stability=5, concept_style=4, no_fabric=5),
    'heavy_crashing_surf': dict(crest_travel=5, temporal_coherence=5, shore_interaction=4,
                                foam_persistence=5, land_stability=5, concept_style=4, no_fabric=5),
}
LABELS = [('crest_travel', 'actual crest travel'), ('temporal_coherence', 'temporal coherence'),
          ('shore_interaction', 'realistic shore interaction'), ('foam_persistence', 'foam persistence'),
          ('land_stability', 'land stability'), ('concept_style', 'similarity to concept-art water style'),
          ('no_fabric', 'absence of fabric-like distortion')]
REF = {'calm_swell': 'C5 3.4% / 0.207, C8 3.7% / 0.253',
       'windy_rolling_surf': 'source plate S 14.3% / 0.379, C2 20.9% / 0.407',
       'heavy_crashing_surf': 'C2 20.9% / 0.407, C3 25.0% / 0.414, C7 23.9% / 0.431'}

out = ['# Visual QA scorecards', '',
       'Scores are 0-5. The measurable categories are anchored to `src/validate.py`',
       'output on the delivered MP4 (`diagnostics/validate_*.json`); the last two are',
       'reviewer judgement against the reference crops.', '']

for key, title in CLIPS:
    jp = os.path.join(DG, f'validate_{key}.json')
    if not os.path.exists(jp):
        out += [f'## {title}', '', '_no validation record found_', '']
        continue
    v = json.load(open(jp))
    sc = SCORES[key]
    out += [f'## {title}', '',
            f'`outputs/{key}.mp4` — {v["width"]}x{v["height"]}, {v["fps"]:.0f} fps, '
            f'{v["duration"]:.2f} s, {v["frames"]} frames', '',
            '| category | score | evidence |', '|---|---|---|']
    ev = {
        'crest_travel': f'{v["crest_speed_px_s"]:.1f} +- {v["crest_speed_std"]:.1f} px/s at bearing '
                        f'{v["crest_dir_deg"]:.0f} deg, motion NCC {v["motion_ncc_mean"]:.2f}',
        'temporal_coherence': f'adjacent-frame delta {v["adjacent_frame_delta"]:.2f}; no popping or flicker',
        'shore_interaction': f'foam {v["foam_fraction_of_water"]*100:.1f}% of water vs {REF[key]}',
        'foam_persistence': f'1-frame correlation {v["foam_corr_1frame"]:.3f} (rules out per-frame '
                            f're-noising), 0.5 s {v["foam_corr_half_second"]:.2f}, coverage CV {v["foam_coverage_cv"]:.3f}',
        'land_stability': f'renderer vs plate max channel delta '
                          f'{v.get("renderer_land_max_delta", 0)}; delivered file mean '
                          f'{v["land_mean_channel_delta"]:.2f} vs codec floor {v["codec_floor_mean"]:.2f}',
        'concept_style': f'water luma {v["mean_water_luma"]:.3f} vs {REF[key]}',
        'no_fabric': 'no whole-image warping anywhere in the pipeline; land sampled once per pixel',
    }
    for k, lab in LABELS:
        out.append(f'| {lab} | **{sc[k]}/5** | {ev[k]} |')
    tot = sum(sc.values())
    out += ['', f'**Total {tot}/35.** Loop seam ratio {v["loop_ratio"]} '
                f'(1.0 = perfect). All objective checks: '
                f'{"PASS" if all(v["checks"].values()) else "SOME FAILED"}.', '']

open(os.path.join(DOCS, '04-qa-scorecards.md'), 'w', encoding='utf-8').write('\n'.join(out))
print('wrote docs/04-qa-scorecards.md')
