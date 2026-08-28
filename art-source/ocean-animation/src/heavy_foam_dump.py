import os, numpy as np
from PIL import Image, ImageDraw
import matplotlib.cm as cm
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = presets.PRESETS['heavy_crashing_surf']
r = ocean_gl.OceanRenderer(p, verbose=False)
fps,sub=24,2; dt=1/(fps*sub); t=-p['preroll']; first=True
for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
t=0.0
while t<9.0: r.step(t,dt,False); t+=dt
img=r.composite(t); g,fm,sp=r.read_state()
import wavefield as wf
depth,water,sdf = wf.bathymetry()
Y0,X0,S,Z=40,20,240,2
def tile(a,title,cmap=cm.viridis,vmin=None,vmax=None):
    s=a[Y0:Y0+S,X0:X0+S].astype(np.float64)
    lo=np.nanmin(s) if vmin is None else vmin; hi=np.nanmax(s) if vmax is None else vmax
    n=np.clip((s-lo)/max(hi-lo,1e-9),0,1)
    im=Image.fromarray((cmap(n)[...,:3]*255).astype(np.uint8)).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(im,'RGBA'); d.rectangle([0,0,S*Z,24],fill=(0,0,0,205))
    d.text((5,4),f'{title} [{lo:.2f}..{hi:.2f}]',fill=(255,255,255,255)); return im
tiles=[tile(fm[...,1],'foam persist (cover)',cm.bone,0,1.2),
       tile(fm[...,0],'foam fresh',cm.bone,0,1.2),
       tile(g[...,3],'breaking',cm.inferno,0,1),
       tile(sp[...,0],'spray density',cm.hot,0,1.2),
       tile(depth,'depth px',cm.viridis),
       Image.fromarray(img[Y0:Y0+S,X0:X0+S]).resize((S*Z,S*Z),Image.NEAREST)]
d=ImageDraw.Draw(tiles[-1],'RGBA'); d.rectangle([0,0,S*Z,24],fill=(0,0,0,205)); d.text((5,4),'FINAL',fill=(255,255,255,255))
W=S*Z; sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','heavy_foam_dump.png'))
reg=(slice(Y0,Y0+S),slice(X0,X0+S))
print('in slab region: cover p50 %.3f max %.3f | fresh max %.3f | breaking max %.3f | spray max %.3f | depth p50 %.1f'%(
   np.percentile(fm[reg][...,1],50), fm[reg][...,1].max(), fm[reg][...,0].max(),
   g[reg][...,3].max(), sp[reg][...,0].max(), np.percentile(depth[reg],50)))
print('wrote', sh.size)
