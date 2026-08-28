"""The reviewer's acceptance test, made runnable.

"If you temporarily removed all white foam, I should still be able to say, 'that
wave is about to break.'"

Renders with every white contribution disabled -- foam, spray, lace strokes, the
crest line and the lip -- so only the blue pre-break structure remains: the
hollow, the face gradient, the apparent height and the rim. If a wave cannot be
read as about to break in this view, the whitewater is carrying information the
water itself should be carrying.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NO_WHITE = dict(foamMass=0.0, laceLineGain=0.0, sprayGain=0.0, foamThrFresh=9.0,
                crestGain=0.0, crestLineFloor=0.0, lipGain=0.0, chopGlint=0.0,
                openCrest=0.0, rimGain=0.0)

def render(name, ov, t_end=10.0):
    p = dict(presets.PRESETS[name]); p.update(ov)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < t_end: r.step(t, dt, False); t += dt
    return Image.fromarray(r.composite(t))

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
    box = (170, 830, 620, 1210)
    tiles = [('as delivered', render(name, {}).crop(box)),
             ('ALL WHITE REMOVED', render(name, NO_WHITE).crop(box))]
    W, H = tiles[0][1].size
    sh = Image.new('RGB', (W*2+8, H), (16, 16, 20))
    for i, (t, im) in enumerate(tiles):
        im = im.copy(); d = ImageDraw.Draw(im, 'RGBA')
        d.rectangle([0, 0, 176, 20], fill=(0, 0, 0, 215)); d.text((5, 4), t, fill=(255, 255, 255, 255))
        sh.paste(im, (i*(W+8), 0))
    out = os.path.join(ROOT, 'diagnostics', 'codexref', f'nofoam_{name}.png')
    sh.save(out); print('wrote', out)
