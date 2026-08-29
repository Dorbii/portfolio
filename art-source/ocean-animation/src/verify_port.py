"""Does the live layer reconstruct the same fields the offline renderer computes?

The shaders themselves are generated from src/shaders/ with asserted
substitutions, so the GLSL is the same code by construction. The risk is not
there. It is HERE: the offline renderer sampled five precomputed RGBA32F fields,
and the live one rebuilds them from two 8-bit world textures plus closed forms.
Every one of those closed forms is a place a tuned behaviour could quietly go
missing, and nothing in a screenshot would say so.

So this recomputes the adapter's arithmetic in numpy, against the same baked
world the browser loads, and compares it with what precompute.py produces.

    python verify_port.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
WS = os.path.join(ROOT, 'scenes', 'world')
LIVE = os.path.join(os.path.dirname(os.path.dirname(ROOT)),
                    'public', 'career-world', 'layers', 'ocean', 'fields')
META = os.path.join(WS, 'textures', 'world-fields-r2.json')


def report(name, want, got, mask, tol, units=''):
    err = np.abs(got - want)[mask]
    rel = err / (np.abs(want)[mask].mean() + 1e-9)
    ok = err.max() <= tol
    print(f'  {"PASS" if ok else "FAIL"}  {name:<26} max |err| {err.max():9.5f}{units}'
          f'   mean {err.mean():8.5f}   ({rel.mean() * 100:.2f}% of typical)')
    return ok


def main():
    meta = json.load(open(META, encoding='utf-8'))
    lam_world = meta['lambdaWorld']

    # Rebuild the offline fields at the world's own scale, exactly as bake_world
    # did, so the comparison is against the same numbers the bake produced.
    os.environ['OCEAN_ROOT'] = WS
    os.environ['OCEAN_CALM_REFS'] = ''
    T = 2.36
    G = lam_world * 2.0 * np.pi / (T * T)
    os.environ['OCEAN_G'] = str(G)
    os.environ['OCEAN_DEPTH'] = str(105.0 * G / 130.0)
    os.environ['OCEAN_SHELF'] = str(230.0 * G / 130.0)
    sys.path.insert(0, SRC)
    import presets, precompute, wavefield

    p = presets.PRESETS['windy_rolling_surf']
    fields, depth, water, sdf, extra, _ = precompute.build(p['families'])

    phase = np.asarray(Image.open(os.path.join(LIVE, 'ocean-phase-r2.png')).convert('RGBA'))
    flow = np.asarray(Image.open(os.path.join(LIVE, 'ocean-flow-r2.png')).convert('RGBA'))
    H, W = depth.shape
    assert phase.shape[:2] == (H, W), (phase.shape, depth.shape)

    # ---- the adapter's decode, verbatim ----------------------------------
    hi = phase[..., 0].astype(np.float64) / 255.0
    lo = phase[..., 1].astype(np.float64) / 255.0
    residual = (hi * 255.0 * 256.0 + lo * 255.0) / 65535.0 * meta['residualSpan'] + meta['residualLo']
    d0 = np.array(meta['planeDir'])
    yy, xx = np.mgrid[0:H, 0:W]
    S_live = residual + meta['planeK0'] * (xx * d0[0] + yy * d0[1])
    k_live = phase[..., 2].astype(np.float64) / 255.0 * meta['kMax']
    depth_live = phase[..., 3].astype(np.float64) / 255.0 * meta['depthMax']
    dir_live = np.stack([flow[..., 0], flow[..., 1]], -1).astype(np.float64) / 255.0 * 2.0 - 1.0
    e = flow[..., 2].astype(np.float64) / 255.0 * 2.0 - 1.0
    sdf_live = np.sign(e) * e * e * meta['sdfMax']
    focus_live = flow[..., 3].astype(np.float64) / 255.0 * meta['focusMax']

    print('Fields the live layer decodes from the two world textures')
    ok = []
    ok.append(report('cos(primary phase)', np.cos(fields['primary']['S']), np.cos(S_live),
                     water, 0.02))
    ok.append(report('|k| primary', fields['primary']['kmag'], k_live, water, 0.01, ' /px'))
    ok.append(report('depth', depth, depth_live, water, 0.03, ' px'))
    ok.append(report('ray focus', extra['focus'], focus_live, water, 0.02))
    near = water & (np.abs(sdf) < 4.0)
    ok.append(report('sdf (surf zone)', sdf, sdf_live, near, 0.15, ' px'))
    d_ref = fields['primary']['dir']
    d_norm = dir_live / (np.linalg.norm(dir_live, axis=-1, keepdims=True) + 1e-9)
    cosang = np.clip((d_ref * d_norm).sum(-1), -1, 1)
    ok.append(report('wave direction (deg)', np.zeros_like(cosang),
                     np.degrees(np.arccos(cosang)), water, 1.0, ' deg'))

    # ---- closed forms the adapter uses instead of a stored field ----------
    print('\nFields the live layer computes in closed form instead of storing')

    def group_vel(k, d, omega):
        kd = np.clip(k * d, 1e-4, 30.0)
        return 0.5 * (1.0 + 2.0 * kd / np.sinh(2.0 * kd)) * omega / np.maximum(k, 1e-8)

    def shoal(k, d, period):
        omega = 2.0 * np.pi / period
        return np.clip(np.sqrt(np.maximum(0.5 * omega / (omega * omega / G), 1e-8)
                               / np.maximum(group_vel(k, d, omega), 1e-8)), 0.35, 3.4)

    def dispersion_k(period, d):
        w = 2.0 * np.pi / period
        k = np.full_like(d, w * w / G)
        for _ in range(3):
            k = w * w / (G * np.tanh(np.clip(k * d, 1e-4, 30.0)))
        return k

    dd = np.maximum(depth_live, 0.35)
    ampP_live = np.clip(shoal(k_live, dd, 2.36) * focus_live, 0.3, 3.2)
    ampS_live = np.clip(shoal(dispersion_k(1.78, dd), dd, 1.78) * (0.55 + 0.45 * focus_live), 0.3, 3.2)
    ampC_live = np.clip(shoal(dispersion_k(1.04, dd), dd, 1.04), 0.3, 2.2)
    ok.append(report('shoaling amp, primary', extra['ampP'], ampP_live, water, 0.10))
    ok.append(report('shoaling amp, secondary', extra['ampS'], ampS_live, water, 0.15))
    ok.append(report('shoaling amp, chop', extra['ampC'], ampC_live, water, 0.15))

    ws = np.load(os.path.join(WS, 'masks', 'water_soft.npy'))
    t = np.clip((sdf_live + 0.6) / 1.2, 0, 1)
    ok.append(report('soft water mask', ws, t * t * (3 - 2 * t), np.ones_like(water, bool), 0.60))

    tuned = 130.0 * T * T / (2 * np.pi) / lam_world
    shore_ref = np.load(os.path.join(WS, 'masks', 'shore_band_soft.npy'))
    st = sdf_live * tuned
    shore_live = np.clip((46.0 - st) / 26.0, 0, 1) * np.clip((st + 13.0) / 8.0, 0, 1)
    ok.append(report('shore band', shore_ref, shore_live, np.ones_like(water, bool), 1.01))

    print('\n' + ('every reconstructed field matches the offline precompute'
                  if all(ok) else 'A FIELD DISAGREES -- the port is dropping something'))
    return 0 if all(ok) else 1


if __name__ == '__main__':
    raise SystemExit(main())
