"""Transform the offline renderer into the live layer's WebGL2 sources.

The offline shaders stay the ONE place the water is authored. Tuning happens
there, where a frame can be measured in numpy; this script mechanically moves
that work to `features/career-world/layers/ocean/`. Nothing is hand-copied, so
the two cannot drift.

Every substitution asserts its anchor text matched exactly the expected number of
times. An edit offline that moves an anchor breaks this script instead of quietly
emitting a shader that compiles and renders the wrong thing.

What actually changes between the two:

  coordinates   The offline picture is a fixed plate, so screen == world. The
                live world is a map with a 25x zoom range, so the fields are
                sampled through the camera. Evaluation stays in TUNED PLATE
                PIXELS, which are fixed to the world: the sea does not change
                because someone zoomed in, and every hard-coded length in the
                offline shaders keeps the meaning it was given.
  fields        texP/texG/texD/texM/texA were five precomputed RGBA32F textures.
                Here they are functions over two 8-bit world textures plus closed
                forms for everything derivable (bathymetry, shore bands, shoaling).
  families      Only the primary swell survives at world resolution (4.7 samples
                per wave against 2.6 and 1.0). Secondary and chop are generated
                analytically in screen space, which is also the only zoom where
                they are resolvable.
  plate         There is no painted plate under the live water. The composite
                returns colour plus coverage, and the land art shows through from
                the DOM layer below.
  state         Foam and spray are ping-pong buffers in SCREEN space, so their
                detail stays screen-scale at every zoom. They are reprojected
                through the camera each frame, which is exact for a 2-D pan/zoom.

Run:  python export_web.py
"""
import json
import math
import os
import re
import sys

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
SH = os.path.join(SRC, 'shaders')
REPO = os.path.dirname(os.path.dirname(ROOT))
LAYER = os.path.join(REPO, 'features', 'career-world', 'layers', 'ocean')
OUT = os.path.join(LAYER, 'rendering', 'shaders', 'generated')
MODEL = os.path.join(LAYER, 'model', 'generated')
# OCEAN_WORLD_SCENE must match whatever bake_world/encode_world were run with.
# The manifest carries lambdaWorld, kMax, depthMax and the plane-wave constants;
# reading the wrong one emits a shader that decodes correct pixels with the
# wrong scale, which is silent and total.
META = os.path.join(ROOT, 'scenes', os.environ.get('OCEAN_WORLD_SCENE', 'world'),
                    'textures', 'world-fields-r2.json')

sys.path.insert(0, SRC)
import presets as P

# The picture-space gravity the presets were tuned at (wavefield.G's default).
# Everything downstream is calibrated to the wavelength this implies, so it is a
# constant of the tuning, not a knob.
OFFLINE_G = 130.0
BAKED_STATE = 'windy_rolling_surf'
_meta = json.load(open(META, encoding='utf-8'))
_T = P.PRESETS[BAKED_STATE]['families']['primary'][1]
# L0 = G T^2 / 2pi. The world was baked with G chosen to land the primary swell
# on lambdaWorld pixels; the presets were tuned with G = 130. The ratio is how
# many tuned pixels one world pixel is worth.
TUNED_PER_WORLD = (OFFLINE_G * _T * _T / (2.0 * math.pi)) / _meta['lambdaWorld']


RENAMED = set()


def sub(text, old, new, count=1, label=''):
    n = text.count(old)
    if n != count:
        raise SystemExit(
            f'export_web: expected {count} occurrence(s) of {label or old[:60]!r}, found {n}.\n'
            '  The offline shader moved. Re-anchor the substitution rather than loosening it.')
    return text.replace(old, new)


def read(name):
    return open(os.path.join(SH, name), encoding='utf-8').read()


# Reserved in GLSL ES 3.00 but free in the desktop GLSL 3.30 the offline shaders
# are written in. Renaming on export rather than at the source keeps the offline
# code reading naturally -- `patch` is the right word for a patch of sea.
ES_RESERVED = (
    'patch', 'sample', 'filter', 'resource', 'active', 'common', 'partition',
    'input', 'output', 'attribute', 'varying', 'superp', 'namespace', 'using',
    'template', 'this', 'packed', 'goto', 'typedef', 'volatile', 'external',
    'interface', 'long', 'short', 'half', 'fixed', 'unsigned', 'sizeof', 'cast',
    'enum', 'asm', 'union', 'class', 'public', 'static', 'extern', 'inline',
    'noinline', 'restrict', 'readonly', 'writeonly', 'row_major',
)


def rename_reserved(src, report):
    for word in ES_RESERVED:
        pattern = r'\b' + word + r'\b'
        if re.search(pattern, src):
            report.add(word)
            src = re.sub(pattern, word + '_', src)
    return src


