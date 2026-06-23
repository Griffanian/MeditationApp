#!/usr/bin/env python
"""Watch preassemble_demo progress. Run from app/backend/."""
import os
import sys
import time
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from meditations.models import AssembledOutput, Meditation, Stage  # noqa: E402

TOTAL = 49

m = Meditation.objects.get(name="box-breathing")
s = Stage.objects.get(meditation=m, stage_id="box-breathing")

print("Watching preassemble_demo progress (Ctrl+C to stop)\n")

prev = -1
while True:
    n = AssembledOutput.objects.filter(meditation=m, stage=s).count()
    bar = ("█" * n) + ("░" * (TOTAL - n))
    pct = n / TOTAL * 100
    line = f"\r[{bar}] {n}/{TOTAL} ({pct:.0f}%)"
    if n != prev:
        line += "  ✓ new"
        prev = n
    sys.stdout.write(line + "   ")
    sys.stdout.flush()
    if n >= TOTAL:
        print("\n\nDone!")
        break
    time.sleep(3)
