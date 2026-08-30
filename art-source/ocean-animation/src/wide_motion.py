"""Does the sea still MOVE when you stand back from it?

Every still instrument here said our water and the reference water are the same
treatment: at the world camera the plate scores WORSE than ours on orientation
coherence (0.442 against 0.316) and carries less contrast. Motion is the one
dimension that was never compared, and it is the one that separates them:

    heavy_crashing_surf.mp4   full density 30.7   at zc 0.106  24.4   keeps 80%
    live layer                capital      28.5   world        6.4    keeps 22%

Downsampling averages, so it destroys motion that lives in fine detail and
preserves motion that lives at large scales. The reference keeps four fifths of
its movement through a 9.4x reduction; ours keeps a fifth. That is the difference
between a sea and a standing pattern with a shimmer on it, and no single-frame
statistic can see it.

This is the offline half of scripts/measure-ocean-motion.mjs: render one scene at
two times half a second apart, downsample both to a chosen zc, and report the
mean |dLuma| over water. Reported inside and outside the surf zone separately,
because surf moves whatever the open sea is doing.

    python wide_motion.py wideopen 0.1061 heavy_crashing_surf

OCEAN_OPEN_WAVE_VIS forces the live layer's wide-shot fade into the offline
renderer, which is the only way to render what the world tier actually shows.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
GAP_SECONDS = 0.5
SURF_ZONE_PX = 60.0


def render_pair(scene, state, tag):
    """Two composites GAP_SECONDS apart, from one continuous integration."""
    sys.path.insert(0, SRC)
    import ocean_gl
    import presets
    p = presets.PRESETS[state]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub)
    t = -p['preroll']
    first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first)
        first = False
        t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False)
        t += dt
    out = []
    for i in range(2):
        out.append(np.asarray(r.composite(t)).astype(np.float32))
        target = t + GAP_SECONDS
        while t < target - 1e-9:
            r.step(t, dt, False)
            t += dt
    for i, a in enumerate(out):
        Image.fromarray(a.astype(np.uint8)).save(
            os.path.join(ROOT, 'diagnostics', f'{tag}_m{i}.png'))
    return out


def main():
    scene = sys.argv[1]
    zc = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1061
    state = sys.argv[3] if len(sys.argv) > 3 else 'heavy_crashing_surf'
    ws = os.path.join(ROOT, 'scenes', scene)
    tag = f'{scene}_{state}_motion'

    if os.environ.get('WM') != '1':
        env = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
                   OCEAN_G='130.0', OCEAN_DEPTH='105.0', OCEAN_SHELF='230.0',
                   WM='1')
        raise SystemExit(subprocess.run(
            [sys.executable, os.path.abspath(__file__)] + sys.argv[1:],
            env=env).returncode)

    frames = render_pair(scene, state, tag)
    sdf_full = np.load(os.path.join(ws, 'masks', 'shore_sdf.npy'))

    print(f'{scene}  {state}  openWaveVis='
          f'{os.environ.get("OCEAN_OPEN_WAVE_VIS", "1 (offline default)")}')
    print('   %-9s %-12s %-14s %s' % ('zc', 'size', 'band', 'mean |dLuma| / 500ms'))
    for factor in (1.0, zc):
        small = []
        for a in frames:
            im = Image.fromarray(a.astype(np.uint8))
            small.append(np.asarray(im.resize(
                (max(4, int(im.width * factor)), max(4, int(im.height * factor))),
                Image.LANCZOS)).astype(np.float32))
        sdf = np.asarray(Image.fromarray(sdf_full).resize(
            (small[0].shape[1], small[0].shape[0]), Image.BILINEAR))
        lum = lambda a: a @ np.array([.299, .587, .114])
        d = np.abs(lum(small[1]) - lum(small[0]))
        for label, band in (('open water', sdf > SURF_ZONE_PX),
                            ('surf zone', (sdf > 0) & (sdf <= SURF_ZONE_PX))):
            if band.sum() < 50:
                continue
            print('   %-9.4f %-12s %-14s %6.2f'
                  % (factor, f'{small[0].shape[1]}x{small[0].shape[0]}',
                     label, d[band].mean()))


if __name__ == '__main__':
    main()
