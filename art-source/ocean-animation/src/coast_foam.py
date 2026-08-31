"""How much white sits in the coastal band, and how far out it reaches.

"Heavy foam on the coast" is a claim about a spatial distribution, and the
whole-frame foam figure cannot see it: a thin bright collar and a wide soft
surf zone can carry the same total. This bins foam by distance from the
coastline, in screen pixels, so a fix that thins the collar is visible as a
fall in the 0-15 px bin.
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

LAND = 'public/career-world/layers/terrain/authority/masks/world-land-mask-r4.png'

for path in sys.argv[1:]:
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    cam = json.load(open(path + '.camera.json'))
    o, s = cam['origin'], cam['span']
    r = cam.get('canvas') or cam['rect']
    land = np.asarray(Image.open(LAND).convert('L'))
    LH, LW = land.shape
    h, w = rgb.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    wx = o[0] + (xs - r['x']) / r['width'] * s[0]
    wy = o[1] + (ys - r['y']) / r['height'] * s[1]
    isLand = land[np.clip((wy * LH).astype(int), 0, LH - 1),
                  np.clip((wx * LW).astype(int), 0, LW - 1)] >= 128
    dist = ndi.distance_transform_edt(~isLand)      # screen px from the coast
    L = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    mx, mn = rgb.max(2), rgb.min(2)
    foam = (L > 170) & ((mx - mn) / np.maximum(mx, 1e-4) < 0.30) & ~isLand
    out = []
    for lo, hi in ((0, 15), (15, 40), (40, 100), (100, 1e9)):
        band = (~isLand) & (dist >= lo) & (dist < hi)
        out.append(100.0 * (foam & band).sum() / max(band.sum(), 1))
    print('%-22s foam%%  0-15px %5.1f | 15-40 %5.1f | 40-100 %5.1f | open %4.1f'
          % (path.split('/')[-1], *out))
