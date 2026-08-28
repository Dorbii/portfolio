"""Labeled contact sheet of the reference library with measured attributes."""
import os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAN, DIAG = os.path.join(ROOT, 'refs', 'canonical'), os.path.join(ROOT, 'diagnostics')
CS = os.path.join(ROOT, 'contactsheets'); os.makedirs(CS, exist_ok=True)
M = json.load(open(os.path.join(DIAG, 'reference_measurements.json')))
P = json.load(open(os.path.join(DIAG, 'palette_anchors.json')))

def font(sz, bold=False):
    for f in (r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf',
              r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf'):
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()

ROLE = {
 'S':  ('SELECTED SOURCE - immutable land plate', (250, 210, 80)),
 'C5': ('CALM  primary crest-travel reference', (120, 200, 255)),
 'C8': ('CALM  shore wash + foam dissipation', (120, 200, 255)),
 'C1': ('CALM/WINDY bridge  long-period swell', (150, 220, 220)),
 'C2': ('WINDY  rolling breakers + churn', (140, 240, 160)),
 'C6': ('WINDY-HIGH  turquoise shore break + lace foam', (140, 240, 160)),
 'C4': ('ALL  foam persistence + backwash', (230, 170, 240)),
 'C3': ('HEAVY  localized cliff impact + spray', (255, 150, 120)),
 'C7': ('HEAVY  peak storm, maximum energy', (255, 150, 120)),
}
ORDER = ['S', 'C5', 'C8', 'C1', 'C2', 'C6', 'C4', 'C3', 'C7']
TW, TH = 372, 520
PAD, TOPBAR, INFO = 12, 46, 96
cols, rows = 3, 3
CW, CH = TW + PAD * 2, TOPBAR + TH + INFO
sheet = Image.new('RGB', (CW * cols, CH * rows + 78), (14, 15, 19))
d = ImageDraw.Draw(sheet)
d.text((20, 16), 'OCEAN REFERENCE LIBRARY - measured, not filename-trusted', font=font(30, True), fill=(240, 240, 245))
d.text((20, 52), 'foam% = white-pixel share of water region (objective energy).  aniso = spectral anisotropy (crest organisation).  lam = dominant open-water wavelength.',
       font=font(15), fill=(150, 155, 165))

for i, cid in enumerate(ORDER):
    cx, cy = (i % cols) * CW, 78 + (i // cols) * CH
    im = Image.open(os.path.join(CAN, f'{cid}.png')).convert('RGB')
    im = im.resize((TW, int(TW * im.size[1] / im.size[0])), Image.LANCZOS)
    im = im.crop((0, 0, TW, TH))
    sheet.paste(im, (cx + PAD, cy + TOPBAR))
    role, col = ROLE[cid]
    d.rectangle([cx + PAD, cy + 6, cx + PAD + TW, cy + TOPBAR - 4], fill=(28, 30, 38))
    d.rectangle([cx + PAD, cy + 6, cx + PAD + 6, cy + TOPBAR - 4], fill=col)
    d.text((cx + PAD + 14, cy + 10), cid, font=font(19, True), fill=col)
    d.text((cx + PAD + 48, cy + 13), role, font=font(13), fill=(225, 228, 234))
    m, p = M[cid], P[cid]
    sp = m.get('spectrum') or {}
    y = cy + TOPBAR + TH + 6
    l1 = f"foam {m['foam_fraction_of_water']*100:.1f}%   luma {m['mean_water_luma']:.3f}   aniso {sp.get('anisotropy','-')}"
    l2 = (f"crest {sp['crest_line_deg']:.0f}deg  prop {sp['propagation_deg']:.0f}deg  lam {sp['wavelength_px']:.0f}px"
          if sp else 'spectrum: unmeasurable (near-total whitewater)')
    d.text((cx + PAD + 2, y), l1, font=font(14), fill=(205, 210, 220))
    d.text((cx + PAD + 2, y + 19), l2, font=font(14), fill=(205, 210, 220))
    sw = [p.get(k) for k in ('abyss_p02', 'deep_p15', 'mid_p50', 'bright_p90', 'turquoise_p95', 'foam_mean', 'foam_dense_p90')]
    x = cx + PAD + 2
    for h in sw:
        if not h: continue
        d.rectangle([x, y + 42, x + 50, y + 68], fill=tuple(int(h[j:j+2], 16) for j in (1, 3, 5)))
        d.text((x + 1, y + 70), h, font=font(10), fill=(140, 146, 156))
        x += 52
sheet.save(os.path.join(CS, 'reference_contact_sheet.png'))
print('wrote contactsheets/reference_contact_sheet.png', sheet.size)
