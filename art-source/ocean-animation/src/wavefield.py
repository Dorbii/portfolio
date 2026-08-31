"""Wave phase fields solved from the scene's own bathymetry.

For a wave train of fixed angular frequency w, the phase function S(x) obeys the
eikonal equation |grad S| = k(x), where k comes from the linear dispersion
relation  w^2 = g k tanh(k d).  Solving that once per wave family buys, for free
and correctly:

  * shoaling      - k rises as depth falls, so crests bunch up near the coast
  * refraction    - grad S turns toward the shore normal, crests go shore-parallel
  * diffraction   - min-arrival propagation wraps waves around stacks and headlands
  * focusing      - rays converge on protruding rock, so headlands get hit hardest

The renderer then only needs  theta = S(x) - w t, which is guaranteed to be a
travelling wave: the level sets of S - wt move at speed w/|grad S| along grad S.

Everything is in pixel units. `G` is a picture-space gravity chosen for pleasing
crest speed, not for physical fidelity - the source painting's ocean is not to
architectural scale.
"""
import os
import numpy as np
from scipy import ndimage as ndi

# OCEAN_ROOT lets a study (e.g. the closeup concept) run the whole pipeline
# against a different workspace without forking any of it.
ROOT = os.environ.get('OCEAN_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASKS = os.path.join(ROOT, 'masks')
CACHE = os.path.join(ROOT, 'work', 'wavefield_cache')
os.makedirs(CACHE, exist_ok=True)

G = float(os.environ.get('OCEAN_G', 130.0))   # picture-space gravity, px/s^2
# Open sea depth was 58 px -- barely twice the heavy state's significant wave
# height, so H/d reached ~0.5 offshore and waves genuinely satisfied the breaking
# criterion in "deep" water, accumulating into white slabs. Real open ocean is
# deep relative to its waves. The shelf length is raised with it so the surf zone
# keeps a sensible width instead of collapsing onto the shoreline.
DEPTH_SCALE = float(os.environ.get('OCEAN_DEPTH', 105.0))  # depth of the open sea, px
SHELF = float(os.environ.get('OCEAN_SHELF', 230.0))        # e-folding length of the shelf, px
MIN_DEPTH = 0.55     # TUNED px, keeps the dispersion solve finite at the waterline

# Scene pixels per TUNED pixel. The plate was authored where these were the same
# thing; a world baked at 24 world px a wave is 4.8 tuned px to the pixel.
PX = G / 130.0


def bathymetry():
    """Depth in pixel units from the shoreline SDF."""
    sdf = np.load(os.path.join(MASKS, 'shore_sdf.npy'))
    water = np.load(os.path.join(MASKS, 'water_soft.npy')) > 0.5
    d = DEPTH_SCALE * (1.0 - np.exp(-np.maximum(sdf, 0.0) / SHELF))
    # Six TUNED px, and a waterline floor in tuned px too.
    #
    # This kernel sits on the steepest part of the shelf, which is the part
    # BREAKING is gated on -- and breaking is what puts whitewater on a shore.
    # Written in scene pixels it was 6 tuned px on the plate and 29 on the world,
    # so the live sea's water was up to 2.2x too deep inside the surf zone, the
    # depth gate stayed shut, and the energy that should have broken went
    # offshore as whitecaps instead. Measured against a like-for-like scene the
    # depth profiles agreed to 1% beyond 30 tuned px and diverged sharply inside
    # it, which is this kernel's width. DEPTH_SCALE and SHELF need no conversion:
    # they arrive already scaled, from OCEAN_DEPTH and OCEAN_SHELF.
    d = ndi.gaussian_filter(d, 6.0 * PX)
    d = np.maximum(d, MIN_DEPTH * PX)
    return d.astype(np.float32), water, sdf


def wavenumber(omega, depth):
    """Solve w^2 = g k tanh(k d) for k, vectorised fixed point."""
    k = np.full_like(depth, omega * omega / G)          # deep-water start
    for _ in range(40):
        t = np.tanh(np.clip(k * depth, 1e-4, 30.0))
        k = omega * omega / (G * t)
    return k.astype(np.float32)


def _sweep(S, F, free, order):
    """One Gauss-Seidel Godunov sweep. Sequential along one axis, vectorised on
    the other, which converges in tens of iterations rather than thousands."""
    H, W = S.shape
    if order in (0, 1):                      # sweep along y
        rows = range(1, H - 1) if order == 0 else range(H - 2, 0, -1)
        for y in rows:
            a = np.minimum(S[y - 1, :], S[y + 1, :])
            b = np.minimum(np.r_[S[y, 1], S[y, :-1]], np.r_[S[y, 1:], S[y, -2]])
            S[y, :] = _godunov(S[y, :], a, b, F[y, :], free[y, :])
    else:                                    # sweep along x
        cols = range(1, W - 1) if order == 2 else range(W - 2, 0, -1)
        for x in cols:
            a = np.minimum(np.r_[S[1, x], S[:-1, x]], np.r_[S[1:, x], S[-2, x]])
            b = np.minimum(S[:, x - 1], S[:, x + 1])
            S[:, x] = _godunov(S[:, x], a, b, F[:, x], free[:, x])
    return S


def _godunov(cur, a, b, f, free):
    lo = np.minimum(a, b)
    hi = np.maximum(a, b)
    diff = hi - lo
    one = lo + f
    disc = np.maximum(2.0 * f * f - diff * diff, 0.0)
    two = 0.5 * (a + b + np.sqrt(disc))
    cand = np.where(diff >= f, one, two)
    cand = np.where(np.isfinite(lo), cand, np.inf)
    return np.where(free, np.minimum(cur, cand), cur)


SS = 1          # eikonal supersampling factor (2 was tried: no benefit, see docs)


def solve_phase(direction, period, water, depth, seed_px=16, iters=26, tag=''):
    """Eikonal phase field for one wave family.

    direction : (dx, dy) unit vector the train travels along (image axes, y down)
    period    : seconds
    Returns S (radians, offset to min 0 over water), k, and the local
    propagation direction grad S / |grad S|.
    """
    H0, W0 = depth.shape
    omega = 2.0 * np.pi / period
    k_out = wavenumber(omega, depth)
    k0 = float(omega * omega / G)                      # deep-water wavenumber

    # Solve on a finer grid, then average down. A first-order Godunov update on a
    # 5-point stencil carries O(h) error that is worst for diagonal propagation --
    # here it left ~0.03 rad of phase roughness, which becomes gradient noise of
    # the same size against a wavenumber of only 0.057/px. Halving h halves that
    # error, and the 2x2 box average removes another factor. All the physics
    # (shoaling, refraction, diffraction round the stacks) is retained.
    depth = ndi.zoom(depth, SS, order=1)
    water = ndi.zoom(water.astype(np.float32), SS, order=1) > 0.5
    # The march must see ONE connected sea. The mask may now carry lakes and
    # pocket bays (real water, kept for coverage/sdf/depth); marching cannot
    # reach them from the edge seeds, and a water cell the march never reaches
    # holds S = inf, which the land-extrapolation below deliberately skips for
    # water. Mask them to land HERE so they take the same smooth extrapolated
    # phase land does, instead of poisoning the field with inf.
    _lab, _n = ndi.label(water)
    if _n > 1:
        water = _lab == int(np.argmax(ndi.sum(water, _lab, range(1, _n + 1)))) + 1
    H, W = depth.shape
    k = wavenumber(omega, depth) / float(SS)           # per fine-grid cell
    seed_px = seed_px * SS

    dx, dy = direction / np.linalg.norm(direction)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # xx/yy index the FINE grid, so the seed ramp must use the per-fine-cell
    # wavenumber. Using the coarse k0 here made the seed SS times too steep, and
    # the solver then fought it -- which is what blew the roughness up 7x.
    S0 = (k0 / float(SS)) * (dx * xx + dy * yy)
    S0 -= S0.min()

    # Seed the upstream frame edges: whichever edges the train enters through.
    seed = np.zeros((H, W), bool)
    if dx > 0: seed[:, :seed_px] = True
    if dx < 0: seed[:, -seed_px:] = True
    if dy > 0: seed[:seed_px, :] = True
    if dy < 0: seed[-seed_px:, :] = True
    seed &= water

    S = np.where(seed, S0, np.inf).astype(np.float64)
    S[~water] = np.inf                                  # land blocks propagation
    free = water & ~seed
    F = k.astype(np.float64)                            # |grad S| = k

    prev = None
    for it in range(iters):
        for order in (0, 2, 1, 3):
            S = _sweep(S, F, free, order)
        fin = np.isfinite(S) & water
        cur = float(S[fin].sum())
        if prev is not None and abs(cur - prev) < 1e-6 * max(abs(prev), 1.0):
            print(f'      [{tag}] converged at sweep {it + 1}')
            break
        prev = cur

    Sf = np.array(S, np.float32)
    bad = ~np.isfinite(Sf)
    if bad.any():                                        # deep shadow pockets
        Sf[bad] = 0.0
        Sf = np.where(bad, ndi.gaussian_filter(Sf, 9.0) / np.maximum(ndi.gaussian_filter((~bad).astype(np.float32), 9.0), 1e-4), Sf)
    Sf = np.where(water, Sf, ndi.gaussian_filter(np.where(water, Sf, 0), 5.0 * SS) /
                  np.maximum(ndi.gaussian_filter(water.astype(np.float32), 5.0 * SS), 1e-4))
    # average down to the render grid
    Sf = Sf.reshape(H0, SS, W0, SS).mean(axis=(1, 3)).astype(np.float32)
    water = water.reshape(H0, SS, W0, SS).mean(axis=(1, 3)) > 0.5
    k = k_out
    # ---- correct the solved phase against the analytic plane wave -----------
    # A single primary component with no spread and no harmonics still rendered
    # as blobs rather than bands, which means the PHASE is wrong at 20-60 px
    # scale. First-order Godunov on a 5-point stencil is strongly anisotropic for
    # diagonal propagation, and this swell runs at ~62 degrees. (Supersampling was
    # tried: it changed the gradient excess by 3%, so the error is not O(h) here.)
    #
    # The fix uses the structure of the problem. Write the solution as the exact
    # plane wave plus a correction, D = S - k0*(d.x). D holds two things: the
    # genuine shoaling/refraction correction, which is LARGE-scale and smooth,
    # and the solver's anisotropy error, which is smaller-scale. Smoothing D keeps
    # the physics and discards the error -- deep water returns to a clean plane
    # wave while the shelf keeps its refraction.
    S_plane = (k0 * (dx * xx + dy * yy)).astype(np.float32)
    D = Sf - S_plane
    D = np.where(water, D, 0.0)
    wgt = water.astype(np.float32)
    lam = 2.0 * np.pi / np.maximum(k, 1e-6)
    sig_a, sig_b = 6.0, 26.0
    num_a = ndi.gaussian_filter(D * wgt, sig_a); den_a = ndi.gaussian_filter(wgt, sig_a)
    num_b = ndi.gaussian_filter(D * wgt, sig_b); den_b = ndi.gaussian_filter(wgt, sig_b)
    Da = num_a / np.maximum(den_a, 1e-4)
    Db = num_b / np.maximum(den_b, 1e-4)
    wdeep = np.clip((lam - 40.0) / 55.0, 0.0, 1.0)          # 0 shallow, 1 deep
    Ds = Da * (1.0 - wdeep) + Db * wdeep
    Sf = (S_plane + Ds).astype(np.float32)
    Sf -= float(Sf[water].min())

    gy, gx = np.gradient(Sf)
    mag = np.hypot(gx, gy) + 1e-6
    return Sf, k, np.stack([gx / mag, gy / mag], -1).astype(np.float32), mag.astype(np.float32)


def build(families, force=False):
    """Solve every family, cache to work/wavefield_cache/."""
    depth, water, sdf = bathymetry()
    out = {}
    for name, (direction, period) in families.items():
        key = f'{name}_{direction[0]:+.3f}_{direction[1]:+.3f}_{period:.3f}_{DEPTH_SCALE:.0f}_{SHELF:.0f}_{G:.0f}_pw1'
        path = os.path.join(CACHE, key + '.npz')
        if os.path.exists(path) and not force:
            z = np.load(path)
            out[name] = dict(S=z['S'], k=z['k'], dir=z['dir'], kmag=z['kmag'], period=float(z['period']))
            print(f'   [{name}] cached  T={period:.2f}s  dir=({direction[0]:+.2f},{direction[1]:+.2f})')
            continue
        print(f'   [{name}] solving  T={period:.2f}s  dir=({direction[0]:+.2f},{direction[1]:+.2f}) ...')
        S, k, d, kmag = solve_phase(np.array(direction, np.float64), period, water, depth, tag=name)
        np.savez_compressed(path, S=S, k=k, dir=d, kmag=kmag, period=period)
        out[name] = dict(S=S, k=k, dir=d, kmag=kmag, period=period)
        print(f'      S range {S[water].min():.1f} .. {S[water].max():.1f} rad   '
              f'k {k[water].min():.4f} .. {k[water].max():.4f} /px')
    return out, depth, water, sdf


if __name__ == '__main__':
    fam = {'primary': ((0.53, 0.85), 2.6), 'secondary': ((0.72, 0.62), 1.9), 'chop': ((0.40, 0.92), 1.15)}
    build(fam)
