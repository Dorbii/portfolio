"""GPU height-field ocean renderer (moderngl / GLSL, headless OpenGL 3.3).

Passes per simulation step:
  1. wave      -> surface height, gradient, breaking, surface flow   (MRT)
  2. foam      -> ping-pong persistent foam state (advected, aged, faded)
  3. spray     -> ping-pong spray state (impact-triggered, ballistic)
  4. composite -> shading + compositing over the immutable land plate

Nothing in this file resamples, warps or morphs the source painting. The plate
is sampled once per pixel and is returned untouched wherever the water mask is 0.
"""
import os
import subprocess
import numpy as np
from PIL import Image
import moderngl

import precompute as pre

# OCEAN_ROOT lets a study (e.g. the closeup concept) run the whole pipeline
# against a different workspace without forking any of it.
ROOT = os.environ.get('OCEAN_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shaders')
MASKS = os.path.join(ROOT, 'masks')


def _src(name):
    txt = open(os.path.join(SH, name), encoding='utf-8').read()
    if '#include "common.glsl"' in txt:
        common = open(os.path.join(SH, 'common.glsl'), encoding='utf-8').read()
        txt = txt.replace('#include "common.glsl"', common)
    return txt


class OceanRenderer:
    def __init__(self, preset, verbose=True, flat_ocean=False, bare=False):
        self.p = preset
        self.verbose = verbose
        # Stage-1 gate switches: judge wave mechanics with nothing else present.
        self.flat_ocean = flat_ocean
        self.bare = bare or flat_ocean
        self.G = float(os.environ.get('OCEAN_G', 130.0))
        fam = preset['families']
        fields, depth, water, sdf, extra, sites = pre.build(fam)
        self.fields, self.depth, self.water, self.sdf = fields, depth, water, sdf
        self.extra, self.sites = extra, sites
        H, W = depth.shape
        self.W, self.H = W, H

        self.ctx = moderngl.create_standalone_context(require=330)
        self.ctx.disable(moderngl.BLEND)
        quad = np.array([-1, -1, 3, -1, -1, 3], dtype='f4')
        self.vbo = self.ctx.buffer(quad.tobytes())

        self.prog_wave = self._prog('wave.frag')
        self.prog_foam = self._prog('foam.frag')
        self.prog_spray = self._prog('spray.frag')
        self.prog_comp = self._prog('composite.frag')

        self._make_textures()
        self._make_targets()

    # ------------------------------------------------------------------ setup
    def _prog(self, frag):
        prog = self.ctx.program(vertex_shader=_src('quad.vert'), fragment_shader=_src(frag))
        return prog, self.ctx.vertex_array(prog, [(self.vbo, '2f', 'in_pos')])

    def _tex(self, arr, comps, dtype='f4', repeat=False, filt=True, mipmap=False):
        a = np.ascontiguousarray(arr.astype('f4' if dtype == 'f4' else 'u1'))
        t = self.ctx.texture((self.W if a.shape[1] == self.W else a.shape[1],
                              self.H if a.shape[0] == self.H else a.shape[0]),
                             comps, a.tobytes(), dtype=dtype)
        if mipmap:
            # A 512^2 noise texture sampled at a scale of ~7-80 screen pixels is
            # being minified 6-70x. Without mipmaps every lookup point-samples a
            # different corner of the texture, which is what produced the hard
            # 1-4 px mottling all over the water -- aliasing, not style.
            t.build_mipmaps()
            t.filter = (moderngl.LINEAR_MIPMAP_LINEAR, moderngl.LINEAR)
            t.anisotropy = 8.0
        else:
            t.filter = (moderngl.LINEAR, moderngl.LINEAR) if filt else (moderngl.NEAREST, moderngl.NEAREST)
        t.repeat_x = t.repeat_y = repeat
        return t

    def _make_textures(self):
        F, ex = self.fields, self.extra
        P, S, C = F['primary'], F['secondary'], F['chop']
        water_soft = np.load(os.path.join(MASKS, 'water_soft.npy'))
        shore_soft = np.load(os.path.join(MASKS, 'shore_band_soft.npy'))
        spray_land = np.load(os.path.join(MASKS, 'spray_land_soft.npy'))
        vign = np.load(os.path.join(MASKS, 'vignette.npy'))

        self.texP = self._tex(np.stack([P['S'], S['S'], C['S'], self.depth], -1), 4)
        self.texG = self._tex(np.stack([P['kmag'], S['kmag'], C['kmag'], self.sdf], -1), 4)
        self.texD = self._tex(np.stack([P['dir'][..., 0], P['dir'][..., 1],
                                        S['dir'][..., 0], S['dir'][..., 1]], -1), 4)
        self.texM = self._tex(np.stack([water_soft, shore_soft, spray_land, vign], -1), 4)
        self.texA = self._tex(np.stack([ex['ampP'], ex['ampS'], ex['ampC'], ex['focus']], -1), 4)
        self.texImpact = self._tex(np.stack([ex['impact']] * 4, -1), 4)
        self.texNoise = self._tex(ex['noise'], 4, repeat=True, mipmap=True)

        plate = np.asarray(Image.open(os.path.join(MASKS, 'land_plate.png')).convert('RGB'))
        clean = np.asarray(Image.open(os.path.join(MASKS, 'clean_water_plate.png')).convert('RGB'))
        self.texPlate = self._tex(plate.astype(np.float32) / 255.0, 3)
        self.texClean = self._tex(clean.astype(np.float32) / 255.0, 3)
        self.water_soft = water_soft

    def _rt(self, comps=4):
        t = self.ctx.texture((self.W, self.H), comps, dtype='f4')
        t.filter = (moderngl.LINEAR, moderngl.LINEAR)
        t.repeat_x = t.repeat_y = False
        return t

    def _make_targets(self):
        self.tGeom, self.tFlow, self.tSwell = self._rt(), self._rt(), self._rt()
        self.fboWave = self.ctx.framebuffer(color_attachments=[self.tGeom, self.tFlow, self.tSwell])
        self.foam = [self._rt(), self._rt()]
        self.fboFoam = [self.ctx.framebuffer(color_attachments=[t]) for t in self.foam]
        self.spray = [self._rt(), self._rt()]
        self.fboSpray = [self.ctx.framebuffer(color_attachments=[t]) for t in self.spray]
        self.tOut = self.ctx.texture((self.W, self.H), 3, dtype='f1')
        self.fboOut = self.ctx.framebuffer(color_attachments=[self.tOut])
        for f in self.fboFoam + self.fboSpray:
            f.use(); self.ctx.clear(0, 0, 0, 0)
        self.cur = 0

    # ---------------------------------------------------------------- uniforms
    @staticmethod
    def _set(prog, **kw):
        for k, v in kw.items():
            if k in prog:
                prog[k].value = v

    @staticmethod
    def _bindtex(prog, tex, name, unit):
        """Bind only if the compiler kept the sampler; unused ones are stripped."""
        if name in prog:
            tex.use(unit)
            prog[name].value = unit

    def _bind_common(self, prog, t):
        units = [(self.texP, 'texP'), (self.texG, 'texG'), (self.texD, 'texD'),
                 (self.texM, 'texM'), (self.texA, 'texA'), (self.texNoise, 'texNoise')]
        for i, (tex, name) in enumerate(units):
            self._bindtex(prog, tex, name, i)
        dd = self.p['families']['primary'][0]
        nrm = (dd[0] ** 2 + dd[1] ** 2) ** 0.5
        self._set(prog, uRes=(float(self.W), float(self.H)), uTime=float(t),
                  uLoop=float(self.p['loop']),
                  uDirDeep=(float(dd[0] / nrm), float(dd[1] / nrm)),
                  uG=float(getattr(self, 'G', 130.0)),
                  uFlatOcean=1.0 if getattr(self, 'flat_ocean', False) else 0.0,
                  uBare=1.0 if getattr(self, 'bare', False) else 0.0)
        return len(units)

    # -------------------------------------------------------------------- step
    def step(self, t, dt, first):
        p = self.p
        # --- wave pass
        prog, vao = self.prog_wave
        n = self._bind_common(prog, t)
        self._set(prog, uAmpP=p['ampP'], uAmpS=p['ampS'], uAmpC=p['ampC'],
                  uSteep=p['steep'], uSetMix=p['setMix'], uSetCycles=p['setCycles'],
                  uBreakGamma=p['breakGamma'], uWhitecapSteep=p['whitecapSteep'],
                  uChopGain=p['chopGain'], uJitter=p['jitter'], uStokes=p['stokes'],
                  uBackwash=p['backwash'],
                  uPeriodP=p['families']['primary'][1],
                  uPeriodS=p['families']['secondary'][1],
                  uPeriodC=p['families']['chop'][1],
                  uHarmM=tuple(p.get('harmM', (1.0, 1.78, 3.05))),
                  uHarmA=tuple(p.get('harmA', (1.0, 0.30, 0.12))),
                  uAmpL=float(p.get('ampL', 0.0)), uHarmL=float(p.get('harmL', 0.42)),
                  uDirWander=float(p.get('dirWander', 0.0)),
                  uFormBend=float(p.get('formBend', 0.0)),
                  uFormGroup=float(p.get('formGroup', 0.0)),
                  uFormFine=float(p.get('formFine', 0.0)),
                  uSpread=float(p.get('spread', 26.0)),
                  uGroupDepth=float(p.get('groupDepth', 0.45)),
                  uGroupScale=float(p.get('groupScale', 0.13)),
                  uGroupAcross=float(p.get('groupAcross', 1.6)))
        self.fboWave.use(); self.ctx.viewport = (0, 0, self.W, self.H)
        vao.render(moderngl.TRIANGLES)

        # --- foam pass
        prog, vao = self.prog_foam
        n = self._bind_common(prog, t)
        self._bindtex(prog, self.tGeom, 'texGeom', n)
        self._bindtex(prog, self.tFlow, 'texFlow', n + 1)
        self._bindtex(prog, self.foam[self.cur], 'texPrev', n + 2)
        self._set(prog, uDt=dt, uTauFresh=p['tauFresh'], uTauPersist=p['tauPersist'],
                  uInjBreak=p['injBreak'], uInjWhitecap=p['injWhitecap'],
                  uInjShore=p['injShore'], uRelax=p['foamRelax'],
                  uDiffuse=p['foamDiffuse'], uFoamBlend=p['foamBlend'],
                  uFirst=1.0 if first else 0.0)
        self.fboFoam[1 - self.cur].use()
        vao.render(moderngl.TRIANGLES)

        # --- spray pass
        prog, vao = self.prog_spray
        n = self._bind_common(prog, t)
        self._bindtex(prog, self.tGeom, 'texGeom', n)
        self._bindtex(prog, self.tFlow, 'texFlow', n + 1)
        self._bindtex(prog, self.spray[self.cur], 'texPrev', n + 2)
        self._bindtex(prog, self.texImpact, 'texImpact', n + 3)
        self._set(prog, uDt=dt, uRise=p['sprayRise'], uSpread=p['spraySpread'],
                  uFall=p['sprayFall'], uLife=p['sprayLife'], uInject=p['sprayInject'],
                  uGate=p['sprayGate'], uFirst=1.0 if first else 0.0)
        self.fboSpray[1 - self.cur].use()
        vao.render(moderngl.TRIANGLES)

        self.cur = 1 - self.cur

    def composite(self, t):
        p = self.p
        prog, vao = self.prog_comp
        n = self._bind_common(prog, t)
        for i, (tex, name) in enumerate([(self.tGeom, 'texGeom'), (self.tFlow, 'texFlow'),
                                         (self.foam[self.cur], 'texFoam'),
                                         (self.spray[self.cur], 'texSpray'),
                                         (self.texPlate, 'texPlate'), (self.texClean, 'texClean'),
                                         (self.tSwell, 'texSwell')]):
            self._bindtex(prog, tex, name, n + i)
        c = p['palette']
        self._set(prog, cAbyss=c['abyss'], cDeep=c['deep'], cMid=c['mid'], cShallow=c['shallow'],
                  cFoamThin=c['foamThin'], cFoamBody=c['foamBody'], cFoamDense=c['foamDense'],
                  cSky=c['sky'],
                  cSun=c['sun'],
                  uSlope=p['slope'], uSpecGain=p['specGain'], uShin=p['shininess'],
                  uSheen=p['sheen'], uCrestGain=p['crestGain'], uTroughGain=p['troughGain'],
                  uTransGain=p['transGain'], uPlateInfluence=p['plateInfluence'],
                  uPlateTint=p['plateTint'], uFoamThrFresh=p['foamThrFresh'],
                  uFoamThrOld=p['foamThrOld'], uFoamSoft=p['foamSoft'],
                  uLaceScale=p['laceScale'], uLaceGain=p['laceGain'],
                  uFoamBaseErode=p['foamBaseErode'], uLaceContrast=p['laceContrast'],
                  uLaceRidge=p['laceRidge'], uFilament=p['filament'],
                  uLaceAlong=p['laceAlong'], uLaceAcross=p['laceAcross'],
                  uStreakGain=p['streakGain'], uStreakScale=p['streakScale'],
                  uStreakW=p['streakW'], uStreakSpeed=p['streakSpeed'],
                  uFaceLift=p['faceLift'], uFoamAer=p['foamAer'],
                  uChopCrest=p['chopCrest'], uChopGlint=p['chopGlint'],
                  uChopW=p['chopW'],
                  uSkyMix=p['skyMix'], uFresnelP=p['fresnelP'],
                  uGlossGain=p['glossGain'], uGlossShin=p['glossShin'],
                  uChopShade=p['chopShade'],
                  uFineScale=p['fineScale'], uFineGain=p['fineGain'],
                  uFineShade=p['fineShade'], uFineGloss=p['fineGloss'],
                  uFineSpeed=p['fineSpeed'],
                  uFoamErodeK=p['foamErodeK'], uHueVary=p['hueVary'],
                  uSubMix=p['subMix'], uSubDepth=p['subDepth'], uSubGreen=p['subGreen'],
                  uCrestBand=p['crestBand'], uShedGain=p['shedGain'],
                  uViewTilt=p['viewTilt'], uReliefLift=p['reliefLift'],
                  uOpenRelief=p['openRelief'],
                  uDetailLam=p['detailLam'], uDetailSpread=p['detailSpread'],
                  uDetailSharp=p['detailSharp'], uDetailSlope=p['detailSlope'],
                  uDetailShade=p['detailShade'], uDetailTrough=p['detailTrough'],
                  uDetailSky=p['detailSky'], uDetailGloss=p['detailGloss'],
                  uDetailWander=p['detailWander'],
                  uOpenCrest=p['openCrest'],
                  uFaceGrad=p['faceGrad'], uRimGain=p['rimGain'],
                  uCrossChop=p['crossChop'], uFoamAge=p['foamAge'],
                  uLicScale=p['licScale'], uLicStep=p['licStep'],
                  uLicMix=p['licMix'], uLicSteps=float(p['licSteps']),
                  uLicTone=p['licTone'], uLicNoise=p['licNoise'],
                  uLicContrast=p['licContrast'], uLicSpeed=p['licSpeed'],
                  uShadowGain=p['shadowGain'], uShadowStep=p['shadowStep'],
                  uCrestLineW=p['crestLineW'], uCrestLevel=p['crestLevel'],
                  uLaceLineW=p['laceLineW'], uLaceLineGain=p['laceLineGain'],
                  uFoamMass=p['foamMass'],
                  uCrestLineFloor=p['crestLineFloor'], uLaceLineThr=p['laceLineThr'],
                  uFoamSolid=p['foamSolid'],
                  uPosterize=p['posterize'], uBands=p['bands'], uBandSoft=p['bandSoft'],
                  uSprayGain=p['sprayGain'], uExposure=p['exposure'], uSat=p['saturation'],
                  uDeepEnd=p['deepEnd'], uShallowEnd=p['shallowEnd'],
                  uSwash=p['swash'], uVigMix=p['vigMix'], uRippleGain=p['rippleGain'],
                  uTealDepth=p['tealDepth'],
                  uPreBreak=p['preBreak'], uFaceTeal=p['faceTeal'], uLipGain=p['lipGain'],
                  uFoamDeep=p['foamDeep'], uFoamDeepThr=p['foamDeepThr'],
                  uFoamVeil=p['foamVeil'],
                  uGlitter=p['glitter'])
        self.fboOut.use(); self.ctx.viewport = (0, 0, self.W, self.H)
        vao.render(moderngl.TRIANGLES)
        buf = self.fboOut.read(components=3, dtype='f1')
        return np.frombuffer(buf, np.uint8).reshape(self.H, self.W, 3)

    # -------------------------------------------------------------------- run
    def run(self, duration, fps=24, substeps=2, preroll=None, grab=(), out_mp4=None,
            scale=1.0, crf=16, progress_every=48):
        p = self.p
        n_frames = int(round(duration * fps))
        dt = 1.0 / (fps * substeps)
        preroll = p['preroll'] if preroll is None else preroll
        n_pre = int(round(preroll * fps * substeps))

        proc = None
        ow, oh = int(self.W * scale), int(self.H * scale)
        ow -= ow % 2; oh -= oh % 2
        if out_mp4:
            os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
            cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                   '-s', f'{ow}x{oh}', '-r', str(fps), '-i', '-',
                   '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
                   # aq-mode=0 stops the encoder shifting bits away from the
                   # static land; softened deblocking stops filtering bleeding
                   # water motion across the coastline into land macroblocks.
                   # One IDR for the whole loop. x264's default 250-frame GOP
                   # inserted a second keyframe that reconstructed the static
                   # land a fraction of an LSB differently, and that offset then
                   # persisted for the rest of the clip.
                   '-g', '10000', '-keyint_min', '10000',
                   '-x264-params', 'aq-mode=0:deblock=-2,-2:scenecut=0:psy-rd=0,0:no-dct-decimate=1',
                   '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out_mp4]
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

        # warm-up: the wave field is exactly loop-periodic, and foam/spray decay
        # exponentially, so after a couple of loop lengths the whole simulation
        # is periodic too -- which is what makes a genuinely seamless loop possible
        t = -preroll
        first = True
        for i in range(n_pre):
            self.step(t, dt, first); first = False
            t += dt
        if self.verbose:
            print(f'   warm-up {preroll:.1f}s done ({n_pre} steps)')

        grabs = {}
        t = 0.0
        for f in range(n_frames):
            for _ in range(substeps):
                self.step(t, dt, False)
                t += dt
            img = self.composite(t)
            if f in grab:
                grabs[f] = img.copy()
            if proc:
                if scale != 1.0:
                    img = np.asarray(Image.fromarray(img).resize((ow, oh), Image.LANCZOS))
                else:
                    img = img[:oh, :ow]
                proc.stdin.write(np.ascontiguousarray(img).tobytes())
            if self.verbose and progress_every and (f + 1) % progress_every == 0:
                print(f'   frame {f+1}/{n_frames}')
        if proc:
            proc.stdin.close(); proc.wait()
        return grabs

    def read_height(self):
        """Just the normalised height channel. read_state() pulls ~75 MB per call
        across three RGBA32F buffers, which dominates any per-frame analysis."""
        buf = self.fboWave.read(attachment=0, components=1, dtype='f4')
        return np.frombuffer(buf, 'f4').reshape(self.H, self.W)

    def read_state(self):
        """Diagnostics: current foam / geometry buffers as numpy."""
        g = np.frombuffer(self.fboWave.read(attachment=0, components=4, dtype='f4'), 'f4').reshape(self.H, self.W, 4)
        fm = np.frombuffer(self.fboFoam[self.cur].read(components=4, dtype='f4'), 'f4').reshape(self.H, self.W, 4)
        sp = np.frombuffer(self.fboSpray[self.cur].read(components=4, dtype='f4'), 'f4').reshape(self.H, self.W, 4)
        return g, fm, sp