def screen_anchor_noise(common):
    """Make every noise lookup SCREEN-anchored.

    This is the one rule the hard-coded constants need, and it is the same split
    presets.py already draws for the named ones: a WAVE is a physical object and
    keeps its size in the world; a PATTERN is a mark on the picture and keeps its
    size on the screen.

    Offline the distinction did not exist, because the plate was 1672 px and the
    camera never moved -- a scale of 640 was 38% of the picture. Here the same
    640 is 1.7% of the world, so at the wide shot the tileable noise repeats
    sixty times across the viewport and the mip chain has collapsed each tile to
    a handful of texels. What that draws is a regular diamond lattice over the
    whole sea. It is not noise any more; it is a grid.

    Converting inside the lookup rather than at each of the twenty-odd call sites
    means no constant can be missed, and at the closest camera (uZc near 1) every
    one of them still means exactly what it meant when it was tuned.

    TRIED AND REVERTED (2026-08-29): world-anchoring wave.frag's noise while
    leaving composite.frag screen-anchored, on the argument that a patch of rough
    sea is a physical object and only the drawn marks are marks. It is the better
    argument and it loses to the measurement. At the capital camera it bought the
    wavelength band (13.4 -> 15.6 against the plate's 15.9) and almost nothing at
    the scales that actually read as weather -- 300 tuned px went 9.7 -> 10.3
    against a target of 19.2, and 700 did not move at all. At the world camera it
    put the diamond lattice straight back: a regular plaid over the whole ocean.
    So the large-scale life the sea is missing does NOT come from these lookups,
    and whatever does supply it in the plate has still to be found.
    """
    for tex in ('texNoise', 'texNoiseF'):
        for swizzle in (').r;', ');'):
            old = f'    return texture({tex}, px/scale{swizzle}'
            common = sub(common, old,
                         f'    return texture({tex}, px * uZc / scale{swizzle}',
                         label=f'{tex} lookup{swizzle}')
    return sub(common, """    vec2 d = dir * (speed * uLoop);
    vec2 q = floor(d / scale + 0.5) * scale;
    return q * (uTime / uLoop);""",
               """    // speed and scale are SCREEN px, matching the lookups above; the offset is
    // added to a tuned coordinate, so it converts back on the way out.
    //
    // And the period is uScrollLoop, not uLoop. The travel has to land on a
    // whole multiple of `scale` or the field jumps when the clock wraps, and
    // over ONE loop that lattice is coarser than the distance most of these
    // fields were asked to cover: floor(d/scale + 0.5) returns zero for
    // anything slower than half a tile per loop. Measured on the shipped
    // constants, FIFTEEN of the eighteen large-scale fields -- the regional
    // weather that decides where the sea is working, the breaking and swash
    // patches, the glitter clustering, the calm field, the teal variation, the
    // along-crest variation, both flow-noise fields -- travelled exactly no
    // distance at all. The waves moved; the weather they move through was
    // nailed to the world. At the wide shot, where the swell is deliberately
    // faded out and that weather IS the picture, the sea did not move: measured
    // 1.05 mean |dLuma| per half second against 29 at the two closer tiers.
    //
    // A longer scroll period makes the lattice fine enough to represent the
    // speeds that were tuned. It costs nothing in seamlessness: every angular
    // frequency is an exact multiple of 2pi/uLoop and therefore also of
    // 2pi/(N*uLoop), so the clock can be wrapped on the longer period and the
    // wave field is bit-for-bit as periodic as it was.
    vec2 d = dir * (speed * uScrollLoop);
    vec2 q = floor(d / scale + 0.5) * scale;
    return q * (uTime / uScrollLoop) / uZc;""", label='loopScroll units')


def raw(src, what):
    """Make GLSL safe inside a String.raw template.

    A backtick or a ${ in the source would end the literal or interpolate into
    it. Both only ever appear in prose, so they are rewritten rather than
    escaped: an escape survives String.raw as a stray backslash in the shader,
    which reads as a defect the next time someone opens the generated file.
    """
    if '\\' in src:
        raise SystemExit(f'export_web: {what} contains a backslash. String.raw would carry '
                         'it into the shader verbatim; remove it at the source.')
    if '${' in src:
        raise SystemExit(f'export_web: {what} contains a template interpolation.')
    return src.replace('`', "'")


