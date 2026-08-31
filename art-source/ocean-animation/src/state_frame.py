"""Render one settled frame of a preset in the CURRENT OCEAN_ROOT scene,
with the scene's water mask in the alpha channel so foam_shape.py and any
other measurement excludes the pixels the page never composites.

This is the offline iteration loop for the live look: overrides are the same
key=value the presets carry, so a candidate can be rendered, measured against a
canonical plate, and LOOKED AT in about a minute, without an export.

    OCEAN_ROOT=$PWD/scenes/match OCEAN_G=130 OCEAN_DEPTH=105 OCEAN_SHELF=230 \
    PYTHONPATH=$PWD/src python src/state_frame.py \
        'heavy_crashing_surf:injPatch=0.85' out.png

The `match` scene is the one built on the live camera's actual box.
"""
import os, sys
import numpy as np
from PIL import Image
import presets, ocean_gl

spec, out = sys.argv[1], sys.argv[2]
name, *ov = spec.split(':')
p = dict(presets.PRESETS[name])
for kv in ov:
    k, v = kv.split('=')
    p[k] = float(v)

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
while t < 10.0:
    r.step(t, dt, False)
    t += dt
img = r.composite(t)

root = os.environ.get('OCEAN_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
wm = np.asarray(Image.open(os.path.join(root, 'masks', 'water_mask.png')).convert('L'))
h, w = min(img.shape[0], wm.shape[0]), min(img.shape[1], wm.shape[1])
rgba = np.zeros((h, w, 4), np.uint8)
rgba[:, :, :3] = img[:h, :w, :3]
rgba[:, :, 3] = np.where(wm[:h, :w] > 230, 255, 0)
Image.fromarray(rgba).save(out)
print('wrote', out, 'water frac %.2f%%' % (100.0 * (rgba[:, :, 3] > 0).mean()))
