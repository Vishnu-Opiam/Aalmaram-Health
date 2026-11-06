import type { MixKey } from "@/domain/site/mix";

/**
 * Public site copy, kept apart from layout so it can be rewritten in one place.
 * Placeholder wording from the 2 Nov 2026 call: Nivedith will replace it.
 * Items marked "placeholder" were added in the 3 Nov redesign and need his
 * review before they are relied on. Prices are indicative ranges in euros for
 * orientation only — every quote comes from the provider before anything is booked.
 */

/** Free-licence place photography (Unsplash licence), until we have our own. */
/**
 * `w` and `h` are the original's pixel size: a box narrower than the
 * photograph's shape crops its sides, so the image fetched must be wider than
 * the box (SiteImage works this out). `focus` is the CSS object-position that
 * keeps the subject in narrow crops.
 */
export type Photo = { src: string; alt: string; credit: string; href: string; w: number; h: number; focus?: string };

const unsplash = (id: string, alt: string, credit: string, page: string, [w, h]: [number, number], focus?: string): Photo => ({
  src: `https://images.unsplash.com/photo-${id}`,
  alt,
  credit,
  href: `https://unsplash.com/photos/${page}`,
  w,
  h,
  focus,
});

export const PHOTOS = {
  lake: unsplash("1583482011546-c327a8076798", "A boatman poles a canoe across a still lake at dawn, with palm islands behind", "Marieke Weller", "vwMBUwR72UM", [5328, 4000]),
  prow: unsplash("1583482939907-d6959d54af75", "The prow of a wooden canoe on still water at first light", "Marieke Weller", "lHHnoBDqSK8", [5328, 4000]),
  river: unsplash("1643614331150-37823121afce", "A boat moored on a misty river lined with palms and fishing nets", "Emmanual Thomas", "Re6R7pDEo5c", [2268, 4032]),
  nets: unsplash("1583558257444-cfba032b49ea", "A Chinese fishing net against the evening sky in Kochi", "Sarfaraz Siddiqui", "6MMW6cMIgX0", [4288, 2848]),
  dhara: unsplash("1775133263714-848c8fe09e73", "Warm oil poured in a thin stream onto the forehead during an Ayurveda treatment", "Charanjeet Dhiman", "kvf5kfVMqng", [5472, 3648], "20% 80%"),
  treatmentRoom: unsplash("1731597076108-f3bbe268162f", "A treatment room with a brass oil vessel hanging above a wooden table", "Gokul Gurung", "N3Ll8c2uLgE", [5868, 3301]),
  mortar: unsplash("1492552085122-36706c238263", "Herbs ground by hand in a stone mortar", "Katherine Hanlon", "bd_fCZhy_W8", [5100, 3300]),
  eyeClinic: unsplash("1565428744974-f41cf79c05fa", "Eye examination equipment in a clinic", "Syed Hussaini", "mDCuzdHh_bw", [4032, 1960]),
  tea: unsplash("1491497895121-1334fc14d8c9", "Misty tea gardens on the hills of Munnar", "Vivek Kumar", "JS_ohjocm00", [4824, 3216]),
  hills: unsplash("1766671965039-8bc8687390ad", "Misty mountains above a calm lake at sunrise", "Anjith Paul", "biC4hql1lWU", [6048, 4024]),
  kathakali: unsplash("1597735881932-d9664c9bbcea", "A Kathakali performer in green face paint and an ornate headdress", "Divyanshi Verma", "h3SyJYsqYSo", [2497, 3786], "65% 50%"),
  kathakaliStage: unsplash("1691075213372-ff9e2d6d7645", "A Kathakali performer on stage, with drummers behind", "Anantha Krishnan", "zMfvtg7jfuc", [6720, 4480]),
  palms: unsplash("1679934409073-838c884261fb", "Coconut palms in morning fog", "Hardik Monga", "GfFsbhNOW5c", [6000, 4000]),
  canal: unsplash("1704365159871-6bf63f00b9c8", "A canoe on a narrow canal through palm groves, seen from above", "Swastik Arora", "h-PHS1XHC0I", [4000, 2250]),
  coast: unsplash("1697193374263-8aeb5488dabe", "Cliffs above the sea on Kerala's southern coast", "Faraz Ghori", "Un0s8OmOEr0", [4496, 3000]),
  houseboat: unsplash("1593693411515-c20261bcad6e", "A houseboat on the palm-lined backwaters of Alappuzha", "Abhishek Prasad", "ii0oWs5abCo", [6016, 4016]),
  check: unsplash("1700832082200-af7deeb63d9b", "A stethoscope and a blood pressure gauge on white linen", "Immo Wegmann", "njrDE70M2VI", [6016, 4000]),
  heart: unsplash("1755287066058-80c68aaaf0e3", "An ECG tracing on graph paper, with a pencil and a protractor", "Joachim Schnürle", "RJ6jkh_eYR0", [6960, 4640]),
  joints: unsplash("1649751361457-01d3a696c7e6", "A physiotherapist examines a patient's knee", "yury kirillov", "pbUWW-CBoqY", [3701, 2468], "40% 50%"),
  dental: unsplash("1698749778813-ad5f2814e50f", "A dental mirror held up in a bright, quiet clinic", "Katarzyna Zygnerska", "rubu_NvklJE", [4000, 6000]),
  sadya: unsplash("1625398407796-82650a8c135f", "A sadya: rice, curries and pappadam served on a banana leaf", "Saktheeswaran Govindarajan", "yCIcDyKm440", [3000, 3000]),
  kochi: unsplash("1696966358360-f64c761e0cb5", "Old waterfront buildings across the water in Kochi", "Sleeba Thomas", "7FNVvI2Lezc", [5928, 2808]),
} satisfies Record<string, Photo>;

