"""Turn a recorded take into the finished video.

python compose.py <takeDir> <out.mp4> [--vo scenes.json] [--preview SECONDS]

Frames are 2x captures (2880x1800) of a 1440x900 viewport, stamped with wall
time; dividing by the take's SLOW factor gives video time. Each output frame
(1920x1080, 60 fps) is: branded background, a soft shadow, a light window bar
with the address, the page, and a camera that eases into the zooms the
recorder asked for. Voiceover clips (vo_scenes.py) are placed at the start of
their scene.
"""
import bisect
import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = 60
OW, OH = 1920, 1080          # output
S = 2                        # canvas scale (canvas is rendered at 2x for crisp zooms)
CW, CH = OW * S, OH * S
VX, VY, VW, VH = 240, 108, 1440, 900   # page rect in output units
BAR = 36                     # window bar height (output units)
RADIUS = 14
DOMAIN = "aalmaram-health.vercel.app"

args = sys.argv[1:]
take, out = args[0], args[1]
vo_path = args[args.index("--vo") + 1] if "--vo" in args else None
preview = float(args[args.index("--preview") + 1]) if "--preview" in args else None

timeline = json.load(open(os.path.join(take, "timeline.json"), encoding="utf-8"))
slow = timeline["slow"]
vt = lambda ms: ms / slow / 1000.0
frames = [(vt(f["t"]), f) for f in timeline["frames"]]
events = [dict(e, vt=vt(e["t"])) for e in timeline["events"]]
end_t = next(e["vt"] for e in events if e["type"] == "end") + 0.4
if preview:
    end_t = min(end_t, preview)

# ----------------------------------------------------------------- static art
def background():
    y, x = np.mgrid[0:CH, 0:CW].astype(np.float32)
    k = (x / CW * 0.6 + y / CH * 0.4)
    a = np.array([18, 48, 42], np.float32)      # forest-900 (RGB)
    b = np.array([31, 102, 112], np.float32)    # lagoon-600
    img = a + (b - a) * k[..., None]
    def glow(cx, cy, r, rgb, alpha):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
        w = np.clip(1 - d, 0, 1) ** 2 * alpha
        return w[..., None] * (np.array(rgb, np.float32) - img)
    img += glow(CW * 0.92, CH * 0.05, CW * 0.55, (214, 143, 31), 0.22)   # marigold, top right
    img += glow(CW * 0.05, CH * 1.0, CW * 0.5, (63, 109, 43), 0.18)      # leaf, bottom left
    img += np.random.default_rng(7).normal(0, 1.2, img.shape)            # no banding
    return np.clip(img, 0, 255).astype(np.uint8)[..., ::-1].copy()       # BGR

def rounded_mask(w, h, r, top=True, bottom=True):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255,
                                        corners=(top, top, bottom, bottom))
    return np.asarray(m, np.float32) / 255.0

wx, wy, ww, wh = VX * S, (VY - BAR) * S, VW * S, (VH + BAR) * S
base = background()

# Shadow under the whole window.
shadow = np.zeros((CH, CW), np.float32)
shadow[wy:wy + wh, wx:wx + ww] = rounded_mask(ww, wh, RADIUS * S)
shadow = np.roll(shadow, 36, axis=0)
shadow = cv2.GaussianBlur(shadow, (0, 0), 48) * 0.55
base = (base * (1 - shadow[..., None])).astype(np.uint8)
window_mask = rounded_mask(ww, wh, RADIUS * S)

