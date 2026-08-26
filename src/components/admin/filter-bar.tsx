import { Search } from "lucide-react";
import { AppLink as Link, buttonClasses } from "@/components/ui/primitives";

/**
 * Server-rendered filter bar.
 *
 * Filters are plain GET form fields, so every list view is linkable,
 * bookmarkable and works without JavaScript. `action` is the list route.
 */
export type FilterSelect = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  action,
  searchName = "q",
  searchValue = "",
  searchPlaceholder = "Search…",
  selects = [],
  resetHref,
  children,
}: {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  resetHref?: string;
  children?: React.ReactNode;
}) {
  const hasFilters =
    Boolean(searchValue) || selects.some((select) => select.value !== "");

  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-sand-200 bg-white p-3"
    >
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor={searchName}
          className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400"
        >
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id={searchName}
            name={searchName}
            type="search"
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-sand-300 bg-white py-2 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {selects.map((select) => (
        <div key={select.name} className="min-w-[150px]">
          <label
            htmlFor={select.name}
            className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400"
          >
            {select.label}
          </label>
          <select
            id={select.name}
            name={select.name}
            defaultValue={select.value}
            className="w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-ink-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {children}

      <button type="submit" className={buttonClasses("secondary", "md")}>
        Apply
      </button>

      {hasFilters && resetHref && (
        <Link href={resetHref} className={buttonClasses("ghost", "md")}>
          Clear
        </Link>
      )}
    </form>
  );
}
