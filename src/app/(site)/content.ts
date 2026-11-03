import { Bone, Eye, HeartPulse, Landmark, Leaf, Smile, Stethoscope, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { MixKey } from "@/domain/site/mix";

/**
 * Public site copy, kept apart from layout so it can be rewritten in one place.
 * Placeholder wording from the 2 Nov 2026 call: Nivedith will replace it.
 * Items marked "placeholder" were added in the 3 Nov redesign and need his
 * review before they are relied on. Prices are indicative ranges in euros for
 * orientation only — every quote comes from the provider before anything is booked.
 */

/** Free-licence place photography (Unsplash licence), until we have our own. */
export type Photo = { src: string; alt: string; credit: string; href: string };

const unsplash = (id: string, alt: string, credit: string, page: string): Photo => ({
  src: `https://images.unsplash.com/photo-${id}`,
  alt,
  credit,
  href: `https://unsplash.com/photos/${page}`,
});

export const PHOTOS = {
  houseboat: unsplash("1593693411515-c20261bcad6e", "A houseboat on the palm-lined backwaters of Alappuzha", "Abhishek Prasad", "ii0oWs5abCo"),
  canoe: unsplash("1590050752117-238cb0fb12b1", "A canoe on a quiet canal at sunrise, framed by coconut palms", "Ajmal MK", "pfLyzuGfofY"),
  tea: unsplash("1696027356970-b1527cc0d33c", "Tea gardens on rolling green hills below the Western Ghats", "Antony Thomas", "PHOk0ZP28a0"),
  kathakali: unsplash("1786644849913-8107d8179364", "A Kathakali performer in a red costume and ornate headdress", "Chethan Kanakamurthy", "x3dZS_TPqII"),
  oils: unsplash("1492552181161-62217fc3076d", "Oil poured over herbs in a stone mortar", "Katherine Hanlon", "mod2s3-qFOc"),
  spout: unsplash("1780756817394-9a5414ce47a1", "Water dripping from a bamboo spout into a stone basin", "Jome Parker", "4RruyuZvMDc"),
  kochi: unsplash("1696966358360-f64c761e0cb5", "Old waterfront buildings across the water in Kochi", "Sleeba Thomas", "7FNVvI2Lezc"),
  palms: unsplash("1602216056096-3b40cc0c9944", "A houseboat between tall coconut palms", "Nature Photographer", "29ezCWtMtnM"),
  hills: unsplash("1650884986392-984358536050", "Misty green hills and tea fields", "Kevin JD", "S1nGUR7bCaM"),
  check: unsplash("1700832082200-af7deeb63d9b", "A stethoscope and a blood pressure gauge on white linen", "Immo Wegmann", "njrDE70M2VI"),
} satisfies Record<string, Photo>;

export const HERO = {
  title: "Health, rest and Kerala — looked after for you",
  /** The longer headline from the first version, kept for search and sharing. */
  longTitle: "Health check-ups, Ayurveda and culture in Kerala — arranged for you",
  line:
    "Aalmaram Health plans and looks after your health journey to Kerala, with licensed providers we know. We are a concierge, not a clinic.",
  forWhom: "For people from the UK, Austria, Slovenia and beyond who want planned care, rest and a real trip — without arranging it alone.",
  context: "If waiting lists or private prices at home are holding you back, Kerala can be a calm, well-organised alternative.",
};

/** The homepage story: one day on the backwaters (placeholder copy). */
export const STORY = [
  { time: "Dawn", eyebrow: "Health · Wellness · Culture", title: "", text: "", cta: true, heading: "h1" as const },
  {
    time: "First light",
    eyebrow: "Aalmaram · the banyan tree",
    title: "Deep roots. Wide shelter.",
    text: "Aalmaram is Malayalam for the banyan, the tree a village gathers under. We know Kerala and the people we recommend, and one person looks after every detail for you.",
    align: "right" as const,
  },
  {
    time: "Morning",
    eyebrow: "Health",
    title: "Clear mornings for your health",
    text: "Check-ups and specialist consultations with experienced doctors at hospitals we have looked at closely. Results in English, for you and for your own doctor.",
  },
  {
    time: "Midday",
    eyebrow: "Wellness",
    title: "The heat of the day is for rest",
    text: "Classical Ayurveda and quiet retreats, with practitioners we have met. We tell you plainly what a programme involves — and make no promises about what it will do.",
    align: "right" as const,
  },
  {
    time: "Evening",
    eyebrow: "Culture",
    title: "Evenings are for Kerala itself",
    text: "A houseboat on the lake, the fishing nets at sunset, Kathakali by lamplight and a sadya on a banana leaf — at your pace.",
  },
  {
    time: "Night",
    eyebrow: "One person, from first call to home",
    title: "When the lamps come on, you are looked after",
    text: "Your coordinator plans with you, books once you have confirmed and paid, and is there while you travel. It starts with a free conversation.",
    align: "centre" as const,
    cta: true,
  },
];

export const STATEMENT =
  "We are a concierge, not a clinic. We plan check-ups, Ayurveda and time in Kerala with providers we have looked at closely — and one person looks after the details with you, from the first call until you are home.";

export const PROMISES = [
  { title: "Providers we have checked", text: "Hospitals, clinics and practitioners we have looked at before you meet them." },
  { title: "One person beside you", text: "Your coordinator plans with you, books for you and is there while you travel." },
  { title: "Every price before you decide", text: "What each provider charges and our fee, on your own trip page." },
];

export const STEPS = [
  { title: "A free call with a person", text: "Tell us what you are looking for. We listen, answer your questions and there is no obligation." },
  { title: "We draft your plan", text: "Your coordinator puts appointments, wellness and culture from vetted providers into your private trip page." },
  { title: "You shape it and book", text: "Move days, add or remove things and see every price. Nothing is booked until you confirm and pay." },
  { title: "Travel, then take it home", text: "We look after you in Kerala. Your results and reports come to you — and to your own doctor if you wish." },
];

export const WHY_KERALA = [
  { title: "Established hospitals", text: "Kerala has large private hospitals and clinics; several hold national (NABH) or international (JCI) accreditation." },
  { title: "English spoken", text: "English is widely used by doctors and staff in Kerala's private hospitals." },
  { title: "Prices you can see", text: "Every provider's price is on your trip page before you decide. The examples on this page give you an idea." },
  { title: "Ayurveda and a real holiday", text: "Kerala is a home of classical Ayurveda, with backwaters, hills, coast and centuries of history to enjoy." },
];

/** Something we arrange, shown in Explore and in "Your mix". */
export type Experience = {
  kind: MixKey;
  Icon: LucideIcon;
  title: string;
  line: string;
  duration: string;
  receive: string;
  /** Indicative starting price in euros. */
  priceFromEur: number;
  photo?: Photo;
};

export const NEEDS: Experience[] = [
  { kind: "health", Icon: Stethoscope, title: "Health check", line: "A full check-up with blood tests, scans and a doctor's consultation.", duration: "1–2 days", receive: "Written results in English", priceFromEur: 250, photo: PHOTOS.check },
  { kind: "health", Icon: HeartPulse, title: "Heart", line: "Cardiology consultation with ECG, echo and stress test as your cardiologist advises.", duration: "1–2 days", receive: "Report and consultation notes", priceFromEur: 350 },
  { kind: "health", Icon: Bone, title: "Joints", line: "Orthopaedic assessment with imaging, and physiotherapy if recommended.", duration: "1–5 days", receive: "Imaging report and care plan from the provider", priceFromEur: 300 },
  { kind: "health", Icon: Smile, title: "Dental", line: "Dental examination and planned treatment at a modern dental clinic.", duration: "2–10 days", receive: "Treatment plan and records", priceFromEur: 150 },
  { kind: "health", Icon: Eye, title: "Eyes", line: "Eye examination with an ophthalmologist; planned surgery only if your surgeon advises it.", duration: "1–7 days", receive: "Examination report", priceFromEur: 100 },
  { kind: "wellness", Icon: Leaf, title: "Ayurveda", line: "A classical Ayurveda programme with consultations and daily treatments.", duration: "7–21 days", receive: "Programme summary from the practitioner", priceFromEur: 900, photo: PHOTOS.oils },
  { kind: "culture", Icon: Landmark, title: "Culture", line: "Fort Kochi, the backwaters, temple arts and Kerala's kitchens, at your pace.", duration: "1–4 days", receive: "A guided, private itinerary", priceFromEur: 80, photo: PHOTOS.kochi },
];

/** Extra examples for "Your mix" (placeholder). */
export const MORE_EXPERIENCES: Experience[] = [
  { kind: "wellness", Icon: Leaf, title: "Rest at a wellness retreat", line: "Quiet days at a retreat with simple food, gardens and gentle treatments.", duration: "3–10 days", receive: "A room, meals and a daily programme", priceFromEur: 120, photo: PHOTOS.spout },
  { kind: "wellness", Icon: Leaf, title: "Slow days in the tea hills", line: "Cool air, walks between tea gardens and time to do very little.", duration: "2–4 days", receive: "A hill stay arranged for you", priceFromEur: 150, photo: PHOTOS.hills },
  { kind: "culture", Icon: Landmark, title: "A day on the backwaters", line: "A houseboat or canoe through palm-lined canals and village life.", duration: "1–2 days", receive: "A private boat and local guide", priceFromEur: 140, photo: PHOTOS.houseboat },
  { kind: "culture", Icon: Landmark, title: "A Kathakali evening", line: "Watch the make-up being applied, then a performance of classical dance-drama.", duration: "An evening", receive: "Seats and a short introduction", priceFromEur: 30, photo: PHOTOS.kathakali },
  { kind: "culture", Icon: UtensilsCrossed, title: "Kerala's kitchens", line: "A home-cooked sadya on a banana leaf, and the spice markets behind it.", duration: "Half a day", receive: "A hosted meal and market walk", priceFromEur: 45 },
];

export const EXPERIENCES: Experience[] = [...NEEDS, ...MORE_EXPERIENCES];

/** Before a provider is included (placeholder until the formal vetting process is written). */
export const VETTING = [
  { title: "Licence and registration", text: "The hospital, clinic or practitioner is licensed to practise in India." },
  { title: "Accreditation, where held", text: "We note national (NABH) or international (JCI) accreditation and show it to you." },
  { title: "Who will see you", text: "The doctors' and practitioners' qualifications, seniority and years of practice." },
  { title: "A visit in person", text: "Someone from our team has been there, met the people and seen the rooms." },
  { title: "Prices in writing", text: "What is included and what it costs, before we put it in front of you." },
  { title: "What clients tell us", text: "We ask every client about every provider, and act on what we hear." },
];

export const SAFETY = [
  { title: "Providers we vet", text: "We only work with hospitals, clinics and practitioners we have checked and know personally." },
  { title: "Licensed and accredited", text: "Every provider is licensed in India; many hold national or international accreditation." },
  { title: "No medical advice from us", text: "We arrange your care. Medical advice, diagnosis and treatment come only from the doctors you see." },
  { title: "Your own doctor stays involved", text: "Results and reports can be sent to your doctor at home, so care continues when you return." },
  { title: "Your data", text: "Shared only with the providers you book and the doctor you name. Our privacy notice for European clients (GDPR) is being prepared." },
];

/** Sample journeys (placeholder): realistic shapes, not packages. Flights not included. */
export const JOURNEYS: { title: string; days: number; mix: Record<MixKey, number>; line: string; fromEur: number; toEur: number; photo: Photo }[] = [
  { title: "A thorough check-up, then the backwaters", days: 10, mix: { health: 50, wellness: 20, culture: 30 }, line: "Two days of tests and consultations in Kochi, then a houseboat, Fort Kochi and time to rest.", fromEur: 2200, toEur: 3000, photo: PHOTOS.canoe },
  { title: "Two weeks of classical Ayurveda", days: 16, mix: { health: 10, wellness: 70, culture: 20 }, line: "A consultation and daily treatments at an Ayurveda centre, with a few gentle outings.", fromEur: 2600, toEur: 3800, photo: PHOTOS.spout },
  { title: "A heart check and Kerala's culture", days: 9, mix: { health: 40, wellness: 20, culture: 40 }, line: "A cardiology assessment, then the tea hills, a Kathakali evening and Kerala's kitchens.", fromEur: 1600, toEur: 2400, photo: PHOTOS.tea },
];

/** The first sample journey, told day by day (placeholder). */
export const JOURNEY_DAYS: { when: string; title: string; text: string; photo?: Photo }[] = [
  { when: "Day 1", title: "Arrive in Kochi", text: "Someone meets you at the airport. A quiet first evening in Fort Kochi, by the water.", photo: PHOTOS.kochi },
  { when: "Days 2–3", title: "Your health check", text: "Tests, scans and a consultation, booked and explained in advance. Results in English, for you and your own doctor.", photo: PHOTOS.check },
  { when: "Days 4–5", title: "Onto the backwaters", text: "A houseboat through palm-lined canals. Nothing to do but watch the water go by.", photo: PHOTOS.houseboat },
  { when: "Day 6", title: "A Kathakali evening", text: "Watch the make-up go on, then a performance of Kerala's classical dance-drama.", photo: PHOTOS.kathakali },
  { when: "Days 7–9", title: "Up to the tea hills", text: "Cool air, walks between tea gardens and time to do very little.", photo: PHOTOS.tea },
  { when: "Day 10", title: "Home, with your results", text: "Your reports travel with you — and to your own doctor, if you wish.", photo: PHOTOS.canoe },
];

export const RIGHT_FOR_YOU = {
  suits: [
    "You want a planned check-up, assessment or treatment — not urgent care",
    "You would like one person to arrange everything for you",
    "You want rest, Ayurveda or culture around your appointments",
    "You are well enough to travel for one to three weeks",
  ],
  notFor: [
    "Emergencies or urgent medical problems — please contact your local services",
    "Looking for a diagnosis or medical opinion from us — we don't give one",
    "If your doctor advises against long-haul travel",
  ],
};

/** Shown on the site once the first articles exist (no "coming soon" cards). */
export const GUIDES = [
  { title: "What a health check in Kerala includes", kind: "Guide" },
  { title: "Classical Ayurveda: what a programme is like", kind: "Expert article" },
  { title: "Planning your trip: visas, flights and the seasons", kind: "Guide" },
];

export const PRICING = [
  { title: "Provider prices, unchanged", text: "What the hospital, clinic or guide charges is what you pay. We add no markup." },
  { title: "One clear service fee", text: "For planning and looking after you. You see it before you confirm anything." },
  { title: "Pay, then we book", text: "Every price is on your trip page. Bookings are made once you have confirmed and paid." },
];

/** After someone asks for a free conversation (placeholder). */
export const NEXT_STEPS = [
  { title: "We get in touch", text: "Your coordinator emails you to agree a time that suits you." },
  { title: "A relaxed conversation", text: "By phone or video. Tell us what you have in mind and ask anything." },
  { title: "Only if you want to", text: "If it suits you, we draft a first plan on your private trip page. There is no obligation." },
];

export const FAQ = [
  { q: "Are you a hospital or clinic?", a: "No. We are a concierge: we plan your trip and coordinate with independent, licensed providers in Kerala, who give all medical care." },
  { q: "Is the first call really free?", a: "Yes. It is a conversation with a person on our team, with no obligation to book." },
  { q: "Can my own doctor be involved?", a: "Yes. With your permission we send your results and reports to your doctor at home." },
  { q: "How do I know what it will cost?", a: "Your trip page shows every provider's price and our service fee before you confirm. Nothing is booked until you have paid." },
  // Placeholders from here (3 Nov redesign), for Nivedith to confirm.
  { q: "What does a whole trip cost?", a: "It depends on what you choose and for how long. The sample journeys on this page show typical ranges, without flights. Your trip page shows every price before you decide." },
  { q: "How do I pay?", a: "Once you have confirmed your plan, you pay through your trip page, and we book after that. We explain the payment options on your first call." },
  { q: "Is Kerala safe to travel to?", a: "Kerala is one of India's most visited regions. Before you go, check your own government's travel advice — in the UK, the Foreign Office (FCDO) travel advice for India." },
  { q: "Do I need a visa?", a: "Most visitors need a visa for India, and many nationalities can apply for an e-Visa online. We point you to the official information when you plan." },
  { q: "What happens if something goes wrong?", a: "Your coordinator is your one point of contact throughout and helps you change plans or reach the right provider. Medical decisions stay with the doctors treating you. We recommend travel insurance that covers medical care abroad." },
  { q: "Which countries do you work with?", a: "We are starting with clients from the UK, Austria and Slovenia, and welcome enquiries from anywhere." },
  { q: "Can I change my plans?", a: "You can change your plan freely until you confirm it. Our terms for changes after payment will be shared with you before you pay." },
];

export const COUNTRIES = ["United Kingdom", "Austria", "Slovenia", "Germany", "Ireland", "Netherlands", "Another country"];

// ---------------------------------------------------------------------------
// Inner pages (placeholder, 3 Nov redesign) — for Nivedith to review.
// ---------------------------------------------------------------------------

/** FAQ entries by question, so pages can show the ones that belong to them. */
export const faqFor = (questions: string[]) => FAQ.filter((item) => questions.includes(item.q));

export const HOW_IT_WORKS_PAGE = {
  title: "How it works",
  intro: "From a first conversation to your results at home, one person looks after you. Here is what happens at each step — what you do, and what we do.",
  steps: [
    {
      you: "Tell us what you are hoping for, roughly when you might travel and anything that worries you.",
      we: "Listen, answer your questions about Kerala, our providers and costs, and explain how we work.",
      get: "A clear idea of whether this suits you. There is no obligation.",
    },
    {
      you: "Share what matters to you: dates, pace, interests — and, if you like, what your own doctor has suggested you look into.",
      we: "Choose appointments, wellness and culture from providers we have checked, and put them with their prices on your private trip page.",
      get: "Your own trip page, which you can open on a computer, tablet or phone.",
    },
    {
      you: "Move days, add or remove things and ask anything. When you are happy, confirm and pay.",
      we: "Answer, adjust and then book every provider once you have paid.",
      get: "Confirmed bookings, all in one place.",
    },
    {
      you: "Travel, rest and enjoy Kerala at your own pace.",
      we: "Stay your one point of contact while you are there, and help with changes along the way.",
      get: "Your results and reports — sent to your own doctor too, if you wish.",
    },
  ],
  tripPage: [
    { title: "Your plan, day by day", text: "Every appointment, treatment and outing, with times and places." },
    { title: "Every price", text: "What each provider charges and our service fee, before you confirm." },
    { title: "Ideas you can add", text: "Things to do that fit your days, from providers we already know." },
    { title: "A line to your coordinator", text: "Ask a question or ask for a change, and a person answers." },
  ],
  weDont: [
    "Give medical advice, diagnose or recommend treatment — that is for the doctors you choose to see",
    "Book anything before you have confirmed and paid",
    "Add a markup to providers' prices",
  ],
  faq: ["How do I know what it will cost?", "How do I pay?", "Can I change my plans?", "Can my own doctor be involved?"],
};

export const WHY_KERALA_PAGE = {
  title: "Why Kerala",
  intro: "A green strip of south-west India between the Western Ghats and the Arabian Sea — with established private hospitals, a long tradition of classical Ayurveda and some of India's best-loved places to travel.",
  care: [
    { title: "Established private hospitals", text: "Kochi and Thiruvananthapuram have large private hospitals and specialist clinics." },
    { title: "Accreditation you can check", text: "NABH is India's national hospital accreditation; JCI (Joint Commission International) is an international one. Where a provider holds either, we show it to you." },
    { title: "English spoken", text: "English is widely used by doctors and staff in Kerala's private hospitals." },
    { title: "Prices you can see", text: "Every provider's price is on your trip page before you decide." },
  ],
  ayurveda: {
    title: "Classical Ayurveda",
    text: "Kerala is known for its classical Ayurveda tradition. A programme usually begins with a consultation with an Ayurvedic doctor, followed by daily treatments such as oil massages, simple vegetarian food and plenty of rest. Programmes often last one to three weeks.",
    note: "Ayurveda is a traditional system. We describe what a programme involves, not what it will do for you. If you take medicines or have a health condition, please talk to your own doctor before you book.",
  },
  places: [
    { title: "The backwaters", text: "Palm-lined canals and lakes around Alappuzha and Kumarakom, best seen slowly from a houseboat or canoe.", photo: PHOTOS.houseboat },
    { title: "The tea hills", text: "Munnar's tea gardens and cool air, a few hours inland and high in the Western Ghats.", photo: PHOTOS.tea },
    { title: "Kochi", text: "Fort Kochi's old streets and waterfront, Chinese fishing nets and centuries of trading history.", photo: PHOTOS.kochi },
    { title: "Arts and festivals", text: "Kathakali dance-drama, temple festivals and traditional homes.", photo: PHOTOS.kathakali },
    { title: "Food", text: "A sadya on a banana leaf, spice gardens and fresh coastal cooking." },
    { title: "The coast", text: "Varkala's cliffs and quiet beaches further south." },
  ] as { title: string; text: string; photo?: Photo }[],
  seasons: [
    { months: "December to February", text: "Dry days and cooler nights in the hills. The busiest time to visit." },
    { months: "March to May", text: "Hot and humid before the rains arrive." },
    { months: "June to September", text: "The south-west monsoon: heavy rain and very green landscapes. Traditionally a season for Ayurveda in Kerala, and quieter." },
    { months: "October and November", text: "The north-east monsoon brings shorter showers as the heat eases." },
  ],
  travel: [
    { title: "Airports", text: "Kochi (COK) and Thiruvananthapuram (TRV) are Kerala's main international airports." },
    { title: "Flights", text: "From the UK and central Europe most routes have one stop, often in the Gulf. Plan on most of a day of travel." },
    { title: "Time difference", text: "India is 5½ hours ahead of the UK in winter (4½ in summer), and 4½ hours ahead of Austria and Slovenia in winter (3½ in summer)." },
    { title: "Visas", text: "Most visitors need a visa for India; many nationalities can apply for an e-Visa online. We point you to the official information." },
  ],
};

export const SAFETY_PAGE = {
  title: "Is it safe?",
  intro: "Kerala has many good providers, but quality is uneven and their websites rarely tell you who will treat you or how experienced they are. So we look closely before we suggest anyone — and we are clear about what we do and what we don't.",
  roles: {
    we: ["Plan your trip and coordinate every appointment", "Check providers before we suggest them", "Book once you have confirmed and paid", "Look after you while you travel", "Send your results to you and, if you wish, your doctor"],
    doctors: ["Examine you and give medical advice", "Recommend and carry out any treatment, with your agreement", "Give you their results and reports"],
  },
  beforeYouGo: [
    { title: "Talk to your own doctor", text: "About travelling, and about any check or treatment you are considering." },
    { title: "Take out travel insurance", text: "One that covers medical care abroad and the activities you plan." },
    { title: "Check official travel advice", text: "In the UK, the Foreign Office (FCDO) travel advice for India; elsewhere, your own government's." },
    { title: "Bring your records", text: "A list of your medicines and any recent reports your doctors in Kerala should see." },
  ],
  ifSomethingGoesWrong: [
    { title: "One person to call", text: "Your coordinator is your first point of contact throughout your trip." },
    { title: "Help on the ground", text: "We help you reach the right provider, change plans or rearrange your days." },
    { title: "Tell us", text: "If something was not right, we follow it up with the provider and use what we learn when we choose providers." },
  ],
  faq: ["Are you a hospital or clinic?", "Is Kerala safe to travel to?", "What happens if something goes wrong?", "Can my own doctor be involved?"],
};
