#!/usr/bin/env python3
"""Misst den Bestand der Quelltext-Substring-Tests im Backend."""
import os
import re
import subprocess

ROOT = "/home/d1sk/team4s/backend"
SEC = re.compile(
    r"permission|authz|capability|role_capabilit|preview|403|forbidden|"
    r"effective_right|whitelist|delegation|role_catalog|reserved",
    re.I,
)

files = subprocess.run(
    ["grep", "-rl", "--include=*_test.go", "os.ReadFile", ROOT],
    capture_output=True, text=True,
).stdout.split()

rows = []
for f in sorted(files):
    src = open(f, encoding="utf-8", errors="replace").read()
    # nur Dateien, die wirklich eine .go-Quelle einlesen
    reads = re.findall(r'os\.ReadFile\(\s*"([^"]+\.go)"', src)
    reads += re.findall(r"os\.ReadFile\(\s*filepath\.Join\([^)]*\.go\"", src)
    if not reads:
        continue
    contains = len(re.findall(r"strings\.Contains\(", src))
    funcs = len(re.findall(r"^func Test", src, re.M))
    rel = os.path.relpath(f, ROOT)
    sec = bool(SEC.search(rel)) or bool(SEC.search(src[:4000]))
    rows.append((rel, contains, funcs, sec))

print("GESAMT Dateien mit .go-Quelltext-Lesen:", len(rows))
print("strings.Contains gesamt:", sum(r[1] for r in rows))
print("Testfunktionen gesamt:", sum(r[2] for r in rows))
print()
sec_rows = [r for r in rows if r[3]]
print("=== SICHERHEITSRELEVANT (%d) ===" % len(sec_rows))
for rel, c, fn, _ in sorted(sec_rows, key=lambda r: -r[1]):
    print("  %-75s contains=%-4d funcs=%d" % (rel, c, fn))
print()
print("=== UEBRIGE (%d) ===" % (len(rows) - len(sec_rows)))
for rel, c, fn, _ in sorted([r for r in rows if not r[3]], key=lambda r: -r[1]):
    print("  %-75s contains=%-4d funcs=%d" % (rel, c, fn))
