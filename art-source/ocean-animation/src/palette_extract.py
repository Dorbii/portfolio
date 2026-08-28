"""Pull precise palette anchors used by the renderer's colour ramp."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN, DIAG = os.path.join(ROOT, 'refs', 'canonical'), os.path.join(ROOT, 'diagnostics')
import importlib.util
spec = importlib.util.spec_from_file_location('ar', os.path.join(ROOT, 'src', 'analyze_refs.py'))

def water_prob(rgb):
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    w1 = np.clip((B - np.maximum(R, G) - 0.010) / 0.055, 0, 1)
    w2 = np.clip((np.minimum(G, B) - R - 0.045) / 0.085, 0, 1)
    foam = (np.clip((V - 0.60) / 0.24, 0, 1) * np.clip((0.36 - sat) / 0.24, 0, 1)
            * np.clip((B - R + 0.045) / 0.05, 0, 1))
    return np.maximum(np.maximum(w1, w2), foam)

hx = lambda a: '#%02x%02x%02x' % tuple(np.clip(np.asarray(a) * 255, 0, 255).astype(int))
out = {}
for cid in ['S'] + [f'C{i}' for i in range(1, 9)]:
    rgb = np.asarray(Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB')).astype(np.float32) / 255.
    m = water_prob(rgb) > 0.5
    m[:, :55] = False
    m = ndi.binary_opening(ndi.binary_closing(m, np.ones((5, 5))), np.ones((3, 3)))
    lab, n = ndi.label(m)
    if n: m = lab == int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))) + 1
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    V = rgb.max(-1); mn = rgb.min(-1); sat = (V - mn) / np.maximum(V, 1e-6)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    cyan = np.minimum(G, B) - R
    nonfoam = m & (sat > 0.22)
    e = {}
    if nonfoam.sum() > 500:
        q = lum[nonfoam]
        e['abyss_p02']   = hx(rgb[nonfoam][q <= np.percentile(q, 2)].mean(0))
        e['deep_p15']    = hx(rgb[nonfoam][(q > np.percentile(q, 10)) & (q <= np.percentile(q, 20))].mean(0))
        e['mid_p50']     = hx(rgb[nonfoam][(q > np.percentile(q, 45)) & (q <= np.percentile(q, 55))].mean(0))
        e['bright_p90']  = hx(rgb[nonfoam][q >= np.percentile(q, 90)].mean(0))
        cy = cyan[nonfoam]
        thr = np.percentile(cy, 99)
        if (cy >= thr).sum() > 50:
            e['most_turquoise_p99'] = hx(rgb[nonfoam][cy >= thr].mean(0))
        thr2 = np.percentile(cy, 95)
        e['turquoise_p95'] = hx(rgb[nonfoam][cy >= thr2].mean(0))
    foam = m & (V > 0.72) & (sat < 0.26)
    if foam.sum() > 300:
        fl = lum[foam]
        e['foam_dense_p90'] = hx(rgb[foam][fl >= np.percentile(fl, 90)].mean(0))
        e['foam_mean']      = hx(rgb[foam].mean(0))
        e['foam_thin_p10']  = hx(rgb[foam][fl <= np.percentile(fl, 10)].mean(0))
    out[cid] = e
    print(cid, json.dumps(e))
json.dump(out, open(os.path.join(DIAG, 'palette_anchors.json'), 'w'), indent=2)
print('\nwrote diagnostics/palette_anchors.json')
