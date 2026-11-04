# Public website — research, audit and design direction (for sign-off)

Date: 3 Nov 2026. Status: **approved by Vishnu with the recommended defaults (3 Nov); first build on `feat/site-redesign`.**
Scope: the public site at `/` (`src/app/(site)/`). Builds on the 2 Nov call notes
(`docs/platform/inputs/2026-11-02-website-call-notes.md`).

---

## 1. Research — what makes these sites trusted by careful, older visitors

| Finding | Source | What we do with it |
|---|---|---|
| Users 65+ were 43% slower on websites than 21–55s and made more errors; they read thoroughly rather than skim. | NN/g, *Usability for Senior Citizens: Improved, But Still Lacking*; NN/g *UX Design for Seniors* (87 guidelines) | Short sections, one idea each, plain headings that say what is below; no tiny controls; no time-limited or auto-advancing content. |
| Trust rests on design quality, **up-front disclosure**, comprehensive and current content, and connection to the rest of the web — unchanged since 1999 and across cultures. | NN/g, *Trustworthy Design* | Prices, our fee, what we don't do and how vetting works shown on the page, not behind a call. Remove "Coming soon" dead ends (they read as not current). Name real providers' accreditations, link out. |
| Hidden navigation lowers discoverability; older users rely on visible, labelled links. | NN/g on hidden navigation | All menu links visible on desktop; on phones a button labelled "Menu" (text, not an icon) plus a persistent "Free conversation" button. |
| Around one in five shoppers abandons when they don't trust a site with their details; perceived security depends on how a form *looks*. | Baymard, checkout usability / perceived security of payment forms | Booking form is short (≤6 fields), grouped, with plain "why we ask" notes and what happens next shown *before* submit. |
| Hick's law (fewer choices, faster decisions), Jakob's law (people expect conventions), aesthetic-usability effect (polished design is perceived as more usable and trustworthy), goal-gradient (show progress). | Laws of UX | One primary action everywhere; conventional header/footer; premium polish as a trust signal; numbered steps with "what happens next". |
| WCAG 2.2 adds Target Size (2.5.8, ≥24px), Focus Not Obscured (2.4.11 — sticky headers must not cover focus), Consistent Help (3.2.6 — contact in the same place on every page). | W3C, *What's New in WCAG 2.2* | We go further: 48px targets, sticky header with `scroll-padding`, phone + email in the header and footer of every page. |
| ASA/CAP: ads to UK consumers are bound by the CAP Code even from abroad; a medical-tourism agency was ruled misleading for an unsubstantiated "first-class medical care" line; traditional use doesn't substantiate a health claim; no specific advice/diagnosis even with a disclaimer. | ASA rulings (Operations Abroad); CAP health-claims guidance | No superlatives ("world-class", "best"), no outcome words ("heal", "cure", "detox"). Ayurveda described as what happens, not what it does for you. Comparative cost claims replaced with actual example prices. |

## 2. References — what to borrow

**WattBank (your main reference)** — the one to follow most closely.
1. *Framed hero that opens up:* the hero sits as a rounded card inset on a deep green page, and widens to full-bleed as you scroll. Feels calm and premium, and the frame says "a window onto a place". → our dawn backwater hero.
2. *Wordmark sandwiched in depth:* giant translucent letters sit *behind* the subject, so the foreground overlaps them. → "Kerala" set behind the palms, in front of the hills.
3. *Statement that reveals as you read:* one centred paragraph whose words darken with scroll. → our "concierge, not a clinic" statement (starting at AA contrast, never invisible).
4. *Sticky list + changing image:* a left list with an active bar while the right image swaps. → How it works and Your mix.
5. *Quiet system:* small eyebrow labels, soft grey rounded cards, one green palette. We keep that restraint but swap the monospace for serif + sans (monospace is harder to read for older eyes).

**Tourvia** — mountain occluding the wordmark (same depth trick), stats beside photos, testimonial card with photo, a big wordmark in the footer. Borrow: testimonial layout (for when we have them), footer wordmark.

**Mexico Islands** — aerial photo with the title rising out of it, then a side panel of places. Borrow: slow title rise on load (opacity + 12px only).

