"""Low-frequency band energy: what the HF metric cannot see.

Bands 15-60 px wide are the 'corduroy' the eye reads at map zooms. Measure
the band-scale energy (a 3-px blur minus a 40-px blur) and its orientation
coherence, over water-only pixels.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    L = a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    m = a[..., 3] > 250
    if m.sum() < 5000:
        print('%-24s no water' % path.split('/')[-1]); continue
    fill = np.where(m, L, float(L[m].mean()))
    band = ndi.gaussian_filter(fill, 3.0) - ndi.gaussian_filter(fill, 40.0)
    gy, gx = np.gradient(band)
    w = m.astype(np.float32)
    Jxx = ndi.gaussian_filter(gx * gx * w, 8.0)
    Jyy = ndi.gaussian_filter(gy * gy * w, 8.0)
    Jxy = ndi.gaussian_filter(gx * gy * w, 8.0)
    coh = float(np.mean((np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6))[m]))
    print('%-24s band-energy %6.2f   band-coherence %.4f' % (path.split('/')[-1], float(band[m].std()), coh))
