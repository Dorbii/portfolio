"""Render the ocean on the REAL world coastline, at camera scale.

The tuned plate is a cliffside close-up; the live world is a map with a 25x zoom
range. This renders a coastal crop of the actual world art so the treatment can
be judged against the art it will ship against, and at the scales it will ship at.

Only world-anchored lengths move with the camera (presets.at_camera); stroke
widths stay fixed in screen pixels. OCEAN_G moves with it too, because it is what
sets how many pixels a wave of a given period spans.

    python worldcoast.py <z> [state]
"""
import os, sys, subprocess
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'worldcoast')


def env(z):
    e = dict(os.environ)
    e['OCEAN_ROOT'] = WS
    e['OCEAN_G'] = str(130.0 * z)
    e['OCEAN_DEPTH'] = str(105.0 * z)
    e['OCEAN_SHELF'] = str(230.0 * z)
    e['OCEAN_CALM_REFS'] = ''
    e['PYTHONPATH'] = SRC
    e['WC_Z'] = str(z)
    e['WC_STATE'] = sys.argv[2] if len(sys.argv) > 2 else 'windy_rolling_surf'
    return e


def _render():
    sys.path.insert(0, SRC)
    import numpy as np
    from PIL import Image
    import presets, ocean_gl
    z = float(os.environ['WC_Z']); state = os.environ['WC_STATE']
    p = presets.at_camera(state, z)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', f'worldcoast_z{z:g}_{state}.png')
    Image.fromarray(r.composite(t)).save(out)
    print('wrote', out)


if __name__ == '__main__':
    if os.environ.get('WC_Z') and sys.argv[-1] == '_r':
        _render()
    else:
        z = float(sys.argv[1]) if len(sys.argv) > 1 else 0.35
        sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)] + sys.argv[1:] + ['_r'],
                                env=env(z)).returncode)
