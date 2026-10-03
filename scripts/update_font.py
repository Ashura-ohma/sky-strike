"""Developer utility: rebuild the offline Chinese font subset after UI copy changes."""
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'android/app/src/main/assets'
text = ''.join(p.read_text(encoding='utf-8') for p in ASSETS.iterdir()
               if p.suffix in ('.mjs', '.html', '.css'))
glyphs = ''.join(sorted(set(re.findall(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]', text))))
glyphs += '·—…→✓★☆'
url = 'https://fonts.googleapis.com/css2?' + urllib.parse.urlencode({
    'family': 'Noto Sans SC:wght@400', 'display': 'swap', 'text': glyphs})
with urllib.request.urlopen(url, timeout=45) as response:
    css = response.read().decode('utf-8')
font_url = re.search(r'url\(([^)]+)\)', css).group(1)
if not font_url.startswith('https://fonts.gstatic.com/'):
    raise ValueError('Unexpected font download host')
with urllib.request.urlopen(font_url, timeout=45) as response:
    font = response.read()
if font[:4] not in (b'\x00\x01\x00\x00', b'OTTO', b'wOFF', b'wOF2'):
    raise ValueError('Downloaded file is not a font')
(ASSETS / 'vendor/noto-sc-subset.ttf').write_bytes(font)
print(f'Updated {len(glyphs)} glyphs, {len(font)} bytes; font remains bundled offline.')
