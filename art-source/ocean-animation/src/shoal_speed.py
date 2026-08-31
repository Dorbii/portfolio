"""Do the crests SLOW DOWN as they shoal?

Physics says they must: c = omega/k, and k rises as depth falls, so a crest
should travel slower in shallow water than in deep. This measures it from two
captures of the same camera a short time apart, by finding the displacement
along the wave direction that best correlates each depth band between them.

Absolute speed depends on the exact interval between the two captures, which
wall-clock settling cannot pin down -- but BOTH bands come from the same pair
of frames, so the RATIO shallow/deep is unaffected by that error, and the
ratio is the physics.

    python shoal_speed.py <early.png> <late.png>
"""
import json, re, sys
import numpy as np
from PIL import Image

DIR = np.array([0.574, 0.819])          # primary train, image axes (y down)


def load(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    L = a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    return L, a[..., 3] > 250, json.load(open(path + '.camera.json'))


early, mE, cam = load(sys.argv[1])
late, mL, _ = load(sys.argv[2])
h, w = early.shape

src = open('features/career-world/layers/ocean/model/generated/worldFields.ts', encoding='utf-8').read()
dmax = float(re.search(r'"depthMax":\s*([0-9.]+)', src).group(1))
tpw = float(re.search(r'OCEAN_TUNED_PER_WORLD = ([0-9.]+)',
      open('features/career-world/layers/ocean/model/generated/oceanStates.ts', encoding='utf-8').read()).group(1))
dep = np.asarray(Image.open('public/career-world/layers/ocean/fields/ocean-phase-r2.png')).astype(np.float32)[..., 3] / 255.0 * dmax * tpw
DH, DW = dep.shape

o, s = cam['origin'], cam['span']
r = cam.get('canvas') or cam['rect']
ys, xs = np.mgrid[0:h, 0:w]
wx = o[0] + (xs - r['x']) / r['width'] * s[0]
wy = o[1] + (ys - r['y']) / r['height'] * s[1]
D = dep[np.clip((wy * DH).astype(int), 0, DH - 1), np.clip((wx * DW).astype(int), 0, DW - 1)]

water = mE & mL
print('%-22s %8s %8s' % ('depth band (tuned px)', 'shift px', 'rel speed'))
res = {}
for tag, lo, hi in (('shallow  <14', 0, 14), ('mid    14-45', 14, 45), ('deep     >70', 70, 1e9)):
    band = water & (D >= lo) & (D < hi)
    if band.sum() < 4000:
        print('%-22s %8s  (only %d px)' % (tag, '--', band.sum())); continue
    best, bestv = 0.0, -2.0
    for k in np.arange(0, 26, 0.5):
        dx, dy = int(round(DIR[0] * k)), int(round(DIR[1] * k))
        a = early[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        b = late[max(0, dy):h - max(0, -dy), max(0, dx):w - max(0, -dx)]
        m = band[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        if m.sum() < 2000: continue
        x, y = a[m], b[m]
        v = float(np.corrcoef(x, y)[0, 1])
        if v > bestv: bestv, best = v, k
    res[tag] = best
    print('%-22s %8.1f %8s   (corr %.3f)' % (tag, best, '', bestv))
if 'shallow  <14' in res and 'deep     >70' in res and res['deep     >70'] > 0:
    print('\nshallow/deep speed ratio: %.2f   (physics wants < 1: crests slow as they shoal)'
          % (res['shallow  <14'] / res['deep     >70']))
