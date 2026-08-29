"""Bake the wave fields the live layer needs, for the whole world, once.

The live renderer has no eikonal solver and should not have one: the coastline is
fixed once set, so the phase field is an ASSET, not a runtime cost. This solves it
at world scale and writes textures the shader can sample.

Scale: the primary swell is ~5 world pixels. At the closest camera (span 0.04)
the viewport shows 66.9 world px at about 24x, so a 5 px wave reads near 120
screen px; at world zoom the same wave is 4.8 screen px, which is correctly fine
texture rather than visible swell. It also keeps the sea in deep water almost
everywhere (d/lambda ~0.9), so waves stay straight offshore and refract only at
the coast -- the contour-following look came from a wavelength large enough to
feel the whole basin.

precompute.build is used rather than wavefield.build because the live shader also
needs the ray-focus field (a gaussian-smoothed divergence, not something a shader
can reconstruct) and the two tileable noise textures, which have to be the SAME
noise the offline renderer was tuned against or every scale-dependent constant in
composite.frag is tuned for a different field.
"""
import os, sys
import numpy as np

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'world')
LAMBDA_WORLD = float(os.environ.get('WORLD_LAMBDA', 5.0))


def main():
    os.environ['OCEAN_ROOT'] = WS
    os.environ['OCEAN_CALM_REFS'] = ''
    T = 2.36                                   # primary period, seconds
    G = LAMBDA_WORLD * 2.0 * np.pi / (T * T)   # L0 = G T^2 / 2pi
    os.environ['OCEAN_G'] = str(G)
    os.environ['OCEAN_DEPTH'] = str(105.0 * G / 130.0)
    os.environ['OCEAN_SHELF'] = str(230.0 * G / 130.0)
    sys.path.insert(0, SRC)
    import presets, precompute
    p = presets.PRESETS['windy_rolling_surf']
    print(f'world bake: lambda {LAMBDA_WORLD} px  ->  OCEAN_G {G:.4f}  '
          f'depth {float(os.environ["OCEAN_DEPTH"]):.2f}px  shelf {float(os.environ["OCEAN_SHELF"]):.2f}px')
    fields, depth, water, sdf, extra, _sites = precompute.build(p['families'])
    out = os.path.join(WS, 'baked')
    os.makedirs(out, exist_ok=True)
    print()
    print(f'{"family":10s}{"lambda (world px)":>20}{"samples/wave":>15}  verdict')
    for name in ('primary', 'secondary', 'chop'):
        f = fields[name]
        S, d, kmag = f['S'], f['dir'], f['kmag']
        lam = 2.0 * np.pi / float(np.nanmedian(kmag))
        # A field stored on the world grid needs several samples per wavelength to
        # survive interpolation. Below ~3 it cannot be an asset at this resolution
        # and has to be generated in screen space when the camera is close enough
        # to resolve it -- which is also the only zoom where it should be visible.
        verdict = 'bake' if lam >= 3.0 else 'SCREEN-SPACE ONLY (sub-pixel at world scale)'
        print(f'{name:10s}{lam:20.2f}{lam:15.1f}  {verdict}')
        if lam >= 3.0:
            np.savez_compressed(os.path.join(out, f'{name}.npz'),
                                S=S.astype(np.float32), kmag=kmag.astype(np.float32),
                                dir=d.astype(np.float32))
    np.savez_compressed(os.path.join(out, 'bathymetry.npz'),
                        depth=depth.astype(np.float32), sdf=sdf.astype(np.float32),
                        water=water.astype(np.uint8),
                        focus=extra['focus'].astype(np.float32))
    np.savez_compressed(os.path.join(out, 'noise.npz'),
                        noise=extra['noise'].astype(np.float32),
                        noise_fine=extra['noise_fine'].astype(np.float32))
    print('wrote', out)


if __name__ == '__main__':
    main()
