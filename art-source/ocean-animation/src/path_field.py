"""The crest stroke should be contoured from ONE train, not the summed form.

hForm = (cos(SP + bend) + aL*cos(SP*harmL + ..) + a3*cos(SP*mF3 + ..)) / (1+aL+a3)

For windy, aL = 1.05 against a primary of 1.0: the sub-harmonic carries as much
weight as the train it modulates. Summing cosines of different wavelength at
comparable amplitude is a BEAT, and the level sets of a beat break up wherever the
components cancel. That is the same defect already found and fixed for the shading
terms (hnSwell), still present in the field the stroke is drawn from.

The primary term alone -- cos(SP + coarse bend) -- is a single cosine of a solved
eikonal field. It is smooth by construction, runs the whole width of the frame, and
refracts correctly, because SP already carries the refraction.
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
    m = mask > 0.5
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

P = np.frombuffer(r.texP.read(), 'f4').reshape(r.H, r.W, 4)
SP = P[..., 0].astype(np.float64)
flow = np.frombuffer(r.fboWave.read(attachment=1, components=4, dtype='f4'),
                     'f4').reshape(r.H, r.W, 4)
hForm = flow[..., 2]   # outFlow.z, the clean form field.astype(np.float64)

rng = np.random.default_rng(7)
coarse = gf(rng.standard_normal(SP.shape), 540.0 / 3.0)
coarse /= (np.std(coarse) + 1e-9)
bend = coarse * 0.8 * p['formBend']

aL, harmL, a3, mF3 = p['ampL'], p['harmL'], p['formFine'], 1.90
Y0, Y1, X0, X1 = 260, 900, 40, 460
W_PX = p['crestLineW']
ideal = 2.0 / W_PX

cands = [
    ('hForm  (what ships)', hForm),
    ('primary only  cos(SP+bend)', np.cos(SP + bend)),
    ('primary + fine only', (np.cos(SP + bend) + a3 * np.cos(SP * mF3 + bend * 1.7 + 2.6)) / (1 + a3)),
    ('primary + long only', (np.cos(SP + bend) + aL * np.cos(SP * harmL + bend * 0.55 + 1.3)) / (1 + aL)),
]

tiles = []
for label, f in cands:
    s = f[Y0:Y1, X0:X1]
    lvl = 0.40 if 'ships' in label else 0.55
    c = contour(s, lvl, W_PX)
    tt = tortuosity(c) / ideal
    print(f'{label:30s} coverage {(c>0.5).mean()*100:5.2f}%   wander {tt:5.2f}x ideal')
    tiles.append((f'{label}   {tt:.2f}x', s, c))

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
    d.rectangle([0, 0, 330, 26], fill=(0, 0, 0, 220))
    d.text((6, 4), label, fill=(255, 255, 255, 255), font=font)
    sheet.paste(im, ((i % 2) * (Wd + 12), (i // 2) * (H + 12)))
out = os.path.join(ROOT, 'diagnostics', f'path_field_{NAME}.png')
sheet.save(out)
print('wrote', out)
