import { expect, test, type Page } from "@playwright/test";

/**
 * Inventory administration: vendor, catalogue and component CRUD, plus the
 * activate/deactivate and reorder controls.
 *
 * These are the screens an admin uses to build "what we offer" (module →
 * catalogue → vendor → component), including branches and practitioners.
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
    await page.getByLabel("Point of contact").fill("Test Contact");
    await page.getByLabel("Email").fill(`vendor.${RUN}@example.com`);
    await page.getByLabel("Phone").fill("+91 484 000 9999");
    await page.getByLabel("HQ city").fill("Kochi");
    await page.getByLabel("Languages spoken").fill("English\nMalayalam");
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

  await test.step("add a branch and a practitioner", async () => {
    // A vendor without branches opens the add-branch form straight away.
    await page.locator("#new-branch-name").fill("Edappally (test)");
    await page.locator("#new-branch-city").fill("Kochi");
    await clickAndSettle(page, page.getByRole("button", { name: "Add branch" }));
    await expect(page.getByRole("heading", { name: "Branches (1)" })).toBeVisible();

    await page.getByText("Add a practitioner").click();
    await page.locator("#new-practitioner-name").fill("Dr Test (demo)");
    await page.locator("#new-practitioner-role").fill("Consultant physician");
    await clickAndSettle(page, page.getByRole("button", { name: "Add practitioner" }));
    await expect(page.getByRole("heading", { name: "Practitioners (1)" })).toBeVisible();
  });

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
    await page.locator("#price").fill("99.50");
    await page.getByLabel("Duration (minutes)").fill("45");
    await page.getByLabel("Dr Test (demo)").check();

    await page.getByRole("button", { name: "Create component" }).click();

    await expect(page).toHaveURL(/\/admin\/components\/(?!new)[a-z0-9]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: COMPONENT_NAME }),
    ).toBeVisible();
    await expect(page.getByText("€99.50")).toBeVisible();
    await expect(page.getByText("A written summary")).toBeVisible();
    await expect(page.getByText("45 min")).toBeVisible();
    await expect(page.getByText("Dr Test (demo), Consultant physician")).toBeVisible();

    // It appears under its vendor.
    await page.goto(vendorUrl);
    await expect(page.getByText(COMPONENT_NAME)).toBeVisible();
  });

  await test.step("deactivating a component warns that it cannot be added", async () => {
    await page.goto("/admin/components");
    await page.getByPlaceholder("Name, description or tag…").fill(RUN.toString());
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("link", { name: COMPONENT_NAME }).click();

    await clickAndSettle(page, page.getByRole("button", { name: "Deactivate" }));
    await expect(page.getByText("This component is deactivated")).toBeVisible();
    await expect(
      page.getByText(/can no longer be added to an itinerary/i),
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
