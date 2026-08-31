"""Does the SEA belong to the same illustration as the LAND beside it?

The style half of the brief, made measurable. Split a full-page capture into
its water and land regions using the coast authority projected through the
camera, then compare the two as PICTURES:

  gran   granularity: 1-2 px energy / 8-16 px energy. Noise fields are
         top-heavy; drawn art carries its energy at form scale.
  e1..e3 band energy at 1-2, 4-8, 16-32 px
  edge%  fraction of pixels on a strong edge
  ecoh   how COHERENT those edges are (drawn edges run; noise edges scatter)
  sat    mean saturation      val  mean value       lc  local contrast

Usage: python style_match.py <page.png>   (needs <page.png>.camera.json)
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def bands(L, m):
    out = []
    for lo, hi in ((1.0, 2.0), (4.0, 8.0), (16.0, 32.0)):
        b = ndi.gaussian_filter(L, lo) - ndi.gaussian_filter(L, hi)
        out.append(float(b[m].std()))
    return out


def stats(rgb, m, tag):
    L = rgb @ LUMA
    e1, e2, e3 = bands(L, m)
    gy, gx = np.gradient(ndi.gaussian_filter(L, 1.0))
    g = np.hypot(gx, gy)
    thr = float(np.percentile(g[m], 82))
    edge = (g > thr) & m
    w = edge.astype(np.float32)
    Jxx = ndi.gaussian_filter(gx * gx * w, 4.0)
    Jyy = ndi.gaussian_filter(gy * gy * w, 4.0)
    Jxy = ndi.gaussian_filter(gx * gy * w, 4.0)
    ecoh = float(np.mean((np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6))[edge]))
    V = rgb.max(-1)
    sat = float(((V - rgb.min(-1)) / np.maximum(V, 1e-4))[m].mean())
    lc = float((ndi.gaussian_filter(L, 2.0) - ndi.gaussian_filter(L, 16.0))[m].std())
    print('%-6s gran %5.2f  e1 %5.2f e2 %5.2f e3 %5.2f  edge%% %4.1f  ecoh %.3f  '
          'sat %.3f  val %5.1f  lc %5.2f'
          % (tag, e1 / max(e2, 1e-6), e1, e2, e3, 100 * edge[m].mean() / max(m.mean(), 1e-6) * m.mean(),
             ecoh, sat, float(L[m].mean()), lc))


cap = sys.argv[1]
cam = json.load(open(cap + '.camera.json'))
o, s = cam['origin'], cam['span']
r = cam.get('canvas') or cam['rect']
rgb = np.asarray(Image.open(cap).convert('RGB')).astype(np.float32)
land = np.asarray(Image.open(
    'public/career-world/layers/terrain/authority/masks/world-land-mask-r4.png').convert('L'))
LH, LW = land.shape
H, W = rgb.shape[:2]
ys, xs = np.mgrid[0:H, 0:W]
wx = o[0] + (xs - r['x']) / r['width'] * s[0]
wy = o[1] + (ys - r['y']) / r['height'] * s[1]
inside = (wx >= 0) & (wx < 1) & (wy >= 0) & (wy < 1)
li = np.clip((wy * LH).astype(int), 0, LH - 1)
lj = np.clip((wx * LW).astype(int), 0, LW - 1)
isLand = (land[li, lj] >= 128) & inside
isSea = (land[li, lj] < 128) & inside
# stay clear of the coastline itself, which is neither
isLand &= ndi.binary_erosion(isLand, np.ones((9, 9)))
isSea &= ndi.binary_erosion(isSea, np.ones((9, 9)))
print('%s   land %.1f%%  sea %.1f%% of frame' % (cap.split('/')[-1], 100 * isLand.mean(), 100 * isSea.mean()))
stats(rgb, isLand, 'LAND')
stats(rgb, isSea, 'SEA')
