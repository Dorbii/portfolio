"""Render stills for one preset and score them against the Codex reference crop."""
import os, sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOX = (30, 300, 470, 1100)      # offshore analysis window, same in ref and ours
LUMA = np.array([0.299, 0.587, 0.114], np.float32)

def stats(a):
    a = a.astype(np.float32) / 255.0
    L = a @ LUMA
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    p = np.percentile(L, [1, 5, 25, 50, 75, 95, 99])
    return dict(foam=float(((L > 0.70) & (sat < 0.22)).mean()),
                p05=p[1], p25=p[2], p50=p[3], p75=p[4], p95=p[5],
                sat=float(sat.mean()),
                broad=float(gaussian_filter(L, 18.0).std()),
                micro=float((L - gaussian_filter(L, 3.0)).std()),
                BmR=float((a[..., 2] - a[..., 0]).mean()))

HDR = ['foam', 'p05', 'p25', 'p50', 'p75', 'p95', 'sat', 'broad', 'micro', 'BmR']
def show(tag, s):
    print(f'{tag:<14}' + ' '.join(f'{s[h]:7.4f}' for h in HDR))

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
    times = [float(x) for x in (sys.argv[2:] or [2.0, 10.0])]
    p = presets.PRESETS[name]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    out = os.path.join(ROOT, 'diagnostics', 'codexref')
    os.makedirs(out, exist_ok=True)
    print(f'{"":14}' + ' '.join(f'{h:>7}' for h in HDR))
    ref = os.path.join(out, 'ref_t2.png')
    if os.path.exists(ref):
        show('REF', stats(np.asarray(Image.open(ref).convert('RGB').crop(BOX))))
    t = 0.0
    for target in times:
        while t < target - 1e-6:
            r.step(t, dt, False); t += dt
        img = r.composite(t)
        Image.fromarray(img).save(os.path.join(out, f'new_{name}_t{target:g}.png'))
        show(f'new@{target:g}', stats(np.asarray(Image.fromarray(img).crop(BOX))))
