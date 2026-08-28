"""Render one frame at full resolution and emit 1:1 crops for close review,
side by side with the matching crop of a chosen reference concept."""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DG = os.path.join(ROOT, 'diagnostics')
CAN = os.path.join(ROOT, 'refs', 'canonical')

CROPS = [('open water', (95, 210)), ('mid water', (210, 640)),
         ('shore + stacks', (300, 380)), ('docks + pilings', (330, 980))]
CS = 300


def font(sz, bold=False):
    try:
        return ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', sz)
    except Exception:
        return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preset')
    ap.add_argument('--t', type=float, default=6.0)
    ap.add_argument('--ref', default='C2')
    ap.add_argument('--tag', default='inspect')
    args = ap.parse_args()

    p = presets.PRESETS[args.preset]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub)
    t = -p['preroll']
    first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < args.t:
        r.step(t, dt, False); t += dt
    img = r.composite(t)

    out = os.path.join(DG, f'{args.tag}_{args.preset}_full.png')
    Image.fromarray(img).save(out)

    ref = np.asarray(Image.open(os.path.join(CAN, f'{args.ref}.png')).convert('RGB'))
    tiles = []
    for name, (x, y) in CROPS:
        a = Image.fromarray(img[y:y + CS, x:x + CS]).resize((CS * 2, CS * 2), Image.NEAREST)
        b = Image.fromarray(ref[y:y + CS, x:x + CS]).resize((CS * 2, CS * 2), Image.NEAREST)
        pair = Image.new('RGB', (CS * 4 + 6, CS * 2 + 26), (16, 16, 20))
        pair.paste(a, (0, 26)); pair.paste(b, (CS * 2 + 6, 26))
        d = ImageDraw.Draw(pair)
        d.text((4, 4), f'RENDER  -  {name}', font=font(17, True), fill=(120, 235, 160))
        d.text((CS * 2 + 10, 4), f'REFERENCE {args.ref}  -  {name}', font=font(17, True), fill=(240, 200, 110))
        tiles.append(pair)
    W = tiles[0].size[0]
    sheet = Image.new('RGB', (W, sum(t.size[1] + 8 for t in tiles) + 8), (12, 12, 16))
    y = 4
    for t_ in tiles:
        sheet.paste(t_, (0, y)); y += t_.size[1] + 8
    sheet = sheet.resize((sheet.size[0] // 2, sheet.size[1] // 2), Image.LANCZOS)
    sheet.save(os.path.join(DG, f'{args.tag}_{args.preset}_crops.png'))
    print(f'wrote {out}')
    print(f'wrote diagnostics/{args.tag}_{args.preset}_crops.png {sheet.size}')


if __name__ == '__main__':
    sys.exit(main())
