"""The offline renderer on the LIVE camera's own region, at full resolution.

Every other offline reference this project has compared the live layer against
was a different coastline, so a small difference in a distribution could always
be the scene rather than the port. This one is the same water: the world art and
its authoritative mask, cropped to the camera and magnified so one scene pixel
is one TUNED pixel -- 115 px a wave, where the treatment was tuned, against the
12 px a wave the world fields are baked at.

Whatever differs between this and a live capture at the same camera is the port
plus the bake resolution, and nothing else.

    python lfl_probe.py
"""
import os, sys, subprocess
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'likeforlike')

if os.environ.get('LFL') == '1':
    sys.path.insert(0, SRC)
    import numpy as np
    from PIL import Image
    import presets, ocean_gl
    p = presets.at_camera('windy_rolling_surf', 1.0)
    r = ocean_gl.OceanRenderer(p, verbose=True)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', 'likeforlike_z1.png')
    Image.fromarray(r.composite(t)).save(out)
    g, fm, sp = r.read_state()

    def stat(name, a):
        a = a.ravel()
        print(f'  {name:<16} mean {a.mean():8.4f}  p95 {np.percentile(a,95):8.4f}  '
              f'p99 {np.percentile(a,99):8.4f}  max {a.max():7.3f}  '
              f'>0.1 {(a>0.1).mean()*100:6.2f}%  >0.5 {(a>0.5).mean()*100:6.2f}%')
    print('\n-- offline on the LIVE camera region, 115 px a wave --')
    stat('geom.hn', g[..., 0])
    stat('geom.|grad h|', np.hypot(g[..., 1], g[..., 2]))
    stat('geom.breaking', g[..., 3])
    stat('foam.fresh', fm[..., 0])
    stat('foam.persist', fm[..., 1])
    print('wrote', out)
else:
    e = dict(os.environ, OCEAN_ROOT=WS, OCEAN_G='130.0', OCEAN_DEPTH='105.0',
             OCEAN_SHELF='230.0', OCEAN_CALM_REFS='', PYTHONPATH=SRC, LFL='1')
    sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
