#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  collectSocialMediaUsage,
  listImageSources,
  selectFreshSources
} from './social-media-guard.mjs';

const root = process.cwd();
const date = getArgValue('--date') || new Date().toISOString().slice(0, 10);
const title = getArgValue('--title') || 'Sommercamp 2026';
const subline = getArgValue('--subline') || 'Fussballcamp fuer Kinder';
const kicker = getArgValue('--kicker') || 'MACH MIT!';
const source = getArgValue('--source') || selectSource(date);
const output = getArgValue('--out') || `images/social-output/${date}-weekly-blog-social.jpg`;
const focusX = numberArg('--focus-x', 0.5);
const focusY = numberArg('--focus-y', 0.48);
const zoom = numberArg('--zoom', 1, 1, 2);
const pythonBin = process.env.PYTHON_BIN || localPython() || 'python3';

fs.mkdirSync(path.dirname(path.join(root, output)), { recursive: true });

const script = `
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
root = Path(${JSON.stringify(root)})
source = root / ${JSON.stringify(source)}
output = root / ${JSON.stringify(output)}
logo = Image.open(root / 'ci/logo.png').convert('RGBA')
font_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

def cover(img, size, focus=(0.5, 0.48), zoom=1):
    img = ImageOps.exif_transpose(img).convert('RGB')
    tw, th = size
    iw, ih = img.size
    scale = max(tw / iw, th / ih) * zoom
    nw, nh = int(iw * scale), int(ih * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, min(int((nw - tw) * focus[0]), nw - tw))
    top = max(0, min(int((nh - th) * focus[1]), nh - th))
    return img.crop((left, top, left + tw, top + th)).convert('RGBA')

def gradient(base):
    w, h = base.size
    overlay = Image.new('RGBA', base.size, (0, 0, 0, 0))
    pix = overlay.load()
    for y in range(h):
        a = int(205 * max(0, (y - h * 0.52) / (h * 0.48)) ** 1.35)
        if a:
            for x in range(w):
                pix[x, y] = (0, 0, 0, a)
    return Image.alpha_composite(base, overlay)

def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def text(draw, pos, value, font, fill, stroke=0):
    draw.text(pos, value, font=font, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0, 190))

def wrap(value, font, max_width):
    words = value.upper().split()
    lines = []
    current = ''
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    for word in words:
        candidate = (current + ' ' + word).strip()
        if probe.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:3]

def paste_logo(base):
    size = 154
    margin = 34
    mark = logo.resize((size, size), Image.Resampling.LANCZOS)
    x = base.size[0] - size - margin
    y = base.size[1] - size - margin
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    alpha = mark.getchannel('A')
    blob = Image.new('RGBA', mark.size, (0, 0, 0, 115))
    blob.putalpha(alpha.filter(ImageFilter.GaussianBlur(6)))
    shadow.alpha_composite(blob, (x + 4, y + 5))
    base = Image.alpha_composite(base, shadow)
    base.alpha_composite(mark, (x, y))
    return base

img = gradient(cover(Image.open(source), (1080, 1350), focus=(${focusX}, ${focusY}), zoom=${zoom}))
draw = ImageDraw.Draw(img)
red = (188, 21, 18, 238)
black = (12, 12, 12, 236)
white = (255, 255, 255, 255)
gold = (226, 184, 90, 255)
rounded(draw, (54, 54, 380, 118), 16, black)
text(draw, (82, 69), ${JSON.stringify(kicker)}, ImageFont.truetype(font_bold, 34), gold)
title_font = ImageFont.truetype(font_bold, 78)
lines = wrap(${JSON.stringify(title)}, title_font, 930)
y = 840
rounded(draw, (38, y - 24, 1000, y + 90 * len(lines) + 18), 26, (0, 0, 0, 150))
for line in lines:
    text(draw, (62, y), line, title_font, white, 2)
    y += 82
rounded(draw, (54, y + 24, 660, y + 94), 18, red)
text(draw, (82, y + 41), ${JSON.stringify(subline)}, ImageFont.truetype(font_bold, 32), white)
img = paste_logo(img)
img.convert('RGB').save(output, 'JPEG', quality=90, optimize=True)
`;

const result = spawnSync(pythonBin, ['-c', script], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(JSON.stringify({
  imagePath: output,
  source,
  publicUrl: `${publicBaseUrl()}/${output}`
}, null, 2));

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function numberArg(name, fallback, min = 0, max = 1) {
  const value = Number(getArgValue(name));
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function selectSource(isoDate) {
  const usage = collectSocialMediaUsage(root);
  const [source] = selectFreshSources(listImageSources(root), usage, 1, isoDate);
  if (!source) {
    throw new Error('No fresh image source found in images/social-input/. Add new photos before generating another social image.');
  }
  return source;
}

function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'https://www.talentexperte.de';
}

function localPython() {
  const candidate = path.join(root, '.venv', 'bin', 'python3');
  return fs.existsSync(candidate) ? candidate : null;
}
