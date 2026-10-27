"""Generate Syncora's original animated reaction cards. Requires Pillow."""
from pathlib import Path
import json, math, re
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
source = (root / 'src/lib/reactions.js').read_text(encoding='utf-8')
items = re.findall(r'id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*tags:\s*"[^"]+",\s*color:\s*"([^"]+)"', source)
if len(items) != 8:
    raise ValueError('Expected eight reaction definitions')
target = root / 'public/gifs'
target.mkdir(exist_ok=True)
font_path = Path('C:/Windows/Fonts/seguisb.ttf')
for name, title, color in items:
    frames = []
    for step in range(12):
        phase = step / 12 * math.tau
        image = Image.new('RGB', (280, 168), '#181b2d')
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((5, 5, 274, 162), radius=22, outline=color, width=2)
        for i in range(7):
            x = 92 + i * 16
            height = 8 + int(15 * (1 + math.sin(phase + i * .65)))
            draw.rounded_rectangle((x, 128-height//2, x+7, 128+height//2), radius=3, fill=color)
        font = ImageFont.truetype(str(font_path), 38)
        bounds = draw.textbbox((0, 0), title, font=font)
        draw.text(((280-(bounds[2]-bounds[0]))/2, 46 + int(4*math.sin(phase))), title, font=font, fill=color)
        for i in range(4):
            x = 24 + i * 73
            y = 25 + int(5*math.sin(phase+i))
            draw.ellipse((x, y, x+4, y+4), fill=color)
        frames.append(image.quantize(colors=48))
    frames[0].save(target / f'{name}.png')
    frames[0].save(target / f'{name}.gif', save_all=True, append_images=frames[1:], duration=90, loop=0, optimize=True)
