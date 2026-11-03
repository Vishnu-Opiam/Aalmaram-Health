import { expect, test } from "@playwright/test";

/** Visitors land on the public homepage, not the staff sign-in. */
test("homepage answers what, how, safety and cost, and offers a free conversation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kerala");
  for (const name of [
    "Four steps, with a person beside you at each one",
    "Explore by what you need",
    "Is it safe?",
    "What a trip can look like",
    "Why Kerala",
    "Is this right for you?",
    "Transparent pricing",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  await expect(page.getByText(/€250 · ≈ £215/).first()).toBeVisible();

  // Your mix: the examples follow the visitor's split.
  await page.getByRole("button", { name: /Mostly health/ }).click();
  await expect(page.getByText(/Your mix: 60% health/)).toBeAttached();
  await page.getByRole("button", { name: "More wellness" }).click();
  await expect(page.getByText(/Your mix: 50% health, 30% wellness, 20% culture/)).toBeAttached();

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
