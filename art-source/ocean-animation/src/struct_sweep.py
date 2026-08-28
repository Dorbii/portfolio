"""Render stills with overrides and score them on STRUCTURE, not histograms."""
import os, sys, numpy as np
from PIL import Image
import presets, ocean_gl, foam_structure as fs
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
wm = np.asarray(Image.open(os.path.join(ROOT,'masks','water_mask.png')).convert('L'), np.float32)/255 > 0.9
sdf = np.load(os.path.join(ROOT,'masks','shore_sdf.npy'))
surf = wm & (sdf[:wm.shape[0],:wm.shape[1]] < 90)
ANG = 55.0

def hue_var(a, P=64):
    h, w = a.shape[:2]; F=[]
    for y in range(0, h-P, P):
        for x in range(0, w-P, P):
            if wm[y:y+P, x:x+P].mean() < 0.98: continue
            p = a[y:y+P, x:x+P]; F.append(float((p[...,2]-p[...,0]).mean()))
    return float(np.std(F))

def static_share(a):
    """Share of high-frequency energy carried by ISOLATED specks rather than by
    connected structure. This is what separates 'fine detail' from 'static', and
    the plate's own painted water sits at 40.8% with 4.3 px mean features."""
    from scipy import ndimage as ndi
    from scipy.ndimage import gaussian_filter as gf
    h, w = a.shape[:2]
    m = wm[:h, :w]
    L = a @ LUMA
    hp = L - gf(L, 1.6)
    b = (hp > hp[m].std() * 1.4) & m
    lab, n = ndi.label(b)
    if n == 0: return 0.0, 0.0, 0.0
    sz = np.bincount(lab.ravel()); sz[0] = 0
    tiny = sz[(sz > 0) & (sz < 6)].sum(); tot = max(sz.sum(), 1)
    return float(hp[m].std()), 100.0*tiny/tot, float(sz[sz > 0].mean())

def score(tag, a):
    fs.report(tag, a, surf[:a.shape[0], :a.shape[1]], ANG)
    r, sp, mc = static_share(a)
    print(f'{"":22} hue variety {hue_var(a):.4f}   hi-freq {r:.4f}   '
          f'speck share {sp:5.1f}%   mean feature {mc:4.1f}px')

if __name__ == '__main__':
    S = np.asarray(Image.open(os.path.join(ROOT,'refs','canonical','S.png')).convert('RGB'), np.float32)/255
    score('SOURCE PLATE', S[:wm.shape[0], :wm.shape[1]])
    for spec in sys.argv[1:]:
        name, *ov = spec.split(':')
        p = dict(presets.PRESETS[name])
        for kv in ov:
            k, v = kv.split('='); p[k] = float(v)
        r = ocean_gl.OceanRenderer(p, verbose=False)
        fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
        for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first=False; t += dt
        t = 0.0
        while t < 10.0: r.step(t, dt, False); t += dt
        img = r.composite(t)
        # temporal check in the same pass: foam that flickers fails validation,
        # and strong erosion on a hard threshold is exactly what makes it flicker
        f0 = np.frombuffer(r.fboFoam[r.cur].read(components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)[..., 1]
        for _ in range(12): r.step(t, dt, False); t += dt      # half a second
        f1 = np.frombuffer(r.fboFoam[r.cur].read(components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)[..., 1]
        mm = wm[:r.H, :r.W] & ((f0 > 0.02) | (f1 > 0.02))
        chalf = float(np.corrcoef(f0[mm], f1[mm])[0, 1]) if mm.sum() > 100 else 0.0
        Image.fromarray(img).save(os.path.join(ROOT,'diagnostics','codexref',f'sw_{"_".join(ov) or "base"}.png'))
        score(','.join(ov) or 'base', img.astype(np.float32)/255)
        print(f'{"":22} foam 0.5s corr {chalf:.3f}  (validator needs > 0.35)')
