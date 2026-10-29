"""Find where each scene's narration starts and ends in the voiceover files.

python vo_scenes.py words.json scenes.json
"""
import json
import re
import subprocess
import sys

# First words of each scene, as spoken (see demo/script.md; Vishnu's edited VO).
STARTS = {
    "1": "we bring people from abroad",
    "2": "the first screen answers",
    "3": "her days read like",
    "4": "the health appointments are fixed",
    "5": "can also just say",
    "6": "when she's happy",
    "7": "behind the scenes",
    "8": "health care and culture in kerala",
}

files = json.load(open(sys.argv[1], encoding="utf-8"))
norm = lambda w: re.sub(r"[^a-z']", "", w.lower())

found = []
for f in files:
    words = [norm(w["w"]) for w in f["words"]]
    for scene, phrase in STARTS.items():
        target = phrase.split()
        for i in range(len(words) - len(target) + 1):
            if words[i : i + len(target)] == target:
                found.append({"scene": scene, "file": f["file"], "i": i})
                break

found.sort(key=lambda x: int(x["scene"]))
assert [x["scene"] for x in found] == list(STARTS), f"missing scenes: {found}"

def silences(path):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "silencedetect=noise=-38dB:d=0.15", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
    return list(zip(starts, ends))

def cut(path, prev_end, next_start):
    """Middle of the pause between two scenes, so no word is clipped."""
    mid = (prev_end + next_start) / 2
    near = [(a, b) for a, b in silences(path) if b >= mid - 0.6 and a <= mid + 0.6]
    if near:
        a, b = min(near, key=lambda ab: abs((ab[0] + ab[1]) / 2 - mid))
        return round((a + b) / 2, 3)
    return round(mid, 3)

scenes = []
for n, item in enumerate(found):
    f = next(x for x in files if x["file"] == item["file"])
    words = f["words"]
    i = item["i"]
    # "Aalmaram" (scene 8) and "She" (scene 5) are mis-heard: back up to the true first word.
    if item["scene"] in ("5", "8"):
        i = max(0, i - 1)
    nxt = found[n + 1] if n + 1 < len(found) and found[n + 1]["file"] == item["file"] else None
    j = (nxt["i"] - (1 if nxt["scene"] in ("5", "8") else 0)) if nxt else None
    last = j - 1 if nxt else len(words) - 1
    start = cut(f["file"], words[i - 1]["e"], words[i]["s"]) if i > 0 else 0.0
    end = cut(f["file"], words[last]["e"], words[j]["s"]) if nxt else round(f["duration"], 3)
    scenes.append({"scene": item["scene"], "file": item["file"], "start": start, "end": end,
                   "dur": round(end - start, 3), "text": " ".join(w["w"] for w in words[i : last + 1])})

json.dump(scenes, open(sys.argv[2], "w", encoding="utf-8"), indent=1)
for s in scenes:
    print(f'{s["scene"]}  {s["start"]:6.2f}–{s["end"]:6.2f}  ({s["dur"]:5.2f}s)  {s["text"][:70]}')
