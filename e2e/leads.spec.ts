import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { createFixtureStaff, loginAsOwner, uniqueDueDate, type FixtureUser } from "./fixtures";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

/** Letters only -- the form accepts names, not codes. */
function randomLetters(n: number): string {
  return Array.from({ length: n }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("");
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("you@needleeye.app").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/orders|\/scan/, { timeout: 15_000 });
}

/** The red count on the sidebar's Leads link (empty when there's nothing to show). */
function leadsBadge(page: Page) {
  return page.locator('aside a[href="/leads"] span').filter({ hasText: /^\d+\+?$/ });
}

/**
 * Leads end to end in the browser: a customer's public enquiry -> the owner
 * assigns it -> the designer's badge -> Received -> a comment -> Converted ->
 * the pre-filled order -> the lead shows Converted with its order. Plus the
 * owner's manual lead + discard, and the roles that must not see Leads.
 */
test.describe.serial("leads", () => {
  let ownerToken: string;
  let designer: FixtureUser;
  let master: FixtureUser;
  let owner: Page;
  const customer = `Zoya ${randomLetters(8)}`;
  const designerTag = randomLetters(6); // unique per run, so typing the name finds exactly this designer
  const designerName = `E2E Leads Designer ${designerTag}`;
  const phone = `9${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;

  test.beforeAll(async ({ browser }) => {
    ownerToken = await loginAsOwner();
    designer = await createFixtureStaff(ownerToken, "designer", `Leads Designer ${designerTag}`);
    master = await createFixtureStaff(ownerToken, "master_tailor", "Leads Master");
    owner = await browser.newPage();
    await signIn(owner, OWNER_EMAIL, OWNER_PASSWORD);
  });

  test.afterAll(async () => {
    await owner.close();
  });

  test("a customer sends an enquiry from the public form (no login)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // Each run is its own "visitor", so re-runs never meet the 5-an-hour limit.
    const ip = `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    await page.route("**/public/enquiries", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));

    // The form's clock starts when it receives its token (after the page is interactive), not at navigation.
    const formReady = page.waitForResponse((r) => r.url().includes("/public/enquiry-form") && r.ok());
    await page.goto("/enquiry");
    await formReady;
    await expect(page.getByRole("heading", { name: "Tell us about your outfit" })).toBeVisible();
    await page.getByLabel("Your name").fill(customer);
    await page.getByLabel("Mobile number").fill(`${phone.slice(0, 5)} ${phone.slice(5)}`);
    await page.getByLabel("What would you like?").fill("A bridal lehenga for a March wedding");
    await page.waitForTimeout(3_500); // a person takes longer than 3 seconds; faster submissions are treated as bots
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    await expect(page.getByText(/contact you shortly/)).toBeVisible();
    await ctx.close();
  });

  test("the owner finds it under Leads (not on the orders dashboard) and assigns it", async () => {
    await expect(owner.getByText(customer)).toHaveCount(0); // the orders dashboard shows nothing about leads
    await owner.goto("/leads");
    await expect(owner.getByRole("link", { name: /LEAD-/ }).first()).toBeVisible();
    // The search is debounced: four quick keystrokes send ONE search request, not four.
    const searches: string[] = [];
    owner.on("request", (r) => {
      if (/\/leads\?/.test(r.url()) && r.url().includes("q=")) searches.push(r.url());
    });
    await owner.getByLabel("Search leads").pressSequentially(phone.slice(0, 4), { delay: 40 });
    await owner.waitForTimeout(900);
    expect(searches).toHaveLength(1);
    await owner.getByLabel("Search leads").fill(phone);
    // The search is debounced: wait for the filtered list, then open the row with our customer.
    await expect(owner.getByRole("link", { name: /LEAD-/ })).toHaveCount(1);
    await owner.getByRole("row").filter({ hasText: customer }).getByRole("link", { name: /LEAD-/ }).click();
    await expect(owner.getByRole("heading", { name: customer })).toBeVisible();
    // Assign: type part of the name -- a type-ahead, never a dropdown of the whole team.
    await owner.getByLabel("Assign to a designer").fill(designerTag);
    await owner.getByRole("option", { name: designerName }).click();
    await owner.getByRole("button", { name: "Assign" }).click();
    await expect(owner.getByText("Assigned", { exact: true }).first()).toBeVisible();
    await expect(owner.getByText(designerName).first()).toBeVisible();

    // The Designers table: searched (debounced) and paged by the API; a name filters All leads.
    await owner.goto("/leads");
    const designers = owner.getByRole("region", { name: "Designers" });
    await designers.getByLabel("Search designers").fill(designerTag);
    await expect(designers.getByRole("button", { name: designerName })).toBeVisible();
    await expect(designers.getByRole("row")).toHaveCount(2); // header + this designer
    await designers.getByRole("button", { name: designerName }).click();
    await expect(owner.getByRole("button", { name: `Clear ${designerName}` })).toBeVisible();
    await expect(owner.getByText(customer)).toBeVisible();
  });

  test("the designer sees the badge, receives the lead, comments, converts it into an order", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, designer.email, designer.password);
    await expect(leadsBadge(page)).toHaveText("1");

    await page.goto("/leads");
    await page.getByRole("link", { name: /LEAD-/ }).first().click();
    await expect(page.getByRole("heading", { name: customer })).toBeVisible();
    // No "Converted" before Received.
    await expect(page.getByRole("button", { name: "Converted" })).toHaveCount(0);
    await page.getByRole("button", { name: "Received" }).click();
    await expect(page.getByText("Unattended", { exact: true }).first()).toBeVisible();
    await expect(leadsBadge(page)).toHaveCount(0); // the red count clears

    await page.getByLabel("Add a comment").fill("Called her, visiting Saturday with fabric samples");
    await page.getByRole("button", { name: "Add comment" }).click();
    await expect(page.getByText("Called her, visiting Saturday with fabric samples")).toBeVisible();

    await page.getByRole("button", { name: "Converted" }).click();
    const dialog = page.getByRole("dialog", { name: "Create an order for this lead?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Create order" }).click();

    await expect(page).toHaveURL(/\/orders\/new\?leadId=/);
    await expect(page.getByText(/Creating an order for lead LEAD-/)).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Priya Sharma")).toHaveValue(customer);
    await expect(page.getByPlaceholder("e.g. 9876543210")).toHaveValue(phone);
    await page.getByPlaceholder("e.g. BILL-2024-001").fill(`LEAD-E2E-${Date.now()}`);
    await page.getByLabel("Delivery due date").fill(uniqueDueDate(2060));
    await expect(page.getByText("Available for delivery")).toBeVisible();
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Master")') }).selectOption(master.id);
    await page.getByRole("button", { name: /choose a product category/i }).click();
    const categorySearch = page.getByRole("combobox", { name: "Search categories" });
    await categorySearch.fill("saree");
    await expect(page.getByRole("option", { name: "Saree", exact: true })).toBeVisible();
    await categorySearch.press("Enter");
    await page.locator("select").filter({ has: page.locator('option[value=""]:text("Select Status")') }).selectOption("design_pending");
    await page.getByRole("button", { name: "Create Product Order" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\?pricing=1$/, { timeout: 15_000 });
    const orderUrl = page.url().split("?")[0]!;

    await page.goto("/leads?x=1");
    await page.getByLabel("Filter by stage").selectOption("converted");
    await page.getByRole("link", { name: /LEAD-/ }).first().click();
    await expect(page.getByText("Converted", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: /ORD-/ }).click();
    await expect(page).toHaveURL(orderUrl);
    await ctx.close();
  });

  test("the owner adds a lead by hand, then discards one", async () => {
    await owner.goto("/leads/new");
    const walkIn = `Walk ${randomLetters(6)}`;
    await owner.getByLabel("Name").fill(walkIn);
    await owner.getByLabel("Mobile number").fill(`8${Math.floor(100_000_000 + Math.random() * 899_999_999)}`);
    await owner.getByLabel("Requirement").fill("Saw our window display, wants a kurta set");
    await owner.getByLabel("Where it came from").selectOption("walk_in");
    await owner.getByRole("button", { name: "Add lead" }).click();
    await expect(owner).toHaveURL(/\/leads\/[0-9a-f-]+$/);
    await expect(owner.getByRole("heading", { name: walkIn })).toBeVisible();
    await expect(owner.getByText("Walk-in", { exact: false }).first()).toBeVisible();

    await owner.getByRole("button", { name: "Discard" }).click();
    await owner.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(owner.getByText("Discarded", { exact: true }).first()).toBeVisible();
  });

  test("roles without leads don't see the section", async ({ browser }: { browser: Browser }) => {
    const accountant = await createFixtureStaff(ownerToken, "accountant", "Leads Accountant");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, accountant.email, accountant.password);
    await expect(page.locator('aside a[href="/leads"]')).toHaveCount(0);
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/orders/);
    await ctx.close();
  });
});
