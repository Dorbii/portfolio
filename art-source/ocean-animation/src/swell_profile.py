"""1-D directional profile of the organised-swell references: primary swell wavelength."""
import os, json, numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN, DIAG = os.path.join(ROOT, 'refs', 'canonical'), os.path.join(ROOT, 'diagnostics')
M = json.load(open(os.path.join(DIAG, 'reference_measurements.json')))

def profile(cid, box, prop_deg):
    im = np.asarray(Image.open(os.path.join(CAN, f'{cid}.png')).convert('L')).astype(np.float64)
    sub = im[box[1]:box[3], box[0]:box[2]]
    h, w = sub.shape
    yy, xx = np.mgrid[0:h, 0:w]
    a = np.radians(prop_deg)
    s = xx * np.cos(a) + yy * np.sin(a)          # distance along propagation
    s = s - s.min()
    nb = int(s.max()) + 1
    prof = np.bincount(s.astype(int).ravel(), weights=sub.ravel(), minlength=nb)
    cnt = np.bincount(s.astype(int).ravel(), minlength=nb)
    ok = cnt > (0.5 * cnt.max())
    prof = prof[ok] / cnt[ok]
    prof = prof - np.convolve(prof, np.ones(121) / 121, 'same')   # detrend
    n = len(prof)
    win = np.hanning(n)
    P = np.abs(np.fft.rfft(prof * win)) ** 2
    fr = np.fft.rfftfreq(n, d=1.0)
    keep = (fr > 1.0 / 260) & (fr < 1.0 / 12)
    order = np.argsort(-P[keep])[:5]
    peaks = [(round(1.0 / fr[keep][i], 1), round(float(P[keep][i] / P[keep].max()), 3)) for i in order]
    return n, peaks

for cid, box in [('C5', (70, 60, 400, 1400)), ('C1', (70, 60, 400, 1400)), ('S', (70, 60, 400, 1400))]:
    sp = M[cid]['spectrum']
    if not sp: continue
    n, peaks = profile(cid, box, sp['propagation_deg'])
    print(f'{cid}  prop {sp["propagation_deg"]:.0f}deg  profile len {n}px')
    for wl, rel in peaks:
        print(f'      wavelength {wl:7.1f} px   relative power {rel:.3f}')
    print()