export const HERO = {
  title: "Health journeys to Kerala, arranged for you",
  /** The longer headline from the first version, kept for search and sharing. */
  longTitle: "Health check-ups, Ayurveda and culture in Kerala — arranged for you",
  line:
    "Check-ups, Ayurveda and the backwaters, planned around you with licensed providers we know. We are a concierge, not a clinic.",
  forWhom: "For people from the UK, Austria, Slovenia and beyond who want planned care, rest and a real trip — without arranging it alone.",
  context: "If waiting lists or private prices at home are holding you back, Kerala can be a calm, well-organised alternative.",
};

/**
 * The three modules we arrange (5 Nov call): Why Kerala shows one chapter
 * each, and each has its own page listing what belongs to it (placeholder copy).
 */
export const MODULES: { kind: MixKey; word: string; href: string; photo: Photo; veil?: number; text: string; intro: string }[] = [
  {
    kind: "health",
    word: "Health",
    href: "/health",
    photo: PHOTOS.eyeClinic,
    veil: 0.55,
    text: "Kochi and Thiruvananthapuram have large private hospitals; several hold national (NABH) or international (JCI) accreditation. English is widely spoken.",
    intro: "Check-ups, specialist consultations and planned treatment at private hospitals and clinics we have looked at closely. Medical advice comes only from the doctors you see.",
  },
  {
    kind: "wellness",
    word: "Wellness",
    href: "/wellness",
    photo: PHOTOS.dhara,
    text: "Kerala is known for classical Ayurveda, quiet retreats and cool days in the tea hills. We tell you what a programme involves, never what it will do for you.",
    intro: "Classical Ayurveda, quiet retreats and slow days in the hills, with practitioners and places we know. We describe what each involves, not what it will do for you.",
  },
  {
    kind: "culture",
    word: "Culture",
    href: "/culture",
    photo: PHOTOS.kathakali,
    text: "The backwaters, centuries of trade in Fort Kochi, Kathakali by lamplight and a sadya on a banana leaf.",
    intro: "The backwaters, Fort Kochi's old streets, Kathakali by lamplight and Kerala's kitchens — arranged privately, at your pace.",
  },
];

/** "Health check" → "health-check": the anchor of an item on its module page. */
export const experienceSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const experienceHref = (item: Experience) => `/${item.kind}#${experienceSlug(item.title)}`;

export const STATEMENT =
  "We are a concierge, not a clinic. We plan check-ups, Ayurveda and time in Kerala with providers we have looked at closely — and one person looks after the details with you, from the first call until you are home.";

export const PROMISES = [
  { title: "Providers we have checked", text: "Hospitals, clinics and practitioners we have looked at before you meet them." },
  { title: "One person beside you", text: "Your coordinator plans with you, books for you and is there while you travel." },
  { title: "Every price before you decide", text: "What each provider charges and our fee, on your own trip page." },
];

