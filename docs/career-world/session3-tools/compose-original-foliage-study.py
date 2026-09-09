"""Place original Blender renders beside existing foliage without altering source art."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / '.codex-tmp/qa/original-foliage-blender'
SOURCE = ROOT / 'public/career-world/layers/terrain/authority/tiles/l2-tanium/c3-1-site.webp'
CROP = (80, 640, 700, 1100)
manifest = json.loads((OUT / 'render-manifest.json').read_text(encoding='utf-8'))
before_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
tile = Image.open(SOURCE).convert('RGBA')
original = tile.crop(CROP)
overlay = Image.new('RGBA', original.size)
placements = [('pine', (420, 211), 32), ('mushrooms', (490, 210), 38)]
proof = {'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': before_hash,
         'crop': CROP, 'renderManifest': 'render-manifest.json', 'placements': [], 'assets': {}}


def contact(center, rx, ry, opacity):
    """Separate local contact shade; no terrain repaint or whole-image color grade."""
    layer = Image.new('RGBA', overlay.size)
    for y in range(max(0, int(center[1]-ry)), min(layer.height, int(center[1]+ry)+1)):
        for x in range(max(0, int(center[0]-rx)), min(layer.width, int(center[0]+rx)+1)):
            d = ((x-center[0])/rx)**2 + ((y-center[1])/ry)**2
            if d < 1:
                layer.putpixel((x,y),(26,29,17,round(opacity*(1-d)**1.5)))
    overlay.alpha_composite(layer)


for name, foot, ppu in placements:
    entry = manifest['assets'][name]
    sprite = Image.open(OUT / entry['file']).convert('RGBA')
    alpha = sprite.getchannel('A')
    bounds = alpha.getbbox()
    assert bounds is not None and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < sprite.width and bounds[3] < sprite.height, 'Clipped render'
    assert alpha.getextrema() == (0,255), 'Render needs real transparent and opaque pixels'
    proof['assets'][name] = {'size':sprite.size, 'alphaBounds':bounds, 'alphaRange':alpha.getextrema(),
                             'sha256':hashlib.sha256((OUT/entry['file']).read_bytes()).hexdigest()}
    factor = ppu / entry['pixelsPerUnit']
    resized = sprite.resize((round(sprite.width*factor),round(sprite.height*factor)),Image.Resampling.LANCZOS)
    actual_scale = resized.width/sprite.width
    root = [v*actual_scale for v in entry['rootPx']]
    top_left = [round(foot[i]-root[i]) for i in range(2)]
    contact(foot, 18 if name == 'pine' else 31, 7 if name == 'pine' else 17, 95 if name == 'pine' else 65)
    overlay.alpha_composite(resized,top_left)
    proof['placements'].append({'asset':name,'groundFootInCrop':foot,'pixelsPerUnit':ppu,'spriteTopLeft':top_left,'spriteSize':resized.size})

candidate = Image.alpha_composite(original,overlay)
original.save(OUT/'original-context.png')
candidate.save(OUT/'candidate-context.png')
overlay.save(OUT/'placement-overlay.png')
tile.alpha_composite(overlay,CROP[:2])
tile.save(OUT/'candidate-full-tile.png')
focus = (310, 25, 560, 295)
candidate.crop(focus).resize((750,810),Image.Resampling.NEAREST).save(OUT/'candidate-detail.png')
proof['inspectionCrop'] = focus
diff = ImageChops.difference(original,candidate)
changed = 0
outside = 0
for old,new,placed in zip(original.getdata(),candidate.getdata(),overlay.getdata()):
    if old != new:
        changed += 1
        outside += placed[3] == 0
assert outside == 0
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == before_hash
proof.update({'changedPixels':changed,'changedPixelsOutsideOverlay':outside,'sourceUnchanged':True,
              'scope':'Static offline compositing only; no animation, live manifest changes or visual acceptance.'})
(OUT/'verification.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
shutil.copyfile(Path(__file__).with_name('original-foliage-study.html'),OUT/'index.html')
print(json.dumps(proof,indent=2))