# ---------------------------------------------------------------- GLSL prelude
def adapter(meta):
    w, h = meta['world']
    d0 = meta['planeDir']
    return f'''
// ===========================================================================
// World field adapter.  GENERATED -- see art-source/ocean-animation/src/export_web.py
//
// The offline renderer sampled five precomputed RGBA32F fields at plate
// resolution. Here the same five are reconstructed from two 8-bit world textures
// through the camera, plus closed forms for everything that is a function of the
// shoreline distance.
//
// UNITS -- the decision the whole port turns on.
//
// Everything here is evaluated in TUNED PLATE PIXELS: the units the offline
// renderer was tuned in, fixed to the world and independent of the camera. A
// wave has a wavelength, a steepness, a depth it feels and a speed it drifts at,
// and none of those change because someone zoomed in. So `px`, depth, sdf, the
// wavenumbers, the amplitudes and the flow are all camera-independent, and every
// hard-coded length inside the offline shaders keeps exactly the meaning it was
// given -- including the ones nobody wrote down as a parameter.
//
// The alternative, evaluating in screen pixels, was tried on paper first and is
// worse: it puts the camera factor on the breaking criterion, the whitecap
// threshold and the surf-zone width, where getting one wrong silently changes
// the physics instead of the styling.
//
// uZc is screen pixels per tuned pixel. It appears in exactly two places, both
// of them drawing rather than physics: a tuned length consumed as a screen
// offset (* uZc), and a screen length consumed as a lookup coordinate (/ uZc).
// The table lives in export_web.py; nothing else needs it, because contourLine
// normalises by the screen-space gradient and every other stroke width is
// already written against uRes.
// ===========================================================================
uniform sampler2D texPhase;      // NEAREST: RG = phase residual (16 bit), B = |k|, A = depth
uniform sampler2D texFlowField;  // LINEAR:  RG = wave direction, B = signed sdf, A = ray focus
uniform vec2  uCamOrigin;        // world uv of the viewport corner
uniform vec2  uCamSpan;          // world uv covered by the viewport
uniform vec2  uDirSecond;        // secondary train direction (fixed: the phase field is baked)
// Declared here rather than in wave.frag because every pass reaches the field
// adapter, and the adapter needs the periods to shoal and to lay down the two
// screen-space trains. The wave pass's own copy is stripped on export.
uniform float uPeriodP, uPeriodS, uPeriodC;

const vec2  WORLD_SIZE   = vec2({float(w):.1f}, {float(h):.1f});
const vec2  WORLD_TEXEL  = vec2({1.0 / w:.9f}, {1.0 / h:.9f});
const float PHASE_LO     = {meta['residualLo']:.6f};
const float PHASE_SPAN   = {meta['residualSpan']:.6f};
const float PHASE_K0     = {meta['planeK0']:.8f};
const vec2  PHASE_DIR    = vec2({d0[0]:.8f}, {d0[1]:.8f});
const float FIELD_KMAX   = {meta['kMax']:.8f};
const float FIELD_DMAX   = {meta['depthMax']:.8f};
const float FIELD_FMAX   = {meta['focusMax']:.8f};
const float FIELD_SDFMAX = {meta['sdfMax']:.4f};
// Tuned pixels per world pixel: the ratio of the two gravities, which is what
// sets how many pixels a wave of a given period spans. The world was baked at
// {meta['lambdaWorld']:.1f} px for the primary swell; the presets were tuned at {TUNED_PER_WORLD * meta['lambdaWorld']:.1f}.
const float TUNED_PER_WORLD = {TUNED_PER_WORLD:.6f};
const vec2  TUNED_SIZE = WORLD_SIZE * TUNED_PER_WORLD;

// Screen uv has its origin at the BOTTOM left; the world fields are image-space,
// top row first. Without this flip the whole ocean is mirrored vertically, which
// at world zoom reads as a coastline that nearly fits and does not.
vec2 worldUvOf(vec2 s) {{ return uCamOrigin + vec2(s.x, 1.0 - s.y) * uCamSpan; }}

// The evaluation coordinate: tuned pixels, anchored to the world. Camera-
// independent by construction, so no pattern keyed on it can swim when the
// camera pans, and none of them needs to know the viewport at all.
vec2 worldPx(vec2 s) {{ return worldUvOf(s) * TUNED_SIZE; }}

// One phase texel, decoded. Hardware bilinear cannot be used on this texture: it
// would interpolate the high and low BYTES of the residual independently, and
// the low byte is a sawtooth, so every wrap would spike the reconstructed phase
// by up to 256 quantisation steps. Decode first, then interpolate.
vec4 phaseTexel(ivec2 c) {{
    ivec2 cc = clamp(c, ivec2(0), ivec2(WORLD_SIZE) - ivec2(1));
    vec4 t = texelFetch(texPhase, cc, 0);
    float res = (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0 * PHASE_SPAN + PHASE_LO;
    return vec4(res, t.b * FIELD_KMAX, t.a * FIELD_DMAX, 0.0);
}}

// (phase residual, |k| in 1/worldpx, depth in world px)
vec3 phaseAt(vec2 wuv) {{
    vec2 p = wuv * WORLD_SIZE - 0.5;
    vec2 f = fract(p);
    ivec2 i = ivec2(floor(p));
    vec4 a = mix(mix(phaseTexel(i),               phaseTexel(i + ivec2(1, 0)), f.x),
                 mix(phaseTexel(i + ivec2(0, 1)), phaseTexel(i + ivec2(1, 1)), f.x), f.y);
    return a.xyz;
}}

// (dir.x, dir.y, sdf in TUNED px, ray focus)
vec4 flowAt(vec2 wuv) {{
    vec4 t = texture(texFlowField, clamp(wuv, WORLD_TEXEL * 0.5, 1.0 - WORLD_TEXEL * 0.5));
    float e = t.b * 2.0 - 1.0;
    return vec4(t.r * 2.0 - 1.0, t.g * 2.0 - 1.0,
                sign(e) * e * e * FIELD_SDFMAX * TUNED_PER_WORLD,   // signed sqrt, undone
                t.a * FIELD_FMAX);
}}

// Deep-water wavenumber for a period, in the SCREEN units everything else uses.
float deepK(float period) {{
    float w = 6.28318530718 / period;
    return w * w / uG;
}}

// w^2 = g k tanh(k d), three fixed-point steps from the deep-water value. The
// secondary and chop trains are short enough that this only matters in the last
// few pixels of water, but that is exactly where the swash reads.
float dispersionK(float period, float depth) {{
    float w = 6.28318530718 / period;
    float k = w * w / uG;
    for (int i = 0; i < 3; ++i) k = w * w / (uG * tanh(clamp(k * depth, 1e-4, 30.0)));
    return k;
}}

float groupVel(float k, float d, float omega) {{
    float kd = clamp(k * d, 1e-4, 30.0);
    float n = 0.5 * (1.0 + 2.0 * kd / sinh(2.0 * kd));
    return n * omega / max(k, 1e-8);
}}

// Green's law, identical to precompute.shoaling_amp.
float shoalAmp(float k, float d, float period) {{
    float omega = 6.28318530718 / period;
    float k0 = omega * omega / uG;
    return clamp(sqrt(max(0.5 * omega / k0, 1e-8) / max(groupVel(k, d, omega), 1e-8)), 0.35, 3.4);
}}

// --- the five offline fields ----------------------------------------------
// Depth and sdf come back in TUNED pixels, wavenumbers in 1/tuned px, so every
// threshold the offline shaders compare them against still means what it meant.

// (S_primary, S_secondary, S_chop, depth)
vec4 fieldP(vec2 s) {{
    vec2 wuv = worldUvOf(s);
    vec3 ph = phaseAt(wuv);
    float SP = ph.x + PHASE_K0 * dot(wuv * WORLD_SIZE, PHASE_DIR);
    // Only the primary swell survives at world resolution -- 4.7 samples per
    // wave against 2.6 and 1.0. The other two are plane waves: short enough that
    // their refraction is confined to water shallower than they ever reach, and
    // resolvable at all only once the camera is close.
    vec2 px = worldPx(s);
    float SS = deepK(uPeriodS) * dot(px, uDirSecond);
    vec2 dc = normalize(uDirDeep * 0.62 + uDirSecond * 0.38);
    float SC = deepK(uPeriodC) * dot(px, dc);
    return vec4(SP, SS, SC, ph.z * TUNED_PER_WORLD);
}}

// (kP, kS, kC, sdf)
vec4 fieldG(vec2 s) {{
    vec2 wuv = worldUvOf(s);
    vec3 ph = phaseAt(wuv);
    float depth = ph.z * TUNED_PER_WORLD;
    return vec4(ph.y / TUNED_PER_WORLD, dispersionK(uPeriodS, depth),
                dispersionK(uPeriodC, depth), flowAt(wuv).z);
}}

// (dirP.xy, dirS.xy)
vec4 fieldD(vec2 s) {{
    vec2 d = flowAt(worldUvOf(s)).xy;
    return vec4(normalize(d + vec2(1e-6)), uDirSecond);
}}

// (waterSoft, shoreBandSoft, sprayLandSoft, vignette)
//
// The soft water mask is not stored: it is a 0.8 px gaussian of the authority
// mask rethresholded, which agrees with this smoothstep to a mean of 0.0004 --
// and it is the one field that has to be sharp in WORLD terms, because it is the
// coastline the land art is registered to. The two band widths are build_plates'
// own, in tuned pixels, unchanged. There is no vignette on a map; that was the
// plate's painted edge falloff.
vec4 fieldM(vec2 s) {{
    vec4 fl = flowAt(worldUvOf(s));
    float sdf = fl.z;
    float waterSoft = smoothstep(-0.6, 0.6, sdf / TUNED_PER_WORLD);
    float shore = clamp((46.0 - sdf) / 26.0, 0.0, 1.0)
                * clamp((sdf + 13.0) / 8.0, 0.0, 1.0);
    float sprayLand = (sdf <= 0.0) ? clamp((sdf + 13.0) / 9.0, 0.0, 1.0) : 0.0;
    return vec4(waterSoft, shore, sprayLand, 1.0);
}}

// (ampP, ampS, ampC, focus)
//
// Green's law is a closed form of (k, depth, period), so only the ray-focus
// field had to be baked -- it is a gaussian-smoothed divergence and a shader
// cannot reconstruct it. The deep-water normalisation the precompute applied is
// the identity here by construction: shoalAmp -> 1 as cg -> cg0 (measured: the
// 55th-percentile divisor is 0.9995).
//
// All three trains shoal on the DISPERSION wavenumber, not on the stored one.
// The texture carries |grad S| from the eikonal solve, which is the right k for
// the wave's geometry and the wrong one for its amplitude: where rays cross, the
// phase gradient collapses while the water is still the depth it always was, and
// Green's law asked about a 2.6x-too-small k answers with a 43% amplitude
// deficit -- concentrated, of all places, on the focus caustics where the
// biggest waves are. Breaking is a threshold on that amplitude, so the picture
// lost its surf. Feeding shoalAmp the depth-solved k instead takes the primary
// from 8.18% off the offline field to 1.05%, which is where the secondary
// (0.45%) and the chop (0.05%) already were BECAUSE they were already doing it.
vec4 fieldA(vec2 s) {{
    vec2 wuv = worldUvOf(s);
    vec3 ph = phaseAt(wuv);
    float depth = ph.z * TUNED_PER_WORLD;
    float focus = flowAt(wuv).w;
    float aP = shoalAmp(dispersionK(uPeriodP, depth), depth, uPeriodP) * focus;
    float aS = shoalAmp(dispersionK(uPeriodS, depth), depth, uPeriodS) * (0.55 + 0.45 * focus);
    float aC = shoalAmp(dispersionK(uPeriodC, depth), depth, uPeriodC);
    return vec4(clamp(aP, 0.3, 3.2), clamp(aS, 0.3, 3.2), clamp(aC, 0.3, 2.2), focus);
}}
'''


