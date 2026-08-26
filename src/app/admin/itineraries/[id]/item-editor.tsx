"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  Field,
  Input,
  Select,
  Textarea,
  buttonClasses,
} from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import {
  moveItineraryItemAction,
  removeItineraryItemAction,
  updateItineraryItemAction,
} from "../actions";

export type ItemEditorProps = {
  itemId: string;
  componentName: string;
  scheduledDate: string;
  customTitle: string;
  clientFacingNotes: string;
  internalNotes: string;
  priceOverride: string;
  status: string;
  componentPriceLabel: string;
  tripStart: string;
  tripEnd: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
};

export function ItemEditor(props: ItemEditorProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateItineraryItemAction, idleState);
  useActionRedirect(state);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <MoveButton
          itemId={props.itemId}
          direction="up"
          disabled={props.disabled || !props.canMoveUp}
        />
        <MoveButton
          itemId={props.itemId}
          direction="down"
          disabled={props.disabled || !props.canMoveDown}
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="text-[13px] font-medium text-teal-600 hover:underline"
        >
          {open ? "Close" : "Edit"}
        </button>
        <RemoveButton
          itemId={props.itemId}
          componentName={props.componentName}
          disabled={props.disabled}
        />
      </div>

      {open && (
        <form
          action={action}
          className="mt-3 space-y-4 rounded-md border border-sand-200 bg-sand-50 p-4"
          noValidate
        >
          <input type="hidden" name="itemId" value={props.itemId} />
          <FormFeedback state={state} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Proposed date"
              htmlFor={`date-${props.itemId}`}
              hint={
                props.tripStart && props.tripEnd
                  ? `Must fall between ${props.tripStart} and ${props.tripEnd}.`
                  : "Set the trip dates first."
              }
              errors={state.fieldErrors.scheduledDate}
            >
              <Input
                id={`date-${props.itemId}`}
                name="scheduledDate"
                type="date"
                min={props.tripStart || undefined}
                max={props.tripEnd || undefined}
                defaultValue={props.scheduledDate}
                disabled={props.disabled}
                invalid={Boolean(state.fieldErrors.scheduledDate)}
              />
            </Field>

            <Field
              label="Item status"
              htmlFor={`status-${props.itemId}`}
              hint="Proposed, not vendor-confirmed."
              errors={state.fieldErrors.status}
            >
              <Select
                id={`status-${props.itemId}`}
                name="status"
                defaultValue={props.status}
                disabled={props.disabled}
              >
                <option value="PLANNED">Planned</option>
                <option value="CONFIRMED">Confirmed with vendor</option>
                <option value="REMOVED">Removed (excluded from totals)</option>
              </Select>
            </Field>
          </div>

          <Field
            label="Override displayed title"
            htmlFor={`title-${props.itemId}`}
            hint={`Leave blank to use "${props.componentName}".`}
            errors={state.fieldErrors.customTitle}
          >
            <Input
              id={`title-${props.itemId}`}
              name="customTitle"
              defaultValue={props.customTitle}
              disabled={props.disabled}
              invalid={Boolean(state.fieldErrors.customTitle)}
            />
          </Field>

          <Field
            label="Note to the client"
            htmlFor={`clientNotes-${props.itemId}`}
            hint="Appears under this item in the proposal and report."
            errors={state.fieldErrors.clientFacingNotes}
          >
            <Textarea
              id={`clientNotes-${props.itemId}`}
              name="clientFacingNotes"
              rows={2}
              defaultValue={props.clientFacingNotes}
              disabled={props.disabled}
              invalid={Boolean(state.fieldErrors.clientFacingNotes)}
            />
          </Field>

          <Field
            label="Internal note"
            htmlFor={`internalNotes-${props.itemId}`}
            hint="Never shown to the client."
            errors={state.fieldErrors.internalNotes}
          >
            <Textarea
              id={`internalNotes-${props.itemId}`}
              name="internalNotes"
              rows={2}
              defaultValue={props.internalNotes}
              disabled={props.disabled}
              invalid={Boolean(state.fieldErrors.internalNotes)}
            />
          </Field>

          <Field
            label="Price override"
            htmlFor={`price-${props.itemId}`}
            hint={`Leave blank to use the component price (${props.componentPriceLabel}).`}
            errors={state.fieldErrors.priceOverride}
          >
            <Input
              id={`price-${props.itemId}`}
              name="priceOverride"
              type="number"
              min={0}
              step="0.01"
              defaultValue={props.priceOverride}
              disabled={props.disabled}
              invalid={Boolean(state.fieldErrors.priceOverride)}
            />
          </Field>

          <div className="flex items-center gap-3">
            <SubmitButton
              size="sm"
              pendingLabel="Saving…"
              disabled={props.disabled}
            >
              Save item
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonClasses("ghost", "sm")}
            >
              Close
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MoveButton({
  itemId,
  direction,
  disabled,
}: {
  itemId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  const [state, action] = useActionState(moveItineraryItemAction, idleState);
  useActionRedirect(state);

  return (
    <form action={action}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={`Move ${direction}`}
        className="flex h-6 w-6 items-center justify-center rounded border border-sand-300 text-ink-500 transition-colors hover:bg-sand-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}

/** Its own component so it can own an action state; see AddToItineraryButton. */
function RemoveButton({
  itemId,
  componentName,
  disabled,
}: {
  itemId: string;
  componentName: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(removeItineraryItemAction, idleState);
  useActionRedirect(state);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Remove "${componentName}" from this itinerary?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={`Remove ${componentName}`}
        className="flex h-6 w-6 items-center justify-center rounded text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-30"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}
