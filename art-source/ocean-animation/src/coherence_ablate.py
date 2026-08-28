"""Which layer is destroying orientation coherence?

Coherence -- how aligned local structure is -- is the one measurement that
disagrees badly with the reference (0.68x), and it is what separates streaks from
mottling. It is independent of energy: two cells can carry identical variance at
every scale and differ completely in this. So the question is not which layer adds
the most energy, but which adds ISOTROPIC energy.
"""
import os, sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
WM = np.asarray(Image.open(os.path.join(ROOT,'masks','water_mask.png')).convert('L'), np.float32)/255 > 0.9

def coherence(a, cell=64):
    h, w = min(a.shape[0], WM.shape[0]), min(a.shape[1], WM.shape[1])
    a, m = a[:h,:w], WM[:h,:w]
    L = a @ LUMA
    gy, gx = np.gradient(gf(L, 1.2))
    Jxx, Jyy, Jxy = gf(gx*gx, 3.0), gf(gy*gy, 3.0), gf(gx*gy, 3.0)
    tr = Jxx + Jyy
    d = np.sqrt(np.maximum((Jxx-Jyy)**2 + 4*Jxy*Jxy, 0.0))
    coh = d / np.maximum(tr, 1e-9)
    vals = []
    for y in range(0, h-cell, cell):
        for x in range(0, w-cell, cell):
            if m[y:y+cell, x:x+cell].mean() < 0.99: continue
            vals.append(coh[y:y+cell, x:x+cell].mean())
    return float(np.mean(vals))

if __name__ == '__main__':
    print(f'{"reference":<26} coherence {coherence(np.asarray(Image.open(os.path.join(ROOT,"refs","canonical","S.png")).convert("RGB"), np.float32)/255):.4f}')
    for spec in sys.argv[1:]:
        name, *ov = spec.split(':')
        p = dict(presets.PRESETS[name])
        for kv in ov:
            k, v = kv.split('='); p[k] = float(v)
        r = ocean_gl.OceanRenderer(p, verbose=False)
        fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
        for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
        t = 0.0
        while t < 10.0: r.step(t, dt, False); t += dt
        print(f'{",".join(ov) or "all on":<26} coherence {coherence(r.composite(t).astype(np.float32)/255):.4f}')
