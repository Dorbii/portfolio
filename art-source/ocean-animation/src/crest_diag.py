"""Crop open-water patches, overlay the measured crest direction, and tile them
so the spectral measurement can be verified by eye."""
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN, DIAG = os.path.join(ROOT, 'refs', 'canonical'), os.path.join(ROOT, 'diagnostics')
M = json.load(open(os.path.join(DIAG, 'reference_measurements.json')))
IDS = ['S'] + [f'C{i}' for i in range(1, 9)]
# open-water crop box chosen inside the ocean band, away from the coast
BOX = (95, 240, 95 + 300, 240 + 300)
tiles = []
for cid in IDS:
    im = Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB').crop(BOX).resize((420, 420), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA')
    sp = M[cid].get('spectrum')
    if sp:
        a = np.radians(sp['crest_line_deg'])
        dx, dy = np.cos(a), np.sin(a)
        for off in (-150, -75, 0, 75, 150):
            cx, cy = 210 - dy * off, 210 + dx * off
            d.line([(cx - dx * 190, cy - dy * 190), (cx + dx * 190, cy + dy * 190)], fill=(255, 60, 60, 190), width=3)
        pa = np.radians(sp['propagation_deg'])
        d.line([(210, 210), (210 + np.cos(pa) * 120, 210 + np.sin(pa) * 120)], fill=(255, 235, 40, 255), width=6)
        d.ellipse([210 + np.cos(pa) * 120 - 9, 210 + np.sin(pa) * 120 - 9,
                   210 + np.cos(pa) * 120 + 9, 210 + np.sin(pa) * 120 + 9], fill=(255, 235, 40, 255))
        txt = f"{cid}  crest {sp['crest_line_deg']:.0f}deg  lam {sp['wavelength_px']:.0f}px  aniso {sp['anisotropy']:.1f}"
    else:
        txt = f"{cid}  (no spectrum)"
    d.rectangle([0, 0, 420, 26], fill=(0, 0, 0, 170))
    d.text((6, 6), txt, fill=(255, 255, 255, 255))
    tiles.append(im)
sheet = Image.new('RGB', (420 * 3 + 16, 420 * 3 + 16), (18, 18, 22))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % 3) * (420 + 8), (i // 3) * (420 + 8)))
sheet.save(os.path.join(DIAG, 'crest_orientation_check.png'))
print('wrote diagnostics/crest_orientation_check.png', sheet.size)
