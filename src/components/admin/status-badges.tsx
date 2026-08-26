import type {
  ChangeRequestStatus,
  ClientStatus,
  ItineraryItemStatus,
  ItineraryStatus,
  RecordStatus,
  ReportStatus,
} from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { humanStatus } from "@/domain/itineraries/status";

const ITINERARY_TONES: Record<ItineraryStatus, BadgeTone> = {
  DRAFT: "neutral",
  READY_FOR_REVIEW: "info",
  PUBLISHED: "accent",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
  ARCHIVED: "neutral",
};

export function ItineraryStatusBadge({ status }: { status: ItineraryStatus }) {
  return <Badge tone={ITINERARY_TONES[status]}>{humanStatus(status)}</Badge>;
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

const ITEM_LABELS: Record<ItineraryItemStatus, string> = {
  PLANNED: "Planned",
  CONFIRMED: "Confirmed",
  REMOVED: "Removed",
};

const ITEM_TONES: Record<ItineraryItemStatus, BadgeTone> = {
  PLANNED: "info",
  CONFIRMED: "success",
  REMOVED: "neutral",
};

export function ItemStatusBadge({ status }: { status: ItineraryItemStatus }) {
  return <Badge tone={ITEM_TONES[status]}>{ITEM_LABELS[status]}</Badge>;
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge tone={status === "PUBLISHED" ? "success" : "neutral"}>
      {status === "PUBLISHED" ? "Published" : "Draft"}
    </Badge>
  );
}

export function ChangeRequestStatusBadge({
  status,
}: {
  status: ChangeRequestStatus;
}) {
  return (
    <Badge tone={status === "OPEN" ? "warning" : "success"}>
      {status === "OPEN" ? "Open" : "Resolved"}
    </Badge>
  );
}
