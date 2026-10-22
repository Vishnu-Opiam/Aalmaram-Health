import type {
  AddedBy,
  ClientStatus,
  RecordStatus,
  ReportStatus,
  TripStatus,
} from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { tripStatusLabel } from "@/domain/trips/status";

const TRIP_TONES: Record<TripStatus, BadgeTone> = {
  PLANNING: "info",
  AWAITING_PAYMENT: "warning",
  BOOKING: "accent",
  READY: "success",
  IN_PROGRESS: "success",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge tone={TRIP_TONES[status]}>{tripStatusLabel(status)}</Badge>;
}

const ADDED_BY: Record<AddedBy, { label: string; tone: BadgeTone }> = {
  TEAM: { label: "Health core", tone: "accent" },
  CLIENT: { label: "Client", tone: "neutral" },
  AI: { label: "Suggested", tone: "info" },
};

export function AddedByBadge({ addedBy }: { addedBy: AddedBy }) {
  return <Badge tone={ADDED_BY[addedBy].tone}>{ADDED_BY[addedBy].label}</Badge>;
}

const CLIENT_LABELS: Record<ClientStatus, string> = {
  LEAD: "Lead",
  INTAKE: "Intake",
  PLANNING: "Planning",
  PROPOSAL_SENT: "Proposal sent",
  CONFIRMED: "Confirmed",
  ARCHIVED: "Archived",
};

const CLIENT_TONES: Record<ClientStatus, BadgeTone> = {
  LEAD: "neutral",
  INTAKE: "info",
  PLANNING: "info",
  PROPOSAL_SENT: "accent",
  CONFIRMED: "success",
  ARCHIVED: "neutral",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge tone={CLIENT_TONES[status]}>{CLIENT_LABELS[status]}</Badge>;
}

export const CLIENT_STATUS_OPTIONS = Object.entries(CLIENT_LABELS).map(
  ([value, label]) => ({ value: value as ClientStatus, label }),
);

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return (
    <Badge tone={status === "ACTIVE" ? "success" : "neutral"}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge tone={status === "PUBLISHED" ? "success" : "neutral"}>
      {status === "PUBLISHED" ? "Published" : "Draft"}
    </Badge>
  );
}
