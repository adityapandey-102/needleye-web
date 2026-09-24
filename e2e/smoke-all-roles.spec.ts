import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { api, createFixtureStaff, loginAsOwner, uniqueDueDate, type FixtureRole, type FixtureUser } from "./fixtures";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

/**
 * Smoke test: EVERY role signs in and opens EVERY page it might reach.
 * For each page it fails on
 *   - an uncaught JavaScript error or a console error (hydration mismatches,
 *     crashes in a component),
 *   - any 5xx from the API or the web server,
 *   - the app's error screens ("Something went wrong" / "Page not available"
 *     where the page should exist),
 * and for pages a role must NOT see, it checks the role is sent elsewhere.
 *
 * This is the net for "a bug nobody knew about": it walks the whole app the
 * way each kind of user would, on every run.
 */

type Visit = { path: string; allowed: boolean };

let orderId = "";
let designer: FixtureUser;
let master: FixtureUser;
const users: Partial<Record<FixtureRole, FixtureUser>> = {};

test.beforeAll(async () => {
  const ownerToken = await loginAsOwner();
  designer = await createFixtureStaff(ownerToken, "designer", "Smoke Designer");
  master = await createFixtureStaff(ownerToken, "master_tailor", "Smoke Master");
  users.designer = designer;
  users.master_tailor = master;
  users.accountant = await createFixtureStaff(ownerToken, "accountant", "Smoke Accountant");
  users.production_manager = await createFixtureStaff(ownerToken, "production_manager", "Smoke PM");
  users.worker = await createFixtureStaff(ownerToken, "worker", "Smoke Worker");
  const { order } = await api<{ order: { id: string } }>(ownerToken, "/orders", {
    method: "POST",
    body: JSON.stringify({
      customerName: `Smoke Customer ${Date.now()}`,
      phone: "9123456709",
      billNumber: `SMOKE-${Date.now()}`,
      dueDate: uniqueDueDate(),
      designerId: designer.id,
      masterTailorId: master.id,
      productCategory: "mens_shirt",
      orderDetails: "Smoke-test order",
      totalAmount: "1000.00",
      productionStatus: "design_pending",
    }),
  });
  orderId = order.id;
});

function pagesFor(role: FixtureRole | "owner"): Visit[] {
  const owner = role === "owner";
  const financial = owner || role === "accountant";
  const today = new Date();
  const from = `${today.getFullYear()}-01-01`;
  const to = `${today.getFullYear()}-12-31`;
  if (role === "worker") {
    return [
      { path: "/scan", allowed: true },
      { path: "/orders", allowed: false }, // workers land on /scan
      { path: `/orders/${orderId}`, allowed: true }, // reached by scanning an order's QR
    ];
  }
  return [
    { path: "/orders", allowed: true },
    { path: `/orders/${orderId}`, allowed: true },
    { path: "/orders/bucket/active", allowed: true },
    { path: "/orders/bucket/overdue", allowed: true },
    { path: "/orders/new", allowed: owner || role === "designer" || role === "production_manager" },
    { path: `/orders/${orderId}/label`, allowed: true },
    { path: "/revenue", allowed: financial },
    { path: `/revenue/print?from=${from}&to=${to}`, allowed: financial },
    { path: "/reports", allowed: owner },
    { path: "/reports/team", allowed: owner },
    { path: "/reports/staff", allowed: owner },
    { path: "/reports/activity", allowed: owner },
    { path: "/admin/users", allowed: owner },
  ];
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@needleeye.app").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function walk(page: Page, role: FixtureRole | "owner") {
  const problems: string[] = [];
  let current = "";
  page.on("pageerror", (e) => problems.push(`${current}: uncaught error: ${e.message}`));
  page.on("console", (m) => {
    // A deliberate 401/403/404 from the API is logged by the browser as a failed
    // resource -- those are expected for restricted pages, not bugs.
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of (401|403|404)/.test(m.text())) {
      problems.push(`${current}: console error: ${m.text().slice(0, 200)}`);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 500) problems.push(`${current}: ${r.status()} from ${r.url()}`);
  });

  for (const visit of pagesFor(role)) {
    current = `${role} ${visit.path}`;
    await page.goto(visit.path);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(400);
    const url = new URL(page.url()).pathname;
    const wanted = visit.path.split("?")[0]!;
    if (visit.allowed) {
      expect.soft(url, `${current} should open`).toBe(wanted);
      await expect.soft(page.getByText("Something went wrong"), `${current} shows the error screen`).toHaveCount(0);
      await expect.soft(page.getByText("Page not available"), `${current} shows not-found`).toHaveCount(0);
      // Removed on request (25 Sep 2026): no "not assigned to you" notice on an order someone else owns.
      await expect.soft(page.getByText(/assigned to you/), `${current} shows the not-assigned notice`).toHaveCount(0);
    } else {
      expect.soft(url, `${current} should be refused (redirected)`).not.toBe(wanted);
    }
  }
  expect(problems, problems.join("\n")).toEqual([]);
}

test("owner: every page opens cleanly", async ({ page }) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await walk(page, "owner");
});

for (const role of ["designer", "master_tailor", "accountant", "production_manager", "worker"] as const) {
  test(`${role}: allowed pages open cleanly, the rest are refused`, async ({ page }) => {
    const u = users[role]!;
    await signIn(page, u.email, u.password);
    await walk(page, role);
  });
}

test("phone size: the main pages render without errors", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  for (const path of ["/orders", `/orders/${orderId}`, "/orders/new", "/reports/team", "/revenue"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    // Nothing may overflow sideways on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect.soft(overflow, `${path} scrolls sideways on a phone`).toBeLessThanOrEqual(1);
  }
  expect(problems).toEqual([]);
  await ctx.close();
});
