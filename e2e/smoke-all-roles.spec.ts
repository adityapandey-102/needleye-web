import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { api, createFixtureStaff, loginAsOwner, uniqueDueDate, type FixtureRole, type FixtureUser } from "./fixtures";
import { toDateInputValue } from "../lib/domain/utils/date";

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
  // The revenue statement takes calendar months (YYYY-MM), up to this month.
  const thisMonth = toDateInputValue(new Date()).slice(0, 7);
  const from = `${thisMonth.slice(0, 4)}-01`;
  const to = thisMonth;
  if (role === "worker") {
    return [
      { path: "/scan", allowed: true },
      { path: "/orders", allowed: false }, // workers land on /scan
      { path: `/orders/${orderId}`, allowed: true }, // reached by scanning an order's QR
      { path: "/leads", allowed: false },
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
    { path: "/reports?view=team", allowed: owner },
    { path: "/reports?view=staff", allowed: owner },
    { path: "/reports?view=activity", allowed: owner },
    { path: "/admin/users", allowed: owner },
    // Leads: the owner (every lead) and designers (their own); /leads/new is the owner's alone.
    { path: "/leads", allowed: owner || role === "designer" },
    { path: "/leads/new", allowed: owner },
    // The public enquiry form opens for anyone, signed in or not.
    { path: "/enquiry", allowed: true },
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

// Each walk opens about ten pages; the dev server compiles a page on its first visit.
const WALK_TIMEOUT_MS = 60_000;

test("owner: every page opens cleanly", async ({ page }) => {
  test.setTimeout(WALK_TIMEOUT_MS);
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await walk(page, "owner");
});

for (const role of ["designer", "master_tailor", "accountant", "production_manager", "worker"] as const) {
  test(`${role}: allowed pages open cleanly, the rest are refused`, async ({ page }) => {
    test.setTimeout(WALK_TIMEOUT_MS);
    const u = users[role]!;
    await signIn(page, u.email, u.password);
    await walk(page, role);
  });
}

// Phone, tablet upright, tablet sideways (no sidebar below 1280 px). One sign-in, reused --
// the local API's sign-in rate limit counts every attempt in the run.
test("phone and tablet sizes: the main pages render without errors or sideways scrolling", async ({ browser }) => {
  test.setTimeout(3 * WALK_TIMEOUT_MS);
  let session: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
  const problems: string[] = [];
  for (const { width, height } of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 1024, hasTouch: width < 1024, storageState: session });
    const page = await ctx.newPage();
    if (!session) {
      await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
      session = await ctx.storageState();
    }
    page.on("pageerror", (e) => problems.push(`${width} px: ${e.message}`));
    for (const path of [
      "/orders",
      `/orders/${orderId}`,
      "/orders/new",
      "/orders/pending-payments",
      "/reports?view=team",
      "/reports?view=staff",
      "/reports?view=activity",
      "/revenue",
      "/leads",
      "/leads/new",
      "/admin/users",
      "/enquiry",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      // Nothing may overflow sideways: wide tables scroll inside their card, or turn into cards.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect.soft(overflow, `${path} scrolls sideways at ${width} px`).toBeLessThanOrEqual(1);
    }
    await ctx.close();
  }
  expect(problems).toEqual([]);
});
