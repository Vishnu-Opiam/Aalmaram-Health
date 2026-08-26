"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppLink as Link, Badge, Select } from "@/components/ui/primitives";
import { addItineraryItemAction } from "../actions";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";

/**
 * The left-hand component library of the itinerary builder.
 *
 * Filtering happens in the browser rather than through the URL. Two reasons:
 *
 *  1. UX - the admin is assembling an itinerary in the right-hand panel. Every
 *     filter change used to reload the whole route; now it is instant and the
 *     itinerary never flickers.
 *  2. Correctness - this page hosts Server Actions that do not redirect (add,
 *     reorder, edit an item). Next re-renders the page in place to show the
 *     result, and a page whose tree awaits `searchParams` blocks during that
 *     render. Keeping the builder free of `searchParams` avoids the problem
 *     entirely.
 *
 * The catalogue is small by design (an MVP inventory of tens to low hundreds of
 * components), so the whole active set is sent once. `truncated` tells the
 * admin honestly when the cap was hit rather than silently showing a subset.
 */
export type LibraryComponent = {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  vendorId: string;
  vendorName: string;
  catalogueId: string;
  catalogueName: string;
  moduleId: string;
  moduleName: string;
};

export type LibraryOption = { id: string; name: string };

export function ComponentLibrary({
  itineraryId,
  editable,
  components,
  modules,
  catalogues,
  vendors,
  truncated,
}: {
  itineraryId: string;
  editable: boolean;
  components: LibraryComponent[];
  modules: LibraryOption[];
  catalogues: (LibraryOption & { moduleId: string })[];
  vendors: LibraryOption[];
  truncated: boolean;
}) {
  const [query, setQuery] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [catalogueId, setCatalogueId] = useState("");
  const [vendorId, setVendorId] = useState("");

  const visibleCatalogues = moduleId
    ? catalogues.filter((catalogue) => catalogue.moduleId === moduleId)
    : catalogues;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return components.filter((component) => {
      if (moduleId && component.moduleId !== moduleId) return false;
      if (catalogueId && component.catalogueId !== catalogueId) return false;
      if (vendorId && component.vendorId !== vendorId) return false;
      if (!needle) return true;
      return (
        component.name.toLowerCase().includes(needle) ||
        component.description.toLowerCase().includes(needle) ||
        component.tags.some((tag) => tag.includes(needle))
      );
    });
  }, [components, query, moduleId, catalogueId, vendorId]);

  const filtered = query || moduleId || catalogueId || vendorId;

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-2 rounded-md border border-sand-200 bg-sand-50 p-2.5">
        <div className="relative">
          <label htmlFor="library-search" className="sr-only">
            Search components
          </label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, description or tag…"
            className="w-full rounded-md border border-sand-300 bg-white py-2 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="library-module" className="sr-only">
              Filter by module
            </label>
            <Select
              id="library-module"
              value={moduleId}
              onChange={(event) => {
                setModuleId(event.target.value);
                setCatalogueId("");
              }}
              className="text-[13px]"
            >
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="library-catalogue" className="sr-only">
              Filter by catalogue
            </label>
            <Select
              id="library-catalogue"
              value={catalogueId}
              onChange={(event) => setCatalogueId(event.target.value)}
              className="text-[13px]"
            >
              <option value="">All catalogues</option>
              {visibleCatalogues.map((catalogue) => (
                <option key={catalogue.id} value={catalogue.id}>
                  {catalogue.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="library-vendor" className="sr-only">
              Filter by vendor
            </label>
            <Select
              id="library-vendor"
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="text-[13px]"
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-400">
          <span>
            {results.length} of {components.length} active component
            {components.length === 1 ? "" : "s"}
          </span>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setModuleId("");
                setCatalogueId("");
                setVendorId("");
              }}
              className="font-medium text-teal-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {truncated && (
        <p className="rounded bg-warning-50 px-2.5 py-1.5 text-xs text-warning-600">
          Showing the first {components.length} active components. Narrow the
          search on the Components screen if what you need is not listed.
        </p>
      )}

      {results.length === 0 ? (
        <p className="px-2 py-8 text-center text-[13px] text-ink-400">
          No active components match those filters.
        </p>
      ) : (
        <ul className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
          {results.map((component) => (
            <li
              key={component.id}
              className="rounded-md border border-sand-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/components/${component.id}`}
                    className="text-[13px] font-medium text-ink-900 hover:text-teal-600 hover:underline"
                  >
                    {component.name}
                  </Link>
                  <p className="text-xs text-ink-400">
                    {component.moduleName} · {component.vendorName}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-medium tabular-nums text-ink-700">
                  {component.price}
                </span>
              </div>

              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                {component.description}
              </p>

              {component.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {component.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              )}

              <AddToItineraryButton
                itineraryId={itineraryId}
                componentId={component.id}
                disabled={!editable}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One add button per catalogue entry.
 *
 * It is its own component because each needs its own action state, and hooks
 * cannot be called inside the list's map(). Navigation happens through
 * useActionRedirect once the action has settled - see FormState.redirectTo.
 */
function AddToItineraryButton({
  itineraryId,
  componentId,
  disabled,
}: {
  itineraryId: string;
  componentId: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(addItineraryItemAction, idleState);
  useActionRedirect(state);

  return (
    <form action={action} className="mt-2.5">
      <input type="hidden" name="itineraryId" value={itineraryId} />
      <input type="hidden" name="componentId" value={componentId} />
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded border border-sand-300 px-2 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        Add to itinerary
      </button>
      {state.status === "error" && (
        <FormFeedback state={state} className="mt-2" />
      )}
    </form>
  );
}
