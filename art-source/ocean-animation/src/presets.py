"""Art-directed configuration for the three ocean states.

Wavelengths follow the measured references: the source library's organised swell
sits at ~113 px with a long set component near 230 px. Deep-water wavelength is
L0 = G*T^2/(2*pi) with G = 130 px/s^2, so T is chosen to land L0 where the
reference says it should be.

Palettes come from diagnostics/palette_anchors.json.
"""


def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


COMMON = dict(
    slope=1.90, shininess=13.0, plateInfluence=0.06, plateTint=0.03,
    foamSoft=0.130, laceScale=40.0, laceGain=1.0, foamBaseErode=0.62, laceContrast=1.20, laceRidge=1.6, filament=0.46,
    saturation=0.95,
    # Pre-break wave volume: hollow -> rising translucent face -> sharpening
    # lip -> collapse. Without these the wave has no body before it breaks and
    # the render reads as foam ON water instead of waves WITH foam on them.
    preBreak=0.55, faceTeal=0.42, lipGain=0.75,
    # Offshore foam suppression. foamDeep is the depth (px) at which the surf
    # zone ends; beyond it the coverage threshold is multiplied by foamDeepThr
    # and whatever still survives is rendered at foamVeil opacity instead of
    # opaque white.
    foamDeep=16.0, foamDeepThr=1.4, foamVeil=0.30, foamDeepFade=0.35,
    foamRelax=4.5, foamDiffuse=1.05, foamBlend=0.12, vigMix=0.42,
    laceAlong=0.26, laceAcross=2.10,
    # Fine flow-aligned streak lines across the whole surface, and the aeration
    # that keeps whitewater from reading as a flat fill.
    streakScale=210.0, streakW=1.9, streakSpeed=13.0, foamAer=0.16,
    chopCrest=0.10, chopGlint=0.70, chopW=3.4,
    # Sky reflection and gloss. The gloss lobe is deliberately far tighter than
    # the diffuse one: broad is haze, tight is a highlight.
    skyMix=0.24, fresnelP=13.0, glossGain=0.55, glossShin=52.0,
    chopShade=0.55,
    # Fine surface relief: shading only, never in the height field.
    fineScale=34.0, fineGain=2.3, fineShade=0.18, fineGloss=0.10, fineSpeed=17.0,
    foamErodeK=5.0, hueVary=2.0,
    # The body of water under the surface, drawn up into the wave face.
    subMix=0.52, subDepth=26.0, subGreen=0.11,
    # How hard foam is re-concentrated onto the crest line, and how much trails
    # behind it. crestBand 0 leaves the raw simulated blob.
    crestBand=0.80, shedGain=0.42,
    # The plate is a 2.5D oblique view, not a plan view. viewTilt is the camera's
    # tilt from vertical in degrees; reliefLift is how far a full-height crest
    # rides up-screen because it stands above the water plane.
    viewTilt=34.0, reliefLift=16.0,
    # Extra wave-scale tonal range in open water, where the shore-gated terms
    # do not reach. Targets the plate's own local contrast, not taste.
    openRelief=3.0,
    # Small waves evaluated for SHADING ONLY -- outside the height field, so
    # outside the steepness cap and the RMS normalisation that bound it.
    detailLam=96.0, detailSpread=0.30, detailSharp=0.55, detailSlope=0.95,
    detailShade=0.55, detailTrough=0.34, detailSky=0.20, detailGloss=0.28,
    openCrest=0.95,
    # Pre-break face volume, crest rim, cross-directional chop, foam ageing.
    faceGrad=1.30, rimGain=0.70, crossChop=1.15, foamAge=1.0,
    # Flow-aligned line integral for the foam shape. licMix 0 falls back to the
    # old thresholded field.
    licScale=52.0, licStep=1.7, licMix=0.85, licSteps=28, licTone=0.52, licNoise=3.0, licContrast=9.0, licSpeed=13.0,
    detailWander=0.30,

    rippleGain=0.11, glitter=0.018, shadowStep=7.0,
    crestLineW=3.8, crestLevel=0.55, laceLineW=3.6, laceLineGain=1.70, foamMass=0.96,
    crestLineFloor=0.30, laceLineThr=0.24, foamSolid=0.07,
    # Weight of the second, separately-drawn stroke train. See composite.frag.
    crossTrain=0.62,
    # Hair-fine filaments along the foam field's level sets. See composite.frag.
    wispLevel=0.55, wispW=3.0, wispGain=1.30, wispSharp=7.0,
    # NEGATIVE RESULT, kept reproducible behind markGain 0. Stamped capsule marks
    # with real edges DO close the spectral gap (fine-band energy 0.45 -> 0.89 of
    # the plate) but read wrong at every setting: dense and small gives scratchy
    # hatching and collapses neighbour coherence to 0.03, sparse and large reads
    # as debris floating on the surface. The plate's fine foam is a CONNECTED
    # BRANCHING network of variable width, and a population of independent stamps
    # cannot make one however it is tuned. The ridge of a continuous advected
    # field (the wisps) is the shape that can.
    markCell=7.0, markLen=4.2, markWid=1.1, markDensity=0.55, markWander=0.55,
    markGain=0.0,
    posterize=0.07, bands=22.0, bandSoft=0.42,
    # How far deep water reaches toward the abyss colour. See composite.frag.
    abyssMix=0.95,
    # Primary-family harmonics. Chosen by the Stage-1 crest tracker, not by eye:
    # satellites must be far apart in k (short beat) and weak, or the crest of the
    # sum hops between components and stops being followable.
    harmM=(1.0, 1.78, 3.05), harmA=(1.0, 0.30, 0.12),
    # Long swell, as a sub-harmonic of the primary train. harmL 0.42 puts it
    # at about 2.4x the primary wavelength, squarely in the 200-600 px band
    # the source plate has (19.2% of its energy) and this renderer had 3.4%.
    ampL=1.55, harmL=0.32,
    # Slow spatial wander of wave direction, in degrees: the effect several
    # separate wave origins would have, without several phase solves.
    # Enough to break the parallel-crest regularity, not enough to destroy the
    # wave direction: at 16 degrees with wide spread the field lost its crests
    # entirely and became mottling.
    # Both zero, and both measured. Spatial phase perturbation applied across
    # many components decorrelates them, and the sum of decorrelated trains is
    # interference: dirWander 9 deg put 62% of the height field's variance below
    # 8 px against 31% at zero, and the additive dirBend replacement was no
    # better (50% at 2.4, 68% at 4.0). The crest curvature that survives is
    # refraction, which the solved phase field already carries. See wave.frag.
    dirWander=0.0, dirBend=0.0,
    # Large-scale weather. Drives amplitude, slope, breaking, foam and tone from
    # one field so regions are coherently calm or rough. See wave.frag.
    regionDepth=0.45, regionContrast=1.9, regionTone=0.16, regionFoam=0.55,
    # Troughs go deeper, crests go teal. See composite.frag.
    troughDark=0.30, crestTeal=0.11,
    # Variance in the DRAWN wave form: bend makes crests curve, group makes them
    # wax and wane along their length so they read as separate strokes.
    formBend=0.70, formGroup=0.85, formFine=0.42,
    sprayRise=26.0, sprayFall=16.0,
    # Fraction of the shoreward Stokes drift surviving in deep water. See wave.frag.
    stokesDeep=0.18,
)

