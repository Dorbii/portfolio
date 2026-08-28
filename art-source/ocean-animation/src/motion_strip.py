"""Consecutive-frame strip with fixed guide lines: proves crests translate
rather than oscillate in place, and measures the displacement objectively."""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DG = os.path.join(ROOT, 'diagnostics')


def font(sz, bold=False):
    try:
        return ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', sz)
    except Exception:
        return ImageFont.load_default()


def band_pass(A, lo=2.0, hi=26.0):
    from scipy import ndimage as ndi
    return ndi.gaussian_filter(A, lo) - ndi.gaussian_filter(A, hi)


def best_shift(A, B, rad=34):
    """Plain normalised cross-correlation over a search window.

    Phase correlation was tried first and reported 0 px on a field that visibly
    travels: whitening the spectrum let noise dominate. Direct NCC on band-passed
    residuals is slower but does not lie.
    """
    import numpy as np
    A = band_pass(A); B = band_pass(B)
    h, w = A.shape
    Ac = A[rad:h - rad, rad:w - rad]
    Ac = Ac - Ac.mean()
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preset')
    ap.add_argument('--tag', default='motion')
    ap.add_argument('--n', type=int, default=6)
    ap.add_argument('--stride', type=int, default=4)   # frames between samples
    ap.add_argument('--box', default='40,250,320,530')
    args = ap.parse_args()
    x0, y0, x1, y1 = [int(v) for v in args.box.split(',')]

    p = presets.PRESETS[args.preset]
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2
    dt = 1.0 / (fps * sub)
    t = -p['preroll']
    first = True
    for _ in range(int(p['preroll'] * fps * sub)):
        r.step(t, dt, first); first = False; t += dt

    t = 0.0
    frames, times = [], []
    for f in range(args.n * args.stride + 1):
        for _ in range(sub):
            r.step(t, dt, False); t += dt
        if f % args.stride == 0:
            frames.append(r.composite(t)); times.append(t)

    crops = [f[y0:y1, x0:x1] for f in frames]
    g = [c.astype(np.float64).mean(-1) for c in crops]
    # remove the temporal mean: everything static (plate tint, depth ramp, land)
    # cancels, leaving only what actually moves
    shifts = []
    for i in range(len(g) - 1):
        dx, dy, q = best_shift(g[i + 1], g[i])
        shifts.append((dx, dy, q))
    per = args.stride / fps
    print(f'   sample interval {per:.3f}s   box {args.box}')
    tot = np.array([0.0, 0.0])
    for i, (dx, dy, q) in enumerate(shifts):
        tot += (dx, dy)
        print(f'   {times[i]:5.2f}->{times[i+1]:5.2f}s   shift ({dx:+3d},{dy:+3d}) px   '
              f'|d| {np.hypot(dx,dy):5.1f}   speed {np.hypot(dx,dy)/per:5.1f} px/s   ncc {q:.3f}')
    print(f'   cumulative displacement ({tot[0]:+.0f},{tot[1]:+.0f}) px  |d| {np.hypot(*tot):.1f}')

    CW = x1 - x0
    sc = 2
    tw, th = CW * sc, (y1 - y0) * sc
    sheet = Image.new('RGB', (len(crops) * (tw + 6) + 6, th + 66), (12, 12, 16))
    d = ImageDraw.Draw(sheet)
    d.text((8, 8), f'{p["title"]}  --  consecutive frames, {per:.2f}s apart '
                   f'(guide lines fixed; crests must cross them)', font=font(19, True), fill=(235, 238, 244))
    for i, c in enumerate(crops):
        im = Image.fromarray(c).resize((tw, th), Image.NEAREST)
        dd = ImageDraw.Draw(im, 'RGBA')
        for gy in range(60, th, 120):
            dd.line([(0, gy), (tw, gy)], fill=(255, 70, 120, 130), width=2)
        x = 6 + i * (tw + 6)
        sheet.paste(im, (x, 38))
        d.rectangle([x, 38 + th, x + tw, 38 + th + 22], fill=(26, 28, 34))
        lbl = f't={times[i]:.2f}s'
        if i > 0:
            lbl += f'   d=({shifts[i-1][0]:+d},{shifts[i-1][1]:+d})px'
        d.text((x + 5, 38 + th + 3), lbl, font=font(14), fill=(205, 210, 220))
    out = os.path.join(DG, f'{args.tag}_{args.preset}_strip.png')
    sheet.save(out)
    print(f'   wrote diagnostics/{os.path.basename(out)} {sheet.size}')


if __name__ == '__main__':
    sys.exit(main())
