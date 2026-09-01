"""Ablate preset keys in the LIVE build, one labelled run at a time.

Each ablation is: patch heavy_crashing_surf -> export_web -> capture at the
anchor camera -> band metric -> crop for the eye. The picture is the target and
the metric is the diagnostic, never the other way round, so this always writes
both.

    python src/ablate_live.py <label> key=value [key=value ...]

The preset file is restored on exit whatever happens, so an interrupted run
cannot leave the tree patched.
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PRESETS = os.path.join(HERE, 'presets.py')
SCRATCH = (r'C:/Users/Steve/AppData/Local/Temp/claude'
           r'/C--Users-Steve-Documents-Github-portfolio'
           r'/ec5d6b9a-b7a7-4701-bf09-2c53358a8920/scratchpad')
ANCHOR = ['--span', '0.20', '--anchor', '0.5,0.5', '--origin', '0.045,0.129']
URL = 'http://localhost:3100/'


def heavy_span(src):
    """The heavy_crashing_surf row only -- that is the state that ships."""
    i = src.index('heavy_crashing_surf')
    j = src.index('\n)', i)
    return i, j


def patch(src, assignments):
    """Patch the heavy row, falling back to COMMON for keys it inherits.

    Half the interesting keys -- gloss, sky, foam diffusion -- live in COMMON
    and appear in a state row only where that state overrides them. Editing
    nothing silently is how an ablation returns a null that only means "I
    changed nothing", which has already cost this lane a night.
    """
    i, j = heavy_span(src)
    head, row = src[:i], src[i:j]
    for key, value in assignments.items():
        pat = re.compile(r'(\b%s=)([-\d.]+)' % re.escape(key))
        if pat.search(row):
            row = pat.sub(lambda m: m.group(1) + value, row, count=1)
        elif pat.search(head):
            m = list(pat.finditer(head))[-1]      # COMMON's, the last before the row
            head = head[:m.start()] + m.group(1) + value + head[m.end():]
        else:
            raise SystemExit(
                'ablate_live: %r found in neither the heavy row nor COMMON' % key)
    return head + row + src[j:]


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=kw.pop('cwd', HERE), capture_output=True,
                       text=True, shell=False, **kw)
    if r.returncode != 0:
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit('ablate_live: command failed: %s' % ' '.join(cmd[:3]))
    return r.stdout


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    label = sys.argv[1]
    assignments = dict(a.split('=', 1) for a in sys.argv[2:])

    original = io.open(PRESETS, encoding='utf-8').read()
    out_png = '%s/ab_%s.png' % (SCRATCH, label)
    try:
        io.open(PRESETS, 'w', encoding='utf-8', newline='\n').write(
            patch(original, assignments))
        run([sys.executable, 'src/export_web.py'], cwd=os.path.dirname(HERE))
        # --canvas-only, ALWAYS. A page screenshot of this camera contains the
        # capital, and the city's streets and roofs are far more oriented than
        # the sea: measured that way, band-coherence barely moves however the
        # water changes, because most of what it is measuring is not water.
        run(['node', 'scripts/capture-ocean-comparison.mjs', '--url', URL]
            + ANCHOR + ['--canvas-only', '1', '--out', out_png], cwd=ROOT)
    finally:
        # Restore the preset AND the generated shaders. Leaving the live build
        # patched with the last ablation is how a later capture silently
        # measures the wrong thing.
        io.open(PRESETS, 'w', encoding='utf-8', newline='\n').write(original)
        run([sys.executable, 'src/export_web.py'], cwd=os.path.dirname(HERE))

    print(run([sys.executable, 'src/band_metric.py', out_png],
              cwd=os.path.dirname(HERE)).strip())
    print('wrote', out_png)


if __name__ == '__main__':
    main()
