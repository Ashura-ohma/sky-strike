"""Reassemble the lossless artwork from repository-sized binary parts."""
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parent.parent
parts=sorted((root/'asset-parts').glob('heroes-atlas.*'))
data=b''.join(p.read_bytes() for p in parts)
expected='7ba539ead4d9abc21340157f168a7befa17753fa07b95742aaa9ad80ce2424c3'
if hashlib.sha256(data).hexdigest()!=expected:
    raise SystemExit('Portrait asset is missing or corrupt')
output=root/'android/app/src/main/assets/art/heroes-atlas.png'
output.parent.mkdir(parents=True,exist_ok=True)
output.write_bytes(data)
print(f'Prepared portrait atlas: {len(data)} bytes')
