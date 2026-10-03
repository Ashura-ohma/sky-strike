"""Reassemble the lossless artwork from repository-sized binary parts."""
from pathlib import Path
import hashlib
import json
root=Path(__file__).resolve().parent.parent
for entry in json.loads((root/'asset-parts/manifest.json').read_text()):
    data=b''.join((root/p).read_bytes() for p in entry['parts'])
    if hashlib.sha256(data).hexdigest()!=entry['sha256']:
        raise SystemExit(f"Bundled art is missing or corrupt: {entry['output']}")
    output=root/entry['output']
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(data)
    print(f'Prepared {output.name}: {len(data)} bytes')
