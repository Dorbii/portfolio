"""Render an existing like-for-like scene at a chosen camera factor.

Matching the EXTENT is not enough. The live layer at span s shows the same water
at zc = canvas / (s * worldpx * tunedPerWorld), and unless the offline render is
given the same z its strokes sit at a different size relative to the waves --
which is most of what "matches the MVP" means.

    python lfl_render.py <scene> <z> [state]
"""
import os, subprocess, sys
SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)

if os.environ.get('LFR') == '1':
    sys.path.insert(0, SRC)
    from PIL import Image
    import presets, ocean_gl
    z = float(os.environ['LFR_Z']); state = os.environ['LFR_STATE']
    p = presets.at_camera(state, z)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub); t = -p['preroll']; first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt
    t = 0.0
    while t < 6.0:
        r.step(t, dt, False); t += dt
    out = os.path.join(ROOT, 'diagnostics', os.environ['LFR_OUT'])
    Image.fromarray(r.composite(t)).save(out)
    print('wrote', out)
    raise SystemExit(0)

scene, z = sys.argv[1], float(sys.argv[2])
state = sys.argv[3] if len(sys.argv) > 3 else 'heavy_crashing_surf'
ws = os.path.join(ROOT, 'scenes', scene)
e = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
         OCEAN_G='130.0', OCEAN_DEPTH='105.0', OCEAN_SHELF='230.0',
         LFR='1', LFR_Z=str(z), LFR_STATE=state,
         LFR_OUT=f'{scene}_z{z:g}_{state}.png')
sys.exit(subprocess.run([sys.executable, os.path.abspath(__file__)], env=e).returncode)
