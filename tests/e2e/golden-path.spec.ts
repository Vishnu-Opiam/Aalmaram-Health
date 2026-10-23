import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * THE golden path (class diagram v1).
 *
 * Admin signs in → creates a client → creates their trip → records the
 * trip's requirements → places the health core in the builder → invites the
 * client. Client opens their link → sees the Feed → opens the itinerary →
 * cannot touch the health core → adds a dinner from Culture → Restaurants →
 * the total updates → drags it to another day → confirms. Admin sees the
 * trip waiting for payment.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aalmaram.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Aalmaram!Demo1";

const RUN = Date.now();
const CLIENT_NAME = `Golden Path Client ${RUN}`;
const CLIENT_EMAIL = `golden.path.${RUN}@example.com`;
const TRIP_NAME = `Golden path trip ${RUN}`;
const MAIL_LOG = path.join(process.cwd(), ".mail.log");

function isoDay(offset: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

const DAY_1 = isoDay(60);
const DAY_2 = isoDay(61);
const DAY_3 = isoDay(62);

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Every mutation navigates to a fresh URL once it has committed. */
async function clickAndSettle(page: Page, target: Locator) {
  const before = page.url();
  await target.click();
  await page.waitForURL((url) => url.toString() !== before, { timeout: 30_000 });
  await page.waitForLoadState("load");
}

function latestInviteUrlFromMailLog(): string {
  const contents = fs.readFileSync(MAIL_LOG, "utf8");
  const last = [...contents.matchAll(/https?:\/\/\S+\/trip\/access\/([A-Za-z0-9_-]+)/g)].at(-1);
  if (!last) throw new Error("No invitation link found in .mail.log");
  return last[0];
}

/** Opens the "+" at the start of a day and adds an experience from the library. */
async function addFromLibrary(
  page: Page,
  day: string,
  path: [string, string, string],
  opts: { branch?: string; time: string },
) {
  await page.locator(`#day-${day}`).getByRole("button", { name: /^Add something on day/ }).first().click();
  // Staff open it inline in the day; the client's board opens it in a sheet.
  const panel = page.getByRole("region", { name: "Add to this day" });
  // Suggestions may list the same experience; browse the library explicitly.
  const browse = panel.getByRole("region", { name: "Browse" });
  await browse.getByRole("button", { name: path[0], exact: true }).click();
  await browse.getByRole("button", { name: path[1], exact: true }).click();
  await browse.getByRole("button", { name: new RegExp(`^${path[2]}`) }).click();
  if (opts.branch) await panel.getByRole("combobox").selectOption({ label: opts.branch });
  await panel.getByLabel("Start time").fill(opts.time);
  await clickAndSettle(page, panel.getByRole("button", { name: "Add to day" }));
}

test.describe.configure({ mode: "serial" });

test("golden path: trip → health core → client builds → confirm", async ({ page, browser }) => {
  let tripUrl = "";

  await test.step("admin creates a client and their trip", async () => {
    await signInAsAdmin(page);
    await page.goto("/admin/clients/new");
    await page.getByLabel("Full name").fill(CLIENT_NAME);
    await page.getByLabel("Email").fill(CLIENT_EMAIL);
    await page.getByLabel("Country").fill("Germany");
    await page.getByRole("button", { name: "Create client" }).click();
    await expect(page).toHaveURL(/\/admin\/clients\/(?!new)[a-z0-9]+$/, { timeout: 30_000 });

    // A client without trips opens the new-trip form straight away.
    await page.getByLabel("Trip name").fill(TRIP_NAME);
    await page.getByLabel("Start date").fill(DAY_1);
    await page.getByLabel("End date").fill(isoDay(66));
    await page.getByLabel("Travellers").fill("2");
    await page.getByRole("button", { name: "Create trip" }).click();
    await expect(page).toHaveURL(/\/admin\/trips\/[a-z0-9]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: TRIP_NAME })).toBeVisible();
    tripUrl = page.url();
  });

  await test.step("admin records requirements with a 40/30/30 mix", async () => {
    await page.getByLabel("Summary").fill("A preventive check-up, then a slow week of culture and rest.");
    const mix = page.locator('input[name^="mix."]');
    await mix.nth(0).fill("40");
    await mix.nth(1).fill("30");
    await mix.nth(2).fill("20");
    await expect(page.getByText("must be 100%")).toBeVisible();
    await mix.nth(2).fill("30");
    await clickAndSettle(page, page.getByRole("button", { name: "Save requirements" }));
    await expect(page.locator('input[name^="mix."]').nth(0)).toHaveValue("40");
  });

  await test.step("admin places the health core at a chosen branch", async () => {
    await addFromLibrary(page, DAY_1, ["Health & Medical", "Diagnostics", "Comprehensive Blood Panel"], {
      branch: "Fort Kochi",
      time: "08:00",
    });
    const block = page.locator(`#day-${DAY_1} article`, { hasText: "Comprehensive Blood Panel" });
    await expect(block).toContainText("Health core");
    await expect(block).toContainText("Fort Kochi");
    // 185 per person × 2 travellers.
    await expect(block).toContainText("€370.00");
  });

  await test.step("admin invites the client", async () => {
    await page.getByRole("link", { name: CLIENT_NAME }).click();
    await clickAndSettle(page, page.getByRole("button", { name: /Send invitation/ }));
  });

  const client = await (await browser.newContext()).newPage();

  await test.step("client opens their link and lands on the Feed", async () => {
    await client.goto(latestInviteUrlFromMailLog());
    await expect(client).toHaveURL(/\/trip$/);
    await expect(client.getByRole("link", { name: "Feed" })).toHaveAttribute("aria-current", "page");
    await expect(client.getByText(/Kathakali performance/).first()).toBeVisible();
    await client.getByRole("link", { name: /Plan my itinerary/ }).click();
    await expect(client).toHaveURL(/\/trip\/itinerary/);
    await expect(client.getByRole("heading", { name: TRIP_NAME })).toBeVisible();
  });

  const card = (day: string, title: string) =>
    client.locator(`#day-${day}`).getByRole("button", { name: new RegExp(`${title}.*Open details`) });

  await test.step("the health core is fixed for the client", async () => {
    await card(DAY_1, "Comprehensive Blood Panel").click();
    const sheet = client.getByRole("dialog");
    await expect(sheet).toContainText("Arranged by your team");
    await expect(sheet.getByRole("button", { name: "Remove" })).toHaveCount(0);
    await expect(sheet.getByRole("button", { name: /Change day or time/ })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(card(DAY_1, "Comprehensive Blood Panel")).toHaveAccessibleName(/arranged by your team/);
  });

  await test.step("client adds a dinner and sees the total update", async () => {
    await addFromLibrary(client, DAY_2, ["Heritage & Culture", "Restaurants", "Dinner at Malabar Spice Table"], {
      time: "19:30",
    });
    await expect(card(DAY_2, "Dinner at Malabar Spice Table")).toContainText("19:30");
    // Priced for two: one table for the two travellers.
    await card(DAY_2, "Dinner at Malabar Spice Table").click();
    await expect(client.getByRole("dialog")).toContainText("€35.00");
    await client.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(client.getByText("€405.00").first()).toBeVisible();
  });

  await test.step("client drags the dinner to another day", async () => {
    const before = client.url();
    await card(DAY_2, "Dinner at Malabar Spice Table").dragTo(client.locator(`#day-${DAY_3}`));
    await client.waitForURL((url) => url.toString() !== before, { timeout: 30_000 });
    await expect(card(DAY_3, "Dinner at Malabar Spice Table")).toContainText("19:30");
    await expect(client.locator(`#day-${DAY_2}`).getByRole("button", { name: /Open details/ })).toHaveCount(0);
  });

  await test.step("client tells the assistant what they love and adds its idea", async () => {
    await client.getByLabel("Your message").fill("I love this art. Can I see Kathakali?");
    await client.getByRole("button", { name: "Send" }).click();
    const ideas = client.getByRole("list", { name: "Ideas from the assistant" });
    await expect(ideas).toContainText("Kathakali Performance");
    await ideas.getByRole("button", { name: "Add" }).first().click();
    await clickAndSettle(client, ideas.getByRole("button", { name: "Day 4" }));
    await expect(card(isoDay(63), "Kathakali Performance")).toContainText("18:30");
  });

  await test.step("client asks the assistant to build the rest", async () => {
    for (const text of ["I'd like a check-up while I'm there.", "Slowly please, with free afternoons.", "Some yoga would be nice."]) {
      await client.getByLabel("Your message").fill(text);
      await client.getByRole("button", { name: "Send" }).click();
      await expect(client.getByText(text)).toBeVisible();
    }
    await clickAndSettle(client, client.getByRole("button", { name: "Build my itinerary" }));
    await expect(client).toHaveURL(/\/trip\/itinerary/);
    await expect(client.getByRole("button", { name: /, suggested\./ }).first()).toBeVisible();
    // The health core and the client's own choices survive the AI draft.
    await expect(card(DAY_1, "Comprehensive Blood Panel")).toBeVisible();
    await expect(card(DAY_3, "Dinner at Malabar Spice Table")).toBeVisible();
  });

  await test.step("client confirms: every activity shows the double tick", async () => {
    client.once("dialog", (dialog) => dialog.accept());
    await clickAndSettle(client, client.getByRole("button", { name: "Confirm my itinerary" }));
    await expect(client.getByRole("region", { name: "Trip status" })).toContainText("Confirmed");
    await expect(card(DAY_1, "Comprehensive Blood Panel")).toHaveAccessibleName(/Confirmed — we are booking it/);
    await expect(client.getByRole("button", { name: /^Add something/ })).toHaveCount(0);
  });

  await test.step("admin sees the trip awaiting payment", async () => {
    await page.goto(tripUrl);
    await expect(page.getByText("The client confirmed this itinerary")).toBeVisible();
    await expect(page.getByText("Awaiting payment").first()).toBeVisible();
  });

  await test.step("staff record a booking and the client sees the green tick", async () => {
    const block = page.locator(`#day-${DAY_1} article`, { hasText: "Comprehensive Blood Panel" });
    await block.getByLabel("Booking").selectOption("CONFIRMED");
    await clickAndSettle(page, block.getByRole("button", { name: "Save" }));
    await client.reload();
    await expect(card(DAY_1, "Comprehensive Blood Panel")).toHaveAccessibleName(/Booked and ready/);
    await expect(client.getByRole("region", { name: "Trip status" })).toContainText("1 of");
  });
});
