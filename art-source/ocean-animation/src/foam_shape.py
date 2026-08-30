"""Is the whitewater a FILAMENT or a STIPPLE?

Every statistic this program has used -- luma contrast, orientation coherence,
whitewater fraction, per-band brightness, frame-to-frame motion -- says the live
water and the reference clip are the same treatment. The owner keeps saying it
reads as paint. Looking at the two at matched tuned-pixel density shows why, and
it is a thing none of those measure: the reference's foam is long sinuous streaks
running along the crests, and ours is scattered granular dots.

A stipple and a streak can have identical coverage, identical brightness,
identical contrast and identical motion. What separates them is SHAPE, and shape
is what the eye is reading when it says "paint".

Three numbers, on the connected components of thresholded foam:

  elongation   perimeter / sqrt(area), per component, area-weighted.
               A disc is 3.54. The reference art was measured at 8.3-9.6.
  reach        the longest component's major axis, in tuned px. A filament runs
               for wavelengths; a dot does not run at all.
  fragments    components per 1000 px of foam. Stipple is many, streaks are few.

    python foam_shape.py <a.png> <b.png> [--zc-a 0.87] [--zc-b 1.0]

zc rescales each image to one tuned pixel per pixel first, so a streak measured
in one is measured in the same units in the other.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FOAM_LUMA = 165.0        # what reads as whitewater rather than lit water
MIN_AREA = 12            # below this a component is a speckle of the threshold


def load(path, zc):
    """One tuned pixel per pixel, and only pixels that actually composite.

    The water shader writes its colour over the WHOLE frame and puts coverage in
    alpha, so an RGBA capture of the canvas carries bright surf over land that is
    never composited. Measuring that as foam counts water the screen never shows
    -- which is how a canvas capture came out at 7.35% coverage against the same
    frame's 1.38% on the page, and sent an afternoon after a compositing bug that
    was an alpha channel being thrown away by convert('RGB').
    """
    im = Image.open(path)
    alpha = None
    if im.mode in ('RGBA', 'LA'):
        alpha = np.asarray(im.getchannel('A')).astype(np.float32)
    im = im.convert('RGB')
    if abs(zc - 1.0) > 1e-6:
        size = (max(1, int(im.width / zc)), max(1, int(im.height / zc)))
        im = im.resize(size, Image.LANCZOS)
        if alpha is not None:
            alpha = np.asarray(Image.fromarray(alpha.astype(np.uint8))
                               .resize(size, Image.LANCZOS)).astype(np.float32)
    a = np.asarray(im).astype(np.float32)
    if alpha is not None:
        # Transparent pixels are not part of the picture.
        a = a.copy()
        a[alpha < 250] = 0.0
    return a


def shape_stats(a):
    lum = a @ np.array([.299, .587, .114])
    water = (a[:, :, 2] > a[:, :, 1] - 20)      # not land; foam is neutral-blue
    foam = (lum > FOAM_LUMA) & water
    if foam.sum() < 200:
        return None
    lab, n = ndi.label(foam)
    if n == 0:
        return None
    areas = ndi.sum(foam, lab, range(1, n + 1))
    keep = np.where(areas >= MIN_AREA)[0] + 1
    if keep.size == 0:
        return None

    # Perimeter by counting boundary pixels of each component.
    edge = foam & ~ndi.binary_erosion(foam, np.ones((3, 3)))
    per = ndi.sum(edge, lab, keep)
    ar = ndi.sum(foam, lab, keep)
    elong = per / np.sqrt(np.maximum(ar, 1.0))

    # Major axis of the largest few, via the component's own coordinate spread.
    objs = ndi.find_objects(lab)
    reach = []
    for i in keep[np.argsort(ar)[::-1][:25]]:
        sl = objs[i - 1]
        m = lab[sl] == i
        ys, xs = np.nonzero(m)
        if xs.size < 8:
            continue
        p = np.stack([xs - xs.mean(), ys - ys.mean()])
        # 2*sqrt(largest eigenvalue of the covariance) is the major axis
        ev = np.linalg.eigvalsh(np.cov(p))
        reach.append(4.0 * np.sqrt(max(ev[-1], 0.0)))

    return {
        'coverage': 100.0 * foam.mean(),
        'elongation': float(np.average(elong, weights=ar)),
        'reach': float(np.mean(sorted(reach)[-8:])) if reach else 0.0,
        'fragments': 1000.0 * keep.size / max(ar.sum(), 1.0),
        'components': int(keep.size),
    }


def main():
    argv = sys.argv[1:]
    args, opts, i = [], {}, 0
    while i < len(argv):
        if argv[i].startswith('--'):
            opts[argv[i][2:]] = float(argv[i + 1])
            i += 2
        else:
            args.append(argv[i])
            i += 1
    print('%-34s %9s %11s %9s %11s' % ('', 'coverage', 'elongation', 'reach',
                                       'fragments'))
    print('%-34s %9s %11s %9s %11s' % ('', '%', '(disc=3.5)', 'tuned px',
                                       'per 1k px'))
    for i, path in enumerate(args):
        zc = opts.get('zc-a' if i == 0 else 'zc-b', 1.0)
        s = shape_stats(load(path, zc))
        name = path.replace('\\', '/').split('/')[-1]
        if s is None:
            print('%-34s (no foam above threshold)' % name)
            continue
        print('%-34s %8.2f%% %11.2f %9.1f %11.2f   (%d components)'
              % (name, s['coverage'], s['elongation'], s['reach'],
                 s['fragments'], s['components']))


if __name__ == '__main__':
    main()
