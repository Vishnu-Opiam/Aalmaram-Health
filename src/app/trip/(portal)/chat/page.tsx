import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  await requireClientPage();
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="font-serif text-4xl tracking-tight text-ink-900">Chat</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
        Coming soon: talk to our assistant or your relationship manager here. In the meantime, simply reply to any email
        from us.
      </p>
    </div>
  );
}
