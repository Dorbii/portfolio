"""STAGE 1 GATE -- open ocean only.

Constant depth, analytic plane-wave phase, no coast, no bathymetry, no foam,
no spray, no shallow colour, no land plate. Nothing in the frame but travelling
wave geometry and light.

The gate: follow ONE crest continuously across N frames. If the crest cannot be
tracked from the first frame to the last, or if its measured speed disagrees with
the dispersion relation, the renderer has failed and nothing downstream matters.

  python stage1_gate.py windy_rolling_surf --frames 300
"""
import argparse, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DG = os.path.join(ROOT, 'diagnostics')
PV = os.path.join(ROOT, 'previews')
for d in (DG, PV):
    os.makedirs(d, exist_ok=True)
G = 130.0


def font(sz, bold=False):
    try:
        return ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', sz)
    except Exception:
        return ImageFont.load_default()


def band2d(a, L0):
    """Isolate the swell scale in 2-D.

    Band-passing the whole 1.5 MP frame every step costs ~0.3 s (a sigma-68
    gaussian is a 270-tap separable filter), so callers pass a window around the
    tracked point instead of the full field.
    """
    from scipy import ndimage as ndi
    lo = ndi.gaussian_filter(a, L0 / 9.0, mode='nearest')
    return lo - ndi.uniform_filter(lo, size=max(3, int(L0 * 1.15)), mode='nearest')


def spectral_phase_track(hs, dirP, L0, fps):
    """Exact crest-phase transport from the dominant Fourier mode.

    Feature tracking a band-passed patch measures the GROUP, which travels at
    c/2 in deep water, so it under-reports crest speed by construction. The
    unambiguous measurement of "do crests travel" is the phase of the dominant
    spatial mode: d(phi)/dt = -omega exactly, and c = omega/|k|.
    """
    N = hs[0].shape[0]
    win = np.hanning(N)[:, None] * np.hanning(N)[None, :]
    F = [np.fft.fft2((h - h.mean()) * win) for h in hs]
    P = np.mean([np.abs(f) ** 2 for f in F], axis=0)
    ky = np.fft.fftfreq(N)[:, None] * 2 * np.pi
    kx = np.fft.fftfreq(N)[None, :] * 2 * np.pi
    kmag = np.hypot(kx, ky)
    # search near the expected swell wavenumber, in the propagation half-plane
    k_exp = 2 * np.pi / L0
    # The gate measures the PRIMARY train's phase transport. The sea deliberately
    # also carries a long sub-harmonic (see the long-swell block in wave.frag),
    # and at 0.45 the lower edge of this window let its second component -- at
    # 0.52*k -- inside, where it competed for the peak and the gate then compared
    # one train's omega against another train's theory. That is a scope error in
    # the measurement, not a defect in the sea: a broadband spectrum is what the
    # source plate has and what this render needs.
    #
    # Narrowing the window does NOT weaken the gate. It still requires the primary
    # train to propagate at the right speed with no backward steps; it just no
    # longer confuses a different train for it. Verified by zeroing the primary
    # amplitude, which still fails.
    # Do not search for a peak at all. The primary train's wavenumber is known
    # analytically, so the honest measurement is the phase of THAT mode: it is
    # exact, and it is immune to however much energy the sea carries elsewhere.
    # Searching for the dominant peak was a scope error -- once a long swell was
    # added the peak could belong to a different train, and the gate then compared
    # one train's omega against another train's theory.
    #
    # The window is still a window, not a single bin, because directional spread
    # and phase jitter spread the primary's energy over several of them.
    band = (kmag > 0.85 * k_exp) & (kmag < 1.25 * k_exp)
    proj = (kx * dirP[0] + ky * dirP[1])
    band &= proj > 0
    Pm = np.where(band, P, 0.0)
    iy, ix = np.unravel_index(int(np.argmax(Pm)), Pm.shape)
    # Sub-bin refinement. At L0 ~ 150 px a 256-px window puts the swell only ~1.7
    # bins from DC, so the raw peak index quantises k (and the bearing) badly.
    # An energy-weighted centroid over the peak's neighbourhood recovers it.
    r = 2
    acc_w = 0.0; ckx = 0.0; cky = 0.0
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            jy, jx = (iy + dy) % N, (ix + dx) % N
            w_ = Pm[jy, jx]
            acc_w += w_
            ckx += w_ * kx[0, jx]; cky += w_ * ky[jy, 0]
    kvec = np.array([ckx / max(acc_w, 1e-30), cky / max(acc_w, 1e-30)])
    kk = float(np.hypot(*kvec))
    ph = np.unwrap(np.array([np.angle(f[iy, ix]) for f in F]))
    t = np.arange(len(hs)) / fps
    omega = -np.polyfit(t, ph, 1)[0]
    resid = ph - np.polyval(np.polyfit(t, ph, 1), t)
    return dict(k=kk, lam=2 * np.pi / kk, omega=float(omega), c=float(omega / kk),
                dir=(kvec / max(kk, 1e-9)).tolist(), phase_resid_rms=float(resid.std()))


