"""Score a render against the SOURCE PLATE's own water, which is the art the
animation has to sit inside. Reported over the water mask only."""
import os, sys, numpy as np
from PIL import Image
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
WM = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'), np.float32)/255 > 0.9

def stats(tag, a):
    m = WM[:a.shape[0], :a.shape[1]]
    a = a[:m.shape[0], :m.shape[1]]
    L = a @ LUMA; mx, mn = a.max(2), a.min(2); sat = (mx-mn)/np.maximum(mx, 1e-4)
    foam = (L > 0.70) & (sat < 0.22); w = m & ~foam; fo = m & foam
    p = np.percentile(L[m], [5, 50, 75, 95, 99])
    fp = np.percentile(L[fo], [50, 95]) if fo.sum() > 50 else [0, 0]
    print(f'{tag:<14} L {p[0]:.3f} {p[1]:.3f} {p[2]:.3f} {p[3]:.3f} {p[4]:.3f} '
          f'| sat {sat[w].mean():.3f} | B-R {(a[...,2]-a[...,0])[w].mean():.3f} '
          f'| foam% {100*foam[m].mean():4.1f} | foamL {fp[0]:.3f}/{fp[1]:.3f} '
          f'| clip {100*(L[m] > 0.995).mean():.2f}%')

if __name__ == '__main__':
    print(f'{"":14} L p05   p50   p75   p95   p99')
    stats('SOURCE PLATE', np.asarray(Image.open(os.path.join(ROOT, 'refs', 'canonical', 'S.png'))
                                     .convert('RGB'), np.float32)/255)
    import itertools
    args = sys.argv[1:] or ['heavy_crashing_surf']
    for spec in args:
        n, *ov = spec.split(':')
        p = dict(presets.PRESETS[n])
        for kv in ov:
            k, v = kv.split('='); p[k] = float(v)
        if ov: n = n + '|' + ','.join(ov)
        r = ocean_gl.OceanRenderer(p, verbose=False)
        fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
        for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
        t = 0.0
        while t < 10.0: r.step(t, dt, False); t += dt
        img = r.composite(t)
        Image.fromarray(img).save(os.path.join(ROOT, 'diagnostics', 'codexref', f'match_{n.split(chr(124))[0]}_{len(ov)}.png'))
        stats(n.split('_')[0], img.astype(np.float32)/255)
