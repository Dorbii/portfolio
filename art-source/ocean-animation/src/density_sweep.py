"""How much of the wave field does the bake density actually cost?

The world's fields are baked at twelve world pixels a wavelength. Solving the
SAME coastline at higher density and comparing the amplitude field says what
that costs and what a denser bake would buy -- which is the difference between
an informed decision about asset size and a guess.

Resampling the output is not the same experiment and gives the wrong answer:
downsampling the full-resolution ampP to 12 px/wave barely dents it (3.20 ->
3.13) while the real bake at that density reaches only 2.50. The loss is in the
SOLVE, so each density has to be solved.

    python density_sweep.py
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
T = 2.36
CROP = (792, 452, 966, 550)          # the live camera's region, in world px
DENSITIES = (12, 18, 24, 35, 48)


def build(px_per_wave):
    name = f'_dens{px_per_wave}'
    ws = os.path.join(ROOT, 'scenes', name)
    out = (int(round((CROP[2] - CROP[0]) * px_per_wave / 12.0)),
           int(round((CROP[3] - CROP[1]) * px_per_wave / 12.0)))
    src = os.path.join(ROOT, 'scenes', '_lfl_src')
    os.makedirs(os.path.join(ws, 'refs', 'canonical'), exist_ok=True)
    for d in ('masks', 'diagnostics', 'work', 'outputs', 'contactsheets'):
        os.makedirs(os.path.join(ws, d), exist_ok=True)
    art = Image.open(os.path.join(ROOT, 'scenes', 'world', 'refs', 'canonical', 'S.png'))
    art.convert('RGB').crop(CROP).resize(out, Image.LANCZOS).save(
        os.path.join(ws, 'refs', 'canonical', 'S.png'))
    m = Image.open(os.path.join(ROOT, 'scenes', 'world', 'masks', 'water_mask.png'))
    mb = (np.asarray(m.convert('L').crop(CROP).resize(out, Image.BILINEAR)) > 127)
    mask_path = os.path.join(ws, 'water_mask_src.png')
    Image.fromarray(mb.astype(np.uint8) * 255).save(mask_path)
    G = px_per_wave * 2.0 * np.pi / (T * T)
    e = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
             OCEAN_WATER_MASK=mask_path, OCEAN_G=str(G),
             OCEAN_DEPTH=str(105.0 * G / 130.0), OCEAN_SHELF=str(230.0 * G / 130.0))
    subprocess.run([sys.executable, os.path.join(SRC, 'build_plates.py')],
                   env=e, capture_output=True, text=True)
    code = ('import sys, os, numpy as np; sys.path.insert(0, %r); '
            'import presets, precompute; '
            'f,d,w,s,ex,_ = precompute.build(presets.PRESETS["windy_rolling_surf"]["families"]); '
            'a = ex["ampP"][w]; '
            'print("RESULT %%.3f %%.3f %%.4f %%.4f" %% (np.percentile(a,99), a.max(), '
            '(a>2.0).mean()*100, (a>2.5).mean()*100))' % SRC)
    r = subprocess.run([sys.executable, '-c', code], env=e, capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith('RESULT')]
    return out, (line[0].split()[1:] if line else None), r.stderr[-300:]


print(f'{"px/wave":>9}{"scene":>13}{"world tex w":>13}{"ampP p99":>10}{"max":>8}{">2.0":>8}{">2.5":>8}')
for n in DENSITIES:
    size, res, err = build(n)
    tex = int(round(1672 * n / 12.0))
    if res is None:
        print(f'{n:>9}{f"{size[0]}x{size[1]}":>13}{tex:>13}   FAILED  {err.splitlines()[-1][:60] if err else ""}')
        continue
    p99, mx, o2, o25 = (float(v) for v in res)
    print(f'{n:>9}{f"{size[0]}x{size[1]}":>13}{tex:>13}{p99:>10.2f}{mx:>8.2f}{o2:>7.2f}%{o25:>7.2f}%')
