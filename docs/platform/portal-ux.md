# Client portal — UX plan and stress test (23 Oct 2026)

> Why this exists: Vishnu's review of the portal (23 Oct) — "very inefficient, very inorganic … lots of
> information, lots of tools here and there … confusing". This file is the reasoning behind the redesign:
> who the client is, what they need, the structure that follows, and the stress test it had to pass
> before it was built. Visual references (Roavia, fitplan, the hotel app, HillView AI) set the *look*;
> this file sets the *structure*.

## 1. Who we are designing for

International clients, mostly **50–75**, coming to Kerala for **diagnostic and preventive health care**
with wellness and culture around it (notebook §2, §5). Premium, referral-led, each with a named
relationship manager. They are not the people who enjoy configuring software.

What research and our own calls say about them:

| Finding | Source | What it means for us |
| --- | --- | --- |
| Older users are slower and less successful on websites; the main cause is the time it takes to *scan and understand* a page. | NN/g senior usability research (2001–2019) | Fewer things per screen; the answer to "what's next?" must be the first thing read. |
| They make more mistakes and **blame themselves**; error messages are often missed. | NN/g | No hidden gestures, in-app confirmations, plain words, always a way back. |
| Tiny type, light grey text and small targets remain the commonest problem, especially on phones. | NN/g | 18 px body, no text lighter than ink-600, targets ≥ 48 px. |
| Icons must carry words; hidden menus (hamburger) are often missed. | Smashing (2024), uxdesign.cc guides | Four labelled tabs, always visible; every icon has a label. |
| Touch selection errors (missing, slipping off) are much more common for older adults; drag works only with lowered precision. | Sultana & Moffatt; Motti et al. | No action needs a drag. |
| **Trust** is the top factor in medical travel: cost transparency, clear communication, who the professionals are, what happens if something goes wrong. | Medical tourism surveys (2024) | The human contact, the health appointments and the total price sit on the first screen. |
| The stress of diagnosis and travel to a new place makes medical travellers feel overwhelmed and isolated. | Medical tourism literature | Reassuring copy ("nothing is booked until you confirm"); a named person, not a bot, as the main contact. |
| Nivedith: "above 50 … big items … as simple as possible"; every client has a relationship point. | Call, 14 Oct | Same. |

## 2. What they come to the portal to find out (in order)

1. **Is everything in order — do I need to do anything?** (status, next step)
2. **When and where is each thing?** Above all, the health appointments.
3. **Who do I talk to?** A name, not a form.
4. **What will it cost?** One total, broken down when asked.
5. **Can I add something nice?** Optional, guided, never required.
6. **What is Kerala like?** Inspiration — welcome, but not before 1–5.

The old portal answered these in roughly the reverse order: Feed first, then a board of ten day columns,
an ideas rail with drag-and-drop, a chat bar docked over everything, and a confirm button at the top.

## 3. The structure

Four tabs, labelled, always visible (top bar on wide screens, bottom bar on phones):

| Tab | Route | Answers |
| --- | --- | --- |
| **My trip** (home) | `/trip` | 1, 3, 4, the health part of 2 — "what's next" step tracker, health appointments, contact person, note from them, travel guide, a taste of Kerala |
| **Day by day** | `/trip/itinerary` | 2, 4, 5 — the plan read like a printed itinerary, one day under another |
| **Ask us** | `/trip/chat` | 3, 5 — the relationship manager first, then the assistant |
| **Kerala** | `/trip/kerala` | 6 — the feed |

Rules every screen follows:

