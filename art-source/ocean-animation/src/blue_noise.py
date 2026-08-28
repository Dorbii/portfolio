"""High-frequency energy in the BLUE water -- away from foam.

The source plate's water surface is smooth and gets its structure from a few
strong features. A render can match every histogram, spectrum, foam statistic and
even local contrast while carrying far more surface noise than that, and surface
noise is what reads as paint. This isolates it.
"""
import os, sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
WM = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'), np.float32)/255 > 0.9

def score(tag, a):
    h, w = min(a.shape[0], WM.shape[0]), min(a.shape[1], WM.shape[1])
    a = a[:h, :w]; m = WM[:h, :w]
    L = a @ LUMA; mx, mn = a.max(2), a.min(2)
    sat = (mx-mn)/np.maximum(mx, 1e-4)
    foam = (L > 0.62) & (sat < 0.32)
    blue = m & ~(gf(foam.astype(np.float32), 3.0) > 0.02)
    # Two scales: 2 px is surface texture, 0.8 px is per-pixel grain -- the
    # "pixelated / scattered" read, which a 2 px high-pass largely misses.
    hp = L - gf(L, 2.0)
    px1 = L - gf(L, 0.8)
    print(f'{tag:<26} 2px {hp[blue].std():.4f}   PIXEL-scale {px1[blue].std():.4f}   '
          f'p99 {np.percentile(np.abs(px1[blue]),99):.4f}')

if __name__ == '__main__':
    score('SOURCE PLATE (target)',
          np.asarray(Image.open(os.path.join(ROOT,'refs','canonical','S.png')).convert('RGB'), np.float32)/255)
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
        score(','.join(ov) or 'all on', r.composite(t).astype(np.float32)/255)
