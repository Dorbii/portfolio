"""One command that rebuilds every deliverable from the reference archives.

  cd src && python reproduce.py
"""
import os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = ['calm_swell', 'windy_rolling_surf', 'heavy_crashing_surf']


def run(desc, *cmd):
    print(f'\n=== {desc} ===', flush=True)
    t0 = time.time()
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, *cmd], cwd=HERE, env=env)
    print(f'--- {desc}: {"ok" if r.returncode == 0 else "FAILED"} in {time.time()-t0:.1f}s', flush=True)
    return r.returncode


def main():
    bad = 0
    bad += run('reference analysis (measure, do not trust filenames)', 'analyze_refs.py')
    bad += run('palette anchors', 'palette_extract.py')
    bad += run('swell wavelength profile', 'swell_profile.py')
    bad += run('reference contact sheet', 'contact_sheet.py')
    bad += run('crest orientation verification', 'crest_diag.py')
    bad += run('plates: masks, shoreline SDF, bathymetry, clean water plate', 'build_plates.py')
    bad += run('plate diagnostics', 'plate_diag.py')
    for c in CLIPS:
        bad += run(f'STAGE 1 GATE: open ocean, no coast, no foam -- {c}', 'stage1_gate.py', c, '--frames', '300')
    bad += run('final renders (mp4 + webp + gif + contact sheets)', 'render.py', 'all')
    for c in CLIPS:
        bad += run(f'validate delivered file -- {c}', 'validate.py', f'../outputs/{c}.mp4',
                   '--preset', c, '--json', f'../diagnostics/validate_{c}.json')
    bad += run('QA scorecards', 'scorecard.py')
    bad += run('three-state comparison sheet', 'compare_states.py')
    print(f'\n{"ALL STAGES OK" if bad == 0 else f"{bad} STAGE(S) REPORTED A PROBLEM"}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