- **One primary action per screen**, a dark pill button; everything else is secondary.
- **Words over symbols.** Ticks stay (Vishnu's ✓✓ / green ✓), always with words: "Being booked", "Booked".
- **No drag, no hover, no hidden gesture.** Moving is "Change day or time" with big day buttons.
- **Back always works.** Detail and add panels put themselves in the URL, so the browser's Back button closes them instead of leaving the page.
- **Confirm in the app, not in a browser pop-up.** A review page shows the whole trip and price, explains what happens next, and asks once.
- **Feedback after every action:** the page returns to the day with the new item highlighted ("Just added").
- **Calm empty states:** an empty day is "A free day — rest, or add something", not a hole to fill.

### Day by day, in detail

```
Ten days in Kerala …                                   €955 · [Review and confirm]
7 – 16 Dec · 1 traveller
[ Mon 7 ][ Tue 8 ][ Wed 9 ] …                            ← shortcuts, optional

Day 1 · Monday 7 December
  08:00  Comprehensive Blood Panel          Arranged for you
         Diagnostics · Fort Kochi · 30 min
  10:30  Fort Kochi Heritage Walking Tour   Arranged for you
         Walking tours · 2 h 30 min
  + Add something to this day

Day 4 · Thursday 10 December
  A free day — rest, explore at your own pace, or add something.
  + Add something to this day
```

- Tap a row → details: When, Where, Who you'll see, What you receive, Price, About the provider;
  then "Change day or time" / "Remove from my trip" for their own items, "Ask Arjun" for the team's.
- "Add something" → *ideas for this day* first, then three big choices (Health · Wellness · Culture),
  then the list, then **when**: Morning / Afternoon / Evening (or an exact time) → "Add to my trip".
- One AI action, in words: **"Suggest things for my free days"**. Suggestions are labelled and removable.

## 4. Stress test

Three people, fifteen situations. A plan had to pass all of them before it was built.

- **Margaret, 68, UK, iPad, reading glasses**, first time in India; cardiac check-up and some Ayurveda.
- **Hans, 72, Germany, laptop, English is his second language, slight tremor.**
- **Marc, 58, France, phone**, travelling with his partner; trip confirmed, a week before departure.

### Versions that failed

| Version | Failed on | Why |
| --- | --- | --- |
| v1 — keep the board, make it bigger | S2, S4, S9 | Finding "my blood test" means scanning a grid; moving still invites drag; ten columns don't fit a phone. |
| v2 — day list, keep the docked chat and the ideas rail | S1, S9, S10 | Landing on the Feed doesn't say what's next; a fixed chat bar plus a phone's tab bar leaves half a screen; three competing "add" paths (rail, chat, +). |
| v3 — four tabs, home first, day list, chat on its own tab | — | Below. |

### v3 results

| # | Situation | Path in v3 | Result |
| --- | --- | --- | --- |
| S1 | Margaret opens the invite link for the first time. | Lands on **My trip**: "Hello, Margaret", trip, 45 days to go, step 1 of 5 "Plan your days", one sentence, one button. | Pass — what/when/next in one screen. |
| S2 | "When is my blood test, and where?" | My trip → *Your health appointments* lists date, time, place. | Pass — zero taps. |
| S3 | Add a Kathakali evening on day 4. | Day by day → Day 4 "Add something" → idea card (or Culture → Performing arts) → Evening → Add to my trip. | Pass — 4–5 taps, no typing, no drag. |
| S4 | Hans, with a tremor, moves the dinner to another day. | Row → Change day or time → day button → Save. | Pass — 48 px+ targets, no drag. |
| S5 | Hans presses the browser's Back button with details open. | Details close; he stays on the page. | Pass (URL holds the open panel). |
| S6 | Margaret is unsure and wants a person. | "Ask us" tab, or the contact card on My trip → "Ask Arjun to contact me". | Pass — always one tap away. |
| S7 | Marc, a week before: "is everything booked?" | My trip → step 4 "Booking: 2 of 3 booked"; Day by day shows ✓ Booked / ✓✓ Being booked in words. | Pass. |
| S8 | Margaret removes something by mistake. | Remove asks in place: "Remove it?" Yes / Keep it. | Pass — confirm before loss. (No undo after; acceptable for a one-tap re-add.) |
| S9 | Marc on a small phone. | Single column, 18 px text, bottom tab bar, panels full screen. | Pass. |
| S10 | Keyboard / screen-reader user. | Real headings per day, list rows are buttons with full names, dialogs close on Esc and return focus. | Pass. |
| S11 | No trip yet / no activities yet. | "Arjun is preparing your trip …" with the contact card and Kerala below. | Pass. |
| S12 | Long names ("Kathakali Performance with Make-Up Demonstration"). | Titles wrap, nothing is clipped. | Pass. |
| S13 | Two trips. | Trip chips at the top of My trip and Day by day; the choice follows across tabs. | Pass. |
| S14 | Margaret presses "Review and confirm" by accident. | Review page; nothing happens until "Yes, confirm my trip". | Pass. |
| S15 | Hans asks the assistant about his MRI. | Assistant deflects to the team (existing medical-question check). | Pass. |

### Accessibility checks the build must meet

Body 18 px, secondary ≥ 16 px; text colours ink-600 or darker on white (≈ 9:1); targets ≥ 48 px;
every icon labelled; no hover-only content; `prefers-reduced-motion` honoured; Esc closes panels.

### Residual risks (accepted, or for the team)

- **No photos yet.** The look relies on an illustrated Kerala scene; real photography of our providers would do more for trust.
- **The relationship manager has no phone number or photo in the system** — older clients will want to call. A `phone` (and WhatsApp) on staff is a small schema change for the team to approve.
- Day shortcuts scroll sideways on phones; they are only shortcuts, the page scrolls anyway.
- English only; Croatian / German / Slovenian (notebook §12.3) are not addressed.
