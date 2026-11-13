"""Generate one image with the public FLUX.1-schnell space (Apache-2.0 model).
Usage: python3 flux.py <out.jpg> <seed> <width> <height> <prompt...>"""
import json
import sys
import time
import urllib.request

BASE = "https://evalstate-flux1-schnell.hf.space/gradio_api"
out, seed, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
prompt = " ".join(sys.argv[5:])


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))


ev = post(f"{BASE}/call/infer", {"data": [prompt, seed, False, w, h, 4]})["event_id"]
result = None
with urllib.request.urlopen(f"{BASE}/call/infer/{ev}", timeout=300) as r:
    event = None
    for raw in r:
        line = raw.decode().strip()
        if line.startswith("event:"):
            event = line[6:].strip()
        elif line.startswith("data:"):
            data = line[5:].strip()
            if event == "complete":
                result = json.loads(data)
                break
            if event == "error":
                sys.exit(f"error: {data}")
if not result:
    sys.exit("no result")
img = result[0]
url = img.get("url") if isinstance(img, dict) else None
if not url:
    sys.exit(f"unexpected result: {str(result)[:300]}")
urllib.request.urlretrieve(url, out)
print("ok", out)
