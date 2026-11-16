import type { Suggestion, SuggestFn } from "@/components/builder/add-panel";
import type { BuilderTrip, LibraryComponent } from "@/domain/trips/builder-view";
import type { Action } from "./action-button";

export type { Action, Suggestion, SuggestFn };

export type DaysActions = { add: Action; move: Action; remove: Action; build: Action; ask: Action; suggest?: SuggestFn };

/** What every part of Day by day needs: the trip, the actions and the two panels. */
export type DaysCtx = {
  trip: BuilderTrip;
  /** The coordinator's first name ("Priya"), or "us". */
  contact: string;
  actions: DaysActions;
  /** Every experience by id (the add sheet, idea cards, undo names). */
  byId: Map<string, LibraryComponent>;
  /** This page for a day, as an action's `returnTo` ("/trip/itinerary?trip=…&day=…"). */
  back: (dayKey: string) => string;
  /** Explore, "choosing for" a day and time. */
  explore: (dayKey: string, at?: string) => string;
  openItem: (id: string, move?: boolean) => void;
  openAdd: (dayKey: string, at?: string, componentId?: string) => void;
  /** The item just added or moved (highlighted and focused once). */
  highlight: { id: string; label: string } | null;
};
