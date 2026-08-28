import os, subprocess, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT,'masks')
path = os.path.join(ROOT,'outputs','windy_rolling_surf.mp4')
W,H = 1074,1462
o = subprocess.run(['ffmpeg','-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
fr = np.frombuffer(o,np.uint8); n=fr.size//(W*H*3); fr=fr[:n*W*H*3].reshape(n,H,W,3)
wm=np.load(os.path.join(M,'water_soft.npy'))[:H,:W]; sl=np.load(os.path.join(M,'spray_land_soft.npy'))[:H,:W]
sdf=np.load(os.path.join(M,'shore_sdf.npy'))[:H,:W]
prot=(wm<=0.0)&(sl<=0.0)
print('frames',n,'protected px',int(prot.sum()))
adj=[np.abs(fr[i+1].astype(np.int16)-fr[i].astype(np.int16))[prot].mean() for i in range(0,60)]
vs0=[np.abs(fr[i].astype(np.int16)-fr[0].astype(np.int16))[prot].mean() for i in range(1,60)]
print(f'adjacent-frame land drift : mean {np.mean(adj):.3f}  max {np.max(adj):.3f}')
print(f'vs-frame-0 land drift     : mean {np.mean(vs0):.3f}  max {np.max(vs0):.3f}')
# where is it? bucket by distance inland from the coast
d = np.abs(fr[30].astype(np.int16)-fr[0].astype(np.int16)).max(-1)
for lo,hi in [(0,10),(10,25),(25,60),(60,150),(150,10000)]:
    m = prot & (-sdf>=lo) & (-sdf<hi)
    if m.sum(): print(f'  {lo:4d}-{hi:5d} px inland: n={int(m.sum()):7d}  mean {d[m].mean():.3f}  p99 {np.percentile(d[m],99):.0f}  max {d[m].max()}')
