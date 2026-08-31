"""Derive the ocean's bake mask from the live authorities. Run before build_plates.

The ocean does not own the coastline, so this file is the one place where the
sea's idea of where water is gets reconciled with everyone else's. It was a
sequence of one-off edits until 2026-08-31, which is how a stale city mask
silently re-flooded ground the owner had ruled must stay land.

Sources, in precedence order:

1. world-land-mask-r4          the coast authority. Water unless something below
                              says otherwise.
2. city_coast_water_mask_r1    inside T70's D05 coast extension only, and LAND
                              WINS FROM EITHER SOURCE there -- this mask predates
                              the terrain lane's coast restoration, so trusting
                              it outright re-floods restored land.
3. the owner-ruled land list   pixels the terrain lane restored as land. These
                              are applied BEFORE the reclaim and the reclaim may
                              take them back: the owner ruled that an ocean
                              ownership claim carries his permission on its own,
                              so ground the sea claims is the sea's. Ruled
                              pixels the reclaim does not want stay land.
4. the wet-shelf reclaim       land at the waterline whose ART IS PAINTED WATER.
                              The land art draws wet rock and painted foam in a
                              strip the ocean then stopped dead against, which
                              the owner reported repeatedly as "a weird shelf the
                              water doesn't go past". Measured on the relief art,
                              cool pixels (B > R) are 18.9% of the coastal strip
                              and 0.1% of inland rock, so B-R separates painted
                              water from cliff almost perfectly. The sea takes
                              those, and only within reach of the sea, so painted
                              water in a courtyard is left to the city.

The result composites over the land art (water canvas z-index 4, land 3) while
structures stay above it at 7, so reclaimed ground reads as sea WITHOUT anyone
editing the land authority or the district art.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(ROOT))
AUTH = os.path.join(REPO, 'public/career-world/layers/terrain/authority/masks/world-land-mask-r4.png')
RELIEF = os.path.join(REPO, 'public/career-world/layers/terrain/authority/textures/terrain-relief-r6.png')
CITY = os.path.join(ROOT, 'scenes/world/city_coast_water_mask_r1.png')
RULED = os.path.join(REPO, '.codex-tmp/qa/COASTFIX/land-vs-oceanbake-conflict.json')
OUT = os.path.join(ROOT, 'scenes/world/authority_coast_water_mask_r2.png')
T70 = (145, 126, 222, 338)          # x0, y0, x1, y1 of the D05 coast extension

land = np.asarray(Image.open(AUTH).convert('L')) >= 128
water = ~land
x0, y0, x1, y1 = T70
city = np.asarray(Image.open(CITY).convert('L')) > 127
water[y0:y1, x0:x1] &= city[y0:y1, x0:x1]
print('authority + city coast: %d water px' % water.sum())

ruled = np.zeros_like(water)
if os.path.exists(RULED):
    px = json.load(open(RULED))['pixels']
    ruled[[p['y'] for p in px], [p['x'] for p in px]] = True
    water &= ~ruled
    print('owner-ruled land honoured: %d px' % ruled.sum())

rel = np.asarray(Image.open(RELIEF).convert('RGBA')).astype(np.float32)
R, B, A = rel[..., 0], rel[..., 2], rel[..., 3]
inland = ndi.distance_transform_edt(land)
shelf = land & (inland <= 10) & (A > 200) & ((B - R) > 0)
shelf = ndi.binary_opening(shelf, np.ones((2, 2)))
shelf &= ndi.binary_dilation(~land, np.ones((3, 3)), iterations=11)   # must reach the sea
water |= shelf

# The D05 dock shelf, reported first and by hand: a band the owner pointed at
# directly. Kept as an explicit footprint because the art rule above catches
# most of it but not the ground between the piers, where the district's own
# paint is warm rather than cool.
h, w = water.shape
band = np.zeros_like(water)
band[int(0.2300 * h):int(0.3260 * h), int(0.0985 * w):int(0.1160 * w)] = True
dock = ndi.binary_dilation(water, np.ones((3, 3)), iterations=7) & band & ~water
water |= dock
print('dock band reclaimed: %d px' % dock.sum())

reclaimed = shelf | dock
kept_land = ruled & ~reclaimed
print('ruled pixels left as land (outside the reclaim): %d' % kept_land.sum())
json.dump({'note': 'ocean reclaim footprint; flip these land->water in world-land-mask-r4 '
                   'to bring the coast authority into agreement with the ocean bake',
           'space': 'world-land-mask-r4 pixel coords, 1672x941',
           'count': int(reclaimed.sum()),
           'pixels': [{'x': int(x), 'y': int(y)} for y, x in zip(*np.nonzero(reclaimed))]},
          open(os.path.join(ROOT, 'scenes/world/ocean_reclaim_footprint.json'), 'w'), indent=1)
print('wrote scenes/world/ocean_reclaim_footprint.json')
print('wet shelf reclaimed: %d px in %d patches' % (shelf.sum(), ndi.label(shelf)[1]))
print('final water: %d px (%.2f%%)' % (water.sum(), 100 * water.mean()))
Image.fromarray((water * 255).astype(np.uint8)).save(OUT)
print('wrote', os.path.relpath(OUT, REPO))
