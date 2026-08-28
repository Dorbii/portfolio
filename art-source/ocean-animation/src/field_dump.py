import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib.cm as cm
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = presets.PRESETS['windy_rolling_surf']
r = ocean_gl.OceanRenderer(p, verbose=False)
fps,sub=24,2; dt=1/(fps*sub); t=-p['preroll']; first=True
for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
t=0.0
while t<6.0: r.step(t,dt,False); t+=dt
img=r.composite(t); g,fm,sp=r.read_state()
sw=np.frombuffer(r.fboWave.read(attachment=2,components=4,dtype='f4'),'f4').reshape(r.H,r.W,4)
Y0,X0,S,Z=300,120,110,5
def tile(a,title,cmap=cm.viridis,vmin=None,vmax=None):
    s=a[Y0:Y0+S, X0:X0+S].astype(np.float64)
    lo=np.nanmin(s) if vmin is None else vmin; hi=np.nanmax(s) if vmax is None else vmax
    n=np.clip((s-lo)/max(hi-lo,1e-9),0,1)
    im=Image.fromarray((cmap(n)[...,:3]*255).astype(np.uint8)).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(im,'RGBA'); d.rectangle([0,0,S*Z,24],fill=(0,0,0,205))
    try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',15)
    except Exception: f=ImageFont.load_default()
    d.text((5,4),f'{title}  [{lo:.3f}..{hi:.3f}]',fill=(255,255,255,255),font=f); return im
tiles=[tile(g[...,0],'hn',cm.RdBu,-1,1), tile(g[...,3],'breaking',cm.inferno,0,1),
       tile(fm[...,1],'foam persist (cover)',cm.bone,0,1.2), tile(fm[...,0],'foam fresh',cm.bone,0,1.2),
       tile(np.hypot(sw[...,0],sw[...,1]),'|swell grad|',cm.magma),
       Image.fromarray(img[Y0:Y0+S,X0:X0+S]).resize((S*Z,S*Z),Image.NEAREST)]
d=ImageDraw.Draw(tiles[-1],'RGBA'); d.rectangle([0,0,S*Z,24],fill=(0,0,0,205)); d.text((5,4),'FINAL',fill=(255,255,255,255))
W=S*Z; sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','field_dump.png'))
c=fm[Y0:Y0+S,X0:X0+S,1]
print('cover in crop: min %.3f p25 %.3f p50 %.3f p75 %.3f max %.3f'%(c.min(),np.percentile(c,25),np.percentile(c,50),np.percentile(c,75),c.max()))
print('breaking in crop: p50 %.3f max %.3f'%(np.percentile(g[Y0:Y0+S,X0:X0+S,3],50), g[Y0:Y0+S,X0:X0+S,3].max()))
print('wrote', sh.size)
