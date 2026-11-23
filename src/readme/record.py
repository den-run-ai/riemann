#!/usr/bin/env python3
"""Record the explainer's figures as looping animations for the README.

Opens ../../index.html in headless Chromium, operates each figure's own controls (sliders, buttons)
through a scripted sequence, photographs the figure card after every step, and joins the frames
into media/figure-NN-<slug>-<light|dark>.gif with ffmpeg.

Usage:  python3 record.py                 every figure, both colour schemes
        python3 record.py 3 5             only figures 3 and 5 (0 = the trace at the top; 7 or 8 = the shared card)
        python3 record.py 4 --scheme dark one scheme only
Needs:  pip install playwright, a Chrome or Chromium (set CHROME=/path/to/chrome to choose one), and ffmpeg.

Three things differ from the page as a reader sees it, all so that the recording reads well in a README:
the caption under each figure is hidden (the README prints it as text); the card of figures 7 and 8 is
recorded 700 px wide instead of 536, which is where the page's own layout puts its two panels side by side;
and the zoom of figure 1 passes through intermediate ranges that the page's three buttons do not offer.
Every frame is drawn by the page's own code.
"""
import math, os, pathlib, shutil, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = (ROOT / 'index.html').as_uri()
OUT = ROOT / 'media'
CARD_X, CARD_Y, CARD_W, SCALE = 112, 20, 536, 1.5    # 536 px is the page's full-width figure card
VIEW_H = 1400

CSS = """
figure.fig .cap{display:none!important}
*,*::before,*::after{transition:none!important}
figure.rec{position:fixed!important;left:%dpx;top:%dpx;width:%dpx;margin:0!important;z-index:1000}
"""


class UI:
    """The handful of gestures a reader has: move a slider, press a button."""
    def __init__(self, pg): self.pg = pg
    def set(self, ident, value):
        self.pg.evaluate("([i,v])=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}", [ident, value])
    def click(self, selector):
        self.pg.evaluate("s=>document.querySelector(s).click()", selector)
    def touch(self, ident, x, y):
        """Put the pointer at (x, y) CSS px inside a canvas, the way a reader's finger or mouse would."""
        r = self.pg.evaluate("i=>{const b=document.getElementById(i).getBoundingClientRect();return [b.x,b.y]}", ident)
        self.pg.mouse.move(r[0] + x, r[1] + y)
    def away(self):
        self.pg.mouse.move(1, 1)
    def js(self, body, arg=None):
        return self.pg.evaluate(body, arg)


def steps(a, b, step):
    n = round(abs(b - a) / step)
    return [round(a + (b - a) * k / n, 6) for k in range(1, n + 1)]

def ease(u): return u * u * (3 - 2 * u)


# ---------- one scripted sequence per figure: do something, then yield how long the frame stays up ----------

def seq_hero(ui):
    # the page animates this trace by itself; the recorder owns the clock (see record()) and steps it
    read_t = "()=>parseFloat(document.getElementById('heroRead').textContent.replace('t = ',''))"
    prev = ui.js(read_t)
    while True:                                   # run on, one animation frame at a time, to the restart at t = 0
        ui.pg.clock.run_for(16); t = ui.js(read_t)
        if t < prev: break
        prev = t
    while True:
        yield 0.06
        prev = t; ui.pg.clock.run_for(160); t = ui.js(read_t)
        if t < prev: break
    yield ('hold', 1.8)                           # lengthen the last frame: all ten zeros passed

def seq_prime_count(ui):
    show = "([i,n])=>{const b=document.querySelectorAll('#b1 button')[i],keep=b.dataset.n;b.dataset.n=n;b.click();b.dataset.n=keep}"
    ui.js(show, [0, 100]); yield 1.8
    for i, (lo, hi) in ((1, (100, 10000)), (2, (10000, 1000000))):
        n = 22
        for k in range(1, n + 1):
            ui.js(show, [i, hi if k == n else round(lo * (hi / lo) ** ease(k / n))]); yield 0.07
        yield ('hold', 1.8 if i == 1 else 2.6)

def seq_euler(ui):
    ui.set('e2', 0); yield 1.4
    for i in range(1, 26):
        ui.set('e2', i); yield 0.55 if i <= 4 else 0.3
    yield ('hold', 2.4)

def seq_walk(ui):
    ui.set('sg', 0.5); ui.set('tt', 0); yield 0.8
    for t in steps(0, 60, 0.75):
        ui.set('tt', t); yield 0.1
    yield ('hold', 1.4)
    for s in (0.52, 0.54, 0.56, 0.58, 0.6, 0.63, 0.66, 0.7):   # each of these frames redraws the whole path
        ui.set('sg', s); yield 0.18
    yield ('hold', 1.8)
    for s in (0.65, 0.6, 0.55, 0.5):
        ui.set('sg', s); yield 0.12
    yield ('hold', 1.2)

