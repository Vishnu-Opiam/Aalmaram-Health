import "server-only";
import { prisma } from "@/lib/db";

/** Active staff, for relationship-manager pickers. */
export function loadStaffOptions() {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
