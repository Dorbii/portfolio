"""The offline foam buffer's own statistics, in the live probe's format.

The live layer reports its intermediate fields through ?water.probe. There was no
equivalent offline, so every offline-vs-live comparison had to be made on the
COMPOSITE -- which cannot separate "the foam pass makes less foam" from "the same
foam is drawn less". Six uniforms were swept against that ambiguity and all six
moved the picture by nothing.

    python foam_probe.py <scene> [state]

Prints fresh/persist/whitecap/breaking exactly as WaterSurfaceRenderer.probeFields
does, so the two can be read side by side.
"""
import os
import subprocess
import sys

import numpy as np

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)


def stats(a):
    v = a.ravel()
    return {
        'mean': float(v.mean()),
        'p50': float(np.percentile(v, 50)),
        'p95': float(np.percentile(v, 95)),
        'p99': float(np.percentile(v, 99)),
        'max': float(v.max()),
        'over01': float((v > 0.1).mean()),
        'over05': float((v > 0.5).mean()),
    }


def main():
    scene = sys.argv[1]
    state = sys.argv[2] if len(sys.argv) > 2 else 'heavy_crashing_surf'
    ws = os.path.join(ROOT, 'scenes', scene)

    if os.environ.get('FP') != '1':
        env = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
                   OCEAN_G='130.0', OCEAN_DEPTH='105.0', OCEAN_SHELF='230.0', FP='1')
        raise SystemExit(subprocess.run(
            [sys.executable, os.path.abspath(__file__)] + sys.argv[1:], env=env).returncode)

    sys.path.insert(0, SRC)
    import ocean_gl
    import presets
    p = presets.PRESETS[state]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub)
    t = -p['preroll']
    first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first)
        first = False
        t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False)
        t += dt

    def read(target, channels):
        raw = np.frombuffer(target.read(), dtype='f4')
        raw = raw.reshape(target.height, target.width, target.components)
        return {name: stats(raw[:, :, i]) for i, name in channels}

    out = {}
    out.update({'foam.' + k: v for k, v in
                read(r.foam[r.cur], ((0, 'fresh'), (1, 'persist'))).items()})
    # The drivers, so the comparison can walk upstream: if whitecap and breaking
    # already differ, the foam pass is innocent and the wave pass is not.
    for attr, chans, prefix in (('tGeom', ((0, 'hn'), (3, 'breaking')), 'geom.'),
                                ('tFlow', ((3, 'whitecap'),), 'flow.')):
        t = getattr(r, attr, None)
        if t is None:
            continue
        out.update({prefix + k: v for k, v in read(t, chans).items()})
    out.update({'spray.' + k: v for k, v in
                read(r.spray[r.cur], ((0, 'a'),)).items()} if hasattr(r, 'spray') else {})
    print(f'OFFLINE {scene} {state}')
    for k in sorted(out):
        s = out[k]
        print('%-14s mean %7.4f  p95 %7.4f  max %7.4f  over01 %6.4f  over05 %6.4f'
              % (k, s['mean'], s['p95'], s['max'], s['over01'], s['over05']))


if __name__ == '__main__':
    main()
