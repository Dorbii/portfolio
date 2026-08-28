"""Ablate individual composite terms and score each against the reference crop.

Water-only statistics matter here: the analysis box contains ~19 percent land,
whose rock and tree texture dominates any whole-box high-frequency measure and
masks what the water is actually doing."""
import os, sys, numpy as np
from PIL import Image
import presets, ocean_gl, look_probe as lp
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WMASK = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'), np.float32) / 255.0
name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
VARIANTS = [
    ('all',            {}),
    ('STRIPPED',       dict(foamThrFresh=9.0, crestGain=0.0, crestLineFloor=0.0, lipGain=0.0,
                            faceTeal=0.0, preBreak=0.0, sheen=0.0, specGain=0.0, glitter=0.0,
                            sprayGain=0.0, shadowGain=0.0, posterize=0.0, laceLineGain=0.0,
                            transGain=0.0, swash=0.0)),
    ('+trough only',   dict(foamThrFresh=9.0, crestGain=0.0, crestLineFloor=0.0, lipGain=0.0,
                            faceTeal=0.0, sheen=0.0, specGain=0.0, glitter=0.0,
                            sprayGain=0.0, shadowGain=0.0, posterize=0.0, laceLineGain=0.0,
                            transGain=0.0, swash=0.0)),
    ('+shadow',        dict(foamThrFresh=9.0, crestGain=0.0, crestLineFloor=0.0, lipGain=0.0,
                            faceTeal=0.0, preBreak=0.0, sheen=0.0, specGain=0.0, glitter=0.0,
                            sprayGain=0.0, posterize=0.0, laceLineGain=0.0,
                            transGain=0.0, swash=0.0)),
    ('+lip/face',      dict(foamThrFresh=9.0, crestGain=0.0, crestLineFloor=0.0,
                            sheen=0.0, specGain=0.0, glitter=0.0,
                            sprayGain=0.0, shadowGain=0.0, posterize=0.0, laceLineGain=0.0,
                            transGain=0.0, swash=0.0)),
    ('+sheen/spec',    dict(foamThrFresh=9.0, crestGain=0.0, crestLineFloor=0.0, lipGain=0.0,
                            faceTeal=0.0, preBreak=0.0,
                            sprayGain=0.0, shadowGain=0.0, posterize=0.0, laceLineGain=0.0,
                            transGain=0.0, swash=0.0)),
]
base = presets.PRESETS[name]
print(f'{"":14}' + ' '.join(f'{h:>7}' for h in lp.HDR))
lp.show('REF', lp.stats(np.asarray(Image.open('../diagnostics/codexref/ref_t2.png'
        if os.path.isdir('../diagnostics') else 'diagnostics/codexref/ref_t2.png').convert('RGB').crop(lp.BOX))))
tiles = []
for tag, ov in VARIANTS:
    p = dict(base); p.update(ov)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 10.0: r.step(t, dt, False); t += dt
    img = r.composite(t)
    lp.show(tag, lp.stats(np.asarray(Image.fromarray(img).crop(lp.BOX))))
    x0, y0, x1, y1 = lp.BOX
    wm = WMASK[y0:y1, x0:x1] > 0.9
    a = np.asarray(Image.fromarray(img).crop(lp.BOX), np.float32) / 255.0
    L = a @ lp.LUMA
    from scipy.ndimage import gaussian_filter as gf
    print(f'{"":14}   water-only: micro {(L - gf(L, 3.0))[wm].std():.4f}  '
          f'p50 {np.percentile(L[wm], 50):.4f}  p95 {np.percentile(L[wm], 95):.4f}  '
          f'BmR {(a[..., 2] - a[..., 0])[wm].mean():.4f}')
    tiles.append((tag, Image.fromarray(img).crop((40, 380, 520, 860))))
    r.release() if hasattr(r, 'release') else None
W, H = tiles[0][1].size
sh = Image.new('RGB', (W * 3 + 16, H * 2 + 8), (16, 16, 20))
from PIL import ImageDraw
for i, (tag, im) in enumerate(tiles):
    d = ImageDraw.Draw(im, 'RGBA'); d.rectangle([0, 0, W, 22], fill=(0, 0, 0, 200))
    d.text((5, 4), tag, fill=(255, 255, 255, 255))
    sh.paste(im, ((i % 3) * (W + 8), (i // 3) * (H + 8)))
out = os.path.join(ROOT, 'diagnostics', 'codexref', f'ablate2_{name}.png')
sh.save(out); print('wrote', out)
