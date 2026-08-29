"""Render the offline renderer on the SAME world the live layer loads.

At camera factor z = lambdaWorld / (130 T^2/2pi) the offline wave scale equals
the scale baked into the world fields, and the frame is the field resolution,
so the result is PIXEL REGISTERED with a live capture of the whole world. Any
difference between the two is the port, not the framing.

    python world_ref.py [state] [z]
"""
import os, sys, subprocess
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'world')


def env(z):
    e = dict(os.environ)
    e.update(OCEAN_ROOT=WS, OCEAN_CALM_REFS='', PYTHONPATH=SRC,
             OCEAN_G=str(130.0 * z), OCEAN_DEPTH=str(105.0 * z),
             OCEAN_SHELF=str(230.0 * z), WR_Z=str(z),
             WR_STATE=sys.argv[1] if len(sys.argv) > 1 else 'windy_rolling_surf')
    return e


def _render():
    sys.path.insert(0, SRC)
    from PIL import Image
    import presets, ocean_gl
    z = float(os.environ['WR_Z']); state = os.environ['WR_STATE']
    p = presets.at_camera(state, z)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', f'worldref_z{z:g}_{state}.png')
    Image.fromarray(r.composite(t)).save(out)
    print('wrote', out, r.W, 'x', r.H)


if __name__ == '__main__':
    if os.environ.get('WR_Z') and sys.argv[-1] == '_r':
        _render()
    else:
        import json
        meta = json.load(open(os.path.join(WS, 'textures', 'world-fields-r2.json'),
                              encoding='utf-8'))
        import math
        z = float(sys.argv[2]) if len(sys.argv) > 2 else \
            meta['lambdaWorld'] / (130.0 * 2.36 ** 2 / (2 * math.pi))
        print(f'camera factor z = {z:.6f}')
        sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)] + sys.argv[1:] + ['_r'],
                                env=env(z)).returncode)
