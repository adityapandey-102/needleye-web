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
  const customerName = `WF Customer ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", "WF Designer");
    master = await createFixtureStaff(ownerToken, "master_tailor", "WF Master");
    const { order } = await api<{ order: { id: string } }>(ownerToken, "/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName,
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

  test("Ready, the alteration loop, and Delivered only from Ready (with the dashboard cards)", async () => {
    await api(ownerToken, `/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "quality_check" }) });
    const stageSelect = () => page.locator("select").filter({ has: page.locator('option[value="ready"]') }).first();
    const moveTo = async (value: string, label: string) => {
      await stageSelect().selectOption(value);
      await page.getByRole("button", { name: `Change to ${label}` }).click();
      await expect(page.getByText(`Status updated to ${label}.`)).toBeVisible();
      await page.reload();
    };

    await page.goto(`/orders/${orderId}`);
    // At QC: Ready is offered, Delivered isn't.
    await expect(stageSelect().locator('option[value="delivered"]')).toHaveCount(0);
    await moveTo("ready", "Ready");

    // At Ready: the one way back (Alteration) and Delivered are both offered.
    await expect(stageSelect().locator('option[value="alteration"]')).toHaveCount(1);
    await expect(stageSelect().locator('option[value="delivered"]')).toHaveCount(1);
    await moveTo("alteration", "Alteration");

    // At Alteration: back to Ready only -- not straight to Delivered.
    await expect(stageSelect().locator('option[value="delivered"]')).toHaveCount(0);
    await moveTo("ready", "Ready");

    // The dashboard's Ready card opens a list with this order in it.
    await page.goto("/orders");
    await page.getByRole("link", { name: /Ready for Delivery/ }).click();
    await expect(page).toHaveURL(/\/orders\/bucket\/ready/);
    await expect(page.getByRole("cell", { name: customerName })).toBeVisible();

    await page.goto(`/orders/${orderId}`);
    await moveTo("delivered", "Delivered");
    await page.goto("/orders");
    const delivered = page.getByRole("link", { name: /Delivered/ }).filter({ hasText: "This month" });
    await expect(delivered).toBeVisible();
    await delivered.click();
    await expect(page).toHaveURL(/\/orders\/bucket\/delivered_this_month/);
    await expect(page.getByRole("cell", { name: customerName })).toBeVisible();
  });

  test("an unpriced order: Price Not Set card, no payments, and Delivered asks for the total first", async () => {
    const unpricedName = `WF Unpriced ${Date.now()}`;
    const { order } = await api<{ order: { id: string } }>(ownerToken, "/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: unpricedName,
        phone: "9123456711",
        billNumber: `WF-NP-${Date.now()}`,
        dueDate: uniqueDueDate(),
        designerId: designer.id,
        masterTailorId: master.id,
        productCategory: "saree",
        orderDetails: "Unpriced fixture",
        productionStatus: "design_pending",
      }),
    });
    await api(ownerToken, `/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "ready" }) });

    await page.goto("/orders");
    await page.getByRole("link", { name: /Price Not Set/ }).click();
    await expect(page).toHaveURL(/\/orders\/bucket\/not_priced/);
    await expect(page.getByRole("cell", { name: unpricedName })).toBeVisible();

    await page.goto(`/orders/${order.id}`);
    await expect(page.getByText("Set the order’s price first")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Record payment" })).toHaveCount(0);
    await page.locator("select").filter({ has: page.locator('option[value="delivered"]') }).first().selectOption("delivered");
    const dialog = page.getByRole("dialog", { name: "Set the order total first" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "OK" }).click();
    await expect(page.getByText("Ready").first()).toBeVisible(); // still Ready
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

  test("Revenue: this month's cards, the monthly ledger paged by the API, and its CSV", async () => {
    await page.goto("/revenue");
    const thisMonth = page.getByRole("region", { name: "This month" });
    for (const label of ["Total booked", "Paid so far", "Outstanding", "Cash collected"]) {
      await expect(thisMonth.getByText(label, { exact: true })).toBeVisible();
    }
    // The guide at the top: closed until opened, then its sections expand one by one.
    const guide = page.getByRole("region", { name: "Revenue and ledger guide" });
    await guide.getByRole("button", { name: /Open guide/ }).click();
    await expect(guide.getByText("The 4 numbers", { exact: true })).toBeVisible();
    await expect(guide.getByText(/one follows the orders, the other follows the money/)).toBeVisible();
    await guide.getByText("Closing a month", { exact: true }).click();
    await expect(guide.getByText(/saved as its/)).toBeVisible();
    await guide.getByRole("button", { name: /Hide guide/ }).click();
    await expect(guide.getByText("The 4 numbers", { exact: true })).toBeHidden();
    // Since 2020: many months -- 12 a page, newest first, with the range's totals from the API.
    const loaded = page.waitForResponse((r) => r.url().includes("/ledger/months?from=2020-01") && r.status() === 200);
    await page.getByRole("button", { name: /^Since 2020/ }).click();
    await loaded;
    await expect(page.getByText(/^Showing 1–12 of \d+$/)).toBeVisible();
    await expect(page.getByLabel("Range totals").getByText(/^Booked · /)).toBeVisible();

    const download = page.waitForEvent("download");
    // The monthly ledger's own button -- Ledger Activity (a named region below) has one too.
    await page.getByRole("button", { name: /Export CSV/ }).first().click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^needleye-revenue-.*\.csv$/);
  });

  test("Books: Verify now, then close January 2020 and reopen it as the Owner (ADR 0008 phase 5)", async () => {
    // An interrupted earlier run may have left January 2020 closed.
    const before = await api<{ books: { status: string } }>(ownerToken, "/ledger/months/2020-01/closings");
    if (before.books.status === "closed") {
      await api(ownerToken, "/ledger/months/2020-01/reopen", { method: "POST", body: JSON.stringify({ reason: "e2e reset" }) });
    }

    await page.goto("/revenue");
    const check = page.getByRole("region", { name: "Books check" });
    await check.getByRole("button", { name: /Verify now/ }).click();
    // Either result is a working check: a developer's local data may hold a deliberate mismatch.
    // (That the register always matches is asserted by the API's integration suite, on a clean database.)
    await expect(check.getByText(/^(Books verified|The check found problems)$/)).toBeVisible();
    await expect(check.getByText(/Checked just now/)).toBeVisible();

    // Just January 2020: Since 2020, then the end month back to January 2020.
    await page.getByRole("button", { name: /^Since 2020/ }).click();
    await page.getByLabel("To year").selectOption("2020");
    const ranged = page.waitForResponse((r) => r.url().includes("/ledger/months?from=2020-01&to=2020-01") && r.status() === 200);
    await page.getByLabel("To month").selectOption("01");
    await ranged;

    // Close it: the dialog shows the figures it will keep.
    await page.getByRole("button", { name: "Close January 2020" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /January 2020 — books open/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Close January 2020" }).click();
    await expect(dialog).toHaveCount(0);
    const closedChip = page.getByRole("button", { name: /January 2020: books closed/ });
    await expect(closedChip).toBeVisible();

    // Reopen it as the Owner, with a reason.
    await closedChip.click();
    await expect(dialog.getByRole("heading", { name: /January 2020 — books closed/ })).toBeVisible();
    await expect(dialog.getByRole("columnheader", { name: "At closing" })).toBeVisible();
    await dialog.getByLabel(/Why reopen January 2020/).fill("e2e: checking the reopen flow");
    await dialog.getByRole("button", { name: "Reopen January 2020" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close January 2020" })).toBeVisible();
  });

  test("Ledger Activity: export this month as CSV and PDF; no export by year", async () => {
    // A payment now, so this month's ledger has a row for our order.
    await api(ownerToken, `/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify({ amount: "300.00", method: "cash" }) });
    const { order } = await api<{ order: { orderNumber: string } }>(ownerToken, `/orders/${orderId}`);

    await page.goto("/revenue");
    const ledger = page.getByRole("region", { name: "Ledger Activity" });
    await expect(ledger.getByText(order.orderNumber).first()).toBeVisible(); // Month view is the default

    // CSV: the whole month (every page), the table's columns, our row, the totals.
    const download = page.waitForEvent("download");
    await ledger.getByRole("button", { name: /Export CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^needleye-ledger-\d{4}-\d{2}-01-to-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await (await import("node:fs/promises")).readFile((await file.path())!, "utf8");
    expect(csv).toContain("When,Who,Action,Order,Amount,Method,Paid on,Previous amount,Previous method,Previous paid on,Effect on collected");
    // ... Amount, Method, Paid on (today), no previous values for a new payment, Effect.
    expect(csv).toMatch(new RegExp(`,Recorded,${order.orderNumber},300\\.00,Cash,\\d{4}-\\d{2}-\\d{2},,,,300\\.00`));
    expect(csv).toContain("Net change,,,");

    // PDF: the printable page for the same month lists our payment.
    const href = await ledger.getByRole("link").filter({ hasText: /Export PDF/ }).getAttribute("href");
    expect(href).toMatch(/^\/revenue\/ledger-print\?from=\d{4}-\d{2}-01&to=/);
    await page.goto(href!);
    await expect(page.getByText("Ledger Activity").first()).toBeVisible();
    await expect(page.getByText(order.orderNumber).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save as PDF/ })).toBeVisible();

    // Week view exports too; Year view offers no export.
    await page.goto("/revenue");
    await ledger.getByRole("button", { name: "week" }).click();
    await expect(ledger.getByRole("link").filter({ hasText: /Export PDF/ }).or(ledger.getByRole("button", { name: /Export PDF/ }))).toBeVisible();
    await ledger.getByRole("button", { name: "year" }).click();
    await expect(ledger.getByRole("button", { name: /Export CSV/ })).toHaveCount(0);
    await expect(ledger.getByText("Choose Month or Week to export")).toBeVisible();
  });

  test("the printable sticker renders the order", async () => {
    await page.goto(`/orders/${orderId}/label`);
    await expect(page.getByText("Skirt (Mens Wear)").first()).toBeVisible();
  });
});
