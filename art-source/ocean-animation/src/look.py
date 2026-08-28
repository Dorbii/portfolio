import os, sys
import numpy as np
from PIL import Image
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = sys.argv[1] if len(sys.argv) > 1 else 'windy_rolling_surf'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'after'
p = presets.PRESETS[NAME]
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
for _ in range(int(p['preroll']*fps*sub)):
    r.step(t, dt, first); first = False; t += dt
t = 0.0
while t < 6.0:
    r.step(t, dt, False); t += dt
im = Image.fromarray(r.composite(t))
out = os.path.join(ROOT, 'diagnostics', f'look_{NAME}_{TAG}.png')
im.crop((20, 240, 520, 940)).save(out)
im.save(os.path.join(ROOT,'diagnostics',f'full_{NAME}_{TAG}.png'))
print('wrote', out)
