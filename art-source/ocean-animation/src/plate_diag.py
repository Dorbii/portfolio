import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, 'masks')
S = np.asarray(Image.open(os.path.join(M, 'land_plate.png'))).astype(np.float32)/255.
w = np.asarray(Image.open(os.path.join(M, 'water_mask.png'))).astype(np.float32)/255.
depth = np.load(os.path.join(M, 'depth.npy')); sdf = np.load(os.path.join(M, 'shore_sdf.npy'))
clean = np.asarray(Image.open(os.path.join(M, 'clean_water_plate.png'))).astype(np.float32)/255.
band = np.asarray(Image.open(os.path.join(M, 'shore_band.png'))).astype(np.float32)/255.
sprayb = np.asarray(Image.open(os.path.join(M, 'spray_land_band.png'))).astype(np.float32)/255.

edge = (ndi.binary_dilation(w > .5, np.ones((3,3))) ^ (w > .5))
ov = S.copy(); ov[edge] = [1, 0.15, 0.6]
tint = S.copy(); tint[..., 0] = np.where(w > .5, tint[..., 0]*0.35 + 0.65*1.0, tint[..., 0])
tint = S*(1-0.45*w[...,None]) + 0.45*w[...,None]*np.array([1.0,0.25,0.45])
bandv = S*(1-0.45*band[...,None]) + 0.45*band[...,None]*np.array([0.2,1.0,0.4])
bandv = bandv*(1-0.75*sprayb[...,None]) + 0.75*sprayb[...,None]*np.array([1.0,0.35,0.1])
dv = np.clip(depth/depth.max(),0,1); dvi = np.stack([dv*0.15, dv*0.7, dv*0.95],-1)
sv = np.clip((sdf+150)/340,0,1)
import matplotlib.cm as cm
svi = cm.turbo(sv)[...,:3]

def lab(a, t):
    im = Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8))
    im = im.resize((im.size[0]//2, im.size[1]//2), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA'); d.rectangle([0,0,im.size[0],26], fill=(0,0,0,190))
    try: f = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 16)
    except Exception: f = ImageFont.load_default()
    d.text((6,4), t, fill=(255,255,255,255), font=f); return im
tiles = [lab(ov,'water mask boundary on plate'), lab(tint,'water coverage'), lab(bandv,'shore band green / spray-onto-land band orange'),
         lab(dvi,'bathymetry (depth)'), lab(svi,'shoreline SDF'), lab(clean,'clean water plate (foam suppressed)')]
w0,h0 = tiles[0].size
sh = Image.new('RGB',(w0*3+16,h0*2+8),(14,14,18))
for i,t in enumerate(tiles): sh.paste(t, ((i%3)*(w0+8),(i//3)*(h0+8)))
sh.save(os.path.join(ROOT,'diagnostics','plate_diagnostics.png')); print('wrote', sh.size)
