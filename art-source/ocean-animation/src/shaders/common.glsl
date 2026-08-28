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
