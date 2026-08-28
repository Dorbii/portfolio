import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT,'masks')
S = np.asarray(Image.open(os.path.join(M,'land_plate.png'))).astype(np.float32)/255.
w = np.asarray(Image.open(os.path.join(M,'water_mask.png'))).astype(np.float32)/255. > .5
edge = ndi.binary_dilation(w, np.ones((3,3))) ^ w
ov = S.copy(); ov[edge] = [1.0, 0.1, 0.55]
picks = [('sea stacks upper', (300,240,540,480)), ('north dock + pilings', (330,880,570,1120)),
         ('south dock + pilings', (350,1120,590,1360)), ('left frame edge', (0,600,240,840)),
         ('headland notch', (330,480,570,720)), ('lower stacks', (300,1240,540,1463-0))]
tiles=[]
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',15)
except Exception: f=ImageFont.load_default()
for name,(x0,y0,x1,y1) in picks:
    y1=min(y1,S.shape[0]); x1=min(x1,S.shape[1])
    c=Image.fromarray((np.clip(ov[y0:y1,x0:x1],0,1)*255).astype(np.uint8)).resize((480,480),Image.NEAREST)
    d=ImageDraw.Draw(c,'RGBA'); d.rectangle([0,0,480,24],fill=(0,0,0,190)); d.text((6,4),name,fill=(255,255,255,255),font=f)
    tiles.append(c)
sh=Image.new('RGB',(480*3+16,480*2+8),(14,14,18))
for i,t in enumerate(tiles): sh.paste(t,((i%3)*488,(i//3)*488))
sh.save(os.path.join(ROOT,'diagnostics','mask_zoom_check.png')); print('wrote mask_zoom_check')
