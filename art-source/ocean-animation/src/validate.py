"""Objective validation of a finished MP4.

Every check runs against the delivered file, decoded back to frames -- not
against the renderer's internal state -- so it validates what a viewer sees.

  python validate.py ../outputs/windy_rolling_surf.mp4 --preset windy_rolling_surf
"""
import argparse, json, os, subprocess, sys
import numpy as np
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASKS = os.path.join(ROOT, 'masks')

LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def ffprobe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                          '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,pix_fmt,codec_name',
                          '-show_entries', 'format=duration', '-of', 'json', path],
                         capture_output=True, text=True).stdout
    j = json.loads(out)
    st = j['streams'][0]
    num, den = st['r_frame_rate'].split('/')
    return dict(width=st['width'], height=st['height'], fps=float(num) / float(den),
                codec=st['codec_name'], pix_fmt=st['pix_fmt'],
                duration=float(j['format']['duration']),
                nb_frames=int(st.get('nb_frames') or 0))


def decode(path, w, h):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.run(cmd, capture_output=True)
    a = np.frombuffer(p.stdout, np.uint8)
    n = a.size // (w * h * 3)
    return a[:n * w * h * 3].reshape(n, h, w, 3)


def foam_fraction(rgb01, water):
    """Identical definition to the reference analysis, so numbers compare."""
    V = rgb01.max(-1); mn = rgb01.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    foam = water & (V > 0.70) & (sat < 0.30)
    return float(foam.sum() / max(water.sum(), 1))


def band_pass(A, lo=2.0, hi=26.0):
    return ndi.gaussian_filter(A, lo) - ndi.gaussian_filter(A, hi)


def best_shift(A, B, rad=26):
    A = band_pass(A); B = band_pass(B)
    h, w = A.shape
    Ac = A[rad:h - rad, rad:w - rad]; Ac = Ac - Ac.mean()
    na = np.sqrt((Ac * Ac).sum()) + 1e-9
    best, bd = -2.0, (0, 0)
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            Bc = B[rad + dy:h - rad + dy, rad + dx:w - rad + dx]
            Bc = Bc - Bc.mean()
            v = float((Ac * Bc).sum() / (na * (np.sqrt((Bc * Bc).sum()) + 1e-9)))
            if v > best:
                best, bd = v, (dx, dy)
    return bd[0], bd[1], best


