import { AppLink as Link } from "@/components/ui/primitives";
import { LogOut } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/nav";
import { logoutAction } from "@/app/login/actions";
import { initials } from "@/lib/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserPage("/admin");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <aside className="shrink-0 border-b border-sand-200 bg-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/admin" className="block">
            <p className="font-serif text-[17px] leading-tight tracking-tight text-ink-900">
              Aalmaram Health
            </p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
              Operations
            </p>
          </Link>
        </div>

        <AdminNav />

        <div className="border-t border-sand-200 px-3 py-3 lg:mt-auto">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-700"
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-800">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-ink-400">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-ink-500 transition-colors hover:bg-sand-100 hover:text-ink-900"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="admin-content" className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] px-5 py-7 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
