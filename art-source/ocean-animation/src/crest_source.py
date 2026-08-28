"""Which field should the crest STROKE be contoured from?

composite.frag draws the main crest line as contourLine(hnL, ...) where hnL is
geom.x -- the summed height of every family, harmonic and chop band. That is an
INTERFERENCE field. Contouring an interference field cannot produce long curves:
its level sets are short broken loops wherever components beat against each other.

hForm (flow.z) is the clean single-train form field: one phase field, bent and
grouped, built exactly so it has a wave SHAPE. Its level sets are the crests.

This renders both, with the identical contour operator, over open water.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = sys.argv[1] if len(sys.argv) > 1 else 'windy_rolling_surf'


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-9), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def contour(f, level, width_px):
    """The numpy twin of contourLine() in common: a constant-width stroke."""
    gy, gx = np.gradient(f)
    g = np.hypot(gx, gy) + 1e-7
    return 1.0 - smoothstep(0.0, width_px * g, np.abs(f - level))


def strokes(mask):
    """Geometry of the stroke mask as CURVES.

    A run along a scanline measures the stroke's WIDTH, not its length: a line
    at angle th crosses a row in width/sin(th) pixels regardless of how far it
    runs. Length has to come from the connected component. For each component,
    PCA of its pixel coordinates gives a major axis (length) and a minor axis
    (width); their ratio is how curve-like it is.
    """
    from scipy.ndimage import label
    lab, n = label(mask > 0.5)
    if n == 0:
        return 0.0, 0.0, 0
    L, E, A = [], [], []
    idx = np.argsort(lab.ravel(), kind='stable')
    flat = lab.ravel()[idx]
    ys, xs = np.unravel_index(idx, lab.shape)
    bounds = np.searchsorted(flat, np.arange(1, n + 2))
    for i in range(n):
        a, b = bounds[i], bounds[i + 1]
        if b - a < 12:
            continue
        y, x = ys[a:b].astype(np.float64), xs[a:b].astype(np.float64)
        c = np.cov(np.vstack([x - x.mean(), y - y.mean()]))
        w = np.linalg.eigvalsh(c)
        major, minor = 4.0 * np.sqrt(max(w[1], 1e-9)), 4.0 * np.sqrt(max(w[0], 1e-9))
        L.append(major); E.append(major / max(minor, 1e-6)); A.append(b - a)
    if not L:
        return 0.0, 0.0, 0
    A = np.array(A, float); w = A / A.sum()
    return float(np.dot(w, L)), float(np.dot(w, E)), len(L)


def coherence(f):
    """Structure-tensor orientation coherence, the measure already calibrated."""
    gy, gx = np.gradient(f.astype(np.float64))
    from scipy.ndimage import gaussian_filter as gf
    s = 4.0
    Jxx, Jyy, Jxy = gf(gx * gx, s), gf(gy * gy, s), gf(gx * gy, s)
    tr = Jxx + Jyy
    d = np.sqrt(np.maximum((Jxx - Jyy) ** 2 + 4 * Jxy ** 2, 0.0))
    return float(np.mean(d / (tr + 1e-9)))


p = presets.PRESETS[NAME]
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2
dt = 1.0 / (fps * sub)
t = -p['preroll']
first = True
for _ in range(int(p['preroll'] * fps * sub)):
    r.step(t, dt, first); first = False; t += dt
t = 0.0
while t < 6.0:
    r.step(t, dt, False); t += dt

g, fm, sp = r.read_state()
flow = np.frombuffer(r.fboWave.read(attachment=1, components=4, dtype='f4'),
                     'f4').reshape(r.H, r.W, 4)
water = np.frombuffer(r.texM.read(), 'f4').reshape(r.H, r.W, 4)[..., 0] if hasattr(r, 'texM') else None

hn = g[..., 0]
hForm = flow[..., 2]   # outFlow.z, the clean form field
print(f'plate {r.W}x{r.H}   hn [{hn.min():+.3f},{hn.max():+.3f}]   hForm [{hForm.min():+.3f},{hForm.max():+.3f}]')

# an open-water box, away from the shore gating
Y0, Y1, X0, X1 = 260, 900, 40, 460
W_PX = p['crestLineW']

results = {}
for label, f, lvl in (('hn  (what ships)', hn, p['crestLevel']),
                      ('hForm (clean train)', hForm, 0.40)):
    sub_f = f[Y0:Y1, X0:X1].astype(np.float64)
    c = contour(sub_f, lvl, W_PX)
    results[label] = (sub_f, c)
    cov = float((c > 0.5).mean())
    ln, el, cnt = strokes(c)
    print(f'{label:22s} coverage {cov*100:5.2f}%   '
          f'stroke len {ln:6.1f}px  elong {el:5.1f}:1  n={cnt:4d}  '
          f'field coherence {coherence(sub_f):.3f}')

H, Wd = results['hn  (what ships)'][1].shape
try:
    font = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 17)
except Exception:
    font = ImageFont.load_default()
sheet = Image.new('RGB', (Wd * 2 + 12, H), (10, 12, 16))
for i, (label, (fld, c)) in enumerate(results.items()):
    rgb = np.zeros((H, Wd, 3), np.float64)
    n = (fld - fld.min()) / max(np.ptp(fld), 1e-9)
    rgb[..., 0] = n * 0.10; rgb[..., 1] = n * 0.22; rgb[..., 2] = 0.16 + n * 0.34
    for ch in range(3):
        rgb[..., ch] = rgb[..., ch] * (1 - c) + c
    im = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    d.rectangle([0, 0, 250, 26], fill=(0, 0, 0, 220))
    d.text((6, 4), label, fill=(255, 255, 255, 255), font=font)
    sheet.paste(im, (i * (Wd + 12), 0))
out = os.path.join(ROOT, 'diagnostics', f'crest_source_{NAME}.png')
sheet.save(out)
print('wrote', out)
