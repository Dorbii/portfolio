"""Rendered luma / foam as a function of water depth -- says WHERE the brightness is."""
import os, sys, numpy as np
from PIL import Image
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
p = dict(presets.PRESETS[name])
for kv in sys.argv[2:]:
    k, v = kv.split('='); p[k] = float(v)
if len(sys.argv) > 2: print('overrides:', ' '.join(sys.argv[2:]))
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
t = 0.0
while t < 10.0: r.step(t, dt, False); t += dt
img = r.composite(t).astype(np.float32)/255.0
depth = np.frombuffer(r.texP.read(), 'f4').reshape(r.H, r.W, 4)[..., 3]
fm = np.frombuffer(r.fboFoam[r.cur].read(components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)
wm = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'), np.float32)/255.0 > 0.9
L = img @ np.array([0.299, 0.587, 0.114], np.float32)
mx, mn = img.max(2), img.min(2); sat = (mx-mn)/np.maximum(mx, 1e-4)
foam = (L > 0.70) & (sat < 0.22)
edges = [0, 4, 8, 14, 20, 30, 45, 65, 90, 200]
print(f'{"depth band":>12} {"px":>9} {"%water":>7} {"L p50":>7} {"L p95":>7} {"foam%":>7} {"cover p95":>9}')
for a, b in zip(edges[:-1], edges[1:]):
    m = wm & (depth >= a) & (depth < b)
    if m.sum() < 500: continue
    print(f'{a:5d}-{b:<6d} {m.sum():9d} {100*m.sum()/wm.sum():7.1f} '
          f'{np.percentile(L[m],50):7.3f} {np.percentile(L[m],95):7.3f} '
          f'{100*foam[m].mean():7.2f} {np.percentile(fm[...,1][m],95):9.3f}')
print(f'{"ALL WATER":>12} {wm.sum():9d} {100.0:7.1f} {np.percentile(L[wm],50):7.3f} '
      f'{np.percentile(L[wm],95):7.3f} {100*foam[wm].mean():7.2f} {np.percentile(fm[...,1][wm],95):9.3f}')
