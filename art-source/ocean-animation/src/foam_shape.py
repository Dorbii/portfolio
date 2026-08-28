"""Foam SHAPE, measured the way the reference actually differs from ours.

Deliberately NOT perimeter/sqrt(area): that statistic is maximised by stipple,
and optimising it once already shredded the render into cellular dots. Second-
moment elongation rewards long thin filaments and penalises BOTH round patches
and dust, which is the distinction that matters here.
"""
import os, sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def foam_mask(rgb01):
    L = rgb01 @ LUMA
    mx, mn = rgb01.max(2), rgb01.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    return (L > 0.66) & (sat < 0.26)


def shape_stats(mask, min_px=40):
    lab, n = ndi.label(mask)
    if n == 0:
        return dict(blobs=0, area_med=0.0, elong_med=0.0, elong_p75=0.0, cover=0.0)
    els, areas = [], []
    for sl, i in zip(ndi.find_objects(lab), range(1, n + 1)):
        sub = lab[sl] == i
        a = int(sub.sum())
        if a < min_px:
            continue
        ys, xs = np.nonzero(sub)
        ys = ys - ys.mean(); xs = xs - xs.mean()
        c = np.array([[(xs * xs).mean(), (xs * ys).mean()], [(xs * ys).mean(), (ys * ys).mean()]])
        w = np.linalg.eigvalsh(c)
        els.append(float(np.sqrt(max(w[1], 1e-6) / max(w[0], 1e-6))))
        areas.append(a)
    if not els:
        return dict(blobs=0, area_med=0.0, elong_med=0.0, elong_p75=0.0, cover=float(mask.mean()))
    return dict(blobs=len(els), area_med=float(np.median(areas)),
                elong_med=float(np.median(els)), elong_p75=float(np.percentile(els, 75)),
                cover=float(mask.mean()))


HDR = ['blobs', 'area_med', 'elong_med', 'elong_p75', 'cover']
def show(tag, s):
    print(f'{tag:<22}' + ' '.join(f'{s[h]:9.2f}' if h != "cover" else f'{s[h]:9.4f}' for h in HDR))


if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
    BOX = (60, 380, 540, 780)
    x0, y0, x1, y1 = BOX
    print(f'{"":22}' + ' '.join(f'{h:>9}' for h in HDR))
    for cid in ('C2', 'C3', 'C7'):
        f = os.path.join(ROOT, 'refs', 'canonical', f'{cid}.png')
        if not os.path.exists(f):
            continue
        a = np.asarray(Image.open(f).convert('RGB'), np.float32) / 255.0
        show(f'library {cid}', shape_stats(foam_mask(a)))

    VARIANTS = [
        ('0 no chop',   dict(chopGlint=0.0)),
        ('1 glint .25', dict(chopGlint=0.25)),
        ('2 glint .42', {}),
        ('3 glint .65', dict(chopGlint=0.65)),
        ('4 .65 lower thr', dict(chopGlint=0.65, chopCrest=0.20)),
        ('5 .90 lower thr', dict(chopGlint=0.90, chopCrest=0.18)),
    ]
    tiles = []
    for tag, ov in VARIANTS:
        p = dict(presets.PRESETS[name]); p.update(ov)
        r = ocean_gl.OceanRenderer(p, verbose=False)
        fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
        for _ in range(int(p['preroll'] * fps * sub)):
            r.step(t, dt, first); first = False; t += dt
        t = 0.0
        while t < 10.0: r.step(t, dt, False); t += dt
        img = r.composite(t)
        crop = img[y0:y1, x0:x1]
        show(tag, shape_stats(foam_mask(crop.astype(np.float32) / 255.0)))
        tiles.append((tag, Image.fromarray(crop)))
    W, H = tiles[0][1].size
    cols = 3; rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (cols*(W+6)-6, rows*(H+6)-6), (16, 16, 20))
    for i, (tag, im) in enumerate(tiles):
        d = ImageDraw.Draw(im, 'RGBA'); d.rectangle([0, 0, 150, 20], fill=(0, 0, 0, 210))
        d.text((5, 4), tag, fill=(255, 255, 255, 255))
        sh.paste(im, ((i % cols)*(W+6), (i//cols)*(H+6)))
    out = os.path.join(ROOT, 'diagnostics', 'codexref', f'foamshape_{name}.png')
    sh.save(out); print('wrote', out)
