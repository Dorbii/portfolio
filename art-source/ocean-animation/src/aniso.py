"""How many directions does this sea have?

The owner keeps calling the water fabric, and at coastal zoom the reason is
plain: the whole surface is one set of near-parallel crests running corner to
corner. wave.frag already says why that happens -- "a narrowband sea is regular
by construction: it makes repeating bands rather than a population of separate
wave forms, and no amount of foam or shading work can fix a spectrum" -- so the
question is whether the spread the preset asks for reaches the picture.

Angle is the right measurement because it is scale-free: a reference plate and a
live capture at different zooms can be compared directly, where a wavelength in
pixels cannot.

  anisotropy   peak of the directional energy histogram over its mean. 1.0 is a
               sea with no preferred direction; the higher it goes the more the
               energy is one train.
  spread       angular half-width at half maximum, degrees. This is the number
               that reads as corduroy: a real wind sea runs 30-45, and a single
               plane wave runs near zero.
  bimodality   second-highest peak at least 40 deg off the first, over the
               first. Real coastal seas usually carry a swell and a local wind
               sea from different quarters.

    python aniso.py <image> [more images...] [--mask-blue]
"""
import sys

import numpy as np
from PIL import Image


def directional(gray, water, win=128, step=64, min_cov=0.90):
    h, w = gray.shape
    w1 = np.hanning(win)
    w2d = np.outer(w1, w1)
    acc, used = None, 0
    for y in range(0, h - win + 1, step):
        for x in range(0, w - win + 1, step):
            sub = water[y:y + win, x:x + win]
            if sub.mean() < min_cov:
                continue
            p = gray[y:y + win, x:x + win].astype(np.float64)
            p = p - p.mean()
            F = np.fft.fftshift(np.abs(np.fft.fft2(p * w2d)) ** 2)
            acc = F if acc is None else acc + F
            used += 1
    if used == 0:
        return None
    F = acc / used
    c = win // 2
    fy, fx = np.mgrid[-c:win - c, -c:win - c]
    r = np.hypot(fy, fx)
    band = (r >= 2.0) & (r <= 40)
    Fb = np.where(band, F, 0.0)
    ang = (np.degrees(np.arctan2(fy, fx)) % 180.0)
    ai = np.clip(ang.astype(int), 0, 179)
    hist = np.bincount(ai.ravel(), weights=Fb.ravel(), minlength=180)
    k = np.ones(11) / 11.
    hs = np.convolve(np.r_[hist, hist, hist], k, 'same')[180:360]

    peak = int(hs.argmax())
    aniso = float(hs.max() / (hs.mean() + 1e-30))
    # half-width at half maximum, walking out from the peak over the floor
    floor = float(np.percentile(hs, 10))
    half = floor + 0.5 * (hs.max() - floor)
    width = 0
    while width < 90 and hs[(peak + width + 1) % 180] > half:
        width += 1
    back = 0
    while back < 90 and hs[(peak - back - 1) % 180] > half:
        back += 1
    hwhm = 0.5 * (width + back)
    # a second train at least 40 deg away
    off = np.abs(((np.arange(180) - peak + 90) % 180) - 90) >= 40
    second = float(hs[off].max()) if off.any() else 0.0
    return dict(windows=used, peak_deg=peak, anisotropy=round(aniso, 2),
                spread_hwhm_deg=round(hwhm, 1),
                bimodality=round(second / (hs.max() + 1e-30), 3))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    mask_blue = '--mask-blue' in sys.argv
    print('%-34s %8s %7s %8s %10s %8s' % ('', 'windows', 'peak', 'aniso',
                                          'spread', 'bimodal'))
    print('%-34s %8s %7s %8s %10s %8s' % ('', '', 'deg', '(1=none)',
                                          'HWHM deg', ''))
    for path in args:
        im = Image.open(path).convert('RGBA')
        a = np.asarray(im).astype(np.float64)
        rgb, alpha = a[..., :3], a[..., 3]
        gray = rgb @ np.array([.299, .587, .114])
        water = alpha > 250
        if mask_blue:
            water &= (rgb[..., 2] > rgb[..., 0] + 8)
        s = directional(gray, water)
        name = path.replace(chr(92), '/').split('/')[-1]
        if s is None:
            print('%-34s (no window is %d%% water)' % (name, 90))
            continue
        print('%-34s %8d %7d %8.2f %10.1f %8.3f'
              % (name, s['windows'], s['peak_deg'], s['anisotropy'],
                 s['spread_hwhm_deg'], s['bimodality']))


if __name__ == '__main__':
    main()
