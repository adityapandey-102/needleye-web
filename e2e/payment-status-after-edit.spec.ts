import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createFixtureStaff, loginAsOwner, uniqueDueDate } from "./fixtures";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:4000/api/v1";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

/**
 * Regression for the "payment status stuck after editing the total" bug: the
 * ledger summary used to mix its freshly-fetched payments with the (possibly
 * stale) order props from the server component, so after an order edit +
 * settling payment it could still show an outstanding balance. The ledger now
 * self-fetches the order, so its total/paid/status are always consistent.
 */
test.describe.serial("payment status stays correct after editing the total", () => {
  let page: Page;
  let orderId = "";

  test.beforeAll(async ({ browser }) => {
    const ownerToken = await loginAsOwner();
    const designer = await createFixtureStaff(ownerToken, "designer", "PS Designer");
    const master = await createFixtureStaff(ownerToken, "master_tailor", "PS Master");

    // Create an order with a ₹1000 total (owner will later reduce it to ₹500).
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: `PS Customer ${Date.now()}`,
        phone: "9123456700",
        billNumber: `PS-${Date.now()}`,
        bookingDate: "2026-07-01",
        dueDate: uniqueDueDate(),
        designerId: designer.id,
        masterTailorId: master.id,
        productCategory: "saree",
        orderDetails: "Payment-status regression fixture",
        totalAmount: 1000,
        productionStatus: "design_pending",
      }),
    });
    orderId = (await res.json()).order.id;

    page = await browser.newPage();
    await page.goto("/login");
    await page.getByPlaceholder("you@needleeye.app").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("reduce the total via edit, then a settling payment shows Fully Paid", async () => {
    // Visit the detail page first (populates the client router cache with the
    // ₹1000 order -- the exact condition that used to leave the ledger stale).
    await page.goto(`/orders/${orderId}`);

    // Edit the total down to ₹500 (owner-only pricing field).
    await page.getByRole("link", { name: "Edit Order" }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}/edit$`));
    await page.getByPlaceholder("e.g. 25000").fill("500");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));

    // Record a payment that fully settles the (new) ₹500 total.
    await page.getByRole("button", { name: "+ Record payment" }).click();
    const form = page.locator("form", { has: page.getByRole("button", { name: "Record payment" }) });
    await form.locator('input[type="number"]').first().fill("500");
    await form.getByRole("button", { name: "Record payment" }).click();

    // The Payment Status tile must reflect the settled state -- not a stale
    // "No due date" / outstanding balance computed against the old ₹1000 total.
    await expect(page.getByText("Fully Paid")).toBeVisible();
    await expect(page.getByText("Settled")).toBeVisible();
    await expect(page.getByText("No due date")).toHaveCount(0);
  });
});
