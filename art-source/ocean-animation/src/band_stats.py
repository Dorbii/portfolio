"""Band statistics for a live capture, using the camera it ACTUALLY rendered.

Reads <capture>.camera.json rather than trusting a requested span. Asking the
zoom loop for 0.05 and getting 0.0825 silently crops 65% too small a region,
which put a third of the city inside the "water" mask and made every number
downstream a measurement of the wrong pixels.

    python band_stats.py <capture.png> [more.png ...]
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPW = 9.602985


def bands(name, y, sdf):
    row = []
    for lab, m in (('surf', (sdf > 0) & (sdf < 60)), ('shelf', (sdf > 60) & (sdf < 230)),
                   ('deep', sdf > 230)):
        if m.sum() < 2000:
            row.append('    --     '); continue
        v = y[m]
        row.append(f'{v.mean():5.1f}/{v.std():4.1f}/{(v > 170).mean() * 100:5.2f}%')
    w = sdf > 0
    hi = np.sqrt(((y - ndimage.uniform_filter(y, 7)) ** 2)[w].mean()) if w.sum() else 0
    print(f'  {name:<30}' + '  '.join(row) + f'  hi-freq {hi:5.2f}')


def main():
    world = np.load(os.path.join(ROOT, 'scenes', 'world', 'masks', 'shore_sdf.npy'))
    H, W = world.shape
    print('  region                        surf 0-60          shelf 60-230       deep >230')
    for path in sys.argv[1:]:
        meta_path = path + '.camera.json'
        if not os.path.exists(meta_path):
            print(f'  {os.path.basename(path):<30} NO CAMERA SIDECAR -- cannot place the mask')
            continue
        meta = json.load(open(meta_path, encoding='utf-8'))
        ox, oy = meta['origin']
        sx, sy = meta['span']
        im = Image.open(path).convert('RGB')
        sub = world[int(round(oy * H)):int(round((oy + sy) * H)),
                    int(round(ox * W)):int(round((ox + sx) * W))]
        sub = np.asarray(Image.fromarray(sub).resize(im.size, Image.BILINEAR)) * TPW
        y = np.asarray(im).astype(float) @ [0.2126, 0.7152, 0.0722]
        # A registration check that can FAIL, printed every time.
        a = np.asarray(im).astype(float)
        looks_water = (a[..., 2] > a[..., 0] + 18) & (a[..., 2] > 60)
        agree = np.mean((sub > 0) == looks_water) * 100
        tag = '' if agree > 88 else f'   <-- MASK/ART AGREE ONLY {agree:.0f}%, SUSPECT'
        bands(f'{os.path.basename(path)[:24]} (span {sx:.4f})', y, sub)
        if tag:
            print(tag)


if __name__ == '__main__':
    raise SystemExit(main())
