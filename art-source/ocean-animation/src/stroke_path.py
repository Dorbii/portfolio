"""Is the crest stroke's PATH being shredded by high-frequency content?

contourLine divides by |grad f|, so wherever f carries fine detail the level set
wanders. The reference art's strokes are long with SMOOTH edges: the fine detail
belongs in the stroke's width and opacity, not in where it goes.

Test: contour hForm at increasing smoothing. If a smoothed field gives clean long
curves, then the path and the texture have to come from different bands.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter as gf
import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = sys.argv[1] if len(sys.argv) > 1 else 'windy_rolling_surf'


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-9), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def contour(f, level, width_px):
    gy, gx = np.gradient(f)
    return 1.0 - smoothstep(0.0, width_px * (np.hypot(gx, gy) + 1e-7), np.abs(f - level))


def tortuosity(mask):
    """How far the stroke's edge wanders per unit of stroke it delivers.

    perimeter / area for a band of constant width w is ~2/w. Fine wander on the
    boundary raises the perimeter without adding stroke, so this rises above 2/w
    exactly when the path is being shredded. Reported relative to the ideal.
    """
    m = (mask > 0.5)
    if m.sum() < 50:
        return float('nan')
    per = np.abs(np.diff(m.astype(np.int8), axis=0)).sum() + \
          np.abs(np.diff(m.astype(np.int8), axis=1)).sum()
    return float(per / m.sum())


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

flow = np.frombuffer(r.fboWave.read(attachment=1, components=4, dtype='f4'),
                     'f4').reshape(r.H, r.W, 4)
hForm = flow[..., 2]   # outFlow.z, the clean form field.astype(np.float64)

Y0, Y1, X0, X1 = 260, 900, 40, 460
W_PX = p['crestLineW']
sub_f = hForm[Y0:Y1, X0:X1]

ideal = 2.0 / W_PX
tiles = []
print(f'ideal boundary/area for a {W_PX:.1f}px band = {ideal:.3f}')
for sig in (0.0, 2.0, 4.0, 8.0):
    f = sub_f if sig == 0 else gf(sub_f, sig)
    c = contour(f, 0.40, W_PX)
    tort = tortuosity(c)
    print(f'smoothing sigma {sig:4.1f}px   coverage {(c>0.5).mean()*100:5.2f}%   '
          f'boundary/area {tort:.3f}   = {tort/ideal:5.2f}x ideal')
    tiles.append((f'sigma {sig:g}px   {tort/ideal:.1f}x ideal', f, c))

H, Wd = tiles[0][2].shape
try:
    font = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 17)
except Exception:
    font = ImageFont.load_default()
sheet = Image.new('RGB', (Wd * 2 + 12, H * 2 + 12), (10, 12, 16))
for i, (label, fld, c) in enumerate(tiles):
    n = (fld - fld.min()) / max(np.ptp(fld), 1e-9)
    rgb = np.stack([n * 0.10, n * 0.22, 0.16 + n * 0.34], -1)
    rgb = rgb * (1 - c)[..., None] + c[..., None]
    im = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    d.rectangle([0, 0, 232, 26], fill=(0, 0, 0, 220))
    d.text((6, 4), label, fill=(255, 255, 255, 255), font=font)
    sheet.paste(im, ((i % 2) * (Wd + 12), (i // 2) * (H + 12)))
out = os.path.join(ROOT, 'diagnostics', f'stroke_path_{NAME}.png')
sheet.save(out)
print('wrote', out)
