import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { api, createFixtureStaff, loginAsOwner, type FixtureUser } from "./fixtures";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@needleeye.app").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/orders|\/scan/, { timeout: 15_000 });
}

/**
 * The dashboard's Delivery Calendar (owner + production manager): the same
 * calendar as the order form, and clicking a day lists the orders due that
 * day. The fixture order is due 20 days AGO -- the dashboard calendar reaches
 * back 3 months -- so it never takes a slot in the upcoming booking calendar.
 */
test.describe.serial("dashboard delivery calendar", () => {
  let ownerToken: string;
  let designer: FixtureUser;
  let pm: FixtureUser;
  let dueDate = "";
  let customer = "";

  test.beforeAll(async () => {
    ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", "DCal Designer");
    const master = await createFixtureStaff(ownerToken, "master_tailor", "DCal Master");
    pm = await createFixtureStaff(ownerToken, "production_manager", "DCal PM");
    dueDate = new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10);
    customer = `DCal Customer ${Date.now()}`;
    await api(ownerToken, "/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: customer,
        phone: "9123456707",
        billNumber: `DCAL-${Date.now()}`,
        dueDate,
        designerId: designer.id,
        masterTailorId: master.id,
        productCategory: "saree",
        orderDetails: "Dashboard calendar fixture",
        productionStatus: "design_pending",
        confirmedWithProductionManager: true, // a past day may already be full locally
      }),
    });
  });

  test("owner: open the calendar, click a day, see that day's orders, open one", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.getByRole("button", { name: /Delivery Calendar/ }).click();
    const cal = page.getByRole("dialog", { name: "Deliveries by day" });
    await expect(cal).toBeVisible();

    // The fixture day may be in the previous month: step back until it's on screen.
    const cell = cal.locator(`button[data-date="${dueDate}"]`);
    for (let i = 0; i < 2 && !(await cell.isVisible()); i++) {
      await cal.getByRole("button", { name: "Previous month" }).click();
    }
    await expect(cell).toBeEnabled();

    const dayLoad = page.waitForResponse((r) => r.url().includes(`dueOn=${dueDate}`) && r.status() === 200);
    await cell.click();
    const body = (await (await dayLoad).json()) as { orders: { dueDate: string }[] };
    expect(body.orders.every((o) => o.dueDate === dueDate)).toBe(true);

    await expect(cal.getByText(/^Deliveries on /)).toBeVisible();
    await expect(cal.getByText(/\d+ orders? due/)).toBeVisible();
    // Big local days page 20 at a time; make sure we find the fixture's row.
    const row = cal.getByRole("link", { name: new RegExp(customer) });
    /** Wait for the day's list, then page forward (if there are pages) until the fixture's row shows. */
    const findRow = async () => {
      await expect(cal.locator("ul > li").first()).toBeVisible();
      for (let i = 0; i < 10 && !(await row.isVisible()); i++) {
        const next = cal.getByRole("button", { name: /^Next/ });
        if (!(await next.isVisible()) || !(await next.isEnabled())) break;
        await next.click();
        await page.waitForTimeout(300);
      }
    };
    await findRow();
    await expect(row).toBeVisible();

    // Back to the months, then into the order itself.
    await cal.getByRole("button", { name: "Back to calendar" }).click();
    await expect(cal.getByRole("button", { name: "Previous month" })).toBeVisible();
    await cell.click();
    await findRow();
    await row.click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
    await expect(page.getByText(customer).first()).toBeVisible();
  });

  test("production manager gets the calendar; a designer does not", async ({ browser }) => {
    const pmCtx = await browser.newContext();
    const pmPage = await pmCtx.newPage();
    await signIn(pmPage, pm.email, pm.password);
    await pmPage.getByRole("button", { name: /Delivery Calendar/ }).click();
    await expect(pmPage.getByRole("dialog", { name: "Deliveries by day" })).toBeVisible();
    await pmCtx.close();

    const dCtx = await browser.newContext();
    const dPage = await dCtx.newPage();
    await signIn(dPage, designer.email, designer.password);
    await expect(dPage.getByRole("button", { name: /Delivery Calendar/ })).toHaveCount(0);
    await dCtx.close();
  });
});
