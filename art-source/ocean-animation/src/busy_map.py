"""Where is the water BUSY, and what shape is the busy content?

The measure that finally separated the render from the plate. Mean local contrast
does not: across the whole water region it reads 0.049 against the reference's
0.071, and on a single cell it can read closer still, which is how a matched
statistic hid an obviously wrong picture for a long time.

What separates them is WHERE the busy content sits and WHAT SHAPE it makes. The
reference's high-contrast content is an irregular branching network spread across
the whole sea. The render's is parallel evenly-spaced ridges that stop just past
the shoreline -- which is why it reads as woven fabric rather than water.

    python busy_map.py [ours.png] [ref.png]

Prints the busy share banded by distance from shore, and writes a four-panel
sheet: contrast map and image, reference and ours.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import uniform_filter, distance_transform_edt
import matplotlib.cm as cm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUMA = np.array([0.299, 0.587, 0.114])
BUSY = 0.10          # local-contrast level that counts as "something happening"
BANDS = ((0, 15), (15, 40), (40, 80), (80, 150), (150, 400))


def water(rgb):
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    V = rgb.max(-1); mn = rgb.min(-1)
    sat = (V - mn) / np.maximum(V, 1e-6)
    w1 = np.clip((B - np.maximum(R, G) - 0.010) / 0.055, 0, 1)
    w2 = np.clip((np.minimum(G, B) - R - 0.045) / 0.085, 0, 1)
    foam = (np.clip((V - 0.60) / 0.24, 0, 1) * np.clip((0.36 - sat) / 0.24, 0, 1)
            * np.clip((B - R + 0.045) / 0.05, 0, 1))
    return np.maximum(np.maximum(w1, w2), foam) > 0.5


def local_contrast(rgb, w=5):
    y = rgb @ LUMA
    m = uniform_filter(y, w)
    return np.sqrt(np.maximum(uniform_filter(y * y, w) - m * m, 0))


def load(p):
    return np.asarray(Image.open(p).convert('RGB'), float) / 255.0


def run(ours_path, ref_path, out=None):
    ref, ours = load(ref_path), load(ours_path)
    if ref.shape != ours.shape:
        raise SystemExit(f'shape mismatch: reference {ref.shape} vs ours {ours.shape}')
    both = water(ref) & water(ours)
    cr, co = local_contrast(ref), local_contrast(ours)
    a, b = cr[both], co[both]
    print(f'water pixels compared: {both.sum():,}')
    print(f'mean local contrast      reference {a.mean():.4f}   ours {b.mean():.4f}')
    print(f'busy share (> {BUSY:.2f})       reference {(a>BUSY).mean()*100:.1f}%      '
          f'ours {(b>BUSY).mean()*100:.1f}%\n')
    dist = distance_transform_edt(both)
    print('busy share by distance from shore -- the render falls off a cliff past 15 px:')
    print(f'{"band (px)":>12}{"reference":>12}{"ours":>10}{"ratio":>9}')
    for lo, hi in BANDS:
        m = both & (dist >= lo) & (dist < hi)
        if m.sum() < 500:
            continue
        x, y = (cr[m] > BUSY).mean() * 100, (co[m] > BUSY).mean() * 100
        print(f'{f"{lo}-{hi}":>12}{x:11.1f}%{y:9.1f}%{y/max(x,1e-9):9.2f}')

    # Block-to-block variation: does the treatment CHANGE across the picture, or
    # is every part of the sea handled the same way? This is the measure that
    # separated them once every per-pixel average had been matched.
    def foam_mask(rgb):
        V = rgb.max(-1); mn = rgb.min(-1)
        sat = (V - mn) / np.maximum(V, 1e-6)
        return ((rgb @ LUMA) > 0.55) & (sat < 0.38)
    B = 64
    H, Wd = both.shape
    print()
    print('block-to-block variation (64 px blocks) -- sd ACROSS blocks:')
    print(f'{"statistic":22s}{"reference":>12}{"ours":>10}{"ratio":>9}')
    fields = (('luma', ref @ LUMA, ours @ LUMA),
              ('local contrast', cr, co),
              ('foam coverage', foam_mask(ref).astype(float), foam_mask(ours).astype(float)))
    for name, A, Bm in fields:
        ra, rb = [], []
        for yy in range(0, H - B, B):
            for xx in range(0, Wd - B, B):
                m = both[yy:yy + B, xx:xx + B]
                if m.mean() < 0.85:
                    continue
                ra.append(A[yy:yy + B, xx:xx + B][m].mean())
                rb.append(Bm[yy:yy + B, xx:xx + B][m].mean())
        ra, rb = np.array(ra), np.array(rb)
        if ra.size == 0:
            continue
        print(f'{name:22s}{ra.std():12.4f}{rb.std():10.4f}{rb.std()/max(ra.std(),1e-9):9.2f}')

    tiles = []
    for label, img, c in (('reference  local contrast', ref, cr), ('reference', ref, None),
                          ('ours  local contrast', ours, co), ('ours', ours, None)):
        if c is None:
            tiles.append((label, Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))))
        else:
            rgb = (cm.inferno(np.clip(c / 0.22, 0, 1))[..., :3] * 255).astype(np.uint8)
            rgb[~both] = (30, 30, 34)
            tiles.append((label, Image.fromarray(rgb)))
    H, W = ref.shape[:2]
    try:
        font = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 20)
    except Exception:
        font = ImageFont.load_default()
    sheet = Image.new('RGB', (W * 4 + 24, H), (10, 12, 16))
    for i, (label, im) in enumerate(tiles):
        im = im.copy()
        d = ImageDraw.Draw(im, 'RGBA')
        d.rectangle([0, 0, 300, 28], fill=(0, 0, 0, 225))
        d.text((6, 4), label, fill=(255, 255, 255, 255), font=font)
        sheet.paste(im, (i * (W + 8), 0))
    sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS)
    out = out or os.path.join(ROOT, 'diagnostics', 'busy_map.png')
    sheet.save(out)
    print('\nwrote', out)


if __name__ == '__main__':
    ours = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        ROOT, 'diagnostics', 'full_windy_rolling_surf_fixed.png')
    ref = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'refs', 'canonical', 'S.png')
    run(ours, ref)
