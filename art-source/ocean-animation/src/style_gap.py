"""Measure WHERE the render differs from the reference library in style, on the
water region only. Not 'does it look right' but 'which statistic is off'."""
import os, subprocess, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN = os.path.join(ROOT, 'refs', 'canonical')
LUMA = np.array([0.299, 0.587, 0.114], np.float32)

def water_prob(rgb):
    R, G, B = rgb[...,0], rgb[...,1], rgb[...,2]
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    w1 = np.clip((B - np.maximum(R,G) - 0.010)/0.055, 0, 1)
    w2 = np.clip((np.minimum(G,B) - R - 0.045)/0.085, 0, 1)
    foam = (np.clip((V-0.60)/0.24,0,1)*np.clip((0.36-sat)/0.24,0,1)*np.clip((B-R+0.045)/0.05,0,1))
    return np.maximum(np.maximum(w1,w2), foam)

def wmask(rgb):
    m = water_prob(rgb) > 0.5
    m[:, :55] = False
    m = ndi.binary_opening(ndi.binary_closing(m, np.ones((5,5))), np.ones((3,3)))
    lab, n = ndi.label(m)
    if n: m = lab == int(np.argmax(ndi.sum(m, lab, range(1,n+1))))+1
    return m

def frame_at(mp4, t):
    W,H = 1074,1462
    o = subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',mp4,'-frames:v','1',
                        '-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(o[:W*H*3],np.uint8).reshape(H,W,3).astype(np.float32)/255.

def stats(rgb, name):
    m = wmask(rgb)
    lum = rgb @ LUMA
    V = rgb.max(-1); mn = rgb.min(-1); sat = (V-mn)/np.maximum(V,1e-6)
    foam = m & (V>0.70) & (sat<0.30)
    l = lum[m]
    # acutance: gradient magnitude of luminance inside water
    gy, gx = np.gradient(lum)
    g = np.hypot(gx, gy)[m]
    # local contrast: std in an 11px window
    mu = ndi.uniform_filter(lum, 11)
    sd = np.sqrt(np.maximum(ndi.uniform_filter(lum*lum, 11) - mu*mu, 0))[m]
    # foam blob shape statistics
    lab, n = ndi.label(foam)
    if n:
        sizes = np.bincount(lab.ravel())[1:]
        keep = np.where(sizes >= 25)[0] + 1
        # perimeter must be measured per blob on the blob's OWN dilation ring,
        # labelled by the blob it belongs to -- the previous version summed a ring
        # that carries label 0 everywhere and so always returned zero
        ring = ndi.binary_dilation(foam, np.ones((3, 3))) & ~foam
        ringlab = ndi.grey_dilation(lab, size=(3, 3)) * ring
        per = np.array([float((ringlab == k).sum()) for k in keep]) if len(keep) else np.array([0.])
        ar = sizes[keep-1] if len(keep) else np.array([1.])
        compact = per / np.maximum(np.sqrt(ar), 1e-6)   # edge complexity per unit size
        nb, med, cmp_ = len(keep), float(np.median(ar)), float(np.median(compact))
    else:
        nb, med, cmp_ = 0, 0., 0.
    return dict(name=name,
        p05=float(np.percentile(l,5)), p25=float(np.percentile(l,25)), p50=float(np.percentile(l,50)),
        p75=float(np.percentile(l,75)), p95=float(np.percentile(l,95)), p99=float(np.percentile(l,99)),
        iqr=float(np.percentile(l,75)-np.percentile(l,25)),
        grad_p50=float(np.percentile(g,50)), grad_p90=float(np.percentile(g,90)), grad_p99=float(np.percentile(g,99)),
        lc_p50=float(np.percentile(sd,50)), lc_p90=float(np.percentile(sd,90)),
        sat_p50=float(np.percentile(sat[m],50)),
        foam_pct=float(foam.sum()/max(m.sum(),1)*100), blobs=nb, blob_med_px=med, blob_edge_cplx=cmp_)

rows = []
for cid in ['S','C5','C8','C1','C2','C6','C3','C7']:
    rgb = np.asarray(Image.open(os.path.join(CAN,f'{cid}.png')).convert('RGB')).astype(np.float32)/255.
    rows.append(stats(rgb, f'REF {cid}'))
for nm in ['calm_swell','windy_rolling_surf','heavy_crashing_surf']:
    fp = os.path.join(ROOT,'diagnostics',f'{os.environ.get("TAG","s3")}_{nm}_full.png')
    rgb = np.asarray(Image.open(fp).convert('RGB')).astype(np.float32)/255.
    rows.append(stats(rgb, f'OURS {nm[:12]}'))

hdr = f'{"":18s} {"p05":>5s} {"p25":>5s} {"p50":>5s} {"p75":>5s} {"p95":>5s} {"IQR":>5s} | {"gp50":>5s} {"gp90":>5s} {"gp99":>5s} | {"lc50":>5s} {"lc90":>5s} | {"sat":>4s} {"foam%":>5s} {"blobs":>5s} {"bmed":>5s} {"edge":>5s}'
print(hdr); print('-'*len(hdr))
for r in rows:
    print(f'{r["name"]:18s} {r["p05"]:5.3f} {r["p25"]:5.3f} {r["p50"]:5.3f} {r["p75"]:5.3f} {r["p95"]:5.3f} {r["iqr"]:5.3f} | '
          f'{r["grad_p50"]:5.3f} {r["grad_p90"]:5.3f} {r["grad_p99"]:5.3f} | {r["lc_p50"]:5.3f} {r["lc_p90"]:5.3f} | '
          f'{r["sat_p50"]:4.2f} {r["foam_pct"]:5.1f} {r["blobs"]:5d} {r["blob_med_px"]:5.0f} {r["blob_edge_cplx"]:5.2f}')
