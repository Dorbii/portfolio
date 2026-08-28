"""Run the whole ocean pipeline against a NEW plate.

Nothing in the renderer is specific to one view. Everything the simulation needs
is derived from the plate itself:

  water mask, shoreline SDF, bathymetry   <- build_plates.py, from the image
  wave phase, shoaling, refraction        <- wavefield.py, from that bathymetry
  ray focus, impact sites                 <- precompute.py, from the shoreline
  sea state                               <- presets.py, art direction only

So a new scene needs a plate, a workspace, and a choice of physical scale.

  python newscene.py init  <name> <plate.png>     # workspace + masks
  python newscene.py render <name> [state]        # clips

What genuinely needs per-scene attention, and why:

* **Physical scale.** OCEAN_G sets how many pixels a wave of a given period is.
  Open-sea depth must be deep RELATIVE to the waves -- linear theory calls water
  deep at d > lambda/2 -- or waves break in open water and pile into white slabs.
  Defaults here are the values this project arrived at for a ~1100 px plate.
* **Wave direction.** In `presets.families`; it is art direction, not geometry.
* **A land registration patch** (OCEAN_ALIGN_PATCH), only if you supply reference
  images to cross-check the water mask against.
* **The water mask is worth looking at.** Water-coloured pixels misread as land
  zero the shoreline distance, which makes a false shoal, which makes surf in
  open sea. That single defect cost this project two rounds.
"""
import os, subprocess, sys
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)


def env(ws, scale=1.0):
    e = dict(os.environ)
    e['OCEAN_ROOT'] = ws
    e['OCEAN_G'] = str(130.0 * scale)
    e['OCEAN_DEPTH'] = str(105.0 * scale)
    e['OCEAN_SHELF'] = str(230.0 * scale)
    e['PYTHONPATH'] = SRC
    e.setdefault('OCEAN_CALM_REFS', '')          # no library for a new scene
    return e


def init(name, plate):
    ws = os.path.join(ROOT, 'scenes', name)
    can = os.path.join(ws, 'refs', 'canonical')
    for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets'):
        os.makedirs(os.path.join(ws, d), exist_ok=True)
    os.makedirs(can, exist_ok=True)
    im = Image.open(plate).convert('RGB')
    im.save(os.path.join(can, 'S.png'))
    print(f'scene "{name}"  plate {im.size}  ->  {ws}')
    r = subprocess.run([sys.executable, os.path.join(SRC, 'build_plates.py')],
                       env=env(ws), capture_output=True, text=True)
    print(r.stdout[-3000:] or r.stderr[-3000:])
    print(f'\nnow LOOK at {ws}/masks/water_mask.png before rendering.')
    return r.returncode


def render(name, state):
    ws = os.path.join(ROOT, 'scenes', name)
    code = ('import sys, os; sys.path.insert(0, %r); import render; '
            'render.render_one(%r, sheet=True)' % (SRC, state))
    return subprocess.run([sys.executable, '-c', code], env=env(ws)).returncode


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'init':
        sys.exit(init(sys.argv[2], sys.argv[3]))
    if len(sys.argv) >= 3 and sys.argv[1] == 'render':
        sys.exit(render(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'windy_rolling_surf'))
    print(__doc__)
    sys.exit(2)
