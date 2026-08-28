"""Local contrast at wave scale, by distance from shore, against the plate.

Global statistics (histogram, spectrum, foam fraction) matched the plate closely
while the render still read as texture rather than as waves. This is the measure
that separated them: how much tonal range exists INSIDE a wave-sized window.
"""
import os, sys, numpy as np
from PIL import Image
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
SDF = np.load(os.path.join(ROOT, 'masks', 'shore_sdf.npy'))
WM = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'), np.float32)/255 > 0.9

def zones(tag, rgb, extra=''):
    h, w = min(rgb.shape[0], WM.shape[0]), min(rgb.shape[1], WM.shape[1])
    L = rgb[:h, :w] @ LUMA; m = WM[:h, :w]; d = SDF[:h, :w]
    mx, mn = rgb[:h, :w].max(2), rgb[:h, :w].min(2)
    sat = (mx-mn)/np.maximum(mx, 1e-4)
    foam = (L > 0.66) & (sat < 0.28)
    out = []
    for lo, hi, nm in ((0, 90, 'surf'), (90, 260, 'mid'), (260, 900, 'open')):
        P = 24; v = []
        for y in range(0, h-P, P):
            for x in range(0, w-P, P):
                if m[y:y+P, x:x+P].mean() < 0.99: continue
                dd = d[y:y+P, x:x+P].mean()
                if lo <= dd < hi: v.append(L[y:y+P, x:x+P].std())
        out.append(f'{nm} {np.median(v):.4f}' if v else f'{nm} -')
    print(f'{tag:<26} ' + '  '.join(out) + f'   foam {100*foam[m].mean():4.1f}%  luma {L[m].mean():.3f} {extra}')

if __name__ == '__main__':
    zones('SOURCE PLATE  (target)',
          np.asarray(Image.open(os.path.join(ROOT, 'refs', 'canonical', 'S.png')).convert('RGB'), np.float32)/255)
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
        Image.fromarray(img).save(os.path.join(ROOT, 'diagnostics', 'codexref', f'lc_{"_".join(ov) or "base"}.png'))
        zones(','.join(ov) or 'base', img.astype(np.float32)/255)