HEADER = '''#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

// Screen pixels per tuned plate pixel. Declared ahead of everything because the
// noise helpers below need it; see the field adapter for what it means.
uniform float uZc;

// The period the large-scale scroll fields close on, and the period the live
// clock wraps at. A multiple of uLoop; see loopScroll.
uniform float uScrollLoop;
'''


def glsl(name, meta):
    txt = read(name)
    txt = sub(txt, '#version 330\n', '', label=f'{name} version directive')
    if name == 'wave.frag':
        # Every pass reaches the field adapter and the adapter needs the periods,
        # so it declares them; the wave pass's own copy would be a redeclaration.
        txt = sub(txt, 'uniform float uPeriodP, uPeriodS, uPeriodC;\n', '',
                  label='wave period declaration (the adapter owns it)')
    common = read('common.glsl')
    common = screen_anchor_noise(common)
    common = sub(common, '''// texP : S_primary, S_secondary, S_chop, depth(px)
// texG : kP, kS, kC, sdf(px)
// texD : dirP.xy, dirS.xy
// texM : waterSoft, shoreBandSoft, sprayLandSoft, vignette
// texA : ampP, ampS, ampC, focus
uniform sampler2D texP, texG, texD, texM, texA;
''', '// The five precomputed fields become fieldP/G/D/M/A below.\n',
                 label='common precomputed samplers')
    body = sub(txt, '#include "common.glsl"', common + adapter(meta),
               label=f'{name} include')
    for f in 'PGDMA':
        body = re.sub(r'texture\(tex' + f + r',', 'field' + f + '(', body)
    if re.search(r'\btex[PGDMA]\b', body):
        raise SystemExit(f'export_web: {name} still references a precomputed field sampler.')
    body = sub(body, 'vec2 px = uv * uRes;', 'vec2 px = worldPx(uv);',
               label=f'{name} px origin')
    body = rename_reserved(body, RENAMED)
    return HEADER + body


# ------------------------------------------------------------------ pass edits
def wave(meta):
    return glsl('wave.frag', meta)


def foam(meta):
    s = glsl('foam.frag', meta)
    # Foam state lives in SCREEN space so its detail stays screen-scale at every
    # zoom, which means the backtrace has to cross two cameras: advect in world
    # coordinates, then land in the PREVIOUS frame's viewport. Exact for a 2-D
    # pan/zoom. Water entering the viewport has no history and reads as zero,
    # which injection refills within a second.
    s = sub(s, '''    vec2 back = px - flow * uDt;
    vec2 buv = clamp(back / uRes, vec2(0.0015), vec2(0.9985));
    vec4 prev = texture(texPrev, buv);''',
            '''    vec2 buv = reprojectBack(uv, flow, uDt);
    float history = insideView(buv);
    buv = clamp(buv, vec2(0.0015), vec2(0.9985));
    vec4 prev = texture(texPrev, buv) * history;''',
            label='foam backtrace')
    s = sub(s, '''    vec4 blur = 0.25 * (texture(texPrev, buv + vec2(d.x, 0.0))
                      + texture(texPrev, buv - vec2(d.x, 0.0))
                      + texture(texPrev, buv + vec2(0.0, d.y))
                      + texture(texPrev, buv - vec2(0.0, d.y)));''',
            '''    vec4 blur = 0.25 * (texture(texPrev, buv + vec2(d.x, 0.0))
                      + texture(texPrev, buv - vec2(d.x, 0.0))
                      + texture(texPrev, buv + vec2(0.0, d.y))
                      + texture(texPrev, buv - vec2(0.0, d.y))) * history;''',
            label='foam diffusion taps')
    # Material coordinates are stored as an OFFSET from the pixel, never as the
    # coordinate itself. `px` reaches ~7e4 at the closest camera and these buffers
    # are RGBA16F, where one ulp at that magnitude is 64 px -- the lace lookup
    # would quantise to noise. The offset is bounded by the drift over uRelax, a
    # couple of hundred px, where one ulp is an eighth of a pixel.
    s = sub(s, '''    vec2 mat = prev.ba;
    if (uFirst > 0.5) mat = px;''',
            '''    vec2 mat = prev.ba + backPx(uv, flow, uDt);
    if (uFirst > 0.5 || history < 0.5) mat = px;''', label='foam material read')
    s = sub(s, '    outFoam = vec4(clamp(fresh, 0.0, 1.6), clamp(persist, 0.0, 1.6), mat);',
            '    outFoam = vec4(clamp(fresh, 0.0, 1.6), clamp(persist, 0.0, 1.6), mat - px);',
            label='foam material write')
    return s


