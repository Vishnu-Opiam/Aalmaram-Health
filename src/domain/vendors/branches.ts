/**
 * Adding many branches of one vendor at once (5 Nov call: every Taj hotel or
 * Fab India shop in Kerala is a branch of one vendor, not a vendor of its own).
 * Staff paste one branch per line, "Name, City" with an optional address after
 * a second comma. Names already on the vendor, or repeated in the paste, are
 * skipped rather than rejected, so the same list can be pasted again safely.
 */

export const MAX_BRANCH_LINES = 200;

export type BranchLine = { name: string; city: string; addressLine: string | null };

export type ParsedBranchLines = {
  branches: BranchLine[];
  /** Names left out because the vendor (or an earlier line) already has them. */
  skipped: string[];
  /** One message per unreadable line, with its 1-based line number. */
  errors: string[];
};

const key = (name: string) => name.trim().toLowerCase();

export function parseBranchLines(text: string, existingNames: readonly string[]): ParsedBranchLines {
  const seen = new Set(existingNames.map(key));
  const branches: BranchLine[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const lines = text.split(/\r?\n/).map((line, i) => ({ line: line.trim(), n: i + 1 })).filter((l) => l.line !== "");
  if (lines.length > MAX_BRANCH_LINES) {
    return { branches: [], skipped: [], errors: [`Please add at most ${MAX_BRANCH_LINES} branches at a time.`] };
  }

  for (const { line, n } of lines) {
    const [name = "", city = "", ...address] = line.split(",").map((part) => part.trim());
    if (!name || !city) {
      errors.push(`Line ${n}: write the branch name, a comma, then the city.`);
      continue;
    }
    if (name.length > 200 || city.length > 120) {
      errors.push(`Line ${n}: the name or city is too long.`);
      continue;
    }
    if (seen.has(key(name))) {
      skipped.push(name);
      continue;
    }
    seen.add(key(name));
    branches.push({ name, city, addressLine: address.join(", ").slice(0, 300) || null });
  }

  return { branches, skipped, errors };
}
