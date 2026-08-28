"""Which layer paints the open-water speckle?

Grid comparison at cell scale: the reference's open water is smooth dark blue with
hair-fine aligned filaments at LOW contrast. Ours is high-contrast grey/white
mottle. Global statistics hid this -- our std is 0.78 of the reference's, because
the reference gets its range from broad wave-scale tone while ours comes from
pixel speckle. Same spread, opposite arrangement.

Ablate one contributor at a time over an open-water cell and see which removal
takes the speckle with it.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = 'windy_rolling_surf'
BOX = (64, 1010, 320, 1266)          # open water, one of the worst-scoring cells

CASES = [
    ('as is',            {}),
    ('foam off',         dict(foamMass=0.0, foamThrFresh=9.0, laceLineGain=0.0)),
    ('fine relief off',  dict(fineGain=0.0, fineShade=0.0, fineGloss=0.0)),
    ('chop off',         dict(chopGlint=0.0, chopCrest=9.0, chopShade=0.0)),
    ('glitter/hue off',  dict(glitter=0.0, hueVary=0.0)),
    ('detail waves off', dict(detailShade=0.0, detailSky=0.0, detailGloss=0.0,
                              detailTrough=0.0, openCrest=0.0)),
]


def contrast(rgb):
    """Local contrast: std of luma in a 5px window, averaged. Speckle is high."""
    from scipy.ndimage import uniform_filter
    y = (rgb.astype(np.float64) / 255.0) @ np.array([0.299, 0.587, 0.114])
    m = uniform_filter(y, 5)
    return float(np.sqrt(np.maximum(uniform_filter(y * y, 5) - m * m, 0)).mean())


def render(ov):
    p = dict(presets.PRESETS[NAME]); p.update(ov)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    return np.asarray(Image.fromarray(r.composite(t)).crop(BOX))


ref = np.asarray(Image.open(os.path.join(ROOT, 'refs', 'canonical', 'S.png'))
                 .convert('RGB').crop(BOX))
print(f'{"reference":20s} local contrast {contrast(ref):.4f}')
tiles = [('reference', ref)]
for label, ov in CASES:
    a = render(ov)
    print(f'{label:20s} local contrast {contrast(a):.4f}')
    tiles.append((label, a))

W = BOX[2] - BOX[0]
try:
    font = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 16)
except Exception:
    font = ImageFont.load_default()
cols = 4
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols + 8 * (cols - 1), W * rows + 8 * (rows - 1)), (10, 12, 16))
for i, (label, a) in enumerate(tiles):
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im, 'RGBA')
    d.rectangle([0, 0, 150, 24], fill=(0, 0, 0, 220))
    d.text((5, 4), label, fill=(255, 255, 255, 255), font=font)
    sheet.paste(im, ((i % cols) * (W + 8), (i // cols) * (W + 8)))
out = os.path.join(ROOT, 'diagnostics', 'speckle_ablation.png')
sheet.save(out)
print('wrote', out)
