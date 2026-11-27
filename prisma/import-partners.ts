/**
 * Real partner places: data/partners/<slug>.json (written by
 * scripts/partners-photos.mjs) → Vendor + VendorPhoto rows.
 *
 *   npm run partners:import                 local database only
 *   npm run partners:import -- --yes-remote  any other database (a human's call)
 *   npm run build                            runs it with --on-vercel-production
 *
 * Production builds on Vercel therefore re-import the partners on every deploy
 * (idempotent: matched by name). Previews and local builds skip it.
 *
 * Deliberately separate from the demo seed, which stays fictional. A partner
 * is matched to an existing vendor by name (case-insensitive), else created.
 * It never creates components, prices, practitioners or contact details.
 * Verified facts (accreditations, founding year, languages) come from
 * data/partners/_facts.json and, like highlights, follow the file when present.
 * Existing profile text written by staff is kept (only empty fields are
 * filled); the type label, highlights, module and photos follow the file.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { uniqueSlug } from "../src/domain/vendors/slug";

config({ path: ".env", quiet: true });

type PartnerFile = {
  slug: string;
  name: string;
  type: string | null;
  category: "Health" | "Wellness" | "Culture";
  city: string | null;
  website: string | null;
  summary: string;
  highlights: string[];
  photos: { url: string; alt: string; width: number; height: number; isHero: boolean; sourceUrl: string | null; credit?: string }[];
};

/** Checked facts per slug; `sources` stays in the file as provenance. */
type PartnerFacts = { accreditations?: string[]; yearEstablished?: number; languages?: string[] };

const MODULE_FOR: Record<PartnerFile["category"], string> = {
  Health: "Health & Medical",
  Wellness: "Wellness & Spa",
  Culture: "Heritage & Culture",
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

// The build passes this flag: production builds on Vercel import into their own
// database (whose URL can't be pulled locally); every other build skips the import.
const ON_VERCEL_PRODUCTION = process.argv.includes("--on-vercel-production");

function assertTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) && !process.argv.includes("--yes-remote") && !ON_VERCEL_PRODUCTION) {
    throw new Error(`Refusing to import into ${host}: pass --yes-remote to write to a non-local database.`);
  }
  return host;
}

async function main() {
  if (ON_VERCEL_PRODUCTION && process.env.VERCEL_ENV !== "production") {
    console.log("Partner import skipped: not a Vercel production build.");
    return;
  }
  const host = assertTarget();
  const prisma = new PrismaClient();
  const dir = path.join(process.cwd(), "data", "partners");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
  const facts = JSON.parse(readFileSync(path.join(dir, "_facts.json"), "utf8")) as Record<string, PartnerFacts>;
  console.log(`Importing ${files.length} partner(s) into ${host}…`);

  try {
    const modules = new Map(
      (await prisma.module.findMany({ select: { id: true, name: true } })).map((m) => [m.name, m.id]),
    );
    for (const file of files) {
      const p = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as PartnerFile;
      const moduleId = modules.get(MODULE_FOR[p.category]);
      if (!moduleId) throw new Error(`${p.slug}: module "${MODULE_FOR[p.category]}" does not exist; run the seed or create it first.`);
      if (p.photos.filter((ph) => ph.isHero).length > 1) throw new Error(`${p.slug}: more than one hero photo.`);

      const existing = await prisma.vendor.findFirst({
        where: { name: { equals: p.name, mode: "insensitive" } },
        select: { id: true, description: true, hqCity: true, website: true },
      });
      const f = facts[p.slug] ?? {};
      const placeFields = {
        placeType: p.type,
        highlights: p.highlights,
        moduleId,
        ...(f.accreditations && { accreditations: f.accreditations }),
        ...(f.yearEstablished && { yearEstablished: f.yearEstablished }),
        ...(f.languages && { languages: f.languages }),
      };

      await prisma.$transaction(async (tx) => {
        const vendor = existing
          ? await tx.vendor.update({
              where: { id: existing.id },
              data: {
                ...placeFields,
                description: existing.description?.trim() ? undefined : p.summary || null,
                hqCity: existing.hqCity?.trim() ? undefined : p.city,
                website: existing.website?.trim() ? undefined : p.website,
              },
            })
          : await tx.vendor.create({
              data: {
                ...placeFields,
                name: p.name,
                slug: await uniqueSlug(p.slug, async (s) => (await tx.vendor.count({ where: { slug: s } })) > 0),
                description: p.summary || null,
                hqCity: p.city,
                website: p.website,
              },
            });
        await tx.vendorPhoto.deleteMany({ where: { vendorId: vendor.id } });
        await tx.vendorPhoto.createMany({
          data: p.photos.map((ph, i) => ({
            vendorId: vendor.id,
            url: ph.url,
            alt: ph.alt,
            width: ph.width,
            height: ph.height,
            sortOrder: i,
            isHero: ph.isHero,
            sourceUrl: ph.sourceUrl,
            credit: ph.credit ?? null,
          })),
        });
      });
      console.log(`  ${existing ? "updated" : "created"} ${p.name}: ${p.photos.length} photo(s)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
