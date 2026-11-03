import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { NEXT_STEPS } from "../../content";

export const metadata: Metadata = {
  title: { absolute: "Thank you · Aalmaram Health" },
  robots: { index: false },
};

export default function TalkThanksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <CheckCircle2 className="h-12 w-12 text-leaf-600" aria-hidden="true" />
      <h1 className="mt-6 font-display text-[38px] font-medium leading-[1.1] tracking-tight text-banyan-900 sm:text-[48px]">
        Thank you — we will be in touch
      </h1>
      <p className="mt-4 text-[20px] leading-relaxed text-ink-700">
        Your request has reached our team. Here is what happens now.
      </p>
      <ol className="mt-10 space-y-6">
        {NEXT_STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-banyan-900 font-display text-[19px] text-white">
              {i + 1}
            </span>
            <div>
              <p className="text-[19px] font-semibold text-ink-900">{step.title}</p>
              <p className="mt-1 leading-relaxed text-ink-700">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/" className="mt-12 inline-flex min-h-12 items-center rounded-full border-2 border-kasavu-200 px-6 text-[18px] font-semibold text-ink-900 hover:border-banyan-800">
        Back to the homepage
      </Link>
    </div>
  );
}
