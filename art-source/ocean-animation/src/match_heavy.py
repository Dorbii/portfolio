"""Measure a live capture against the heavy_crashing_surf MVP.

The MVP is the plate scene, which IS this capital coast, so the comparison is
like-for-like in art if not in pixels. Bands are matched on the shoreline
distance in TUNED pixels so the same water is compared on both sides.

    python match_heavy.py <live.png> <camera-span> <centre-u> <centre-v>
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPW = 9.602985
SCRATCH = sys.argv[5] if len(sys.argv) > 5 else '.'


def stats(y, sdf, name):
    row = []
    for lab, m in (('surf', (sdf > 0) & (sdf < 60)), ('shelf', (sdf > 60) & (sdf < 230)),
                   ('deep', sdf > 230)):
        if m.sum() < 2000:
            row.append('    --     '); continue
        v = y[m]
        row.append(f'{v.mean():5.1f}/{v.std():4.1f}/{(v > 170).mean() * 100:5.2f}%')
    w = sdf > 0
    hi = np.sqrt(((y - ndimage.uniform_filter(y, 7)) ** 2)[w].mean()) if w.sum() else 0
    print(f'  {name:<22}' + '  '.join(row) + f'   hi-freq {hi:5.2f}')
    return row


def main():
    live_path, span = sys.argv[1], float(sys.argv[2])
    # The CENTRE of the view, not the wheel anchor. Those are different numbers
    # and mixing them silently compares the wrong water: origin = centre - span/2,
    # while the anchor that produces it is (centre - span/2) / (1 - span).
    cu, cv = float(sys.argv[3]), float(sys.argv[4])
    print('  region                 surf 0-60          shelf 60-230       deep >230')
    # --- the target -------------------------------------------------------
    psdf = np.load(os.path.join(ROOT, 'masks', 'shore_sdf.npy'))
    for t in ('2.0', '5.0', '9.0'):
        f = os.path.join(SCRATCH, f'mvp_heavy_t{t}.png')
        if not os.path.exists(f):
            continue
        im = Image.open(f).convert('RGB').resize((psdf.shape[1], psdf.shape[0]), Image.LANCZOS)
        stats(np.asarray(im).astype(float) @ [0.2126, 0.7152, 0.0722], psdf, f'MVP heavy t={t}')
    # --- the live capture -------------------------------------------------
    im = Image.open(live_path).convert('RGB')
    w = np.load(os.path.join(ROOT, 'scenes', 'world', 'masks', 'shore_sdf.npy'))
    H, W = w.shape
    ox, oy = cu - 0.5 * span, cv - 0.5 * span
    sub = w[int(round(oy * H)):int(round((oy + span) * H)),
            int(round(ox * W)):int(round((ox + span) * W))]
    sub = np.asarray(Image.fromarray(sub).resize(im.size, Image.BILINEAR)) * TPW
    stats(np.asarray(im).astype(float) @ [0.2126, 0.7152, 0.0722], sub,
          os.path.basename(live_path)[:22])


if __name__ == '__main__':
    raise SystemExit(main())
