"""How PEAKED the sea's spectrum is -- the number that tracks the fabric read.

Band-coherence does not measure fabric. Proved on this camera: with the open
wave field zeroed the sea shows NO stripes at all, just flat mottle, and still
reads coherence 0.327 against the striped build's 0.376. The structure tensor
finds local orientation in mottle as happily as in corduroy, so 0.05 separates
"obvious fabric" from "none" while a tuning knob moves it 0.02. It is the wrong
instrument for this defect.

What the eye calls fabric is a SHARP, ISOLATED PEAK in the 2D spectrum: one
wavelength, one direction, repeated across the whole frame. A real sea has the
same peak SMEARED -- in angle by directional spreading, in wavelength by the
frequency band. That is not an analogy, it is the actual difference between a
delta function and an ocean wave spectrum, so measure it directly:

  peak    peak power / median power in the swell band. A pure grating is huge;
          broadband texture approaches 1. THE fabric number.
  angdeg  angular width of the peak in degrees (power-weighted circular sd
          across the ring at the peak wavelength). Narrow = corduroy.
  lamspr  radial spread: the peak's width in wavelength as a fraction of the
          peak wavelength. Narrow = every wave the same size.
  lampk   the peak wavelength itself, in screen px, for reference.

Measured inside the largest ALL-WATER box so the coastline's own edge cannot
contribute, Hann-windowed so the box edges cannot either.
"""
import sys
import numpy as np
from PIL import Image


def largest_water_box(water, size):
    """Greedy search for an all-water box of the requested size."""
    h, w = water.shape
    best, bx, by = -1.0, None, None
    step = max(8, size // 24)
    for y in range(0, h - size + 1, step):
        for x in range(0, w - size + 1, step):
            f = water[y:y + size, x:x + size].mean()
            if f > best:
                best, bx, by = f, x, y
            if best >= 1.0:
                return bx, by, best
    return bx, by, best


def stats(path, size=768, lam_lo=50.0, lam_hi=220.0):
    # The band matters. Opened to 400 px the peak lands at 343 px, which is not
    # a wave at all -- it is the frame's own brightness gradient, and it swamps
    # everything: fabric and flat mottle then score the same peak. 50-220 px is
    # where this camera's swell, secondary and chop actually live.
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    water = a[..., 3] > 250
    if water.sum() < size * size:
        return None
    x, y, frac = largest_water_box(water, size)
    if x is None or frac < 0.985:
        return None
    L = (a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32))[y:y + size, x:x + size]

    win = np.outer(np.hanning(size), np.hanning(size))
    F = np.fft.fftshift(np.abs(np.fft.fft2((L - L.mean()) * win)) ** 2)

    c = size // 2
    yy, xx = np.mgrid[0:size, 0:size]
    fy, fx = yy - c, xx - c
    r = np.sqrt(fx * fx + fy * fy)
    with np.errstate(divide='ignore'):
        lam = np.where(r > 0, size / np.maximum(r, 1e-6), np.inf)
    band = (lam >= lam_lo) & (lam <= lam_hi)

    P = F.copy()
    P[~band] = 0.0
    idx = np.unravel_index(np.argmax(P), P.shape)
    lampk = float(lam[idx])
    peak = float(F[idx] / max(np.median(F[band]), 1e-9))

    # angular width on the ring at the peak wavelength
    ring = band & (np.abs(lam - lampk) < 0.18 * lampk)
    th = np.arctan2(fy[ring], fx[ring]) * 2.0          # orientation is mod 180
    wgt = F[ring]
    if wgt.sum() <= 0:
        return None
    C = float((wgt * np.cos(th)).sum() / wgt.sum())
    S = float((wgt * np.sin(th)).sum() / wgt.sum())
    R = min(1.0, np.sqrt(C * C + S * S))
    angdeg = float(np.degrees(np.sqrt(max(-2.0 * np.log(max(R, 1e-9)), 0.0))) / 2.0)

    # radial spread: power-weighted sd of wavelength within the same direction wedge
    thpk = np.arctan2(fy[idx], fx[idx]) * 2.0
    dth = np.angle(np.exp(1j * (np.arctan2(fy, fx) * 2.0 - thpk)))
    wedge = band & (np.abs(dth) < np.radians(50.0))
    wl, ww = lam[wedge], F[wedge]
    mu = float((ww * wl).sum() / max(ww.sum(), 1e-9))
    sd = float(np.sqrt((ww * (wl - mu) ** 2).sum() / max(ww.sum(), 1e-9)))
    return dict(peak=peak, angdeg=angdeg, lamspr=sd / max(mu, 1e-6), lampk=lampk,
                box=(x, y), frac=frac)


for p in sys.argv[1:]:
    s = stats(p)
    name = p.replace('\\', '/').split('/')[-1]
    if s is None:
        print('%-26s no all-water box' % name)
        continue
    print('%-26s peak %7.1f   angdeg %5.1f   lamspr %.3f   lampk %6.1f px'
          % (name, s['peak'], s['angdeg'], s['lamspr'], s['lampk']))
