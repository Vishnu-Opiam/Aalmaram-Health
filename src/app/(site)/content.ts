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
  { kind: "health", Icon: Stethoscope, title: "Health check", line: "A full check-up with blood tests, scans and a doctor's consultation.", duration: "1–2 days", receive: "Written results in English", priceFromEur: 250 },
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
