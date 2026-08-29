"""Per-scene fields the GPU passes need, computed once and cached.

  * shoaling amplitude per wave family (Green's law from the solved wavenumber)
  * ray-convergence focusing, so headlands get hit harder than bays
  * a discrete impact-site map, so whitewater bursts happen at *places* rather
    than along a uniform outline
  * a tileable fbm noise texture
"""
import os
import numpy as np
from scipy import ndimage as ndi

import wavefield as wf

# OCEAN_ROOT lets a study (e.g. the closeup concept) run the whole pipeline
# against a different workspace without forking any of it.
ROOT = os.environ.get('OCEAN_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, 'work')
os.makedirs(WORK, exist_ok=True)


def group_velocity(k, depth, omega):
    kd = np.clip(k * depth, 1e-4, 30.0)
    n = 0.5 * (1.0 + 2.0 * kd / np.sinh(2.0 * kd))
    return n * omega / np.maximum(k, 1e-8)


# ---------------------------------------------------------------------------
# TUNED pixels, not scene pixels.
#
# Every hardcoded length below was measured on the plate, where one scene pixel
# WAS one tuned pixel and the swell spanned 115 of them. The world is baked at
# twelve world pixels a wave, so the same numbers there mean something 9.6x
# larger relative to the waves they shape: ray_focus's 9 px smoothing became
# three quarters of a wavelength, and since focus MULTIPLIES the primary
# amplitude the sea came out modulated by blobs the size of its own waves. That
# is a picture that reads as paint rather than water, and no amount of shader
# work downstream can undo it -- the blobs are baked into the field.
#
# So the constants are written in tuned pixels and converted here. On the plate
# the factor is exactly 1 and nothing changes.
def _px(tuned):
    """A tuned-pixel length in this scene's own pixels."""
    return tuned * wf.G / 130.0


def _win(tuned):
    """The same, as a whole number of pixels for a window half-width."""
    return max(1, int(round(_px(tuned))))


def shoaling_amp(k, depth, period, water, focus_gain=0.55):
    omega = 2.0 * np.pi / period
    k0 = omega * omega / wf.G
    cg = group_velocity(k, depth, omega)
    cg0 = 0.5 * omega / k0
    Ks = np.sqrt(np.maximum(cg0, 1e-8) / np.maximum(cg, 1e-8))
    return np.clip(Ks, 0.35, 3.4).astype(np.float32)


def ray_focus(direction_field, water, gain=0.55):
    """Convergence of the ray direction field: >0 where rays crowd together."""
    dx = direction_field[..., 0]
    dy = direction_field[..., 1]
    div = np.gradient(dx, axis=1) + np.gradient(dy, axis=0)
    conv = -ndi.gaussian_filter(div, _px(9.0))
    s = np.percentile(np.abs(conv[water]), 97) + 1e-9
    f = np.exp(np.clip(conv / s, -1.4, 1.8) * gain)
    return np.clip(f, 0.45, 2.4).astype(np.float32)


def impact_sites(sdf, water, dirP, n_sites=54, sigma=13.0, seed=7):
    """Discrete, exposure-weighted burst sites along the coastline."""
    H, W = sdf.shape
    # Site COUNT is a density along the coast, so it scales the other way:
    # the world's shoreline is 9.6x longer in wavelengths than the plate's.
    n_sites = max(1, int(round(n_sites / max(wf.G / 130.0, 1e-6))))
    sigma = _px(sigma)
    gy, gx = np.gradient(ndi.gaussian_filter(sdf, _px(3.0)))
    mag = np.hypot(gx, gy) + 1e-6
    nx, ny = gx / mag, gy / mag                    # shore normal, points seaward

    exposure = np.clip(-(nx * dirP[0] + ny * dirP[1]), 0.0, 1.0)

    # protruding rock: negative Laplacian of the SDF
    lap = ndi.laplace(ndi.gaussian_filter(sdf, _px(6.0)))
    protrude = np.clip(-lap, 0.0, None)
    protrude /= (np.percentile(protrude[water], 99.5) + 1e-9)

    band = (sdf > _px(0.5)) & (sdf < _px(16.0)) & water
    score = exposure * (0.35 + 0.95 * np.clip(protrude, 0, 2.0))
    score = ndi.gaussian_filter(np.where(band, score, 0.0), _px(5.0))
    score[~band] = 0.0

    # greedy non-maximum suppression -> well separated sites
    rng = np.random.default_rng(seed)
    s = score.copy()
    ys, xs, ws = [], [], []
    for _ in range(n_sites):
        i = int(np.argmax(s))
        y, x = divmod(i, W)
        if s[y, x] <= 1e-6:
            break
        ys.append(y); xs.append(x); ws.append(float(score[y, x]))
        r, sep = _win(60.0), _px(34.0)
        yy, xx = np.ogrid[max(0, y - r):min(H, y + r + 1), max(0, x - r):min(W, x + r + 1)]
        d2 = (yy - y) ** 2 + (xx - x) ** 2
        s[max(0, y - r):min(H, y + r + 1), max(0, x - r):min(W, x + r + 1)] *= np.clip(d2 / (sep ** 2), 0.0, 1.0)

    ws = np.array(ws) if ws else np.array([1.0])
    ws = ws / (ws.max() + 1e-9)
    m = np.zeros((H, W), np.float32)
    for y, x, w in zip(ys, xs, ws):
        # per-site strength jitter so the coast never fires uniformly
        w = float(w) * (0.45 + 0.75 * rng.random())
        gw = _win(46.0)
        y0, y1 = max(0, y - gw), min(H, y + gw + 1)
        x0, x1 = max(0, x - gw), min(W, x + gw + 1)
        yy, xx = np.ogrid[y0:y1, x0:x1]
        g = np.exp(-((yy - y) ** 2 + (xx - x) ** 2) / (2 * sigma * sigma))
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], (g * w).astype(np.float32))
    print(f'   impact sites placed: {len(ys)}')
    return np.clip(m, 0, 1), list(zip(xs, ys, ws.tolist()))


