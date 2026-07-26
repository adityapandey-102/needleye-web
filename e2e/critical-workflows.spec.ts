import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createFixtureStaff, loginAsOwner } from "./fixtures";
import type { FixtureUser } from "./fixtures";

const SAMPLE_IMAGE = path.join(__dirname, "fixtures", "sample.png");

/**
 * The critical-workflow suite (see CLAUDE.md's testing pyramid): login,
 * create order (incl. image upload), search orders, update order, record
 * payment. Serial on purpose -- each step builds on the order the previous
 * step created, mirroring how a designer would actually use the app in one
 * sitting, rather than re-deriving fixtures for every test. Uses one shared
 * page/context across the whole file (Playwright's default `page` fixture
 * is per-test, which would log the browser out between steps) so the
 * session established by "login" carries through to every later step.
 */
test.describe.serial("critical workflows", () => {
  let designer: FixtureUser;
  let masterTailor: FixtureUser;
  const billNumber = `E2E-${Date.now()}`;
  const customerName = `E2E Customer ${Date.now()}`;
  let orderId = "";
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", "Designer");
    masterTailor = await createFixtureStaff(ownerToken, "master_tailor", "Master");
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("login", async () => {
    await page.goto("/login");
    await page.getByPlaceholder("you@needleeye.app").fill(designer.email);
    await page.getByPlaceholder("••••••••").fill(designer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test("create order (with a reference image upload)", async () => {
    await page.goto("/orders/new");

    await page.getByPlaceholder("e.g. Priya Sharma").fill(customerName);
    await page.getByPlaceholder("e.g. 9876543210").fill("9123456780");
    await page.getByPlaceholder("e.g. BILL-2024-001").fill(billNumber);
    await page.locator('input[type="date"]').last().fill("2026-12-01"); // Delivery Due Date

    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Designer")') }).selectOption(designer.id);
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Master")') }).selectOption(masterTailor.id);
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Category")') }).selectOption("saree");
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Status")') }).selectOption("design_pending");

    await page.getByPlaceholder("Measurements, design references, fabric type, embellishments, color preferences...").fill(
      "Created by the Playwright critical-workflow suite.",
    );
    await page.getByText("Advance Paid").click();

    // First of the 4 upload slots -- a hidden <input type="file">, no click needed to reveal it.
    await page.locator('input[type="file"]').first().setInputFiles(SAMPLE_IMAGE);

    await page.getByRole("button", { name: "✦ Create Product Order" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/, { timeout: 15_000 });
    orderId = page.url().split("/orders/")[1]!;

    await expect(page.getByText(customerName).first()).toBeVisible();
    // Confirms the staged file actually made it through ordersApi.uploadImage after order creation.
    await expect(page.locator('img[alt="Reference 1"]')).toBeVisible();
  });

  test("search orders finds the new order by bill number", async () => {
    await page.goto("/orders");
    await page.getByPlaceholder("Search customer, bill number, or order ID").fill(billNumber);
    await expect(page.getByRole("link", { name: "View" })).toHaveCount(1);
    await page.getByRole("link", { name: "View" }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("update order edits a customer/product field", async () => {
    await page.goto(`/orders/${orderId}`);
    await page.getByRole("link", { name: "Edit Order" }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}/edit$`));

    const specialNotes = page.getByPlaceholder("Special requirements, preferences, deadline constraints...");
    await specialNotes.fill("Updated by the Playwright critical-workflow suite.");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
    await page.reload();
    await expect(page.getByText("Updated by the Playwright critical-workflow suite.")).toBeVisible();
  });

  test("record payment adds a ledger entry", async () => {
    await page.goto(`/orders/${orderId}`);
    await page.getByRole("button", { name: "+ Record payment" }).click();

    const paymentForm = page.locator("form", { has: page.getByRole("button", { name: "Record payment" }) });
    await paymentForm.locator('input[type="number"]').fill("500");
    await paymentForm.getByRole("button", { name: "Record payment" }).click();

    await expect(page.getByText("₹500", { exact: true })).toBeVisible();
  });
});
