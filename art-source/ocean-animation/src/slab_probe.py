import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = presets.PRESETS['heavy_crashing_surf']
VAR=[('current',{}), ('foamMass=0',dict(foamMass=0.0)),
     ('sprayGain=0',dict(sprayGain=0.0)), ('crestGain=0',dict(crestGain=0.0)),
     ('laceLineGain=0',dict(laceLineGain=0.0)),
     ('foam+spray+lines 0',dict(foamMass=0.0,sprayGain=0.0,crestGain=0.0,laceLineGain=0.0))]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',17)
except Exception: f=ImageFont.load_default()
Y0,X0,S,Z=60,20,260,2
tiles=[]
for name,over in VAR:
    p=dict(b); p.update(over)
    r=ocean_gl.OceanRenderer(p, verbose=False)
    fps,sub=24,2; dt=1/(fps*sub); t=-p['preroll']; first=True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t<9.0: r.step(t,dt,False); t+=dt
    img=r.composite(t)
    c=Image.fromarray(img[Y0:Y0+S,X0:X0+S]).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,S*Z,26],fill=(0,0,0,205)); d.text((5,5),name,fill=(255,255,255,255),font=f)
    tiles.append(c); del r
W=S*Z; sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','slab_probe3.png')); print('wrote',sh.size)