def spray(meta):
    s = glsl('spray.frag', meta)
    s = sub(s, '''    vec4 prev = texture(texPrev, uv);
    float age = prev.g;''',
            '''    vec4 prev = texture(texPrev, uv);
    float age = prev.g;
    float history = 1.0;''', label='spray first read')
    s = sub(s, '''    vec2 back = px - vel * uDt;
    vec2 buv = clamp(back / uRes, vec2(0.002), vec2(0.998));
    prev = texture(texPrev, buv);''',
            '''    vec2 buv = reprojectBack(uv, vel, uDt);
    history = insideView(buv);
    buv = clamp(buv, vec2(0.002), vec2(0.998));
    prev = texture(texPrev, buv) * history;''', label='spray backtrace')
    s = sub(s, '''    vec2 mat = prev.ba;
    if (uFirst > 0.5) { dens = 0.0; age = 1.0; mat = px; }''',
            '''    vec2 mat = prev.ba + backPx(uv, vel, uDt);
    if (uFirst > 0.5 || history < 0.5) { dens = 0.0; age = 1.0; mat = px; }''',
            label='spray material read')
    s = sub(s, '    outSpray = vec4(clamp(dens, 0.0, 1.5), clamp(age, 0.0, 1.0), mat);',
            '    outSpray = vec4(clamp(dens, 0.0, 1.5), clamp(age, 0.0, 1.0), mat - px);',
            label='spray material write')
    s = sub(s, '    float site = texture(texImpact, uv).r;         // 0..1 exposure weight',
            '    float site = impactSite(uv, shoreN, sdf);      // 0..1 exposure weight',
            label='spray impact lookup')
    s = sub(s, 'uniform sampler2D texGeom, texFlow, texPrev, texImpact;',
            'uniform sampler2D texGeom, texFlow, texPrev;', label='spray impact sampler')
    return s


def composite(meta):
    s = glsl('composite.frag', meta)
    # No painted plate under the live water: the land is a DOM layer below the
    # canvas. plateInfluence and plateTint are therefore zero (asserted against
    # the preset table below), and the composite returns coverage in alpha.
    s = sub(s, '    vec3 plate = texture(texClean, uv).rgb;', '    vec3 plate = pal;',
            label='composite clean plate')
    s = sub(s, '''    vec3 plateCol = texture(texPlate, uv).rgb;
    vec3 col = mix(plateCol, wcol, water);''',
            '    vec3 col = wcol;', label='composite land plate')
    s = sub(s, '''    vec3 sprayCol = mix(cFoamDense, cFoamBody, sage * 0.6) * (0.92 + 0.18 * max(ndl, 0.0));
    col = mix(col, sprayCol * mix(1.0, vig, uVigMix), sA * sAllow);''',
            '''    vec3 sprayCol = mix(cFoamDense, cFoamBody, sage * 0.6) * (0.92 + 0.18 * max(ndl, 0.0));
    float sprayA = sA * sAllow;
    col = mix(col, sprayCol * mix(1.0, vig, uVigMix), sprayA);''',
            label='composite spray')
    s = sub(s, '    fragColor = vec4(clamp(col + dth, 0.0, 1.0), 1.0);',
            '''    // Coverage, not a plate: the land art is a DOM layer under this canvas and
    // must show through untouched. Spray is the one thing allowed onto it.
    float waterAlpha = clamp(max(water, sprayA), 0.0, 1.0) * uOpacity;
    fragColor = vec4(clamp(col + dth, 0.0, 1.0), waterAlpha);''', label='composite output')
    s = sub(s, 'uniform sampler2D texGeom, texFlow, texFoam, texSpray, texPlate, texClean, texSwell, texPath;',
            'uniform sampler2D texGeom, texFlow, texFoam, texSpray, texSwell, texPath;\n'
            'uniform float uOpacity;\n'
            'uniform vec3  uLightDirection;', label='composite plate samplers')
    # The world backdrop owns one light direction and every layer is supposed to
    # consume it. The offline sun was measured off the reference plate instead,
    # and the whole specular calibration -- lobe exponents, sheen, the half-vector
    # against a 34-degree view tilt -- is tuned to its ELEVATION. So the shared
    # direction is honoured and the renderer re-elevates it; see there.
    s = sub(s, '    vec3 L = normalize(vec3(-0.62, -0.55, 0.56));     // sun, upper-left, measured',
            '    vec3 L = normalize(uLightDirection);   // shared world light, re-elevated on the CPU',
            label='composite sun direction')
    return s


VERTEX = '''#version 300 es
in vec2 a_position;
out vec2 uv;
void main() {
  uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
'''

# Shared by the two stateful passes. Kept out of common.glsl because the offline
# renderer has one fixed camera and needs none of it.
STATE_HELPERS = '''
uniform vec2 uPrevOrigin, uPrevSpan;

// Semi-Lagrangian backtrace across a camera change. Advect in WORLD coordinates
// -- the velocity is tuned px/s, which is a world velocity -- then land in the
// previous frame's viewport. Exact for a 2-D pan/zoom, and the identity when the
// camera is still.
vec2 reprojectBack(vec2 s, vec2 vel, float dt) {
    vec2 wuv = worldUvOf(s) - vel * dt / TUNED_SIZE;
    return (wuv - uPrevOrigin) / uPrevSpan;
}
float insideView(vec2 b) {
    vec2 g = step(vec2(0.0), b) * step(b, vec2(1.0));
    return g.x * g.y;
}
// Where the backtrace started, in the tuned world coordinate.
vec2 backPx(vec2 s, vec2 vel, float dt) {
    return worldPx(s) - vel * dt;
}
'''

