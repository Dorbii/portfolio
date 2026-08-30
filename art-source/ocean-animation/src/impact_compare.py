"""The BAKED impact-site field against the analytic one the port reconstructs.

Spray fires when breaking * site * nearRock crosses uGate, and uGate was tuned
against the baked field. The live layer has no room for that texture, so
export_web reconstructs `site` analytically from the shoreline distance -- and
measured live, spray.a was flat zero at the tuned gate of 0.33. Dropping the gate
to 0.0066 made it fire and 0.05 did not, so live `strength` peaked near
0.01-0.05: the reconstruction was an order of magnitude weaker than the field it
stands in for.

Compare the FIELD, not the spray. At world zoom the offline's own spray is nearly
dead as well -- geom.breaking crosses 0.1 on 0.59% of the frame and spray.a tops
out at 0.016 -- so "the offline has spray and we do not" is not a claim this
scene can carry either way. What it can carry is whether `site` fires where the
baked one does, which is a property of the coastline and not of the sea state.

This prints both distributions on the same scene so the reconstruction can be
matched to the thing it replaces, rather than the gate being dialled down to hide
the difference.

    python impact_compare.py <scene> [state]
"""
import os
import subprocess
import sys

import numpy as np

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)


def summarise(label, a, mask):
    v = a[mask]
    if v.size < 50:
        print('  %-24s (empty)' % label)
        return
    print('  %-24s mean %7.4f  p95 %7.4f  p99 %7.4f  max %7.4f  >0.33 %6.3f%%'
          % (label, v.mean(), np.percentile(v, 95), np.percentile(v, 99), v.max(),
             100 * (v > 0.33).mean()))


