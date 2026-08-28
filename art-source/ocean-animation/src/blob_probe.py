import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
import presets, ocean_gl
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style_gap import stats
base = presets.PRESETS['windy_rolling_surf']
VAR = [('as-is', {}), ('crestGain=0', dict(crestGain=0.0)), ('swash=0', dict(swash=0.0)),
       ('crest=0 swash=0', dict(crestGain=0.0, swash=0.0)),
       ('foam off', dict(foamThrFresh=9.0)),
       ('foam only (crest/swash/spray off)', dict(crestGain=0.0, swash=0.0, sprayGain=0.0, transGain=0.0))]
print(f'{"variant":36s} {"foam%":>6s} {"blobs":>6s} {"bmed":>6s} {"edge":>6s}')
for name, over in VAR:
    p = dict(base); p.update(over)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt=1/(fps*sub); t=-p['preroll']; first=True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t < 6.0: r.step(t,dt,False); t+=dt
    img = r.composite(t).astype(np.float32)/255.
    s = stats(img, name)
    print(f'{name:36s} {s["foam_pct"]:6.1f} {s["blobs"]:6d} {s["blob_med_px"]:6.0f} {s["blob_edge_cplx"]:6.2f}')
    del r
