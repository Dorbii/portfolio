"""Is the offshore whitecap field an EVENT field or a TEXTURE?

Dumps the wave-pass outputs for a preset in the current OCEAN_ROOT scene and
reports, over deep water only: what fraction of the sea is whitecapping, how
saturated the field is, and how much the group envelope actually modulates it.

This is what found the foam carpet: whitecap above threshold on 19% of deep
pixels every frame, integrated by 5.5 s of persistence into fresh foam above
the render threshold on over half the sea -- while formEnv ran p50 1.00 / p99
1.65, so the patch gate keyed at 0.50 was below its entire range and passing
everything. foam_shape cannot see any of this (a corduroy sea satisfies it);
this reads the fields the shader actually computed.

    OCEAN_ROOT=$PWD/scenes/match OCEAN_G=130 OCEAN_DEPTH=105 OCEAN_SHELF=230 \
    PYTHONPATH=$PWD/src python src/field_stats.py heavy_crashing_surf out.png \
        [k=v ...]
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
import matplotlib.cm as cm
import presets, ocean_gl

name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
out = sys.argv[2]
p = dict(presets.PRESETS[name])
for kv in sys.argv[3:]:
    k, v = kv.split('=')
    p[k] = float(v)

r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2
dt = 1.0 / (fps * sub)
t = -p['preroll']
first = True
for _ in range(int(p['preroll'] * fps * sub)):
    r.step(t, dt, first)
    first = False
    t += dt
t = 0.0
while t < 6.0:
    r.step(t, dt, False)
    t += dt
img = r.composite(t)
g, fm, sp = r.read_state()
flow = np.frombuffer(r.fboWave.read(attachment=1, components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)
pathf = np.frombuffer(r.fboWave.read(attachment=3, components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)

root = os.environ.get('OCEAN_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
depth = np.load(os.path.join(root, 'masks', 'depth.npy'))
wm = np.asarray(Image.open(os.path.join(root, 'masks', 'water_mask.png')).convert('L'), np.float32) / 255 > 0.9
h, w = min(depth.shape[0], r.H), min(depth.shape[1], r.W)
deep = wm[:h, :w] & (depth[:h, :w] > 6.0)

wc = flow[:h, :w, 3]
br = g[:h, :w, 3]
fe = pathf[:h, :w, 1]
fr = fm[:h, :w, 0]

def rep(tag, a, m):
    v = a[m]
    print('%-10s mean %.4f  p50 %.4f  p90 %.4f  p99 %.4f  frac>0.05 %.3f  frac>0.25 %.3f  frac>0.6 %.3f'
          % (tag, v.mean(), *np.percentile(v, [50, 90, 99]), (v > 0.05).mean(), (v > 0.25).mean(), (v > 0.6).mean()))

print('deep-water px: %d (%.1f%% of frame)' % (deep.sum(), 100.0 * deep.mean()))
rep('whitecap', wc, deep)
rep('breaking', br, deep)
rep('formEnv', fe, deep)
rep('foamFresh', fr, deep)

def tile(a, title, cmap=cm.inferno, vmin=0.0, vmax=1.0):
    n = np.clip((a.astype(np.float64) - vmin) / max(vmax - vmin, 1e-9), 0, 1)
    im = Image.fromarray((cmap(n)[..., :3] * 255).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    d.rectangle([0, 0, im.width, 22], fill=(0, 0, 0, 205))
    d.text((5, 4), title, fill=(255, 255, 255, 255))
    return im

tiles = [tile(wc, 'whitecap'), tile(fe, 'formEnv', cm.viridis), tile(br, 'breaking'),
         tile(fr, 'foam fresh', cm.bone, 0, 1.2)]
W, H = tiles[0].width, tiles[0].height
sh = Image.new('RGB', (W * 2 + 8, H * 2 + 8), (12, 12, 16))
for i, t_ in enumerate(tiles):
    sh.paste(t_, ((i % 2) * (W + 8), (i // 2) * (H + 8)))
sh.save(out)
print('wrote', out)
