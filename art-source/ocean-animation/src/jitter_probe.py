import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = presets.PRESETS['windy_rolling_surf']
OFF = dict(specGain=0.0, sheen=0.0, glitter=0.0, shadowGain=0.0, crestGain=0.0,
           laceLineGain=0.0, foamMass=0.0, swash=0.0, transGain=0.0, rippleGain=0.0,
           plateInfluence=0.0, plateTint=0.0, posterize=0.0, vigMix=0.0,
           ampS=0.0, ampC=0.0)
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',16)
except Exception: f=ImageFont.load_default()
Y0,X0,S,Z=250,90,180,3
tiles=[]
for j in [1.25, 0.80, 0.45, 0.25, 0.12, 0.0]:
    p=dict(b); p.update(OFF); p['jitter']=j
    r=ocean_gl.OceanRenderer(p, verbose=False)
    fps,sub=24,2; dt=1/(fps*sub); t=-2.0; first=True
    for _ in range(int(2.0*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t<3.0: r.step(t,dt,False); t+=dt
    img=r.composite(t)
    c=Image.fromarray(img[Y0:Y0+S,X0:X0+S]).resize((S*Z,S*Z),Image.NEAREST)
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,S*Z,26],fill=(0,0,0,205))
    d.text((5,5),f'jitter = {j:.2f} rad',fill=(255,255,255,255),font=f)
    tiles.append(c); del r
W=S*Z; sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','jitter_probe.png')); print('wrote',sh.size)
