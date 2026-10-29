"""Per-scene hold factors so each scene lasts as long as its voiceover.

python timing.py <takeDir> scenes.json timing.json

A scene's length = fixed time (moves, clicks, page loads) + its holds. The
next take scales the holds so the scene ends about LEAD + TAIL after its
narration; scene 8 gets a longer tail to close on.
"""
import json
import sys

LEAD, TAIL, LAST_TAIL = 0.35, 0.7, 2.2

take, vo_path, out = sys.argv[1:4]
tl = json.load(open(f"{take}/timeline.json", encoding="utf-8"))
slow = tl["slow"]
vt = lambda ms: ms / slow / 1000
starts = {e["scene"]: vt(e["t"]) for e in tl["events"] if e["type"] == "scene"}
end = next(vt(e["t"]) for e in tl["events"] if e["type"] == "end")
holds = {}
for e in tl["events"]:
    if e["type"] == "hold":
        holds[e["scene"]] = holds.get(e["scene"], 0) + e["ms"] / slow / 1000

prev = json.load(open(out, encoding="utf-8")) if len(sys.argv) > 4 and sys.argv[4] == "--refine" else {}
vo = {c["scene"]: c["dur"] for c in json.load(open(vo_path, encoding="utf-8"))}
order = sorted(starts, key=int)
factors = {}
for i, sc in enumerate(order):
    dur = (starts[order[i + 1]] if i + 1 < len(order) else end) - starts[sc]
    h = holds.get(sc, 0)
    target = LEAD + vo[sc] + (LAST_TAIL if i == len(order) - 1 else TAIL)
    base = prev.get(sc, 1.0)
    f = max(0.25, min(4.0, base * (target - (dur - h)) / h)) if h else 1.0
    factors[sc] = round(f, 3)
    print(f"scene {sc}: now {dur:5.1f}s (holds {h:4.1f}s), voice {vo[sc]:4.1f}s → target {target:4.1f}s, holds ×{f:.2f}")
json.dump(factors, open(out, "w"), indent=1)
