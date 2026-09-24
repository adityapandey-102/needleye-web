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
 * Batch E -- the owner's Reports: the Working/Idle table, the lazily loaded
 * daily activity, the moved Staff Report (and its old address redirecting),
 * and that no one else can open it.
 */
test.describe.serial("owner reports", () => {
  test("owner: the Reports home shows three report cards, and each opens", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.getByRole("link", { name: "Reports" }).first().click();
    await expect(page).toHaveURL(/\/reports$/);
    for (const card of ["Check team status", "Check staff report", "Check daily activity"]) {
      await expect(page.getByRole("link", { name: new RegExp(card) })).toBeVisible();
    }

    // Team status: one debounced, server-side search request per pause -- not one per keystroke.
    await page.getByRole("link", { name: /Check team status/ }).click();
    await expect(page).toHaveURL(/\/reports\/team$/);
    await expect(page.getByRole("button", { name: /^Working/ })).toBeVisible();
    const searches: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/reports/staff-activity?") && r.url().includes("q=")) searches.push(r.url());
    });
    await page.getByLabel("Search staff by name").pressSequentially("zzqq", { delay: 40 });
    await expect(page.getByText("No staff match these filters.")).toBeVisible();
    expect(searches).toHaveLength(1);
    expect(searches[0]).toContain("q=zzqq");

    // Daily activity: days are closed until opened; opening Today loads it.
    await page.goto("/reports/activity");
    const today = page.getByRole("button", { name: /^Today/ });
    await expect(today).toHaveAttribute("aria-expanded", "false");
    const loaded = page.waitForResponse((r) => r.url().includes("/reports/activity?") && r.status() === 200);
    await today.click();
    await loaded;
    await expect(page.getByText("Signed in").first()).toBeVisible();

    // Staff report: pick a team, then the paged, searchable person list.
    await page.getByRole("link", { name: "Reports" }).first().click();
    await page.getByRole("link", { name: /Check staff report/ }).click();
    await expect(page).toHaveURL(/\/reports\/staff$/);
    await page.getByRole("button", { name: /Designers/ }).click();
    await expect(page.getByLabel("Search designers by name")).toBeVisible();
    await expect(page.getByRole("button", { name: /View report/ }).first()).toBeVisible();
    await expect(page.getByText(/^Showing 1–\d+ of \d+$/)).toBeVisible();
  });

  test("the old /orders/staff-report address redirects", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto("/orders/staff-report");
    await expect(page).toHaveURL(/\/reports\/staff$/);
  });

  test("a designer can't open Reports and doesn't see it in the menu", async ({ page }) => {
    const designer = await createFixtureStaff(await loginAsOwner(), "designer", "Reports Designer");
    await signIn(page, designer.email, designer.password);
    await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/orders/);
  });
});