IMPACT = '''
// Discrete, exposure-weighted burst sites along the coastline.
//
// precompute.impact_sites greedily placed 54 gaussian blobs ~13 plate px across.
// At world resolution that is half a texel, so it cannot be an asset -- it is a
// screen-scale feature and has to be generated at screen scale. Same three
// ingredients: how squarely the shore faces the swell, how far it protrudes, and
// a jittered lattice so the coast fires at PLACES instead of along its whole
// length.
float impactSite(vec2 s, vec2 shoreN, float sdf) {
    float exposure = clamp(-dot(shoreN, uDirDeep), 0.0, 1.0);
    // Protruding rock is the negative Laplacian of the distance field, which is
    // what precompute measured. Sampled a world texel apart: that is the finest
    // the baked field resolves, and a shorter step would only re-measure the
    // same interpolation.
    vec2 wuv = worldUvOf(s);
    vec2 tx = vec2(WORLD_TEXEL.x, 0.0), ty = vec2(0.0, WORLD_TEXEL.y);
    float lap = flowAt(wuv + tx).z + flowAt(wuv - tx).z
              + flowAt(wuv + ty).z + flowAt(wuv - ty).z - 4.0 * sdf;
    float protrude = clamp(-lap / TUNED_PER_WORLD, 0.0, 2.0);
    float band = smoothstep(0.5, 3.0, sdf) * (1.0 - smoothstep(9.0, 16.0, sdf));
    // A jittered lattice at the offline site spacing, so the coast fires at
    // separated places the way the greedy non-maximum suppression made it.
    const float cell = 90.0;
    vec2 mp = worldPx(s) / cell;
    float acc = 0.0;
    for (int j = -1; j <= 1; ++j)
    for (int i = -1; i <= 1; ++i) {
        vec2 c = floor(mp) + vec2(float(i), float(j));
        vec4 h = hash4(c + 3.7);
        if (h.w > 0.62) continue;
        float d = length((mp - (c + h.xy)) * cell) / 13.0;
        acc = max(acc, exp(-0.5 * d * d) * (0.45 + 0.75 * h.z));
    }
    return clamp(acc * exposure * (0.35 + 0.95 * protrude) * band, 0.0, 1.0);
}
'''


# ------------------------------------------------------------------- uniforms
# uniform name -> preset key, for the ones that are not just the name with its
# `u` stripped and lower-cased. Per pass, because `uSpread` is the directional
# spread in wave.frag and the spray plume's spread in spray.frag.
ALIAS = {
    'wave': {'uShin': 'shininess', 'uRelax': 'foamRelax', 'uDiffuse': 'foamDiffuse'},
    'foam': {'uRelax': 'foamRelax', 'uDiffuse': 'foamDiffuse'},
    'spray': {'uRise': 'sprayRise', 'uSpread': 'spraySpread', 'uFall': 'sprayFall',
              'uLife': 'sprayLife', 'uInject': 'sprayInject', 'uGate': 'sprayGate'},
    'composite': {'uShin': 'shininess', 'uSat': 'saturation'},
}
# Set by the renderer every frame, not by the preset table.
RUNTIME = {'uRes', 'uTime', 'uLoop', 'uScrollLoop', 'uDt', 'uFirst', 'uG', 'uFlatOcean', 'uBare', 'uLightDirection',
           'uOpenWaveVis',
           'uDirDeep', 'uDirSecond', 'uCamOrigin', 'uCamSpan', 'uPrevOrigin', 'uPrevSpan',
           'uZ', 'uZc', 'uOpacity',
           'uPeriodP', 'uPeriodS', 'uPeriodC', 'uOmegaS'}
PALETTE = {'cAbyss': 'abyss', 'cDeep': 'deep', 'cMid': 'mid', 'cShallow': 'shallow',
           'cFoamThin': 'foamThin', 'cFoamBody': 'foamBody', 'cFoamDense': 'foamDense',
           'cSky': 'sky', 'cSun': 'sun'}

# Geometry, not energy. The phase field is baked from one solve, so anything that
# would move a crest -- a direction, a period, a wavenumber ratio, an envelope
# frequency, a lateral offset -- is pinned to the state that was baked. Weather
# moves only what can be interpolated on a fixed geometry. See HANDOFF section 1.
PINNED = ('harmM', 'harmA', 'harmL', 'spread', 'groupScale', 'groupAcross',
          'setCycles', 'licSteps')
ORDER = ('calm_swell', 'windy_rolling_surf', 'heavy_crashing_surf')

# See loopScroll. Sixteen is the smallest power of two that lets every one of the
# frozen fields travel at least one tile per period, and it keeps the slowest of
# them -- the regional weather, 2.5 px/s intended -- within 50% of its tuned speed
# instead of at zero. Larger costs clock precision for nothing: at 240 s the
# fastest angular frequency reaches 1400 rad, where a float32 step is 1.2e-4 rad
# against a phase quantisation of 1.5e-2.
SCROLL_LOOPS = 16

