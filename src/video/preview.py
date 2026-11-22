#!/usr/bin/env python3
"""Draw single test frames to out/<cut>/preview_<scene>_<seconds>.jpg before committing to a full render.
Usage: python3 preview.py <cut> zeta:12.5 music:9 line:14     (scene id : local time in seconds)
With no shots, one frame is drawn at 60% of every scene."""
import sys, json, base64, os, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
cut = sys.argv[1]
out = here / 'out' / cut; out.mkdir(parents=True, exist_ok=True)
tl = json.loads((here / 'cuts' / cut / 'timeline.json').read_text())
ids = {s['id']: k for k, s in enumerate(tl['scenes'])}
shots = [a.split(':') for a in sys.argv[2:]] or [[s['id'], str(round(s['dur'] * 0.6, 2))] for s in tl['scenes']]
launch = {'args': ['--no-sandbox', '--allow-file-access-from-files']}
if os.environ.get('CHROME'):
    launch['executable_path'] = os.environ['CHROME']
with sync_playwright() as p:
    b = p.chromium.launch(**launch)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGE ERROR', e))
    pg.goto((here / ('video-%s.html' % cut)).as_uri()); pg.evaluate('window.ready')
    for sid, t in shots:
        d = pg.evaluate('([i,t])=>renderFrame(i,t)', [ids[sid], float(t)])
        f = out / ('preview_%s_%s.jpg' % (sid, t)); f.write_bytes(base64.b64decode(d)); print(f.name)
    b.close()
