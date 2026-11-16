/**
 * Real partner places: data/partners/<slug>.json (written by
 * scripts/partners-photos.mjs) → Vendor + VendorPhoto rows.
 *
 *   npm run partners:import                 local database only
 *   npm run partners:import -- --yes-remote  any other database (a human's call)
 *
 * Deliberately separate from the demo seed, which stays fictional. A partner
 * is matched to an existing vendor by name (case-insensitive), else created.
 * It never creates components, prices, practitioners or contact details.
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
  photos: { url: string; alt: string; width: number; height: number; isHero: boolean; sourceUrl: string | null }[];
};

const MODULE_FOR: Record<PartnerFile["category"], string> = {
  Health: "Health & Medical",
  Wellness: "Wellness & Spa",
  Culture: "Heritage & Culture",
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function assertTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) && !process.argv.includes("--yes-remote")) {
    throw new Error(`Refusing to import into ${host}: pass --yes-remote to write to a non-local database.`);
  }
  return host;
}

async function main() {
  const host = assertTarget();
  const prisma = new PrismaClient();
  const dir = path.join(process.cwd(), "data", "partners");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
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
      const placeFields = { placeType: p.type, highlights: p.highlights, moduleId };

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
