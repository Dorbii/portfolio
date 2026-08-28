import time, numpy as np
from PIL import Image
import presets, ocean_gl
t0=time.time()
r = ocean_gl.OceanRenderer(presets.PRESETS['windy_rolling_surf'])
print(f'init {time.time()-t0:.1f}s  {r.W}x{r.H}')
t0=time.time()
for i in range(24):
    r.step(i/48.0, 1/48.0, i==0)
img = r.composite(0.5)
print(f'24 steps + composite: {time.time()-t0:.2f}s')
Image.fromarray(img).save('../diagnostics/smoke.png')
g, fm, sp = r.read_state()
print('h range', g[...,0].min(), g[...,0].max())
print('breaking max', g[...,3].max(), ' foam fresh max', fm[...,0].max(), ' persist max', fm[...,1].max())
print('spray max', sp[...,0].max())
t0=time.time()
for i in range(48): r.step(1.0+i/48.0, 1/48.0, False)
print(f'48 steps: {time.time()-t0:.2f}s -> {(time.time()-t0)/48*1000:.1f} ms/step')