# ---------------------------------------------------------------------------
# The camera conversion, in full. Everything is evaluated in tuned plate pixels
# (see the adapter), so most values need nothing at all -- which is the point of
# choosing that frame. What is left is the handful where a length crosses between
# the picture and the screen.
#
# A tuned length CONSUMED AS A SCREEN OFFSET. Both are written against uRes in
# the offline source, so they are asking for screen pixels and must be told how
# many one tuned pixel is worth.
TUNED_TO_SCREEN = {
    'uReliefLift',    # how far a crest rides up-screen; uv + vec2(0, liftPx*hn)/uRes
    'uDiffuse',       # foam neighbourhood radius; vec2 d = uDiffuse / uRes
    # How far toward the sun the cast shadow looks for a crest that occludes this
    # one. That is a question about the WAVE -- does the swell in front of me
    # stand higher than I do -- so the answer has to be a wave length, not a
    # screen length. Left unconverted it marched a fixed 7 px at every zoom: 0.14
    # of a wavelength at the closest camera, which is what it was tuned at, but
    # 0.44 at the territory approach, where it samples the far side of the same
    # wave and shades the crest instead of the trough, and 1.7 wavelengths at
    # world zoom, where it samples an unrelated wave two crests away. A shadow
    # sampled in antiphase does not just weaken -- it inverts, and it inverts at
    # exactly the swell's own spacing, which draws a regular stripe over the sea.
    'uShadowStep',
}
# A screen length CONSUMED AS A LOOKUP COORDINATE. These index noise fields or
# march along them in `px`, which is tuned, so a screen width has to be converted
# the other way or the texture would magnify with the camera.
#
# Deliberately NOT here: crestLineW, laceLineW, chopW, streakW and injCrestW all
# feed contourLine, which divides by the screen-space gradient and is therefore
# already a screen width wherever it is drawn; wispW and shadeSmooth are widths
# of a DRAWN MARK on a screen-space buffer and are meant to hold their pixels.
#
# "Written against uRes" was once the reason shadowStep was excluded, and it is
# the reason it belongs in the table above instead: reliefLift and diffuse are
# written against uRes too, and that is precisely what makes them tuned lengths
# consumed as screen offsets. The test is not how the value is spelt in the
# shader, it is whether the thing being measured is a mark on the picture or a
# distance in the water.
SCREEN_TO_TUNED = {
    # licField marches `px` directly and markField stamps on a material
    # coordinate, so neither goes through the noise helpers that now convert.
    # Both ship inert (licMix 0, markGain 0); the conversion is here so the
    # machinery stays reproducible rather than quietly wrong if it is switched on.
    'uLicScale', 'uLicStep', 'uLicNoise', 'uLicSpeed',
    'uMarkCell', 'uMarkLen', 'uMarkWid',
}


def uniform_table(sources):
    """pass -> {uniform name: (glsl type, preset key)} for every non-runtime uniform.

    Per pass rather than global because uSpread is the directional spread of the
    wave spectrum in wave.frag and the spray plume's spread in spray.frag. One
    flat table would have silently fed one of them the other's number.
    """
    out = {}
    for pass_name, src in sources.items():
        table = {}
        for m in re.finditer(r'^uniform\s+(float|vec2|vec3|vec4)\s+([^;]+);', src, re.M):
            typ, names = m.group(1), m.group(2)
            for raw in names.split(','):
                name = raw.strip().split()[0]
                if name in RUNTIME:
                    continue
                if name in PALETTE:
                    table[name] = (typ, ('palette', PALETTE[name]))
                    continue
                key = ALIAS.get(pass_name, {}).get(name)
                if key is None:
                    key = name[1].lower() + name[2:] if name.startswith('u') else name
                if key not in P.COMMON and key not in P.PRESETS[BAKED_STATE]:
                    raise SystemExit(
                        f'export_web: uniform {name} in {pass_name} maps to preset key '
                        f'{key!r}, which no preset defines. Add it to ALIAS or RUNTIME.')
                table[name] = (typ, key)
        out[pass_name] = table
    return out


def ts_number(v):
    return repr(round(float(v), 8))


