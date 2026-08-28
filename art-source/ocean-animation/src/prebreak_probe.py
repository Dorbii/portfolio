"""Show the pre-break lifecycle in isolation: no foam, no spray, no lace."""
import os, sys, numpy as np
from PIL import Image, ImageDraw
import matplotlib.cm as cm
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
BOX = tuple(int(v) for v in (sys.argv[2:6] if len(sys.argv) > 5 else (140, 860, 620, 1340)))
VAR = [('full', {}),
       ('no foam/spray', dict(foamThrFresh=9.0, sprayGain=0.0, laceLineGain=0.0)),
       ('pre-break off', dict(foamThrFresh=9.0, sprayGain=0.0, laceLineGain=0.0,
                              preBreak=0.0, faceTeal=0.0, lipGain=0.0))]
x0, y0, x1, y1 = BOX
tiles = []
for tag, ov in VAR:
    p = dict(presets.PRESETS[name]); p.update(ov)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 10.0: r.step(t, dt, False); t += dt
    tiles.append((tag, Image.fromarray(r.composite(t)).crop(BOX)))
    if tag == 'full':
        sw = np.frombuffer(r.fboWave.read(attachment=2, components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)
        for ch, nm, cmap, lo, hi in ((2, 'hnSwell', cm.RdBu, -1, 1), (3, 'break phase', cm.magma, 0, 1)):
            s = sw[y0:y1, x0:x1, ch]
            tiles.append((nm, Image.fromarray((cmap(np.clip((s-lo)/(hi-lo), 0, 1))[..., :3]*255).astype(np.uint8))))
W, H = tiles[0][1].size
sh = Image.new('RGB', (W*3+16, H*2+8), (16, 16, 20))
for i, (tag, im) in enumerate(tiles):
    im = im.convert('RGB'); d = ImageDraw.Draw(im, 'RGBA')
    d.rectangle([0, 0, W, 22], fill=(0, 0, 0, 200)); d.text((5, 4), tag, fill=(255, 255, 255, 255))
    sh.paste(im, ((i % 3)*(W+8), (i//3)*(H+8)))
out = os.path.join(ROOT, 'diagnostics', 'codexref', f'prebreak_{name}.png')
sh.save(out); print('wrote', out)
