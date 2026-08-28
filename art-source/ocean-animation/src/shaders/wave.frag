#version 330
// Wave pass. Evaluates the Gerstner-style sum built on the eikonal phase fields
// and emits surface geometry + the quantities the foam/spray passes need.
in vec2 uv;

layout(location = 0) out vec4 outGeom;   // h, dhdx, dhdy, breaking
layout(location = 1) out vec4 outFlow;   // flow.xy (px/s), crestness, whitecap
layout(location = 2) out vec4 outSwell;  // primary-swell-only gradient, for the specular

#include "common.glsl"

uniform float uAmpP, uAmpS, uAmpC;      // base amplitudes, px
uniform float uSteep;                   // Gerstner sharpening 0..1
uniform float uSetMix;                  // depth of the wave-set envelope
uniform float uSetCycles;               // set cycles per loop
uniform float uBreakGamma;              // H/d threshold
uniform float uWhitecapSteep;           // deep-water whitecap steepness threshold
uniform float uAmpL, uHarmL;            // long swell: fills the 200-600 px band
uniform float uDirWander;               // slow spatial variation of wave direction
uniform float uFormBend, uFormGroup, uFormFine;  // curvature, group variance, finer train
uniform float uChopGain;
uniform float uJitter;                  // crest-spacing jitter, radians
uniform float uStokes;                  // shoreward drift gain
uniform float uBackwash;                // seaward pull gain
uniform float uPeriodP, uPeriodS, uPeriodC;
uniform vec3  uHarmM;   // primary harmonic wavenumber ratios
uniform vec3  uHarmA;   // primary harmonic amplitude ratios
uniform float uSpread;  // directional spread half-angle, degrees
uniform float uGroupDepth;   // 0..1 depth of the travelling wave-set envelope
uniform float uGroupScale;   // envelope wavenumber as a fraction of the swell's
uniform float uGroupAcross;  // cross-crest extent of a group (0 = infinite crests)

// One family contributes several components. Scaling the solved phase by m
// scales the wavenumber by m, and deep-water dispersion then fixes the angular
// frequency at w = w0*sqrt(m), which keeps every component travelling at a
// physically sensible speed while sharing one refraction solution.
struct Acc { float h; vec2 g; float amp; vec2 orb; float steepMax; float energy; vec2 gSwell; };

const float MAX_STEEP = 0.26;   // a*k ceiling; real waves break well before 0.44

// A single direction per family gives infinitely long, perfectly parallel
// crests -- denim, not sea. Real wind seas carry a directional spectrum, and the
// interference between neighbouring directions is what makes crests SHORT.
// The lateral term rotates a component's wave vector by delta while keeping
// |k| (and therefore its frequency) correct.
void addSpread(inout Acc acc, float S, float kmag, vec2 dir, vec2 perpD, float k0,
               vec2 px, float amp, float m, float deltaDeg, float period,
               float jitterPhase, float ampScale)
{
    // Wave direction WANDERS slowly across the scene. A single direction per
    // component gives crests that run edge to edge in perfect parallel; real seas
    // near a complex coast get their waves from a spread of origins, so wavefronts
    // curve and vary along their length and no two crests are quite parallel.
    //
    // The lateral term below is already a wavevector rotation, so making its angle
    // vary spatially rotates the local wave vector -- which is the same thing a
    // second origin would do. It has to vary SLOWLY compared with the wavelength
    // for the slowly-varying-direction approximation to hold, hence the 900 px
    // scale: over one wavelength the direction is effectively constant.
    float wander = (noiseAt(px, 900.0) - 0.5) * 2.0 * uDirWander
                 + (noiseAt(px + vec2(413.0, 77.0), 380.0) - 0.5) * uDirWander * 0.45;
    float dl = radians(deltaDeg + wander);
    float cs = cos(dl), sn = sin(dl);
    float w  = (6.28318530718 / period) * sqrt(m);
    float n  = max(1.0, floor(w * uLoop / 6.28318530718 + 0.5));
    w = 6.28318530718 * n / uLoop;

    float th = S * m * cs + k0 * m * sn * dot(px, perpD) + jitterPhase - w * uTime;
    float a  = amp * ampScale;
    float k  = kmag * m;
    vec2  kd = normalize(dir * (kmag * m * cs) + perpD * (k0 * m * sn) + vec2(1e-6));

    float c = cos(th), s = sin(th);
    acc.h += a * c;
    float ak = a * k;
    float lim = min(1.0, MAX_STEEP / max(ak, 1e-5));
    acc.g += -ak * lim * s * kd;
    acc.amp += a;
    acc.energy += a * a;
    acc.orb += kd * (a * w * c);
    acc.steepMax = max(acc.steepMax, ak);
}

