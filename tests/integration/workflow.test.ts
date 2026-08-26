import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createAdmin,
  createClientRecord,
  createInventory,
  prisma,
  resetDatabase,
  utcDay,
} from "./helpers";
import { validateItineraryForPublication } from "@/domain/itineraries/validation";
import { canTransition } from "@/domain/itineraries/status";
import {
  generateReportContent,
  type ReportItem,
} from "@/domain/reports/generate";
import { sumItems } from "@/domain/itineraries/pricing";
import {
  accessTokenExpiry,
  generateAccessToken,
  hashAccessToken,
} from "@/lib/auth/access-token";
import { loadClientItinerary } from "@/domain/itineraries/client-view";

/**
 * Integration coverage of the pre-journey workflow against a real PostgreSQL
 * database: creation, curation, validation, publication, client visibility,
 * change requests and approval.
 */
describe("pre-journey workflow (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a client with derived trip duration", async () => {
    const client = await createClientRecord();
    const fetched = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(fetched.tripDuration).toBe(10);
    expect(fetched.status).toBe("PLANNING");
    expect(fetched.accessTokenHash).toBeNull();
  });

  it("enforces a unique client email", async () => {
    await createClientRecord({ email: "dup@example.com" });
    await expect(
      createClientRecord({ email: "dup@example.com" }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("derives a component's module through its catalogue, without a duplicate FK", async () => {
    const { componentA } = await createInventory();
    const loaded = await prisma.component.findUniqueOrThrow({
      where: { id: componentA.id },
      include: { catalogue: { include: { module: true } } },
    });
    expect(loaded.catalogue.module.name).toBe("Health & Medical");
    expect(loaded).not.toHaveProperty("moduleId");
  });

  it("refuses to delete a module that still has catalogues", async () => {
    // onDelete: Restrict surfaces as SQLSTATE 23001 from PostgreSQL, which
    // Prisma reports as an unknown request error rather than P2003. What
    // matters is that the delete is refused and the row survives.
    const { module } = await createInventory();
    await expect(
      prisma.module.delete({ where: { id: module.id } }),
    ).rejects.toThrow(/RESTRICT|foreign key/i);
    expect(await prisma.module.count({ where: { id: module.id } })).toBe(1);
  });

  it("refuses to delete a vendor that still has components", async () => {
    const { vendor } = await createInventory();
    await expect(
      prisma.vendor.delete({ where: { id: vendor.id } }),
    ).rejects.toThrow(/RESTRICT|foreign key/i);
    expect(await prisma.vendor.count({ where: { id: vendor.id } })).toBe(1);
  });

  it("blocks publication of an empty itinerary and explains why", async () => {
    const client = await createClientRecord();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Empty proposal",
        startDate: client.tripStartDate,
        endDate: client.tripEndDate,
      },
    });

    const loaded = await prisma.itinerary.findUniqueOrThrow({
      where: { id: itinerary.id },
      include: { client: true, items: { include: { component: true } } },
    });

    const result = validateItineraryForPublication({
      title: loaded.title,
      startDate: loaded.startDate,
      endDate: loaded.endDate,
      client: { id: loaded.client.id, name: loaded.client.name },
      items: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("NO_ITEMS");
  });

  it("blocks publication when an item falls outside the trip window", async () => {
    const client = await createClientRecord();
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Out of range",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: {
            componentId: componentA.id,
            scheduledDate: utcDay("2026-04-01"),
            dayNumber: 32,
            sequence: 0,
          },
        },
      },
      include: { client: true, items: { include: { component: true } } },
    });

    const result = validateItineraryForPublication({
      title: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      client: { id: itinerary.client.id, name: itinerary.client.name },
      items: itinerary.items.map((item) => ({
        id: item.id,
        scheduledDate: item.scheduledDate,
        status: item.status,
        customTitle: item.customTitle,
        component: {
          id: item.component.id,
          name: item.component.name,
          status: item.component.status,
        },
      })),
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("ITEM_DATE_OUT_OF_RANGE");
  });

  it("blocks publication when a referenced component has been deactivated", async () => {
    const client = await createClientRecord();
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Deactivated component",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: {
            componentId: componentA.id,
            scheduledDate: utcDay("2026-03-02"),
            dayNumber: 2,
            sequence: 0,
          },
        },
      },
    });

    await prisma.component.update({
      where: { id: componentA.id },
      data: { status: "INACTIVE" },
    });

    const loaded = await prisma.itinerary.findUniqueOrThrow({
      where: { id: itinerary.id },
      include: { client: true, items: { include: { component: true } } },
    });

    const result = validateItineraryForPublication({
      title: loaded.title,
      startDate: loaded.startDate,
      endDate: loaded.endDate,
      client: { id: loaded.client.id, name: loaded.client.name },
      items: loaded.items.map((item) => ({
        id: item.id,
        scheduledDate: item.scheduledDate,
        status: item.status,
        customTitle: item.customTitle,
        component: {
          id: item.component.id,
          name: item.component.name,
          status: item.component.status,
        },
      })),
    });

    expect(result.issues.map((i) => i.code)).toContain(
      "ITEM_COMPONENT_INACTIVE",
    );
  });

  it("totals a curated itinerary with an override, excluding removed items", async () => {
    const client = await createClientRecord();
    const { componentA, componentB } = await createInventory();

    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Pricing",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: [
            {
              componentId: componentA.id,
              scheduledDate: utcDay("2026-03-01"),
              dayNumber: 1,
              sequence: 0,
            },
            {
              componentId: componentB.id,
              scheduledDate: utcDay("2026-03-02"),
              dayNumber: 2,
              sequence: 0,
              priceOverride: new Prisma.Decimal("500.00"),
            },
            {
              componentId: componentA.id,
              scheduledDate: utcDay("2026-03-03"),
              dayNumber: 3,
              sequence: 0,
              status: "REMOVED",
            },
          ],
        },
      },
      include: { items: { include: { component: true } } },
    });

    const total = sumItems(itinerary.items);
    expect(total.toString()).toBe("685"); // 185 + 500, removed 185 excluded
  });

  it("generates a report from stored itinerary data only", async () => {
    const client = await createClientRecord();
    const { componentA } = await createInventory();

    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Report source",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: {
            componentId: componentA.id,
            scheduledDate: utcDay("2026-03-01"),
            dayNumber: 1,
            sequence: 0,
          },
        },
      },
      include: {
        client: true,
        items: {
          include: {
            component: {
              include: {
                vendor: true,
                catalogue: { include: { module: true } },
              },
            },
          },
        },
      },
    });

    const items: ReportItem[] = itinerary.items.map((item) => ({
      dayNumber: item.dayNumber,
      scheduledDate: item.scheduledDate,
      title: item.customTitle ?? item.component.name,
      moduleName: item.component.catalogue.module.name,
      catalogueName: item.component.catalogue.name,
      vendorName: item.component.vendor.name,
      vendorLocation: item.component.vendor.location,
      clientFacingDescription: item.component.clientFacingDescription,
      whatsIncluded: item.component.whatsIncluded,
      clientDeliverable: item.component.clientDeliverable,
      clientFacingNotes: item.clientFacingNotes,
    }));

    const content = generateReportContent({
      clientName: itinerary.client.name,
      itineraryTitle: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      items,
    });

    const report = await prisma.report.create({
      data: {
        itineraryId: itinerary.id,
        title: `What to Expect - ${itinerary.title}`,
        content,
        generatedAt: new Date(),
      },
    });

    expect(report.status).toBe("DRAFT");
    expect(report.content).toContain("Blood Panel");
    expect(report.content).toContain("Test Diagnostics (demo)");
    expect(report.content).toContain("A written report.");
  });

  it("enforces one report per itinerary", async () => {
    const client = await createClientRecord();
    const itinerary = await prisma.itinerary.create({
      data: { clientId: client.id, title: "One report" },
    });
    await prisma.report.create({
      data: { itineraryId: itinerary.id, title: "A", content: "x" },
    });
    await expect(
      prisma.report.create({
        data: { itineraryId: itinerary.id, title: "B", content: "y" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("runs the full publish → change request → republish → approve cycle", async () => {
    const admin = await createAdmin();
    const client = await createClientRecord();
    const { componentA, componentB } = await createInventory();

    // --- curate -----------------------------------------------------------
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Full cycle",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: [
            {
              componentId: componentA.id,
              scheduledDate: utcDay("2026-03-01"),
              dayNumber: 1,
              sequence: 0,
            },
            {
              componentId: componentB.id,
              scheduledDate: utcDay("2026-03-04"),
              dayNumber: 4,
              sequence: 0,
            },
          ],
        },
      },
      include: { items: true },
    });
    await prisma.report.create({
      data: {
        itineraryId: itinerary.id,
        title: "What to Expect",
        content: "# Your journey\n\nDetails.",
        generatedAt: new Date(),
      },
    });

    // --- publish ----------------------------------------------------------
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(true);
    const publishedAt = new Date();
    const token = generateAccessToken();

    await prisma.$transaction([
      prisma.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "PUBLISHED", publishedAt },
      }),
      prisma.report.update({
        where: { itineraryId: itinerary.id },
        data: { status: "PUBLISHED", publishedAt },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: {
          status: "PROPOSAL_SENT",
          accessTokenHash: hashAccessToken(token),
          accessTokenIssuedAt: publishedAt,
          accessTokenExpiresAt: accessTokenExpiry(publishedAt),
        },
      }),
      prisma.activityLog.create({
        data: {
          action: "itinerary.published",
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: admin.id,
          actorLabel: admin.name,
        },
      }),
    ]);

    // --- client can now see it -------------------------------------------
    const view = await loadClientItinerary(client.id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("PUBLISHED");
    expect(view!.itemCount).toBe(2);
    expect(view!.report?.content).toContain("Your journey");
    expect(view!.days).toHaveLength(2);

    // --- client requests a change ----------------------------------------
    const targetItem = itinerary.items[1];
    const request = await prisma.changeRequest.create({
      data: {
        itineraryId: itinerary.id,
        itineraryItemId: targetItem.id,
        message: "Could the MRI be earlier in the week, please?",
      },
    });
    await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { status: "CHANGES_REQUESTED" },
    });
    await prisma.activityLog.create({
      data: {
        action: "change_request.submitted",
        entityType: "ChangeRequest",
        entityId: request.id,
        actorLabel: client.name,
      },
    });

    expect(canTransition("PUBLISHED", "CHANGES_REQUESTED")).toBe(true);
    expect(request.status).toBe("OPEN");

    // The client can still read the proposal while it is being revised.
    const duringRevision = await loadClientItinerary(client.id);
    expect(duringRevision!.status).toBe("CHANGES_REQUESTED");
    expect(duringRevision!.openChangeRequests).toHaveLength(1);

    // --- admin withdraws, edits, republishes ------------------------------
    await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { status: "DRAFT" },
    });
    await prisma.report.update({
      where: { itineraryId: itinerary.id },
      data: { status: "DRAFT" },
    });

    // While in DRAFT the client sees nothing at all.
    expect(await loadClientItinerary(client.id)).toBeNull();

    await prisma.itineraryItem.update({
      where: { id: targetItem.id },
      data: { scheduledDate: utcDay("2026-03-02"), dayNumber: 2 },
    });
    await prisma.changeRequest.update({
      where: { id: request.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    const republishedAt = new Date();
    await prisma.$transaction([
      prisma.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "PUBLISHED", publishedAt: republishedAt },
      }),
      prisma.report.update({
        where: { itineraryId: itinerary.id },
        data: { status: "PUBLISHED", publishedAt: republishedAt },
      }),
      prisma.activityLog.create({
        data: {
          action: "itinerary.republished",
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: admin.id,
          actorLabel: admin.name,
        },
      }),
    ]);

    const afterRevision = await loadClientItinerary(client.id);
    expect(afterRevision!.status).toBe("PUBLISHED");
    expect(afterRevision!.openChangeRequests).toHaveLength(0);

    // --- client approves ---------------------------------------------------
    const approvedAt = new Date();
    await prisma.$transaction([
      prisma.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "APPROVED", approvedAt },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: { status: "CONFIRMED" },
      }),
      prisma.activityLog.create({
        data: {
          action: "client.approved_itinerary",
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorLabel: client.name,
          metadata: {
            clientId: client.id,
            itineraryId: itinerary.id,
            approvedAt: approvedAt.toISOString(),
          },
        },
      }),
    ]);

    const finalItinerary = await prisma.itinerary.findUniqueOrThrow({
      where: { id: itinerary.id },
    });
    expect(finalItinerary.status).toBe("APPROVED");
    expect(finalItinerary.approvedAt).not.toBeNull();

    const finalClient = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(finalClient.status).toBe("CONFIRMED");

    // --- activity log holds the major events ------------------------------
    const actions = (
      await prisma.activityLog.findMany({ orderBy: { createdAt: "asc" } })
    ).map((entry) => entry.action);

    expect(actions).toEqual(
      expect.arrayContaining([
        "itinerary.published",
        "change_request.submitted",
        "itinerary.republished",
        "client.approved_itinerary",
      ]),
    );
  });

  it("keeps a change request row when its itinerary item is deleted", async () => {
    const client = await createClientRecord();
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Dangling",
        status: "PUBLISHED",
        items: { create: { componentId: componentA.id, sequence: 0 } },
      },
      include: { items: true },
    });

    const request = await prisma.changeRequest.create({
      data: {
        itineraryId: itinerary.id,
        itineraryItemId: itinerary.items[0].id,
        message: "Please remove this one.",
      },
    });

    await prisma.itineraryItem.delete({ where: { id: itinerary.items[0].id } });

    const after = await prisma.changeRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(after.itineraryItemId).toBeNull();
    expect(after.message).toBe("Please remove this one.");
  });

  it("cascades itinerary deletion to items, report and change requests", async () => {
    const client = await createClientRecord();
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Cascade",
        items: { create: { componentId: componentA.id, sequence: 0 } },
        report: { create: { title: "R", content: "c" } },
      },
    });
    await prisma.changeRequest.create({
      data: { itineraryId: itinerary.id, message: "A message about the trip." },
    });

    await prisma.itinerary.delete({ where: { id: itinerary.id } });

    expect(await prisma.itineraryItem.count()).toBe(0);
    expect(await prisma.report.count()).toBe(0);
    expect(await prisma.changeRequest.count()).toBe(0);
    // The component itself survives - inventory is not deleted with a proposal.
    expect(await prisma.component.count()).toBeGreaterThan(0);
  });
});
