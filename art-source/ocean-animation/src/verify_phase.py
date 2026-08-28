"""Measure phase-field roughness for every solved family, then render + zoom."""
import glob, os, numpy as np
from scipy import ndimage as ndi
w = np.load(os.path.join('..','masks','water_soft.npy')) > 0.5
print(f'{"family":34s} {"|gradS|p50":>10s} {"k p50":>8s} {"rough rms":>10s} {"noise/sig":>10s}')
for f in sorted(glob.glob(os.path.join('..','work','wavefield_cache','*ss2_v5.npz'))):
    z = np.load(f); S = z['S']; k = z['k']
    gy, gx = np.gradient(S); gm = np.hypot(gx, gy)
    hf = S - ndi.gaussian_filter(S, 3.0)
    ns = hf[w].std() / np.percentile(k[w], 50)
    print(f'{os.path.basename(f)[:34]:34s} {np.percentile(gm[w],50):10.4f} '
          f'{np.percentile(k[w],50):8.4f} {hf[w].std():10.4f} {ns:9.2f}x')
print('\nbaseline before any fix: |gradS| 0.0700, k 0.0574, rough 0.0303, noise/sig 0.53x')
