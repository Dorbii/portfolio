"""Visual analysis of the reference library (measurement, not filename trust)."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN  = os.path.join(ROOT, 'refs', 'canonical')
DIAG = os.path.join(ROOT, 'diagnostics')
os.makedirs(DIAG, exist_ok=True)
IDS = ['S'] + [f'C{i}' for i in range(1, 9)]


def load(cid):
    return np.asarray(Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB')).astype(np.float32) / 255.


def water_prob(rgb):
    """Blue water OR cyan/turquoise shallows OR cool near-white foam."""
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    blueness = B - np.maximum(R, G)          # deep blue
    cyanness = np.minimum(G, B) - R          # turquoise
    w1 = np.clip((blueness - 0.010) / 0.055, 0, 1)
    w2 = np.clip((cyanness - 0.045) / 0.085, 0, 1)
    foam = (np.clip((V - 0.60) / 0.24, 0, 1)
            * np.clip((0.36 - sat) / 0.24, 0, 1)
            * np.clip((B - R + 0.045) / 0.05, 0, 1))
    return np.maximum(np.maximum(w1, w2), foam)


def clean_mask(wp, gutter=55):
    m = wp > 0.5
    m[:, :gutter] = False
    m = ndi.binary_closing(m, np.ones((5, 5)))
    m = ndi.binary_opening(m, np.ones((3, 3)))
    lab, n = ndi.label(m)
    if n:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (int(np.argmax(sizes)) + 1)
    return m


def kmeans(X, K, seed=0, iters=40):
    rng = np.random.default_rng(seed)
    cent = X[rng.choice(len(X), K, replace=False)].copy()
    for _ in range(iters):
        lab = ((X[:, None, :] - cent[None]) ** 2).sum(-1).argmin(1)
        for k in range(K):
            m = lab == k
            if m.sum(): cent[k] = X[m].mean(0)
    share = np.bincount(lab, minlength=K) / len(X)
    o = np.argsort(-share)
    return cent[o], share[o]


def dominant_wave(gray, mask, win=160, stride=32, min_cov=0.965):
    """Average power spectra of many near-interior windows in open water."""
    H, W = gray.shape
    acc = None; used = 0
    hann = np.hanning(win)
    w2d = hann[:, None] * hann[None, :]
    for y in range(0, H - win, stride):
        for x in range(0, W - win, stride):
            sub = mask[y:y + win, x:x + win]
            cov = sub.mean()
            if cov < min_cov:
                continue
            p = gray[y:y + win, x:x + win].astype(np.float64)
            m = p[sub].mean()
            p = np.where(sub, p - m, 0.0)
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
    prop = int(hs.argmax())
    aniso = float(hs.max() / (hs.mean() + 1e-30))
    sel = band & (np.abs(((ai - prop + 90) % 180) - 90) <= 15)
    ww = Fb[sel]; rr = r[sel]
    if ww.sum() <= 0: return None
    rbar = float((rr * ww).sum() / ww.sum())
    o = np.argsort(rr); cw = np.cumsum(ww[o]); rmed = float(rr[o][np.searchsorted(cw, cw[-1] * 0.5)])
    return dict(windows=used,
                propagation_deg=float(prop), crest_line_deg=float((prop + 90) % 180),
                wavelength_px=round(win / max(rmed, 1e-6), 1),
                wavelength_mean_px=round(win / max(rbar, 1e-6), 1),
                anisotropy=round(aniso, 3))


results = {}
print(f'{"id":3s} {"water%":>7s} {"foam%":>6s} {"luma":>6s} {"std":>5s}  {"deep":>8s} {"mid":>8s} {"shallow":>8s}  {"crestdeg":>7s} {"propdeg":>6s} {"lam_px":>6s} {"aniso":>6s}')
for cid in IDS:
    rgb = load(cid)
    H, W = rgb.shape[:2]
    wmask = clean_mask(water_prob(rgb))
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    foam = wmask & (V > 0.70) & (sat < 0.30)
    gray = rgb @ np.array([0.299, 0.587, 0.114], np.float32)

    # distance to land, measured only against LAND (not the image frame)
    pad = np.ones((H + 2, W + 2), bool); pad[1:-1, 1:-1] = wmask
    pad[:, :1] = True; pad[:, -1:] = True; pad[:1] = True; pad[-1:] = True
    dist = ndi.distance_transform_edt(pad)[1:-1, 1:-1]
    dist[~wmask] = 0

    openw = wmask & (dist > 42)
    deep = wmask & (dist > 110)
    mid  = wmask & (dist > 45) & (dist <= 110)
    shal = wmask & (dist > 1) & (dist <= 22)

    wat = rgb[wmask]
    idx = np.random.default_rng(3).choice(len(wat), min(60000, len(wat)), replace=False)
    cent, share = kmeans(wat[idx], 6, seed=5)
    hx = lambda a: '#%02x%02x%02x' % tuple(np.clip(a * 255, 0, 255).astype(int))
    sp = dominant_wave(gray, openw)
    res = dict(size=[W, H],
               water_fraction=round(float(wmask.mean()), 4),
               foam_fraction_of_water=round(float(foam.sum() / max(wmask.sum(), 1)), 4),
               mean_water_luma=round(float(gray[wmask].mean()), 4),
               water_luma_std=round(float(gray[wmask].std()), 4),
               palette=[dict(hex=hx(c), rgb=[int(v) for v in (c * 255).round()], share=round(float(s), 4))
                        for c, s in zip(cent, share)],
               deep_mean=hx(rgb[deep].mean(0)) if deep.sum() > 300 else None,
               mid_mean=hx(rgb[mid].mean(0)) if mid.sum() > 300 else None,
               shallow_mean=hx(rgb[shal].mean(0)) if shal.sum() > 300 else None,
               open_water_px=int(openw.sum()), spectrum=sp)
    results[cid] = res
    s = sp or {}
    print(f'{cid:3s} {res["water_fraction"]*100:6.1f}% {res["foam_fraction_of_water"]*100:5.1f}% '
          f'{res["mean_water_luma"]:6.3f} {res["water_luma_std"]:5.3f}  {str(res["deep_mean"]):>8s} {str(res["mid_mean"]):>8s} {str(res["shallow_mean"]):>8s}  '
          f'{s.get("crest_line_deg", float("nan")):7.1f} {s.get("propagation_deg", float("nan")):6.1f} '
          f'{s.get("wavelength_px", float("nan")):6.1f} {s.get("anisotropy", float("nan")):6.2f}')
    Image.fromarray((wmask * 255).astype(np.uint8)).save(os.path.join(DIAG, f'watermask_{cid}.png'))

json.dump(results, open(os.path.join(DIAG, 'reference_measurements.json'), 'w'), indent=2)
print('\nwrote diagnostics/reference_measurements.json')
