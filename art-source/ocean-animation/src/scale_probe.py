import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = presets.PRESETS['windy_rolling_surf']
BOX=(300,120); S=150; Z=4
VAR=[('current (ampS 2.0, ampC 0.38, spread 27)', {}),
     ('ampS 0.9', dict(ampS=0.9)),
     ('ampS 0.9 ampC 0.10', dict(ampS=0.9, ampC=0.10)),
     ('+ spread 14', dict(ampS=0.9, ampC=0.10, spread=14.0)),
     ('+ ampP 4.6 (bigger swell)', dict(ampS=0.9, ampC=0.10, spread=14.0, ampP=4.6)),
     ('+ longer swell T=3.1', dict(ampS=0.9, ampC=0.10, spread=14.0, ampP=4.6,
        families={'primary': ((0.469,0.883),3.10), 'secondary': ((0.788,0.616),1.78), 'chop': ((0.259,0.966),1.04)}))]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',16)
except Exception: f=ImageFont.load_default()
tiles=[]
for name,over in VAR:
    p=dict(base); p.update(over)
    r=ocean_gl.OceanRenderer(p, verbose=False)
    fps,sub=24,2; dt=1/(fps*sub); t=-p['preroll']; first=True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t<6.0: r.step(t,dt,False); t+=dt
    img=r.composite(t)
    c=Image.fromarray(img[BOX[0]:BOX[0]+S, BOX[1]:BOX[1]+S]).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,S*Z,26],fill=(0,0,0,205)); d.text((5,5),name,fill=(255,255,255,255),font=f)
    tiles.append(c); del r
W=S*Z
sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','scale_probe.png')); print('wrote',sh.size)
