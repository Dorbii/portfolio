"""Cell-by-cell comparison against a reference, instead of whole-image statistics.

Aggregate measures kept saying "matched" while the render still read wrong. A grid
shows WHERE and HOW the two differ: each cell gets its own local statistics, and
the cells are ranked by disagreement so the worst are inspectable directly rather
than averaged into a single number that hides them.
"""
import os, sys, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter as gf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
WM = np.asarray(Image.open(os.path.join(ROOT,'masks','water_mask.png')).convert('L'), np.float32)/255 > 0.9


def cell_stats(a):
    """Per-cell descriptors chosen to separate 'grain' from 'structure'."""
    L = a @ LUMA
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    g1 = np.abs(L - gf(L, 1.0))          # pixel grain
    g4 = np.abs(L - gf(L, 4.0))          # small structure
    g16 = np.abs(L - gf(L, 16.0))        # wave-scale structure
    # ORIENTATION COHERENCE, from the structure tensor. This is what separates
    # "streaky" from "mottled": aligned structure gives one dominant gradient
    # direction (coherence -> 1), isotropic speckle gives none (-> 0). Two cells
    # can carry identical energy at every scale and differ entirely in this.
    gy, gx = np.gradient(gf(L, 1.2))
    Jxx, Jyy, Jxy = gf(gx*gx, 3.0), gf(gy*gy, 3.0), gf(gx*gy, 3.0)
    tr = Jxx + Jyy
    det_ = np.sqrt(np.maximum((Jxx - Jyy)**2 + 4*Jxy*Jxy, 0.0))
    coh = (det_ / np.maximum(tr, 1e-9))
    return dict(mean=L.mean(), std=L.std(), sat=sat.mean(),
                grain=g1.mean(), fine=g4.mean(), wave=g16.mean(),
                coherence=float(coh.mean()),
                grainshare=g1.mean() / max(g16.mean(), 1e-5))


def run(ref_path, ours_path, cell=64, out='grid_compare.png'):
    A = np.asarray(Image.open(ref_path).convert('RGB'), np.float32)/255
    B = np.asarray(Image.open(ours_path).convert('RGB'), np.float32)/255
    h = min(A.shape[0], B.shape[0], WM.shape[0]); w = min(A.shape[1], B.shape[1], WM.shape[1])
    A, B, m = A[:h,:w], B[:h,:w], WM[:h,:w]
    rows = []
    for y in range(0, h-cell, cell):
        for x in range(0, w-cell, cell):
            if m[y:y+cell, x:x+cell].mean() < 0.99: continue
            sa, sb = cell_stats(A[y:y+cell, x:x+cell]), cell_stats(B[y:y+cell, x:x+cell])
            rows.append((y, x, sa, sb))
    if not rows:
        print('no all-water cells'); return
    keys = ['mean','std','sat','grain','fine','wave','coherence','grainshare']
    print(f'{"":10}' + ''.join(f'{k:>12}' for k in keys))
    for nm, i in (('reference', 2), ('ours', 3)):
        print(f'{nm:<10}' + ''.join(f'{np.mean([r[i][k] for r in rows]):12.4f}' for k in keys))
    print(f'{"ratio":<10}' + ''.join(
        f'{np.mean([r[3][k] for r in rows])/max(np.mean([r[2][k] for r in rows]),1e-6):12.2f}' for k in keys))
    # worst cells by grain-share disagreement: where ours is grainy and the
    # reference is not, which is the thing being complained about
    rows.sort(key=lambda r: (r[3]['coherence'] - r[2]['coherence']))
    print('\nworst cells (ours grainier than reference at the same place):')
    tiles = []
    for y, x, sa, sb in rows[:4]:
        print(f'  at ({x:4d},{y:4d})  coherence ref {sa["coherence"]:.3f} -> ours {sb["coherence"]:.3f}'
              f'   wave {sa["wave"]:.4f} -> {sb["wave"]:.4f}')
        tiles.append((Image.fromarray((A[y:y+cell, x:x+cell]*255).astype(np.uint8)).resize((192,192), Image.NEAREST),
                      Image.fromarray((B[y:y+cell, x:x+cell]*255).astype(np.uint8)).resize((192,192), Image.NEAREST)))
    sh = Image.new('RGB', (192*2+8, len(tiles)*(192+8)-8), (16,16,20))
    for i,(ta,tb) in enumerate(tiles):
        sh.paste(ta,(0,i*(192+8))); sh.paste(tb,(200,i*(192+8)))
    d = ImageDraw.Draw(sh,'RGBA')
    d.rectangle([0,0,90,18],fill=(0,0,0,215)); d.text((4,3),'reference',fill=(255,255,255,255))
    d.rectangle([200,0,260,18],fill=(0,0,0,215)); d.text((204,3),'ours',fill=(255,255,255,255))
    p = os.path.join(ROOT,'diagnostics','codexref',out)
    sh.save(p); print('wrote', p)


if __name__ == '__main__':
    ref = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT,'refs','canonical','S.png')
    ours = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT,'diagnostics','codexref','final_heavy_crashing_surf.png')
    run(ref, ours)
