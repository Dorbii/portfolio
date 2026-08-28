import os, subprocess, numpy as np, sys
from PIL import Image
import presets, ocean_gl
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT,'work')
p = presets.PRESETS['windy_rolling_surf']
r = ocean_gl.OceanRenderer(p, verbose=False)
fps, sub = 24, 2; dt=1.0/(fps*sub); t=-p['preroll']; first=True
for _ in range(int(p['preroll']*fps*sub)): r.step(t,dt,first); first=False; t+=dt
N=72
ow, oh = r.W - r.W%2, r.H - r.H%2
ll = os.path.join(WORK,'_lossless.mkv')
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{ow}x{oh}','-r','24','-i','-',
     '-an','-c:v','libx264','-qp','0','-pix_fmt','yuv444p',ll]
pr=subprocess.Popen(cmd,stdin=subprocess.PIPE)
t=0.0
for k in range(N):
    for _ in range(sub): r.step(t,dt,False); t+=dt
    pr.stdin.write(np.ascontiguousarray(r.composite(t)[:oh,:ow]).tobytes())
pr.stdin.close(); pr.wait()
print('lossless intermediate', os.path.getsize(ll)/1e6, 'MB')

wm=np.load(os.path.join(ROOT,'masks','water_soft.npy')); sl=np.load(os.path.join(ROOT,'masks','spray_land_soft.npy'))
prot=((wm<=0.0)&(sl<=0.0))[:oh,:ow]
def decode(path):
    o=subprocess.run(['ffmpeg','-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    a=np.frombuffer(o,np.uint8); n=a.size//(ow*oh*3); return a[:n*ow*oh*3].reshape(n,oh,ow,3)
def measure(path):
    fr=decode(path); ref=fr[0].astype(np.int16); mx=0; mn=0.0
    for f in fr[1:]:
        d=np.abs(f.astype(np.int16)-ref)[prot]; mx=max(mx,int(d.max())); mn=max(mn,float(d.mean()))
    return mn,mx,os.path.getsize(path)/1e6
CFG=[('crf14 base',            ['-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p']),
     ('crf12 aq0 deblock-off', ['-c:v','libx264','-preset','slow','-crf','12','-pix_fmt','yuv420p','-x264-params','aq-mode=0:deblock=-3,-3']),
     ('crf10 aq0 deblock-off', ['-c:v','libx264','-preset','slow','-crf','10','-pix_fmt','yuv420p','-x264-params','aq-mode=0:deblock=-3,-3']),
     ('crf12 yuv444',          ['-c:v','libx264','-preset','slow','-crf','12','-pix_fmt','yuv444p','-x264-params','aq-mode=0:deblock=-3,-3']),
     ('crf8 aq0 deblock-off',  ['-c:v','libx264','-preset','slow','-crf','8','-pix_fmt','yuv420p','-x264-params','aq-mode=0:deblock=-3,-3'])]
for name,args in CFG:
    out=os.path.join(WORK,'_enc.mp4')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',ll]+args+['-an',out],check=True)
    mn,mx,sz=measure(out)
    print(f'  {name:26s} land mean {mn:5.3f}  max {mx:3d}   {sz*15/ (N/24):6.1f} MB @15s')