void addComp(inout Acc acc, float S, float kmag, vec2 dir, float amp,
             float m, float period, float jitterPhase, float ampScale)
{
    float w  = (6.28318530718 / period) * sqrt(m);
    // quantise to the loop so the whole field is exactly periodic
    float n  = max(1.0, floor(w * uLoop / 6.28318530718 + 0.5));
    w = 6.28318530718 * n / uLoop;

    float th = S * m + jitterPhase - w * uTime;
    float a  = amp * ampScale;
    float k  = kmag * m;

    float c = cos(th), s = sin(th);
    acc.h += a * c;
    // d/dx of a*cos(S*m) = -a*m*sin * dS/dx ; dS/dx = kmag*dir
    float ak = a * k;
    float lim = min(1.0, MAX_STEEP / max(ak, 1e-5));
    acc.g += -ak * lim * s * dir;
    acc.amp += a;
    acc.energy += a * a;
    // surface orbital velocity, in phase with elevation, along the ray
    acc.orb += dir * (a * w * c);
    acc.steepMax = max(acc.steepMax, ak);
}

void main()
{
    vec2 px = uv * uRes;
    vec4 P = texture(texP, uv);
    vec4 G = texture(texG, uv);
    vec4 D = texture(texD, uv);
    vec4 M = texture(texM, uv);
    vec4 A = texture(texA, uv);

    float depth = max(P.w, 0.35);
    float water = M.x;

    vec2 dirP = normalize(D.xy + 1e-6);
    vec2 dirS = normalize(D.zw + 1e-6);

    // ---- Stage-1 gate ------------------------------------------------------
    // Constant depth, analytic plane-wave phase, water everywhere: no coast, no
    // bathymetry, no refraction. Pure travelling wave geometry, so the crest
    // mechanics can be judged with nothing else in the frame to hide behind.
    float kP = G.x, kS = G.y, kCraw = G.z;
    float SP = P.x, SS = P.y, SC = P.z;
    if (uFlatOcean > 0.5) {
        depth = 60.0;
        water = 1.0;
        vec2 dA = uDirDeep;
        vec2 dB = normalize(vec2(uDirDeep.x * 0.82 + uDirDeep.y * 0.57,
                                 uDirDeep.y * 0.82 - uDirDeep.x * 0.57));
        vec2 dC = normalize(vec2(uDirDeep.x * 0.94 - uDirDeep.y * 0.34,
                                 uDirDeep.y * 0.94 + uDirDeep.x * 0.34));
        kP = pow(6.28318530718 / uPeriodP, 2.0) / uG;
        kS = pow(6.28318530718 / uPeriodS, 2.0) / uG;
        kCraw = pow(6.28318530718 / uPeriodC, 2.0) / uG;
        SP = kP * dot(px, dA);
        SS = kS * dot(px, dB);
        SC = kCraw * dot(px, dC);
        dirP = dA; dirS = dB;
    }

    // low-frequency phase jitter: kills the "uniformly spaced parallel bands"
    // look without fragmenting the crest lines
    vec4 nA = noise4(px, 620.0);
    vec4 nB = noise4(px + vec2(311.0, 97.0), 260.0);
    float j1 = (nA.r - 0.5) * 2.0 * uJitter;
    float j2 = (nA.g - 0.5) * 2.0 * uJitter * 1.4;
    float j3 = (nB.b - 0.5) * 2.0 * uJitter * 2.1;

    // Wave sets. The old envelope was a single global sin(t): the entire sea rose
    // and fell together, which is not what a set is. A set is a SPATIAL group that
    // travels at the group velocity, c/2 in deep water. Modelling it as a slow
    // modulation of the same phase field makes it travel correctly for free:
    // phase_env = S*mg - w*mg/2*t  moves at (w*mg/2)/(k*mg) = c/2.
    float w0 = 6.28318530718 / uPeriodP;
    float mg1 = uGroupScale, mg2 = uGroupScale * 0.61;
    float wg1 = w0 * mg1 * 0.5, wg2 = w0 * mg2 * 0.5;
    wg1 = 6.28318530718 * max(1.0, floor(wg1 * uLoop / 6.28318530718 + 0.5)) / uLoop;
    wg2 = 6.28318530718 * max(1.0, floor(wg2 * uLoop / 6.28318530718 + 0.5)) / uLoop;
    // The envelope must be localised ACROSS the crests as well as along them.
    // Built from S alone it is constant along each crest line, so every wave has
    // the same amplitude from end to end -- which is what made the sea read as
    // corduroy however much the spacing was jittered. Adding a perpendicular
    // term makes each group a travelling 2-D patch, so crests wax and wane along
    // their own length and the banding breaks up on its own.
    vec2 perpD = vec2(-uDirDeep.y, uDirDeep.x);
    float k0g = pow(6.28318530718 / uPeriodP, 2.0) / uG;
    float across1 = k0g * mg1 * uGroupAcross * dot(px, perpD);
    float across2 = k0g * mg2 * uGroupAcross * 1.7 * dot(px, perpD);
    float g1 = cos(SP * mg1 + across1 - wg1 * uTime + nA.b * 4.0);
    float g2 = cos(SP * mg2 * 1.37 - across2 - wg2 * uTime + 2.1 + nA.r * 3.0);
    float groupEnv = 1.0 + uGroupDepth * (0.66 * g1 + 0.44 * g2);
    // a residual slow global breathing, much weaker than before
    float setEnv = groupEnv * mix(1.0, 0.82 + 0.30 * (0.5 + 0.5 * loopSin(uTime, uSetCycles, nA.b * 0.15)), uSetMix);

    Acc acc; acc.h = 0.0; acc.g = vec2(0.0); acc.amp = 0.0; acc.orb = vec2(0.0);
    acc.steepMax = 0.0; acc.energy = 0.0; acc.gSwell = vec2(0.0);

    // ---- primary swell: five components spanning direction and scale -------
    // Narrow in SCALE (harmonics travel at c0/sqrt(m), so a wide spectrum makes
    // the crest of the sum hop between components) but spread in DIRECTION, which
    // is what breaks crests into finite lengths instead of edge-to-edge bands.
    float shP = (uFlatOcean > 0.5) ? 1.0 : A.x;
    vec2 perpP = vec2(-uDirDeep.y, uDirDeep.x);
    float k0P = pow(6.28318530718 / uPeriodP, 2.0) / uG;
    float sp = uSpread;
    vec2 gBefore = acc.g;
    float hBefore = acc.h, eBefore = acc.energy;
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * uHarmA.x * setEnv, uHarmM.x,  0.00 * sp, uPeriodP, j1,       shP);
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * 0.54 * setEnv,     0.92,     -0.62 * sp, uPeriodP, j2,       shP);
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * 0.47 * setEnv,     1.09,      0.72 * sp, uPeriodP, j3,       shP);
    // The sun sheen must read the large-scale surface only. Evaluating a
    // pow(dot(N,H), 24) lobe against a normal that still carries the secondary
    // train and the chop was, by ablation, 64% of all high-frequency mottling in
    // the water -- even after a 7-tap smoothing pass.
    // ---- long swell -------------------------------------------------------
    // Measured against the source plate, its water carries 19.2% of its energy at
    // 200-600 px against our 3.4%, while 48% of ours piled into a single
    // 100-200 px band against its 27.7%. A narrowband sea is regular by
    // construction: it makes repeating bands rather than a population of separate
    // wave forms, and no amount of foam or shading work can fix a spectrum.
    //
    // A sub-harmonic of the primary train (m < 1), so it needs no second phase
    // solve: S*m stretches the same field and w = w0*sqrt(m) keeps it on the
    // dispersion relation, where a longer wave is correctly FASTER, c = c0/sqrt(m).
    //
    // It has to be accumulated BEFORE the swell capture below. A long wave has a
    // small gradient by construction -- the same amplitude spread over a longer
    // distance -- so it contributes almost nothing through the surface normal;
    // it reads as broad TONE, and the broad tonal terms are driven by the swell
    // height captured here. Added after it, it was worth 2% of spectral energy.
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * uAmpL * setEnv, uHarmL,        0.22 * sp, uPeriodP, j1 * 0.7, shP);
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * uAmpL * 0.55,   uHarmL * 1.53, -0.34 * sp, uPeriodP, j2 * 0.6, shP);

    acc.gSwell = acc.g - gBefore;
    float hSwellRaw = acc.h - hBefore;
    float eSwell = max(acc.energy - eBefore, 1e-9);
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * uHarmA.y * setEnv, uHarmM.y,  0.30 * sp, uPeriodP, j2 * 1.3, shP);
    addSpread(acc, SP, kP, dirP, perpP, k0P, px, uAmpP * uHarmA.z,          uHarmM.z, -0.45 * sp, uPeriodP, j3 * 0.8, shP);


    // ---- secondary train --------------------------------------------------
    float shS = (uFlatOcean > 0.5) ? 1.0 : A.y;
    vec2 perpS = vec2(-dirS.y, dirS.x);
    float k0S = pow(6.28318530718 / uPeriodS, 2.0) / uG;
    addSpread(acc, SS, kS, dirS, perpS, k0S, px, uAmpS,        1.000, -0.42 * sp, uPeriodS, j2, shS);
    addSpread(acc, SS, kS, dirS, perpS, k0S, px, uAmpS * 0.58, 1.310,  0.55 * sp, uPeriodS, j3, shS);
    addSpread(acc, SS, kS, dirS, perpS, k0S, px, uAmpS * 0.40, 1.870, -0.20 * sp, uPeriodS, j1, shS);

    // ---- wind chop: short, shallow-shoaling, deliberately noisy -----------
    float shC = (uFlatOcean > 0.5) ? 1.0 : min(A.z, 1.15);
    vec2 dirC = normalize(mix(dirP, dirS, 0.35) + vec2(nB.r - 0.5, nB.g - 0.5) * 0.25);
    float kC = min(kCraw, 0.235);        // floor the chop wavelength at ~27 px
    addComp(acc, SC, kC, dirC, uAmpC * uChopGain,      1.000, uPeriodC, j3,        shC);
    addComp(acc, SC, kC, dirC, uAmpC * 0.55 * uChopGain, 1.740, uPeriodC, j1 * 2.0, shC);

    // ---- Gerstner sharpening ---------------------------------------------
    // Real crests are narrow and troughs are broad. In this near-plan view that
    // asymmetry is the single strongest cue that the water has volume.
    // Normalise by the RMS of the spectrum, not the sum of amplitudes. Sum-based
    // normalisation shrinks the tonal range every time a component is added --
    // going from 3 to 10 components flattened the sea without changing the water.
    float sigma = sqrt(max(acc.energy, 1e-9) * 0.5);
    float hn = clamp(acc.h / (2.15 * sigma), -1.0, 1.0);
    float sharp = uSteep * 0.55;
    float hs = hn + sharp * (hn * hn * sign(hn) - hn) ;
    float dsharp = 1.0 + sharp * (2.0 * abs(hn) - 1.0);
    hn = clamp(hs, -1.0, 1.0);
    acc.h = hn * (2.15 * sigma);
    acc.g *= dsharp;
    // Swell-only height, normalised by the swell's OWN rms. Broad tonal
    // structure -- troughs, the rising face, the lip -- has to be driven by
    // this and not by the full band, or the shading follows the chop and the
    // result is mottling instead of volume.
    float hnSwell = clamp(hSwellRaw / (2.15 * sqrt(eSwell * 0.5)), -1.0, 1.0);

    // ---- breaking ---------------------------------------------------------
    // Significant wave height from the spectrum (Hs = 4*sigma), not the plain
    // sum of amplitudes -- summing |a_i| overstates H by ~25% and pushed the
    // breaking threshold out into genuinely deep water during big sets.
    float Hloc = 2.83 * sqrt(max(acc.energy, 1e-6)) * (0.55 + 0.45 * setEnv);
    float gamma = Hloc / depth;
    // ---- break PHASE -------------------------------------------------
    // How far this water column has progressed toward collapse: the clock for
    // the pre-break lifecycle -- hollow trough, rising translucent face,
    // sharpening lip -- all of which exist long before any whitewater does.
    //
    // It must be built from a SMOOTH proxy. Using the local gamma = Hloc/depth
    // inherits both the ray-focus caustics in the shoaling map and the +-79%
    // swing of the group envelope, and the two together turned a lifecycle ramp
    // into a hard blotchy switch: measured p50 0.00 / p95 1.00 right across the
    // 35-75 px band, which is precisely where it should have been mid-ramp.
    //
    // The deep-water swell height and the depth are both smooth, and the set
    // envelope is smooth at group scale (~1200 px), so the band still breathes
    // in and out with the sets instead of being a constant-width outline traced
    // around the coast.
    float aRef = uAmpP * setEnv;
    float Href = 2.83 * sqrt(max(aRef * aRef * (uHarmA.x * uHarmA.x + 0.2916 + 0.2209), 1e-6));
    float bphase = sstep(uBreakGamma * 0.39, uBreakGamma * 0.98, Href / depth) * water;
    // Whitewater starts LATER than it used to, and it is gated on the pre-break
    // clock as well: foam cannot appear until the wave has actually stood up.
    // The old threshold began foam at 0.62*gamma, inside the window where the
    // wave should still be a smooth standing face, which collapsed the whole
    // lifecycle into a single event.
    float ready = sstep(uBreakGamma * 0.98, uBreakGamma * 1.42, gamma)
                * sstep(0.50, 0.88, bphase);

    // Localised to the top of the wave: foam is born ON the crest, not spread
    // across its whole face, and where it is born is where it reads from.
    float crestness = sstep(0.42, 0.90, hn);
    // only the shoreward face breaks
    vec2 nrm = normalize(acc.g + vec2(1e-5));
    float facing = clamp(-dot(nrm, dirP), 0.0, 1.0);
    float steep = length(acc.g);

    // Depth-limited breaking. Waves break when H/d exceeds ~gamma, which is a
    // shallow-water process; in deep water they whitecap instead, transiently.
    // Without a gate, a residual breaking of ~0.05 offshore accumulated over the
    // foam persistence into solid white sheets -- the "ice floes".
    //
    // The limit must SCALE WITH WAVE HEIGHT: d_break = H/gamma. A fixed depth
    // clipped the heavy state's surf zone so hard that heavy and windy became
    // indistinguishable (10.8% vs 11.0% foam). Big waves legitimately break in
    // deeper water; small ones only right at the shore.
    float breakDepth = Hloc / max(uBreakGamma, 0.20);
    float shallowGate = 1.0 - sstep(breakDepth * 1.05, breakDepth * 1.75, depth);
    float breaking = ready * crestness * (0.35 + 0.85 * facing) * water * shallowGate;
    // Spatial irregularity so the whole coast never lights up at once. The
    // previous form -- sstep(0.18, 0.62, patch*0.75 + 0.45) -- was pinned at 1.0
    // across 80% of the patch field's range and never fell below 0.67, so it had
    // effectively been doing nothing since it was written. That is what produced
    // uniform white crest density along the entire coastline.
    //
    // Two scales: one at wave-group size that decides which individual crests
    // break, and one much larger that takes whole stretches of coast quiet.
    float patch = noise4(px + loopScroll(uDirDeep, 18.0, 190.0), 190.0).b;
    float reach = noise4(px + loopScroll(uDirDeep, 6.0, 620.0), 620.0).g;
    breaking *= sstep(0.30, 0.72, patch);
    breaking *= 0.20 + 0.80 * sstep(0.34, 0.74, reach);

    // Whitecapping keyed on the TOTAL surface slope, which is the physical
    // criterion. Using the per-component a*k was wrong twice over: it read the
    // pre-cap value, and the short chop components dominate it, so the whole sea
    // saturated into a white blanket at high energy.
    float totalSteep = length(acc.g);
    float whitecap = sstep(uWhitecapSteep, uWhitecapSteep * 1.75, totalSteep)
                   * sstep(0.50, 0.96, hn) * water;
    // run-up wash: the shallowest water is white whenever the surface is up,
    // independent of whether a crest is formally "breaking" there
    float swashZone = 1.0 - sstep(0.6, 6.5, depth);
    // The run-up wash was a uniform 0.85 along the ENTIRE coastline, which is
    // what made the surf read as one continuous white ribbon rather than as
    // separate breaks. Same treatment the main breaking term already gets: a
    // large-scale patch field, floored so the swash never disappears outright.
    // Long gaps, not a modulated ribbon: the floor has to be low enough that
    // stretches of shoreline genuinely have no run-up wash at a given moment.
    float swashPatch = 0.12 + 0.88 * sstep(0.32, 0.76,
        noise4(px + loopScroll(uDirDeep, 9.0, 540.0), 540.0).r);
    swashPatch *= 0.30 + 0.70 * sstep(0.34, 0.74, reach);
    breaking = max(breaking, swashZone * sstep(-0.25, 0.55, hn) * water * 0.85 * swashPatch);

    // ---- surface flow used to advect foam and spray -----------------------
    vec2 shoreN = vec2(0.0);
    {
        vec2 t = vec2(2.0 / uRes.x, 0.0), t2 = vec2(0.0, 2.0 / uRes.y);
        float sr = texture(texG, uv + t).w, sl = texture(texG, uv - t).w;
        float sd = texture(texG, uv + t2).w, su = texture(texG, uv - t2).w;
        shoreN = normalize(vec2(sr - sl, sd - su) + vec2(1e-5));   // points seaward
    }
    float shallow = 1.0 - sstep(2.0, 30.0, depth);
    vec2 flow = acc.orb * (0.75 + 1.35 * shallow);
    flow += dirP * (uStokes * acc.amp * 0.9);
    // Backwash: in the trough, shallow water drains seaward along the normal.
    // Confined to the genuine swash zone. Spread over the whole 30-px-deep band
    // it was transporting surf-zone foam ~240 px out to sea over the foam's
    // lifetime, where it piled up into slabs -- the "ice floes" were shore foam
    // that had been carried offshore, not foam generated there.
    float swashOnly = 1.0 - sstep(3.0, 11.0, depth);
    float trough = sstep(0.25, -0.55, hn);
    flow += shoreN * (uBackwash * trough * swashOnly * (10.0 + 16.0 * ready));
    // Turbulence so foam shreds instead of sliding rigidly. Kept large-scale and
    // modest: strong small-scale shear scrambles the foam material coordinates.
    vec4 nc = noise4(px + loopScroll(vec2(0.0, 1.0), 6.0, 320.0), 320.0);
    vec4 nc2 = noise4(px + loopScroll(vec2(1.0, 0.0), 5.0, 320.0), 320.0);
    flow += vec2(nc.g - 0.5, nc2.b - 0.5) * (7.0 + 20.0 * breaking) * (0.35 + 0.65 * shallow);

    outGeom = vec4(hn, acc.g.x, acc.g.y, clamp(breaking, 0.0, 1.0));
    // ---- clean wave FORM, for shading only ---------------------------------
    // hnSwell is a sum of directionally-spread components: an interference
    // pattern, not a wave form. Everything that draws a wave's SHAPE -- the
    // hollow, the face gradient, the lip, the rim -- was keyed on it, so those
    // terms could only ever produce mottling. Dumping the field showed it plainly,
    // and the no-white acceptance test is what forced the dump.
    //
    // This is the same swell reduced to its two dominant trains with no spread
    // and no jitter. Wavelength, direction and timing are identical -- all frozen
    // -- but the result is readable as a shape rather than as speckle.
    float w0F = 6.28318530718 / uPeriodP;
    float wF = 6.28318530718 * max(1.0, floor(w0F * uLoop / 6.28318530718 + 0.5)) / uLoop;
    float wLF = w0F * sqrt(max(uHarmL, 0.05));
    wLF = 6.28318530718 * max(1.0, floor(wLF * uLoop / 6.28318530718 + 0.5)) / uLoop;
    float aL = uAmpL * 0.9;
    // Two clean trains give crests that are perfectly parallel, equally spaced and
    // all the same length. Traced by eye, the reference reads as individually
    // distinct strokes: varying in length, curving, hooking, no two alike. That
    // variance has two sources and neither was in this field.
    //
    // BEND -- slow spatial phase, so crests curve instead of running straight.
    float bend = ((noise4(px, 540.0).r - 0.5) * 1.6
                + (noise4(px + vec2(211.0, 83.0), 210.0).g - 0.5) * 0.6) * uFormBend;
    // GROUPS -- the envelope waxes and wanes ALONG a crest, so it reads as a run
    // of separate strokes of different lengths rather than one continuous line.
    float formEnv = mix(1.0, clamp(groupEnv, 0.15, 1.9), uFormGroup);
    // A THIRD, finer train. Traced by eye the reference shows a hierarchy: a few
    // long lines at a glance and more of them, shorter, on closer inspection. Two
    // trains can only ever draw one scale of line.
    float mF3 = 1.90;
    float wF3 = w0F * sqrt(mF3);
    wF3 = 6.28318530718 * max(1.0, floor(wF3 * uLoop / 6.28318530718 + 0.5)) / uLoop;
    float a3 = uFormFine;
    float hForm = (cos(SP + bend - wF * uTime)
                 + aL * cos(SP * uHarmL + bend * 0.55 - wLF * uTime + 1.3)
                 + a3 * cos(SP * mF3 + bend * 1.7 - wF3 * uTime + 2.6)) / (1.0 + aL + a3);
    hForm *= formEnv;
    // same crest/trough asymmetry the height field carries
    hForm = hForm + uSteep * 0.45 * (hForm * hForm * sign(hForm) - hForm);
    outFlow = vec4(flow, clamp(hForm, -1.0, 1.0), whitecap);
    // NOT multiplied by dsharp: that factor is built from the full hn, chop
    // included, so it would smuggle the high frequencies straight back in.
    outSwell = vec4(acc.gSwell, hnSwell, bphase);
}
