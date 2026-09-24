import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createFixtureStaff, loginAsOwner, uniqueDueDate } from "./fixtures";
import type { FixtureUser } from "./fixtures";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:4000/api/v1";

/**
 * Delivery capacity (Batch D): a due date whose day already has its full
 * quota of orders opens the full-day dialog, and the order can still be
 * booked once the designer says the Production Manager agreed to take it.
 * The day is filled through the real API first, on a date in its own decade
 * (2050+) so it never collides with the other specs' dates.
 */
test.describe.serial("delivery capacity", () => {
  let page: Page;
  let designer: FixtureUser;
  let master: FixtureUser;
  const fullDay = uniqueDueDate(2050);

  test.beforeAll(async ({ browser }) => {
    const ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", "DC Designer");
    master = await createFixtureStaff(ownerToken, "master_tailor", "DC Master");
    const auth = { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` };

    const loadRes = await fetch(`${API}/orders/delivery-load?from=${fullDay}&to=${fullDay}`, { headers: auth });
    const load = (await loadRes.json()) as { capacity: number; days: { date: string; count: number }[] };
    const already = load.days.find((d) => d.date === fullDay)?.count ?? 0;
    for (let i = already; i < load.capacity; i++) {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          customerName: `DC Filler ${i}`,
          phone: "9123456701",
          billNumber: `DC-${Date.now()}-${i}`,
          dueDate: fullDay,
          designerId: designer.id,
          masterTailorId: master.id,
          productCategory: "saree",
          orderDetails: "Fills a delivery day for the capacity e2e spec",
          productionStatus: "design_pending",
        }),
      });
      expect(res.status, `filler order ${i}`).toBe(201);
    }

    page = await browser.newPage();
    await page.goto("/login");
    await page.getByPlaceholder("you@needleeye.app").fill(designer.email);
    await page.getByPlaceholder("••••••••").fill(designer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("a full day opens the dialog; proceeding with the PM's OK books it", async () => {
    await page.goto("/orders/new");
    await page.getByLabel("Delivery due date").fill(fullDay);

    const dialog = page.getByRole("dialog", { name: "This delivery date is fully booked" });
    await expect(dialog).toBeVisible();

    // "Check the calendar" swaps the dialog for the calendar.
    await dialog.getByRole("button", { name: "Check the calendar" }).click();
    const calendar = page.getByRole("dialog", { name: "Choose a delivery date" });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: "Close" }).click();
    await expect(calendar).toBeHidden();

    // The date is still the full one; reopen the choices and take the override.
    await expect(page.getByText(/Fully booked · \d+ of \d+/)).toBeVisible();
    await page.getByRole("button", { name: "Options" }).click();
    await dialog.getByRole("button", { name: /Already checked with Production Manager/ }).click();
    await expect(page.getByText("Fully booked, confirmed with the Production Manager")).toBeVisible();

    const customerName = `DC Override ${Date.now()}`;
    await page.getByPlaceholder("e.g. Priya Sharma").fill(customerName);
    await page.getByPlaceholder("e.g. 9876543210").fill("9123456702");
    await page.getByPlaceholder("e.g. BILL-2024-001").fill(`DC-OVR-${Date.now()}`);
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Master")') }).selectOption(master.id);
    await page.getByRole("button", { name: /choose a product category/i }).click();
    const categorySearch = page.getByRole("combobox", { name: "Search categories" });
    await categorySearch.fill("saree");
    await expect(page.getByRole("option", { name: "Saree", exact: true })).toBeVisible();
    await categorySearch.press("Enter");
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Status")') }).selectOption("design_pending");
    await page.getByPlaceholder("Measurements, design references, fabric type, embellishments, color preferences...").fill(
      "Booked on a full day with the Production Manager's OK.",
    );

    await page.getByRole("button", { name: "Create Product Order" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("a full day can be picked in the calendar, and picking it asks again", async () => {
    // The calendar only reaches six months ahead, so this one fakes the load
    // in the browser (a full day next month) rather than filling a real
    // near-term day in the database.
    const now = new Date();
    const next = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 15)).toISOString().slice(0, 10);
    await page.route("**/orders/delivery-load?**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ capacity: 10, nearCapacity: 8, days: [{ date: next, count: 10 }] }),
      }),
    );
    try {
      await page.goto("/orders/new");
      await page.getByRole("button", { name: "Open the delivery calendar" }).click();
      const calendar = page.getByRole("dialog", { name: "Choose a delivery date" });
      const fullCell = calendar.getByRole("button", { name: /10 of 10 deliveries booked, fully booked/ });
      await expect(fullCell).toBeEnabled();
      await fullCell.click();

      const dialog = page.getByRole("dialog", { name: "This delivery date is fully booked" });
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel("Delivery due date")).toHaveValue(next);

      // Back to the calendar and the same day again: the question comes back.
      await dialog.getByRole("button", { name: "Check the calendar" }).click();
      await calendar.getByRole("button", { name: /10 of 10 deliveries booked, fully booked/ }).click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByLabel("Delivery due date")).toHaveValue("");
    } finally {
      await page.unroute("**/orders/delivery-load?**");
    }
  });

  test("Cancel clears the full date", async () => {
    await page.goto("/orders/new");
    const input = page.getByLabel("Delivery due date");
    await input.fill(fullDay);
    const dialog = page.getByRole("dialog", { name: "This delivery date is fully booked" });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(input).toHaveValue("");
  });
});
