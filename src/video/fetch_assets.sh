#!/usr/bin/env bash
# Fetch what the video build needs but the repository does not carry:
#   fonts  - Bodoni Moda, STIX Two Text and STIX Two Math (SIL OFL), from the npm registry
#   voice  - the Kokoro text-to-speech model (Apache-2.0), ~350 MB, only with WITH_VOICE=1
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts models
for p in stix-two-text stix-two-math bodoni-moda; do
  if [ ! -d "fonts/$p/package" ]; then
    (cd fonts && npm pack "@fontsource/$p@5.3.0" --silent >/dev/null && mkdir -p "$p" \
      && tar -xzf "fontsource-$p-5.3.0.tgz" -C "$p" && rm "fontsource-$p-5.3.0.tgz")
    echo "fetched fonts/$p"
  fi
done
if [ "${WITH_VOICE:-0}" = 1 ]; then
  for f in kokoro-v1.0.onnx voices-v1.0.bin; do
    [ -f "models/$f" ] || curl -L --fail -o "models/$f" \
      "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
  done
fi
