#version 330
// Shading and compositing. The land plate is sampled untouched everywhere the
// water mask is zero, so anything outside the mask is bit-identical every frame.
in vec2 uv;
out vec4 fragColor;

#include "common.glsl"

uniform sampler2D texGeom, texFlow, texFoam, texSpray, texPlate, texClean, texSwell, texPath;

uniform vec3  cAbyss, cDeep, cMid, cShallow, cFoamThin, cFoamBody, cFoamDense, cSun;
uniform vec3  cSky;
uniform float uSlope;
uniform float uSpecGain, uShin, uSheen, uGlitter;
uniform float uCrestGain, uTroughGain, uTransGain, uSwash;
uniform float uOpenPaint;   // flat-paint floor for per-crest tone on the open sea
uniform float uFacetGain, uFacetScale;   // painted facet sparkle: strength, cell size (tuned px)
uniform float uEventStroke;              // how much a breaking event fattens and brightens its drawn arc
uniform float uGroupTone;                // broad swell-bank brightness riding the group envelope
uniform float uEventTeal;                // subsurface teal flash under breaking events
uniform float uBreakVis;                 // breaker resolvability at this camera; see wave.frag
uniform float uPlateInfluence, uPlateTint;
uniform float uFoamThrFresh, uFoamThrOld, uFoamSoft, uLaceScale, uFoamBaseErode, uLaceContrast;
uniform float uLaceRidge, uFilament;
uniform float uLaceAlong, uLaceAcross;
uniform float uShadowGain, uShadowStep;
uniform float uCrestLineW, uCrestLevel, uLaceLineW, uLaceLineGain, uFoamMass;
uniform float uCrestLineFloor, uLaceLineThr, uFoamSolid;
uniform float uPosterize, uBands, uBandSoft;
uniform float uBandEdge, uBandEdgeW;  // painted accent drawn on each tonal step
uniform float uPaintMix, uPaintBands, uPaintEdge, uPaintEdgeW;  // the paint pass
uniform float uFoamEdge;    // drawn rim around every foam shape
uniform float uCrestGroup;  // how far per-crest painting is gated by the group envelope
uniform float uSeabedMix, uSeabedDepth, uSeabedScale;  // the bottom, seen through the water
uniform float uSprayGain;
uniform float uExposure, uSat, uVigMix;
uniform float uAbyssMix;   // how far deep water reaches toward the abyss colour
uniform float uRegionTone, uRegionFoam;
uniform float uTroughDark, uCrestTeal;
uniform float uShadeSmooth, uShadeSmoothMix;  // band-limit the shading normal  // depth in the troughs, teal on the crests  // how far regional weather moves tone and foam
uniform float uOmegaS;      // secondary train angular frequency, loop-quantised
uniform float uWispLevel, uWispW, uWispGain, uWispSharp;
uniform float uMarkCell, uMarkLen, uMarkWid, uMarkDensity, uMarkWander, uMarkGain;  // thin filaments along the foam field's level sets
uniform float uFormBend;    // same crest curvature the wave pass uses
uniform float uCrossTrain;  // weight of the second stroke train
uniform float uDeepEnd, uShallowEnd;
uniform float uRippleGain;
uniform float uTealDepth;   // depth (px) over which the shallow teal wash fades out
uniform float uPreBreak, uFaceTeal, uLipGain;    // pre-break wave volume
uniform float uFoamDeep, uFoamDeepThr, uFoamVeil;  // offshore foam suppression
uniform float uStreakGain, uStreakScale, uStreakW, uStreakSpeed;  // surface streaks
uniform float uFaceLift, uFoamAer;
uniform float uChopCrest, uChopGlint, uChopW;   // fine wind-chop crest marks
uniform float uSkyMix, uFresnelP, uGlossGain, uGlossShin;
uniform float uChopShade;
uniform float uFineScale, uFineGain, uFineShade, uFineGloss, uFineSpeed;
uniform float uFoamErodeK, uHueVary;
uniform float uSubMix, uSubDepth, uSubGreen;
uniform float uCrestBand, uShedGain;
uniform float uViewTilt, uReliefLift;
uniform float uOpenRelief;
uniform float uDetailLam, uDetailSpread, uDetailSharp, uDetailSlope;
uniform float uDetailShade, uDetailTrough, uDetailSky, uDetailGloss;
uniform float uDetailWander;
uniform float uOpenCrest;
uniform float uFaceGrad, uRimGain, uCrossChop, uFoamAge;
uniform float uLicScale, uLicStep, uLicMix, uLicSteps, uLicTone, uLicNoise, uLicContrast, uLicSpeed;

const vec3 LUMA = vec3(0.299, 0.587, 0.114);

// ---------------------------------------------------------------------------
// Constant-width contour line through a scalar field.
//
// This is the difference between water and clouds. Rendering foam as a coverage
// field gives soft isotropic masses; the reference art draws it as thin
// curvilinear STROKES. Dividing by the screen-space gradient makes the stroke a
// fixed number of pixels wide wherever it runs, instead of fat where the field
// is flat and hairline where it is steep -- which is what makes it read as drawn
// rather than thresholded.

vec3 depthRamp(float d)
{
    vec3 c = mix(cShallow, cMid, sstep(0.0, uShallowEnd, d));
    c = mix(c, cDeep, sstep(uShallowEnd * 0.9, uDeepEnd, d));
    // The abyss blend was capped at 0.62, which put the ramp's floor at luma
    // 0.208 for the windy palette. The reference keeps 23.7% of its water BELOW
    // 0.200, so the base colour could not reach where a quarter of the plate's
    // water lives -- every dark pixel we had came from shading multipliers on a
    // too-light base, which is why the sea read flat and mid-toned. Measured:
    // our water matched the reference's MEAN luma exactly (0.3550 both) while
    // its std was 0.178 against 0.210, compressed at both ends.
    c = mix(c, cAbyss, sstep(uDeepEnd, uDeepEnd * 2.4, d) * uAbyssMix);
    return c;
}

