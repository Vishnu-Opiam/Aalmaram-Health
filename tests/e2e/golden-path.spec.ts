import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * THE golden path.
 *
 * Admin signs in → creates a client → records intake → creates an itinerary →
 * searches and adds components from different modules → schedules them →
 * reorders → reviews pricing → generates and edits the What-to-Expect report →
 * publishes. Client opens their secure link → reads the trip, itinerary and
 * report → requests a change. Admin sees the request → revises → republishes.
 * Client sees the update → approves. The system records it all.
 *
 * If this test passes, the MVP does what it claims.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aalmaram.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Aalmaram!Demo1";

const RUN = Date.now();
const CLIENT_NAME = `Golden Path Client ${RUN}`;
const CLIENT_EMAIL = `golden.path.${RUN}@example.com`;
const ITINERARY_TITLE = `Golden path journey ${RUN}`;

const MAIL_LOG = path.join(process.cwd(), ".mail.log");

/** Trip window: comfortably in the future so nothing is date-sensitive. */
function isoDay(offset: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

const TRIP_START = isoDay(60);
const TRIP_END = isoDay(69);
const DAY_1 = isoDay(60);
const DAY_3 = isoDay(62);
const DAY_5 = isoDay(64);

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Reads the newest invitation link the development email transport wrote. */
function latestInviteUrlFromMailLog(): string {
  const contents = fs.readFileSync(MAIL_LOG, "utf8");
  const matches = [...contents.matchAll(/https?:\/\/\S+\/trip\/access\/([A-Za-z0-9_-]+)/g)];
  const last = matches.at(-1);
  if (!last) throw new Error("No invitation link found in .mail.log");
  return last[0];
}

function mailLogSize(): number {
  return fs.existsSync(MAIL_LOG) ? fs.statSync(MAIL_LOG).size : 0;
}

test.describe.configure({ mode: "serial" });

test("golden path: intake → curation → publication → change request → approval", async ({
  page,
  context,
}) => {
  const mailSizeBefore = mailLogSize();

  // ======================================================================
  // ADMIN: sign in
  // ======================================================================
  await test.step("admin signs in", async () => {
    await signInAsAdmin(page);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  // ======================================================================
  // ADMIN: create a client and record intake
  // ======================================================================
  await test.step("admin creates a client with intake information", async () => {
    await page.goto("/admin/clients/new");
    await page.getByLabel("Full name").fill(CLIENT_NAME);
    await page.getByLabel("Email").fill(CLIENT_EMAIL);
    await page.getByLabel("Phone").fill("+49 30 123 4567");
    await page.getByLabel("Country").fill("Germany");
    await page.getByLabel("Trip start date").fill(TRIP_START);
    await page.getByLabel("Trip end date").fill(TRIP_END);
    await page
      .getByLabel("Health interests")
      .fill("A thorough diagnostic baseline before turning fifty.");
    await page
      .getByLabel("Wellness interests")
      .fill("A gentle Ayurveda treatment and some yoga.");
    await page
      .getByLabel("Cultural interests")
      .fill("Backwaters and a Kathakali performance.");
    await page
      .getByLabel("General preferences")
      .fill("Vegetarian. Slow pace. Travelling alone.");
    await page
      .getByLabel("Intake notes")
      .fill("Wants medical elements early so results arrive before departure.");

    await page.getByRole("button", { name: "Create client" }).click();

    // (?!new) so the assertion cannot pass on the form page it started from.
    await expect(page).toHaveURL(/\/admin\/clients\/(?!new)[a-z0-9]+$/, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: CLIENT_NAME })).toBeVisible();
    await expect(page.getByText("A thorough diagnostic baseline")).toBeVisible();
  });

  // ======================================================================
  // ADMIN: create the itinerary
  // ======================================================================
  await test.step("admin creates an itinerary for that client", async () => {
    await page.getByRole("link", { name: "New itinerary" }).first().click();
    await expect(page).toHaveURL(/\/admin\/itineraries\/new/);

    await page.getByLabel("Itinerary title").fill(ITINERARY_TITLE);
    // The trip window pre-fills from the client record.
    await expect(page.getByLabel("Start date")).toHaveValue(TRIP_START);
    await expect(page.getByLabel("End date")).toHaveValue(TRIP_END);

    await page
      .getByRole("button", { name: "Create and start building" })
      .click();

    await expect(page).toHaveURL(/\/admin\/itineraries\/(?!new)[a-z0-9]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: ITINERARY_TITLE }),
    ).toBeVisible();
    await expect(page.getByText("Draft").first()).toBeVisible();
  });

  const itineraryUrl = page.url();

  // ======================================================================
  // ADMIN: search the library and add components from different modules
  // ======================================================================
  await test.step("admin searches and adds components from three modules", async () => {
    const library = page.getByRole("region", { name: "Component library" });
    const itinerary = page.getByRole("region", { name: "Itinerary" });

    /**
     * Adding redirects back to the builder, so each add must be allowed to land
     * before the next search is typed - otherwise the second search would be
     * entered into a panel that is about to be replaced.
     */
    const addFromLibrary = async (needle: string, expectedTitle: string) => {
      // Filtering is instant (client-side), so the match appears without a
      // round trip. Scoped to the library so it cannot match the itinerary.
      await page.getByPlaceholder("Name, description or tag…").fill(needle);
      const card = library.getByRole("listitem").first();
      await expect(card).toContainText(needle, { timeout: 10_000 });
      await card.getByRole("button", { name: /Add to itinerary/ }).click();
      await expect(itinerary).toContainText(expectedTitle, { timeout: 30_000 });
    };

    // Health & Medical
    await addFromLibrary("Blood Panel", "Comprehensive Blood Panel");
    await expect(page.getByText("Nothing added yet")).toBeHidden();

    // Wellness & Spa
    await addFromLibrary("Abhyanga", "Abhyanga Full-Body Treatment");

    // Heritage & Culture
    await addFromLibrary(
      "Kathakali",
      "Kathakali Performance with Make-Up Demonstration",
    );

    await page.goto(itineraryUrl);
    const itineraryPanel = page.getByRole("region", { name: "Itinerary" });
    await expect(itineraryPanel).toContainText("Comprehensive Blood Panel");
    await expect(itineraryPanel).toContainText("Abhyanga Full-Body Treatment");
    await expect(itineraryPanel).toContainText(
      "Kathakali Performance with Make-Up Demonstration",
    );
  });

  // ======================================================================
  // ADMIN: validation blocks publication until dates are set
  // ======================================================================
  await test.step("publishing is blocked while items have no proposed date", async () => {
    await expect(page.getByText("Not ready to publish")).toBeVisible();
    // One issue per undated item, so scope to the first.
    await expect(page.getByText(/has no proposed date/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publish to client" }),
    ).toBeDisabled();
  });

  // ======================================================================
  // ADMIN: schedule each item
  // ======================================================================
  await test.step("admin assigns a proposed date to every item", async () => {
    const schedule = [
      { name: "Comprehensive Blood Panel", date: DAY_1 },
      { name: "Abhyanga Full-Body Treatment", date: DAY_3 },
      { name: "Kathakali Performance with Make-Up Demonstration", date: DAY_5 },
    ];

    for (const entry of schedule) {
      await page.goto(itineraryUrl);
      // Scope to the itinerary panel (the library lists the same names) and
      // identify the row by its component name - the disclosure button relabels
      // itself from "Edit" to "Close" once open, so it is not a stable filter.
      const row = page
        .getByRole("region", { name: "Itinerary" })
        .getByRole("listitem")
        .filter({ hasText: entry.name })
        .first();
      await row.getByRole("button", { name: "Edit" }).click();
      await row.getByLabel("Proposed date").fill(entry.date);
      await row.getByRole("button", { name: "Save item" }).click();
      // Saving reloads the builder, so assert the outcome rather than the
      // transient success message: the item no longer flags a missing date.
      await expect(
        page
          .getByRole("region", { name: "Itinerary" })
          .getByRole("listitem")
          .filter({ hasText: entry.name })
          .first(),
      ).not.toContainText("No date", { timeout: 30_000 });
    }

    await page.goto(itineraryUrl);
    await expect(page.getByText("Not ready to publish")).toBeHidden();
    await expect(
      page.getByText("All publication checks pass."),
    ).toBeVisible();
  });

  // ======================================================================
  // ADMIN: reorder and review pricing
  // ======================================================================
  await test.step("admin reviews pricing and daily totals", async () => {
    await expect(page.getByText("Daily totals")).toBeVisible();
    await expect(page.getByText(/Indicative total/)).toBeVisible();
    // 185.00 + 85.00 + 42.00 = 312.00
    await expect(page.getByText("€312.00").first()).toBeVisible();
  });

  // ======================================================================
  // ADMIN: generate and edit the What-to-Expect report
  // ======================================================================
  await test.step("admin generates and edits the What-to-Expect report", async () => {
    await page
      .getByRole("link", { name: "What-to-Expect report" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/report$/);

    // The header and the empty state both offer it while no report exists.
    await page
      .getByRole("button", { name: "Generate report" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.getByRole("button", { name: "Save report" })).toBeVisible();

    const content = page.getByLabel("Report content");
    const generated = await content.inputValue();
    expect(generated).toContain("Comprehensive Blood Panel");
    expect(generated).toContain("Kathakali");
    expect(generated).toContain("not a medical opinion");

    // Admin edit before publication.
    await content.fill(
      `${generated}\n\n## A note from your coordinator\n\nI have kept the mornings free after your diagnostics.\n`,
    );
    await page.getByRole("button", { name: "Save report" }).click();
    // Saving reloads the editor, so assert the text came back from the
    // database rather than the transient success message.
    await expect(page.getByLabel("Report content")).toHaveValue(
      /A note from your coordinator/,
      { timeout: 30_000 },
    );

    // Preview shows the saved version as the client would read it.
    await page.getByRole("tab", { name: "Preview as client" }).click();
    await expect(
      page.getByRole("heading", { name: "A note from your coordinator" }),
    ).toBeVisible();
  });

  // ======================================================================
  // ADMIN: publish
  // ======================================================================
  await test.step("admin publishes the proposal", async () => {
    await page.goto(itineraryUrl);
    await page.getByRole("button", { name: "Publish to client" }).click();
    // Publishing reloads the builder, so assert the durable state.
    await expect(page.getByText("Visible to the client")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Published").first()).toBeVisible();
  });

  // ======================================================================
  // CLIENT: open the secure link
  // ======================================================================
  const clientPage = await context.browser()!.newContext();
  const client = await clientPage.newPage();

  await test.step("client opens their secure invitation link", async () => {
    expect(mailLogSize()).toBeGreaterThan(mailSizeBefore);
    const inviteUrl = latestInviteUrlFromMailLog();
    expect(inviteUrl).toContain("/trip/access/");

    await client.goto(inviteUrl);
    await expect(client).toHaveURL(/\/trip$/);
  });

  await test.step("client sees the trip overview, itinerary and report", async () => {
    await expect(
      client.getByRole("heading", { name: ITINERARY_TITLE, level: 1 }),
    ).toBeVisible();
    await expect(client.getByText("Awaiting your review")).toBeVisible();

    // Day-by-day itinerary with component information. Scoped to the timeline,
    // because the What-to-Expect report legitimately names the same elements.
    const timeline = client.getByRole("region", { name: "Your day by day" });
    await expect(timeline).toBeVisible();
    await expect(
      timeline.getByRole("heading", { name: "Comprehensive Blood Panel" }),
    ).toBeVisible();
    await expect(timeline).toContainText("Backwater Diagnostics Centre (demo)");
    await expect(timeline).toContainText("A broad panel of blood tests");
    await expect(timeline).toContainText("What is included");
    await expect(timeline).toContainText("What you receive");

    // What-to-Expect report.
    const report = client.getByRole("region", { name: "What to expect" });
    await expect(report).toBeVisible();
    await expect(
      report.getByRole("heading", { name: "A note from your coordinator" }),
    ).toBeVisible();
    await expect(report).toContainText("not a medical opinion");
  });

  await test.step("client never sees internal data", async () => {
    const body = (await client.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("internal note");
    expect(body).not.toContain("admin notes");
    expect(body).not.toContain("vendor rate card");
    expect(body).not.toContain("activity");
    expect(body).not.toContain("draft");
  });

  // ======================================================================
  // SECURITY: an unauthenticated visitor cannot reach the proposal
  // ======================================================================
  await test.step("an unauthenticated visitor is turned away", async () => {
    const strangerContext = await context.browser()!.newContext();
    const stranger = await strangerContext.newPage();

    await stranger.goto("/trip");
    await expect(stranger).toHaveURL(/\/trip\/sign-in/);
    await expect(
      stranger.getByRole("heading", { name: "Open your personal link" }),
    ).toBeVisible();

    // A forged token is rejected.
    await stranger.goto(`/trip/access/${"f".repeat(43)}`);
    await expect(stranger).toHaveURL(/\/trip\/sign-in\?error=invalid/);

    await strangerContext.close();
  });

  // ======================================================================
  // CLIENT: request a change
  // ======================================================================
  await test.step("client requests a change to a specific item", async () => {
    await client.goto("/trip");
    await client.getByRole("button", { name: "Request a change" }).click();

    const scope = client.getByLabel("What would you like to change?");
    const abhyangaValue = await scope
      .locator("option", { hasText: "Abhyanga Full-Body Treatment" })
      .first()
      .getAttribute("value");
    await scope.selectOption(abhyangaValue!);
    await client
      .getByLabel("Tell us more")
      .fill(
        "Could the Ayurveda treatment move to a later day, please? I would like a rest day first.",
      );
    await client
      .getByRole("button", { name: "Send to my coordinator" })
      .click();

    // The portal reloads, so the durable acknowledgement is the status itself.
    await expect(client.getByText("Changes requested")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      client.getByText(/we have received your requested changes/i),
    ).toBeVisible();
  });

  // ======================================================================
  // ADMIN: see the change request, revise, republish
  // ======================================================================
  await test.step("admin sees the change request and what it refers to", async () => {
    await page.goto("/admin");
    await expect(page.getByText(/open change request/)).toBeVisible();
    await expect(page.getByText(CLIENT_NAME).first()).toBeVisible();

    await page.goto(`${itineraryUrl}/changes`);
    await expect(
      page.getByRole("heading", { name: "Change requests" }),
    ).toBeVisible();
    await expect(
      page.getByText("About: Abhyanga Full-Body Treatment"),
    ).toBeVisible();
    await expect(
      page.getByText(/Could the Ayurveda treatment move to a later day/),
    ).toBeVisible();
  });

  await test.step("admin withdraws to draft, revises the date and republishes", async () => {
    await page.goto(itineraryUrl);
    await expect(page.getByText("Changes requested").first()).toBeVisible();

    await page
      .getByRole("button", { name: "Move back to Draft to edit" })
      .click();
    await expect(page.getByText("Draft").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Visible to the client")).toBeHidden();

    // Revise the item the client asked about.
    await page.goto(itineraryUrl);
    const row = page
      .getByRole("region", { name: "Itinerary" })
      .getByRole("listitem")
      .filter({ hasText: "Abhyanga Full-Body Treatment" })
      .first();
    await row.getByRole("button", { name: "Edit" }).click();
    await row.getByLabel("Proposed date").fill(isoDay(66));
    await row.getByRole("button", { name: "Save item" }).click();
    await expect(
      page.getByRole("region", { name: "Itinerary" }),
    ).toContainText("Day 7", { timeout: 30_000 });

    // Resolve the request, then republish.
    await page.goto(`${itineraryUrl}/changes`);
    await page.getByRole("button", { name: "Mark resolved" }).click();
    await expect(page.getByText("Resolved (1)")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("No open change requests")).toBeVisible();

    await page.goto(itineraryUrl);
    // The itinerary was pulled back to Draft to be revised, so the control
    // reads "Publish to client" again rather than "Publish revised proposal".
    await page.getByRole("button", { name: "Publish to client" }).click();
    await expect(page.getByText("Visible to the client")).toBeVisible({
      timeout: 30_000,
    });
  });

  // ======================================================================
  // CLIENT: sees the update and approves
  // ======================================================================
  await test.step("client sees the revised proposal and approves it", async () => {
    await client.goto("/trip");
    await expect(client.getByText("Awaiting your review")).toBeVisible();

    await client.getByRole("button", { name: "Approve this journey" }).click();
    await expect(
      client.getByText("You have approved this journey", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  });

  // ======================================================================
  // SYSTEM: status and audit trail are correct
  // ======================================================================
  await test.step("the system records the approval and the audit trail", async () => {
    await page.goto(itineraryUrl);
    await expect(page.getByText("Approved").first()).toBeVisible();
    await expect(page.getByText("Approved by the client")).toBeVisible();

    await page.goto("/admin/clients");
    await page.getByRole("link", { name: CLIENT_NAME }).click();

    // Activity feed holds the major events.
    await expect(page.getByText("Client created")).toBeVisible();
    await expect(page.getByText("Proposal published to client")).toBeVisible();
    await expect(page.getByText("Proposal withdrawn for editing")).toBeVisible();
    await expect(page.getByText("Revised proposal published")).toBeVisible();
    await expect(page.getByText("Client approved the itinerary")).toBeVisible();

    // The client record advanced to Confirmed.
    await expect(page.getByText("Confirmed").first()).toBeVisible();
  });

  await clientPage.close();
});
