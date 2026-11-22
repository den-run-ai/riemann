#!/usr/bin/env python3
"""Render scenes to out/<cut>/scene_NN.mp4, one encoded file per scene.
Usage: python3 render.py <cut> [0 1 2 ...]   (scene indices as in cuts/<cut>/timeline.json; none = all scenes)
Needs: pip install playwright, a Chrome or Chromium (set CHROME=/path/to/chrome to choose one), and ffmpeg."""
import sys, json, base64, subprocess, os, time, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
cut = sys.argv[1]
out = here / 'out' / cut; out.mkdir(parents=True, exist_ok=True)
tl = json.loads((here / 'cuts' / cut / 'timeline.json').read_text())
idx = [int(a) for a in sys.argv[2:]] or list(range(len(tl['scenes'])))
ENC = ['-vf', 'scale=in_range=full:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p',
       '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
       '-video_track_timescale', '15360', '-an']
launch = {'args': ['--no-sandbox', '--allow-file-access-from-files']}
if os.environ.get('CHROME'):
    launch['executable_path'] = os.environ['CHROME']
with sync_playwright() as p:
    b = p.chromium.launch(**launch)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((here / ('video-%s.html' % cut)).as_uri()); pg.evaluate('window.ready')
    for i in idx:
        sc = tl['scenes'][i]; n = sc['frames']; t0 = time.time()
        tmp = out / ('tmp_%02d.mp4' % i); fin = out / ('scene_%02d.mp4' % i)
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30',
                               '-c:v', 'mjpeg', '-i', '-'] + ENC + [str(tmp)], stdin=subprocess.PIPE)
        for f in range(n):
            ff.stdin.write(base64.b64decode(pg.evaluate('([i,t])=>renderFrame(i,t)', [i, f / 30.0])))
        ff.stdin.close(); rc = ff.wait()
        if rc == 0 and not errs:
            os.replace(tmp, fin)      # a stopped render never leaves a file under the final name
        print('scene', i, sc['id'], n, 'frames, rc', rc, '%.1fs' % (time.time() - t0), errs or '', flush=True)
    b.close()
