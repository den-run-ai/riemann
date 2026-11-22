# The videos

Two cuts of one narrated explanation of the Riemann hypothesis. Both are 1920×1080 at 30 frames a second, with a synthetic voice and burnt-in captions. They share their opening and closing scenes; the extended cut replaces one scene in the middle with five.

| Cut | File | Length | What it adds |
|:--|:--|:--|:--|
| Short | [`riemann-hypothesis-explained.mp4`](riemann-hypothesis-explained.mp4) | 3:15 | Intuition only. The one formula on screen is the definition of zeta. |
| Extended | [`riemann-hypothesis-extended.mp4`](riemann-hypothesis-extended.mp4) | 4:40 | Euler's sum and π, Euler's product, complex numbers as rotations, zeta as a sum of turning arrows, and the key formulas on screen. |

Next to each video are its captions as a separate file (`.srt`) and the narration script with scene times (`.transcript.md`).

## Scenes

Times are where each scene starts. A dash means the scene is not in that cut.

| Scene | Idea | Formula on screen (extended cut) | Short | Extended |
|:--|:--|:--|:--|:--|
| Primes | The atoms of arithmetic, scattered with no visible pattern | | 0:00 | 0:00 |
| Order from afar | The prime staircase follows Gauss's smooth curve | $\pi(x) \approx \mathrm{Li}(x) = \int_2^x dt/\ln t$ | 0:13 | 0:13 |
| The square-root law | The error is the size of coin-flip noise | $\pi(x) = \mathrm{Li}(x) + O(\sqrt{x} \ln x)$ | 0:30 | 0:30 |
| Riemann's function | Zeta on the complex plane, and its zeros on one special line | | 0:49 | – |
| Euler's sum and π | One over every square adds up to a number built from π | $1 + \tfrac14 + \tfrac19 + \cdots = \pi^2/6$ | – | 0:49 |
| Euler's product | A sum over whole numbers equals a product over primes, because factorisation is unique | $\zeta(s) = \sum 1/n^s = \prod 1/(1 - p^{-s})$ | – | 1:08 |
| Complex numbers turn | Multiplying by $i$ is a quarter turn; Euler's formula covers every angle; half a turn is π | $e^{i\theta} = \cos\theta + i \sin\theta$, $e^{i\pi} = -1$ | – | 1:29 |
| A sum of arrows | Each term of zeta is an arrow with a length and an angle; head to tail they spiral around the value of zeta | $n^{-s} = n^{-\sigma} \cdot e^{-it \ln n}$ | – | 1:53 |
| The zeros of zeta | Follow that value up the line with real part ½; it keeps passing through zero | $s = \tfrac12 + it$ | – | 2:19 |
| Zeros make the primes | Each zero is a wave; together the waves rebuild the staircase | $\psi(x) = x - \sum_\rho x^\rho/\rho - \ln 2\pi - \tfrac12 \ln(1 - x^{-2})$ | 1:11 | 2:36 |
| Why the line matters | One zero off the line would drown out the rest | a zero $\beta + i\gamma$ gives a wave of size $x^\beta$ | 1:27 | 2:52 |
| A parallel world | Polynomials, where counting roots with multiplicity proves the analogue | | 1:53 | 3:17 |
| The announced proof | A chain of theta lifts standing in for the derivative that integers lack | | 2:16 | 3:40 |
| Where it stands | Checked by machine, not yet understood by people | | 2:45 | 4:09 |
| Closing | | every zero with $0 \lt \operatorname{Re} s \lt 1$ has $\operatorname{Re} s = \tfrac12$ | 3:06 | 4:30 |

## Two things the extended cut is careful about

- **The sum of arrows does not converge on the critical line.** For $s = \tfrac12 + it$ the partial sums of $\sum n^{-s}$ never settle. They trace a spiral that keeps widening as terms are added, and $\zeta(s)$, defined there by analytic continuation, is the point the spiral circles: $\sum_{n \le N} n^{-s} = \zeta(s) + N^{1-s}/(1 - s) + O(N^{-1/2})$. The video draws the first 48 arrows, marks $\zeta(s)$ computed independently, and says this in a note on screen. At a zero the spiral is centred on the origin, which is what the narration means by the arrows spiralling around zero.
- **The scenes about the announced proof are unchanged from the short cut.** They describe a result reported on 20 November 2026 as it stood on 22 November 2026, from secondary sources. See the notes in the [main README](../README.md#read-this-first).

## Rebuilding

Everything is drawn by [`src/video/scenes.js`](../src/video/scenes.js) on a canvas in headless Chrome, one frame at a time, and encoded with ffmpeg.

```sh
cd src/video
pip install playwright                 # a Chrome or Chromium is also needed; set CHROME=/path/to/chrome to choose one
./make_video.sh short                  # fetches fonts, renders the scenes, joins them, adds the shipped narration
./make_video.sh extended
python3 preview.py extended arrows:15 spin:19     # single test frames, scene id : seconds into the scene
```

Each cut lives in `src/video/cuts/<cut>/`:

| File | Role |
|:--|:--|
| `narration.json` | The script: scenes in order, each a list of sentences. A sentence is `[spoken text]` or `[spoken text, caption text]`. A scene may carry options for the renderer, such as `"formulas": true`. |
| `narration.flac` | The recorded narration (lossless). |
| `timeline.json` | Scene lengths and the start and end of every sentence, measured from the recording. The animation cues in `scenes.js` are keyed to these times, so pictures and captions stay locked to the voice. |

To change the script, edit `narration.json` and run `REGEN_AUDIO=1 ./make_video.sh <cut>`. That downloads the Kokoro voice model (about 350 MB), records each sentence, rewrites `timeline.json` from the real durations, renders, and regenerates the `.srt` and transcript. It needs `pip install kokoro-onnx soundfile`.

Also needed: `ffmpeg`, `npm` (to fetch the fonts) and the Inter typeface installed on the system for on-screen labels. Fonts, the voice model and intermediate renders are fetched or generated, and are listed in `.gitignore`.

The scene renderer is shared. With the short cut's timeline it draws exactly what it drew for the original video; the extended cut's extra scenes and formula overlays are switched on by its own timeline.
