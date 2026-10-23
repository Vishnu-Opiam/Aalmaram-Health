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
  deliverable: string | null;
  price: string;
  currency: string;
  priceUnitLabel: string;
  durationMinutes: number;
  vendorName: string;
  branches: BranchOption[];
};

export type Library = {
  modules: {
    id: string;
    name: string;
    catalogues: { id: string; name: string; components: LibraryComponent[] }[];
  }[];
};