// thin sinuous filigree: ridges of a smooth field, which is what the reference
// lace foam actually is -- not dots, not stamped cells
// Smooth multi-scale field used to ERODE aging foam. Eroding a sheet leaves a
// connected filigree; multiplying by a ridge function leaves dust.
// ---------------------------------------------------------------------------
// Line integral convolution: average a noise field ALONG the streamline through
// this pixel, marching in both directions and re-reading the flow at every step
// so the path curves with the current.
//
// This is the answer to the coherence measurement. A THRESHOLD of a field yields
// blobs however anisotropic that field is -- measured, taking the carve field
// from 6:1 to 20:1 moved orientation coherence by 0.000. An integral along a
// curve is aligned with that curve BY CONSTRUCTION: every output value is an
// average over a streamline, so the structure it produces is streaky rather than
// isotropic, which is the difference the eye has been reading as painted.
//
// The noise is sampled on the MATERIAL coordinate at each step, not on screen
// position, so the streaks are carried and deformed by the water instead of
// sliding over it.
// ---------------------------------------------------------------------------
// White noise from a hash, NOT from the tiled fbm texture. noiseAt() divides by
// its scale and samples a tileable texture, so asking it for 3 px features tiles
// that texture ~470 times across the frame and the hardware's mip selection
// collapses it to a constant. The line integral was therefore integrating a flat
// field, which is why a technique verified at 0.90 coherence in isolation moved
// the render by 0.001. Classic LIC is defined on white noise anyway.
float hash21(vec2 p)
{
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

// Value noise on a lattice, with a controllable feature size AND a spatial
// period. The period matters: loopScroll quantises its scroll so that a TILEABLE
// field wraps exactly once per loop, and a hash has no period at all, so the
// pattern at t=0 and t=T did not match and the loop seam blew out (ratio 2.86 and
// worse, against 1.0 for a perfect seam). Wrapping the lattice gives the hash the
// periodicity loopScroll is already assuming.
float whiteAt(vec2 p, float cell, float period)
{
    float c = max(cell, 0.75);
    float n = max(floor(period / c + 0.5), 2.0);
    vec2 q = p / c;
    vec2 i = mod(floor(q), n), f = fract(q);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(mod(i + vec2(1.0, 0.0), n));
    float cc = hash21(mod(i + vec2(0.0, 1.0), n)), d = hash21(mod(i + vec2(1.0, 1.0), n));
    return mix(mix(a, b, f.x), mix(cc, d, f.x), f.y);
}

float licField(vec2 px0, float scale, float stepPx, int steps)
{
    float acc = 0.0, wsum = 0.0;
    for (int s = 0; s < 2; ++s) {
        float sgn = (s == 0) ? 1.0 : -1.0;
        vec2 p = px0;
        for (int i = 0; i < steps; ++i) {
            vec2 uvp = clamp(p / uRes, vec2(0.002), vec2(0.998));
            vec2 fl = texture(texFlow, uvp).xy;
            // The noise MUST be a fixed function of position along the path. On a
            // first attempt it was sampled at the material coordinate, which
            // advects with the flow -- so along a streamline it changed at exactly
            // the rate that decorrelates the noise, and the integral averaged
            // uncorrelated values. That is the precise opposite of what a line
            // integral does, and it showed: a strongly "aligned" modulation moved
            // measured coherence by 0.001. Motion comes from scrolling the whole
            // field, not from advecting the sample point.
            float w = 1.0 - float(i) / float(steps);
            acc += whiteAt(p - loopScroll(uDirDeep, uLicSpeed, 96.0), scale, 96.0) * w;
            wsum += w;
            p += normalize(fl + vec2(1e-4)) * (stepPx * sgn);
        }
    }
    return acc / max(wsum, 1e-4);
}

float laceField(vec2 mat, vec2 fdir, out float fineTex)
{
    // Anisotropic lookup: compressed along the current, stretched across it, so
    // the filigree reads as flow-stretched streaks rather than isotropic blobs.
    //
    // Four octaves weighted toward the FINE end. Measured against the reference
    // library, the previous three-octave, coarse-weighted version produced foam
    // blobs roughly twice the reference median area with ~25% less perimeter per
    // unit area -- which is exactly what reads as airbrushed instead of painted.
    // Reference foam measures roughly 20:1 elongated: thin sinuous FILAMENTS,
    // not patches. Compressing the lookup coordinate along the current stretches
    // the features along it; the ratio uLaceAcross/uLaceAlong is the aspect the
    // filigree ends up with.
    vec2 perp = vec2(-fdir.y, fdir.x);
    vec2 m = vec2(dot(mat, fdir) * uLaceAlong, dot(mat, perp) * uLaceAcross);
    // The octave ladder is FLOORED. A fixed ratio ladder goes sub-pixel as soon
    // as the base scale is made fine: at uLaceScale 14 the fourth octave lands at
    // 1.2 px, which is pixel noise, not texture. Thresholding foam against it
    // produces isolated single-pixel specks -- static, which reads wrong beside
    // painted land -- and makes those pixels flip frame to frame, which is what
    // failed the foam-persistence check (0.5 s correlation 0.30 against 0.35).
    float o2 = max(uLaceScale * 0.50, 9.0);
    float o3 = max(uLaceScale * 0.28, 5.5);
    float o4 = max(uLaceScale * 0.16, 4.0);
    // From the FINE texture. On the 512^2 one these four land at 13x, 26x, 46x
    // and 80x minification, so the mipmap averages them to almost nothing before
    // the filigree is drawn -- which is why the water measured 0.49 of the
    // plate's energy at 4 px features while matching it at 128 px.
    float a = noiseFineAt(m, uLaceScale);
    float b = noiseFineAt(m * 1.03 + vec2(71.0, 19.0), o2);
    float c = noiseFineAt(m * 1.07 + vec2(143.0, 87.0), o3);
    float e = noiseFineAt(m * 1.11 + vec2(37.0, 211.0), o4);
    // Weighted toward the FINE octaves, then contrast-stretched. Averaging four
    // roughly-uniform noises collapses the variance (sigma ~0.095), so the
    // erosion modulation was dominated by the 24-54 px octaves -- which set the
    // hole size, and therefore the blob size. Ablation showed the foam field
    // alone, not the crest highlight, was producing the oversized blobs.
    // NEGATIVE RESULT, kept as a warning. Weighting these octaves toward the
    // fine end and contrast-stretching them raised measured edge complexity but
    // shredded the foam into hard stipple -- the "cellular-noise dots" failure
    // this project explicitly set out to avoid. perimeter/sqrt(area) rewards
    // stippling, so it is not a usable optimisation target. Coarse-weighted and
    // unstretched is what actually reads as whitewater.
    // Both recorded negative results above -- fine-weighted gives stipple,
    // coarse-weighted gives blobs -- are consequences of taking the filament's
    // PATH from a field that mixes scales. No weighting fixes that: the ridge of
    // a sum wanders wherever the small octaves push it. Measured on the crest
    // stroke, the same defect cost 2.18x the boundary-per-unit-stroke a clean
    // band of that width would have, against 1.46x for a single train.
    //
    // So separate them, exactly as the crest stroke now does. The PATH is the
    // ridge of ONE smooth octave, which is a long connected curve. The fine
    // octaves become fineTex and modulate the filament's strength ALONG its
    // length, where they cannot displace it.
    fineTex = clamp((b * 0.45 + c * 0.33 + e * 0.22 - 0.5) * uLaceContrast + 0.5, 0.0, 1.0);
    return clamp((a - 0.5) * uLaceContrast + 0.5, 0.0, 1.0);
}

void main()
{
    vec2 px = uv * uRes;
    vec4 M = texture(texM, uv);
    float water = M.x, shoreZ = M.y, sprayLand = M.z, vig = M.w;
    if (uFlatOcean > 0.5) { water = 1.0; sprayLand = 0.0; }
    vec4 P = texture(texP, uv);
    vec4 D = texture(texD, uv);
    float depth = (uFlatOcean > 0.5) ? 60.0 : max(P.w, 0.35);

    vec4 geom = texture(texGeom, uv);
    float hn = geom.x;                 // normalised surface height, -1..1
    // Large-scale weather from the wave pass. The height field already varies
    // regionally -- block sd of |hn| measures 0.120, matching the plate's luma
    // variation of 0.120 -- but none of it reached the picture, because tone is
    // driven by bathymetry and the foam threshold is the same everywhere. The
    // variation existed and was thrown away here.
    float regionE = texture(texPath, uv).w;
    vec2 gr = geom.yz;                 // macro gradient (swell + chop, no ripple)
    float breaking = geom.w;
    vec4 flow4 = texture(texFlow, uv);
    float hForm = flow4.z, whitecap = flow4.w;   // clean wave form, shading only

    vec2 dirP = normalize(D.xy + 1e-6);

    // ---- normals ----------------------------------------------------------
    // Three scales, deliberately separated. A specular lobe evaluated on the raw
    // gradient picks up every chop wavelet and turns the sea into hard stipple --
    // ablation showed that single term was responsible for nearly all of it. So
    // the specular reads a 5-tap smoothed (swell-scale) normal instead.
    vec3 Nm = normalize(vec3(-gr.x * uSlope, -gr.y * uSlope, 1.0));
    // Primary swell only, straight from the wave pass -- no smoothing kludge.
    vec4 SW = texture(texSwell, uv);
    vec2 grS = SW.xy;
    float hnS = SW.z;        // swell-only height, chop-free
    float bphase = SW.w;     // 0 offshore -> 1 at collapse
    // ---- band-limited shading normal ---------------------------------------
    // The mottle is the SHADING, not any drawn layer: rendered with slope 0 the
    // water is smooth, and it stays mottled with every style layer stripped and
    // with the chop family removed. Ns is built from the swell gradient, which
    // still carries enough fine structure that the diffuse term breaks into the
    // 4-8 px patches that read as blocky mottle at 1:1.
    //
    // The plate is smooth water crossed by thin bright filaments. So the broad
    // tone gets a band-limited normal, and the detail is DRAWN on top rather
    // than shaded in -- which is the one thing that has worked all session.
    vec2 sso = vec2(uShadeSmooth) / uRes;
    vec2 gsm = texture(texSwell, uv + vec2( sso.x, 0.0)).xy
             + texture(texSwell, uv + vec2(-sso.x, 0.0)).xy
             + texture(texSwell, uv + vec2(0.0,  sso.y)).xy
             + texture(texSwell, uv + vec2(0.0, -sso.y)).xy
             + texture(texSwell, uv + sso * 0.7).xy
             + texture(texSwell, uv - sso * 0.7).xy
             + texture(texSwell, uv + vec2(sso.x, -sso.y) * 0.7).xy
             + texture(texSwell, uv + vec2(-sso.x, sso.y) * 0.7).xy;
    grS = mix(grS, gsm * 0.125, uShadeSmoothMix);
    vec3 Ns = normalize(vec3(-grS.x * uSlope, -grS.y * uSlope, 1.0));

    vec2 rp = px + loopScroll(uDirDeep, 22.0, 118.0);
    vec2 e = vec2(1.25, 0.0);
    float r0 = noiseFineAt(rp, 118.0), r1 = noiseFineAt(rp * 1.0 + 57.0, 47.0);
    float rx = (noiseFineAt(rp + e.xy, 118.0) - noiseFineAt(rp - e.xy, 118.0)) * 0.7
             + (noiseFineAt(rp + e.xy * 0.6 + 57.0, 47.0) - noiseFineAt(rp - e.xy * 0.6 + 57.0, 47.0)) * 0.3;
    float ry = (noiseFineAt(rp + e.yx, 118.0) - noiseFineAt(rp - e.yx, 118.0)) * 0.7
             + (noiseFineAt(rp + e.yx * 0.6 + 57.0, 47.0) - noiseFineAt(rp - e.yx * 0.6 + 57.0, 47.0)) * 0.3;
    // Band-limited gradient for the SPECULAR normals. Isolation put the mottle
    // here and nowhere else: rendered with gloss, spec and sheen all zero the
    // water body is smooth, and it stays mottled with every drawn layer stripped,
    // with the chop family removed, and with each specular term zeroed on its own.
    // The cause is the lobe exponent -- gloss runs pow(dot(N,H), 114) against a
    // normal built from the full-frequency gradient, so any pixel-scale wobble in
    // that gradient becomes a hard on/off highlight. That is the 4-8 px blocky
    // mottle, and it is why sharpening amplified it and denoising removed our
    // only fine content along with it.
    vec2 gso = vec2(uShadeSmooth) / uRes;
    vec2 grSm = texture(texGeom, uv + vec2( gso.x, 0.0)).yz
              + texture(texGeom, uv + vec2(-gso.x, 0.0)).yz
              + texture(texGeom, uv + vec2(0.0,  gso.y)).yz
              + texture(texGeom, uv + vec2(0.0, -gso.y)).yz
              + texture(texGeom, uv + gso * 0.7).yz
              + texture(texGeom, uv - gso * 0.7).yz
              + texture(texGeom, uv + vec2(gso.x, -gso.y) * 0.7).yz
              + texture(texGeom, uv + vec2(-gso.x, gso.y) * 0.7).yz;
    vec2 grL = mix(gr, grSm * 0.125, uShadeSmoothMix);
    vec3 Nd = normalize(vec3(-(grL.x + rx * uRippleGain) * uSlope,
                             -(grL.y + ry * uRippleGain) * uSlope, 1.0));

    vec3 L = normalize(vec3(-0.62, -0.55, 0.56));     // sun, upper-left, measured
    // This is a 2.5D view, not a plan view: the camera looks at the water plane
    // obliquely, the way the land art is drawn. A straight-down view vector puts
    // every highlight on the wrong facets -- the half-vector is wrong, so the
    // gloss lands where a top-down camera would see it and the surface reads flat.
    float vt = radians(uViewTilt);
    vec3 V = normalize(vec3(0.0, -sin(vt), cos(vt)));
    vec3 Hv = normalize(L + V);
    // How much a wave crest lifts UP-SCREEN because it stands above the water
    // plane. Without it the surface has no vertical extent and the line work has
    // no perspective -- it reads as a pattern printed on a flat sheet.
    float liftPx = uReliefLift * sin(vt);

    // ---- base colour ------------------------------------------------------
    // Patch-to-patch HUE variety. Measured against the source plate, our water
    // patches differed in blue-minus-red by half as much as its do (SD 0.028
    // against 0.060) while luminance and saturation variety already matched:
    // every patch was the same blue, which is what makes the sea read as one
    // flat treatment applied everywhere.
    float hueN = noiseAt(px + loopScroll(uDirDeep, 4.0, 640.0), 640.0) * 0.62
               + noiseAt(px + loopScroll(uDirDeep, 3.0, 250.0), 250.0) * 0.38;
    float hv = clamp((hueN - 0.5) * uHueVary + 0.5, 0.0, 1.0);
    vec3 pal = depthRamp(depth) * mix(vec3(1.42, 0.92, 0.78), vec3(0.68, 1.06, 1.26), hv);
    vec3 plate = texture(texClean, uv).rgb;
    float plateL = dot(plate, LUMA);
    float palL = max(dot(pal, LUMA), 0.02);
    vec3 base = pal * mix(1.0, clamp(plateL / palL, 0.55, 1.7), uPlateInfluence * (1.0 - uBare));
    base = mix(base, plate, uPlateTint * (1.0 - uBare));

    float ndl = clamp(dot(Ns, L), -1.0, 1.0);
    float ndlDetail = clamp(dot(Nm, L), -1.0, 1.0);
    // From the BAND-LIMITED swell gradient, not the macro one. This is the same
    // correction the shore stages below already carry -- "multiplying every shape
    // term by a speckled facing put the speckle straight back into terms that had
    // just been given a clean field to read" -- and it was never applied to
    // `facing` itself, which every crest stroke is multiplied by.
    //
    // gr is geom.yz: swell PLUS chop. So facing swung between 0.1 and 1.0 at chop
    // frequency, and crestLine is `contourLine(hPath, ...) * (0.10 + 0.90 *
    // facing)`. hPath is one clean cosine and contourLine gives it a smooth band;
    // multiplying that band by a chop-frequency number shreds it into exactly the
    // granular speckle the stroke exists to replace. Raising uCrestGain 3x on a
    // clean base made more speckle, not more line, which is what a shredded
    // stroke does when you turn it up.
    //
    // Whether a crest faces the swell is a property of the SWELL. The chop riding
    // on it does not change which way the wave is going.
    float facing = clamp(-dot(normalize(grS + vec2(1e-5)), dirP), 0.0, 1.0);
    float shallowT = 1.0 - sstep(2.5, 26.0, depth);

    // ---- the open sea is PAINT ---------------------------------------------
    // The land is an illustration: discrete drawn objects. Per-crest tone over
    // the whole deep sea rules it into a fabric that no injection statistics
    // can fix -- a live floor test with eleven gain terms zeroed at once still
    // showed the full diagonal banding, because the painters below key the
    // BASE COLOUR on the wave phase everywhere. The owner's direction: the sea
    // must fit the land's style. So per-crest painting is gated: full strength
    // where something is HAPPENING -- a breaking or whitecapping event, the
    // surf zone -- and flattened toward group-scale pigment on the open sea.
    // uOpenPaint is the flat floor: 1 keeps the old field look everywhere,
    // 0 is pure flat paint between events.
    float eventness = clamp(breaking * 1.5 + whitecap * 1.2, 0.0, 1.0);
    float surfNear = 1.0 - sstep(18.0, 46.0, depth);
    float openPaint = mix(clamp(uOpenPaint, 0.0, 1.0), 1.0, max(eventness, surfNear));
    // ...and the painters are gated by the GROUP as well, which is what stops
    // the sea being one uniform corduroy. An envelope that only scales
    // amplitude still leaves every crest drawn, everywhere, at the same
    // spacing -- the owner drew those parallel bands on a screenshot. With the
    // envelope now irregular (see wave.frag), letting it gate the per-crest
    // painting means whole patches of sea go quiet and flat while others carry
    // their waves, which is the "two thirds of it happens in one third of the
    // groups" the statistics describe, applied to the DRAWING rather than to
    // the breaking.
    float bankG = clamp(texture(texPath, uv).z, 0.0, 1.9);
    openPaint *= mix(1.0, clamp(0.30 + 0.85 * bankG, 0.0, 1.35), uCrestGroup);
    // What replaces the per-crest banding: SWELL BANKS. The storm reference
    // the owner sent carries its mass in broad lit/shadow wave bodies, not in
    // foam or texture -- and the group envelope is already that shape, at
    // group scale, moving with the sea. A gentle brightness swell where the
    // envelope is high gives the flat paint large soft volumes to sit on.
    float bankEnv = clamp(texture(texPath, uv).z, 0.0, 1.9);
    base *= 1.0 + uGroupTone * (bankEnv - 1.0) * (1.0 - eventness) * (1.0 - uBare);

    // ---- THE SEABED, SEEN THROUGH THE WATER --------------------------------
    //
    // The one perceptual channel this water has never used: you read a liquid
    // by seeing INTO it. Everything until now has been opaque paint, which is
    // why it could be beautiful and still not read as water.
    //
    // The ocean draws its own bottom rather than making the surface
    // translucent, and that is deliberate: the terrain art paints NOTHING
    // below the waterline (which is what the black shoreline voids were), so
    // a transparent surface would reveal backdrop, not sand. Drawing the bed
    // here keeps one owner for everything at or below the waterline.
    //
    // Clarity falls exponentially with depth, which is what light actually
    // does in water (Beer-Lambert), and is why submerged detail should be SOFT
    // -- contrast is attenuated, so a sharp rock underwater reads as wrong. It
    // also means the bed only shows in the shallow fringe, which is exactly
    // where the eye goes: the coastline.
    if (uSeabedMix > 0.001 && uBare < 0.5) {
        float clarity = exp(-depth / max(uSeabedDepth, 1.0));
        vec2 bpx = px * 0.85 + vec2(19.0, 47.0);
        float rock = sstep(0.52, 0.78, noiseAt(bpx, uSeabedScale) * 0.65
                                     + noiseAt(bpx * 2.3, uSeabedScale * 0.38) * 0.35);
        float grain = 0.85 + 0.30 * noiseAt(bpx * 1.6, uSeabedScale * 0.22);
        // Sand is the warm, pale bed; rock the cooler dark one. Both are keyed
        // off the existing palette so the bed belongs to the same picture.
        vec3 sandC = mix(cShallow, cFoamThin, 0.42) * vec3(1.10, 1.04, 0.88);
        vec3 rockC = mix(cMid, cAbyss, 0.45) * vec3(1.02, 1.00, 0.96);
        vec3 bedC = mix(sandC, rockC, rock) * grain;
        // Water still colours what you see through it: the deeper the sight
        // line, the more the bed takes the water's own hue.
        bedC = mix(bedC, base, clamp(1.0 - clarity, 0.0, 1.0) * 0.55);
        base = mix(base, bedC, clamp(clarity * uSeabedMix, 0.0, 0.92) * water);
    }

    // ---- tonal structure: deep troughs, lifted crest faces -----------------
    // Troughs must read as BROAD dark areas, so they are driven by the
    // swell-only height with a deliberately wide response -- the whole lower
    // half of the wave darkens, not just its floor -- and they deepen as the
    // wave shoals, which is what makes an approaching set look like it is
    // standing up out of a hollow rather than sitting on a flat sheet.
    float troughS = sstep(0.20, -0.80, hForm);
    base = mix(base, cAbyss, clamp(troughS * uTroughGain * (0.80 + 0.45 * bphase), 0.0, 0.94) * openPaint);
    base = mix(base, mix(cMid, cShallow, 0.35 + 0.4 * shallowT),
               clamp(hnS, 0.0, 1.0) * uFaceLift * openPaint);
    // Diffuse shading reads the SWELL normal only. Isolation showed this single
    // term -- specifically its ndlDetail component on the full-frequency normal --
    // was what remained mottling the water after every other contribution was
    // switched off. Chop and the secondary train belong in the height field and
    // in the drawn strokes, not in a per-pixel lambert term.
    // Measured against the source plate, local contrast at wave scale sits at
    // 0.093 (mid water) and 0.060 (open sea); ours sat at 0.051 and 0.033 -- 45%
    // flat -- while the surf zone was within 8%. Everything that gives a wave
    // tonal range here (foam, breaking, the pre-break volume, the teal face) is
    // gated to the shore, so away from it the only structure left was this term
    // at +-17%: a gentle undulation with no range INSIDE each wave, which is what
    // reads as texture rather than as objects.
    //
    // Widened where it is missing -- full strength offshore, tapering out in the
    // surf zone, which already matches the plate.
    float openness = sstep(40.0, 190.0, depth);
    float dAmp = 0.34 * (1.0 + uOpenRelief * openness) * (0.30 + 0.70 * openPaint);
    base *= (1.0 - dAmp) + dAmp * (1.0 + ndl);

    // Every small wave has a lit side and a shadowed side. Reading the diffuse
    // from the swell normal alone leaves the surface smooth between crests, and
    // smooth is what reads as paint: the source plate carries lit/dark structure
    // at every scale down to a few pixels.
    //
    // This is the DIFFERENCE between the full-band and swell-only lambert, so it
    // contributes the chop's own shading and nothing else -- no double-counting
    // of the swell. It is also why this can be reinstated safely: the earlier
    // stipple came from a sharp SPECULAR lobe on the raw gradient, not from a
    // diffuse term, and a lambert has no lobe to alias.
    float ndlM = clamp(dot(Nm, L), -1.0, 1.0);
    base *= (1.0 + uChopShade * (ndlM - ndl) * openPaint * (1.0 - uBare));

    // ---- sky reflection ---------------------------------------------------
    // Most of the colour variance in real water is not the body colour at all:
    // it is how much sky each facet reflects. A near-plan view looks mostly
    // straight down, so the effect is small on flat water and rises sharply on
    // tilted crest faces -- which is exactly where the reference photographs go
    // pale and cool while the hollows stay deep.
    // pow(1 - Ns.z, p) is the wrong form for a near-plan view. Looking almost
    // straight down, Ns.z sits around 0.94 even on a well-tilted wave face, so
    // (1 - Ns.z) is ~0.06 and raising it to a power drives the term to nothing:
    // measured, this evaluated to 0.000048 on typical slopes, i.e. it had been
    // doing nothing at all. Taking the power of Ns.z instead keeps the same shape
    // -- flat water reflects little, tilted faces reflect a lot -- across the
    // range of slopes this geometry actually produces.
    float fres = 1.0 - pow(clamp(Ns.z, 0.0, 1.0), uFresnelP);
    base = mix(base, cSky, clamp(fres * uSkyMix, 0.0, 0.72)
               * (0.40 + 0.60 * openPaint) * (1.0 - uBare));

    // broad sky sheen on tilted faces
    float tilt = 1.0 - Ns.z;
    base += cSun * (uSheen * tilt * (0.30 + 0.70 * clamp(ndl, 0.0, 1.0)));

    // ---- specular ---------------------------------------------------------
    // one broad lobe from the macro surface (moves with the swell), plus sparse
    // glitter from the micro surface gated by a large slow patch field so it
    // clusters into sun-track patches instead of covering everything
    // A BROAD lobe spread over every swell face is a grey wash -- measured, it
    // was most of the offshore haze that had to be removed. A highlight is the
    // opposite: a tight lobe that concentrates into small bright glints riding
    // the facets. Same energy, completely different read, so the gloss term has
    // its own much higher exponent rather than sharing the diffuse one.
    float specBroad = pow(max(dot(Ns, Hv), 0.0), uShin);
    float gloss = pow(max(dot(Ns, Hv), 0.0), uGlossShin);
    float glintRaw = pow(max(dot(Nd, Hv), 0.0), uGlossShin * 2.2);
    float patchG = sstep(0.46, 0.86, noiseAt(px + loopScroll(uDirDeep, 12.0, 420.0), 420.0));
    base += cSun * (specBroad * uSpecGain + gloss * uGlossGain
                    + glintRaw * uGlitter * patchG);

    // ---- facet sparkle -----------------------------------------------------
    // The cove concept reads as WATER through crisp glinting facets on
    // saturated blue -- painted caustic cells, not photographic glitter. Now
    // that per-crest tone flattens to paint between events (openPaint), this
    // is the open water's base texture: the sparkle carries "water", the
    // drawn events carry "storm". The owner's brief, verbatim: it needs to
    // feel real, not be real. Two scales of the FINE noise (the big texture's
    // mipmap erases this band), thresholded tight so the cells keep edges,
    // counter-scrolled so the field shimmers instead of sliding, and the
    // threshold eases where the group envelope is high -- denser sparkle
    // where the sea is working, which is the "dynamic and variant" half of
    // the brief without simulating anything.
    // A facet is a CELL with an edge, not a speck: bright tips separated by
    // dark seams, the way the concept paints them. The seam is the ridge of
    // the same field that makes the tips, so the two always agree on where
    // the cells are.
    // Cell-sized detail must come from the fbm texture's FINER OCTAVES inside
    // a large tile. `scale` in these helpers is the period of the whole tile:
    // asking either texture for a 19 px tile compressed all of it into 19 px
    // and drew a perfect lattice across the sea -- twice, once per texture,
    // before this comment was earned.
    vec4 f4A = noise4(px + loopScroll(uDirDeep, 9.0, uFacetScale), uFacetScale);
    vec4 f4B = noise4(px * 1.7 + loopScroll(vec2(-uDirDeep.y, uDirDeep.x), 6.0,
                      uFacetScale) + vec2(137.0, 291.0), uFacetScale);
    float facetCell = f4A.b * 0.42 + f4A.a * 0.24 + f4B.a * 0.34;
    float gEnvF = clamp(texture(texPath, uv).z, 0.0, 1.9);
    float facThr = 0.64 - 0.10 * clamp(gEnvF - 1.0, 0.0, 1.0);
    float facetTip = sstep(facThr, facThr + 0.05, facetCell)
                   + 0.15 * sstep(facThr - 0.08, facThr - 0.03, facetCell);
    float facetVein = pow(clamp(1.0 - abs(facetCell * 2.0 - 1.0), 0.0, 1.0), 3.0);
    base = mix(base, cAbyss,
               clamp(facetVein * uFacetGain * 0.55, 0.0, 0.6) * water * (1.0 - uBare));
    base = mix(base, mix(cSky, cFoamThin, 0.55),
               clamp(facetTip * uFacetGain, 0.0, 0.85) * water * (1.0 - uBare));

    // ---- shallow water: transmission through the wave face ----------------
    float trans = facing * sstep(-0.05, 0.75, hn) * shallowT;
    base = mix(base, cShallow * 1.20, clamp(trans * uTransGain, 0.0, 0.9) * (1.0 - uBare));

    // Broad shallow-water teal. Driven by depth, but modulated by a large-scale
    // noise and by the local wave state -- a constant-width band traced along the
    // coastline reads as an outline drawn around the land, which is exactly the
    // failure mode the brief calls out.
    float tealVar = 0.35 + 1.05 * noiseAt(px + loopScroll(uDirDeep, 5.0, 260.0), 260.0);
    float tealBand = (1.0 - sstep(2.0, uTealDepth, depth)) * tealVar * (0.55 + 0.65 * clamp(hn * 0.5 + 0.5, 0.0, 1.0));
    base = mix(base, cShallow, clamp(tealBand * uSwash * 0.62, 0.0, 0.85) * water * (1.0 - uBare));
    // swash: the last couple of metres go pale turquoise whatever the wave does
    float swash = (1.0 - sstep(0.4, 7.0, depth)) * (0.45 + 0.85 * tealVar * 0.6);
    base = mix(base, cShallow * 1.34, clamp(swash * uSwash, 0.0, 0.9) * water * (1.0 - uBare));

    // ---- wave bodies -------------------------------------------------------
    // The references read as waves WITH foam on them; without a cast shadow the
    // render reads as foam ON water. A crest occludes the sun from the trough
    // behind it, so sample the height a short way toward the sun: if that point
    // stands higher than here, this pixel is in its shadow. That single term is
    // what turns a foam band into a wave with a body.
    // The march direction is the SUN's, so it must be the same sun the frame is
    // lit by. Spelling the offline sun's xy out again let the two disagree the
    // moment the shared world light moved, and a shadow that does not run with
    // the highlight is worse than no shadow: the wave gets a dark side and a lit
    // side that are not opposite, which reads as dirt rather than as form.
    vec2 sunXY = normalize(L.xy);
    float shadow = 0.0;
    for (int i = 1; i <= 3; ++i) {
        float off = float(i) * uShadowStep;
        float hnUp = texture(texGeom, uv - sunXY * (off / uRes)).x;
        shadow = max(shadow, clamp((hnUp - hn) * 1.4 - 0.10, 0.0, 1.0) * (1.0 - float(i - 1) * 0.28));
    }
    base = mix(base, cAbyss * 0.82, clamp(shadow * uShadowGain, 0.0, 0.90) * openPaint);

    // ---- pre-break wave volume ---------------------------------------------
    // A shoaling wave has a lifecycle, and painting foam straight onto a sine
    // surface skips all of it. Driven by the break phase from the wave pass the
    // four stages are drawn in order: the hollow ahead of the wave drops and
    // darkens, the shoreward face rises and goes translucent teal as light comes
    // THROUGH the thinning water, a lip sharpens along the crest with its own
    // shadow underneath, and only then does whitewater collapse over it -- the
    // foam block below paints last, so the collapse covers the lip exactly where
    // foam actually exists.
    // Facing derived from the CLEAN form field, not from the swell gradient. The
    // gradient carries the interference speckle, and multiplying every shape term
    // by a speckled facing put the speckle straight back into terms that had just
    // been given a clean field to read.
    vec2 aheadUV = uv + (dirP * 7.0) / uRes;
    float hAhead = texture(texFlow, aheadUV).z;
    float faceS = clamp((hForm - hAhead) * 2.6, 0.0, 1.0);   // surface falling shoreward
    vec2 nS = normalize(grS + vec2(1e-5));
    // A pre-break tell is a BREAKER-SCALE feature, so it fades with breaker
    // resolvability exactly like breaking itself. Without this, the shallow
    // shelf -- where break phase runs high on every crest by definition --
    // grew a lip, a rim, a teal face and a hollow on every crest at map
    // zooms: the capital-tier dash grid, found by stacked live ablation
    // after every other author was eliminated. These painters are the close-
    // zoom drama and they are wonderful there; uBreakVis is 1 there.
    float bpF = sstep(0.12, 0.78, bphase) * uBreakVis;

    // 1. the hollow in front of the wave: broad, and deeper the closer the wave
    //    is to breaking. This is the stage that gives the following crest
    //    something to stand up OUT of.
    float hollow = sstep(0.10, -0.72, hForm) * (0.25 + 0.75 * faceS) * bpF;
    base = mix(base, cAbyss * 0.70, clamp(hollow * uPreBreak, 0.0, 0.88) * (1.0 - uBare));

    // 1b. the body UNDER the surface, being drawn up into the wave.
    //     A height field shades only the skin. With nothing beneath it the
    //     surface reads as displaced fabric rather than as a volume with mass:
    //     in real water you see the darker, greener body flowing up into the
    //     face through the top layer. Sampled on a coordinate that LAGS the
    //     surface, so the two move at different rates -- the parallax between a
    //     fast skin and a slow body is what actually reads as depth.
    vec2 sq = px - dirP * (uSubDepth * (0.35 + 0.65 * clamp(hnS, 0.0, 1.0)))
            + loopScroll(dirP, uFineSpeed * 0.42, 240.0);
    float subN = noiseAt(sq, 165.0) * 0.62 + noiseAt(sq * 1.9 + vec2(61.0, 23.0), 68.0) * 0.38;
    float draw = sstep(-0.45, 0.70, hnS) * (0.25 + 0.75 * faceS);
    vec3 subCol = mix(cAbyss, cShallow, 0.22 + 0.42 * subN) * vec3(0.90, 1.0 + uSubGreen, 0.96);
    base = mix(base, subCol,
               clamp(draw * uSubMix * (0.30 + 0.70 * subN), 0.0, 0.78) * (1.0 - uBare));

    // 2. the face lifts and THINS, so light comes through it rather than off it.
    //    Squaring the ramp pushes the teal to the top of the face where the water
    //    is actually thin; a linear ramp washes the whole flank and reads as a
    //    tinted band rather than as translucency.
    float faceRamp = sstep(-0.15, 0.86, hForm);
    float thin = faceRamp * faceRamp * faceS * bpF * (0.40 + 0.60 * shallowT);
    base = mix(base, cShallow * 1.34, clamp(thin * uFaceTeal, 0.0, 0.88) * (1.0 - uBare));

    // A gradient ALONG the face, dark at its foot and saturated toward the lip.
    // The acceptance test is that with every white pixel removed the wave still
    // says it is about to break, and a flat-toned face cannot do that -- the
    // whitewater ends up carrying all the information.
    float alongFace = sstep(-0.55, 0.80, hForm) * faceS * bpF;
    base = mix(base, cAbyss * 0.74, clamp((1.0 - alongFace) * faceS * bpF * uFaceGrad, 0.0, 0.72) * (1.0 - uBare));
    base = mix(base, cShallow * 1.5, clamp(alongFace * alongFace * uFaceGrad * 0.8, 0.0, 0.70) * (1.0 - uBare));

    // Directional rim: the sunward shoulder of a standing wave catches a hard
    // bright edge before anything breaks. Narrows as the wave stands up.
    float rimW = max(uCrestLineW * mix(1.3, 0.45, bpF), 2.6);
    float rim = contourLine(hForm, 0.40, rimW) * clamp(dot(normalize(grS + vec2(1e-5)), -L.xy), 0.0, 1.0);
    base = mix(base, mix(cSky, cFoamThin, 0.5), clamp(rim * uRimGain * bpF, 0.0, 0.85) * (1.0 - uBare));

    // 3. the lip: a constant-width contour on the swell height that NARROWS as
    //    the wave stands up, because a lip about to throw is a hard bright edge
    //    and not a soft band. Below about 3 px a contour on this field is
    //    aliasing rather than drawing, so the width is floored. The dark stroke
    //    is a second contour one level down the same face -- geometrically the
    //    hollow directly under the lip -- and is drawn first so the bright edge
    //    sits on top of its own shadow. That pairing is what gives the crest
    //    thickness instead of leaving it a bright line lying on flat water.
    float lipW = max(mix(uCrestLineW * 1.60, uCrestLineW * 0.62, bpF), 3.0);
    // Drawn on EVERY wave, not only breaking ones. bpF is zero outside the surf
    // zone, so gating this pair on it left offshore waves with no crest line and
    // no shadow beneath -- only a smooth gradient. In the reference art every
    // wave carries a defined crest with a dark under-side, and that pairing is
    // what makes a wave read as a form rather than a bump in a field. It is also
    // the only kind of term here that places a mark along a curve: fields with
    // correct statistics still read as texture, strokes read as draughtsmanship.
    // ...and at map zooms the same stroke IS the dash-grid fabric: a bright
    // constant-width contour on every crest of three-pixel waves is hatching
    // by definition. The stroke is a crest-scale mark, so it fades with
    // breaker resolvability like every other crest-scale mark; the offline
    // plate and the close cameras keep it at full strength.
    float drawn = max(bpF, uOpenCrest * uBreakVis);
    float under = contourLine(hForm, 0.16, lipW * 1.70) * faceS * drawn;
    float lip = contourLine(hForm, 0.58, lipW) * faceS * drawn;
    base = mix(base, cAbyss * 0.58, clamp(under * uLipGain * 0.95, 0.0, 0.82) * (1.0 - uBare));
    base = mix(base, mix(cFoamThin, cFoamDense, 0.80), clamp(lip * uLipGain, 0.0, 0.96) * (1.0 - uBare));


    vec4 F = texture(texFoam, uv);

    // ---- fine surface relief ------------------------------------------------
    // The source plate's water is corrugated at roughly 8-30 px with a lit side
    // and a shadowed side on every wavelet, and that structure -- not any amount
    // of white marking -- is what makes it read as a surface rather than a
    // painted band. Modulating the existing spectrum's own shading does not
    // supply it, because the field has almost no energy at that scale.
    //
    // Deliberately a SHADING-ONLY layer: it never enters the height field, so it
    // cannot touch significant height, breaking, whitecapping or the crest
    // tracker, all of which are fixed. Sampled on the material coordinate so the
    // relief is carried and deformed by the flow instead of sliding over it.
    // NOT on the foam material coordinate. That coordinate is deliberately
    // hard-reset wherever whitewater forms -- new foam has no history to carry --
    // which is right for foam and wrong for a continuous shading layer: sampled
    // there, the relief jumps every time a wave breaks. Measured, it took the
    // one-frame high-frequency correlation from 0.896 down to 0.749, which is
    // detail being re-drawn rather than carried, i.e. boiling.
    //
    // A loop-exact scroll along the swell direction is temporally smooth by
    // construction. The streaks and the lace, which are the marks a viewer
    // actually reads as being carried, still ride the material coordinate.
    // Flow-aligned axes measured better than swell-aligned ones (one-frame
    // high-frequency correlation 0.81 against 0.76), so the rows follow the
    // local current. Note that the correlation metric is only a guard against
    // boiling here, not a target: it is maximised by a texture that does not
    // move at all, which is the worst possible result.
    vec2 mfd = normalize(flow4.xy + vec2(1e-4));
    vec2 mfp = vec2(-mfd.y, mfd.x);
    vec2 fpx = px + loopScroll(dirP, uFineSpeed, uFineScale * 8.0);
    vec2 mq = vec2(dot(fpx, mfd) * 0.52, dot(fpx, mfp) * 1.95);
    // a wider finite difference low-passes the gradient, which keeps the relief
    // at wavelet scale instead of letting it carry per-pixel variation
    vec2 ee = vec2(2.4, 0.0);
    float fs1 = uFineScale, fs2 = uFineScale * 0.40;
    // Fine texture: fs1 34 and fs2 13.6 are minified 15x and 38x on the 512^2
    // one, so this relief -- the dominant fine term in open water -- was being
    // averaged flat before it reached the normal.
    float fgx = (noiseFineAt(mq + ee.xy, fs1) - noiseFineAt(mq - ee.xy, fs1)) * 0.60
              + (noiseFineAt(mq * 1.7 + ee.xy + 19.0, fs2) - noiseFineAt(mq * 1.7 - ee.xy + 19.0, fs2)) * 0.40;
    float fgy = (noiseFineAt(mq + ee.yx, fs1) - noiseFineAt(mq - ee.yx, fs1)) * 0.60
              + (noiseFineAt(mq * 1.7 + ee.yx + 19.0, fs2) - noiseFineAt(mq * 1.7 - ee.yx + 19.0, fs2)) * 0.40;
    vec3 Nf = normalize(vec3(-fgx * uFineGain, -fgy * uFineGain, 1.0));
    // PATCHY, not uniform. Every layer in this renderer -- relief, chop crests,
    // streaks, foam -- had been applied evenly across the whole sea, and the
    // result is detail everywhere, which is what reads as static. The source
    // plate is mostly SMOOTH: large areas of near-flat blue with the detail
    // concentrated in relatively few places. The quiet areas are as much a part
    // of the look as the busy ones.
    float calm = sstep(0.30, 0.72, noiseAt(px + loopScroll(uDirDeep, 5.0, 560.0), 560.0));
    float relief = (0.18 + 0.82 * calm) * (0.60 + 0.40 * (1.0 - sstep(25.0, 95.0, depth)));
    float ndlF = clamp(dot(Nf, L), -1.0, 1.0);
    base *= (1.0 + uFineShade * relief * (ndlF - 0.56) * (1.0 - uBare));
    // and the gloss those facets throw: tight, so it is sparkle rather than sheen
    // BROADER than the swell gloss, not sharper. A pow(.,90) lobe evaluated on a
    // noise-derived normal lands its highlights on single pixels: measured, that
    // one term carried a third of all the isolated-speck energy in the water
    // (speck share 59.7% -> 52.3% with it disabled). The facets it is lighting
    // are small and numerous, so the lobe has to be wide enough that each one
    // gets a soft highlight instead of a hot dot.
    float fineSpec = pow(max(dot(Nf, Hv), 0.0), uGlossShin * 0.30);
    base += cSun * (fineSpec * uFineGloss * relief * (1.0 - uBare));

    // ---- small-wave shading relief ------------------------------------------
    // The height field is steepness-capped (MAX_STEEP) and RMS-normalised. Both
    // are correct for the physics -- they are what keeps breaking honest and the
    // Stage-1 gate passing -- and both are hard ceilings on how much small-scale
    // tonal structure the surface can carry. Measured, offshore local contrast at
    // wave scale sat 40% under the source plate, and neither a 6x rise in chop
    // amplitude (saturates at the cap) nor a +-85% diffuse response (long waves
    // have no gradient at that scale) could move it.
    //
    // So the small waves that carry that structure are evaluated HERE, for
    // SHADING ONLY. They never enter the height field, so they cannot touch
    // significant height, breaking, whitecapping, the loop, or the gate -- which
    // is exactly why this is allowed to ignore the cap and the normalisation.
    //
    // They are real travelling waves, not noise: each rides the dispersion
    // relation, is quantised to the loop, and is Gerstner-sharpened so its crests
    // are narrow and its troughs broad. That asymmetry is what makes a small wave
    // read as a wave rather than as a ripple in a texture.
    vec2 dgS = vec2(0.0);
    float dhS = 0.0, dNorm = 0.0;
    for (int i = 0; i < 4; ++i) {
        float fi = float(i);
        float lam = uDetailLam * pow(0.72, fi);   // never down into noise
        float kk = 6.28318530718 / max(lam, 3.0);
        float ang = radians((fi * 41.0 - 62.0) * uDetailSpread)
                  + (noiseAt(px + vec2(fi * 71.0, 29.0), 520.0) - 0.5) * uDetailWander;
        // Every component running with the swell makes the background read as
        // directional brush strokes. The last one crosses it.
        float cross = (i == 3) ? uCrossChop : 0.0;
        float aa = ang + cross;
        vec2 dd = vec2(dirP.x * cos(aa) - dirP.y * sin(aa),
                       dirP.x * sin(aa) + dirP.y * cos(aa));
        float w = sqrt(uG * kk);
        w = 6.28318530718 * max(1.0, floor(w * uLoop / 6.28318530718 + 0.5)) / uLoop;
        float ph = noiseAt(px * 0.35 + vec2(fi * 53.0, fi * 91.0), 300.0) * 6.28318530718;
        float th = kk * dot(px, dd) - w * uTime + ph;
        float a = pow(0.66, fi);
        float c = cos(th);
        // narrow crests, broad troughs
        float cs = c + uDetailSharp * (c * c * sign(c) - c);
        dhS += a * cs;
        dgS += -a * kk * sin(th) * (1.0 + uDetailSharp * (2.0 * abs(c) - 1.0)) * dd;
        dNorm += a;
    }
    dhS /= max(dNorm, 1e-4);
    // patchy, and stronger where the big waves are not already doing the work
    float dGate = (0.30 + 0.70 * calm) * (0.55 + 0.45 * sstep(40.0, 190.0, depth));
    vec3 Nw = normalize(vec3(-dgS.x * uDetailSlope, -dgS.y * uDetailSlope, 1.0));
    float ndlW = clamp(dot(Nw, L), -1.0, 1.0);
    base *= (1.0 + uDetailShade * dGate * (ndlW - 0.56));
    // the trough of a small wave shows the water body, its crest catches sky
    base = mix(base, cAbyss, clamp(-dhS, 0.0, 1.0) * uDetailTrough * dGate * (1.0 - uBare));
    base = mix(base, cSky, clamp(dhS, 0.0, 1.0) * uDetailSky * dGate * (1.0 - uBare));
    base += cSun * (pow(max(dot(Nw, Hv), 0.0), uGlossShin * 0.55) * uDetailGloss * dGate);

    // ---- fine chop crests ---------------------------------------------------
    // The concept boards carry dense FINE white chop right across the open sea:
    // many small marks, not mass. That is a different thing from foam and must
    // not be built out of it -- persistent foam at this density is exactly the
    // slab failure this render already had to have removed. These are drawn
    // marks with no state at all: they exist only where the full-band surface is
    // locally at a crest and they die with it, so nothing can accumulate.
    // Thresholding the chop height fills every local maximum, which at any real
    // magnification is a field of DOTS -- the cellular-noise failure this project
    // set out to avoid, and invisible at 1:1. A chop crest is a short line along
    // the crest, so it is drawn the same way every other mark here is: as a
    // constant-width contour.
    float chopH = hn - hnS * 0.92;      // what the swell alone does not account for
    float chopFace = clamp(-dot(normalize(gr + vec2(1e-5)), dirP), 0.0, 1.0);
    float chopMark = contourLine(chopH, uChopCrest, uChopW) * (0.25 + 0.75 * chopFace);
    // "Crests catch the light, troughs remain dark and glassy": chop rides the
    // upper half of the swell and is absent from the hollows. Ungated it covers
    // the sea evenly, which flattens exactly the tonal structure the troughs are
    // there to provide.
    chopMark *= sstep(-0.22, 0.58, hnS);
    // density varies in patches, and it steepens as the water shallows
    chopMark *= (0.12 + 0.88 * sstep(0.34, 0.72,
        noiseAt(px + loopScroll(uDirDeep, 11.0, 400.0), 400.0))) * (0.25 + 0.75 * calm);
    chopMark *= 0.55 + 0.45 * (1.0 - sstep(20.0, 80.0, depth));
    base = mix(base, mix(cFoamThin, cFoamBody, 0.30),
               clamp(chopMark * uChopGlint, 0.0, 0.80) * water * (1.0 - uBare));

    // ---- surface streaks ----------------------------------------------------
    // Real water is laced with fine wind-row and residual-foam streaks running
    // with the current, well outside any surf zone. Without them the open sea is
    // an unbroken tone, and an unbroken tone is what reads as paint rather than
    // as a moving mass of liquid. Drawn as constant-width LINES, not as a wash:
    // a wash at this opacity is the grey haze that had to be removed earlier.
    // Sampled on the MATERIAL coordinate, not on a screen-space scroll. Scrolled
    // in screen space the streaks slide across the water as a rigid layer, which
    // is the difference between liquid and an animated painting: the marks have
    // to be carried and deformed BY the flow, stretching where it accelerates and
    // shearing where it turns, not translated over the top of it.
    vec2 fdirW = normalize(flow4.xy + vec2(1e-4));
    vec2 perpW = vec2(-fdirW.y, fdirW.x);
    // The streak field is a LINE INTEGRAL along the flow, not anisotropic noise.
    // Ablation showed foam contributes almost nothing to orientation coherence
    // (0.377 -> 0.369 with foam disabled entirely) -- it is the WATER shading that
    // sets it, so that is where an aligned construction has to go. Contours of
    // stretched noise are still contours of a field; an integral along a
    // streamline is aligned with the streamline by construction.
    vec2 spx = F.ba;
    float st = licField(px, uLicNoise, uLicStep, int(uLicSteps));
    st = clamp((st - 0.5) * uLicContrast + 0.5, 0.0, 1.0);
    // ONE contour, at a high level, so the lines are sparse. Two contours at mid
    // levels put a stroke every few tens of pixels, and a dense enough set of
    // strokes stops being drawing and becomes the grey wash this render already
    // had to have removed once.
    float streak = contourLine(st, 0.68, uStreakW);
    // and they come in patches: a continuous lace over the entire sea is a haze
    float sPatch = sstep(0.42, 0.80, noiseAt(px + loopScroll(uDirDeep, 7.0, 470.0), 470.0))
                 * (0.20 + 0.80 * calm);
    // strongest on the shoreward face of a rising swell, absent in the hollows
    float streakA = streak * uStreakGain * sPatch
                  * sstep(-0.05, 0.85, hnS)
                  * (0.25 + 0.75 * facing);
    base = mix(base, mix(cFoamThin, cFoamBody, 0.45),
               clamp(streakA, 0.0, 0.60) * water * (1.0 - uBare));

    // Broad flow-aligned tonal streaking of the water surface. This is the term
    // that carries orientation coherence: light and dark drawn ALONG the current
    // rather than scattered across it.
    float licT = licField(px + vec2(53.0, 17.0), uLicNoise * 2.2, uLicStep * 1.5, int(uLicSteps));
    licT = clamp((licT - 0.5) * uLicContrast + 0.5, 0.0, 1.0);
    float licVary = 0.12 + 1.75 * sstep(0.28, 0.80,
        noiseAt(px + loopScroll(uDirDeep, 6.0, 430.0), 430.0) * 0.65
      + noiseAt(px + vec2(311.0, 47.0), 170.0) * 0.35);
    base *= 1.0 + uLicTone * (licT - 0.5) * 2.0 * licVary * (0.55 + 0.45 * calm);

    // ---- crest LINES -------------------------------------------------------
    // One constant-width stroke per wave, on the shoreward face, travelling with
    // the phase field. Replaces the soft thresholded band that read as vapour.
    // ONE bold stroke per wave, and only where the wave is actually doing
    // something -- breaking or whitecapping. A line on every crest everywhere is
    // hatching, not drawing.
    // Sampled on the lifted surface: seen obliquely, the foam line on a crest
    // sits above that crest's plan position by its own height.
    // Contoured from the PATH field, not the summed height. Contouring hn (or
    // hForm) shreds the stroke: both are sums of trains at comparable amplitude,
    // and a beat's level set breaks wherever its components cancel. Measured at
    // 2.18x the boundary-per-unit-stroke a clean band of this width would have,
    // against 1.46x for the single train -- that difference is the cauliflower
    // edge, and it is why the sea read as mottled rather than drawn.
    vec4 PA = texture(texPath, uv + vec2(0.0, liftPx * hn) / uRes);
    float hPath = PA.x, formEnv = PA.y, groupEnv = PA.z;
    // Width carries the wave's state; the path never does. An EVENT carries
    // far more of it: with whitecapping made rare (a handful of events on the
    // whole sea), the event's crest is where the drawn wave lives -- the
    // owner's brief wants crashes CONVEYED, and a 3 px hairline conveys
    // nothing. The stroke fattens and brightens where the sea is actually
    // breaking, and stays a whisper elsewhere.
    float eventW = clamp(whitecap * 1.3 + breaking, 0.0, 1.0);
    float strokeW = uCrestLineW * mix(0.62, 1.30, clamp(groupEnv, 0.0, 1.6) / 1.6)
                  * (1.0 + uEventStroke * eventW);
    float crestLine = contourLine(hPath, uCrestLevel, strokeW) * (0.10 + 0.90 * facing);
    // A SECOND clean train, drawn separately rather than summed into the first.
    // One train gives smooth unbroken strokes -- and perfectly regular ones,
    // which is what made the sea read as evenly-spaced corduroy once dirWander
    // was removed. Summing the trains before contouring is what shredded the
    // stroke in the first place (2.18x the boundary of a clean band). Drawing
    // each train's own contour and taking the union keeps every stroke smooth
    // while making their SPACING irregular, because two regular grids at
    // different angles and wavelengths interleave irregularly.
    float SSp = texture(texP, uv).y;
    float bend2 = (noiseAt(px + vec2(313.0, 91.0), 640.0) - 0.5) * 1.6 * uFormBend;
    float hPath2 = cos(SSp + bend2 - uOmegaS * uTime);
    float crestLine2 = contourLine(hPath2, uCrestLevel, strokeW * 0.78)
                     * (0.10 + 0.90 * facing) * uCrossTrain;
    crestLine = max(crestLine, crestLine2);
    // Waxing and waning ALONG the crest, so a run reads as separate strokes of
    // different lengths rather than one unbroken rule across the frame. This is
    // the variance the reference has, applied where it cannot bend the path.
    float alongVary = 0.30 + 0.70 * sstep(0.26, 0.82,
        formEnv * (0.55 + 0.75 * noiseAt(px + loopScroll(uDirDeep, 8.0, 300.0), 300.0)));
    // Subsurface teal flash: churned water goes SATURATED TEAL before it goes
    // white -- Sea of Thieves' peak-mask device, and every aerial reference
    // shows it as the aerated glow around events. It pre-announces the break
    // and sells translucency; without it foam sits ON the water instead of
    // coming OUT of it.
    float peakT = sstep(0.45, 0.95, hn) * eventW;
    base = mix(base, cShallow * 1.25, clamp(peakT * uEventTeal, 0.0, 0.70) * (1.0 - uBare));
    float lineGate = clamp(breaking * 1.35 + whitecap * 1.0 + uCrestLineFloor, 0.0, 1.0);
    float lineA = crestLine * lineGate * alongVary;
    // The event's arc draws toward SOLID white; the quiet sea's residual
    // strokes keep the old thin mix.
    base = mix(base, mix(cFoamThin, cFoamDense, 0.55 + 0.40 * eventW),
               clamp(lineA * uCrestGain * (1.0 + 0.8 * uEventStroke * eventW), 0.0, 0.92)
               * (1.0 - uBare));

    // a soft residual edge underneath, so the stroke sits on something
    // A soft residual edge under the stroke, but gated the same way the stroke
    // is: an unconditional pale band on every crest above 0.62 was lifting the
    // upper mid-tone of the whole sea (measured p75 luma 0.53 against 0.24 in
    // the reference) and it is not something the reference art draws.
    float crestEdge = sstep(0.66, 0.99, hn) * (0.18 + 0.82 * facing) * (0.20 + 0.80 * lineGate);
    base = mix(base, mix(cFoamThin, cFoamDense, 0.35), crestEdge * uCrestGain * 0.20 * (1.0 - uBare));

    // ---- PAINT PASS: the water body as flat shapes with drawn edges --------
    //
    // "Painted noise" done properly. The first attempt quantised the finished
    // tone, but that tone already carried per-pixel noise, so its level sets
    // were fractal and the bands came out speckle-edged -- noise wearing a
    // costume, which is what the owner saw. Paint quantises a SMOOTH field.
    //
    // So this reads nothing but smooth sources: hForm (one clean wave form,
    // refracted by the solve), the group envelope, and depth. Their level sets
    // are long continuous curves, which is what a brush actually leaves. The
    // steps become flat regions of palette colour, and the boundary between
    // two regions is DRAWN as a darker accent -- an illustration defines a
    // form with an edge, and that edge is the thing procedural water has never
    // had. The noise still decides where the sea is working; it no longer gets
    // to draw.
    if (uPaintMix > 0.001 && uBare < 0.5) {
        float toneP = 0.5 + 0.5 * clamp(hForm, -1.0, 1.0);
        toneP *= 0.62 + 0.38 * clamp(groupEnv, 0.0, 1.6);
        float shallowP = 1.0 - sstep(0.0, uDeepEnd * 1.5, depth);
        toneP = clamp(toneP * 0.70 + shallowP * 0.52, 0.0, 1.0);

        float bandsP = max(uPaintBands, 2.0);
        float xp = toneP * bandsP;
        float lvl = clamp(floor(xp) / (bandsP - 1.0), 0.0, 1.0);
        vec3 painted = mix(mix(cAbyss, cDeep, sstep(0.0, 0.42, lvl)),
                           mix(cMid, cShallow, sstep(0.55, 1.0, lvl)),
                           sstep(0.30, 0.72, lvl));
        float fp = fract(xp);
        float gp = length(vec2(dFdx(xp), dFdy(xp))) + 1e-6;
        float edgeP = 1.0 - smoothstep(0.0, uPaintEdgeW * gp, min(fp, 1.0 - fp));
        painted *= 1.0 - uPaintEdge * edgeP;
        base = mix(base, painted, clamp(uPaintMix, 0.0, 1.0) * water);
    }

    // ---- foam -------------------------------------------------------------
    float fresh = F.r, persist = F.g;
    vec2 fdir = normalize(flow4.xy + vec2(1e-4));
    float laceTex;
    float lace = laceField(F.ba, fdir, laceTex);
    // Reference foam blobs measure ~20:1 elongated (perimeter/sqrt(area) of
    // 8.3-9.6 against 3.54 for a disc): they are thin sinuous FILAMENTS, not
    // patches. Eroding with a smooth field just makes round holes and round
    // blobs, which is why finer perforation lowered edge complexity instead of
    // raising it. Eroding with the INVERSE RIDGE of the field leaves foam
    // concentrated along its mid-level contours -- long branching strands.
    float ridge = 1.0 - abs(lace * 2.0 - 1.0);
    ridge = pow(clamp(ridge, 0.0, 1.0), uLaceRidge);
    // Strength varies along the filament; its position never does.
    ridge *= 0.45 + 0.55 * laceTex;
    float carve = mix(lace, 1.0 - ridge, uFilament);
    // Blend the isotropic carve with a flow-aligned line integral. The integral
    // is what makes foam form continuous streaks instead of disconnected patches.
    if (uLicMix > 0.001) {
        float licv = licField(px, uLicNoise * 1.6, uLicStep, int(uLicSteps));
        licv = clamp((licv - 0.5) * uLicContrast + 0.5, 0.0, 1.0);
        carve = mix(carve, licv, uLicMix);
    }

    // Fresh whitewater is a solid sheet; as it ages the lace field eats into it,
    // which is how the reference foam actually breaks up.
    // "old" keyed on the fresh channel directly: while whitewater is still being
    // fed it stays a solid sheet, and it opens into lace as soon as feeding stops
    float old01 = 1.0 - sstep(0.05, 0.55, fresh);
    float cover = clamp(persist, 0.0, 1.4);
    // Baseline erosion applies at EVERY age, not just to aged foam. Real
    // whitewater is aerated and perforated from the moment it forms; gating
    // erosion on age left fresh foam as a solid sheet, which is why measured
    // blob area stayed ~2x the reference median with ~25% less perimeter.
    // MULTIPLICATIVE, not subtractive. A fixed subtraction cannot break dense
    // foam: at surf-zone coverage (~0.85) it needed carve > 1.31 to fall under
    // the threshold, and carve is capped at 1, so foamA was pinned at 1.0 across
    // the entire surf zone no matter what the carve field did. Measured, that
    // left our foam runs at 16.2 px against the source plate's 6.9 px, which is
    // precisely the difference between blobs of paint and fine detail.
    float erode = uFoamThrOld * (uFoamBaseErode + (1.0 - uFoamBaseErode) * old01);
    // The coverage threshold has to rise with depth. Offshore the persistent
    // field sits around 0.2 -- thin drifting residue -- and a flat threshold of
    // 0.24 promoted all of it to foam, which the solidify step below then made
    // hard-edged opaque white. That, not the simulation, is where the floating
    // white slabs came from: measured offshore, breaking p95 is 0.03 and
    // whitecap p95 is 0.00, yet the composite was painting solid sheets there.
    float surfZone = 1.0 - sstep(uFoamDeep, uFoamDeep * 2.4, depth);
    float thrF = uFoamThrFresh * mix(uFoamDeepThr, 1.0, surfZone);
    // Foam gathers where the sea is working and thins where it is not.
    thrF *= mix(1.0 + uRegionFoam, 1.0 - uRegionFoam, regionE);
    float carved = cover * (1.0 - uFoamErodeK * erode * clamp(carve * 1.15 - 0.10, 0.0, 1.0));
    float foamA = sstep(thrF, thrF + uFoamSoft, carved);
    // PAINT THE FOAM, not just the water. A soft threshold on a carved field
    // gives a DITHERED boundary -- the single biggest reason the sea still
    // read as noise after the water body was painted. Painted foam is a shape:
    // a few flat densities with an edge drawn round them. Quantise the alpha,
    // then draw its half-level contour as a cool rim, screen-constant width
    // like every other mark here.
    if (uPaintMix > 0.001 && uBare < 0.5) {
        float fq = floor(foamA * 3.0 + 0.5) / 3.0;
        foamA = mix(foamA, fq, clamp(uPaintMix, 0.0, 1.0));
        float fg = length(vec2(dFdx(foamA), dFdy(foamA))) + 1e-6;
        float fedge = 1.0 - smoothstep(0.0, uPaintEdgeW * fg, abs(foamA - 0.5));
        base = mix(base, cShallow * 0.80,
                   clamp(fedge * uFoamEdge, 0.0, 0.85) * water);
    }
    // Solidify. The erosion field varies more widely than the threshold, so the
    // crossing produced partial alpha across the WHOLE foam area -- a permanent
    // half-transparent blend between white and water, which is what read as
    // cloud. Reference foam is opaque white with a shaped, crisp boundary: keep
    // the shape the erosion carves, but make the interior solid.
    // Solidity is graded, not binary. Whitewater still being fed in the surf
    // zone is opaque; ageing residue is a veil you can see the water through.
    // A single hard step here made every surviving pixel paper-white, which is
    // what turned soft 0.2-coverage fields into cut-out slabs.
    // Re-concentrate foam onto the crest it came from. In real water the foam is
    // a thin bright connected line riding the top of each wave, with lacy trails
    // shed behind it and clean water between; a coverage field that has been
    // advected and diffused is a blob by construction, and rendering it directly
    // gives a cloud of dots spread evenly over the whole wave. That single
    // difference is most of what separates this from a photograph.
    //
    // Right at the shore foam genuinely IS a sheet, so the banding fades out in
    // the swash zone rather than carving the run-up into stripes.
    float crestBand = sstep(0.06, 0.68, hn) * (0.28 + 0.72 * facing);
    float shed = sstep(0.55, -0.20, hn) * uShedGain;      // lace trailing behind
    float sheetZone = 1.0 - sstep(4.0, 17.0, depth);
    float band = clamp(crestBand + shed, 0.0, 1.0);
    foamA *= mix(mix(1.0, band, uCrestBand), 1.0, sheetZone);

    float solid = clamp(sstep(0.08, 0.50, fresh) * 0.70 + surfZone * 0.42, 0.0, 1.0);
    foamA = clamp(sstep(uFoamSolid, 1.0 - uFoamSolid, foamA), 0.0, 1.0)
          * mix(uFoamVeil, 1.0, solid);

    // aerated water directly under foam goes pale turquoise
    foamA *= (1.0 - uBare);
    base = mix(base, cShallow * 1.28, foamA * 0.30 * (0.35 + 0.65 * shallowT));

    // Reaches the dense colour sooner: gated at 0.80 the foam almost never got
    // there, so its median luminance sat 0.10 below the plate's.
    // Three stages, deliberately distinct so successive impacts read separately:
    // fresh impact foam is bright white, turbulent foam is blue-white, and old
    // backwash is thinner and darker. Blended together they read as one
    // undifferentiated mass and every impact looks like the last one.
    vec3 foamCol = mix(cFoamThin, cFoamDense, sstep(0.06, 0.62, fresh));
    float turb = sstep(0.55, 0.12, fresh) * sstep(0.10, 0.45, persist);
    foamCol = mix(foamCol, mix(cFoamBody, cShallow * 1.25, 0.35 * uFoamAge), turb * uFoamAge);
    foamCol = mix(foamCol, cFoamBody * (1.0 - 0.30 * uFoamAge), old01 * 0.50);
    foamCol *= (0.90 + 0.20 * clamp(ndl, 0.0, 1.0));
    // Aeration varies the foam, it does not dim it. Measured against the source
    // plate, its foam sits at luma 0.851 median and 0.979 at p95 -- genuinely
    // near-white and opaque. Multiplying alpha by aeration everywhere took ours
    // to 0.756 / 0.811: a grey veil that never gets bright, which is what makes
    // the whole image read flat however saturated the water underneath is.
    //
    // So the dense core stays opaque and the aeration acts where foam is
    // genuinely thin: at the boundary, and where the carve field has eaten into
    // it. Thin foam also takes on the water colour rather than just going dim,
    // which is what aerated water actually looks like.
    float thinF = (1.0 - sstep(thrF * 0.7, thrF * 2.4, cover));
    float aer = 1.0 - uFoamAer * (1.0 - carve) * thinF;
    foamCol = mix(foamCol, mix(foamCol, base, 0.55), uFoamAer * thinF);
    base = mix(base, foamCol, foamA * water * uFoamMass * aer);

    // ---- foam WISPS ---------------------------------------------------------
    // Thin bright lines along the foam field's own level sets. Thresholding gives
    // soft masses; the reference's open water is smooth blue crossed by hair-fine
    // bright filaments -- maximum contrast for minimum area, and the thing the eye
    // reads as water rather than cloth. Measured, our fine detail is nearly
    // per-pixel noise (neighbour correlation 0.193 against the plate's 0.583)
    // while the foam FIELD is smooth (0.657): the structure exists in the
    // simulation and was being thrown away by thresholding it into blobs.
    // Same contour trick that fixed the crest stroke, on a field that advects,
    // so the line follows the flow and curves with it instead of running straight.
    // RIDGE, not level set. contourLine draws where a field crosses a level, so a
    // blob returns a closed ring with a dark middle -- which is exactly why the
    // first version read as outlines and soap suds rather than strokes.
    // Subtracting a blurred copy of the same field leaves its SPINE positive, so
    // the stroke runs down the middle of each wisp and is solid.
    vec2 wo = vec2(uWispW) / uRes;
    float cb = texture(texFoam, uv + vec2( wo.x, 0.0)).g
             + texture(texFoam, uv + vec2(-wo.x, 0.0)).g
             + texture(texFoam, uv + vec2(0.0,  wo.y)).g
             + texture(texFoam, uv + vec2(0.0, -wo.y)).g
             + texture(texFoam, uv + vec2( wo.x * 0.7,  wo.y * 0.7)).g
             + texture(texFoam, uv + vec2(-wo.x * 0.7,  wo.y * 0.7)).g
             + texture(texFoam, uv + vec2( wo.x * 0.7, -wo.y * 0.7)).g
             + texture(texFoam, uv + vec2(-wo.x * 0.7, -wo.y * 0.7)).g;
    cb *= 0.125;
    float wisp = clamp((cover - cb) * uWispSharp, 0.0, 1.0);
    wisp *= sstep(thrF * 0.10, thrF * 0.60, cover) * (1.0 - foamA * 0.55);
    base = mix(base, mix(cFoamBody, cFoamDense, 0.55),
               clamp(wisp * uWispGain, 0.0, 1.0) * water * (1.0 - uBare));

    // ---- foam MARKS ---------------------------------------------------------
    // Stamped shapes rather than another thresholded field. Placed in the foam's
    // material coordinates so they advect with the water, oriented along the
    // local flow, and gated by how much foam is actually there -- dense in the
    // surf, sparse flecks offshore, absent in clear water.
    float markGate = sstep(thrF * 0.08, thrF * 0.75, cover);
    float marksF = markField(F.ba, fdir, uMarkCell, uMarkLen, uMarkWid,
                             uMarkDensity, uMarkWander, 11.0);
    float marksC = markField(F.ba * 1.9 + vec2(37.0, 91.0), fdir, uMarkCell * 0.55,
                             uMarkLen * 0.5, uMarkWid * 0.72,
                             uMarkDensity * 0.85, uMarkWander * 1.5, 61.0);
    float marks = max(marksF, marksC * 0.8) * markGate * (1.0 - foamA * 0.45);
    base = mix(base, mix(cFoamBody, cFoamDense, 0.7),
               clamp(marks * uMarkGain, 0.0, 1.0) * water * (1.0 - uBare));

    // ---- lace LINES --------------------------------------------------------
    // The tangled net of foam near the shore is drawn, not filled: constant-width
    // strokes along the contours of the advected lace field, so they ride with the
    // current and stretch with it. Three levels give the branching look.
    float lc = max(contourLine(lace, 0.44, uLaceLineW),
                   contourLine(lace, 0.63, uLaceLineW * 0.75) * 0.80);
    float laceA = lc * sstep(uLaceLineThr, uLaceLineThr + 0.28, cover) * (0.35 + 0.65 * old01);
    base = mix(base, mix(cFoamBody, cFoamDense, 0.55), clamp(laceA * uLaceLineGain, 0.0, 1.0) * water * (1.0 - uBare));

    // ---- stylise: quantise the water tone ----------------------------------
    // Painted water reads as flat areas plus marks. Continuous shading over every
    // pixel is what photographs look like -- and, when it is also slightly noisy,
    // what clouds look like. Quantising luminance into a handful of bands (hue
    // preserved, luminance stepped) restores the flat regions the strokes sit on.
    if (uPosterize > 0.001 && uBare < 0.5) {
        float L = max(dot(base, LUMA), 1e-4);
        float bands = max(uBands, 2.0);
        // soft quantisation: snap toward band centres but keep a little ramp so
        // large smooth gradients do not develop hard contour steps
        float x = L * bands;
        float f = fract(x);
        float snapped = (floor(x) + smoothstep(0.5 - uBandSoft, 0.5 + uBandSoft, f)) / bands;
        base *= mix(1.0, snapped / L, uPosterize);

        // PAINTED NOISE. The owner's synthesis, and the answer to a measured
        // problem: procedural water cannot be tuned into painted art, because
        // noise and paint differ in KIND -- measured against the land art in
        // the same frame, the sea carried 54% more pixel-scale energy, less
        // form-scale structure, and less coherent edges. So keep the noise for
        // WHERE things are, and change what is DRAWN: quantise the tone into a
        // few flat steps (above) and then draw the boundary between them.
        //
        // That accent is the whole trick. An illustration defines a form with
        // an edge; a gradient defines nothing. The band boundary is a level set
        // of a smooth field, so it runs as a long coherent curve -- which is
        // exactly the statistic the land art has and the sea lacked -- and it
        // arrives at FORM scale rather than pixel scale, because the bands are
        // few. Width is screen-constant via the derivative, like every other
        // mark in this file.
        float d = abs(f - 0.5);
        float gw = length(vec2(dFdx(x), dFdy(x))) + 1e-6;
        float edge = 1.0 - smoothstep(0.0, uBandEdgeW * gw, d);
        base *= 1.0 - uBandEdge * edge * water * (1.0 - uBare);
    }

    // ---- assemble ---------------------------------------------------------
    // Calm stretches sit darker and glassier; worked stretches are paler from
    // aeration and scattered sky. One field, so they agree with the foam.
    base *= mix(1.0 - uRegionTone, 1.0 + uRegionTone, regionE);

    // ---- colour with height -------------------------------------------------
    // The plate couples brightness to TEALNESS at +0.440; we were at +0.323, and
    // its darkest water sits at rgb (0.055,0.154,0.232) against our
    // (0.071,0.178,0.267) -- about 25% lighter in every channel. So: troughs go
    // deeper and crests go teal, both keyed to the wave height that already
    // exists rather than to another noise field.
    float hUp = clamp(hn * 0.5 + 0.5, 0.0, 1.0);
    base *= mix(1.0 - uTroughDark, 1.0, sstep(0.06, 0.62, hUp));
    base += vec3(-0.55, 0.62, 0.30) * (uCrestTeal * sstep(0.42, 0.96, hUp));
    base = max(base, vec3(0.0));
    vec3 wcol = base * mix(1.0, vig, uVigMix * (1.0 - uBare));
    wcol *= uExposure;
    float wl = dot(wcol, LUMA);
    wcol = mix(vec3(wl), wcol, uSat);

    vec3 plateCol = texture(texPlate, uv).rgb;
    vec3 col = mix(plateCol, wcol, water);

    // ---- spray, the only thing allowed onto land --------------------------
    vec4 S = texture(texSpray, uv);
    float sd = S.r, sage = S.g;
    float sn = noiseAt(S.ba, 34.0) * 0.55 + noiseAt(S.ba * 1.09 + 41.0, 15.0) * 0.45;
    float sA = sd * sstep(0.28, 0.88, sn * 0.70 + 0.36) * (1.0 - 0.55 * sage);
    sA = clamp(sA * uSprayGain, 0.0, 1.0) * (1.0 - uBare);
    float sAllow = clamp(water + sprayLand, 0.0, 1.0);
    vec3 sprayCol = mix(cFoamDense, cFoamBody, sage * 0.6) * (0.92 + 0.18 * max(ndl, 0.0));
    col = mix(col, sprayCol * mix(1.0, vig, uVigMix), sA * sAllow);

    // Sub-LSB dither breaks 8-bit contour banding in the smooth depth ramp, but
    // it must never touch the plate: gate it on actual water/spray coverage so
    // land stays bit-identical frame to frame.
    float fx = clamp(max(water, sA * sAllow), 0.0, 1.0);
    float dth = (noiseAt(px * 7.3 + loopScroll(vec2(1.0, 0.0), 3.0, 11.0), 11.0) - 0.5) * (1.4 / 255.0) * step(0.0005, fx);
    fragColor = vec4(clamp(col + dth, 0.0, 1.0), 1.0);
}
