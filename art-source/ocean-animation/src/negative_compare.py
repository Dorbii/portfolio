"""Negative-filter comparison: offline reference vs live capture, same scene.

Both pictures are the same world at the same wave scale, so they are registered
and a difference is meaningful. Identical pixels come out flat grey; anything
that differs shows as colour, and the amplified panel shows WHERE.

    python negative_compare.py <ref.png> <live.png> [more.png ...]
"""
import os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WS = os.path.join(ROOT, 'scenes', 'world')
OUT = os.path.join(ROOT, 'diagnostics')


def load(path, size):
    im = Image.open(path).convert('RGB')
    if im.size != size:
        im = im.resize(size, Image.LANCZOS)
    return np.asarray(im).astype(np.float64)


def luma(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def local_contrast(y, mask, r=3):
    """RMS of the high-pass -- how much fine structure the picture carries."""
    from scipy import ndimage
    lo = ndimage.uniform_filter(y, size=2 * r + 1)
    return float(np.sqrt((((y - lo) ** 2)[mask]).mean()))


def stats(name, a, mask):
    y = luma(a)
    w = y[mask]
    foam = float((w > 170).mean())
    dark = float((w < 60).mean())
    print(f'  {name:<22} luma {w.mean():6.1f}  sd {w.std():5.1f}  '
          f'range {np.percentile(w,2):5.1f}-{np.percentile(w,98):5.1f}  '
          f'hi-freq {local_contrast(y, mask):5.2f}  white {foam*100:5.2f}%  dark {dark*100:5.2f}%')
    return y


def main():
    ref_path, live_paths = sys.argv[1], sys.argv[2:]
    ref_im = Image.open(ref_path).convert('RGB')
    size = ref_im.size
    ref = np.asarray(ref_im).astype(np.float64)

    water = np.asarray(Image.open(os.path.join(WS, 'masks', 'water_mask.png'))
                       .convert('L').resize(size, Image.NEAREST)) > 127
    sdf = np.load(os.path.join(WS, 'masks', 'shore_sdf.npy'))
    if sdf.shape != (size[1], size[0]):
        sdf = np.asarray(Image.fromarray(sdf).resize(size, Image.BILINEAR))
    surf = water & (sdf < 6.0)
    open_sea = water & (sdf > 20.0)
    print(f'{size[0]}x{size[1]}   water {water.mean()*100:.1f}%   '
          f'surf zone {surf.mean()*100:.1f}%   open sea {open_sea.mean()*100:.1f}%\n')

    for label, m in (('WHOLE OCEAN', water), ('SURF ZONE (sdf<6)', surf),
                     ('OPEN SEA (sdf>20)', open_sea)):
        print(label)
        stats('offline reference', ref, m)
        for p in live_paths:
            stats(os.path.basename(p)[:22], load(p, size), m)
        print()

    for p in live_paths:
        live = load(p, size)
        stem = os.path.splitext(os.path.basename(p))[0]
        neg = np.clip(128.0 + (ref - live) * 0.5, 0, 255)
        neg[~water] = 128
        Image.fromarray(neg.astype(np.uint8)).save(
            os.path.join(OUT, f'negative_{stem}.png'))
        amp = np.clip(128.0 + (ref - live) * 2.0, 0, 255)
        amp[~water] = 128
        Image.fromarray(amp.astype(np.uint8)).save(
            os.path.join(OUT, f'negative_{stem}_x4.png'))
        d = np.abs(luma(ref) - luma(live))
        print(f'{stem:<24} mean |dLuma| {d[water].mean():5.1f}   '
              f'p95 {np.percentile(d[water],95):5.1f}   max {d[water].max():5.1f}')
    print('\nwrote negative_*.png to diagnostics/')


if __name__ == '__main__':
    raise SystemExit(main())
