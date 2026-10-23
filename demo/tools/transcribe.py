"""Transcribe voiceover files with word timestamps: python transcribe.py out.json a.mp3 [b.mp3 ...]"""
import json
import sys

from faster_whisper import WhisperModel

out, files = sys.argv[1], sys.argv[2:]
# CPU: the CUDA runtime (cublas) isn't installed on this machine.
model = WhisperModel("large-v3", device="cpu", compute_type="int8")

result = []
for f in files:
    segments, info = model.transcribe(f, language="en", word_timestamps=True, vad_filter=False)
    words = []
    for seg in segments:
        for w in seg.words:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    result.append({"file": f, "duration": info.duration, "words": words})
    print(f"== {f} ({info.duration:.1f}s)")
    print(" ".join(w["w"] for w in words))
json.dump(result, open(out, "w", encoding="utf-8"), indent=1)