export const STEPS = [
  { verb: "Talk", title: "A free call with a person", text: "Tell us what you are looking for. We listen, answer your questions and there is no obligation." },
  { verb: "Plan", title: "We draft your plan", text: "Your coordinator puts appointments, wellness and culture from vetted providers into your private trip page." },
  { verb: "Decide", title: "You shape it and book", text: "Move days, add or remove things and see every price. Nothing is booked until you confirm and pay." },
  { verb: "Travel", title: "Travel, then take it home", text: "We look after you in Kerala. Your results and reports come to you — and to your own doctor if you wish." },
];

/** Something we arrange, shown in Explore and in "Your mix". */
export type Experience = {
  kind: MixKey;
  title: string;
  line: string;
  duration: string;
  receive: string;
  /** Indicative starting price in euros. */
  priceFromEur: number;
  photo?: Photo;
};

export const NEEDS: Experience[] = [
  { kind: "health", title: "Health check", line: "A full check-up with blood tests, scans and a doctor's consultation.", duration: "1–2 days", receive: "Written results in English", priceFromEur: 250, photo: PHOTOS.check },
  { kind: "health", title: "Heart", line: "Cardiology consultation with ECG, echo and stress test as your cardiologist advises.", duration: "1–2 days", receive: "Report and consultation notes", priceFromEur: 350, photo: PHOTOS.heart },
  { kind: "health", title: "Joints", line: "Orthopaedic assessment with imaging, and physiotherapy if recommended.", duration: "1–5 days", receive: "Imaging report and care plan from the provider", priceFromEur: 300, photo: PHOTOS.joints },
  { kind: "health", title: "Dental", line: "Dental examination and planned treatment at a modern dental clinic.", duration: "2–10 days", receive: "Treatment plan and records", priceFromEur: 150, photo: PHOTOS.dental },
  { kind: "health", title: "Eyes", line: "Eye examination with an ophthalmologist; planned surgery only if your surgeon advises it.", duration: "1–7 days", receive: "Examination report", priceFromEur: 100, photo: PHOTOS.eyeClinic },
  { kind: "wellness", title: "Ayurveda", line: "A classical Ayurveda programme with consultations and daily treatments.", duration: "7–21 days", receive: "Programme summary from the practitioner", priceFromEur: 900, photo: PHOTOS.dhara },
  { kind: "culture", title: "Culture", line: "Fort Kochi, the backwaters, temple arts and Kerala's kitchens, at your pace.", duration: "1–4 days", receive: "A guided, private itinerary", priceFromEur: 80, photo: PHOTOS.kochi },
];

/** Extra examples for "Your mix" (placeholder). */
export const MORE_EXPERIENCES: Experience[] = [
  { kind: "wellness", title: "Rest at a wellness retreat", line: "Quiet days at a retreat with simple food, gardens and gentle treatments.", duration: "3–10 days", receive: "A room, meals and a daily programme", priceFromEur: 120, photo: PHOTOS.treatmentRoom },
  { kind: "wellness", title: "Slow days in the tea hills", line: "Cool air, walks between tea gardens and time to do very little.", duration: "2–4 days", receive: "A hill stay arranged for you", priceFromEur: 150, photo: PHOTOS.hills },
  { kind: "culture", title: "A day on the backwaters", line: "A houseboat or canoe through palm-lined canals and village life.", duration: "1–2 days", receive: "A private boat and local guide", priceFromEur: 140, photo: PHOTOS.houseboat },
  { kind: "culture", title: "A Kathakali evening", line: "Watch the make-up being applied, then a performance of classical dance-drama.", duration: "An evening", receive: "Seats and a short introduction", priceFromEur: 30, photo: PHOTOS.kathakali },
  { kind: "culture", title: "Kerala's kitchens", line: "A home-cooked sadya on a banana leaf, and the spice markets behind it.", duration: "Half a day", receive: "A hosted meal and market walk", priceFromEur: 45, photo: PHOTOS.sadya },
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

/** What it costs, and nothing else (5 Nov call: "keep it very simple"). */
export const PRICING = [
  { title: "What the provider charges", text: "The hospital, clinic, retreat or guide's own price, passed on to you unchanged." },
  { title: "Our service fee", text: "One clear fee for planning your trip and looking after you." },
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
  { q: "What does a whole trip cost?", a: "It depends on what you choose and for how long: what each provider charges, plus our service fee, without flights. \"Choose what you need\" shows where prices start, and your trip page shows every price before you decide." },
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