def seq_explicit(ui):
    ks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 23, 26, 30, 35, 40, 46, 53, 60, 70, 80, 92, 105, 120, 137, 155, 175, 198, 223, 250, 275, 300]
    for k in ks:
        ui.set('k4', k); yield 1.4 if k == 0 else 0.6 if k <= 3 else 0.35 if k <= 8 else 0.22 if k <= 30 else 0.14
    yield ('hold', 2.6)

def seq_error(ui):
    ui.set('b5', 0.5); yield 1.6
    for b in steps(0.5, 0.8, 0.015):
        ui.set('b5', b); yield 0.13
    yield ('hold', 1.8)
    for b in steps(0.8, 0.5, 0.03):
        ui.set('b5', b); yield 0.09
    yield ('hold', 0.6)

def seq_gaps(ui):
    # what Play does: add the zeros one at a time, faster as they accumulate; then draw new random points twice
    n = 40
    for k in range(n + 1):
        ui.set('n6', round(20 * 30 ** (k / n))); yield 1.4 if k == 0 else 0.12
    yield ('hold', 2.2)
    for _ in range(2):
        ui.click('#s6'); yield 1.3

def seq_curve(ui):
    P37 = 378                                     # the p slider is logarithmic; 378 is p = 37
    ui.set('a7', -1); ui.set('bb7', 1); ui.set('p7', P37); yield 1.0
    W = ui.js("()=>document.getElementById('c7').clientWidth")
    side = min(W, 330) - 32; cell = side / 37; x0 = (W - side) / 2
    for (x, y), s in (((0, 1), 1.9), ((2, 2), 1.5)):   # a square on the curve, then one off it
        ui.touch('c7', x0 + (x + .5) * cell, 16 + side - (y + .5) * cell); yield s
    ui.away()
    ui.set('p7', 0); yield 0.8                    # p = 5, then press Play and let the page's own clock run
    ui.click('#pl7'); yield 0.3
    p_now = lambda: int(ui.js("()=>document.getElementById('op7').textContent"))
    playing = lambda: ui.js("()=>document.getElementById('pl7').textContent") == 'Pause'
    last, since = p_now(), 0.0
    while playing():
        ui.pg.clock.run_for(16); since += 0.016
        p = p_now()
        if p != last and (p < 100 or since >= 0.3):   # a frame for every prime below 100, then one every 0.3 s
            last, since = p, 0.0; yield 0.016
        else:
            yield ('hold', 0.016)
    yield 2.4                                     # the end: every prime below 1,000, all inside the band
    ui.set('p7', P37); yield 1.2                  # back to p = 37, then change the curve
    for a in (0, 1, 2):
        ui.set('a7', a); yield 1.0
    for b in (2, 3):
        ui.set('bb7', b); yield 1.0
    ui.set('a7', -1); ui.set('bb7', 1); yield 1.2

def seq_multiplicity(ui):
    ui.set('m9', 1); yield 1.4
    for m in (2, 3, 4, 5, 6):
        ui.set('m9', m); yield 0.9
    yield ('hold', 1.8)
    for m in (5, 4, 3, 2):
        ui.set('m9', m); yield 0.35

def seq_binomial(ui):
    ui.set('n10', 2); yield 1.2
    for n in range(3, 61):
        ui.set('n10', n); yield 0.14
    yield ('hold', 2.4)

def seq_chain(ui):
    # the travelling dot is a CSS animation; pause it and step its clock
    ui.js("()=>{window.__a=document.querySelector('.chain .pulse').getAnimations()[0];window.__a.pause()}")
    n = 100
    for k in range(n):
        ui.js("t=>{window.__a.currentTime=t}", 5000 * k / n); yield 0.05

def seq_balance(ui):
    ui.set('m12', 0.1); yield 1.0
    for v in steps(0.1, 0.9, 0.02):
        ui.set('m12', v); yield 0.08
    yield ('hold', 0.8)
    for v in steps(0.9, 0.5, 0.04):
        ui.set('m12', v); yield 0.07
    yield ('hold', 2.0)                           # m = sqrt(x): the minimum
    for e in (2, 0, 1):                           # x = 10^8, 10^4, back to 10^6
        ui.click('#b12 button:nth-child(%d)' % (e + 1)); yield 1.7


FIGURES = [  # key, position of the card among the page's figure cards (the two video players not counted), file stem, sequence, options
    (0,  0,  'figure-00-zeta-trace',        seq_hero,         {'clock': True}),
    (1,  1,  'figure-01-prime-count',       seq_prime_count,  {}),
    (2,  2,  'figure-02-euler-product',     seq_euler,        {}),
    (3,  3,  'figure-03-zeta-walk',         seq_walk,         {'colors': 128}),
    (4,  4,  'figure-04-explicit-formula',  seq_explicit,     {}),
    (5,  5,  'figure-05-square-root-error', seq_error,        {}),
    (6,  6,  'figure-06-zero-gaps',         seq_gaps,         {}),
    (7,  7,  'figure-07-08-elliptic-curve', seq_curve,        {'width': 700, 'clock': True}),
    (9,  8,  'figure-09-multiplicity',      seq_multiplicity, {}),
    (10, 9,  'figure-10-binomial',          seq_binomial,     {}),
    (11, 10, 'figure-11-theta-chain',       seq_chain,        {}),
    (12, 11, 'figure-12-chain-length',      seq_balance,      {}),
]