def tileable_fbm(size=512, seed=11):
    """Periodic multi-scale noise via spectral shaping; RGBA, each channel
    independent, all exactly tileable so GL_REPEAT never seams."""
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.fftfreq(size)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1e-6
    out = np.zeros((size, size, 4), np.float32)
    betas = [2.25, 2.05, 1.85, 2.45]
    for c in range(4):
        w = rng.normal(size=(size, size))
        F = np.fft.fft2(w) * (r ** (-betas[c] / 2.0))
        F[0, 0] = 0
        a = np.real(np.fft.ifft2(F))
        a = (a - a.mean()) / (a.std() + 1e-9)
        a = 0.5 + 0.5 * np.tanh(a * 0.62)
        out[..., c] = a.astype(np.float32)
    return out


def tileable_fbm_fine(size=64, seed=29):
    """A SECOND noise texture, small and flat, for fine-scale lookups.

    noiseAt(px, S) samples the 512^2 texture at 512/S texels per screen pixel, so
    every lookup below scale 512 is minified -- 13x at the lace scale, 47x at the
    finest. The mipmap then averages the detail away, which is correct (it is what
    stopped the 1-4 px aliasing) but leaves nothing at fine scales. Measured
    against the plate, the render matched at 128 px features and fell to 0.63 at
    64 px, 0.62 at 16 px and 0.49 at 4 px, with a spectral slope of -2.15 against
    the plate's -1.96. That uniform fine-scale deficit IS the blurriness.

    64 texels means a lookup at scale ~48 lands near one texel per pixel, so the
    detail survives. The flatter beta gives it real fine content rather than the
    ~25-texel features the big texture carries.
    """
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.fftfreq(size)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1e-6
    out = np.zeros((size, size, 4), np.float32)
    betas = [1.45, 1.30, 1.60, 1.35]
    for c in range(4):
        w = rng.normal(size=(size, size))
        F = np.fft.fft2(w) * (r ** (-betas[c] / 2.0))
        F[0, 0] = 0
        a = np.real(np.fft.ifft2(F))
        a = (a - a.mean()) / (a.std() + 1e-9)
        a = 0.5 + 0.5 * np.tanh(a * 0.62)
        out[..., c] = a.astype(np.float32)
    return out


def _famkey(families):
    parts = []
    for n in sorted(families):
        (dx, dy), T = families[n]
        parts.append(f'{n}{dx:+.3f}{dy:+.3f}{T:.3f}')
    return 'pre_' + '_'.join(parts).replace('.', 'p').replace('+', 'P').replace('-', 'M')


def build(families, force=False):
    fields, depth, water, sdf = wf.build(families, force=force)
    cache = os.path.join(WORK, _famkey(families) + '.npz')
    if os.path.exists(cache) and not force:
        z = np.load(cache, allow_pickle=True)
        print('   precompute: cached')
        return fields, depth, water, sdf, {k: z[k] for k in z.files if k != 'sites'}, z['sites']

    P, S, C = fields['primary'], fields['secondary'], fields['chop']
    focus = ray_focus(P['dir'], water)
    ampP = shoaling_amp(P['k'], depth, P['period'], water) * focus
    ampS = shoaling_amp(S['k'], depth, S['period'], water) * (0.55 + 0.45 * focus)
    ampC = shoaling_amp(C['k'], depth, C['period'], water)
    for a in (ampP, ampS, ampC):
        deep = water & (sdf > _px(120.0))
        a /= np.percentile(a[deep], 55) if deep.any() else 1.0

    dirP_deep = families['primary'][0]
    impact, sites = impact_sites(sdf, water, np.array(dirP_deep) / np.linalg.norm(dirP_deep))
    noise = tileable_fbm()
    noise_fine = tileable_fbm_fine()

    out = dict(ampP=np.clip(ampP, 0.3, 3.2).astype(np.float32),
               ampS=np.clip(ampS, 0.3, 3.2).astype(np.float32),
               ampC=np.clip(ampC, 0.3, 2.2).astype(np.float32),
               focus=focus.astype(np.float32),
               impact=impact.astype(np.float32),
               noise=noise, noise_fine=noise_fine)
    np.savez_compressed(cache, sites=np.array(sites, dtype=object), **out)
    print(f'   precompute: ampP {out["ampP"].min():.2f}..{out["ampP"].max():.2f}  '
          f'focus {focus.min():.2f}..{focus.max():.2f}')
    return fields, depth, water, sdf, out, np.array(sites, dtype=object)


if __name__ == '__main__':
    fam = {'primary': ((0.53, 0.85), 2.6), 'secondary': ((0.72, 0.62), 1.9), 'chop': ((0.40, 0.92), 1.15)}
    build(fam, force=True)
