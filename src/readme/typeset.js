// Typeset formulas with MathJax 3 and report TeX errors. Called by check.py: JSON list on stdin, JSON list of errors on stdout.
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
// without noerrors and noundefined, an unknown macro or a syntax error is reported instead of printed in red
const packages = AllPackages.filter(p => p !== 'noerrors' && p !== 'noundefined');
const errors = [];
let current = null;
const tex = new TeX({ packages, formatError: (jax, err) => { errors.push({ tex: current, error: err.message }); return jax.formatError(err); } });
const doc = mathjax.document('', { InputJax: tex, OutputJax: new SVG({ fontCache: 'none' }) });

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  for (const f of JSON.parse(input)) { current = f.tex; doc.convert(f.tex, { display: f.display }); }
  process.stdout.write(JSON.stringify(errors));
});
