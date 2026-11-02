import { Bone, Eye, HeartPulse, Landmark, Leaf, Smile, Stethoscope, type LucideIcon } from "lucide-react";
import type { Kind } from "@/components/portal/ui";

/**
 * Homepage copy, kept apart from layout so it can be rewritten in one place.
 * Placeholder wording from the 2 Nov 2026 call: Nivedith will replace it.
 * Prices are indicative ranges for orientation only — every quote comes from
 * the provider before anything is booked.
 */

export const HERO = {
  title: "Health check-ups, Ayurveda and culture in Kerala — arranged for you",
  line:
    "Aalmaram Health plans and looks after your health journey to Kerala, with licensed providers we know. We are a concierge, not a clinic.",
  forWhom: "For people from the UK, Austria, Slovenia and beyond who want planned care, rest and a real trip — without arranging it alone.",
  context: "If waiting lists or private prices at home are holding you back, Kerala can be a calm, well-organised alternative.",
};

export const STEPS = [
  { title: "A free call with a person", text: "Tell us what you are looking for. We listen, answer your questions and there is no obligation." },
  { title: "We draft your plan", text: "Your coordinator puts appointments, wellness and culture from vetted providers into your private trip page." },
  { title: "You shape it and book", text: "Move days, add or remove things and see every price. Nothing is booked until you confirm and pay." },
  { title: "Travel, then take it home", text: "We look after you in Kerala. Your results and reports come to you — and to your own doctor if you wish." },
];

export const WHY_KERALA = [
  { title: "Established hospitals", text: "Kerala has large private hospitals and clinics; several hold national (NABH) or international (JCI) accreditation." },
  { title: "English spoken", text: "English is widely used by doctors and staff in Kerala's private hospitals." },
  { title: "Clear, lower costs", text: "Private prices are often well below private prices in Western Europe. You see your quote before you decide." },
  { title: "Ayurveda and a real holiday", text: "Kerala is a home of classical Ayurveda, with backwaters, hills, coast and centuries of history to enjoy." },
];

export type NeedTile = {
  kind: Kind;
  Icon: LucideIcon;
  title: string;
  line: string;
  duration: string;
  receive: string;
  price: string;
};

export const NEEDS: NeedTile[] = [
  { kind: "health", Icon: Stethoscope, title: "Health check", line: "A full check-up with blood tests, scans and a doctor's consultation.", duration: "1–2 days", receive: "Written results in English", price: "from €250" },
  { kind: "health", Icon: HeartPulse, title: "Heart", line: "Cardiology consultation with ECG, echo and stress test as your cardiologist advises.", duration: "1–2 days", receive: "Report and consultation notes", price: "from €350" },
  { kind: "health", Icon: Bone, title: "Joints", line: "Orthopaedic assessment with imaging, and physiotherapy if recommended.", duration: "1–5 days", receive: "Imaging report and care plan from the provider", price: "from €300" },
  { kind: "health", Icon: Smile, title: "Dental", line: "Dental examination and planned treatment at a modern dental clinic.", duration: "2–10 days", receive: "Treatment plan and records", price: "from €150" },
  { kind: "health", Icon: Eye, title: "Eyes", line: "Eye examination with an ophthalmologist; planned surgery only if your surgeon advises it.", duration: "1–7 days", receive: "Examination report", price: "from €100" },
  { kind: "wellness", Icon: Leaf, title: "Ayurveda", line: "A classical Ayurveda programme with consultations and daily treatments.", duration: "7–21 days", receive: "Programme summary from the practitioner", price: "from €900" },
  { kind: "culture", Icon: Landmark, title: "Culture", line: "Fort Kochi, the backwaters, temple arts and Kerala's kitchens, at your pace.", duration: "1–4 days", receive: "A guided, private itinerary", price: "from €80" },
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

export const FAQ = [
  { q: "Are you a hospital or clinic?", a: "No. We are a concierge: we plan your trip and coordinate with independent, licensed providers in Kerala, who give all medical care." },
  { q: "Is the first call really free?", a: "Yes. It is a conversation with a person on our team, with no obligation to book." },
  { q: "Can my own doctor be involved?", a: "Yes. With your permission we send your results and reports to your doctor at home." },
  { q: "How do I know what it will cost?", a: "Your trip page shows every provider's price and our service fee before you confirm. Nothing is booked until you have paid." },
  { q: "Which countries do you work with?", a: "We are starting with clients from the UK, Austria and Slovenia, and welcome enquiries from anywhere." },
  { q: "Can I change my plans?", a: "You can change your plan freely until you confirm it. Our terms for changes after payment will be shared with you before you pay." },
];
