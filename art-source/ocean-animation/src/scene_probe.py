"""Channel statistics for any offline scene, to sit beside ?water.probe.

    python scene_probe.py <scene> [state]
"""
import os, subprocess, sys
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)

if os.environ.get('SP') == '1':
    sys.path.insert(0, SRC)
    import numpy as np
    import presets, ocean_gl
    p = presets.at_camera(os.environ['SP_STATE'], float(os.environ.get('SP_DENS', 1.0)))
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    g, fm, sp = r.read_state()
    # attachment 1 is outFlow = (flow.xy, hForm, whitecap). read_state does not
    # pull it, and whitecap is the offshore foam SOURCE -- the one input to the
    # live/offline comparison still unmeasured.
    fl = np.frombuffer(r.fboWave.read(attachment=1, components=4, dtype='f4'),
                       'f4').reshape(r.H, r.W, 4)

    def stat(name, a):
        a = a.ravel()
        print(f'  {name:<16} mean {a.mean():8.4f}  p95 {np.percentile(a,95):8.4f}  '
              f'p99 {np.percentile(a,99):8.4f}  max {a.max():7.3f}  '
              f'>0.1 {(a>0.1).mean()*100:6.2f}%  >0.5 {(a>0.5).mean()*100:6.2f}%')
    stat('geom.hn', g[..., 0])
    stat('geom.breaking', g[..., 3])
    stat('flow.whitecap', fl[..., 3])
    stat('flow.hForm', fl[..., 2])
    stat('foam.fresh', fm[..., 0])
    stat('foam.persist', fm[..., 1])
    stat('spray.a', sp[..., 0])
    raise SystemExit(0)

scene = sys.argv[1]
state = sys.argv[2] if len(sys.argv) > 2 else 'heavy_crashing_surf'
# Scene px per tuned px, matching whatever lfl_build used for the scene.
dens = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
e = dict(os.environ, OCEAN_ROOT=os.path.join(ROOT, 'scenes', scene), PYTHONPATH=SRC,
         OCEAN_CALM_REFS='', OCEAN_G=str(130.0 * dens),
         OCEAN_DEPTH=str(105.0 * dens), OCEAN_SHELF=str(230.0 * dens),
         SP='1', SP_STATE=state, SP_DENS=str(dens))
print(f'-- offline {scene} / {state} --')
sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
