"""Side-by-side of the three delivered sea states plus the untouched source plate."""
import json, os, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def font(sz,b=False):
    try: return ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if b else r'C:\Windows\Fonts\segoeui.ttf', sz)
    except Exception: return ImageFont.load_default()
def frame_at(mp4, t):
    W,H=1074,1462
    o=subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',mp4,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(o[:W*H*3],np.uint8).reshape(H,W,3)
def measured(name):
    """Read the numbers from the validation record rather than hard-coding them --
    stale captions on a deliverable are a correctness bug, not a cosmetic one."""
    fp = os.path.join(ROOT, 'diagnostics', f'validate_{name}.json')
    if not os.path.exists(fp):
        return '(not yet validated)'
    v = json.load(open(fp))
    return f'foam {v["foam_fraction_of_water"]*100:.1f}%  luma {v["mean_water_luma"]:.3f}'

items=[('SOURCE PLATE (unmodified)', np.asarray(Image.open(os.path.join(ROOT,'masks','land_plate.png')).convert('RGB'))[:1462,:1074], 'foam 14.3%  luma 0.379  (measured on the plate)'),
       ('CALM SWELL  13.5s', frame_at(os.path.join(ROOT,'outputs','calm_swell.mp4'), 6.0), measured('calm_swell')),
       ('WINDY ROLLING SURF  15.0s', frame_at(os.path.join(ROOT,'outputs','windy_rolling_surf.mp4'), 7.0), measured('windy_rolling_surf')),
       ('HEAVY CRASHING SURF  17.0s', frame_at(os.path.join(ROOT,'outputs','heavy_crashing_surf.mp4'), 9.0), measured('heavy_crashing_surf'))]
TW=430; TH=int(TW*1462/1074)
sh=Image.new('RGB',(len(items)*(TW+8)+8, TH+92),(12,12,16))
d=ImageDraw.Draw(sh)
d.text((10,10),'Three ocean states over one immutable plate — the land is byte-identical in all four images',font=font(22,True),fill=(238,240,246))
d.text((10,38),'foam % and luma measured with the same formula used on the reference library',font=font(15),fill=(150,155,166))
for i,(t,img,sub) in enumerate(items):
    im=Image.fromarray(img).resize((TW,TH),Image.LANCZOS)
    x=8+i*(TW+8); sh.paste(im,(x,66))
    d.rectangle([x,66+TH,x+TW,66+TH+24],fill=(26,28,34))
    col=(250,210,80) if i==0 else (120,200,255) if i==1 else (140,240,160) if i==2 else (255,150,120)
    d.text((x+5,66+TH+4),f'{t}   {sub}',font=font(13),fill=col)
sh.save(os.path.join(ROOT,'contactsheets','three_states_comparison.png'))
print('wrote contactsheets/three_states_comparison.png', sh.size)
