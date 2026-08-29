"""The offline renderer's own breaking / whitecap / foam statistics at z=1.

The live layer's ?water.probe reports the same numbers off the GPU. Comparing
them answers the one question a screenshot cannot: when the live picture has a
fifth of the whitewater, are the waves failing to BREAK or is the foam failing
to SURVIVE?
"""
import os, sys, subprocess
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'worldcoast')

if os.environ.get('WCP') == '1':
    sys.path.insert(0, SRC)
    import numpy as np
    import presets, ocean_gl
    p = presets.at_camera('windy_rolling_surf', 1.0)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    g, fm, sp = r.read_state()

    def stat(name, a):
        a = a.ravel()
        print(f'  {name:<16} mean {a.mean():8.4f}  p95 {np.percentile(a,95):8.4f}  '
              f'p99 {np.percentile(a,99):8.4f}  max {a.max():7.3f}  '
              f'>0.1 {(a>0.1).mean()*100:6.2f}%  >0.5 {(a>0.5).mean()*100:6.2f}%')
    print('-- offline worldcoast z=1, same channels the live probe reports --')
    stat('geom.hn', g[..., 0]); stat('geom.breaking', g[..., 3])
    stat('foam.fresh', fm[..., 0]); stat('foam.persist', fm[..., 1])
    stat('spray', sp[..., 0])
else:
    e = dict(os.environ, OCEAN_ROOT=WS, OCEAN_G='130.0', OCEAN_DEPTH='105.0',
             OCEAN_SHELF='230.0', OCEAN_CALM_REFS='', PYTHONPATH=SRC, WCP='1')
    sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
