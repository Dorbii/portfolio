import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = presets.PRESETS['windy_rolling_surf']
OFF = dict(specGain=0.0, sheen=0.0, glitter=0.0, shadowGain=0.0, crestGain=0.0,
           laceLineGain=0.0, foamMass=0.0, swash=0.0, transGain=0.0, rippleGain=0.0,
           plateInfluence=0.0, plateTint=0.0, posterize=0.0, vigMix=0.0)
VAR=[('no waves at all',            dict(OFF, ampP=0.0, ampS=0.0, ampC=0.0)),
     ('PRIMARY only',               dict(OFF, ampS=0.0, ampC=0.0)),
     ('PRIMARY, 1 component',       dict(OFF, ampS=0.0, ampC=0.0, spread=0.0, harmA=(1.0,0.0,0.0))),
     ('SECONDARY only',             dict(OFF, ampP=0.0, ampC=0.0)),
     ('CHOP only',                  dict(OFF, ampP=0.0, ampS=0.0)),
     ('all three families',         dict(OFF))]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',16)
except Exception: f=ImageFont.load_default()
Y0,X0,S,Z=300,120,120,4
tiles=[]
for name,over in VAR:
    p=dict(b); p.update(over)
    r=ocean_gl.OceanRenderer(p, verbose=False)
    fps,sub=24,2; dt=1/(fps*sub); t=-2.0; first=True
    for _ in range(int(2.0*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t<3.0: r.step(t,dt,False); t+=dt
    img=r.composite(t)
    c=Image.fromarray(img[Y0:Y0+S,X0:X0+S]).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,S*Z,26],fill=(0,0,0,205)); d.text((5,5),name,fill=(255,255,255,255),font=f)
    tiles.append(c); del r
W=S*Z; sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','family_ladder.png')); print('wrote',sh.size)
