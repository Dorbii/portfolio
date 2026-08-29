"""Build the immutable plates the renderer composites against.

Outputs (masks/):
  land_plate.png          the selected source, untouched  (the pixel-stability reference)
  water_mask.png          8-bit coverage, 255 = renderable water
  water_mask_soft.png     antialiased version actually used for compositing
  shore_band.png          narrow band where spray is permitted to overlap land
  shore_sdf.npy           signed distance to the coastline (px, +ve into water)
  depth.npy               bathymetry approximation in metres
  clean_water_plate.png   source water with static painted foam suppressed
  vignette.npy            the plate's own edge darkening, re-applied to new water

Land segmentation uses the three lowest-foam concepts (C5/C8/C1) as extra evidence:
in those images the sea stacks are not buried in whitewater, so rock separates cleanly.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# OCEAN_ROOT lets a study (e.g. the closeup concept) run the whole pipeline
# against a different workspace without forking any of it.
ROOT = os.environ.get('OCEAN_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN = os.path.join(ROOT, 'refs', 'canonical')
MASKS = os.path.join(ROOT, 'masks')
DIAG = os.path.join(ROOT, 'diagnostics')
os.makedirs(MASKS, exist_ok=True)
os.makedirs(DIAG, exist_ok=True)

# Scene pixels per TUNED pixel. The plate was authored where these were the
# same thing and the swell spanned 115 of them; a world baked at 24 world px
# a wave is 4.8 tuned px to the pixel. Any length here that shapes the WATER
# rather than the picture has to be written in tuned px and converted.
OCEAN_G = float(os.environ.get('OCEAN_G', 130.0))

GUTTER = 6          # painted frame edge, left/top/bottom, excluded from everything


def load(cid):
    return np.asarray(Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB')).astype(np.float32) / 255.


def water_prob(rgb):
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    w1 = np.clip((B - np.maximum(R, G) - 0.010) / 0.055, 0, 1)      # blue
    w2 = np.clip((np.minimum(G, B) - R - 0.045) / 0.085, 0, 1)      # turquoise
    foam = (np.clip((V - 0.60) / 0.24, 0, 1)
            * np.clip((0.36 - sat) / 0.24, 0, 1)
            * np.clip((B - R + 0.045) / 0.05, 0, 1))                # cool white
    return np.maximum(np.maximum(w1, w2), foam)


def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))


def align_to_source(cid, Sg):
    """Integer translation that best aligns concept `cid` onto the source."""
    Cg = np.asarray(Image.open(os.path.join(CAN, f'{cid}.png')).convert('L')).astype(np.float32)
    # High-contrast, pure-land patch used as the registration target. Overridable
    # so a cropped study (see closeup.py) can name a patch inside its own frame;
    # the default is the brick keep in the full plate.
    py0, py1, px0, px1 = (int(v) for v in os.environ.get(
        'OCEAN_ALIGN_PATCH', '500,900,800,1060').split(','))
    rad = int(os.environ.get('OCEAN_ALIGN_RADIUS', 26))
    patch = Sg[py0:py1, px0:px1]
    best = (-2, 0, 0)
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            y0, y1, x0, x1 = py0 + dy, py1 + dy, px0 + dx, px1 + dx
            if y0 < 0 or x0 < 0 or y1 > Cg.shape[0] or x1 > Cg.shape[1]:
                continue
            v = ncc(patch, Cg[y0:y1, x0:x1])
            if v > best[0]:
                best = (v, dy, dx)
    return best


def shift_to_source(cid, dy, dx, H, W):
    """Resample a concept into source pixel coordinates."""
    a = load(cid)
    out = np.zeros((H, W, 3), np.float32)
    ys0, ys1 = max(0, -dy), min(H, a.shape[0] - dy)
    xs0, xs1 = max(0, -dx), min(W, a.shape[1] - dx)
    out[ys0:ys1, xs0:xs1] = a[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
    valid = np.zeros((H, W), bool)
    valid[ys0:ys1, xs0:xs1] = True
    return out, valid


def main():
    S = load('S')
    H, W = S.shape[:2]
    Sg = np.asarray(Image.open(os.path.join(CAN, 'S.png')).convert('L')).astype(np.float32)
    print(f'source {W}x{H}')

    # ---- evidence from the three calmest concepts -------------------------
    # A new scene generally has no reference library. The multi-reference
    # agreement is better evidence when it exists -- it is what removed the false
    # shoals here -- so it stays the default, with a documented single-image
    # fallback rather than a silent one.
    calm_ids = [c for c in os.environ.get('OCEAN_CALM_REFS', 'C5,C8,C1').split(',') if c]
    calm_ids = [c for c in calm_ids if os.path.exists(os.path.join(CAN, f'{c}.png'))]
    wp_stack, valid_all = [], np.ones((H, W), bool)
    for cid in calm_ids:
        v, dy, dx = align_to_source(cid, Sg)
        img, valid = shift_to_source(cid, dy, dx, H, W)
        print(f'  align {cid}: ncc {v:.3f}  dy {dy:+d}  dx {dx:+d}')
        wp_stack.append(water_prob(img))
        valid_all &= valid
    wp_S = water_prob(S)
    if not wp_stack:
        print('  no calm references present -- segmenting from the source alone.')
        print('  NOTE: the cross-reference agreement is what catches water-coloured')
        print('  pixels misread as land, which become false shoals. Check')
        print('  diagnostics/water_mask_preview.png before trusting this.')
        wp_calm_min = wp_calm_max = wp_S
    else:
        wp_calm_min = np.minimum.reduce(wp_stack)      # water in EVERY calm ref
        wp_calm_max = np.maximum.reduce(wp_stack)

    # ---- combine into a hard water/land decision -------------------------
    water_core = (wp_calm_min > 0.55) & valid_all & (wp_S > 0.30)
    land_core = ((wp_calm_max < 0.22) | (~valid_all)) & (wp_S < 0.30)
    # everything else: fall back to the source's own colour opinion
    amb = ~(water_core | land_core)
    water = water_core | (amb & (wp_S > 0.52))

    # An AUTHORITATIVE mask beats inference whenever one exists. The live world
    # ships one per water body, and inference is exactly what this file's own
    # docstring warns about: segmenting the world coastline from colour put 43.2%
    # water against a true 47%, i.e. it called ~4% of real water land, and land
    # zeroes the shoreline distance there -- a false shoal, and surf in open sea.
    override = os.environ.get('OCEAN_WATER_MASK')
    if override:
        wm = np.asarray(Image.open(override).convert('L'))
        if wm.shape != water.shape:
            raise SystemExit(f'OCEAN_WATER_MASK is {wm.shape}, plate is {water.shape}')
        water = wm > 127
        print(f'  water mask taken from {os.path.basename(override)} '
              f'(authoritative) -- coverage {water.mean()*100:.2f}%')

    # tidy: drop specks, close pinholes, keep the one ocean component,
    # but DO NOT fill holes -- the holes are sea stacks and must stay land.
    water = ndi.binary_closing(water, np.ones((5, 5)))
    water = ndi.binary_opening(water, np.ones((5, 5)))
    lab, n = ndi.label(water)
    if n:
        water = lab == int(np.argmax(ndi.sum(water, lab, range(1, n + 1)))) + 1
    # remove land specks smaller than a real rock (<40 px) from inside the ocean
    landlab, ln = ndi.label(~water)
    if ln:
        sizes = ndi.sum(~water, landlab, range(1, ln + 1))
        tiny = np.isin(landlab, np.where(sizes < 40)[0] + 1)
        # only fill tiny holes that are fully surrounded by water
        border = np.zeros_like(water); border[0], border[-1], border[:, 0], border[:, -1] = 1, 1, 1, 1
        touch = set(np.unique(landlab[border.astype(bool)]))
        keep = np.isin(landlab, [i for i in np.unique(landlab) if i not in touch and i != 0])
        water |= (tiny & keep)
    # The painted vignette darkens the outermost columns/rows enough that the
    # colour test reads them as land. They are plainly ocean -- replicate the
    # classification inward from a clean inset so the frame edge is not a coast.
    # replicate from a *smoothed majority* of the nearest clean strip, so a
    # single misread pixel does not extrude a 14-px sliver to the frame edge
    col = ndi.median_filter((water[:, 14:30].mean(1) > 0.5).astype(np.uint8), 9).astype(bool)
    water[:, :14] = col[:, None]
    rowt = ndi.median_filter((water[8:20, :].mean(0) > 0.5).astype(np.uint8), 9).astype(bool)
    water[:8, :] = rowt[None, :]
    rowb = ndi.median_filter((water[-20:-8, :].mean(0) > 0.5).astype(np.uint8), 9).astype(bool)
    water[-8:, :] = rowb[None, :]

    # Isolated "land" components that are actually WATER.
    #
    # Size cannot separate these from real sea stacks (the misreads were 79-201 px,
    # genuine stacks 66-1857 px), but colour separates them perfectly: every real
    # rock in this plate has NEGATIVE blueness and cyanness (warm grey, R>=G>=B),
    # while the misreads are dark vignetted blue-teal with both positive.
    #
    # This matters far more than a few stray pixels: a false land blob zeroes the
    # shoreline SDF, which makes the bathymetry shallow there, which makes waves
    # break and generate foam and spray in the middle of the open sea. Three of
    # them were producing white slabs that looked like ice floes.
    Rc, Gc, Bc = S[..., 0], S[..., 1], S[..., 2]
    blueness = Bc - np.maximum(Rc, Gc)
    cyanness = np.minimum(Gc, Bc) - Rc
    lab_c, n_c = ndi.label(~water)
    if n_c:
        sizes_c = ndi.sum(~water, lab_c, range(1, n_c + 1))
        main_c = int(np.argmax(sizes_c)) + 1
        drop_c = []
        for i in range(1, n_c + 1):
            if i == main_c:
                continue
            m = lab_c == i
            if float(blueness[m].mean()) > 0.015 or float(cyanness[m].mean()) > 0.02:
                drop_c.append(i)
        # Second rule, for the ones colour cannot catch: a small, BRIGHT,
        # desaturated blob far out in open water is painted foam in the source,
        # not a sea stack. Real stacks here sit at value 0.36-0.53 and hug the
        # coast; these sat at 0.71-0.83, hundreds of pixels offshore.
        d_main = ndi.distance_transform_edt(~(lab_c == main_c))
        Vc = S.max(-1)
        satc = (Vc - S.min(-1)) / np.maximum(Vc, 1e-6)
        for i in range(1, n_c + 1):
            if i == main_c or i in drop_c:
                continue
            m = lab_c == i
            if (sizes_c[i - 1] < 400 and float(d_main[m].min()) > 60.0
                    and float(Vc[m].mean()) > 0.62 and float(satc[m].mean()) < 0.35):
                drop_c.append(i)
        if drop_c:
            npx = int(sum(sizes_c[i - 1] for i in drop_c))
            water |= np.isin(lab_c, drop_c)
            print(f'  removed {len(drop_c)} false-land blobs ({npx} px) '
                  f'-- water-coloured, or bright foam far offshore; both create false shoals')

    # final speck pass: an isolated "land" blob of a few dozen pixels floating in
    # open water is a misread foam highlight, and would render as a frozen dot.
    landlab2, ln2 = ndi.label(~water)
    if ln2:
        sizes2 = ndi.sum(~water, landlab2, range(1, ln2 + 1))
        border = np.zeros_like(water)
        border[0], border[-1], border[:, 0], border[:, -1] = 1, 1, 1, 1
        touching = set(np.unique(landlab2[border.astype(bool)])) - {0}
        big = {i + 1 for i, s in enumerate(sizes2) if s >= 45}
        drop = [i for i in range(1, ln2 + 1) if i not in touching and i not in big]
        if drop:
            water |= np.isin(landlab2, drop)
            print(f'  removed {len(drop)} floating land specks (<45 px)')
    print(f'  water coverage {water.mean()*100:.2f}%')

    # ---- distances, SDF, bathymetry --------------------------------------
    # The picture frame is NOT a coastline. No padding: distance_transform_edt
    # only measures to features that actually exist inside the array, which is
    # exactly right -- ocean continues off the left/top/bottom edges and land
    # continues off the right edge.
    d_water = ndi.distance_transform_edt(water)        # water -> nearest land
    d_land = ndi.distance_transform_edt(~water)        # land  -> nearest water

    # SUB-PIXEL. The naive form of this -- where(water, d_water, -d_land) -- has
    # no zero in it. A water pixel's distance to the nearest land pixel is at
    # least 1 and a land pixel's to the nearest water pixel is at least 1, so the
    # field jumped -1 to +1 with a two-pixel dead band between, and there was not
    # one pixel in the whole world where |sdf| < 1. Everything keyed on the
    # shoreline reads that band: the water's own coverage is
    # smoothstep(-0.6, 0.6, sdf) in WORLD px, an alpha ramp that could therefore
    # never take an intermediate value, and at the closest camera one world pixel
    # is twelve screen pixels. What that draws is a hard edge that follows the
    # pixel lattice -- the blocky coastline, and the reason the sea reads as
    # stopping at the land rather than meeting it.
    #
    # Half a pixel puts the crossing between the two centres, where the boundary
    # actually is. The gradient of a lightly smoothed coverage then places it
    # within the pixel: the coastline the land art draws is a smooth curve
    # through these cells, not their staircase, and the first-order distance to
    # the half-coverage contour recovers that curve. Blended over 1.5 px so the
    # far field stays exactly the Euclidean transform, which is what the shelf
    # and the surf-zone widths are measured against.
    #
    # Registration is preserved, not traded away: water coverage is unchanged to
    # five decimal places and no point of the coastline moves by more than one
    # pixel, while the axis-alignment of the boundary normal -- the staircase,
    # measured -- halves.
    sdf = np.where(water, d_water - 0.5, -(d_land - 0.5)).astype(np.float32)
    cov = ndi.gaussian_filter(water.astype(np.float32), 1.0)
    gy, gx = np.gradient(cov)
    sub = (cov - 0.5) / np.maximum(np.hypot(gx, gy), 1e-4)
    near = np.clip(1.5 - np.abs(sdf), 0.0, 1.0)
    sdf = ((1.0 - near) * sdf + near * np.clip(sub, -2.0, 2.0)).astype(np.float32)

    # bathymetry: shoals to zero at the coast, exponential shelf seaward.
    # sea stacks shoal the water around themselves for free (they are land in the SDF).
    # NOTE: SHELF stays in scene pixels deliberately. precompute renormalises
    # the profile afterwards, and measured against a like-for-like scene the
    # two agree to 1% everywhere outside the smoothing kernel above. Changing
    # it would break an agreement that currently holds.
    SHELF = 105.0        # px e-folding length of the shelf
    DMAX = 9.0           # metres at deep water
    depth = DMAX * (1.0 - np.exp(-np.maximum(sdf, 0.0) / SHELF))
    # Seven TUNED pixels, not seven scene pixels.
    #
    # This smoothing sits on the steepest part of the profile, where the shelf
    # rises out of the shore, and that is the part BREAKING is gated on. Written
    # in scene pixels it was 7 tuned px on the plate and 33 on the world -- so
    # the live sea's water was up to 2.2x too deep inside the surf zone, the
    # depth gate never opened, and the energy that should have broken on the
    # shore went offshore as whitecaps instead. Measured against a like-for-like
    # scene, the depth profiles agreed everywhere beyond 30 tuned px and
    # diverged sharply inside it, which is this kernel's width exactly.
    depth = ndi.gaussian_filter(depth, 7.0 * OCEAN_G / 130.0).astype(np.float32)
    depth[~water] = 0.0

    # Two distinct bands. The land-side one is deliberately narrow: it is the
    # ONLY place spray is ever allowed to touch the plate.
    spray_land_band = (sdf > -13) & (sdf <= 0)
    spray_land_soft = np.clip((sdf + 13) / 9.0, 0, 1) * np.clip(-sdf / 1.5 + 1.0, 0, 1)
    spray_land_soft = np.where(sdf <= 0, np.clip((sdf + 13) / 9.0, 0, 1), 0.0).astype(np.float32)
    shore_band = (sdf > -13) & (sdf < 46)
    shore_band_soft = (np.clip((46 - sdf) / 26, 0, 1) * np.clip((sdf + 13) / 8, 0, 1)).astype(np.float32)

    # ---- soft water coverage for compositing ------------------------------
    soft = ndi.gaussian_filter(water.astype(np.float32), 0.8)
    soft = np.clip((soft - 0.42) / 0.30, 0, 1).astype(np.float32)

    # ---- vignette: clean edge falloff only --------------------------------
    # Derived from the plate's own edge darkening, but reduced to a monotone
    # ramp so it cannot introduce large-scale blotches into the new water.
    lum = (S @ np.array([0.299, 0.587, 0.114], np.float32))
    colmean = np.nan_to_num(np.nanmean(np.where(water, lum, np.nan), axis=0), nan=0.0)
    ref = np.percentile(colmean[colmean > 0], 65)
    prof = np.clip(ndi.uniform_filter1d(colmean / max(ref, 1e-6), 21), 0.0, 1.0)
    vg = np.ones(W, np.float32)
    edge = 46
    vg[:edge] = np.minimum.accumulate(np.clip(prof[:edge][::-1], 0.30, 1.0))[::-1]
    vg = np.clip(ndi.uniform_filter1d(vg, 9), 0.30, 1.0)
    vign = np.tile(vg, (H, 1)).astype(np.float32)
    ramp = np.ones(H, np.float32)
    ramp[:18] = np.linspace(0.72, 1.0, 18)
    ramp[-18:] = np.linspace(1.0, 0.78, 18)
    vign *= ramp[:, None]

    # ---- clean water plate: suppress the painted static foam --------------
    # replace each water pixel by a low percentile of its neighbourhood, which
    # removes white filigree but keeps the large-scale colour grading.
    clean = S.copy()
    wm = water.astype(np.float32)
    dark = np.stack([ndi.percentile_filter(S[..., c], 18, size=25) for c in range(3)], -1)
    dark = ndi.gaussian_filter(dark, (9, 9, 0))
    # blend toward the darkened field only inside water, and only where foam was
    V = S.max(-1); mn = S.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    foam_amt = np.clip((V - 0.55) / 0.30, 0, 1) * np.clip((0.40 - sat) / 0.28, 0, 1)
    a = (foam_amt * wm)[..., None]
    clean = S * (1 - a) + dark * a
    # normalised convolution: smooth using water pixels only so no rock colour
    # bleeds across the coastline into the base tint
    for _ in range(2):
        num = ndi.gaussian_filter(clean * wm[..., None], (5, 5, 0))
        den = ndi.gaussian_filter(wm, 5.0)[..., None]
        sm = num / np.maximum(den, 1e-4)
        clean = np.where(wm[..., None] > 0.5, sm, clean)
    clean = np.clip(clean, 0, 1)

    # ---- write ------------------------------------------------------------
    Image.open(os.path.join(CAN, 'S.png')).convert('RGB').save(os.path.join(MASKS, 'land_plate.png'))
    Image.fromarray((water * 255).astype(np.uint8)).save(os.path.join(MASKS, 'water_mask.png'))
    Image.fromarray((soft * 255).astype(np.uint8)).save(os.path.join(MASKS, 'water_mask_soft.png'))
    Image.fromarray((shore_band * 255).astype(np.uint8)).save(os.path.join(MASKS, 'shore_band.png'))
    Image.fromarray((np.clip(shore_band_soft, 0, 1) * 255).astype(np.uint8)).save(os.path.join(MASKS, 'shore_band_soft.png'))
    Image.fromarray((spray_land_band * 255).astype(np.uint8)).save(os.path.join(MASKS, 'spray_land_band.png'))
    np.save(os.path.join(MASKS, 'spray_land_soft.npy'), np.clip(spray_land_soft, 0, 1).astype(np.float32))
    np.save(os.path.join(MASKS, 'shore_band_soft.npy'), np.clip(shore_band_soft, 0, 1).astype(np.float32))
    Image.fromarray((clean * 255).astype(np.uint8)).save(os.path.join(MASKS, 'clean_water_plate.png'))
    np.save(os.path.join(MASKS, 'shore_sdf.npy'), sdf)
    np.save(os.path.join(MASKS, 'depth.npy'), depth)
    np.save(os.path.join(MASKS, 'vignette.npy'), vign)
    np.save(os.path.join(MASKS, 'water_soft.npy'), soft)

    # previews
    dv = np.clip(depth / DMAX, 0, 1)
    Image.fromarray((np.stack([dv * 0.2, dv * 0.75, dv], -1) * 255).astype(np.uint8)).save(os.path.join(MASKS, 'depth_preview.png'))
    sv = np.clip((sdf + 120) / 340, 0, 1)
    Image.fromarray((np.stack([sv, 1 - np.abs(sv - 0.353) * 6, 1 - sv], -1).clip(0, 1) * 255).astype(np.uint8)).save(os.path.join(MASKS, 'shore_sdf_preview.png'))
    Image.fromarray((vign * 255).astype(np.uint8)).save(os.path.join(MASKS, 'vignette_preview.png'))

    print(f'  sdf range {sdf.min():.1f} .. {sdf.max():.1f} px')
    print(f'  depth max {depth.max():.2f} m   shore band {shore_band.mean()*100:.2f}%')
    print('wrote masks/')


if __name__ == '__main__':
    main()