def open_page(browser, scheme, index, clock, width):
    ctx = browser.new_context(viewport={'width': width + 2 * CARD_X, 'height': VIEW_H}, device_scale_factor=SCALE, color_scheme=scheme)
    pg = ctx.new_page(); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    if clock: pg.clock.install(time=0)
    pg.goto(PAGE); pg.evaluate('document.fonts.ready')
    if clock: pg.clock.pause_at(3600000)
    pg.add_style_tag(content=CSS % (CARD_X, CARD_Y, width))
    # setting the theme attribute makes the page redraw every figure at its recording size
    pg.evaluate("([i,s])=>{[...document.querySelectorAll('figure.fig')].filter(f=>!f.closest('#watch'))[i].classList.add('rec');document.documentElement.dataset.theme=s}", [index, scheme])
    pg.wait_for_timeout(150)
    return ctx, pg, errors


def play(pg, seq, on_frame):
    """Run a sequence; call on_frame(seconds) for each frame. A ('hold', s) item lengthens the previous frame."""
    for item in seq(UI(pg)):
        if isinstance(item, tuple): on_frame(item[1], True)
        else: on_frame(item, False)


def record(browser, scheme, fig):
    key, index, stem, seq, opt = fig
    width = opt.get('width', CARD_W)
    # pass 1: find the tallest state of each readout, so that the card keeps one size for the whole loop
    ctx, pg, errors = open_page(browser, scheme, index, opt.get('clock'), width)
    tall = []
    def measure(_s, hold):
        if hold: return
        h = pg.evaluate("()=>[...document.querySelectorAll('figure.rec .read')].map(e=>e.offsetHeight)")
        tall[:] = h if not tall else [max(a, b) for a, b in zip(tall, h)]
    play(pg, seq, measure); ctx.close()
    # pass 2: pin those heights and photograph
    ctx, pg, errors2 = open_page(browser, scheme, index, opt.get('clock'), width)
    pg.evaluate("h=>document.querySelectorAll('figure.rec .read').forEach((e,i)=>{e.style.minHeight=h[i]+'px'})", tall)
    height = pg.evaluate("()=>{const f=document.querySelector('figure.rec');const h=2*Math.ceil(f.getBoundingClientRect().height/2);f.style.height=h+'px';return h}")
    if CARD_Y + height + 10 > VIEW_H: raise SystemExit('%s: card taller than the window' % stem)
    clip = {'x': CARD_X, 'y': CARD_Y, 'width': width, 'height': height}
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='rec-')); frames = []
    def shoot(seconds, hold):
        if hold: frames[-1][1] += seconds; return
        now = pg.evaluate("()=>document.querySelector('figure.rec').scrollHeight")
        if now > height: raise SystemExit('%s: content outgrew the card at frame %d (%d > %d px)' % (stem, len(frames), now, height))
        f = tmp / ('f%04d.png' % len(frames)); pg.screenshot(path=str(f), clip=clip); frames.append([f, seconds])
    play(pg, seq, shoot); ctx.close()
    if errors or errors2: raise SystemExit('%s: page errors: %s' % (stem, errors + errors2))
    OUT.mkdir(exist_ok=True)
    out = OUT / ('%s-%s.gif' % (stem, scheme))
    lines = ['ffconcat version 1.0']
    for f, s in frames:   # framerate 100 puts the timestamps on the GIF's own grid of 1/100 s
        lines += ["file '%s'" % f.name, 'option framerate 100', 'duration %.2f' % s]
    (tmp / 'list.txt').write_text('\n'.join(lines) + '\n')
    vf = ('split[a][b];[a]palettegen=max_colors=%d:stats_mode=full:reserve_transparent=0[p];'
          '[b][p]paletteuse=dither=none:diff_mode=rectangle' % opt.get('colors', 96))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', vf,
                    '-fps_mode', 'vfr', '-final_delay', str(round(frames[-1][1] * 100)), '-loop', '0', str(out)],
                   cwd=tmp, check=True)
    shutil.rmtree(tmp)
    print('%-44s %3d frames %5.1f s  %4dx%-4d %7.0f KB' % (out.name, len(frames), sum(s for _, s in frames),
          round(width * SCALE), round(height * SCALE), out.stat().st_size / 1024), flush=True)


def main():
    args = sys.argv[1:]; schemes = ['light', 'dark']
    if '--scheme' in args:
        i = args.index('--scheme'); schemes = [args[i + 1]]; del args[i:i + 2]
    want = {7 if int(a) == 8 else int(a) for a in args}
    figs = [f for f in FIGURES if not want or f[0] in want]
    launch = {'args': ['--no-sandbox', '--allow-file-access-from-files']}
    if os.environ.get('CHROME'): launch['executable_path'] = os.environ['CHROME']
    with sync_playwright() as p:
        b = p.chromium.launch(**launch)
        for fig in figs:
            for scheme in schemes: record(b, scheme, fig)
        b.close()


if __name__ == '__main__':
    main()
