"""Does the renderer simply need more samples per pixel?

Every procedural term is evaluated once, at the pixel centre, so the finest
content the renderer can produce is one pixel wide. The plate's finest content
spans 2-3 px -- measured, neighbouring pixels of its fine detail correlate at
0.583 against our 0.28. That is not a style difference, it is a sampling rate.

This renders the SAME scene at 2x and averages down, which is real supersampling
rather than the resolution-halving downsample tested earlier. A zoom here is a
change of units, so OCEAN_G/DEPTH/SHELF and every px-carrying preset key scale
with it (presets.PX_SCALED), exactly as closeup.py does.

    python supersample.py build       # upscale plate, rebuild masks at 2x
    python supersample.py render      # render at 2x, average down, measure
"""
import os, shutil, subprocess, sys
import numpy as np
from PIL import Image

SRC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = os.path.join(SRC_ROOT, 'supersample')
Z = float(os.environ.get('SS_Z', 2.0))
STATE = os.environ.get('SS_STATE', 'windy_rolling_surf')


def env():
    e = dict(os.environ)
    e['OCEAN_ROOT'] = SS
    e['OCEAN_G'] = str(130.0 * Z)
    e['OCEAN_DEPTH'] = str(105.0 * Z)
    e['OCEAN_SHELF'] = str(230.0 * Z)
    e['PYTHONPATH'] = os.path.join(SRC_ROOT, 'src')
    return e


def build():
    can = os.path.join(SS, 'refs', 'canonical')
    os.makedirs(can, exist_ok=True)
    for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets'):
        os.makedirs(os.path.join(SS, d), exist_ok=True)
    src = os.path.join(SRC_ROOT, 'refs', 'canonical')
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        im = Image.open(os.path.join(src, f)).convert('RGB')
        im = im.resize((int(im.width * Z), int(im.height * Z)), Image.LANCZOS)
        im.save(os.path.join(can, f))
    for j in ('palette_anchors.json',):
        q = os.path.join(SRC_ROOT, 'diagnostics', j)
        if os.path.exists(q):
            shutil.copyfile(q, os.path.join(SS, 'diagnostics', j))
    r = subprocess.run([sys.executable, os.path.join(SRC_ROOT, 'src', 'build_plates.py')],
                       env=env(), capture_output=True, text=True)
    print(r.stdout[-1500:] or r.stderr[-1500:])
    return r.returncode


def _render():
    sys.path.insert(0, os.path.join(SRC_ROOT, 'src'))
    import presets, ocean_gl
    p = presets.zoomed(STATE, Z)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub)
    t = -p['preroll']
    first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    big = Image.fromarray(r.composite(t))
    out = os.path.join(SRC_ROOT, 'diagnostics', f'ss_{STATE}_2x.png')
    big.save(out)
    small = big.resize((int(big.width / Z), int(big.height / Z)), Image.LANCZOS)
    small.save(os.path.join(SRC_ROOT, 'diagnostics', f'ss_{STATE}_down.png'))
    print('wrote', out)
    print('wrote', out.replace('_2x', '_down'))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'build':
        sys.exit(build())
    elif cmd == 'render':
        e = env()
        sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__), '_r'], env=e).returncode)
    elif cmd == '_r':
        _render()
