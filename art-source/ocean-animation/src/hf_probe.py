"""Which term is injecting the 1-4 px mottling? Measure high-frequency energy in
a deep-water patch with each contribution disabled."""
import os, numpy as np
from scipy import ndimage as ndi
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = presets.PRESETS['windy_rolling_surf']
BOX = (300, 410, 120, 230)   # y0,y1,x0,x1 : pure deep water
def hf(img):
    g = img.astype(np.float64).mean(-1)[BOX[0]:BOX[1], BOX[2]:BOX[3]]
    return float((g - ndi.gaussian_filter(g, 2.0)).std())
VAR = [('full', {}),
       ('glitter=0', dict(glitter=0.0)),
       ('spec=0', dict(specGain=0.0)),
       ('sheen=0', dict(sheen=0.0)),
       ('shadow=0', dict(shadowGain=0.0)),
       ('crest lines=0', dict(crestGain=0.0)),
       ('lace lines=0', dict(laceLineGain=0.0)),
       ('foam mass=0', dict(foamMass=0.0)),
       ('teal/swash=0', dict(swash=0.0, transGain=0.0)),
       ('chop=0', dict(ampC=0.0, chopGain=0.0)),
       ('secondary=0', dict(ampS=0.0)),
       ('plate influence=0', dict(plateInfluence=0.0, plateTint=0.0)),
       ('ripple=0', dict(rippleGain=0.0)),
       ('ALL shading off', dict(glitter=0.0, specGain=0.0, sheen=0.0, shadowGain=0.0,
                                crestGain=0.0, laceLineGain=0.0, foamMass=0.0,
                                swash=0.0, transGain=0.0, rippleGain=0.0))]
print(f'{"variant":22s} {"HF std":>8s}  {"delta":>8s}')
ref = None
for name, over in VAR:
    p = dict(base); p.update(over)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt=1/(fps*sub); t=-p['preroll']; first=True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t < 6.0: r.step(t,dt,False); t+=dt
    v = hf(r.composite(t))
    if ref is None: ref = v
    print(f'{name:22s} {v:8.4f}  {v-ref:+8.4f}')
    del r
