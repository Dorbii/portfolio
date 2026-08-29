"""worldcoast at z=1 with foam and spray off -- geometry and shading only.

Pairs with the live layer's ?water.bare. Comparing the two BARE pictures splits
the port question in half: if the geometry agrees and only the full composites
differ, the loss is in foam, not in the wave field.
"""
import os, sys, subprocess
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'worldcoast')

if os.environ.get('WCB') == '1':
    sys.path.insert(0, SRC)
    from PIL import Image
    import presets, ocean_gl
    p = presets.at_camera('windy_rolling_surf', 1.0)
    r = ocean_gl.OceanRenderer(p, verbose=False, bare=True)
    fps, sub = 24, 2; dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', 'worldcoast_z1_BARE.png')
    Image.fromarray(r.composite(t)).save(out)
    print('wrote', out)
else:
    e = dict(os.environ, OCEAN_ROOT=WS, OCEAN_G='130.0', OCEAN_DEPTH='105.0',
             OCEAN_SHELF='230.0', OCEAN_CALM_REFS='', PYTHONPATH=SRC, WCB='1')
    sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
