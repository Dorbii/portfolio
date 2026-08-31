#version 330
// Spray state. Spray is never ambient: it exists only where a crest has just
// struck rock or a piling. It rises, spreads, then falls back and fades.
// Channels: r density, g age (0 fresh -> 1 spent), ba material coordinate.
in vec2 uv;
out vec4 outSpray;

#include "common.glsl"

uniform sampler2D texGeom, texFlow, texPrev, texImpact;
uniform float uDt;
uniform float uRise;        // px/s the plume climbs on screen while young
uniform float uSpread;      // px/s outward along the shore normal
uniform float uFall;        // px/s it settles once spent
uniform float uLife;        // seconds
uniform float uInject;
uniform float uGate;        // impact-strength gate: bigger = rarer, larger bursts
uniform float uOpenSpray, uOpenGate;   // a breaker collapsing in open water
uniform float uFirst;

void main()
{
    vec2 px = uv * uRes;
    vec4 M = texture(texM, uv);
    vec4 G = texture(texG, uv);
    float sdf = G.w;
    float breaking = texture(texGeom, uv).w;

    // shore normal, pointing out to sea
    vec2 shoreN;
    {
        vec2 t = vec2(2.0 / uRes.x, 0.0), t2 = vec2(0.0, 2.0 / uRes.y);
        float sr = texture(texG, uv + t).w, sl = texture(texG, uv - t).w;
        float sd = texture(texG, uv + t2).w, su = texture(texG, uv - t2).w;
        shoreN = normalize(vec2(sr - sl, sd - su) + vec2(1e-5));
    }

    vec4 prev = texture(texPrev, uv);
    float age = prev.g;

    float site = texture(texImpact, uv).r;         // 0..1 exposure weight

    // ---- ballistic-ish motion --------------------------------------------
    // young spray climbs the screen (the camera looks down, so vertical rise
    // reads as a short upward drift) and spreads inland; spent spray falls back.
    float young = 1.0 - smoothstep(0.15, 0.75, age);
    // A PLUME IS AS TALL AS WHAT IT HITS. Every burst used to climb at the
    // same rate, so a wave meeting a sheer headland threw the same spray as one
    // washing over a low rock -- the owner asked for exactly this: "when the
    // waves crash into large cliff faces shouldn't the spray be taller?"
    //
    // The impact map already carries the answer. It is built from coastline
    // EXPOSURE -- how far a piece of coast protrudes into the incoming train --
    // and exposure is what makes a headland both a cliff and a place that takes
    // the full energy of a wave. So the site weight scales the climb, and lets
    // the plume live longer while it is up there; a sheltered cove keeps its
    // low wash.
    float sitePower = site;
    float plume = 0.55 + 1.35 * sitePower;
    vec2 vel = -shoreN * (uSpread * young * (0.75 + 0.45 * sitePower))
             + vec2(0.0, -1.0) * (uRise * young * plume)
             + vec2(0.0,  1.0) * (uFall * smoothstep(0.45, 1.0, age));
    vel += vec2(0.35, -0.15) * (uRise * 0.35 * young * plume);   // lean with the light

    vec2 back = px - vel * uDt;
    vec2 buv = clamp(back / uRes, vec2(0.002), vec2(0.998));
    prev = texture(texPrev, buv);

    vec2 d = 1.6 / uRes;
    vec4 blur = 0.25 * (texture(texPrev, buv + vec2(d.x, 0.0)) + texture(texPrev, buv - vec2(d.x, 0.0))
                      + texture(texPrev, buv + vec2(0.0, d.y)) + texture(texPrev, buv - vec2(0.0, d.y)));
    prev = mix(prev, blur, 0.42);

    float dens = prev.r;
    age = prev.g;
    vec2 mat = prev.ba;
    if (uFirst > 0.5) { dens = 0.0; age = 1.0; mat = px; }

    age = min(1.0, age + uDt / max(uLife * (0.82 + 0.42 * site), 1e-3));
    dens *= exp(-uDt / max(uLife * 0.55, 1e-3));

    mat = mix(mat, px, clamp(uDt / 1.2, 0.0, 1.0));

    // ---- injection at genuine impacts -------------------------------------
    // impact sites are precomputed from coastline exposure; a burst fires only
    // when a strong crest actually arrives at one of them
    float nearRock = 1.0 - smoothstep(2.0, 26.0, sdf);
    float strength = breaking * site * nearRock;
    float fire = smoothstep(uGate, uGate + 0.22, strength);
    // ...and a wave that collapses in OPEN WATER throws something too. The
    // impact sites are precomputed from coastline exposure and gated to within
    // 26 tuned px of rock, so until now a breaker that crashed back into the
    // sea produced foam and nothing else -- the owner asked for it directly.
    // A deep collapse is smaller and softer than a cliff strike: no site
    // weight, no rock, just the whitecap event itself, and rare because that
    // event is already threshold-quadratic and group-gated upstream.
    float openBurst = smoothstep(uOpenGate, uOpenGate + 0.30,
                                 texture(texFlow, uv).w * (1.0 - nearRock));
    fire = max(fire, openBurst * uOpenSpray);
    float grow = 1.0 - exp(-fire * uInject * uDt * 9.0);
    if (grow > 0.0005) {
        dens = dens + (1.35 - dens) * grow;
        age = min(age, mix(age, 0.05, clamp(grow * 3.0, 0.0, 1.0)));
        mat = mix(mat, px, clamp(grow * 3.0, 0.0, 1.0));
    }

    dens *= M.x + M.z;      // water, or the narrow permitted land band
    outSpray = vec4(clamp(dens, 0.0, 1.5), clamp(age, 0.0, 1.0), mat);
}
