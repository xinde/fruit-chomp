"""Package only the game, local launcher, and license information for distribution."""
from pathlib import Path
import sys
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
files = ["index.html", "game.css", "game.js", "scene.js", "camera.js", "offline.js",
         "manifest.webmanifest", "sw.js", "start-offline.py", "README.md", "LICENSE", "THIRD_PARTY.md"]
for folder in ["assets", "vendor"]:
    files.extend(sorted(p.relative_to(root).as_posix() for p in (root / folder).rglob("*") if p.is_file()))
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, "fruit-chomp/" + name)
print(output)
