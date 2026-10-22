/**
 * PII minimisation before text leaves for a model: email addresses, phone
 * numbers and the client's own name parts are replaced. What remains is what
 * the planner needs — interests, pace, budget — not who said it.
 */
export function minimisePii(text: string, names: string[] = []): string {
  let out = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/\+?\d[\d ()-]{7,}\d/g, "[phone]");
  const parts = names
    .flatMap((name) => name.replace(/\(.*?\)/g, " ").split(/\s+/))
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  for (const part of [...new Set(parts)].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "the client");
  }
  return out;
}