**Notosan / KAMUI (illustrated)** — layered painted scenes with parallax depth. Borrow: the *layer structure* for our hero, not the saturated palette or game feel.

**The North Face (EXPLORE)** — one huge word over landscape. Borrow nothing beyond the confidence of a single big word; the vertical side text and small social icons are wrong for this audience.

## 3. Audit of the current site, ranked by impact on booking a free conversation

1. **There is no real way to book.** "Book a free call" is a `mailto:` link (fails for many webmail users) or, without `CONTACT_EMAIL`, a dead `#talk` anchor with "Call booking opens soon". No phone number anywhere.
2. **The "person" is never shown.** The promise is a real person, but there are no faces, names or roles. This is the main trust driver for this audience.
3. **No photography.** The hero is a 35%-opacity SVG; Explore tiles are icons. Nothing shows the places or the providers.
4. **Vetting is one sentence** ("checked and know personally") — Nivedith's own note: European clients won't accept that.
5. **Prices only in euros**, while the UK is the biggest market.
6. **No sample journeys** (mix, length, price range) — visitors can't picture a trip.
7. **Nine sections of identical white cards.** No visual hierarchy, so nothing stands out and scanning is slow.
8. **Hero is long before the action:** 13-word headline plus three paragraphs; the waits-and-costs line leads with a problem.
9. **"Learn" shows three "Coming soon" cards** — signals an unfinished site.
10. **FAQ misses** safety, travel, payment and "what if something goes wrong".
11. **Phone layout has no menu at all** (links hidden below 1024px, no menu button).
12. **Footer** has no contact details, address or legal links.
13. Copy risk: "Private prices are often well below…" is a comparative claim that needs substantiation under CAP 3.7.

## 4. Design concept — "Under the banyan"

Aalmaram is the banyan: roots, shelter, a meeting place. The site should feel like being
welcomed into its shade: **deep green frame, warm kasavu-white inside, gold thread used sparingly.**
Calm layers you can look *into*, and one clear way to talk to a person.

### Palette (contrast measured on kasavu #F7F3EA)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| Kasavu | `#F7F3EA` | page background | — |
| Kasavu deep | `#EFE8D8` | tinted sections, cards | — |
| Ink | `#1E241F` | body text | 14.3:1 (AAA) |
| Ink soft | `#4A5048` | secondary text | 7.5:1 (AAA) |
| Banyan | `#1F3B2D` | headings, frame, dark sections | 11.0:1 |
| Palm | `#3E6B48` | Wellness, icons | 5.6:1 (AA) |
| Backwater teal | `#1F5F5B` | links, Health | 6.7:1 (AA) |
| Laterite | `#A2482E` | Culture, small accents only | 5.4:1 (AA) |
| Gold (text) | `#7A5C1E` | eyebrow labels | 5.6:1 (AA) |
| Gold (thread) | `#B08A3E` | hairlines, borders — never text | 2.9:1 (decorative) |
| Gold light | `#D9B86A` | primary button on Banyan | 6.4:1 |

These evolve the existing `sand/forest/teal/marigold/leaf` tokens rather than replace them, so the client portal (`/trip`) stays visually related.

### Type
- **Fraunces** (serif, already loaded for the portal) for headlines at weight 500, optical size on, `SOFT` 0 for a crisper, more elegant line.
- **Figtree** (sans, already loaded) for body: **19px** desktop / 18px phone, line-height 1.6, max 68 characters per line.
- Scale: H1 56/40px, H2 40/32px, H3 24/22px. Eyebrow labels 15px, letter-spaced, gold text.
- No new font downloads.

### Motion principles
- Slow: 600–900ms, ease-out; parallax travel ≤ 80px; nothing loops faster than 40s.
- Transform and opacity only; no spin, bounce, flash, autoplay carousels.
- Content and the call to action are visible on first paint; motion only enhances.
- **Implementation: CSS scroll-driven animations + `position: sticky`** (zero JS, runs off the main thread), with a tiny IntersectionObserver for fade-ups. Browsers without support get the static page. Recommended over GSAP/Framer Motion for the Lighthouse 90+ target; GSAP ScrollTrigger is the fallback if we hit limits.
- `prefers-reduced-motion: reduce` → everything static, mist still, no zoom. Phones: parallax off, fade-ups only.

