"""Closeup concept study.

Same pipeline, same concepts, rendered at a magnification where the fine detail
can actually be judged: the aerated foam boundary, the lace filaments, the streak
lines, the chop crests, and the pre-break lip.

A zoom here is a change of UNITS, not a different sea. The plate region is cropped
and resampled by z, OCEAN_G / OCEAN_DEPTH / OCEAN_SHELF are scaled by z, and every
preset key carrying a length or a speed in picture pixels is scaled by z
(`presets.PX_SCALED`). Wave periods are left alone: with omega fixed and k -> k/z
the dispersion relation gives g -> g*z, so wavelength and phase speed both scale
by z, which is exactly a magnification.

  python closeup.py build          # crop, resample, rebuild masks at closeup scale
  python closeup.py render         # stills + animation
"""
import os, shutil, subprocess, sys
import numpy as np
from PIL import Image

SRC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOSE = os.path.join(SRC_ROOT, 'closeup')
Z = float(os.environ.get('CLOSEUP_Z', 2.4))
# a stretch of coast with open water, rock contact and a dock
CROP = (60, 820, 500, 1420)          # left, top, right, bottom in plate pixels
STATE = os.environ.get('CLOSEUP_STATE', 'heavy_crashing_surf')


def env():
    e = dict(os.environ)
    e['OCEAN_ROOT'] = CLOSE
    e['OCEAN_G'] = str(130.0 * Z)
    e['OCEAN_DEPTH'] = str(105.0 * Z)
    e['OCEAN_SHELF'] = str(230.0 * Z)
    e['PYTHONPATH'] = os.path.join(SRC_ROOT, 'src')
    # a pure-land, high-contrast patch inside the cropped frame, and a search
    # radius scaled with the zoom because residual offsets scale with it too
    e['OCEAN_ALIGN_PATCH'] = '900,1260,780,1040'
    e['OCEAN_ALIGN_RADIUS'] = str(int(26 * Z))
    return e


def build():
    can = os.path.join(CLOSE, 'refs', 'canonical')
    os.makedirs(can, exist_ok=True)
    for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets'):
        os.makedirs(os.path.join(CLOSE, d), exist_ok=True)
    src = os.path.join(SRC_ROOT, 'refs', 'canonical')
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        # EVERY reference gets the identical crop and resample. The water/land
        # decision is built from agreement across the calm references, and that
        # evidence -- which is what removed the false shoals -- only survives if
        # they stay registered to the source.
        im = Image.open(os.path.join(src, f)).convert('RGB').crop(CROP)
        im = im.resize((int(im.width * Z), int(im.height * Z)), Image.LANCZOS)
        im.save(os.path.join(can, f))
    s = Image.open(os.path.join(can, 'S.png'))
    print(f'closeup plate {s.size} from crop {CROP} at z={Z}')
    for j in ('palette_anchors.json',):
        p = os.path.join(SRC_ROOT, 'diagnostics', j)
        if os.path.exists(p):
            shutil.copyfile(p, os.path.join(CLOSE, 'diagnostics', j))
    r = subprocess.run([sys.executable, os.path.join(SRC_ROOT, 'src', 'build_plates.py')],
                       env=env(), capture_output=True, text=True)
    print(r.stdout[-2500:] or r.stderr[-2500:])
    return r.returncode


def _render_impl():
    """Runs in a child process, after OCEAN_ROOT is already in the environment:
    ROOT is read at import time, so the env has to be set before these import."""
    sys.path.insert(0, os.path.join(SRC_ROOT, 'src'))
    import presets, render
    p = presets.zoomed(STATE, Z)
    p['title'] = f'{p["title"]} - closeup x{Z:g}'
    name = f'closeup_{STATE}'
    presets.PRESETS[name] = p
    render.render_one(name, sheet=True)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'build':
        sys.exit(build())
    elif cmd == 'render':
        states = sys.argv[2:] or [STATE]
        if states == ['all']:
            states = ['calm_swell', 'windy_rolling_surf', 'heavy_crashing_surf']
        rc = 0
        for st in states:
            e = env(); e['CLOSEUP_STATE'] = st
            print(f'=== closeup: {st} ===')
            rc |= subprocess.run([sys.executable, os.path.abspath(__file__), '_render'], env=e).returncode
        sys.exit(rc)
    elif cmd == '_render':
        _render_impl()
    else:
        print(__doc__)
        sys.exit(2)
