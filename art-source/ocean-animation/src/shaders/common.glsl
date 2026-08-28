// ---- shared helpers -------------------------------------------------------
uniform vec2  uRes;         // pixels
uniform float uTime;        // seconds
uniform float uLoop;        // loop period, seconds

// texP : S_primary, S_secondary, S_chop, depth(px)
// texG : kP, kS, kC, sdf(px)
// texD : dirP.xy, dirS.xy
// texM : waterSoft, shoreBandSoft, sprayLandSoft, vignette
// texA : ampP, ampS, ampC, focus
uniform sampler2D texP, texG, texD, texM, texA;
uniform sampler2D texNoise;     // tileable fbm, 4 octaves in rgba
uniform sampler2D texNoiseF;    // small, flat companion for FINE lookups

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }

// tileable value noise lookup; scale in pixels
float noiseAt(vec2 px, float scale){
    return texture(texNoise, px/scale).r;
}
vec4 noise4(vec2 px, float scale){
    return texture(texNoise, px/scale);
}
// Fine lookups must come from the small texture. On the 512^2 one a lookup at
// scale S runs at 512/S texels per screen pixel -- 13x minified at the lace
// scale -- so the mipmap averages the detail away before it can be drawn.
float noiseFineAt(vec2 px, float scale){
    return texture(texNoiseF, px/scale).r;
}
vec4 noiseFine4(vec2 px, float scale){
    return texture(texNoiseF, px/scale);
}
// smooth periodic-in-time scalar, exactly loop-safe
float loopSin(float t, float cycles, float phase){
    return sin(6.28318530718*(cycles*t/uLoop + phase));
}

float sstep(float a, float b, float x){ return smoothstep(a, b, x); }

// ---------------------------------------------------------------------------
float contourLine(float f, float level, float widthPx)
{
    float d = f - level;
    float g = length(vec2(dFdx(f), dFdy(f))) + 1e-7;
    return 1.0 - smoothstep(0.0, widthPx * g, abs(d));
}


// ---------------------------------------------------------------------------
// MARKS, not fields.
//
// Everything soft in this renderer is a smoothstep of a smooth field, which is
// band-limited by construction. Measured against the plate, the render holds
// about half its energy at every scale below 64 px, and sharpening does not fix
// it: unsharp masking raised fine-band energy to 1.59x while neighbour coherence
// FELL from 0.273 to 0.215, because it amplifies noise rather than creating
// shape. The plate's fine detail is small SHAPES WITH BOUNDARIES.
//
// So stamp them. A jittered grid of short capsules, oriented along the flow and
// evaluated from a distance function, so each has a real edge at any size. Fed
// material coordinates, the marks ride with the water instead of crawling.
vec4 hash4(vec2 p)
{
    vec4 q = vec4(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)),
                  dot(p, vec2(419.2, 371.9)), dot(p, vec2(53.7, 97.3)));
    return fract(sin(q) * 43758.5453);
}

float markField(vec2 mp, vec2 dir, float cell, float len, float wid,
                float density, float wander, float seed)
{
    vec2 g  = mp / max(cell, 1e-3);
    vec2 gi = floor(g);
    vec2 md0 = normalize(dir + vec2(1e-5));
    float acc = 0.0;
    for (int j = -1; j <= 1; ++j)
    for (int i = -1; i <= 1; ++i) {
        vec2 c = gi + vec2(float(i), float(j));
        vec4 h = hash4(c + seed);
        if (h.w > density) continue;
        vec2 centre = (c + vec2(h.x, h.y)) * cell;
        vec2 d = mp - centre;
        vec2 md = normalize(md0 + vec2(h.z - 0.5, h.y - 0.5) * wander);
        vec2 pp = vec2(-md.y, md.x);
        float u = dot(d, md), v = dot(d, pp);
        float L = len * (0.45 + h.z * 1.1);
        float W = max(wid * (0.55 + h.x * 0.9), 0.35);
        float t = clamp(u / max(L, 1e-3), -1.0, 1.0);
        float dist = length(vec2(u - t * L, v));
        // a real boundary: the transition is one pixel wide, not a soft falloff
        acc = max(acc, 1.0 - smoothstep(W - 0.6, W + 0.6, dist));
    }
    return acc;
}

uniform vec2 uDirDeep;      // deep-water primary direction, constant per clip
uniform float uG;           // picture-space gravity, px/s^2
uniform float uFlatOcean;   // 1 = Stage-1 gate: constant depth, plane waves, no coast
uniform float uBare;        // 1 = geometry only: no foam, no spray, no shallow colour

// Scroll offset for a tileable noise of period `scale` px, quantised so the
// pattern wraps an exact whole number of tiles over one loop. Without this the
// time-scrolled noise terms are the only thing preventing a seamless loop.
vec2 loopScroll(vec2 dir, float speed, float scale){
    vec2 d = dir * (speed * uLoop);
    vec2 q = floor(d / scale + 0.5) * scale;
    return q * (uTime / uLoop);
}
