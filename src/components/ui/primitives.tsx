import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  secondary:
    "bg-white text-ink-800 border border-sand-300 hover:bg-sand-100",
  ghost:
    "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
  danger:
    "bg-danger-500 text-white hover:bg-danger-600 shadow-sm",
  quiet:
    "text-teal-600 hover:text-teal-700 hover:underline underline-offset-4",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props} />
  );
}

/**
 * Internal-app link.
 *
 * Prefetch is off by default. Every admin route runs database queries, and a
 * screen like the itinerary builder renders a link per catalogue entry - with
 * prefetching on, simply scrolling fires dozens of speculative render requests
 * that compete with the Server Action the user actually triggered. Pass
 * prefetch explicitly to opt a specific link back in.
 */
export function AppLink({
  prefetch = false,
  ...props
}: React.ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  prefetch = false,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  // Prefetch is off by default: these buttons lead to database-backed admin
  // routes, so speculative fetching costs queries for navigation that may never
  // happen. Pass prefetch explicitly to opt back in.
  return (
    <Link
      className={buttonClasses(variant, size, className)}
      prefetch={prefetch}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

const CONTROL =
  "w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-sand-100 disabled:text-ink-400";

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(CONTROL, invalid && "border-danger-500", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        CONTROL,
        "min-h-24 resize-y leading-relaxed",
        invalid && "border-danger-500",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        CONTROL,
        "appearance-none bg-white pr-8",
        invalid && "border-danger-500",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-ink-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-danger-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      {children}
      {errors && errors.length > 0 && (
        <p id={errorId} role="alert" className="text-xs text-danger-600">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-sand-200 bg-white shadow-[0_1px_2px_rgba(23,21,18,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-ink-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral:
    "bg-sand-100 text-ink-600 border-sand-300",
  info: "bg-info-50 text-info-600 border-info-200",
  success:
    "bg-success-50 text-success-600 border-success-200",
  warning:
    "bg-warning-50 text-warning-600 border-warning-200",
  danger:
    "bg-danger-50 text-danger-600 border-danger-200",
  accent:
    "bg-teal-50 text-teal-600 border-teal-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback: alert, empty state, page header                                   */
/* -------------------------------------------------------------------------- */

const ALERT_TONES: Record<"info" | "success" | "warning" | "danger", string> = {
  info: "bg-info-50 border-info-200 text-info-600",
  success:
    "bg-success-50 border-success-200 text-success-600",
  warning:
    "bg-warning-50 border-warning-200 text-warning-600",
  danger:
    "bg-danger-50 border-danger-200 text-danger-600",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-4 py-3 text-[13px] leading-relaxed",
        ALERT_TONES[tone],
        className,
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-sand-300 bg-sand-50 px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-[13px] text-ink-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-sand-200 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-ink-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-sand-200 bg-sand-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-sand-200 px-4 py-3 align-middle text-ink-700",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-sand-50", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-sand-200", className)} />;
}

export function DescriptionList({
  items,
  className,
}: {
  items: { term: string; detail: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.term}>
          <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
            {item.term}
          </dt>
          <dd className="mt-0.5 text-sm text-ink-800">
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-sand-200",
        className,
      )}
    />
  );
}
