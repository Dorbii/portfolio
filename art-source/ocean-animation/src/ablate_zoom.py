import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = presets.PRESETS['windy_rolling_surf']
BOX=(300,120); S=110; Z=5
OFF=dict(specGain=0.0,sheen=0.0,glitter=0.0,shadowGain=0.0,crestGain=0.0,
         laceLineGain=0.0,foamMass=0.0,swash=0.0,transGain=0.0,rippleGain=0.0,
         plateInfluence=0.0,plateTint=0.0)
VAR=[('full',{}),
     ('everything off + plate off', dict(OFF)),
     ('+ troughGain=0', dict(OFF, troughGain=0.0)),
     ('+ exposure/sat neutral', dict(OFF, troughGain=0.0, saturation=1.0, exposure=1.0)),
     ('+ vignette off', dict(OFF, troughGain=0.0, vigMix=0.0)),
     ('depth ramp only (all waves 0)', dict(OFF, troughGain=0.0, ampP=0.0, ampS=0.0, ampC=0.0))]
_UNUSED=[('spec=0',dict(specGain=0.0)),
     ('spec=0 sheen=0',dict(specGain=0.0,sheen=0.0)),
     ('base colour only',dict(specGain=0.0,sheen=0.0,glitter=0.0,shadowGain=0.0,crestGain=0.0,
                              laceLineGain=0.0,foamMass=0.0,swash=0.0,transGain=0.0,rippleGain=0.0)),
     ('base, chop=0 too',dict(specGain=0.0,sheen=0.0,glitter=0.0,shadowGain=0.0,crestGain=0.0,
                              laceLineGain=0.0,foamMass=0.0,swash=0.0,transGain=0.0,rippleGain=0.0,
                              ampC=0.0,chopGain=0.0)),
     ('base, chop&sec=0',dict())]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',15)
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
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,S*Z,24],fill=(0,0,0,200)); d.text((5,4),name,fill=(255,255,255,255),font=f)
    tiles.append(c); del r
W=S*Z
sh=Image.new('RGB',(W*3+16,W*2+8),(12,12,16))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%3)*(W+8),(i//3)*(W+8)))
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics','ablate_zoom2.png')); print('wrote',sh.size)
