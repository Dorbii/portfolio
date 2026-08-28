import os, sys, copy, numpy as np
from PIL import Image, ImageDraw, ImageFont
import presets, ocean_gl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = presets.PRESETS['windy_rolling_surf']
VAR = [('full', {}),
       ('glitter=0', dict(glitter=0.0)),
       ('spec=0 glitter=0', dict(glitter=0.0, specGain=0.0)),
       ('sheen=0 spec=0 glit=0', dict(glitter=0.0, specGain=0.0, sheen=0.0)),
       ('foam off', dict(foamThrFresh=9.0)),
       ('crestGain=0', dict(crestGain=0.0)),
       ('chop=0', dict(ampC=0.0)),
       ('chop=0 trans=0 swash=0', dict(ampC=0.0, transGain=0.0, swash=0.0))]
BOX=(150,300,150+150,300+150)
tiles=[]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',15)
except Exception: f=ImageFont.load_default()
for name, over in VAR:
    p = dict(base); p.update(over)
    r = ocean_gl.OceanRenderer(p, verbose=False)
    fps, sub = 24, 2; dt=1.0/(fps*sub); t=-p['preroll']; first=True
    for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
    t=0.0
    while t < 6.0: r.step(t,dt,False); t+=dt
    img = r.composite(t)
    c = Image.fromarray(img[BOX[1]:BOX[3], BOX[0]:BOX[2]]).resize((450,450), Image.NEAREST)
    d = ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,450,24],fill=(0,0,0,205)); d.text((5,4),name,fill=(255,255,255,255),font=f)
    tiles.append(c)
    del r
sh=Image.new('RGB',(450*4+20,450*2+8),(14,14,18))
for i,t_ in enumerate(tiles): sh.paste(t_,((i%4)*456,(i//4)*456))
sh.save(os.path.join(ROOT,'diagnostics','ablation.png')); print('wrote', sh.size)
