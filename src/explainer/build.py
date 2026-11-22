#!/usr/bin/env python3
"""Assemble index.html at the repository root from src.html, lib.js and zeros.json (all in this folder)."""
import json, pathlib

here = pathlib.Path(__file__).resolve().parent
src = (here / 'src.html').read_text(encoding='utf-8')
lib = (here / 'lib.js').read_text(encoding='utf-8').replace(
    "if (typeof module !== 'undefined') module.exports = RH;", "")
zeros = json.loads((here / 'zeros.json').read_text())
z = ','.join(('%.5f' % v).rstrip('0') for v in zeros)
out = src.replace('/*__LIB__*/', lib).replace('/*__ZEROS__*/', '[' + z + ']')
(here.parents[1] / 'index.html').write_text(out, encoding='utf-8')
print('wrote index.html,', len(out.encode('utf-8')), 'bytes')
