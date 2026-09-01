"""What makes foam read as CLOUD rather than as foam, in numbers.

Two viewers unprompted have called the foam "clouds in the water", so the
question is not how MUCH foam there is -- foam% has been in range for a while --
but what SHAPE it is. Three properties separate a cloud from foam, and all three
are measurable on a water-masked canvas capture:

  thick   mean 2*area/perimeter over connected bright components, in px. Foam is
          LACE: filaments and arcs, thin however long they run, so 2A/P stays
          small. A cloud is a BLOB, and 2A/P is its diameter. This is the single
          strongest discriminator and the hardest to fake.
  soft    edge width in px: contrast across a component's boundary divided by
          the gradient there. Sea foam has a torn edge a pixel or two wide; a
          cumulus has a gradient tens of px wide. SoT sharpen exactly this with
          an alpha threshold for their DISTANT clouds, which is what every foam
          patch is at a map camera.
  grey    mean saturation of the bright pixels. Foam carries the water's colour
          through it (aeration is white over teal); cloud is neutral grey.

Run on --canvas-only captures. A page screenshot at the capital camera is
two-thirds city, and the city is bright, grey and blobby.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def stats(path, fixed_thr=None):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    water = alpha > 250
    if water.sum() < 5000:
        return None
    L = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 1e-3, (mx - mn) / np.maximum(mx, 1e-3), 0.0)

    lw = L[water]
    # A RELATIVE threshold cannot compare two builds. With the foam ablated the
    # median and sd both move, so median+1.8sd simply re-thresholds onto the
    # bright teal shallows and reports a 'foam' population that is not foam --
    # which is exactly what it did on the first pass here. Pin it across a
    # comparison set with --thr and the numbers mean the same thing in each.
    thr = float(np.median(lw) + 1.8 * lw.std()) if fixed_thr is None else fixed_thr
    bright = water & (L > thr)
    if bright.sum() < 200:
        return dict(foam=0.0, thick=0.0, soft=0.0, grey=0.0, big=0.0, thr=thr)

    lab, n = ndi.label(bright)
    areas = np.bincount(lab.ravel())[1:].astype(np.float32)
    # perimeter: boundary pixels of each component
    er = ndi.binary_erosion(bright, np.ones((3, 3), bool))
    edge = bright & ~er
    per = np.bincount(lab[edge].ravel(), minlength=n + 1)[1:].astype(np.float32)
    keep = areas >= 12                      # ignore single-pixel sparkle
    thick = float((2.0 * areas[keep] / np.maximum(per[keep], 1.0)).mean()) if keep.any() else 0.0
    # share of foam living in components thicker than 8 px -- the blobs the eye
    # actually calls a cloud, as a fraction of all foam
    if keep.any():
        t_each = 2.0 * areas / np.maximum(per, 1.0)
        big = float(areas[(t_each > 8.0)].sum() / max(areas.sum(), 1.0))
    else:
        big = 0.0

    gy, gx = np.gradient(ndi.gaussian_filter(L, 1.0))
    gmag = np.sqrt(gx * gx + gy * gy)
    contrast = float(L[bright].mean() - np.median(lw))
    gedge = float(gmag[edge].mean()) if edge.any() else 1e-6
    soft = contrast / max(gedge, 1e-6)

    return dict(foam=100.0 * bright.sum() / water.sum(),
                thick=thick, soft=soft, grey=float(sat[bright].mean()),
                big=100.0 * big, thr=thr)


paths = [a for a in sys.argv[1:] if not a.startswith('--thr')]
_thr = [a for a in sys.argv[1:] if a.startswith('--thr')]
FIXED = float(_thr[0].split('=', 1)[1]) if _thr else None

for p in paths:
    s = stats(p, FIXED)
    name = p.replace('\\', '/').split('/')[-1]
    if s is None:
        print('%-26s no water' % name)
        continue
    print('%-26s foam %5.2f%%  thick %5.2f px  soft %5.2f px  grey %.3f  blobby %5.1f%%  thr %.1f'
          % (name, s['foam'], s['thick'], s['soft'], s['grey'], s['big'], s['thr']))