### Motion scenes
1. **Dawn on the backwaters (hero).** Rounded framed card inset on Banyan green. Five layers: dawn sky → Ghats in mist → the word *Kerala* in translucent kasavu → palms and a kettuvallam → still water with reflection. On scroll the frame widens to full-bleed, hills drift slower than palms, mist drifts sideways on a 60s loop. Headline, line and CTA sit bottom-left on a soft scrim, readable without the art.
2. **The statement.** "We are a concierge, not a clinic…" words go from ink-soft (still AA) to ink as you scroll. Three promises beneath fade up.
3. **The banyan grows (How it works).** Sticky left column with the four steps; a line-drawn banyan on the right lowers one aerial root per step as you scroll, the active step gets a gold bar (WattBank's list pattern). Phone: vertical timeline with the tree drawn once, no scroll-scrub.
4. **Your mix.** Three large preset cards — *Mostly health*, *Balanced*, *Mostly rest & culture* — plus −/+ buttons per category in 10% steps (no fiddly sliders). A mix bar shows the split; example experience tiles cross-fade to match. Fully keyboard-operable, changes announced politely to screen readers.
5. **Why Kerala band.** One full-bleed photo with a slow 1.0 → 1.06 zoom as it passes; four facts on a kasavu panel.
6. **Fade-ups** for every other section: 12px rise + opacity, once.

## 5. Sitemap

From Nivedith's six layers; core trust layer first. ★ = first build.

| Page | Purpose |
|---|---|
| ★ `/` Home | What is this, is it safe, is it for me, what will it cost |
| ★ `/talk` Book a free conversation | Short request form, phone, email, what happens next |
| `/how-it-works` | Four steps in detail, what you get, your trip page |
| `/why-kerala` | The "beautiful page": care, Ayurveda, places, seasons |
| `/explore` | All needs and experiences, Your mix in full |
| `/safety` | How we vet providers (formal process), licences, data |
| `/about` | The banyan story, the people, our network |
| `/journeys` | Sample journeys and, later, stories |
| `/guide` | Practical guide: visas, flights, seasons, money + full FAQ |
| `/learn` | Guides and expert articles (once there are some) |
| `/privacy`, `/terms` | Legal |

Pricing stays a homepage section + FAQ (per the 2 Nov call). Country selector: much later.

## 6. Homepage section order

| # | Section | Why here |
|---|---|---|
| 0 | **Header**: logo · How it works · Why Kerala · Explore · Is it safe? · Prices · phone · My trip · **Book a free conversation** | Jakob's law; Consistent Help (3.2.6); CTA one click from anywhere |
| 1 | **Hero** — short headline, one line, CTA, "or call +44…" | Answers *what is this* in 5 seconds |
| 2 | **Statement + three promises** (vetted providers · one coordinator · every price before you decide) | Up-front disclosure (NN/g) |
| 3 | **How it works** (banyan scene) | Reduces uncertainty early; goal-gradient |
| 4 | **Your mix / Explore by need** — tiles with time, what you receive, **£ and €** | *Is it for me* + *what will it cost* |
| 5 | **Is it safe?** — how we vet, as a visible checklist; link to `/safety` | Main conversion driver for this audience |
| 6 | **Sample journeys** — 3 cards: mix bar, length, price range £/€ | Lets people picture a trip |
| 7 | **Why Kerala** — photo band + four facts | Desire after reassurance |
| 8 | **Is this right for you?** | Honest filter builds trust |
| 9 | **Pricing** — no markup, one service fee, pay then we book | Disclosure |
| 10 | **The people** — faces, names, roles | "A real person" made visible |
| 11 | **Talk to a person** — what happens next (3 steps), form link, phone, email | Clear next step |
| 12 | **FAQ** — adds cost, safety, travel, payment, "if something goes wrong" | Last objections |
| 13 | **Footer** — phone, email, hours (UK + CET), address, legal, disclaimer, staff sign-in | Consistent Help |

Phone: a slim sticky bottom bar with "Book a free conversation" appears after the hero.

## 7. Content proposals (not done — need your OK or Nivedith's copy)

- **Cut** the Learn section from the homepage until there is at least one article (dead "Coming soon" cards).
- **Rewrite** "Clear, lower costs — often well below private prices in Western Europe" → show example prices instead of a comparison we'd need to substantiate.
- **Shorten** the hero headline to ~8 words; move "If waiting lists…" into the Why Kerala section.
- **Add** placeholder copy for sample journeys, vetting steps, the extra FAQ answers and "what happens next" — all marked placeholder for Nivedith.
- All existing copy, links, the `mailto:` route (kept as "or email us"), `My trip` and `Staff sign-in` stay.

## 8. Decisions needed before building

1. **Imagery.** Recommended: original layered illustration for the hero (no licence risk, parallax-ready, tiny) + free-licence place photography (Unsplash/Pexels, credited) as placeholders until we have our own or providers' permission.
2. **The people section.** The 2 Nov call said skip "who stands behind it" for now; the brief asks for faces. Ship it with placeholders, or leave it out until we have names and photos?
3. **Booking.** Recommended: our own short request form at `/talk` that saves an enquiry to the admin (no new service). Alternative: an external calendar (Cal.com/Calendly) — a new service you'd set up.
4. **Contact details.** Phone number(s) and hours to show; and a fixed GBP rate for indicative prices (e.g. "≈ £", reviewed monthly) or separate GBP figures per tile.

---

## 9. Change log — first build (3 Nov 2026)

What landed, against the direction above. Screenshots in `screenshots/` (before: `before-home-desktop.jpg`).

| Change | Why | Where |
|---|---|---|
| Kasavu / banyan / gold / laterite tokens added beside the portal palette | Approved palette, portal stays related | `globals.css` |
| Header: all links visible ≥1280 px, labelled "Menu" below, "Book a free conversation" always visible, phone when set; phones show the tree mark only so both buttons fit | NN/g hidden nav; Consistent Help | `components/site/site-header.tsx` |
| Footer: contact, sitemap, disclaimer, photo credits, staff sign-in | Consistent Help, disclosure | `(site)/layout.tsx` |
| Framed dawn hero in six SVG layers; frame opens and layers drift on scroll (desktop), mist drifts; "Kerala" wordmark behind water and palms (hidden on phones, where it collided with the headline) | WattBank / Tourvia depth; mobile simplified | `components/site/dawn-scene.tsx`, `site.css` |
| Shorter H1; old headline kept as `HERO.longTitle` | Five-second answer | `content.ts` |
| Statement reveals word by word from 72% to 100% opacity (stays above AA) | WattBank statement; never invisible | `site.css` |
| How it works: banyan grows one aerial root per step, gold bar on the active step; phones get a plain timeline | Brand motif | `components/site/banyan.tsx` |
| "Your mix": three presets + −/+ in 10% steps, six example tiles follow the split, polite live announcement | Brief's interactive mix, no sliders | `components/site/your-mix.tsx`, `domain/site/mix.ts` |
| Prices in € with ≈ £ | UK market | `domain/site/prices.ts` |
| Vetting checklist (placeholder) + the five safety points | Trust; formal vetting asked for | homepage `#safety` |
| Sample journeys with mix bars and price ranges (placeholder) | Visitors can picture a trip | homepage `#journeys` |
| Why Kerala as a full-bleed photo band; "Clear, lower costs" → "Prices you can see"; waiting-list line moved here | CAP 3.7 substantiation | homepage `#why-kerala` |
| Learn section hidden until there are articles (`GUIDES` kept in content) | No dead ends | `content.ts` |
| FAQ +5 (cost, payment, safety, visa, if something goes wrong) (placeholder) | Brief | `content.ts` |
| `/talk` form (6 questions, big fields, errors focus a summary) → LEAD client + WEBSITE conversation + staff notice; `/talk/thanks` with what happens next; "Website requests" on the admin client page | One-click booking path that actually works | `(site)/talk/`, `lib/services/website-requests.ts` |
| Mobile sticky "Book a free conversation" bar on the homepage | CTA one tap away | `(site)/page.tsx` |

Second build (same day): `/how-it-works`, `/why-kerala` and `/safety`, sharing `components/site/blocks.tsx` with the
homepage; the menu links to them and marks the current page (`aria-current`).

Not done yet: `/about`, `/journeys`, `/guide`, `/learn` from §5, the people section, and Lighthouse measured on a
deployed preview.

## 10. Rework after review (3 Nov 2026, same day)

Feedback: the first build looked generic — "no parallax, no animation, no storytelling", and no flat 2D
illustrations. What changed:

- **The homepage is now one story, a day on the backwaters, in real-time 3D.** Scroll moves a canoe up a canal from
  dawn mist, through a bright morning and midday, to sunset at the lake with its Chinese fishing nets, and night at
  a temple lit with oil lamps. The chapters (what we are, health, wellness, culture, "talk to us") sit on glass panels
  over the scene. Built with three.js; every model is generated in code, so there is nothing to license.
- **Every section below moves with intent** (GSAP ScrollTrigger, works in every browser): the vetting checklist ticks
  itself off while pinned; a 10-day journey scrolls sideways with a boat travelling the route; "Your mix" photo panels
  slide wider and narrower with the mix; the step number rolls over as you read; photos drift and settle.
- **No 2D illustration remains** (the SVG dawn scene and line-drawn banyan are gone).
- Guard rails kept: content is ordinary HTML in the page (readable without WebGL or JavaScript); reduced motion holds
  the camera and drops all scroll animation; phones get a lighter scene; software WebGL draws only when you scroll.

## 11. Rebuild from the ground up (3 Nov 2026, evening)

Feedback: still "AI generated, sloppy, no premium feel". References: five screen recordings (Mexico Islands, Stepout,
Explore, WattBank, Kamui, Tourvia) and vita-travel.webflow.io. What they share, and what we now do:

| What makes them premium | On our site |
|---|---|
| A real photograph is the argument; the design steps back | 18 photographs of Kerala in one dawn/dusk light (Unsplash licence, credited in the footer). No drawn or generated scenery. |
| One huge word over the place | "Kerala" as a film title across the bottom of the hero photo; the five Why Kerala words over full-screen photographs |
| Very few type sizes, far apart; sentence case | Gambarino (display) + General Sans (text), self-hosted; small 15–16, body 18–19, lead 20–26, head 36–68, display |
| Dark, calm ground; colour comes from the pictures | Night `#0e1518`, mist field `#e7e8e4` for practical sections, lamp brass `#cfab70` on the one button only |
| No ornament | No eyebrows, glass, shadows, icon tiles, numbering or rules; square photographs, round buttons |
| Scroll tells a story | Photo shutter on arrival; chapters that hold and hand over; Explore photo that follows the row; mix panels that slide |

Tool support: the direction ("The place carries it") was dealt by taste-skill's `draw.mjs`; its `inspect.mjs` measured
the production build at 1440/768/390 (0 FAIL on every inner page). ui-ux-pro-max confirmed contrast and touch-target
rules (48 px controls, 4.5:1 text; ink on night 16:1, muted 7.9:1, ink on mist 15:1, muted 6.4:1).

Still open: our own photographs (and permission for providers'), a hero video clip if an honest one exists, and
Nivedith's copy. Placeholder copy is unchanged in substance; headings were shortened to two lines.

## 12. Motion pass (4 Nov 2026)

Feedback: still too static; the page should build itself as you scroll. Added (all in `components/site/motion.tsx`,
driven by data attributes; nothing hidden without script; everything off for reduced motion):

- **Smooth scrolling** with Lenis (wheel only; touch stays native).
- **Text:** every heading rises line by line out of a mask; big words (step verbs, chapter words, place names)
  assemble letter by letter; the "who we are" statement lights up word by word as you read; small notes arrive word
  by word with a soft blur; lists slide in from the left.
- **Pictures:** every photograph wipes open upwards while it settles from 1.4x, then drifts against the scroll; the
  Explore picture wipes in from the side.
- **Scenes:** the hero title assembles after the shutter and lifts away on scroll; a band of Kerala place names
  slides in two opposite rows; each Why Kerala chapter's photo settles while its word assembles from the centre;
  a ten-day journey travels sideways on wide screens (a swipeable row on phones); How it works has a bar that fills
  as you read; the header steps aside while scrolling down and returns on the way up.
