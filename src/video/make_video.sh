#!/usr/bin/env bash
# Rebuild one cut of the video from source into ../../video/.
#   ./make_video.sh short                  the 3-minute cut   -> video/riemann-hypothesis-explained.mp4
#   ./make_video.sh extended               the 5-minute cut   -> video/riemann-hypothesis-extended.mp4
#   REGEN_AUDIO=1 ./make_video.sh <cut>    re-record the narration first (downloads the voice model)
# By default the shipped narration.flac and timeline.json of the cut are reused.
# Needs: python3 with playwright (and kokoro-onnx + soundfile for REGEN_AUDIO), Chrome/Chromium, ffmpeg, npm.
# Set CHROME=/path/to/chrome to choose the browser. The on-screen labels use the Inter typeface; install it
# system-wide or a fallback sans is used.
set -euo pipefail
cd "$(dirname "$0")"
CUT="${1:?usage: ./make_video.sh short|extended}"
[ -f "cuts/$CUT/narration.json" ] || { echo "no such cut: $CUT" >&2; exit 1; }
NAME=$(python3 -c "import json,sys; print(json.load(open('cuts/$CUT/narration.json'))['file'])")
if [ "${REGEN_AUDIO:-0}" = 1 ]; then
  WITH_VOICE=1 ./fetch_assets.sh
  python3 tts_make.py models/kokoro-v1.0.onnx models/voices-v1.0.bin "$CUT"
else
  ./fetch_assets.sh
fi
python3 build_video.py "$CUT"
N=$(python3 -c "import json; print(len(json.load(open('cuts/$CUT/timeline.json'))['scenes']))")
python3 render.py "$CUT" $(seq 0 2 $((N - 1))) & python3 render.py "$CUT" $(seq 1 2 $((N - 1))) & wait
cd "out/$CUT"
for i in $(seq 0 $((N - 1))); do f=$(printf 'scene_%02d.mp4' "$i"); [ -f "$f" ] || { echo "missing $f: a scene failed to render" >&2; exit 1; }; echo "file '$f'"; done > list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy silent.mp4
ffmpeg -y -loglevel error -i silent.mp4 -i "../../cuts/$CUT/narration.flac" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" -c:a aac -b:a 160k -ac 2 -movflags +faststart tmp_final.mp4
mkdir -p ../../../../video && mv tmp_final.mp4 "../../../../video/$NAME.mp4"
cd ../.. && python3 make_captions.py "$CUT"
echo "wrote video/$NAME.mp4"
