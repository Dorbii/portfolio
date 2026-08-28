import numpy as np, presets, ocean_gl
for name in ['calm_swell','windy_rolling_surf','heavy_crashing_surf']:
    p = presets.PRESETS[name]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps,sub=24,2; dt=1/(fps*sub); t=-2.0; first=True
    for _ in range(int(2.0*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    g,fm,sp = r.read_state()
    w = r.water_soft>0.5
    sdf = r.sdf
    deep = w & (sdf>120); shal = w & (sdf>2) & (sdf<40)
    st = np.hypot(g[...,1], g[...,2])
    print(f'{name:22s} |grad h|  deep p50 {np.percentile(st[deep],50):.3f} p85 {np.percentile(st[deep],85):.3f} '
          f'p95 {np.percentile(st[deep],95):.3f} p99 {np.percentile(st[deep],99):.3f} | shallow p50 {np.percentile(st[shal],50):.3f} p95 {np.percentile(st[shal],95):.3f}')
    print(f'{"":22s} breaking>0.3: {(g[...,3]>0.3)[w].mean()*100:5.1f}% of water   in deep {(g[...,3]>0.3)[deep].mean()*100:5.1f}%')
    del r
