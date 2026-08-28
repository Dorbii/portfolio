"""Zoom crops hunting for generator artifacts that must NOT be reproduced."""
import os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN = os.path.join(ROOT, 'refs', 'canonical')
picks = [('C7 storm foam mass',  'C7', (120, 380, 320, 580)),
         ('C6 lace foam field',  'C6', (110, 700, 310, 900)),
         ('C2 churn field',      'C2', (90, 950, 290, 1150)),
         ('C4 backwash streaks', 'C4', (140, 620, 340, 820)),
         ('C5 swell crest edge', 'C5', (120, 300, 320, 500)),
         ('S  source near-shore','S',  (250, 950, 450, 1150))]
tiles = []
for name, cid, box in picks:
    c = Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB').crop(box).resize((600, 600), Image.NEAREST)
    d = ImageDraw.Draw(c, 'RGBA')
    d.rectangle([0, 0, 600, 26], fill=(0, 0, 0, 180))
    d.text((6, 7), f'{name}   (200px crop @3x nearest)', fill=(255, 255, 255, 255))
    tiles.append(c)
sh = Image.new('RGB', (600 * 3 + 16, 600 * 2 + 8), (16, 16, 20))
for i, t in enumerate(tiles):
    sh.paste(t, ((i % 3) * 608, (i // 3) * 608))
sh.save(os.path.join(ROOT, 'diagnostics', 'artifact_inspection.png'))
print('wrote diagnostics/artifact_inspection.png', sh.size)
