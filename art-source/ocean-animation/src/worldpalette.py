"""REJECTED DIRECTION -- kept for the record, not used.

Re-anchor the ocean palette to the old authored water surface.

Every colour in presets.py was anchored to the cliffside reference plate, which
is vivid photographic blue. The world it has to ship inside is muted painted-map:
its authored water surface measures luma p50 0.151 and saturation p50 0.184,
against our 0.166-0.431 and 0.689-0.854. Side by side they read as two different
artworks, and that -- not the physics -- is what looked wrong on the real coast.

The owner's call: that authored surface is being REPLACED, so it has no
authority over what replaces it, and the palette set during this session stands.
Kept only so the measurement is not lost.

This preserves the palette's STRUCTURE (hue relationships, depth ordering, the
teal lift on crests) and remaps only its range, so the sea still has colour in it
rather than becoming the monochrome slate the authored surface literally is.
"""
import colorsys


def reanchor(palette, sat_scale=0.55, luma_lo=0.085, luma_hi=0.33):
    """Keep hue and ordering; compress saturation; remap value into the world's band."""
    keys = ('abyss', 'deep', 'mid', 'shallow')
    vals = []
    for k in keys:
        r, g, b = palette[k]
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        vals.append((k, h, s, v))
    vlo = min(v for _, _, _, v in vals)
    vhi = max(v for _, _, _, v in vals)
    out = dict(palette)
    for k, h, s, v in vals:
        t = (v - vlo) / max(vhi - vlo, 1e-6)
        nv = luma_lo + t * (luma_hi - luma_lo)
        out[k] = colorsys.hsv_to_rgb(h, s * sat_scale, nv)
    # foam and sky follow the water down, or they float off the picture
    for k, f in (('foamThin', 0.62), ('foamBody', 0.70), ('foamDense', 0.78),
                 ('sky', 0.52), ('sun', 0.72)):
        if k in palette:
            r, g, b = palette[k]
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            out[k] = colorsys.hsv_to_rgb(h, s * max(sat_scale, 0.7), v * f)
    return out