def main():
    scene = sys.argv[1]
    state = sys.argv[2] if len(sys.argv) > 2 else 'heavy_crashing_surf'
    ws = os.path.join(ROOT, 'scenes', scene)
    if os.environ.get('IC') != '1':
        env = dict(os.environ, OCEAN_ROOT=ws, PYTHONPATH=SRC, OCEAN_CALM_REFS='',
                   OCEAN_G='130.0', OCEAN_DEPTH='105.0', OCEAN_SHELF='230.0', IC='1')
        raise SystemExit(subprocess.run(
            [sys.executable, os.path.abspath(__file__)] + sys.argv[1:], env=env).returncode)

    sys.path.insert(0, SRC)
    import precompute
    import presets
    import wavefield as wf
    p = presets.PRESETS[state]
    _fields, _depth, water, sdf, extra, _sites = precompute.build(p['families'])
    impact = extra['impact']

    # The band the spray actually samples: near the rock and inside the site band.
    near = water & (sdf > 0.5) & (sdf < 26.0)
    print(f'{scene}  {state}   sdf band 0.5..26 px, {near.sum()} px')
    summarise('BAKED impact', impact, near)

    # The analytic reconstruction, in numpy, exactly as export_web writes it.
    gy, gx = np.gradient(sdf)
    n = np.hypot(gx, gy) + 1e-6
    d = np.array(p['families']['primary'][0], dtype=float)
    d /= np.linalg.norm(d)
    exposure = np.clip(-((gx / n) * d[0] + (gy / n) * d[1]), 0.0, 1.0)
    lap = (np.roll(sdf, 1, 1) + np.roll(sdf, -1, 1)
           + np.roll(sdf, 1, 0) + np.roll(sdf, -1, 0) - 4.0 * sdf)
    protrude = np.clip(-lap, 0.0, 2.0)

    def sstep(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)

    band = sstep(0.5, 3.0, sdf) * (1.0 - sstep(9.0, 16.0, sdf))
    # `acc` peaks near 1 at a site and decays over sigma 13 in a 90 px cell; its
    # ceiling is what matters for the comparison, so take the optimistic 1.0.
    analytic = np.clip(1.0 * exposure * (0.35 + 0.95 * protrude) * band, 0, 1)
    summarise('ANALYTIC (acc = 1)', analytic, near)

    # ...and with the jittered lattice the shader actually uses, which is the
    # honest version: a site is a Gaussian of sigma 13 in a 90 px cell, so most
    # of the band sits far from one.
    h, w = sdf.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    cell, sigma = 90.0, 13.0
    acc = np.zeros_like(sdf, dtype=np.float64)
    rng = np.random.default_rng(37)
    cx0, cy0 = np.floor(xx / cell), np.floor(yy / cell)
    for j in (-1, 0, 1):
        for i in (-1, 0, 1):
            cxi, cyi = cx0 + i, cy0 + j
            key = (cxi.astype(np.int64) * 73856093) ^ (cyi.astype(np.int64) * 19349663)
            key = key.astype(np.float64)
            r = np.abs(np.sin(key * 0.0001)) % 1.0
            r2 = np.abs(np.sin(key * 0.00013 + 2.1)) % 1.0
            r3 = np.abs(np.sin(key * 0.00017 + 5.3)) % 1.0
            live = (np.abs(np.sin(key * 0.00021 + 1.7)) % 1.0) <= 0.62
            d = np.hypot(xx - (cxi + r) * cell, yy - (cyi + r2) * cell) / sigma
            acc = np.maximum(acc, np.where(live, np.exp(-0.5 * d * d) * (0.45 + 0.75 * r3), 0.0))
    full = np.clip(acc * exposure * (0.35 + 0.95 * protrude) * band, 0, 1)
    summarise('ANALYTIC (real lattice)', full, near)

    # PROPOSED. Two changes, both from the decomposition above:
    #  - the score SELECTS rather than scales. The baked field chooses sites by
    #    exposure and protrusion and then draws each at full strength; the
    #    analytic multiplied by the same score it should have chosen with, so a
    #    perfectly good site at score 0.3 came out at 0.3.
    #  - the lattice cell shrinks. Over this band a 90 px cell yields about eight
    #    live sites where impact_sites places fifty-four, because the lattice is
    #    two-dimensional and the band is a thin curve through it.
    for cell2, sig2 in ((34.0, 13.0), (34.0, 16.0), (28.0, 13.0), (28.0, 16.0)):
        acc2 = np.zeros_like(sdf, dtype=np.float64)
        cx0b, cy0b = np.floor(xx / cell2), np.floor(yy / cell2)
        for j in (-1, 0, 1):
            for i in (-1, 0, 1):
                cxi, cyi = cx0b + i, cy0b + j
                key = (cxi.astype(np.int64) * 73856093) ^ (cyi.astype(np.int64) * 19349663)
                key = key.astype(np.float64)
                r = np.abs(np.sin(key * 0.0001)) % 1.0
                r2 = np.abs(np.sin(key * 0.00013 + 2.1)) % 1.0
                r3 = np.abs(np.sin(key * 0.00017 + 5.3)) % 1.0
                live = (np.abs(np.sin(key * 0.00021 + 1.7)) % 1.0) <= 0.62
                d = np.hypot(xx - (cxi + r) * cell2, yy - (cyi + r2) * cell2) / sig2
                acc2 = np.maximum(acc2, np.where(live, np.exp(-0.5 * d * d) * (0.45 + 0.75 * r3), 0.0))
        score = exposure * (0.35 + 0.95 * protrude) * band
        prop = np.clip(acc2 * sstep(0.06, 0.34, score), 0, 1)
        summarise('PROPOSED cell %.0f sig %.0f' % (cell2, sig2), prop, near)

    # The gain that would make the analytic cross the gate as often as the baked
    # field does. Matching the RATE the spray fires, not the peak value.
    target = 100 * (impact[near] > 0.33).mean()
    v = full[near]
    t = np.percentile(v, 100 - target) if 0 < target < 100 else None
    if t and t > 1e-6:
        print('  gain to match the baked firing rate of %.2f%%: %.2fx' % (target, 0.33 / t))
    for name, arr in (('  exposure', exposure), ('  protrude', protrude),
                      ('  band', band)):
        summarise(name, arr, near)


if __name__ == '__main__':
    main()
