#!/usr/bin/env python3
"""Compute the imaginary parts of the first 600 non-trivial zeros of zeta with mpmath
and write them to zeros.json (5 decimals). Takes a few minutes. Requires: pip install mpmath"""
import json, pathlib
import mpmath as mp

mp.mp.dps = 15
zs = [float(mp.zetazero(n).imag) for n in range(1, 601)]
(pathlib.Path(__file__).resolve().parent / 'zeros.json').write_text(json.dumps([round(z, 5) for z in zs]))
print(len(zs), 'zeros; first', zs[0], 'last', zs[-1])
