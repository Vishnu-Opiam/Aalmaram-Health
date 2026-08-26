import { expect, test, type Page } from "@playwright/test";

/**
 * Inventory administration: vendor, catalogue and component CRUD, plus the
 * activate/deactivate and reorder controls.
 *
 * The golden path never touches these, so they are covered here: they are the
 * screens an admin uses to keep the catalogue current, and a deactivated
 * component is one of the things itinerary validation refuses to publish.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aalmaram.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Aalmaram!Demo1";

const RUN = Date.now();
const VENDOR_NAME = `Test Vendor ${RUN} (demo)`;
const COMPONENT_NAME = `Test Consultation ${RUN}`;
const CATALOGUE_NAME = `Test Catalogue ${RUN}`;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/**
 * Clicks a control whose Server Action navigates afterwards, and waits for that
 * navigation to commit. Every mutation lands on a new URL (a different route,
 * or the same route with a fresh refresh nonce), so a URL change is an exact
 * barrier - unlike "networkidle", which can resolve in the gap before the
 * action request is even sent.
 */
async function clickAndSettle(page: Page, selector: ReturnType<Page["getByRole"]>) {
  const before = page.url();
  await selector.click();
  await page.waitForURL((url) => url.toString() !== before, {
    timeout: 30_000,
  });
  await page.waitForLoadState("load");
}

test.describe.configure({ mode: "serial" });

test("inventory: vendor and catalogue and component CRUD with status toggles", async ({
  page,
}) => {
  await signIn(page);

  await test.step("create a vendor", async () => {
    await page.goto("/admin/vendors/new");
    await page.getByLabel("Vendor name").fill(VENDOR_NAME);
    await page.getByLabel("Contact name").fill("Test Contact");
    await page.getByLabel("Email").fill(`vendor.${RUN}@example.com`);
    await page.getByLabel("Location").fill("Kochi");
    await page.getByRole("button", { name: "Create vendor" }).click();

    await expect(page).toHaveURL(/\/admin\/vendors\/(?!new)[a-z0-9]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: VENDOR_NAME }),
    ).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
  });

  const vendorUrl = page.url();

  await test.step("deactivate and reactivate the vendor", async () => {
    await clickAndSettle(page, page.getByRole("button", { name: "Deactivate" }));
    await expect(page.getByText("Inactive").first()).toBeVisible();

    await clickAndSettle(page, page.getByRole("button", { name: "Activate" }));
    await expect(page.getByText("Active").first()).toBeVisible();
  });

  await test.step("create a catalogue under an existing module", async () => {
    await page.goto("/admin/catalogues");
    await page.getByRole("link", { name: "New catalogue" }).first().click();
    await expect(page).toHaveURL(/\/admin\/catalogues\/new$/);
    await page.getByLabel("Parent module").selectOption({ index: 1 });
    await page.getByLabel("Catalogue name").fill(CATALOGUE_NAME);
    await page.getByRole("button", { name: "Create catalogue" }).click();

    await expect(page).toHaveURL(/\/admin\/catalogues$/, { timeout: 30_000 });
    await expect(page.getByText(CATALOGUE_NAME)).toBeVisible();
  });

  await test.step("create a component and see it on the vendor", async () => {
    await page.goto("/admin/components");
    await page.getByRole("link", { name: "New component" }).first().click();
    await expect(page).toHaveURL(/\/admin\/components\/new$/);

    await page
      .getByLabel("Vendor")
      .selectOption({ label: `${VENDOR_NAME}` });
    const catalogue = page.getByLabel("Catalogue");
    const catalogueValue = await catalogue
      .locator("option", { hasText: CATALOGUE_NAME })
      .first()
      .getAttribute("value");
    await catalogue.selectOption(catalogueValue!);

    await page.getByLabel("Component name").fill(COMPONENT_NAME);
    await page
      .getByLabel("Client-facing description")
      .fill("A consultation used to exercise the admin screens.");
    await page.getByLabel("What is included").fill("A conversation");
    await page.getByLabel("Client deliverable").fill("A written summary");
    await page.getByLabel("Tags").fill("test, e2e");
    await page.getByLabel("Price").fill("99.50");

    await page.getByRole("button", { name: "Create component" }).click();

    await expect(page).toHaveURL(/\/admin\/components\/(?!new)[a-z0-9]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: COMPONENT_NAME }),
    ).toBeVisible();
    await expect(page.getByText("€99.50")).toBeVisible();
    await expect(page.getByText("A written summary")).toBeVisible();

    // It appears under its vendor.
    await page.goto(vendorUrl);
    await expect(page.getByText(COMPONENT_NAME)).toBeVisible();
  });

  await test.step("deactivating a component warns that it cannot be proposed", async () => {
    await page.goto("/admin/components");
    await page.getByPlaceholder("Name, description or tag…").fill(RUN.toString());
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("link", { name: COMPONENT_NAME }).click();

    await clickAndSettle(page, page.getByRole("button", { name: "Deactivate" }));
    await expect(page.getByText("This component is deactivated")).toBeVisible();
    await expect(
      page.getByText(/cannot be published in a new proposal/i),
    ).toBeVisible();
  });

  await test.step("search and filters narrow the component list", async () => {
    await page.goto("/admin/components?status=ACTIVE");
    await page.getByPlaceholder("Name, description or tag…").fill(COMPONENT_NAME);
    await page.getByRole("button", { name: "Apply" }).click();
    // It is inactive now, so an ACTIVE-only filter must not return it.
    await expect(
      page.getByText("No components match those filters"),
    ).toBeVisible();
  });

  await test.step("modules can be reordered and deactivated", async () => {
    await page.goto("/admin/modules");
    const firstRowName = await page
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .innerText();

    await page
      .locator("tbody tr")
      .nth(1)
      .getByRole("button", { name: "Move up" })
      .click();

    await expect(page.locator("tbody tr").nth(1).locator("td").nth(1)).toContainText(
      firstRowName.split("\n")[0],
      { timeout: 30_000 },
    );
  });
});
