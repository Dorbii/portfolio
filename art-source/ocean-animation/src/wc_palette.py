import os, sys, subprocess
SRC=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(SRC)
WS=os.path.join(ROOT,'scenes','worldcoast')
def env():
    e=dict(os.environ); e['OCEAN_ROOT']=WS; e['OCEAN_CALM_REFS']=''; e['PYTHONPATH']=SRC
    e['OCEAN_G']='130.0'; e['OCEAN_DEPTH']='105.0'; e['OCEAN_SHELF']='230.0'
    return e
def _r():
    sys.path.insert(0,SRC)
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    import presets, ocean_gl, worldpalette
    base=presets.PRESETS['windy_rolling_surf']
    cases=[('as tuned (plate-anchored)',None),
           ('world-anchored  sat x0.55',dict(sat_scale=0.55)),
           ('world-anchored  sat x0.38',dict(sat_scale=0.38,luma_lo=0.075,luma_hi=0.30)),
           ('world-anchored  sat x0.25',dict(sat_scale=0.25,luma_lo=0.070,luma_hi=0.27))]
    tiles=[]
    for lb,kw in cases:
        p=dict(base)
        if kw is not None:
            p['palette']=worldpalette.reanchor(base['palette'],**kw)
        r=ocean_gl.OceanRenderer(p,verbose=False)
        fps,sub=24,2; dt=1/(fps*sub); t=-p['preroll']; first=True
        for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
        t=0.0
        while t<6.0: r.step(t,dt,False); t+=dt
        tiles.append((lb,Image.fromarray(r.composite(t))))
        print('rendered',lb)
    try: font=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',20)
    except Exception: font=ImageFont.load_default()
    W,H=tiles[0][1].size
    sh=Image.new('RGB',(W*len(tiles)+8*(len(tiles)-1),H),(10,12,16))
    for i,(lb,im) in enumerate(tiles):
        im=im.copy(); d=ImageDraw.Draw(im,'RGBA')
        d.rectangle([0,0,380,30],fill=(0,0,0,228)); d.text((7,5),lb,fill=(255,255,255,255),font=font)
        sh.paste(im,(i*(W+8),0))
    sh=sh.resize((sh.width//2,sh.height//2),Image.LANCZOS)
    out=os.path.join(ROOT,'diagnostics','worldcoast_palette.png'); sh.save(out); print('wrote',out)
if __name__=='__main__':
    if sys.argv[-1]=='_r': _r()
    else: sys.exit(subprocess.run([sys.executable,os.path.abspath(__file__),'_r'],env=env()).returncode)
