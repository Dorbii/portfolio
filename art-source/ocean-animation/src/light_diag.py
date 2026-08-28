"""Crop land detail from the source so the sun azimuth can be read directly."""
import os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(ROOT, 'refs', 'canonical', 'S.png')).convert('RGB')
crops = [('rocky headland', (300, 260, 620, 580)),
         ('village + trees', (520, 640, 840, 960)),
         ('docks + sea stacks', (330, 900, 650, 1220)),
         ('brick keep', (820, 480, 1075, 800))]
tiles = []
for name, box in crops:
    c = im.crop(box).resize((480, 480), Image.LANCZOS)
    d = ImageDraw.Draw(c, 'RGBA')
    d.rectangle([0, 0, 480, 24], fill=(0, 0, 0, 170))
    d.text((6, 6), name, fill=(255, 255, 255, 255))
    tiles.append(c)
sh = Image.new('RGB', (480 * 2 + 8, 480 * 2 + 8), (16, 16, 20))
for i, t in enumerate(tiles):
    sh.paste(t, ((i % 2) * 488, (i // 2) * 488))
sh.save(os.path.join(ROOT, 'diagnostics', 'light_direction_crops.png'))
print('wrote diagnostics/light_direction_crops.png')
