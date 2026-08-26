import Link from "next/link";
import { buttonClasses } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-serif text-3xl text-ink-900">Not found</p>
        <p className="mt-2 text-sm text-ink-500">
          That page does not exist, or you do not have access to it.
        </p>
        <Link href="/" className={buttonClasses("secondary", "md", "mt-6")}>
          Go back
        </Link>
      </div>
    </main>
  );
}
