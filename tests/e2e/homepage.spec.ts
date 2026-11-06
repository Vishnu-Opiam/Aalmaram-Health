import { expect, test } from "@playwright/test";

/** Visitors land on the public homepage, not the staff sign-in. */
test("homepage answers what, why Kerala, how, safety and cost, and offers a free conversation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kerala");
  for (const name of [
    "Deep roots, wide shelter",
    "Why Kerala",
    "Choose what you need",
    "Your own mix",
    "How it works",
    "Choosing providers",
    "Is this right for you?",
    "What it costs",
    "Questions people ask",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeAttached();
  }
  await expect(page.getByText(/€250 · ≈ £215/).first()).toBeVisible();

  // Your mix: the examples follow the visitor's split.
  await page.getByRole("button", { name: /Mostly health/ }).click();
  await expect(page.getByText(/Your mix: 60% health/)).toBeAttached();
  await page.getByRole("button", { name: "More wellness" }).click();
  await expect(page.getByText(/Your mix: 50% health, 30% wellness, 20% culture/)).toBeAttached();

  // What it costs: the provider's price plus our fee, nothing else.
  const pricing = page.locator("#pricing");
  await expect(pricing.getByRole("heading", { level: 3 })).toHaveText(["What the provider charges", "Our service fee"]);

  await page.getByText("Is the first call really free?").click();
  await expect(page.getByText("no obligation to book")).toBeVisible();
  await page.getByRole("link", { name: "Staff sign-in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("a visitor asks for a free conversation in one click from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: /free conversation/i }).click();
  await expect(page).toHaveURL(/\/talk$/);

  await page.getByRole("button", { name: "Ask for my free conversation" }).click();
  await expect(page.getByText("Please correct the highlighted fields.")).toBeFocused();
  await expect(page.getByText("Choose where you live.")).toBeVisible();

  await page.getByLabel("Your name").fill("E2E Visitor (demo)");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Where you live").selectOption("United Kingdom");
  await page.getByLabel("Best time to talk").selectOption("Weekday mornings");
  await page.getByLabel("Wellness & Ayurveda").check();
  await page.getByLabel(/You may contact me/).check();
  await page.getByRole("button", { name: "Ask for my free conversation" }).click();

  await expect(page).toHaveURL(/\/talk\/thanks$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("we will be in touch");
});

test("How it works, Why Kerala and Is it safe? are one click from the menu", async ({ page }) => {
  for (const [link, path, heading] of [
    ["How it works", "/how-it-works", "Four steps, one person beside you"],
    ["Why Kerala", "/why-kerala", "Classical Ayurveda"],
    ["Is it safe?", "/safety", "We arrange. Doctors decide."],
  ]) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: link }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(link);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: link })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book a free conversation" }).first()).toHaveAttribute("href", "/talk");
  }
});

test("health, wellness and culture each have a page, and the homepage links into them", async ({ page }) => {
  await page.goto("/");
  await page.locator("#why-kerala").getByRole("link", { name: "Health in Kerala" }).click();
  await expect(page).toHaveURL(/\/health$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Health");
  await expect(page.getByRole("heading", { level: 3, name: "Health check" })).toBeVisible();
  await expect(page.locator("#health-check")).toContainText("€250 · ≈ £215");

  // An open Explore tile goes straight to its item.
  await page.goto("/");
  await page.locator("#explore").getByRole("button", { name: /Ayurveda/ }).click();
  await page.locator("#explore").getByRole("link", { name: "More about ayurveda" }).click();
  await expect(page).toHaveURL(/\/wellness#ayurveda$/);

  await page.getByRole("navigation", { name: "Also in Kerala" }).getByRole("link", { name: "Culture" }).click();
  await expect(page).toHaveURL(/\/culture$/);
  await expect(page.getByRole("heading", { level: 3, name: "A Kathakali evening" })).toBeVisible();

  expect((await page.request.get("/not-a-module")).status()).toBe(404);
});
