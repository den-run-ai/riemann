#!/usr/bin/env python3
"""Write a cut's captions (.srt) and narration transcript (.transcript.md) next to its video in ../../video/.
Usage: python3 make_captions.py <cut>
Reads cuts/<cut>/narration.json (voice, output file name) and cuts/<cut>/timeline.json (times, caption text)."""
import json, pathlib, sys

here = pathlib.Path(__file__).resolve().parent
cut = sys.argv[1]
N = json.loads((here / 'cuts' / cut / 'narration.json').read_text(encoding='utf-8'))
tl = json.loads((here / 'cuts' / cut / 'timeline.json').read_text(encoding='utf-8'))
dest = here.parents[1] / 'video'; dest.mkdir(exist_ok=True)

def stamp(t):
    ms = int(round(t * 1000)); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)

def two_lines(s, limit=60):
    if len(s) <= limit: return s
    mid = len(s) / 2; cut_at = min((i for i, c in enumerate(s) if c == ' '), key=lambda i: abs(i - mid))
    return s[:cut_at] + '\n' + s[cut_at + 1:]

srt = []; n = 0
for sc in tl['scenes']:
    for s in sc['sents']:
        n += 1
        srt.append('%d\n%s --> %s\n%s\n' % (n, stamp(sc['start'] + s['t0']), stamp(sc['start'] + s['t1'] + 0.2), two_lines(s['cap'])))
(dest / (N['file'] + '.srt')).write_text('\n'.join(srt), encoding='utf-8')

total = int(tl['total'])
md = ['# Narration transcript', 'Running time %d:%02d. Voice: Kokoro `%s` (synthetic). Times are minutes:seconds from the start of the video.' % (total // 60, total % 60, N['voice']), '']
for k, sc in enumerate(tl['scenes']):
    t = int(sc['start'])
    md += ['## %d. %s  (%d:%02d)' % (k + 1, sc['label'] or 'Closing', t // 60, t % 60), ' '.join(s['cap'] for s in sc['sents']), '']
(dest / (N['file'] + '.transcript.md')).write_text('\n'.join(md), encoding='utf-8')
print('wrote', N['file'] + '.srt', 'and', N['file'] + '.transcript.md', '(%d captions)' % n)
