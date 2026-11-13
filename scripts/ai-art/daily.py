"""Generates the next scenes in the queue into scripts/ai-art/pending/ for review.

Stops at the first refusal (the free GPU allowance is about 7 images a day; it refills over 24h).
Usage: python3 scripts/ai-art/daily.py [max]
Then look at pending/*.webp and accept the good ones: python3 scripts/ai-art/accept.py <name> ...
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, "scenes.json")))
pending = os.path.join(HERE, "pending")
os.makedirs(pending, exist_ok=True)
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 7
made = 0
for i, name in enumerate(cfg["queue"]):
    if made >= limit:
        break
    if name in cfg["done"] or os.path.exists(os.path.join(pending, name + ".webp")):
        continue
    prompt = f"{cfg['scenes'][name]}. {cfg['style']}"
    seed = 3000 + i
    r = subprocess.run([sys.executable, os.path.join(HERE, "flux.py"), os.path.join(pending, name + ".webp"), str(seed), "1280", "720", prompt], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"stopped at {name}: {(r.stderr or r.stdout).strip()[:120]} (allowance used up?)")
        break
    print("made", name)
    made += 1
print(f"{made} new; {len([q for q in cfg['queue'] if q not in cfg['done']])} still to do")
