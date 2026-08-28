import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wavefield as wf
import matplotlib.cm as cm
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fam = {'primary': ((0.53,0.85),2.6), 'secondary': ((0.72,0.62),1.9), 'chop': ((0.40,0.92),1.15)}
F, depth, water, sdf = wf.build(fam)
land = ~water
try: fnt = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 17)
except Exception: fnt = ImageFont.load_default()

def tile(a, t, cmap=None):
    if cmap is not None: img = cmap(np.clip(a,0,1))[...,:3]
    else: img = np.repeat(np.clip(a,0,1)[...,None],3,-1)
    img[land] = [0.11,0.10,0.09]
    im = Image.fromarray((img*255).astype(np.uint8))
    im = im.resize((im.size[0]//2, im.size[1]//2), Image.LANCZOS)
    d = ImageDraw.Draw(im,'RGBA'); d.rectangle([0,0,im.size[0],26],fill=(0,0,0,195)); d.text((6,4),t,fill=(255,255,255,255),font=fnt)
    return im

P = F['primary']
crest = 0.5+0.5*np.cos(P['S'])
crest_sharp = np.clip((np.cos(P['S'])-0.55)/0.45,0,1)
lam = 2*np.pi/np.maximum(P['kmag'],1e-6)
dirmap = 0.5+0.5*P['dir'][...,0]
dirmap2 = 0.5+0.5*P['dir'][...,1]
hue = (np.degrees(np.arctan2(P['dir'][...,1],P['dir'][...,0]))%360)/360.
import matplotlib.colors as mc
dirimg = mc.hsv_to_rgb(np.stack([hue, np.ones_like(hue)*0.85, np.ones_like(hue)*0.95],-1))
dirimg[land]=[0.11,0.10,0.09]
di = Image.fromarray((dirimg*255).astype(np.uint8)); di = di.resize((di.size[0]//2,di.size[1]//2),Image.LANCZOS)
d=ImageDraw.Draw(di,'RGBA'); d.rectangle([0,0,di.size[0],26],fill=(0,0,0,195)); d.text((6,4),'local propagation direction (hue)',fill=(255,255,255,255),font=fnt)

tiles=[tile(crest,'primary: 0.5+0.5cos(S)  -- crest pattern'),
       tile(crest_sharp,'primary: sharpened crests'),
       tile(np.clip(lam/160,0,1),'local wavelength 2pi/|grad S|  (bright=long)',cm.magma),
       di,
       tile(np.clip(depth/wf.DEPTH_SCALE,0,1),'depth',cm.viridis),
       tile(0.5+0.5*np.cos(F['chop']['S']),'chop family crest pattern')]
w0,h0=tiles[0].size
sh=Image.new('RGB',(w0*3+16,h0*2+8),(14,14,18))
for i,t in enumerate(tiles): sh.paste(t,((i%3)*(w0+8),(i//3)*(h0+8)))
sh.save(os.path.join(ROOT,'diagnostics','phase_field_check.png')); print('wrote',sh.size)
