"""Final renderer + deliverable packaging.

  python render.py all                      # every clip, mp4 + webp + gif + sheets
  python render.py calm_swell               # one clip
  python render.py all --scale 0.5          # faster proof pass
"""
import argparse, os, subprocess, sys, time
import numpy as np
from PIL import Image

import presets, ocean_gl
from prototype import contact_sheet

# OCEAN_ROOT lets a study (e.g. the closeup concept) run the whole pipeline
# against a different workspace without forking any of it.
ROOT = os.environ.get('OCEAN_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'outputs')
CS = os.path.join(ROOT, 'contactsheets')
for d in (OUT, CS):
    os.makedirs(d, exist_ok=True)

ORDER = ['calm_swell', 'windy_rolling_surf', 'heavy_crashing_surf']


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f'{cmd[0]} failed:\n{r.stderr[-2000:]}')


def make_webp(mp4, webp, fps=12, width=560):
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4,
         '-vf', f'fps={fps},scale={width}:-2:flags=lanczos',
         '-c:v', 'libwebp', '-lossless', '0', '-q:v', '48', '-compression_level', '6',
         '-loop', '0', '-preset', 'picture', '-an', '-vsync', '0', webp])


def make_gif(mp4, gif, fps=10, width=360, seconds=None):
    vf = f'fps={fps},scale={width}:-1:flags=lanczos'
    pre = ['ffmpeg', '-y', '-loglevel', 'error']
    if seconds:
        pre += ['-t', str(seconds)]
    run(pre + ['-i', mp4, '-vf',
               vf + ',split[s0][s1];[s0]palettegen=max_colors=192:stats_mode=diff[p];'
                    '[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
               '-loop', '0', gif])


def render_one(name, scale=1.0, fps=24, substeps=2, crf=11, tiles=10, sheet=True):
    p = presets.PRESETS[name]
    print(f'\n=== {p["title"]}  ({name})  {p["duration"]:.1f}s  loop {p["loop"]:.1f}s ===')
    t0 = time.time()
    r = ocean_gl.OceanRenderer(p)
    n_frames = int(round(p['duration'] * fps))
    grab = sorted(set(np.linspace(0, n_frames - 1, tiles).round().astype(int).tolist()))
    mp4 = os.path.join(OUT, f'{name}.mp4')
    grabs = r.run(p['duration'], fps=fps, substeps=substeps, grab=grab, out_mp4=mp4,
                  scale=scale, crf=crf, progress_every=96)
    print(f'   render {time.time()-t0:.1f}s -> outputs/{name}.mp4 '
          f'({os.path.getsize(mp4)/1e6:.2f} MB)')

    webp = os.path.join(OUT, f'{name}.webp')
    make_webp(mp4, webp)
    print(f'   animated webp -> outputs/{name}.webp ({os.path.getsize(webp)/1e6:.2f} MB)')

    gif = os.path.join(OUT, f'{name}_preview.gif')
    make_gif(mp4, gif)
    print(f'   preview gif   -> outputs/{name}_preview.gif ({os.path.getsize(gif)/1e6:.2f} MB)')

    if sheet:
        frames = [grabs[i] for i in grab]
        times = [i / fps for i in grab]
        sp = os.path.join(CS, f'{name}_final_contact.png')
        contact_sheet(frames, times, f'{p["title"]}  --  final render, {p["duration"]:.1f}s @ {fps}fps',
                      sp, cols=5, tile_w=300)
        print(f'   contact sheet -> contactsheets/{name}_final_contact.png')
    del r
    return mp4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('which', nargs='?', default='all')
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--substeps', type=int, default=2)
    ap.add_argument('--crf', type=int, default=11)
    ap.add_argument('--no-sheet', action='store_true')
    args = ap.parse_args()
    names = ORDER if args.which == 'all' else [args.which]
    for n in names:
        render_one(n, scale=args.scale, fps=args.fps, substeps=args.substeps,
                   crf=args.crf, sheet=not args.no_sheet)
    print('\ndone.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