PRESETS = {}

# --------------------------------------------------------------- calm swell
PRESETS['calm_swell'] = dict(
    COMMON,
    title='Calm swell',
    duration=13.5, loop=13.5, preroll=9.0,
    families={'primary': ((0.530, 0.848), 2.69),      # L0 ~ 150 px
              'secondary': ((0.766, 0.643), 1.92),    # L0 ~  76 px
              'chop': ((0.342, 0.940), 1.12)},        # L0 ~  26 px
    ampP=2.30, ampS=1.00, ampC=0.70, chopGain=0.45,
    harmM=(1.0, 1.88, 3.25), harmA=(1.0, 0.24, 0.09),
    spread=19.0, groupDepth=0.58, groupScale=0.399, groupAcross=1.5,
    steep=0.54, setMix=0.50, setCycles=2.0, jitter=0.62,
    deepEnd=15.0, shallowEnd=4.0, tealDepth=17.0,
    breakGamma=0.80, whitecapSteep=0.160,
    preBreak=0.85, faceTeal=0.70, lipGain=0.64, foamErodeK=2.2,
    streakGain=0.13, faceLift=0.30, chopGlint=0.13, licTone=0.0, licMix=0.0,
    foamDeep=12.0, foamDeepThr=1.1, foamVeil=0.40,
    stokes=1.5, backwash=0.55,
    tauFresh=1.05, tauPersist=6.0,
    injBreak=15.3, injWhitecap=1.20, injShore=5.3,
    sprayLife=0.85, spraySpread=30.0, sprayInject=0.16, sprayGate=0.74, sprayGain=0.65,
    specGain=0.15, sheen=0.030, crestGain=0.86, shadowGain=0.62, troughGain=0.74, transGain=0.42, swash=0.26,
    foamThrFresh=0.180, foamThrOld=0.61, exposure=0.97,
    palette=dict(abyss=hx('#0c2f44'), deep=hx('#16537e'), mid=hx('#27719f'),
                 shallow=hx('#2b7d90'), sky=hx('#7fb4cf'), foamThin=hx('#bccdd6'), foamBody=hx('#dfe9ed'),
                 foamDense=hx('#f2f7f8'), sun=hx('#fff2d8')),
)

