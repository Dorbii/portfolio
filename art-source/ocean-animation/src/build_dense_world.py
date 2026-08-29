"""Build a denser copy of the world scene.

The surf zone is 60 TUNED pixels wide. At the shipping bake's twelve world
pixels a wavelength that is six texels for the whole of breaking -- the shoaling
ramp, the depth gate, the caustics that decide which crests break at all. Every
band except the surf zone already matches the offline renderer; that one does not,
and six texels is why.

This makes the same world at N times the density: the same coastline, the same
authoritative mask, the same physical waves, N times as many samples across each
of them.

    python build_dense_world.py <factor>
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
T = 2.36
LAM_BASE = 12.0

factor = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
name = f'world{factor:g}x'
src = os.path.join(ROOT, 'scenes', 'world')
ws = os.path.join(ROOT, 'scenes', name)
for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets', 'refs/canonical', 'baked', 'textures'):
    os.makedirs(os.path.join(ws, *d.split('/')), exist_ok=True)

art = Image.open(os.path.join(src, 'refs', 'canonical', 'S.png')).convert('RGB')
out = (int(round(art.width * factor)), int(round(art.height * factor)))
art.resize(out, Image.LANCZOS).save(os.path.join(ws, 'refs', 'canonical', 'S.png'))
m = Image.open(os.path.join(src, 'masks', 'water_mask.png')).convert('L').resize(out, Image.BILINEAR)
mask_path = os.path.join(ws, 'water_mask_src.png')
Image.fromarray((np.asarray(m) > 127).astype(np.uint8) * 255).save(mask_path)

lam = LAM_BASE * factor
G = lam * 2.0 * np.pi / (T * T)
print(f'{name}: {out[0]}x{out[1]}   lambda {lam:g} scene px   OCEAN_G {G:.4f}')
print(f'  surf zone is 60 tuned px = {60.0 * G / 130.0:.1f} scene px '
      f'(was {60.0 * (LAM_BASE * 2 * np.pi / T / T) / 130.0:.1f})')
e = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
         OCEAN_WATER_MASK=mask_path, OCEAN_G=str(G),
         OCEAN_DEPTH=str(105.0 * G / 130.0), OCEAN_SHELF=str(230.0 * G / 130.0))
r = subprocess.run([sys.executable, os.path.join(SRC, 'build_plates.py')],
                   env=e, capture_output=True, text=True)
print(r.stdout[-700:] or r.stderr[-700:])
print(f'\nnow:  OCEAN_WORLD_SCENE={name} WORLD_LAMBDA={lam:g} python bake_world.py')
