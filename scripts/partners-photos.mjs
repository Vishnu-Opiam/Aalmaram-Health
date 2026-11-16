/**
 * Real partner photos: researcher folders → optimised WebP in public/ + one
 * data file per partner for `npm run partners:import`.
 *
 *   node scripts/partners-photos.mjs <source-folder> [--only slug,slug]
 *
 * <source-folder>/<slug>/manifest.json lists the images (see the brief in
 * data/partners/_overrides.json). Re-runnable: each run rewrites
 * public/partners/<slug>/ and data/partners/<slug>.json from scratch, so a
 * dropped image or a skipped partner disappears too. Editorial rulings live in
 * data/partners/_overrides.json, never in the generated files.
 *
 * Images are 2000px wide at most (WebP q78); next/image makes the smaller sizes,
 * so no separate thumbnails are written.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data", "partners");
const PUBLIC_DIR = path.join(ROOT, "public", "partners");
const MAX_WIDTH = 2000;
/** Narrower than this cannot lead a page: kept in the gallery, never the hero. */
export const HERO_MIN_WIDTH = 1200;

// Facts the researchers could only source from directories or could not verify,
// and named individuals (we never publish practitioner or contact names).
const UNSOURCED = /unverified|director(y|ies)|third[- ]party|\bDr\.?\s/i;

export const cleanLines = (lines = []) => lines.map((l) => String(l).trim()).filter((l) => l && !UNSOURCED.test(l));

export const cleanSummary = (text = "") =>
  String(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !UNSOURCED.test(sentence))
    .join(" ")
    .trim();

/** Which manifest images to keep, with alt text and whether each may be the hero. */
export function planPhotos(manifest, override = {}) {
  const drop = new Set(override.dropImages ?? []);
  const notHero = new Set(override.notHero ?? []);
  return (manifest.images ?? [])
    .filter((img) => img.file && !drop.has(img.file))
    .map((img) => ({
      file: img.file,
      alt: `${override.altPrefix?.[img.file] ?? ""}${String(img.shows ?? "").trim()}`,
      heroCandidate: Boolean(img.hero) && !notHero.has(img.file),
      sourceUrl: img.sourceUrl ?? null,
    }));
}

/** Index of the hero: the first candidate wide enough, or -1. */
export const heroIndex = (photos) => photos.findIndex((p) => p.heroCandidate && p.width >= HERO_MIN_WIDTH);

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    console.error("sharp is not installed. Run `npm install --save-dev sharp` and try again.");
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith("--"));
  const onlyAt = args.indexOf("--only");
  const only = onlyAt >= 0 ? new Set((args[onlyAt + 1] ?? "").split(",").filter(Boolean)) : null;
  if (!source || !existsSync(source)) {
    console.error("Usage: node scripts/partners-photos.mjs <source-folder> [--only slug,slug]");
    process.exit(1);
  }
  const sharp = await loadSharp();
  const overrides = JSON.parse(readFileSync(path.join(DATA_DIR, "_overrides.json"), "utf8"));
  mkdirSync(DATA_DIR, { recursive: true });

  const done = [];
  const skipped = [];
  for (const slug of readdirSync(source).sort()) {
    if (only && !only.has(slug)) continue;
    const manifestPath = path.join(source, slug, "manifest.json");
    if (!existsSync(manifestPath)) {
      skipped.push(`${slug}: no manifest.json yet`);
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      skipped.push(`${slug}: folder name is not a URL slug`);
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const ruling = overrides.skip?.[slug] ?? (manifest.confidence === "ambiguous" ? "manifest confidence is ambiguous" : null);
    if (ruling) {
      skipped.push(`${slug}: ${ruling}`);
      rmSync(path.join(PUBLIC_DIR, slug), { recursive: true, force: true });
      rmSync(path.join(DATA_DIR, `${slug}.json`), { force: true });
      continue;
    }
    const override = overrides.partners?.[slug] ?? {};

    const outDir = path.join(PUBLIC_DIR, slug);
    rmSync(outDir, { recursive: true, force: true });
    const photos = [];
    for (const plan of planPhotos(manifest, override)) {
      const input = path.join(source, slug, plan.file);
      if (!existsSync(input)) {
        console.warn(`  ${slug}: ${plan.file} listed but missing, left out`);
        continue;
      }
      mkdirSync(outDir, { recursive: true });
      const name = `${path.parse(plan.file).name}.webp`;
      const info = await sharp(input)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(outDir, name));
      photos.push({ ...plan, url: `/partners/${slug}/${name}`, width: info.width, height: info.height });
    }
    const hero = heroIndex(photos);
    if (hero > 0) photos.unshift(...photos.splice(hero, 1));

    const data = {
      slug,
      name: override.name ?? manifest.name,
      type: manifest.type ?? null,
      category: manifest.category,
      city: manifest.city || null,
      locations: cleanLines(manifest.locations),
      website: manifest.website || null,
      summary: cleanSummary(override.summary ?? manifest.summary),
      highlights: cleanLines(manifest.highlights).filter((h) => !(override.dropHighlights ?? []).some((d) => h.includes(d))),
      photos: photos.map((p, i) => ({
        url: p.url,
        alt: p.alt,
        width: p.width,
        height: p.height,
        isHero: hero >= 0 && i === 0,
        sourceUrl: p.sourceUrl,
      })),
    };
    writeFileSync(path.join(DATA_DIR, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
    done.push(`${slug}: ${photos.length} photo(s)${hero >= 0 ? "" : ", no hero"}`);
  }

  console.log(`Written (${done.length}):\n  ${done.join("\n  ")}`);
  if (skipped.length) console.log(`Skipped (${skipped.length}):\n  ${skipped.join("\n  ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
