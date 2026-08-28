"""Trace one wave along its direction of travel and check the four stages appear
in order: dark hollow -> rising teal face -> narrow bright lip -> collapse.

The point is that this is checkable rather than a matter of opinion: the profile
either runs trough, face, lip, whitewater in that spatial order or it does not.
"""
import os, sys, numpy as np
from PIL import Image, ImageDraw
import presets, ocean_gl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
name = sys.argv[1] if len(sys.argv) > 1 else 'heavy_crashing_surf'
p = presets.PRESETS[name]
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first = True
for _ in range(int(p['preroll']*fps*sub)): r.step(t, dt, first); first = False; t += dt
t = 0.0
while t < 10.0: r.step(t, dt, False); t += dt
img = r.composite(t).astype(np.float32)/255.0
sw = np.frombuffer(r.fboWave.read(attachment=2, components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)
fm = np.frombuffer(r.fboFoam[r.cur].read(components=4, dtype='f4'), 'f4').reshape(r.H, r.W, 4)
depth = np.frombuffer(r.texP.read(), 'f4').reshape(r.H, r.W, 4)[..., 3]

d = np.array(p['families']['primary'][0], np.float64); d /= np.linalg.norm(d)
# start well offshore and walk toward the shore along the direction of travel
N = 260
best = None
for sx, sy in [(120, 560), (150, 760), (95, 980), (200, 1040), (60, 700)]:
    xs = np.clip((sx + d[0]*np.arange(N)).astype(int), 0, r.W-1)
    ys = np.clip((sy + d[1]*np.arange(N)).astype(int), 0, r.H-1)
    dp = depth[ys, xs]
    if dp[0] > 40 and dp[-1] < 8:            # genuinely crosses the surf zone
        best = (xs, ys); break
if best is None:
    xs = np.clip((120 + d[0]*np.arange(N)).astype(int), 0, r.W-1)
    ys = np.clip((560 + d[1]*np.arange(N)).astype(int), 0, r.H-1)
else:
    xs, ys = best

L = (img[ys, xs] @ LUMA)
rgb = img[ys, xs]
teal = rgb[:, 1]*0.5 + rgb[:, 2]*0.5 - rgb[:, 0]      # blue-green minus red
hn = sw[ys, xs, 2]; bp = sw[ys, xs, 3]; cov = fm[ys, xs, 1]; dp = depth[ys, xs]

W, H = 980, 520
sheet = Image.new('RGB', (W, H + 130), (14, 14, 18))
dr = ImageDraw.Draw(sheet)
def plot(v, col, lo, hi, label, yoff, hgt):
    pts = [(int(i*(W-40)/(N-1))+20, yoff+hgt - int(np.clip((v[i]-lo)/(hi-lo), 0, 1)*hgt)) for i in range(N)]
    dr.line(pts, fill=col, width=2)
    dr.text((24, yoff+2), label, fill=col)
dr.text((20, 6), f'{name}: transect along the direction of travel, offshore -> shore', fill=(230, 230, 235))
plot(dp,   (110, 130, 160), 0, 90,  'depth px',            30,  110)
plot(hn,   (120, 200, 255), -1, 1,  'swell height hnS',    150, 110)
plot(bp,   (255, 190,  90), 0, 1,   'break phase',         150, 110)
plot(teal, ( 90, 235, 200), -0.05, 0.45, 'teal (G+B)/2 - R', 270, 110)
plot(L,    (255, 255, 255), 0, 1,   'rendered luma',       270, 110)
plot(cov,  (255, 130, 130), 0, 1.2, 'foam cover',          390, 110)
# the transect itself, drawn on the frame
strip = Image.fromarray((img[ys, xs]*255).astype(np.uint8).reshape(1, N, 3)).resize((W-40, 60), Image.NEAREST)
sheet.paste(strip, (20, H + 20))
dr.text((20, H + 4), 'the transect, sampled 1:1', fill=(200, 200, 205))
out = os.path.join(ROOT, 'diagnostics', 'codexref', f'transect_{name}.png')
sheet.save(out)

# and the check, stated numerically
i_lip = int(np.argmax(L * (bp > 0.35)))
seg = slice(max(0, i_lip-45), i_lip)
print(f'lip at sample {i_lip} (depth {dp[i_lip]:.1f} px, luma {L[i_lip]:.3f})')
print(f'  hollow before it : min luma {L[seg].min():.3f} at sample {seg.start + int(np.argmin(L[seg]))}')
print(f'  teal peak before : {teal[seg].max():.3f} at sample {seg.start + int(np.argmax(teal[seg]))}')
print(f'  foam cover before lip {cov[seg].max():.3f}   after lip {cov[i_lip:i_lip+45].max():.3f}')
print(f'  break phase: offshore {bp[:40].mean():.3f} -> at lip {bp[i_lip]:.3f}')
print('wrote', out)