def codec_noise_floor(W, H, N=48, fps=24.0, crf=14):
    """Encode N identical plate frames and measure the drift the codec alone
    introduces on land. Anything at or below this is not attributable to us."""
    from PIL import Image as _I
    plate = np.asarray(_I.open(os.path.join(MASKS, 'land_plate.png')).convert('RGB'))
    ow, oh = W - W % 2, H - H % 2
    plate = plate[:oh, :ow]
    tmp = os.path.join(ROOT, 'work', '_codec_floor.mp4')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{ow}x{oh}', '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264',
           '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', tmp]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    buf = np.ascontiguousarray(plate).tobytes()
    for _ in range(N):
        pr.stdin.write(buf)
    pr.stdin.close(); pr.wait()
    fr = decode(tmp, ow, oh)
    wmm = np.load(os.path.join(MASKS, 'water_soft.npy'))
    slm = np.load(os.path.join(MASKS, 'spray_land_soft.npy'))
    prot = ((wmm <= 0.0) & (slm <= 0.0))[:oh, :ow]
    ref = fr[0].astype(np.int16)
    mx, mn = 0, 0.0
    for f in fr[1:]:
        d = np.abs(f.astype(np.int16) - ref)[prot]
        mx = max(mx, int(d.max())); mn = max(mn, float(d.mean()))
    try:
        os.remove(tmp)
    except OSError:
        pass
    return mn, mx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mp4')
    ap.add_argument('--preset', default=None)
    ap.add_argument('--json', default=None)
    ap.add_argument('--expect-loop', action='store_true')
    args = ap.parse_args()

    info = ffprobe(args.mp4)
    W, H = info['width'], info['height']
    frames = decode(args.mp4, W, H)
    N = len(frames)
    print(f'== {os.path.basename(args.mp4)} ==')
    print(f'  container : {info["codec"]} {W}x{H} {info["pix_fmt"]} '
          f'{info["fps"]:.3f} fps  {info["duration"]:.2f}s  decoded {N} frames')

    wm = np.load(os.path.join(MASKS, 'water_soft.npy'))
    sl = np.load(os.path.join(MASKS, 'spray_land_soft.npy'))
    if wm.shape != (H, W):
        # The MP4 is cropped by at most one row/column so h264 gets even
        # dimensions. Crop the mask to match -- zooming it resamples and shifts
        # the coastline by up to a pixel, which drags real water pixels into the
        # "protected land" set and fabricates a stability failure.
        if 0 <= wm.shape[0] - H <= 4 and 0 <= wm.shape[1] - W <= 4:
            wm = wm[:H, :W]; sl = sl[:H, :W]
        else:
            zy, zx = H / wm.shape[0], W / wm.shape[1]
            wm = ndi.zoom(wm, (zy, zx), order=1)
            sl = ndi.zoom(sl, (zy, zx), order=1)
    water = wm > 0.5
    protected = (wm <= 0.0) & (sl <= 0.0)          # land, outside the spray band
    print(f'  masks     : water {water.mean()*100:.1f}%  protected land {protected.mean()*100:.1f}%')

    res = dict(file=os.path.basename(args.mp4), **info, frames=N)

    # ---- 1a. renderer-level land stability (the real requirement) ----------
    # Compare the RENDERER's frames, before any lossy encoding: land outside the
    # spray band must be bit-identical to the plate on every frame.
    ok_render_land, render_land_delta = None, None
    if args.preset:
        import presets, ocean_gl
        from PIL import Image as _I
        pp = presets.PRESETS[args.preset]
        rr = ocean_gl.OceanRenderer(pp, verbose=False)
        pl = np.asarray(_I.open(os.path.join(MASKS, 'land_plate.png')).convert('RGB'))
        pw = np.load(os.path.join(MASKS, 'water_soft.npy'))
        ps = np.load(os.path.join(MASKS, 'spray_land_soft.npy'))
        prot_full = (pw <= 0.0) & (ps <= 0.0)
        fps_, sub_ = 24, 2
        dt_ = 1.0 / (fps_ * sub_)
        tt = -pp['preroll']; fst = True
        for _ in range(int(pp['preroll'] * fps_ * sub_)):
            rr.step(tt, dt_, fst); fst = False; tt += dt_
        tt = 0.0
        worst = 0
        for k in range(40):
            for _ in range(sub_):
                rr.step(tt, dt_, False); tt += dt_
            im = rr.composite(tt)
            d = np.abs(im.astype(np.int16) - pl.astype(np.int16))[prot_full]
            worst = max(worst, int(d.max()))
        del rr
        render_land_delta = worst
        ok_render_land = worst == 0
        res['renderer_land_max_delta'] = worst
        print(f'  [{"PASS" if ok_render_land else "FAIL"}] renderer land stability (lossless): '
              f'max channel delta vs plate = {worst} over 40 frames')

    # ---- 1b. delivered file: land drift is codec noise only ----------------
    ref = frames[0].astype(np.int16)
    maxdiff, meandiff, p999 = 0, 0.0, 0
    for f in frames[1:]:
        dm = np.abs(f.astype(np.int16) - ref)[protected]
        maxdiff = max(maxdiff, int(dm.max()) if dm.size else 0)
        meandiff = max(meandiff, float(dm.mean()) if dm.size else 0.0)
        p999 = max(p999, int(np.percentile(dm, 99.9)) if dm.size else 0)
    res['land_max_channel_delta'] = maxdiff
    res['land_mean_channel_delta'] = round(meandiff, 3)
    res['land_p999_channel_delta'] = p999
    # Fair baseline: encode a perfectly static clip of the plate with identical
    # settings and measure ITS land drift. That is the codec's own noise floor,
    # so any excess above it is attributable to the render, not to h264.
    floor_mean, floor_max = codec_noise_floor(W, H, N=48, fps=info['fps'])
    res['codec_floor_mean'] = round(floor_mean, 3)
    res['codec_floor_max'] = floor_max
    ok_land = (meandiff <= max(1.35 * floor_mean, 0.05)) and (maxdiff <= max(1.6 * floor_max, 8))
    print(f'  [{"PASS" if ok_land else "FAIL"}] delivered-file land drift: mean {meandiff:.2f}, '
          f'p99.9 {p999}, max {maxdiff}   |   codec noise floor on a STATIC plate: '
          f'mean {floor_mean:.2f}, max {floor_max}')

    # ---- 2. no corrupt or empty frames ------------------------------------
    stds = np.array([float(f.std()) for f in frames])
    means = np.array([float(f.mean()) for f in frames])
    ok_frames = bool((stds > 8).all() and (means > 12).all() and (means < 243).all())
    res['frame_std_min'] = float(stds.min()); res['frame_mean_min'] = float(means.min())
    print(f'  [{"PASS" if ok_frames else "FAIL"}] frame integrity: std {stds.min():.1f}..{stds.max():.1f}  '
          f'mean {means.min():.1f}..{means.max():.1f}')

    # ---- 3. crest travel: coherent, consistent, non-zero -------------------
    box = (250, 530, 40, 320)
    y0, y1, x0, x1 = box
    step = max(1, int(round(info['fps'] / 8)))       # ~0.125 s apart
    shifts = []
    for i in range(0, min(N - step, int(info['fps'] * 8)), step):
        A = frames[i + step][y0:y1, x0:x1].astype(np.float64).mean(-1)
        B = frames[i][y0:y1, x0:x1].astype(np.float64).mean(-1)
        shifts.append(best_shift(A, B))
    dxs = np.array([-s[0] for s in shifts], float)   # content motion
    dys = np.array([-s[1] for s in shifts], float)
    nccs = np.array([s[2] for s in shifts], float)
    spd = np.hypot(dxs, dys) / (step / info['fps'])
    ang = np.degrees(np.arctan2(dys.mean(), dxs.mean())) % 360
    dirstd = float(np.degrees(np.std(np.arctan2(dys, dxs))))
    res.update(crest_speed_px_s=float(spd.mean()), crest_speed_std=float(spd.std()),
               crest_dir_deg=float(ang), crest_dir_std_deg=dirstd, motion_ncc_mean=float(nccs.mean()))
    ok_travel = bool(spd.mean() > 4.0 and nccs.mean() > 0.30)
    print(f'  [{"PASS" if ok_travel else "FAIL"}] crest travel: {spd.mean():.1f} +- {spd.std():.1f} px/s  '
          f'bearing {ang:.0f} deg  coherence ncc {nccs.mean():.2f}')

    # ---- 4. foam persistence ----------------------------------------------
    # correlate the foam mask against itself at increasing lag, motion-compensated
    def foam_mask(f):
        a = f.astype(np.float32) / 255.
        V = a.max(-1); mn = a.min(-1)
        sat = (V - mn) / np.maximum(V, 1e-6)
        return ((V > 0.70) & (sat < 0.30) & water).astype(np.float32)
    base = foam_mask(frames[0])
    lags, corrs = [], []
    for lag in [1, 2, 4, 8, 12, 18, 24, 36, 48]:
        if lag >= N: break
        m = foam_mask(frames[lag])
        a = base[y0:y1, x0 - 20:x1 + 60]; b = m[y0:y1, x0 - 20:x1 + 60]
        if a.std() < 1e-6 or b.std() < 1e-6:
            corrs.append(0.0); lags.append(lag / info['fps']); continue
        dx, dy, q = best_shift(a.astype(np.float64), b.astype(np.float64), rad=24)
        corrs.append(max(0.0, q)); lags.append(lag / info['fps'])
    res['foam_corr'] = {f'{L:.2f}s': round(c, 3) for L, c in zip(lags, corrs)}
    c1 = corrs[0] if corrs else 0.0                      # one frame apart
    chalf = next((c for L, c in zip(lags, corrs) if L >= 0.45), 0.0)
    # coverage stability: foam that was re-noised per frame would still hold a
    # steady coverage, so the decisive evidence is the 1-frame correlation.
    covs = [float(foam_mask(frames[i]).sum()) / max(water.sum(), 1)
            for i in range(0, N, max(1, N // 24))]
    cov_cv = float(np.std(covs) / max(np.mean(covs), 1e-9))
    res.update(foam_corr_1frame=round(c1, 3), foam_corr_half_second=round(chalf, 3),
               foam_coverage_cv=round(cov_cv, 3))
    ok_foam = bool(c1 > 0.90 and chalf > 0.35)
    print(f'  [{"PASS" if ok_foam else "FAIL"}] foam persistence: 1-frame corr {c1:.3f} '
          f'(>0.90 rules out per-frame re-noising), 0.5s corr {chalf:.2f}, coverage CV {cov_cv:.3f}')
    print('         curve: ' + ', '.join(f'{L:.2f}s={c:.2f}' for L, c in zip(lags, corrs)))

    # ---- 5. water appearance vs the reference library ----------------------
    mid = frames[N // 2].astype(np.float32) / 255.
    ff = foam_fraction(mid, water)
    lum = float((mid @ LUMA)[water].mean())
    res['foam_fraction_of_water'] = round(ff, 4)
    res['mean_water_luma'] = round(lum, 4)
    print(f'  [info] foam {ff*100:.1f}% of water   water luma {lum:.3f}   '
          f'(library: C5 3.4%/0.207, S 14.3%/0.379, C2 20.9%/0.407, C3 25.0%/0.414)')

    # ---- 6. loop continuity -----------------------------------------------
    adj = np.mean([np.abs(frames[i + 1].astype(np.int16) - frames[i].astype(np.int16))[water].mean()
                   for i in range(0, min(N - 1, 40))])
    wrap = float(np.abs(frames[-1].astype(np.int16) - frames[0].astype(np.int16))[water].mean())
    ratio = wrap / max(adj, 1e-6)
    res.update(adjacent_frame_delta=float(adj), wrap_delta=wrap, loop_ratio=round(ratio, 2))
    ok_loop = ratio < 3.0
    print(f'  [{"PASS" if ok_loop else "WARN"}] loop continuity: adjacent {adj:.2f}, '
          f'first-to-last {wrap:.2f}  ratio {ratio:.2f} (1.0 = perfect seam)')

    # ---- 7. duration / fps -------------------------------------------------
    ok_meta = abs(info['fps'] - 24.0) < 0.02
    print(f'  [{"PASS" if ok_meta else "FAIL"}] frame rate 24 fps: {info["fps"]:.3f}')

    chk = dict(land_stability=ok_land, frame_integrity=ok_frames, crest_travel=ok_travel,
               foam_persistence=ok_foam, loop_continuity=ok_loop, frame_rate=ok_meta)
    if ok_render_land is not None:
        chk['renderer_land_exact'] = ok_render_land
    res['checks'] = {k: bool(v) for k, v in chk.items()}
    allok = all(res['checks'].values())
    print(f'  ==> {"ALL CHECKS PASS" if allok else "SOME CHECKS FAILED"}')
    if args.json:
        os.makedirs(os.path.dirname(args.json), exist_ok=True)
        json.dump(res, open(args.json, 'w'), indent=2, default=lambda o: bool(o) if isinstance(o, (np.bool_,)) else float(o))
        print(f'  wrote {args.json}')
    return 0 if allok else 1


if __name__ == '__main__':
    sys.exit(main())
