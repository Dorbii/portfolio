import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tag = sys.argv[1] if len(sys.argv)>1 else 'L3'
nm  = sys.argv[2] if len(sys.argv)>2 else 'windy_rolling_surf'
ref = sys.argv[3] if len(sys.argv)>3 else 'C2'
A = np.asarray(Image.open(os.path.join(ROOT,'diagnostics',f'{tag}_{nm}_full.png')).convert('RGB'))
B = np.asarray(Image.open(os.path.join(ROOT,'refs','canonical',f'{ref}.png')).convert('RGB'))
BOXES=[('deep water',(120,300)),('mid swell',(200,700)),('shore foam',(330,420))]
S=110; Z=5
try: f=ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf',15)
except Exception: f=ImageFont.load_default()
tiles=[]
for name,(x,y) in BOXES:
    a=Image.fromarray(A[y:y+S,x:x+S]).resize((S*Z,S*Z),Image.NEAREST)
    b=Image.fromarray(B[y:y+S,x:x+S]).resize((S*Z,S*Z),Image.NEAREST)
    pair=Image.new('RGB',(S*Z*2+6,S*Z+26),(16,16,20)); pair.paste(a,(0,26)); pair.paste(b,(S*Z+6,26))
    d=ImageDraw.Draw(pair); d.text((4,5),f'RENDER {name}  (5x)',fill=(120,235,160),font=f)
    d.text((S*Z+10,5),f'REFERENCE {ref} {name}',fill=(240,200,110),font=f); tiles.append(pair)
W=tiles[0].size[0]; sh=Image.new('RGB',(W,sum(t.size[1]+6 for t in tiles)+6),(12,12,16))
yy=3
for t in tiles: sh.paste(t,(0,yy)); yy+=t.size[1]+6
sh=sh.resize((sh.size[0]//2,sh.size[1]//2),Image.LANCZOS)
sh.save(os.path.join(ROOT,'diagnostics',f'zoom_{tag}_{nm}.png')); print('wrote',sh.size)
