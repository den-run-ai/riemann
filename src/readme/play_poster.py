"""Add a play button and a running-time label to a video still, for use as a clickable poster in the README.
usage: playposter.py in.jpg out.jpg "3:15" """
import sys
from PIL import Image, ImageDraw, ImageFont
src, out, label = sys.argv[1], sys.argv[2], sys.argv[3]
K = 3  # supersample for smooth edges
im = Image.open(src).convert('RGB'); W, H = im.size
ov = Image.new('RGBA', (W * K, H * K), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
cx, cy, r = W * K // 2, H * K // 2, 62 * K
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(13, 17, 22, 200), outline=(255, 255, 255, 235), width=3 * K)
t = 26 * K
d.polygon([(cx - t * 0.62, cy - t), (cx - t * 0.62, cy + t), (cx + t * 1.05, cy)], fill=(255, 255, 255, 245))
font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 26 * K)
tw = d.textlength(label, font=font); ph, pad = 44 * K, 16 * K
x1, y1 = W * K - 24 * K, H * K - 24 * K; x0, y0 = x1 - tw - 2 * pad, y1 - ph
d.rounded_rectangle([x0, y0, x1, y1], radius=8 * K, fill=(13, 17, 22, 215))
d.text((x0 + pad, y0 + ph / 2), label, font=font, fill=(255, 255, 255, 245), anchor='lm')
ov = ov.resize((W, H), Image.LANCZOS)
Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB').save(out, quality=88, optimize=True)
print(out, (W, H))
