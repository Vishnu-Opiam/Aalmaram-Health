import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { FileText, MessageSquareWarning, User } from "lucide-react";
import {
  AppLink as Link,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import { ComponentLibrary } from "./component-library";
import { ItemEditor } from "./item-editor";
import { PublishPanel } from "./publish-panel";
import { TripDetailsForm } from "./trip-details-form";
import {
  ItemStatusBadge,
  ItineraryStatusBadge,
} from "@/components/admin/status-badges";
import {
  loadComponentFilterOptions,
  searchComponents,
} from "@/domain/components/queries";
import {
  effectivePrice,
  formatMoney,
  sumItems,
} from "@/domain/itineraries/pricing";
import {
  groupItemsByDay,
  loadItineraryDetail,
  summariseItinerary,
} from "@/domain/itineraries/queries";
import { isEditable } from "@/domain/itineraries/status";
import {
  formatDateRange,
  formatLongDate,
  formatShortDate,
  toDateInputValue,
} from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Itinerary builder" };

/**
 * The itinerary builder.
 *
 * Two panels: the component library on the left, the proposal being assembled
 * on the right, with publishing and trip details in a side rail.
 *
 * This route reads NO `searchParams`. It hosts Server Actions that deliberately
 * do not redirect (add a component, reorder, edit an item) - Next re-renders
 * the page in place to show the result, and a tree that awaits `searchParams`
 * blocks during that render. The library therefore receives the active
 * catalogue as props and filters it in the browser.
 */
export default async function ItineraryBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/itineraries");
  const { id } = await params;

  const itinerary = await loadItineraryDetail(id);
  if (!itinerary) nextNotFound();

  const summary = summariseItinerary(itinerary);
  const editable = isEditable(itinerary.status);
  const days = groupItemsByDay(itinerary, itinerary.items);
  const currency = summary.currencies[0] ?? "EUR";

  // The whole active catalogue is sent to the client once; the library panel
  // filters it in the browser. See component-library.tsx for why.
  const LIBRARY_CAP = 500;
  const [{ modules, catalogues, vendors }, libraryRows] = await Promise.all([
    loadComponentFilterOptions(),
    searchComponents({ status: "ACTIVE", sort: "name_asc" }, LIBRARY_CAP),
  ]);

  const libraryComponents = libraryRows.map((component) => ({
    id: component.id,
    name: component.name,
    description: component.clientFacingDescription,
    price: formatMoney(component.price, component.currency),
    tags: component.tags,
    vendorId: component.vendor.id,
    vendorName: component.vendor.name,
    catalogueId: component.catalogue.id,
    catalogueName: component.catalogue.name,
    moduleId: component.catalogue.module.id,
    moduleName: component.catalogue.module.name,
  }));

  const basePath = `/admin/itineraries/${itinerary.id}`;
  const tripStart = toDateInputValue(itinerary.startDate);
  const tripEnd = toDateInputValue(itinerary.endDate);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/itineraries" className="hover:underline">
            Itineraries
          </Link>
        }
        title={itinerary.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/admin/clients/${itinerary.client.id}`}
              className="flex items-center gap-1 text-teal-600 hover:underline"
            >
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {itinerary.client.name}
            </Link>
            <span aria-hidden="true">·</span>
            <span>
              {formatDateRange(itinerary.startDate, itinerary.endDate)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{pluralise(summary.itemCount, "item")}</span>
          </span>
        }
        actions={
          <>
            <ItineraryStatusBadge status={itinerary.status} />
            {summary.openChangeRequests.length > 0 && (
              <ButtonLink
                href={`${basePath}/changes`}
                variant="secondary"
                size="sm"
              >
                <MessageSquareWarning
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                {summary.openChangeRequests.length} change request
                {summary.openChangeRequests.length === 1 ? "" : "s"}
              </ButtonLink>
            )}
            <ButtonLink
              href={`${basePath}/report`}
              variant="secondary"
              size="sm"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              What-to-Expect report
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* LEFT: component library */}
          <Card
            className="self-start"
            role="region"
            aria-label="Component library"
          >
            <CardHeader
              title="Component library"
              description={
                editable
                  ? "Search and add to the itinerary."
                  : "Read-only while this proposal is with the client."
              }
            />
            <ComponentLibrary
              itineraryId={itinerary.id}
              editable={editable}
              components={libraryComponents}
              modules={modules.map((m) => ({ id: m.id, name: m.name }))}
              catalogues={catalogues.map((c) => ({
                id: c.id,
                name: c.name,
                moduleId: c.moduleId,
              }))}
              vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
              truncated={libraryRows.length === LIBRARY_CAP}
            />
          </Card>

          {/* RIGHT: the proposal being assembled */}
          <Card className="self-start" role="region" aria-label="Itinerary">
            <CardHeader
              title="Itinerary"
              description="Proposed schedule. Dates here are proposals, not vendor-confirmed appointments."
              action={
                <span className="text-sm font-semibold tabular-nums text-ink-900">
                  {formatMoney(summary.total, currency)}
                </span>
              }
            />

            {itinerary.items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Nothing added yet"
                  description="Search the component library on the left and add the first element of this journey."
                />
              </div>
            ) : (
              <div className="divide-y divide-sand-200">
                {days.map((day) => {
                  const dayItems = day.items;
                  const dayTotal = sumItems(dayItems);

                  return (
                    <section key={day.key}>
                      <div className="flex items-baseline justify-between gap-3 bg-sand-50 px-5 py-2.5">
                        <h3 className="text-[13px] font-semibold text-ink-900">
                          {day.date ? (
                            <>
                              {day.dayNumber !== null && day.dayNumber > 0 && (
                                <span className="mr-2 text-ink-400">
                                  Day {day.dayNumber}
                                </span>
                              )}
                              {formatLongDate(day.date)}
                            </>
                          ) : (
                            <span className="text-warning-600">
                              Not yet scheduled
                            </span>
                          )}
                        </h3>
                        <span className="text-xs tabular-nums text-ink-500">
                          {formatMoney(dayTotal, currency)}
                        </span>
                      </div>

                      <ul className="divide-y divide-sand-200">
                        {dayItems.map((item, index) => (
                          <li key={item.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-ink-900">
                                  {item.customTitle?.trim() ||
                                    item.component.name}
                                  {item.customTitle?.trim() && (
                                    <span className="ml-2 text-xs font-normal text-ink-400">
                                      ({item.component.name})
                                    </span>
                                  )}
                                </p>
                                <p className="mt-0.5 text-xs text-ink-500">
                                  {item.component.catalogue.module.name} ·{" "}
                                  {item.component.catalogue.name} ·{" "}
                                  <Link
                                    href={`/admin/vendors/${item.component.vendor.id}`}
                                    className="hover:text-teal-600 hover:underline"
                                  >
                                    {item.component.vendor.name}
                                  </Link>
                                  {item.component.vendor.location &&
                                    `, ${item.component.vendor.location}`}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <ItemStatusBadge status={item.status} />
                                  {item.component.status === "INACTIVE" && (
                                    <Badge tone="danger">
                                      Component deactivated
                                    </Badge>
                                  )}
                                  {item.priceOverride && (
                                    <Badge tone="warning">
                                      Price overridden
                                    </Badge>
                                  )}
                                  {!item.scheduledDate && (
                                    <Badge tone="warning">No date</Badge>
                                  )}
                                </div>

                                {item.clientFacingNotes && (
                                  <p className="mt-2 rounded bg-teal-50 px-2.5 py-1.5 text-xs text-teal-700">
                                    <span className="font-medium">
                                      Client note:{" "}
                                    </span>
                                    {item.clientFacingNotes}
                                  </p>
                                )}
                                {item.internalNotes && (
                                  <p className="mt-1.5 rounded bg-sand-100 px-2.5 py-1.5 text-xs text-ink-600">
                                    <span className="font-medium">
                                      Internal:{" "}
                                    </span>
                                    {item.internalNotes}
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-[13px] font-medium tabular-nums text-ink-900">
                                  {formatMoney(
                                    effectivePrice(item),
                                    item.component.currency,
                                  )}
                                </p>
                                <p className="text-xs text-ink-400">
                                  {item.component.unit}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5">
                              <ItemEditor
                                itemId={item.id}
                                componentName={item.component.name}
                                scheduledDate={toDateInputValue(
                                  item.scheduledDate,
                                )}
                                customTitle={item.customTitle ?? ""}
                                clientFacingNotes={item.clientFacingNotes ?? ""}
                                internalNotes={item.internalNotes ?? ""}
                                priceOverride={
                                  item.priceOverride?.toString() ?? ""
                                }
                                status={item.status}
                                componentPriceLabel={formatMoney(
                                  item.component.price,
                                  item.component.currency,
                                )}
                                tripStart={tripStart}
                                tripEnd={tripEnd}
                                canMoveUp={index > 0}
                                canMoveDown={index < dayItems.length - 1}
                                disabled={!editable}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}

                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13px] font-medium text-ink-700">
                    Indicative total ({pluralise(summary.itemCount, "item")})
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink-900">
                    {formatMoney(summary.total, currency)}
                  </span>
                </div>

                {summary.currencies.length > 1 && (
                  <p className="bg-warning-50 px-5 py-2.5 text-xs text-warning-600">
                    This itinerary mixes {summary.currencies.join(", ")}. The
                    total above adds the raw amounts and is not a true converted
                    figure.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* -------------------------------------------------- side rail */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Publishing"
              description="Explicit. Nothing reaches the client by accident."
            />
            <PublishPanel
              itineraryId={itinerary.id}
              status={itinerary.status}
              issues={summary.validation.issues.map((issue) => issue.message)}
              hasReport={Boolean(itinerary.report)}
              publishedAt={
                itinerary.publishedAt
                  ? formatShortDate(itinerary.publishedAt)
                  : null
              }
            />
          </Card>

          <Card>
            <CardHeader
              title="Trip details"
              description={
                editable
                  ? undefined
                  : "Locked while the proposal is with the client."
              }
            />
            <TripDetailsForm
              itineraryId={itinerary.id}
              title={itinerary.title}
              startDate={tripStart}
              endDate={tripEnd}
              adminNotes={itinerary.adminNotes ?? ""}
              clientNotes={itinerary.clientNotes ?? ""}
              disabled={!editable}
            />
          </Card>

          <Card>
            <CardHeader title="Daily totals" />
            {summary.dayTotals.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-ink-400">
                No priced items yet.
              </p>
            ) : (
              <ul className="divide-y divide-sand-200">
                {summary.dayTotals.map((day) => (
                  <li
                    key={day.dayNumber ?? "unscheduled"}
                    className="flex items-center justify-between px-5 py-2.5 text-[13px]"
                  >
                    <span className="text-ink-600">
                      {day.dayNumber === null
                        ? "Unscheduled"
                        : `Day ${day.dayNumber}`}
                      <span className="ml-2 text-xs text-ink-400">
                        {pluralise(day.itemCount, "item")}
                      </span>
                    </span>
                    <span className="tabular-nums text-ink-900">
                      {formatMoney(day.total, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
