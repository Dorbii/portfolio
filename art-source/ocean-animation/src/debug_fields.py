import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib.cm as cm
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1] if len(sys.argv)>1 else 'windy_rolling_surf'
p = presets.PRESETS[name]
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2; dt = 1.0/(fps*sub); t = -p['preroll']; first=True
for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
t=0.0
while t < 6.0: r.step(t,dt,False); t+=dt
img = r.composite(t)
g, fm, sp = r.read_state()
BOX=(90,240,390,540)
x0,y0,x1,y1 = BOX
def tile(a, title, cmap=cm.viridis, vmin=None, vmax=None):
    s = a[y0:y1, x0:x1].astype(np.float64)
    lo = np.nanmin(s) if vmin is None else vmin; hi = np.nanmax(s) if vmax is None else vmax
    n = np.clip((s-lo)/max(hi-lo,1e-9),0,1)
    im = Image.fromarray((cmap(n)[...,:3]*255).astype(np.uint8)).resize((300*2,300*2), Image.NEAREST)
    d = ImageDraw.Draw(im,'RGBA'); d.rectangle([0,0,600,24],fill=(0,0,0,200))
    try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',15)
    except Exception: f=ImageFont.load_default()
    d.text((5,4), f'{title}   [{lo:.3f} .. {hi:.3f}]', fill=(255,255,255,255), font=f); return im
tiles=[tile(g[...,0],'hn (normalised height)',cm.RdBu,-1,1),
       tile(np.hypot(g[...,1],g[...,2]),'|grad h|',cm.magma),
       tile(g[...,3],'breaking',cm.inferno,0,1),
       tile(fm[...,1],'foam persist',cm.bone,0,1.2),
       tile(fm[...,0],'foam fresh',cm.bone,0,1.2),
       Image.fromarray(img[y0:y1,x0:x1]).resize((600,600),Image.NEAREST)]
d=ImageDraw.Draw(tiles[-1],'RGBA'); d.rectangle([0,0,600,24],fill=(0,0,0,200)); d.text((5,4),'composite',fill=(255,255,255,255))
sh=Image.new('RGB',(600*3+16,600*2+8),(14,14,18))
for i,tl in enumerate(tiles): sh.paste(tl,((i%3)*608,(i//3)*608))
sh=sh.resize((sh.size[0]//2, sh.size[1]//2), Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics',f'fields_{name}.png')); print('wrote', sh.size)
