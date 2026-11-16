import type { AddedBy, BookingStatus, TripStatus } from "@prisma/client";
import type { BlockProgress } from "@/domain/bookings/status";

/**
 * The itinerary builder's view model, shared by the admin trip page and the
 * client portal. It is a CLIENT-SAFE projection: vendor contact details,
 * internal notes, cost status and sources are never part of it, so neither
 * screen can leak them through a template change. Plain JSON (no Date or
 * Decimal) so it crosses the server/client boundary unchanged.
 */

export type BranchOption = { id: string; label: string };

export type ProviderInfo = {
  name: string;
  description: string | null;
  accreditations: string[];
  languages: string[];
  yearEstablished: number | null;
};

/**
 * One photo of a place. `url` is a site path (`/partners/...`) or an https URL;
 * width/height are the stored file's, so the UI can tell a panorama or a small
 * image (under ~1200px wide) from one that can lead a page. `isHero` is set on
 * at most one photo, which then comes first.
 */
export type PlacePhoto = {
  url: string;
  alt: string;
  width: number;
  height: number;
  isHero: boolean;
  credit: string | null;
};

/** The place (vendor) behind an experience, enough to link to and picture it. */
export type PlaceRef = {
  slug: string;
  name: string;
  /** Town or city label, e.g. "Kochi" or "Palakkad (Kodumbu)". */
  city: string | null;
  /** Hero first, then the gallery order. Empty: show a typographic card. */
  photos: PlacePhoto[];
};

export type PractitionerInfo = {
  name: string;
  role: string;
  qualifications: string[];
  yearsOfExperience: number | null;
  languages: string[];
};

export type BuilderBlock = {
  id: string;
  componentId: string;
  title: string;
  day: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  /** Last calendar day the block covers (= `day` unless it runs 24 h or more). */
  endDay: string;
  /** Calendar days covered: a seven-day programme is 7, anything under 24 h is 1. */
  spanDays: number;
  addedBy: AddedBy;
  canEdit: boolean;
  price: string;
  currency: string;
  priceUnitLabel: string;
  moduleName: string;
  catalogueName: string;
  description: string;
  whatsIncluded: string | null;
  deliverable: string | null;
  recoveryMinutes: number | null;
  branchId: string | null;
  branchLabel: string | null;
  branches: BranchOption[];
  provider: ProviderInfo;
  place: PlaceRef;
  practitioners: PractitionerInfo[];
  note: string | null;
  overlaps: boolean;
  /** Planned → ✓✓ confirmed → green ✓ booked. */
  progress: BlockProgress;
  /** Staff only (null for the client): the booking's own status. */
  bookingStatus: BookingStatus | null;
};

export type BuilderDay = {
  key: string;
  dayNumber: number;
  blocks: BuilderBlock[];
};

export type MixRow = { moduleName: string; target: number | null; actual: number };

export type BuilderTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  travellers: number;
  status: TripStatus;
  editable: boolean;
  confirmedAt: string | null;
  total: string;
  currency: string;
  mixedCurrencies: boolean;
  blockCount: number;
  days: BuilderDay[];
  mix: MixRow[];
};

export type LibraryComponent = {
  id: string;
  name: string;
  description: string;
  whatsIncluded: string | null;
  tags: string[];
  deliverable: string | null;
  price: string;
  currency: string;
  priceUnitLabel: string;
  durationMinutes: number;
  moduleName: string;
  vendorName: string;
  provider: ProviderInfo;
  place: PlaceRef;
  branches: BranchOption[];
};

export type Library = {
  modules: {
    id: string;
    name: string;
    catalogues: { id: string; name: string; components: LibraryComponent[] }[];
  }[];
};

/**
 * A partner place for Explore (`/trip/explore/<slug>`). Listed even with no
 * experiences yet: real partners start without priced components.
 */
export type Place = {
  slug: string;
  name: string;
  /** Primary module (Health & Medical, Wellness & Spa, Heritage & Culture); null if unknown. */
  module: string | null;
  /** Every module the place appears under: the primary one first, then its experiences'. */
  modules: string[];
  /** e.g. "Ayurveda Hospital", "Museum". */
  typeLabel: string | null;
  city: string | null;
  description: string | null;
  highlights: string[];
  accreditations: string[];
  languages: string[];
  yearEstablished: number | null;
  /** Branch labels ("Fort Kochi, Kochi"), when the place has branches on record. */
  locations: string[];
  photos: PlacePhoto[];
  experiences: LibraryComponent[];
  /** Cheapest experience (with its unit label), or null without experiences or across currencies. */
  fromPrice: { amount: string; currency: string; unitLabel: string } | null;
};
