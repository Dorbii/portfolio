"""How CONNECTED the foam is: piece count and size, not just how much there is.

"Scattered" and "smooth" are not about the quantity of high-frequency energy --
that already matches the plate at both 2 px and pixel scale. They are about whether
that energy is organised into a few large connected sweeps or into many small
disconnected patches.
"""
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
WM = np.asarray(Image.open(os.path.join(ROOT,'masks','water_mask.png')).convert('L'), np.float32)/255 > 0.9

def score(tag, a):
    h, w = min(a.shape[0], WM.shape[0]), min(a.shape[1], WM.shape[1])
    a = a[:h, :w]; m = WM[:h, :w]
    L = a @ LUMA; mx, mn = a.max(2), a.min(2)
    sat = (mx-mn)/np.maximum(mx, 1e-4)
    f = (L > 0.66) & (sat < 0.28) & m
    lab, n = ndi.label(f)
    if n == 0:
        print(f'{tag:<28} no foam'); return
    sz = np.bincount(lab.ravel()); sz[0] = 0
    sz = sz[sz > 0]
    big = sz[sz >= 200].sum() / max(sz.sum(), 1)     # share carried by large pieces
    print(f'{tag:<28} pieces {len(sz):5d}  median {np.median(sz):6.0f}px  '
          f'largest {sz.max():7.0f}px  share in pieces>200px {100*big:5.1f}%  '
          f'coverage {100*f.sum()/m.sum():4.1f}%')

if __name__ == '__main__':
    score('SOURCE PLATE',
          np.asarray(Image.open(os.path.join(ROOT,'refs','canonical','S.png')).convert('RGB'), np.float32)/255)
    for cid in ('C2','C6','C7'):
        pth = os.path.join(ROOT,'refs','canonical',f'{cid}.png')
        if os.path.exists(pth):
            score(f'library {cid}', np.asarray(Image.open(pth).convert('RGB'), np.float32)/255)
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
        img = r.composite(t)
        Image.fromarray(img).save(os.path.join(ROOT,'diagnostics','codexref',f'fc_{"_".join(ov) or "base"}.png'))
        score(','.join(ov) or 'ours', img.astype(np.float32)/255)
