#!/usr/bin/env python3
"""Record a cut's narration with the Kokoro voice, one sentence at a time, and derive the video timeline
from the real audio durations (so captions and animation cues are locked to the voice).
Usage: python3 tts_make.py <kokoro-v1.0.onnx> <voices-v1.0.bin> <cut>      (cut = a folder under cuts/)
Reads cuts/<cut>/narration.json; writes cuts/<cut>/narration.flac and cuts/<cut>/timeline.json.
Each sentence is [spoken text] or [spoken text, caption text]. Any other key on a scene (for example
"formulas": true) is copied to the timeline, where the scene code can read it.
Requires: pip install kokoro-onnx soundfile"""
import sys, json, pathlib, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
model, voices, cut = sys.argv[1:4]
cutdir = pathlib.Path(__file__).resolve().parent / 'cuts' / cut
N = json.loads((cutdir / 'narration.json').read_text(encoding='utf-8')); k = Kokoro(model, voices); SR = 24000
LEAD, GAP, TAIL = 0.6, 0.34, 0.8
def trim(x, thr=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] - int(pad*SR)); b = min(len(x), idx[-1] + int(pad*SR)); return x[a:b]
track = []; timeline = []; T = 0.0
for sc in N['scenes']:
    t = LEAD; sents = []; parts = [np.zeros(int(LEAD*SR), dtype=np.float32)]
    for i, s in enumerate(sc['s']):
        say = s[0]; cap = s[1] if len(s) > 1 else s[0]
        x, sr = k.create(say, voice=N['voice'], speed=N['speed'], lang='en-us'); assert sr == SR
        x = trim(np.asarray(x, dtype=np.float32)); d = len(x)/SR
        sents.append({'t0': round(t, 3), 't1': round(t+d, 3), 'cap': cap}); parts.append(x); t += d
        if i < len(sc['s'])-1: parts.append(np.zeros(int(GAP*SR), dtype=np.float32)); t += GAP
    t += TAIL; nfr = int(np.ceil(t*30)); dur = nfr/30.0
    a = np.concatenate(parts); a = np.concatenate([a, np.zeros(max(0, int(round(dur*SR)) - len(a)), dtype=np.float32)])[:int(round(dur*SR))]
    extra = {key: v for key, v in sc.items() if key not in ('id', 'label', 's')}
    track.append(a); timeline.append({'id': sc['id'], 'label': sc['label'], **extra, 'dur': dur, 'frames': nfr, 'start': round(T, 3), 'sents': sents}); T += dur
    print(sc['id'], 'dur %.2f' % dur, [round(s['t1']-s['t0'], 2) for s in sents], flush=True)
full = np.concatenate(track); full = full / np.abs(full).max() * 0.89
sf.write(str(cutdir / 'narration.flac'), full, SR, subtype='PCM_16')
(cutdir / 'timeline.json').write_text(json.dumps({'total': T, 'scenes': timeline}, indent=1, ensure_ascii=False), encoding='utf-8')
print('TOTAL %.2f s' % T, len(full)/SR)
