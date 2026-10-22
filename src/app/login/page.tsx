import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/**
 * No `searchParams` here - see NewItineraryPage. The post-login `?next=`
 * destination is read inside LoginForm with `useSearchParams()`.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl tracking-tight text-ink-900">
            Aalmaram Health
          </p>
          <p className="mt-1 text-[13px] text-ink-500">
            Internal operations dashboard
          </p>
        </div>

        <div className="rounded-lg border border-sand-200 bg-white p-6 shadow-[0_1px_2px_rgba(23,21,18,0.04)]">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Client looking for your trip?{" "}
          <a href="/trip" className="text-teal-600 underline underline-offset-4">
            Open your portal
          </a>
        </p>
      </div>
    </main>
  );
}
