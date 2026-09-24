import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { api, createFixtureStaff, loginAsOwner, uniqueDueDate, type FixtureUser } from "./fixtures";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

/**
 * The workflows the other specs don't reach: changing a production stage (and
 * seeing it in the history), the Kanban board, creating a staff account from
 * User Management, a worker signing in with a QR login card, exporting the
 * revenue CSV, and the printable sticker.
 */
test.describe.serial("more workflows", () => {
  let page: Page;
  let ownerToken: string;
  let designer: FixtureUser;
  let master: FixtureUser;
  let orderId = "";

  test.beforeAll(async ({ browser }) => {
    ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", "WF Designer");
    master = await createFixtureStaff(ownerToken, "master_tailor", "WF Master");
    const { order } = await api<{ order: { id: string } }>(ownerToken, "/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: `WF Customer ${Date.now()}`,
        phone: "9123456708",
        billNumber: `WF-${Date.now()}`,
        dueDate: uniqueDueDate(),
        designerId: designer.id,
        masterTailorId: master.id,
        productCategory: "mens_skirt",
        orderDetails: "Workflow fixture",
        totalAmount: "2000.00",
        productionStatus: "design_pending",
      }),
    });
    orderId = order.id;
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

  test("the order page shows a repeated category with its collection", async () => {
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText("Skirt (Mens Wear)").first()).toBeVisible();
  });

  test("change the production stage: confirm, see the toast, and find it in Status History", async () => {
    await page.goto(`/orders/${orderId}`);
    await page.locator("select").filter({ has: page.locator('option[value="design_approved"]') }).first().selectOption("design_approved");
    await page.getByRole("button", { name: "Change to Design Approved" }).click();
    await expect(page.getByText("Status updated to Design Approved.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Design Approved").first()).toBeVisible();
    // Newest entry of the history is the new stage.
    const history = page.locator("div.rounded-app-lg").filter({ hasText: "Status History" }).last();
    await expect(history.locator("ol > li").first()).toContainText("Design Approved");
    await expect(history.locator("ol > li").nth(1)).toContainText("Design Pending");
  });

  test("Kanban: last 2 months only, 50 per page, and paging works", async () => {
    await page.goto("/orders");
    const boardLoad = page.waitForResponse((r) => r.url().includes("/orders?") && r.url().includes("createdFrom="));
    await page.getByRole("button", { name: "Kanban" }).click();
    const res = await boardLoad;
    const url = new URL(res.url());
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("offset")).toBe("0");
    const from = url.searchParams.get("createdFrom")!;
    // The window starts two months back (a day of slack for timezones / month ends).
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    expect(Math.abs(Date.parse(from) - twoMonthsAgo.getTime())).toBeLessThan(3 * 86_400_000);

    const body = (await res.json()) as { orders: { createdAt: string }[]; total: number };
    expect(body.orders.length).toBeLessThanOrEqual(50);
    for (const o of body.orders) expect(o.createdAt >= from).toBe(true);

    await expect(page.getByText(/Orders booked since/)).toBeVisible();
    await expect(page.getByText(/WF Customer/).first()).toBeVisible({ timeout: 10_000 });

    if (body.total > 50) {
      await expect(page.getByText(`Showing 1–50 of ${body.total}`)).toBeVisible();
      const next = page.waitForResponse((r) => r.url().includes("createdFrom=") && r.url().includes("offset=50"));
      await page.getByRole("button", { name: /^Next/ }).click();
      const second = (await (await next).json()) as { orders: { id: string }[] };
      expect(second.orders.length).toBeGreaterThan(0);
      await expect(page.getByText(new RegExp(`Showing 51–\\d+ of ${body.total}`))).toBeVisible();
    }
  });

  test("User Management: create a staff account and see its one-time password", async () => {
    await page.goto("/admin/users");
    await page.getByRole("button", { name: /Create account/ }).click();
    const name = `WF New Staff ${Date.now()}`;
    // The labels are linked to their fields, so the form is found by what it says.
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Email").fill(`wf-${Date.now()}@needleeye.test`);
    await page.getByLabel("Role").selectOption("worker");
    await page.locator("form").getByRole("button", { name: /Create/ }).click();
    await expect(page.getByText(/Copy password/)).toBeVisible({ timeout: 10_000 });
  });

  test("a worker signs in with a QR login card and lands on the scan page", async ({ browser }) => {
    const worker = await createFixtureStaff(ownerToken, "worker", "WF Worker");
    const { token } = await api<{ token: string }>(ownerToken, `/users/${worker.id}/qr-token`, { method: "POST" });
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/qr-login?token=${encodeURIComponent(token)}`);
    await expect(p).toHaveURL(/\/scan/, { timeout: 15_000 });
    await ctx.close();
  });

  test("Revenue: export CSV downloads a file", async () => {
    await page.goto("/revenue");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^needleye-revenue-.*\.csv$/);
  });

  test("the printable sticker renders the order", async () => {
    await page.goto(`/orders/${orderId}/label`);
    await expect(page.getByText("Skirt (Mens Wear)").first()).toBeVisible();
  });
});