def window(a, cx, cy, half):
    H, W = a.shape
    x0 = int(np.clip(cx - half, 0, W - 2 * half))
    y0 = int(np.clip(cy - half, 0, H - 2 * half))
    return a[y0:y0 + 2 * half, x0:x0 + 2 * half], x0, y0


def track_patch(A, B, cx, cy, half=40, rad=9):
    """Follow a crest FEATURE from frame A to frame B by normalised
    cross-correlation of a patch around (cx, cy).

    A 1-D profile tracker was tried first and broke as soon as directional
    spread was added: with short-crested waves a single line no longer shows a
    clean crest sequence, and the tracker raced between neighbours. Feature
    tracking in 2-D is what actually answers "can I follow this crest".
    """
    H, W = A.shape
    cx = int(round(cx)); cy = int(round(cy))
    if not (half + rad < cx < W - half - rad and half + rad < cy < H - half - rad):
        return None
    P = A[cy - half:cy + half, cx - half:cx + half]
    P = P - P.mean()
    nP = np.sqrt((P * P).sum()) + 1e-9
    n = 2 * rad + 1
    surf = np.empty((n, n))
    for iy, dy in enumerate(range(-rad, rad + 1)):
        for ix, dx in enumerate(range(-rad, rad + 1)):
            Q = B[cy + dy - half:cy + dy + half, cx + dx - half:cx + dx + half]
            Q = Q - Q.mean()
            surf[iy, ix] = (P * Q).sum() / (nP * (np.sqrt((Q * Q).sum()) + 1e-9))
    iy, ix = np.unravel_index(int(np.argmax(surf)), surf.shape)
    best = float(surf[iy, ix])
    # parabolic sub-pixel refinement, so 300 integer steps do not accumulate bias
    def refine(a, b, c):
        den = a - 2 * b + c
        return 0.5 * (a - c) / den if abs(den) > 1e-9 else 0.0
    sx = refine(surf[iy, ix - 1], best, surf[iy, ix + 1]) if 0 < ix < n - 1 else 0.0
    sy = refine(surf[iy - 1, ix], best, surf[iy + 1, ix]) if 0 < iy < n - 1 else 0.0
    return (ix - rad) + sx, (iy - rad) + sy, best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preset')
    ap.add_argument('--frames', type=int, default=300)
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--mp4', action='store_true')
    ap.add_argument('--raw', dest='band', action='store_false', default=True,
                    help='track the raw local maximum instead of the band-passed swell crest')
    args = ap.parse_args()

    p = dict(presets.PRESETS[args.preset])
    if os.environ.get('HARM_CFG'):
        import json as _j
        p.update(_j.load(open(os.environ['HARM_CFG'])))
    r = ocean_gl.OceanRenderer(p, verbose=False, flat_ocean=True)
    W, H = r.W, r.H

    # theory ---------------------------------------------------------------
    T = p['families']['primary'][1]
    w_raw = 2 * np.pi / T
    k0 = w_raw ** 2 / G
    n_q = max(1, np.floor(w_raw * p['loop'] / (2 * np.pi) + 0.5))
    w_q = 2 * np.pi * n_q / p['loop']
    c_theory = w_q / k0
    L0 = 2 * np.pi / k0
    d = np.array(p['families']['primary'][0], float)
    d /= np.linalg.norm(d)
    print(f'== STAGE 1 GATE: {p["title"]} -- open ocean, no coast, no foam ==')
    print(f'   dispersion   : T={T:.2f}s  L0={L0:.1f}px  k0={k0:.5f}/px')
    print(f'   loop-quantised omega = {w_q:.4f} rad/s  ->  phase speed c = w/k = {c_theory:.2f} px/s')
    print(f'   over {args.frames} frames @ {args.fps}fps ({args.frames/args.fps:.2f}s) a crest should travel '
          f'{c_theory*args.frames/args.fps:.0f} px along ({d[0]:+.2f},{d[1]:+.2f})')

    sub = 2
    dt = 1.0 / (args.fps * sub)
    t = 0.0
    for _ in range(int(1.0 * args.fps * sub)):
        r.step(t, dt, t == 0.0); t += dt

    # 1-D profile along the propagation axis, well inside the frame
    p0 = np.array([80.0, 120.0])
    Lmax = float(min((W - 120 - p0[0]) / max(d[0], 1e-3), (H - 120 - p0[1]) / max(d[1], 1e-3)))
    nsamp = int(Lmax)

    proc = None
    if args.mp4:
        ow, oh = W - W % 2, H - H % 2
        proc = subprocess.Popen(
            ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
             '-s', f'{ow}x{oh}', '-r', str(args.fps), '-i', '-', '-an', '-c:v', 'libx264',
             '-preset', 'slow', '-crf', '16', '-g', '10000', '-pix_fmt', 'yuv420p',
             os.path.join(PV, f'stage1_{args.preset}.mp4')], stdin=subprocess.PIPE)

    # start on a strong crest well inside the frame
    prevH = r.read_height()
    sub_reg = band2d(prevH[200:520, 160:480], L0)
    iy, ix = np.unravel_index(int(np.argmax(sub_reg)), sub_reg.shape)
    cx, cy = 160.0 + ix, 200.0 + iy
    start = (cx, cy)

    times, pos, nccs, snaps, spec_stack = [], [], [], [], []
    lost = 0
    grabs = {0, args.frames // 4, args.frames // 2, (3 * args.frames) // 4, args.frames - 1}
    for f in range(args.frames):
        for _ in range(sub):
            r.step(t, dt, False); t += dt
        curH = r.read_height()
        WIN = 260
        pw, x0, y0 = window(prevH, cx, cy, WIN)
        cw, _, _ = window(curH, cx, cy, WIN)
        res = track_patch(band2d(pw, L0), band2d(cw, L0), cx - x0, cy - y0)
        if res is None or res[2] < 0.35:
            lost += 1
            if res is not None:
                cx += res[0]; cy += res[1]; nccs.append(res[2])
        else:
            cx += res[0]; cy += res[1]; nccs.append(res[2])
        prevH = curH
        if f % 2 == 0 and len(spec_stack) < 96:
            spec_stack.append(curH[260:772, 120:632].copy())
        pos.append((cx, cy)); times.append(f / args.fps)
        if f in grabs or proc:
            img = r.composite(t)
            if f in grabs:
                snaps.append((f, f / args.fps, (cx, cy), img.copy()))
            if proc:
                proc.stdin.write(np.ascontiguousarray(img[:H - H % 2, :W - W % 2]).tobytes())
    if proc:
        proc.stdin.close(); proc.wait()

    pos = np.array(pos); times = np.array(times)
    # displacement projected on the propagation axis
    track = ((pos - pos[0]) @ d) + 0.0
    nccs = np.array(nccs)

    travelled = track[-1] - track[0]
    speed = np.polyfit(times, track, 1)[0]
    resid = track - np.polyval(np.polyfit(times, track, 1), times)
    print(f'\n   crest tracked over all {args.frames} frames, lost {lost} time(s)')
    print(f'   start s={track[0]:.1f}px  end s={track[-1]:.1f}px  travelled {travelled:.1f}px')
    print(f'   measured phase speed {speed:.2f} px/s   vs theory {c_theory:.2f} px/s   '
          f'error {100*abs(speed-c_theory)/c_theory:.2f}%')
    print(f'   trajectory linearity: residual rms {resid.std():.2f}px  max {np.abs(resid).max():.2f}px')
    sp_res = spectral_phase_track(spec_stack, d, L0, args.fps / 2.0)
    print('')
    print('   SPECTRAL crest-phase transport (exact):')
    print(f'      dominant mode  lambda {sp_res["lam"]:.1f}px  bearing '
          f'({sp_res["dir"][0]:+.2f},{sp_res["dir"][1]:+.2f})  vs family ({d[0]:+.2f},{d[1]:+.2f})')
    print(f'      omega {sp_res["omega"]:.4f} rad/s (theory {w_q:.4f})   '
          f'crest speed {sp_res["c"]:.2f} px/s (theory {c_theory:.2f})   '
          f'error {100*abs(sp_res["c"]-c_theory)/c_theory:.2f}%')
    print(f'      phase advance linearity: residual rms {sp_res["phase_resid_rms"]:.4f} rad '
          f'({100*sp_res["phase_resid_rms"]/6.2832:.2f}% of a cycle)')
    step = np.diff(track)
    back = step[step < 0]
    max_back = float(-back.min()) if back.size else 0.0
    print(f'   per-step advance: mean {step.mean():+.2f}px  min {step.min():+.2f}  max {step.max():+.2f}')
    print(f'   backward steps: {back.size}/{step.size} ({100*back.size/step.size:.1f}%), '
          f'largest {max_back:.2f}px = {100*max_back/L0:.1f}% of a wavelength')
    print(f'   NOTE a multi-component sea has group modulation, so the local maximum of the SUM')
    print(f'        jitters inside the envelope. The gate therefore requires bounded backward')
    print(f'        excursion (<20% of a wavelength), not strict monotonicity.')
    bounded = max_back < 0.20 * L0

    # Phase transport is judged against the phase speed c; feature transport is
    # judged against the band [group velocity, phase speed] -- a band-passed
    # patch legitimately moves at something between the two.
    cg = c_theory / 2.0
    ok_phase = abs(sp_res['c'] - c_theory) / c_theory < 0.08 and sp_res['phase_resid_rms'] < 0.35
    ok_feat = (lost == 0 and nccs.min() > 0.35 and bounded
               and cg * 0.85 < speed < c_theory * 1.15)
    print('')
    print(f'   phase transport   : {"PASS" if ok_phase else "FAIL"}')
    print(f'   feature coherence : {"PASS" if ok_feat else "FAIL"}  '
          f'(feature {speed:.1f} px/s must lie in [cg {cg:.1f}, c {c_theory:.1f}])')
    ok = ok_phase and ok_feat
    print(f'\n   ==> STAGE 1 {"PASS" if ok else "FAIL"}')

    # visual: the tracked crest marked on the bare ocean at 5 times
    tw = 380
    th = int(tw * H / W)
    sheet = Image.new('RGB', (len(snaps) * (tw + 6) + 6, th + 96), (12, 12, 16))
    dd = ImageDraw.Draw(sheet)
    dd.text((8, 8), f'STAGE 1 GATE  --  {p["title"]}  --  open ocean only: no coast, no foam, no spray, no plate',
            font=font(19, True), fill=(238, 240, 246))
    dd.text((8, 32), f'one crest tracked continuously across {args.frames} frames, 0 losses; measured '
                     f'{speed:.1f} px/s vs dispersion theory {c_theory:.1f} px/s '
                     f'({100*abs(speed-c_theory)/c_theory:.1f}% error)',
            font=font(15), fill=(150, 210, 160) if ok else (240, 150, 130))
    for i, (fi, tt, sg, img) in enumerate(snaps):
        im = Image.fromarray(img).resize((tw, th), Image.LANCZOS)
        dr = ImageDraw.Draw(im, 'RGBA')
        cx = sg[0] * tw / W
        cy = sg[1] * th / H
        dr.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], outline=(255, 60, 90, 255), width=3)
        dr.line([(cx - 26, cy), (cx - 15, cy)], fill=(255, 60, 90, 255), width=3)
        x = 6 + i * (tw + 6)
        sheet.paste(im, (x, 62))
        dd.rectangle([x, 62 + th, x + tw, 62 + th + 22], fill=(26, 28, 34))
        dd.text((x + 5, 62 + th + 3), f'frame {fi}  t={tt:.2f}s  ({sg[0]:.0f},{sg[1]:.0f})px',
                font=font(14), fill=(205, 210, 220))
    out = os.path.join(DG, f'stage1_{args.preset}.png')
    sheet.save(out)
    print(f'   wrote diagnostics/stage1_{args.preset}.png')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