# -------------------------------------------------------- windy rolling surf
PRESETS['windy_rolling_surf'] = dict(
    COMMON,
    title='Windy rolling surf',
    duration=15.0, loop=15.0, preroll=10.0,
    families={'primary': ((0.469, 0.883), 2.36),      # L0 ~ 115 px
              'secondary': ((0.788, 0.616), 1.78),    # L0 ~  66 px
              'chop': ((0.259, 0.966), 1.04)},        # L0 ~  22 px
    ampP=3.20, ampS=2.00, ampC=1.50, chopGain=0.55,
    harmM=(1.0, 1.78, 3.05), harmA=(1.0, 0.30, 0.12),
    spread=27.0, groupDepth=0.62, groupScale=0.315, groupAcross=1.9,
    steep=0.66, setMix=0.60, setCycles=3.0, jitter=0.70, ampL=1.05,
    deepEnd=23.0, shallowEnd=9.0, tealDepth=26.0,
    breakGamma=0.72, whitecapSteep=0.280,
    preBreak=1.15, faceTeal=0.88, lipGain=0.88, foamErodeK=3.2,
    streakGain=0.18, faceLift=0.34, chopGlint=0.20, licTone=0.0, licMix=0.0,
    foamDeep=16.0, foamDeepThr=1.4, foamVeil=0.30,
    stokes=2.6, backwash=1.0,
    tauFresh=1.35, tauPersist=6.4,
    injBreak=20.4, injWhitecap=1.60, injShore=7.8,
    sprayLife=1.05, spraySpread=42.0, sprayInject=0.85, sprayGate=0.50, sprayGain=0.85,
    specGain=0.155, sheen=0.032, shadowGain=0.78, crestGain=0.58, troughGain=0.80, transGain=0.86, swash=0.68,
    foamThrFresh=0.176, foamThrOld=0.55, exposure=0.99,
    palette=dict(abyss=hx('#0c3252'), deep=hx('#185383'), mid=hx('#2870a2'),
                 shallow=hx('#2e8794'), sky=hx('#79b0cd'), foamThin=hx('#bdced7'), foamBody=hx('#e2ecef'),
                 foamDense=hx('#f4f9f9'), sun=hx('#fff3dc')),
)

