"""What the tuned sea looks like from a camera that cannot resolve it.

Every instrument here measures the water at the density it was tuned at. The
wide shot is a different question -- what survives when you stand back -- and it
was being answered by intuition, twice, wrongly.

This answers it by construction. `lfl_build.py` crops the world art and its
authoritative mask to a camera and magnifies until one scene pixel is one TUNED
pixel, which is the density every constant in the offline shaders means something
at. Render that, then downsample by the live camera's own zc, and the result is
exactly what the live layer would show at that camera if it rendered at 1/zc
supersampling. It is not an analogy for the wide shot. It is the wide shot,
without the LoD fade, without the port, and without aliasing.

So any difference between this and the live capture is the fade's doing, and any
difference between this and a sea is the TREATMENT's doing.

    python lfl_build.py wideopen 0.08971 0.4791 0.1594 heavy_crashing_surf
    python wide_target.py wideopen_heavy_crashing_surf 0.1061

Statistics are reported outside the surf zone as well as inside it. That split is
the whole point: the first target quoted for the wide shot was a close-up cliff
plate downsampled, and most of its contrast was surf against rock rather than
ocean, so it was a target for the wrong thing.
"""
import os
import sys

import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
SURF_ZONE_PX = 60.0        # tuned px; past this the water is not surf


def main():
    name = sys.argv[1]
    zc = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1061
    scene = name.split('_')[0]
    render = os.path.join(ROOT, 'diagnostics', name + '.png')
    masks = os.path.join(ROOT, 'scenes', scene, 'masks')

    im = Image.open(render).convert('RGB')
    small = im.resize((max(1, int(im.width * zc)), max(1, int(im.height * zc))),
                      Image.LANCZOS)
    out = os.path.join(ROOT, 'diagnostics', f'{name}_at_zc{zc:g}.png')
    small.save(out)
    print(f'{im.width}x{im.height} tuned px  ->  {small.width}x{small.height} '
          f'at zc {zc:g}')
    print('wrote', out)

    sdf = np.load(os.path.join(masks, 'shore_sdf.npy'))
    sdf = np.asarray(Image.fromarray(sdf).resize(small.size, Image.BILINEAR))
    a = np.asarray(small).astype(np.float32)
    lum = a @ np.array([.299, .587, .114])
    gy, gx = np.gradient(lum)
    ang, mag = np.arctan2(gy, gx), np.hypot(gy, gx)

    for label, band in (('open water', sdf > SURF_ZONE_PX),
                        ('surf zone', (sdf > 0) & (sdf <= SURF_ZONE_PX))):
        if band.sum() < 50:
            print(f'  {label:12s} too few pixels')
            continue
        v = lum[band]
        edge = band & (mag > 2)
        # Orientation coherence: 1 is every gradient pointing the same way, which
        # is what corduroy measures, and 0 is a sea.
        orient = float(np.abs(np.exp(2j * ang[edge]).mean())) if edge.sum() > 50 else float('nan')
        print(f'  {label:12s} n={band.sum():6d}  rgb {np.round(a[band].mean(0), 0)}  '
              f'luma {v.mean():5.1f} sd {v.std():5.2f}  '
              f'bright>150 {100 * (v > 150).mean():5.2f}%  orient {orient:.3f}')


if __name__ == '__main__':
    main()
