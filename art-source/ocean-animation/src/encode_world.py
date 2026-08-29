"""Encode the baked world fields as textures the live layer can sample.

Two field textures at world resolution (1672x941), plus the two tileable noise
textures the offline shaders were tuned against.

  ocean-phase   RG = phase residual, 16 bits   B = |k|         A = depth
  ocean-flow    RG = wave direction            B = signed sdf  A = ray focus

The residual is S minus its deep-water plane wave. That is a precision trick, not
an interpolation one: S spans 2206 rad across the world and will not fit 16 bits
at useful resolution, while the residual spans ~1008 rad and quantises to
0.015 rad = lambda/409. Residual and S differ by a linear function, so they
interpolate identically -- the reconstruction adds the plane wave back in.

The phase texture is sampled NEAREST and interpolated by hand in the shader.
Hardware bilinear would interpolate the high and low BYTES independently, and the
low byte is sawtooth: wherever it wraps 255 -> 0 the hardware ramps it back down
across the texel while the high byte steps up, so the reconstructed phase spikes
by up to 256 quantisation steps every 0.015*256 = 3.9 rad. Decode-then-lerp is
exact and costs four texelFetch.

The signed distance is stored through a signed square root of a CLAMPED range.
The shore band, the swash zone and the spray band are all defined within a couple
of world pixels of zero while the raw field runs to several hundred, so a linear
8-bit encoding would quantise the entire surf zone to two levels. Clamping at
SDF_CLAMP first is what makes the square root worth having: nothing downstream
reads the distance past the point where the shelf has already bottomed out
(OCEAN_SHELF is 9.98 world px, so depth is saturated by ~30), and spending the
byte on that dead range costs a factor of five at the waterline where every band
in the renderer lives.

water_soft is NOT stored: it is a 0.8 px gaussian of the water mask rethresholded,
which is within a per-mille of smoothstep(-0.6, 0.6, sdf). The check below prints
the actual error. Dropping it is what keeps this to two textures.
"""
import json
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCENE = os.environ.get('OCEAN_WORLD_SCENE', 'world')
BAKED = os.path.join(ROOT, 'scenes', _SCENE, 'baked')
OUT = os.path.join(ROOT, 'scenes', _SCENE, 'textures')
# Where the live layer reads them from.
LIVE = os.path.join(os.path.dirname(os.path.dirname(ROOT)),
                    'public', 'career-world', 'layers', 'ocean', 'fields')

REV = 'r2'
SDF_CLAMP = 32.0        # world px; past this every field downstream is constant


