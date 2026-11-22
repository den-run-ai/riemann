#!/usr/bin/env python3
"""Checks on the repository's Markdown pages that can be run without GitHub.

1. Every inline $...$ formula comes through GitHub's markdown parser (cmark-gfm) character for character:
   no emphasis opened by an underscore, no backslash eaten as an escape, no stray or unpaired dollar sign.
2. Every image and every relative link points at a file that exists.
3. Every formula, inline and display, typesets in MathJax without a TeX error (needs node, and
   `npm install mathjax-full@3` in this folder; skipped with a notice if that is missing).

Usage: python3 check.py [file.md ...]      (default: README.md and video/README.md)      Requires: pip install cmarkgfm
"""
import html, json, pathlib, re, shutil, subprocess, sys
import cmarkgfm

here = pathlib.Path(__file__).resolve().parent
root = here.parents[1]
files = [pathlib.Path(a).resolve() for a in sys.argv[1:]] or [root / 'README.md', root / 'video' / 'README.md']
failed = False

for md in files:
    src = md.read_text(encoding='utf-8'); problems = []
    print(md.relative_to(root))
    # ----- split the source into display blocks and prose -----
    display = re.findall(r'^```math\n(.*?)\n```$', src, flags=re.S | re.M)
    prose = re.sub(r'^```.*?^```$', '', src, flags=re.S | re.M)
    ticked = re.findall(r'\$`([^`\n]+)`\$', prose)                      # the $`...`$ form
    plain_src = re.sub(r'\$`[^`\n]+`\$', 'MATH', prose)
    plain_src = re.sub(r'`[^`\n]*`', 'CODE', plain_src)                 # ordinary code spans may hold anything
    inline = []
    for n, line in enumerate(plain_src.split('\n'), 1):
        if line.count('$') % 2:
            problems.append('odd number of $ in: ' + line[:90])
            continue
        for m in re.finditer(r'\$([^$]+)\$', line):
            x = m.group(1); before = line[m.start() - 1] if m.start() else ' '; after = line[m.end()] if m.end() < len(line) else ' '
            inline.append(x)
            if x != x.strip(): problems.append('space inside the delimiters: $%s$' % x)
            if before.isalnum() or after.isalnum(): problems.append('formula glued to a letter or digit: %s$%s$%s' % (before, x, after))
            for bad in (r'\,', r'\;', r'\!', r'\{', r'\}', r'\|', r'\\', r'\#', r'\_', '*', '<', '>'):
                if bad in x: problems.append('unsafe %s in inline formula: $%s$' % (bad, x))
            if re.search(r'[^A-Za-z0-9\s]_', x): problems.append('underscore after punctuation in: $%s$' % x)

    # ----- 1. what GitHub's markdown pass leaves of each formula -----
    out = html.unescape(cmarkgfm.github_flavored_markdown_to_html(src, options=cmarkgfm.Options.CMARK_OPT_UNSAFE))   # keep inline HTML, as GitHub does
    for x in inline:
        if '$' + x + '$' not in out: problems.append('altered by markdown: $%s$' % x)
    for x in ticked:
        if '$<code>' + x + '</code>$' not in out: problems.append('altered by markdown: $`%s`$' % x)
    for x in display:
        if x not in out: problems.append('display block altered: ' + x[:60])

    # ----- 2. images and relative links -----
    targets = re.findall(r'(?:src|srcset)="([^"]+)"', src) + [t for t in re.findall(r'\]\(([^)#\s]+)\)', src) if '://' not in t]
    missing = sorted({t for t in targets if not (md.parent / t).exists()})
    for t in missing: problems.append('missing file: ' + t)

    # ----- 3. typeset everything -----
    formulas = [{'tex': x, 'display': False} for x in inline + ticked] + [{'tex': x, 'display': True} for x in display]
    if shutil.which('node') and (here / 'node_modules' / 'mathjax-full').exists():
        r = subprocess.run(['node', str(here / 'typeset.js')], input=json.dumps(formulas), capture_output=True, text=True)
        if r.returncode: problems.append('typeset.js failed: ' + r.stderr.strip()[:300])
        else:
            for e in json.loads(r.stdout): problems.append('TeX error: %s  in  %s' % (e['error'], e['tex']))
            print('typeset %d formulas with MathJax' % len(formulas))
    else:
        print('MathJax check skipped: run `npm install mathjax-full@3` in', here)

    print('%d inline, %d backtick-form, %d display formulas; %d images and links' % (len(inline), len(ticked), len(display), len(targets)))
    for p in problems: print('PROBLEM:', p)
    failed = failed or bool(problems)
sys.exit(1 if failed else 0)
