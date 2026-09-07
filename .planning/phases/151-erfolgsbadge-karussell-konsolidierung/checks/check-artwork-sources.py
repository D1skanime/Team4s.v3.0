"""Fail if any of Phase151's107 original artwork files changes or disappears."""
from pathlib import Path
import hashlib
import json

checks = Path(__file__).resolve().parent
repository = checks.parents[3]
rows = json.loads((checks / "original-artwork.json").read_text())
assert len(rows) == 107 and len({row["path"] for row in rows}) == 107
failed = []
for row in rows:
    path = repository / row["path"]
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
        failed.append(row["path"])
if failed:
    raise SystemExit("Original artwork changed or missing: " + ", ".join(failed))
print("PASS: all107 original artwork SHA256 values are unchanged.")
