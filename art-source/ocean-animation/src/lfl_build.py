"""Build and render a like-for-like scene for any live camera view.

Crops the world art and its AUTHORITATIVE mask to the camera, magnifies so one
scene pixel is one tuned pixel, and runs the offline renderer on it. That makes
the offline renderer and the live layer the same water, so the only things left
between them are the bake density and the port.

    python lfl_build.py <name> <span> <centre-u> <centre-v> [state]
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
# Read from the world the live layer is actually running, not written down here.
# This was a literal 9.602985 -- correct while the world was baked from
# windy_rolling_surf, and wrong by a factor of 1.48 the moment it was re-baked
# from heavy_crashing_surf, because tuned pixels per world pixel is a function of
# the BAKED STATE's primary period. Every offline-vs-live comparison built after
# that re-bake was therefore between two different scales of sea, which is not a
# comparison at all. Same shape of defect as encode_world taking lambdaWorld from
# its own environment: one number, two homes, and no way to notice.
def _tuned_per_world():
    meta = os.path.join(ROOT, 'scenes',
                        os.environ.get('OCEAN_WORLD_SCENE', 'world'),
                        'baked', 'bake.json')
    import json
    with open(meta, encoding='utf-8') as fh:
        bake = json.load(fh)
    return (130.0 * bake['primaryPeriod'] ** 2 / (2.0 * np.pi)) / bake['lambdaWorld']


TPW = _tuned_per_world()
W, H = 1672, 941

if os.environ.get('LFLB') == '1':
    sys.path.insert(0, SRC)
    import presets, ocean_gl
    state = os.environ['LFLB_STATE']
    p = presets.at_camera(state, float(os.environ.get('LFLB_DENS', 1.0)))
    r = ocean_gl.OceanRenderer(p, verbose=True)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', os.environ['LFLB_OUT'])
    Image.fromarray(r.composite(t)).save(out)
    print('wrote', out)
    raise SystemExit(0)

name, span = sys.argv[1], float(sys.argv[2])
cu, cv = float(sys.argv[3]), float(sys.argv[4])
state = sys.argv[5] if len(sys.argv) > 5 else 'heavy_crashing_surf'
# Scene pixels per TUNED pixel. 1 puts a wave on 115 px, as the plate had it.
# Raising it renders the SAME waves at more pixels, which is what the live layer
# does when the camera closes in -- and since strokes and foam lines are
# screen-anchored, that is not a neutral change to the picture.
dens = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
ox, oy = cu - 0.5 * span, cv - 0.5 * span
box = (int(round(ox * W)), int(round(oy * H)),
       int(round((ox + span) * W)), int(round((oy + span) * H)))
out = (int(round((box[2] - box[0]) * TPW * dens)), int(round((box[3] - box[1]) * TPW * dens)))
ws = os.path.join(ROOT, 'scenes', name)
for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets', 'refs/canonical'):
    os.makedirs(os.path.join(ws, *d.split('/')), exist_ok=True)
print(f'{name}: world px {box}  ->  {out[0]}x{out[1]} scene px at one tuned px each')
Image.open(os.path.join(ROOT, 'scenes', 'world', 'refs', 'canonical', 'S.png')) \
     .convert('RGB').crop(box).resize(out, Image.LANCZOS) \
     .save(os.path.join(ws, 'refs', 'canonical', 'S.png'))
m = Image.open(os.path.join(ROOT, 'scenes', 'world', 'masks', 'water_mask.png')) \
         .convert('L').crop(box).resize(out, Image.BILINEAR)
mask_path = os.path.join(ws, 'water_mask_src.png')
Image.fromarray((np.asarray(m) > 127).astype(np.uint8) * 255).save(mask_path)
G = 130.0 * dens
e = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
         OCEAN_WATER_MASK=mask_path, OCEAN_G=str(G),
         OCEAN_DEPTH=str(105.0 * dens), OCEAN_SHELF=str(230.0 * dens))
r = subprocess.run([sys.executable, os.path.join(SRC, 'build_plates.py')],
                   env=e, capture_output=True, text=True)
print(r.stdout[-600:] or r.stderr[-600:])
e.update(LFLB='1', LFLB_STATE=state, LFLB_DENS=str(dens),
         LFLB_OUT=f'{name}_{state}.png')
sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