font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13 * S)
bars = {}
def bar_for(url):
    path = url.split("//", 1)[-1].split("/", 1)
    path = "/" + path[1].split("?")[0].split("#")[0] if len(path) > 1 else ""
    key = path
    if key in bars:
        return bars[key]
    img = Image.new("RGB", (ww, BAR * S), (244, 241, 234))
    d = ImageDraw.Draw(img)
    for i, rgb in enumerate([(236, 106, 94), (244, 190, 79), (98, 197, 84)]):
        cx, cy, r = (20 + i * 20) * S, BAR * S // 2, 6 * S
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgb)
    pw, ph = 520 * S, 24 * S
    px, py = (ww - pw) // 2, (BAR * S - ph) // 2
    d.rounded_rectangle((px, py, px + pw, py + ph), ph // 2, fill=(231, 225, 213))
    text = DOMAIN + path
    tw = d.textlength(text, font=font)
    tx = px + (pw - tw) / 2 + 8 * S
    # Padlock: a small body and shackle.
    lx, ly = tx - 15 * S, py + ph / 2
    d.rounded_rectangle((lx, ly - 2 * S, lx + 8 * S, ly + 5 * S), 2 * S, fill=(107, 101, 89))
    d.arc((lx + 1.5 * S, ly - 7 * S, lx + 6.5 * S, ly + 1 * S), 180, 360, fill=(107, 101, 89), width=int(1.6 * S))
    d.text((tx, py + ph / 2), text, font=font, fill=(75, 70, 61), anchor="lm")
    bars[key] = np.asarray(img)[..., ::-1].copy()
    return bars[key]

def compose(page_bgr, url):
    canvas = base.copy()
    win = np.empty((wh, ww, 3), np.uint8)
    win[: BAR * S] = bar_for(url)
    win[BAR * S:] = page_bgr
    region = canvas[wy:wy + wh, wx:wx + ww].astype(np.float32)
    a = window_mask[..., None]
    canvas[wy:wy + wh, wx:wx + ww] = (win * a + region * (1 - a)).astype(np.uint8)
    # Hairline under the bar.
    canvas[wy + BAR * S - 1: wy + BAR * S + 1, wx:wx + ww] = (213, 203, 185)
    return canvas

# ----------------------------------------------------------------- camera
ease = lambda k: 4 * k ** 3 if k < 0.5 else 1 - (-2 * k + 2) ** 3 / 2
zooms = [e for e in events if e["type"] == "zoom"]
urls = [e for e in events if e["type"] == "url"]

frame_times = [ft for ft, _ in frames]
def cursor_at(t):
    f = frames[max(0, bisect.bisect_right(frame_times, t) - 1)][1]
    return VX + f["cx"], VY + f["cy"]

def url_at(t):
    u = urls[0]["url"] if urls else ""
    for e in urls:
        if e["vt"] <= t:
            u = e["url"]
    return u

def target(e, t):
    z = e["z"]
    if z <= 1.001:
        return 1.0, OW / 2, OH / 2
    if e["at"]:
        return z, VX + e["at"][0], VY + e["at"][1]
    return (z, *cursor_at(t))

def clamp(z, cx, cy):
    hw, hh = OW / 2 / z, OH / 2 / z
    return z, min(max(cx, hw), OW - hw), min(max(cy, hh), OH - hh)

cam_start = {}
def camera(t):
    z0, x0, y0 = 1.0, OW / 2, OH / 2
    for i, e in enumerate(zooms):
        if e["vt"] > t:
            break
        if i not in cam_start:
            cam_start[i] = (z0, x0, y0)
        sz, sx, sy = cam_start[i]
        k = ease(min(1.0, (t - e["vt"]) / e["dur"]))
        tz, tx, ty = target(e, t)
        # Zoom on a log scale so in and out feel equally paced.
        z0 = math.exp(math.log(sz) + (math.log(tz) - math.log(sz)) * k)
        x0, y0 = sx + (tx - sx) * k, sy + (ty - sy) * k
    return clamp(z0, x0, y0)

# ----------------------------------------------------------------- render
enc = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}",
     "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
     "-movflags", "+faststart", out + ".video.mp4"],
    stdin=subprocess.PIPE,
)

n_out = int(end_t * FPS)
fi = 0
cached_key, cached = None, None
for n in range(n_out):
    t = n / FPS
    while fi + 1 < len(frames) and frames[fi + 1][0] <= t:
        fi += 1
    url = url_at(t)
    key = (frames[fi][1]["file"], url)
    if key != cached_key:
        page = cv2.imread(os.path.join(take, "frames", frames[fi][1]["file"]), cv2.IMREAD_COLOR)
        cached, cached_key = compose(page, url), key
    z, cx, cy = camera(t)
    hw, hh = OW / 2 / z * S, OH / 2 / z * S
    x0, y0 = cx * S - hw, cy * S - hh
    M = np.float32([[OW / (2 * hw), 0, -x0 * OW / (2 * hw)], [0, OH / (2 * hh), -y0 * OH / (2 * hh)]])
    frame = cv2.warpAffine(cached, M, (OW, OH), flags=cv2.INTER_AREA if z < 1.9 else cv2.INTER_LINEAR)
    fade = min(1.0, t / 0.5, (end_t - t) / 0.8)
    if fade < 1:
        frame = (frame * max(0.0, fade)).astype(np.uint8)
    enc.stdin.write(frame.tobytes())
    if n % 600 == 0:
        print(f"  {t:6.1f}s / {end_t:.1f}s", flush=True)
enc.stdin.close()
enc.wait()

# ----------------------------------------------------------------- audio
scene_t = {e["scene"]: e["vt"] for e in events if e["type"] == "scene"}
if vo_path:
    clips = json.load(open(vo_path, encoding="utf-8"))
    inputs, filters, labels = [], [], []
    voice_end = 0.0
    for i, c in enumerate(clips):
        # On its scene, but never on top of the previous line.
        at = max(scene_t[c["scene"]] + 0.35, voice_end + 0.15)
        voice_end = at + c["dur"]
        inputs += ["-i", c["file"]]
        filters.append(f"[{i + 1}:a]atrim={c['start']}:{c['end']},asetpts=PTS-STARTPTS,"
                       f"afade=t=in:d=0.05,afade=t=out:st={max(0, c['dur'] - 0.08)}:d=0.08,"
                       f"adelay={int(at * 1000)}:all=1[a{i}]")
        labels.append(f"[a{i}]")
        print(f"  scene {c['scene']}: voice {at:6.2f}–{at + c['dur']:6.2f}s, "
              f"scene ends {min([v for k, v in scene_t.items() if int(k) > int(c['scene'])] or [end_t]):6.2f}s")
    graph = ";".join(filters) + f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0[aout]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out + ".video.mp4", *inputs,
                    "-filter_complex", graph, "-map", "0:v", "-map", "[aout]", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-t", f"{end_t:.3f}", "-movflags", "+faststart", out], check=True)
    os.remove(out + ".video.mp4")
else:
    os.replace(out + ".video.mp4", out)
print("done:", out, f"{end_t:.1f}s")
