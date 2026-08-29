"""Band statistics from a capture's OWN water mask.

Cropping the world's shoreline field to a reported camera looked exact and was
not: a few world pixels of slop puts the "surf zone" on the rocks, and the surf
zone is the only band that matters. The check meant to catch that -- does the
mask agree with where the picture is blue -- scored 92% on a badly placed mask,
because most of a frame is deep water and far inland, and because the city's
roofs are slate blue.

So the mask is not derived any more. A --canvas-only capture carries the
renderer's own alpha: opaque where it drew water, transparent where it did not.
That is the mask, exactly registered, by construction. The shore distance is a
distance transform of it, converted to tuned pixels through the capture's zc.

    python band_stats.py <canvas.png> [more.png ...]
    python band_stats.py --offline <render.png> <water_mask.npy-or-png> <tuned_per_px>
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TUNED_LAMBDA = 115.24


def report(name, rgb, water, tuned_per_px):
    """water: bool array. tuned_per_px: tuned px per image px."""
    inside = ndimage.distance_transform_edt(water)
    sdf = inside * tuned_per_px          # tuned px from the shore, water only
    y = rgb @ [0.2126, 0.7152, 0.0722]
    row = []
    for lab, m in (('surf', water & (sdf > 0) & (sdf < 60)),
                   ('shelf', water & (sdf > 60) & (sdf < 230)),
                   ('deep', water & (sdf > 230))):
        if m.sum() < 2000:
            row.append('       --        '); continue
        v = y[m]
        px = rgb[m]
        row.append(f'{v.mean():5.1f}/{v.std():4.1f}/{(v > 170).mean() * 100:5.2f}%'
                   f' ({px[:,0].mean():3.0f},{px[:,1].mean():3.0f},{px[:,2].mean():3.0f})')
    print(f'  {name:<26}' + ' '.join(row))


def main():
    print('  band = luma/sd/white% (meanR,G,B)')
    print(f'  {"":26}surf 0-60                shelf 60-230             deep >230')
    args = sys.argv[1:]
    if args and args[0] == '--offline':
        img, maskp, tpp = args[1], args[2], float(args[3])
        rgb = np.asarray(Image.open(img).convert('RGB')).astype(float)
        mask = (np.load(maskp) if maskp.endswith('.npy')
                else np.asarray(Image.open(maskp).convert('L'))) 
        water = mask > (0.5 if maskp.endswith('.npy') else 127)
        if water.shape != rgb.shape[:2]:
            water = np.asarray(Image.fromarray(water.astype(np.uint8) * 255)
                               .resize((rgb.shape[1], rgb.shape[0]), Image.NEAREST)) > 127
        report(os.path.basename(img)[:24], rgb, water, tpp)
        return 0
    for path in args:
        im = Image.open(path).convert('RGBA')
        a = np.asarray(im).astype(float)
        alpha = a[..., 3]
        if alpha.max() == alpha.min():
            print(f'  {os.path.basename(path):<26} NO ALPHA -- needs a --canvas-only capture')
            continue
        meta_path = path + '.camera.json'
        if not os.path.exists(meta_path):
            print(f'  {os.path.basename(path):<26} NO CAMERA SIDECAR')
            continue
        meta = json.load(open(meta_path, encoding='utf-8'))
        world = json.load(open(os.path.join(ROOT, 'scenes', 'world', 'textures',
                                            'world-fields-r2.json'), encoding='utf-8'))
        # tuned px per IMAGE px, from the camera the capture actually rendered
        tuned_per_world = TUNED_LAMBDA / world['lambdaWorld']
        world_px_across = meta['span'][0] * world['world'][0]
        tpp = world_px_across * tuned_per_world / im.size[0]
        report(f'{os.path.basename(path)[:20]} (zc {1/tpp:.2f})', a[..., :3], alpha > 200, tpp)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
