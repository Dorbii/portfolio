"""Foam STRUCTURE, not foam statistics.

Histogram percentiles, mean saturation, foam fraction and blob area are all
first-order: two images with identical values can look nothing alike. The source
plate organises its foam into long ribbons running with the crests, with water
visible between them at every scale; a render can match every histogram and still
be contiguous blobs. This measures the thing that separates them.

  run ratio   mean white run-length ALONG the wave direction / ACROSS it
              (ribbons -> high, blobs -> ~1)
  open frac   fraction of the surf zone that is NOT foam -- water showing through
  gap len     mean run-length of those gaps across the wave direction
"""
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def foam_mask(rgb01):
    L = rgb01 @ LUMA
    mx, mn = rgb01.max(2), rgb01.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    return (L > 0.66) & (sat < 0.28)


def mean_run(mask, ang_deg):
    """Mean run length of True along a direction, by rotating and scanning rows."""
    r = ndi.rotate(mask.astype(np.float32), ang_deg, order=1, reshape=True, cval=0.0) > 0.5
    runs = []
    for row in r[::3]:
        if not row.any():
            continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        starts = np.flatnonzero(d == 1); ends = np.flatnonzero(d == -1)
        runs.append(ends - starts)
    if not runs:
        return 0.0
    allr = np.concatenate(runs)
    return float(allr[allr > 1].mean()) if (allr > 1).any() else 0.0


def report(tag, rgb01, wet, ang):
    f = foam_mask(rgb01) & wet
    along = mean_run(f, -ang)          # rotate so the wave direction is horizontal
    across = mean_run(f, -ang + 90.0)
    gaps = (~f) & wet
    gap_across = mean_run(gaps, -ang + 90.0)
    print(f'{tag:<22} run along {along:6.1f}  across {across:6.1f}  ratio {along/max(across,1e-3):5.2f}'
          f'   open {100*(gaps & wet).sum()/max(wet.sum(),1):5.1f}%   gap width {gap_across:6.1f}')


if __name__ == '__main__':
    wm = np.asarray(Image.open(os.path.join(ROOT, 'masks', 'water_mask.png')).convert('L'),
                    np.float32) / 255 > 0.9
    depth = None
    # the surf zone is where the question is: restrict to water near the shore
    sdf = np.load(os.path.join(ROOT, 'masks', 'shore_sdf.npy'))
    surf = wm & (sdf[:wm.shape[0], :wm.shape[1]] < 90)
    ANG = 55.0   # wave direction, degrees from +x
    print(f'{"":22} (surf zone only, wave direction {ANG:.0f} deg)')
    for tag, path in [('SOURCE PLATE', os.path.join(ROOT, 'refs', 'canonical', 'S.png'))] + \
                     [(f'ours {n.split("_")[0]}', os.path.join(ROOT, 'diagnostics', 'codexref', f'final_{n}.png'))
                      for n in ('heavy_crashing_surf', 'windy_rolling_surf')]:
        a = np.asarray(Image.open(path).convert('RGB'), np.float32) / 255
        h, w = min(a.shape[0], surf.shape[0]), min(a.shape[1], surf.shape[1])
        report(tag, a[:h, :w], surf[:h, :w], ANG)
