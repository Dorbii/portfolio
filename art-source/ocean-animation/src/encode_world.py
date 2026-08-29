"""Encode the baked world fields as textures the live layer can sample.

Two textures, both at world resolution (1672x941), which is enough: storing the
field an octave COARSER than this still gives a mean cos(S) error of 0.002, so
resolution is not the constraint. S is smooth -- |grad S| = k by construction and
its direction turns slowly -- so it is locally near-linear and bilinear
interpolation is nearly exact.

  phase.png     RG = the phase residual in 16 bits, B = |k|, A = depth
  flow.png      RG = wave direction, B = shore distance, A = water

The residual is S minus its deep-water plane wave. That is a precision trick, not
an interpolation one: S spans 2206 rad across the world and will not fit 16 bits
at useful resolution, while the residual spans 1008 rad and quantises to 0.015 rad
= lambda/409. Residual and S differ by a linear function, so they interpolate
identically -- the reconstruction adds the plane wave back in the shader.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAKED = os.path.join(ROOT, 'scenes', 'world', 'baked')
OUT = os.path.join(ROOT, 'scenes', 'world', 'textures')


def main():
    z = np.load(os.path.join(BAKED, 'primary.npz'))
    b = np.load(os.path.join(BAKED, 'bathymetry.npz'))
    S = z['S'].astype(np.float64)
    kmag = z['kmag'].astype(np.float64)
    d = z['dir'].astype(np.float64)
    depth, sdf, water = b['depth'].astype(np.float64), b['sdf'].astype(np.float64), b['water'] > 0
    H, W = S.shape

    deep = water & (sdf > np.percentile(sdf[water], 90))
    d0 = np.array([d[..., 0][deep].mean(), d[..., 1][deep].mean()])
    d0 /= np.linalg.norm(d0)
    k0 = float(np.median(kmag[deep]))
    yy, xx = np.mgrid[0:H, 0:W]
    base = k0 * (xx * d0[0] + yy * d0[1])
    R = S - base
    lo, hi = float(R[water].min()), float(R[water].max())
    Rn = np.clip((R - lo) / (hi - lo), 0.0, 1.0)

    q = np.round(Rn * 65535.0).astype(np.uint32)
    phase = np.zeros((H, W, 4), np.uint8)
    phase[..., 0] = (q >> 8).astype(np.uint8)          # high byte
    phase[..., 1] = (q & 0xFF).astype(np.uint8)        # low byte
    phase[..., 2] = np.clip(kmag / max(kmag[water].max(), 1e-9) * 255, 0, 255).astype(np.uint8)
    phase[..., 3] = np.clip(depth / max(depth[water].max(), 1e-9) * 255, 0, 255).astype(np.uint8)

    flow = np.zeros((H, W, 4), np.uint8)
    flow[..., 0] = np.clip((d[..., 0] * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    flow[..., 1] = np.clip((d[..., 1] * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    sd = np.clip(sdf / max(sdf[water].max(), 1e-9), 0, 1)
    flow[..., 2] = np.clip(sd * 255, 0, 255).astype(np.uint8)
    flow[..., 3] = (water * 255).astype(np.uint8)

    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(phase).save(os.path.join(OUT, 'ocean-phase-r1.png'))
    Image.fromarray(flow).save(os.path.join(OUT, 'ocean-flow-r1.png'))

    # round-trip: decode exactly as the shader will and measure what was lost
    qd = (phase[..., 0].astype(np.uint32) << 8) | phase[..., 1].astype(np.uint32)
    Rd = qd / 65535.0 * (hi - lo) + lo
    Sd = Rd + base
    err = np.abs(np.cos(S) - np.cos(Sd))
    print(f'residual span {hi-lo:.1f} rad -> 16 bits = {(hi-lo)/65535:.5f} rad/step '
          f'= lambda/{2*np.pi/((hi-lo)/65535):,.0f}')
    print(f'round-trip error in cos(S): mean {err[water].mean():.5f}  '
          f'p99.9 {np.percentile(err[water],99.9):.5f}  max {err[water].max():.5f}')
    for f in ('ocean-phase-r1.png', 'ocean-flow-r1.png'):
        p = os.path.join(OUT, f)
        print(f'  {f}  {os.path.getsize(p)/1e6:.2f} MB')
    print('\nshader reconstruction:')
    print(f'  S = (R_hi*256 + R_lo)/65535 * {hi-lo:.4f} + ({lo:.4f})'
          f' + {k0:.6f} * dot(worldPx, vec2({d0[0]:.6f}, {d0[1]:.6f}))')


if __name__ == '__main__':
    main()
