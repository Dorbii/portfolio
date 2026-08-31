"""Phase-invariant weave metric on a water-masked canvas capture.

Two captures of the SAME build differ by wave phase, so images cannot be
compared by eye or by correlation. These statistics are distributions over
water-only pixels and are stable across phase:

  coh   structure-tensor orientation coherence (0 isotropic, 1 perfectly
        parallel striping) -- THE weave number
  ang   dominant orientation, degrees
  hf    high-frequency energy (std of luma minus a 3-px blur)
  fw    foam coverage %, luma > 150
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

for path in sys.argv[1:]:
    im = Image.open(path)
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    L = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    m = alpha > 250
    if m.sum() < 5000:
        print('%-34s no water' % path.split('/')[-1]); continue
    Lw = np.where(m, L, np.nan)
    fill = np.where(m, L, float(np.nanmean(Lw)))
    gy, gx = np.gradient(ndi.gaussian_filter(fill, 1.0))
    w = m.astype(np.float32)
    Jxx = ndi.gaussian_filter(gx * gx * w, 6.0)
    Jyy = ndi.gaussian_filter(gy * gy * w, 6.0)
    Jxy = ndi.gaussian_filter(gx * gy * w, 6.0)
    num = np.sqrt((Jxx - Jyy) ** 2 + 4.0 * Jxy ** 2)
    den = Jxx + Jyy + 1e-6
    coh = float(np.nanmean(np.where(m, num / den, np.nan)))
    ang = float(np.degrees(0.5 * np.arctan2(2 * np.nansum(Jxy[m]),
                                            np.nansum(Jxx[m] - Jyy[m]))))
    hf = float(np.nanstd(np.where(m, fill - ndi.gaussian_filter(fill, 3.0), np.nan)))
    fw = float((L[m] > 150).mean() * 100.0)
    print('%-34s coh %.4f  ang %+6.1f  hf %5.2f  foam%% %5.2f  water %.0f%%'
          % (path.split('/')[-1], coh, ang, hf, fw, 100.0 * m.mean()))