def preset_module(table):
    base = P.PRESETS[BAKED_STATE]
    # {pass: {state: {uniform: value}}}
    states = {}
    for pass_name, entries in table.items():
        per_state = {}
        for st in ORDER:
            p = P.PRESETS[st]
            vals = {}
            for name, (_typ, key) in sorted(entries.items()):
                if isinstance(key, tuple):
                    vals[name] = list(p['palette'][key[1]])
                    continue
                src = base if key in PINNED else p
                v = src[key] if key in src else P.COMMON[key]
                vals[name] = list(v) if isinstance(v, tuple) else v
            per_state[st] = vals
        states[pass_name] = per_state

    # There is no painted plate under the live water, so the two terms that read
    # one are forced off. The generated shader already substitutes the base colour
    # for the plate, which makes both the identity; zeroing them as well means the
    # dead work is not done and the absence is visible in the emitted table.
    for st in ORDER:
        for k in ('uPlateInfluence', 'uPlateTint'):
            if k not in states['composite'][st]:
                raise SystemExit(f'export_web: {k} vanished from composite.frag; the plate '
                                 'substitution needs re-checking.')
            states['composite'][st][k] = 0.0

    declared = {n for entries in table.values() for n in entries}
    for name in sorted(TUNED_TO_SCREEN | SCREEN_TO_TUNED):
        if name not in declared:
            raise SystemExit(f'export_web: {name} is in the camera conversion table but no '
                             'pass declares it. Drop it, or it is silently converting nothing.')
    fam = base['families']
    lines = [
        '// GENERATED by art-source/ocean-animation/src/export_web.py -- do not edit.',
        '//',
        '// The three sea states, flattened to uniform values. Weather is one continuous',
        '// scalar over them, NOT a switch: the presets use different wave families, so',
        '// they are different eikonal solves and cannot be crossfaded -- the phase field',
        '// would tear and crests would break and re-form. Everything that would move a',
        '// crest is therefore pinned to the state the world field was baked from',
        f'// ({BAKED_STATE}); weather interpolates only what is an amplitude, a threshold,',
        '// a rate or a colour on that fixed geometry.',
        '',
        'export type OceanUniformValue = number | readonly number[];',
        '',
        'export const OCEAN_BAKED_STATE = ' + json.dumps(BAKED_STATE) + ';',
        '',
        '// The loop period every angular frequency is quantised to. Kept from the',
        '// offline clip: it costs nothing here and preserves the exact tuned rates.',
        f'export const OCEAN_LOOP_SECONDS = {base["loop"]};',
        '',
        '// How many of those loops the large-scale scroll fields close on, and',
        '// therefore what the clock wraps at. Every angular frequency is an exact',
        '// multiple of 2*pi/loop and so also of 2*pi/(N*loop), which is what makes',
        '// the longer wrap exactly as periodic for the wave field. See loopScroll:',
        '// over a single loop the scroll lattice is coarser than the distances the',
        '// weather fields were tuned to cover, and fifteen of the eighteen rounded',
        '// to no motion at all.',
        f'export const OCEAN_SCROLL_LOOPS = {SCROLL_LOOPS};',
        '',
        "// Primary direction and period are the baked solve's and cannot vary.",
        'export const OCEAN_FAMILIES = Object.freeze({',
    ]
    for name in ('primary', 'secondary', 'chop'):
        (dx, dy), t = fam[name]
        lines.append(f'  {name}: Object.freeze({{ direction: Object.freeze([{dx}, {dy}] as const), '
                     f'period: {t} }}),')
    lines += ['});', '',
              '// Screen pixels per tuned pixel at the closest camera, for reference. The',
              '// shaders are evaluated in tuned plate pixels, so the sea itself is',
              '// camera-independent; only these two small sets cross between the picture',
              '// and the screen. See the adapter comment in any generated shader.',
              f'export const OCEAN_TUNED_PER_WORLD = {round(TUNED_PER_WORLD, 6)};',
              '',
              '// A tuned length consumed as a screen offset: multiply by uZc.',
              'export const OCEAN_TUNED_TO_SCREEN: ReadonlySet<string> = new Set(['
              + ', '.join(json.dumps(n) for n in sorted(TUNED_TO_SCREEN)) + ']);',
              '',
              '// A screen length consumed as a lookup coordinate: divide by uZc.',
              'export const OCEAN_SCREEN_TO_TUNED: ReadonlySet<string> = new Set(['
              + ', '.join(json.dumps(n) for n in sorted(SCREEN_TO_TUNED)) + ']);', '',
              'export type OceanPassName = '
              + ' | '.join(json.dumps(n) for n in table) + ';', '']
    for pass_name in table:
        for st in ORDER:
            lines.append(f'const {pass_name.upper()}_{st.upper()}:'
                         ' Readonly<Record<string, OceanUniformValue>> = Object.freeze({')
            for name in sorted(states[pass_name][st]):
                v = states[pass_name][st][name]
                if isinstance(v, list):
                    lines.append(f'  {name}: Object.freeze([' + ', '.join(ts_number(x) for x in v)
                                 + '] as const),')
                else:
                    lines.append(f'  {name}: {ts_number(v)},')
            lines += ['});', '']
    lines += [
        '// Ordered calm -> windy -> heavy; the weather scalar walks each triple.',
        'export const OCEAN_PASS_STATES: Readonly<Record<OceanPassName,'
        ' readonly Readonly<Record<string, OceanUniformValue>>[]>> = Object.freeze({',
    ]
    for pass_name in table:
        lines.append(f'  {pass_name}: Object.freeze(['
                     + ', '.join(f'{pass_name.upper()}_{st.upper()}' for st in ORDER) + ']),')
    lines += ['});', '',
              'export const OCEAN_PASS_UNIFORM_TYPES: Readonly<Record<OceanPassName,'
              ' Readonly<Record<string, "float" | "vec2" | "vec3">>>> = Object.freeze({']
    for pass_name, entries in table.items():
        lines.append(f'  {pass_name}: Object.freeze({{')
        for name, (typ, _k) in sorted(entries.items()):
            lines.append(f'    {name}: {json.dumps(typ)},')
        lines.append('  }),')
    lines += ['});', '']
    return '\n'.join(lines)


def main():
    meta = _meta
    passes = {}
    passes['wave'] = wave(meta)
    # foam and spray need the reprojection helpers and the impact-site field,
    # which sit after the adapter so they can use worldUvOf/fieldG/hash4.
    passes['foam'] = sub(foam(meta), '\nuniform sampler2D texGeom, texFlow, texPrev, texPath;',
                         STATE_HELPERS + '\nuniform sampler2D texGeom, texFlow, texPrev, texPath;',
                         label='foam helpers')
    passes['spray'] = sub(spray(meta), '\nuniform sampler2D texGeom, texFlow, texPrev;',
                          STATE_HELPERS + IMPACT
                          + '\nuniform sampler2D texGeom, texFlow, texPrev;',
                          label='spray helpers')
    passes['composite'] = composite(meta)

    table = uniform_table(passes)
    module = preset_module(table)

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(MODEL, exist_ok=True)
    banner = ('// GENERATED by art-source/ocean-animation/src/export_web.py -- do not edit.\n'
              '// The water is authored in art-source/ocean-animation/src/shaders/.\n')
    # The literal must OPEN on the #version directive. GLSL requires it to be the
    # first line of the shader, and a newline after the backtick is one.
    for name, src in passes.items():
        const = 'OCEAN_' + name.upper() + '_SHADER'
        with open(os.path.join(OUT, f'{name}.ts'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(banner + f'\nexport const {const} = String.raw`' + raw(src, name) + '`;\n')
    with open(os.path.join(OUT, 'vertex.ts'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(banner + '\nexport const OCEAN_VERTEX_SHADER = String.raw`'
                 + raw(VERTEX, 'vertex') + '`;\n')
    with open(os.path.join(OUT, 'index.ts'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(banner + '\n' + ''.join(
            f'export {{ OCEAN_{n.upper()}_SHADER }} from "./{n}.ts";\n' for n in passes)
            + 'export { OCEAN_VERTEX_SHADER } from "./vertex.ts";\n')
    with open(os.path.join(MODEL, 'oceanStates.ts'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(module)
    with open(os.path.join(MODEL, 'worldFields.ts'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(banner + '\nexport const OCEAN_WORLD_FIELDS = Object.freeze('
                 + json.dumps(meta, indent=2) + ' as const);\n')

    total = sum(len(v) for v in table.values())
    print(f'{total} preset-driven uniform bindings across {len(passes)} passes')
    if RENAMED:
        print('  GLSL ES reserved words renamed: '
              + ', '.join(f'{w} -> {w}_' for w in sorted(RENAMED)))
    for name, src in passes.items():
        print(f'  {name + ".ts":18s}{len(src.splitlines()):5d} lines')
    print(f'  {"oceanStates.ts":18s}{len(module.splitlines()):5d} lines')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
