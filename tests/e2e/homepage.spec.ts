import { expect, test } from "@playwright/test";

/** Visitors land on the public homepage, not the staff sign-in. */
test("homepage answers what, how, safety and offers a free call", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kerala");
  for (const name of ["How it works", "Why Kerala", "Explore by what you need", "Is it safe?", "Is this right for you?", "Transparent pricing"]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Free call", exact: true })).toBeVisible();
  await page.getByText("Is the first call really free?").click();
  await expect(page.getByText("no obligation to book")).toBeVisible();
  await page.getByRole("link", { name: "Staff sign-in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
