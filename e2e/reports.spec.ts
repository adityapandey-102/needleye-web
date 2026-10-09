import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createFixtureStaff, loginAsOwner } from "./fixtures";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@needleeye.app").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * The owner's Reports: one page with three tabs (Team status, Staff report,
 * Daily activity), the open one in the URL, and each loading only when it's
 * opened. Also: the debounced Working/Idle search, the lazily loaded daily
 * activity, the staff report's person list, the old addresses redirecting,
 * and that no one else can open it.
 */
test.describe.serial("owner reports", () => {
  test("owner: Reports has three tabs, each loading only when opened", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    const reportCalls: string[] = [];
    page.on("request", (r) => {
      if (/\/reports\/(staff-activity|activity)/.test(r.url())) reportCalls.push(r.url());
    });

    await page.getByRole("link", { name: "Reports" }).first().click();
    await expect(page).toHaveURL(/\/reports$/);
    for (const tab of ["Team status", "Staff report", "Daily activity"]) {
      await expect(page.getByRole("tab", { name: new RegExp(tab) })).toBeVisible();
    }

    // Team status is the default -- and the only report that loads.
    await expect(page.getByRole("tab", { name: /Team status/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: /^Working/ })).toBeVisible();
    expect(reportCalls.some((u) => u.includes("/reports/activity"))).toBe(false);

    // One debounced, server-side search request per pause -- not one per keystroke.
    const searches: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/reports/staff-activity?") && r.url().includes("q=")) searches.push(r.url());
    });
    await page.getByLabel("Search staff by name").pressSequentially("zzqq", { delay: 40 });
    await expect(page.getByText("No staff match these filters.")).toBeVisible();
    expect(searches).toHaveLength(1);
    expect(searches[0]).toContain("q=zzqq");

    // Daily activity: the tab puts its view in the URL and loads only the list of days; the days
    // are closed until opened; opening Today loads its Orders tab (with every tab's count); each
    // other tab loads its own page when chosen (ADR 0008 categories).
    const days = page.waitForResponse((r) => r.url().includes("/reports/activity-days") && r.status() === 200);
    await page.getByRole("tab", { name: /Daily activity/ }).click();
    await expect(page).toHaveURL(/\/reports\?view=activity$/);
    await days;
    const today = page.getByRole("button", { name: /^Today/ });
    await expect(today).toHaveAttribute("aria-expanded", "false");
    expect(reportCalls.some((u) => u.includes("/reports/activity?"))).toBe(false);
    const loaded = page.waitForResponse((r) => r.url().includes("/reports/activity?") && r.url().includes("category=orders") && r.status() === 200);
    await today.click();
    await loaded;
    await expect(page.getByRole("tab", { name: /^Orders/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/^Created order ORD-/).first()).toBeVisible(); // earlier suites booked orders today
    const accounts = page.waitForResponse((r) => r.url().includes("category=accounts") && r.status() === 200);
    await page.getByRole("tab", { name: /^Sign-ins & accounts/ }).click();
    await accounts;
    await expect(page.getByText("Signed in").first()).toBeVisible();

    // The Back button returns to the previous report.
    await page.goBack();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("tab", { name: /Team status/ })).toHaveAttribute("aria-selected", "true");

    // Staff report: nothing loads until a team is chosen; then the paged, searchable person list.
    await page.getByRole("tab", { name: /Staff report/ }).click();
    await expect(page).toHaveURL(/\/reports\?view=staff$/);
    const before = reportCalls.length;
    await page.getByRole("button", { name: /Designers/ }).click();
    await expect(page.getByLabel("Search designers by name")).toBeVisible();
    await expect(page.getByRole("button", { name: /View report/ }).first()).toBeVisible();
    await expect(page.getByText(/^Showing 1–\d+ of \d+$/)).toBeVisible();
    expect(reportCalls.slice(before).every((u) => u.includes("role=designer"))).toBe(true);

    // Opening a person loads their month.
    const month = page.waitForResponse((r) => r.url().includes("/orders/staff-report") && r.status() === 200);
    await page.getByRole("button", { name: /View report/ }).first().click();
    await month;
    await expect(page.getByLabel("Month", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /, / }).getByText("Booked")).toBeVisible();
  });

  test("the old report addresses redirect to the matching tab", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    for (const [old, view] of [
      ["/reports/team", "team"],
      ["/reports/staff", "staff"],
      ["/reports/activity", "activity"],
      ["/orders/staff-report", "staff"],
    ]) {
      await page.goto(old);
      await expect(page).toHaveURL(new RegExp(`/reports\\?view=${view}$`));
    }
  });

  test("a designer can't open Reports and doesn't see it in the menu", async ({ page }) => {
    const designer = await createFixtureStaff(await loginAsOwner(), "designer", "Reports Designer");
    await signIn(page, designer.email, designer.password);
    await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
    await page.goto("/reports?view=activity");
    await expect(page).toHaveURL(/\/orders/);
  });
});
