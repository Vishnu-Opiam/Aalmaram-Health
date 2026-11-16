/**
 * A vendor's URL slug (`/trip/explore/<slug>`). Same rule as the SQL backfill
 * in migration 20261116100000: lower-case, runs of anything but a-z/0-9 become
 * one hyphen. Set once at creation; renames keep the old slug so links survive.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `slugify(name)`, suffixed -2, -3… until `taken` says it is free. */
export async function uniqueSlug(name: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const base = slugify(name) || "place";
  let slug = base;
  for (let n = 2; await taken(slug); n++) slug = `${base}-${n}`;
  return slug;
}