# ------------------------------------------------------- heavy crashing surf
PRESETS['heavy_crashing_surf'] = dict(
    COMMON,
    title='Heavy crashing surf',
    duration=17.0, loop=17.0, preroll=12.0,
    families={'primary': ((0.574, 0.819), 2.87),      # L0 ~ 170 px
              'secondary': ((0.719, 0.695), 2.05),    # L0 ~  87 px
              'chop': ((0.375, 0.927), 1.20)},        # L0 ~  30 px
    ampP=4.10, ampS=2.35, ampC=2.20, chopGain=0.72,
    harmM=(1.0, 1.72, 2.95), harmA=(1.0, 0.36, 0.16),
    spread=38.0, groupDepth=0.72, groupScale=0.338, groupAcross=2.2,
    steep=0.94, setMix=0.78, setCycles=2.0, jitter=0.78,
    deepEnd=24.0, shallowEnd=9.0, tealDepth=29.0,
    breakGamma=0.66, whitecapSteep=0.350,
    preBreak=1.40, faceTeal=1.00, lipGain=1.00, foamErodeK=3.6,
    streakGain=0.22, faceLift=0.38, chopGlint=0.24, licTone=0.0, licMix=0.0,
    foamDeep=17.0, foamDeepThr=1.4, foamVeil=0.26,
    stokes=4.2, backwash=1.9,
    tauFresh=1.30, tauPersist=5.5,
    injBreak=38.8, injWhitecap=1.40, injShore=15.3,
    sprayLife=1.55, spraySpread=64.0, sprayInject=2.6, sprayGate=0.33, sprayGain=1.05,
    specGain=0.16, sheen=0.034, shadowGain=0.88, crestGain=0.66, troughGain=0.88, transGain=0.72, swash=0.52,
    foamThrFresh=0.154, foamThrOld=0.59, exposure=0.97,
    palette=dict(abyss=hx('#0c304f'), deep=hx('#18517a'), mid=hx('#2870a0'),
                 shallow=hx('#1d7a86'), sky=hx('#74abc9'), foamThin=hx('#c0d1da'), foamBody=hx('#e4edf1'),
                 foamDense=hx('#f5fafa'), sun=hx('#fff4de')),
)


# Keys carrying a LENGTH or a SPEED in picture pixels. A zoom is a change of
# units, so these scale with it and everything else -- gains, thresholds,
# dimensionless steepnesses, durations -- does not. Getting this list wrong is
# the whole risk in a zoomed study: a constant left unscaled silently changes
# the physics instead of the magnification.
PX_SCALED = (
    'ampP', 'ampS', 'ampC',                       # wave heights
    'laceScale', 'streakScale', 'streakW', 'fineScale', 'licScale', 'licStep', 'licNoise',   # texture scales
    'crestLineW', 'laceLineW', 'shadowStep', 'chopW',   # stroke widths
    'detailLam',
    'reliefLift',
    'foamDeep', 'tealDepth', 'deepEnd', 'shallowEnd',
    'stokes', 'backwash', 'streakSpeed', 'fineSpeed', 'licSpeed',   # px/s
    'subDepth',
    'sprayRise', 'spraySpread', 'sprayFall',      # px/s
    'foamDiffuse',
)


def zoomed(name, z):
    """A preset for the same sea rendered z times larger.

    Periods are left alone and OCEAN_G is scaled by z instead: with omega fixed
    and k -> k/z, the dispersion relation gives g -> g*z, so wavelength and phase
    speed both scale by z. That is a magnification rather than a different sea.
    """
    p = dict(PRESETS[name])
    for k in PX_SCALED:
        if k in p:
            p[k] = p[k] * z
    return p
