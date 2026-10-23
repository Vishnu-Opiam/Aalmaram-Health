/**
 * Creates (or resets the password of) one staff admin. This is the only way to
 * get a login on a shared database: the seed's demo password is public.
 *
 * Run with:  ADMIN_PASSWORD='…' npm run admin:create -- you@example.com "Your Name"
 * The password comes from the environment so it stays out of argv.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const [rawEmail, name] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase(); // login lowercases too
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email?.includes("@") || !name) throw new Error('Usage: npm run admin:create -- <email> "<name>"');
  if (password.length < 12) throw new Error("Set ADMIN_PASSWORD (12+ characters).");

  console.log(`Database host: ${new URL(process.env.DATABASE_URL ?? "").host}`);
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: "ACTIVE" },
    create: { email, name, passwordHash, roles: ["ADMIN", "RELATIONSHIP_MANAGER"] },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
