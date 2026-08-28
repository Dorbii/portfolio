"""Iteration harness: render a preset, emit a time-sampled contact sheet, an
animated preview, and numeric diagnostics -- everything needed for one pass of
the visual review loop.

  python prototype.py windy_rolling_surf --iter 2
"""
import argparse, os, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CS = os.path.join(ROOT, 'contactsheets')
PV = os.path.join(ROOT, 'previews')
DG = os.path.join(ROOT, 'diagnostics')
for d in (CS, PV, DG):
    os.makedirs(d, exist_ok=True)


def font(sz, bold=False):
    for f in ((r'C:\Windows\Fonts\segoeuib.ttf',) if bold else (r'C:\Windows\Fonts\segoeui.ttf',)):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def contact_sheet(frames, times, title, path, cols=4, tile_w=330):
    n = len(frames)
    rows = (n + cols - 1) // cols
    h0, w0 = frames[0].shape[:2]
    tw = tile_w
    th = int(tw * h0 / w0)
    sheet = Image.new('RGB', (cols * (tw + 6) + 6, rows * (th + 26) + 52), (13, 14, 18))
    d = ImageDraw.Draw(sheet)
    d.text((10, 12), title, font=font(24, True), fill=(238, 240, 246))
    for i, (fr, t) in enumerate(zip(frames, times)):
        im = Image.fromarray(fr).resize((tw, th), Image.LANCZOS)
        x = 6 + (i % cols) * (tw + 6)
        y = 46 + (i // cols) * (th + 26)
        sheet.paste(im, (x, y))
        d.rectangle([x, y + th, x + tw, y + th + 22], fill=(26, 28, 34))
        d.text((x + 5, y + th + 3), f't = {t:5.2f}s', font=font(14), fill=(200, 205, 214))
    sheet.save(path)
    return sheet


def crest_travel_metric(frames, times, water):
    """Genuine horizontal crest displacement between adjacent samples."""
    from motion_strip import best_shift
    y0, y1, x0, x1 = 250, 530, 40, 320
    out = []
    for a, b in zip(frames[:-1], frames[1:]):
        A = a[y0:y1, x0:x1].astype(np.float64).mean(-1)
        B = b[y0:y1, x0:x1].astype(np.float64).mean(-1)
        dx, dy, q = best_shift(B, A)
        out.append((dx, dy, q))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preset')
    ap.add_argument('--iter', type=int, default=1)
    ap.add_argument('--tiles', type=int, default=8)
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--scale', type=float, default=0.52)
    ap.add_argument('--duration', type=float, default=None)
    ap.add_argument('--gif', action='store_true')
    args = ap.parse_args()

    p = presets.PRESETS[args.preset]
    dur = args.duration or p['duration']
    tag = f'{args.preset}_it{args.iter}'
    print(f'== prototype {tag}  {dur:.1f}s @ {args.fps}fps  scale {args.scale} ==')

    t0 = time.time()
    r = ocean_gl.OceanRenderer(p)
    n_frames = int(round(dur * args.fps))
    grab = sorted(set(np.linspace(0, n_frames - 1, args.tiles).round().astype(int).tolist()))
    mp4 = os.path.join(PV, f'{tag}.mp4')
    grabs = r.run(dur, fps=args.fps, substeps=2, grab=grab, out_mp4=mp4,
                  scale=args.scale, crf=20, progress_every=0)
    print(f'   render {time.time()-t0:.1f}s -> {mp4}')

    frames = [grabs[i] for i in grab]
    times = [i / args.fps for i in grab]
    sheet = contact_sheet(frames, times, f'{p["title"]}  --  iteration {args.iter}',
                          os.path.join(CS, f'{tag}_contact.png'))
    print(f'   contact sheet -> contactsheets/{tag}_contact.png  {sheet.size}')

    # dense short-interval strip for judging crest travel frame-to-frame
    close = sorted(set(np.linspace(n_frames // 3, n_frames // 3 + 10, 6).round().astype(int).tolist()))
    grabs2 = None
    # animated preview
    gif = os.path.join(PV, f'{tag}.gif')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4,
                    '-vf', 'fps=12,scale=440:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=200[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
                    '-loop', '0', gif], check=True)
    print(f'   preview gif -> previews/{tag}.gif  ({os.path.getsize(gif)/1e6:.2f} MB)')

    water = r.water_soft > 0.5
    sh = crest_travel_metric(frames, times, water)
    mags = [float(np.hypot(s[0], s[1])) for s in sh]
    print(f'   open-water shift between tiles px: {[f"{m:.0f}" for m in mags]}  '
          f'ncc {[f"{s[2]:.2f}" for s in sh]}')

    g, fm, sp = r.read_state()
    print(f'   h {g[...,0].min():+.1f}..{g[...,0].max():+.1f}   breaking max {g[...,3].max():.2f}')
    print(f'   foam fresh max {fm[...,0].max():.2f}  persist max {fm[...,1].max():.2f}  '
          f'coverage>0.15 {(fm[...,1]>0.15)[water].mean()*100:.1f}% of water')
    print(f'   spray max {sp[...,0].max():.2f}  coverage>0.1 {(sp[...,0]>0.1).mean()*100:.2f}% of frame')
    last = grabs[grab[-1]]
    lum = last.astype(np.float32).mean(-1) / 255.
    print(f'   water luma {lum[water].mean():.3f}   '
          f'white(>0.72,lowsat) {(lum[water]>0.72).mean()*100:.1f}%')
    return 0


if __name__ == '__main__':
    sys.exit(main())
