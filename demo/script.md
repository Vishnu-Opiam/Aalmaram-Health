# Aalmaram Health — demo video script

About a minute and a half. Eight scenes. Read at a calm, unhurried pace.

**How to record:** one take is fine. Leave a clear pause (about 2 seconds) between scenes so I can
find the joins. Or send one file per scene (`scene-1.m4a` … `scene-8.m4a`). Any format works
(m4a, mp3, wav). A quiet room and the phone held about a hand's width from your mouth is enough.

| # | Scene | Voiceover | On screen |
| --- | --- | --- | --- |
| 1 | Welcome | We bring people from abroad to Kerala for preventive health care — check-ups and consultations with senior doctors — with wellness and Kerala's culture woven around it. | The client's home page, "Hello, Elena", the Kerala scene. |
| 2 | My trip | The first screen answers the question that matters most: what happens next? Elena sees her trip, the five steps to get there, the appointments her team has arranged, and the one person she can always reach. | Scroll to the step tracker, the appointments, the contact card. |
| 3 | Day by day | Her days read like a printed itinerary. She taps anything to see exactly what it is: when and where, who she'll see, what she receives, and what it costs. | Day by day; open the blood panel; the details panel. |
| 4 | Adding something | The health appointments are fixed by our team; the rest of the trip is hers to shape. On a free day she gets a few ideas, picks one, chooses morning, afternoon or evening — and it's in her plan. No dragging, no forms, and the price updates as she goes. | Day 4 → Add something → Kathakali → Evening → Add to my trip → "Just added", the new total. |
| 5 | Ask us | She can also just say what she enjoys. Our assistant suggests experiences from providers we know and trust — and her personal contact is always right there when she'd rather talk to a person. | Ask us; typing "We'd love to see the backwaters"; the ideas; the personal contact card. |
| 6 | Review and confirm | When she's happy, she sees the whole trip and its price on one page, and confirms. Nothing is booked until she does. | Review your trip → Yes, confirm my trip → step 3 of 5. |
| 7 | Behind the scenes | Behind the scenes, our team manages every provider: their locations, their practitioners, what each experience includes. As each booking is confirmed with the clinic, Elena sees a green tick. | Admin: a provider's profile; the trip; booking set to confirmed; the client's green tick "Booked". |
| 8 | Close | Aalmaram Health. Care and culture in Kerala, simply arranged. | Back on My trip. |

All names, providers and prices in the demo are fictional sample data.

## Re-making the video

Needs the local Postgres (`npm run db:start`), ffmpeg, and Python with `opencv-python`, `numpy`, `Pillow`
and `faster-whisper`. Media stays out of git (`demo/out/`, `demo/vo/`).

1. `npm run build`, then start the production server on port 3200 against the `aalmaram_e2e` database:
   `DATABASE_URL=postgresql://aalmaram:aalmaram@localhost:5433/aalmaram_e2e APP_URL=http://localhost:3200 npx next start -p 3200`.
   The recorder resets that database itself.
2. Put the voiceover in `demo/vo/` and find the scenes in it:
   `python demo/tools/transcribe.py demo/vo/words.json demo/vo/vo-a.mp3 demo/vo/vo-b.mp3`, then
   `python demo/tools/vo_scenes.py demo/vo/words.json demo/vo/scenes.json`
   (edit `STARTS` there if the wording changes).
3. Record a take: `node demo/tools/record.mjs demo/out/take1` (about 8 minutes; it runs four times
   slower than real time for smooth 60 fps).
4. Fit each scene to its line: `python demo/tools/timing.py demo/out/take1 demo/vo/scenes.json demo/out/timing.json`,
   record again with `node demo/tools/record.mjs demo/out/take2 demo/out/timing.json`, and repeat step 4
   with `--refine` if a scene is still off.
5. Render: `python demo/tools/compose.py demo/out/take2 demo/out/aalmaram-demo.mp4 --vo demo/vo/scenes.json`.