def main():
    z = np.load(os.path.join(BAKED, 'primary.npz'))
    b = np.load(os.path.join(BAKED, 'bathymetry.npz'))
    n = np.load(os.path.join(BAKED, 'noise.npz'))
    S = z['S'].astype(np.float64)
    kmag = z['kmag'].astype(np.float64)
    d = z['dir'].astype(np.float64)
    depth = b['depth'].astype(np.float64)
    sdf = b['sdf'].astype(np.float64)
    water = b['water'] > 0
    focus = b['focus'].astype(np.float64)
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

    kMax = float(kmag[water].max())
    dMax = float(depth[water].max())
    fMax = float(focus[water].max())
    sdfMax = SDF_CLAMP
    sdfC = np.clip(sdf, -sdfMax, sdfMax)

    q = np.round(Rn * 65535.0).astype(np.uint32)
    phase = np.zeros((H, W, 4), np.uint8)
    phase[..., 0] = (q >> 8).astype(np.uint8)          # high byte
    phase[..., 1] = (q & 0xFF).astype(np.uint8)        # low byte
    phase[..., 2] = np.round(np.clip(kmag / kMax, 0, 1) * 255).astype(np.uint8)
    phase[..., 3] = np.round(np.clip(depth / dMax, 0, 1) * 255).astype(np.uint8)

    sEnc = 0.5 + 0.5 * np.sign(sdfC) * np.sqrt(np.abs(sdfC) / sdfMax)
    flow = np.zeros((H, W, 4), np.uint8)
    flow[..., 0] = np.round(np.clip(d[..., 0] * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)
    flow[..., 1] = np.round(np.clip(d[..., 1] * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)
    flow[..., 2] = np.round(np.clip(sEnc, 0, 1) * 255).astype(np.uint8)
    flow[..., 3] = np.round(np.clip(focus / fMax, 0, 1) * 255).astype(np.uint8)

    for target in (OUT, LIVE):
        os.makedirs(target, exist_ok=True)
        Image.fromarray(phase).save(os.path.join(target, f'ocean-phase-{REV}.png'))
        Image.fromarray(flow).save(os.path.join(target, f'ocean-flow-{REV}.png'))
        for name, arr in (('ocean-noise', n['noise']), ('ocean-noise-fine', n['noise_fine'])):
            Image.fromarray(np.round(np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(
                os.path.join(target, f'{name}-{REV}.png'))

    # ---- round-trip: decode exactly as the shader will --------------------
    qd = (phase[..., 0].astype(np.uint32) << 8) | phase[..., 1].astype(np.uint32)
    Sd = qd / 65535.0 * (hi - lo) + lo + base
    err = np.abs(np.cos(S) - np.cos(Sd))
    print(f'residual span {hi-lo:.1f} rad -> 16 bits = {(hi-lo)/65535:.5f} rad/step '
          f'= lambda/{2*np.pi/((hi-lo)/65535):,.0f}')
    print(f'round-trip cos(S):  mean {err[water].mean():.5f}  '
          f'p99.9 {np.percentile(err[water],99.9):.5f}  max {err[water].max():.5f}')

    sD = np.sign(flow[..., 2].astype(np.float64) / 255.0 * 2.0 - 1.0) * \
        (flow[..., 2].astype(np.float64) / 255.0 * 2.0 - 1.0) ** 2 * sdfMax
    near = np.abs(sdfC) < 4
    print(f'round-trip sdf:     max err {np.abs(sD - sdfC).max():.3f} world px over the '
          f'clamped range, {np.abs(sD - sdfC)[near].max():.4f} within 4 world px of the '
          f'shore (the whole surf zone)')

    ws = np.load(os.path.join(os.path.dirname(BAKED), 'masks', 'water_soft.npy'))
    approx = np.clip((sdf + 0.6) / 1.2, 0, 1)
    approx = approx * approx * (3 - 2 * approx)
    print(f'water_soft vs smoothstep(-0.6,0.6,sdf):  mean |err| {np.abs(approx-ws).mean():.5f}  '
          f'max {np.abs(approx-ws).max():.4f}  over {(np.abs(approx-ws)>0.05).mean()*100:.3f}% of pixels')

    meta = dict(revision=REV, world=[W, H],
                residualLo=lo, residualSpan=hi - lo,
                planeK0=k0, planeDir=[d0[0], d0[1]],
                kMax=kMax, depthMax=dMax, focusMax=fMax, sdfMax=sdfMax,
                lambdaWorld=float(os.environ.get('WORLD_LAMBDA', 5.0)))
    with open(os.path.join(OUT, f'world-fields-{REV}.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, indent=2)

    total = 0
    for f in sorted(os.listdir(LIVE)):
        p = os.path.join(LIVE, f)
        total += os.path.getsize(p)
        print(f'  {f:32s}{os.path.getsize(p)/1e6:8.2f} MB')
    print(f'  {"total":32s}{total/1e6:8.2f} MB')
    print('\nshader reconstruction:')
    print(f'  S = (hi*256 + lo)/65535 * {hi-lo:.4f} + ({lo:.4f})'
          f' + {k0:.6f} * dot(worldPx, vec2({d0[0]:.6f}, {d0[1]:.6f}))')


if __name__ == '__main__':
    main()
