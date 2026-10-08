# Needle Eye Web

Next.js (App Router) + TypeScript + Tailwind frontend for the Needle Eye ERP
(a boutique/tailoring order-management system). Deployed and managed
independently from [needleye-api](https://github.com/REPLACE_ME/needleye-api)
-- **the two repos share no code and have no dependency on each other; they
only talk over HTTP**, each versioned and deployed on its own schedule.

> **Maintainers: keep this file current.** Whenever a change touches
> architecture, routing, env vars, or the dev workflow, update the relevant
> section here in the same change. If the change also touches how this app
> calls needleye-api, update that repo's `openapi.yaml` and README Flow Map
> too -- see its "Keeping this documentation in sync" section.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4 -- organized as a **Modular Monolith**: one deployable app, internally partitioned into modules (`modules/*`) with a consistent internal shape
- **No Supabase SDK anywhere in this repo.** Login, session, password reset/update, and QR login all go through [needleye-api](https://github.com/REPLACE_ME/needleye-api)'s `/auth/*` endpoints -- this app holds no Supabase URL, no Supabase key, and never talks to Supabase directly. See "Authentication" below.
- `lib/domain/` -- this repo's **own** copy of the RBAC capability matrix, order-status vocabulary, and zod validation. `needleye-api` keeps an equivalent copy of its own; neither imports from the other or from a shared package. See "No shared package, on purpose" below.
- All data (orders, users, images, and now auth) goes through [needleye-api](https://github.com/REPLACE_ME/needleye-api) over HTTP -- this app has no other backend dependency

## Prerequisites

- Node.js 20+
- A running instance of [needleye-api](https://github.com/REPLACE_ME/needleye-api) (which brings up the local Supabase stack) -- this app has no backend of its own
- For the full request/response contract of every endpoint this app calls, see needleye-api's Swagger UI at `http://localhost:4000/api-docs` (or its README's Flow Map for sequence diagrams of the auth flows)

## Quick start

```bash
npm install
cp .env.example .env.local
# Defaults assume needleye-api is running locally on its default port and
# this app is on :3000 -- this app never talks to Supabase, so there's no
# Supabase URL/key to configure here.

npm run dev
# ⤷ http://localhost:3000
```

First-time setup: visit `/register` to create the first Owner/Manager
account (self-disabling once one exists). Everyone else is created directly
from `/admin/users` (no email invite -- see "Account creation" below).

## Testing

Testing Pyramid (see `CLAUDE.md`): unit tests on `lib/domain/`'s business
logic are the priority, E2E only for critical workflows.

- **`npm run test:unit`** (Vitest, `lib/**/*.test.ts`, colocated with the
  code under test) -- the capability matrix, the client-side order-status
  permission mirror, currency/date/timeline utilities, and the zod
  validation schemas (order/payment/user). Runs in CI on every push/PR.
- **`npm run test:e2e`** (Playwright, `e2e/`) -- login, create order (incl.
  image upload), search orders, update order, record payment, run against
  the real needleye-api + local Supabase stack, no mocking. Not wired into
  CI (it needs a live backend + database, a heavier dependency than this
  repo's own CI job should take on) -- run it locally before a release. See
  `e2e/README.md`.
- **`npm run check:bundle`** (after `npm run build`) -- first-load JS per page,
  gzipped, against a 300 KB budget (`scripts/bundle-budget.mjs`; `--write`
  refreshes `docs/performance/bundle-budget.md`). The practices this protects,
  and why, are in `docs/engineering-practices.md`.

## Architecture

A **Modular Monolith**: one Next.js app, internally split into
business-capability modules under `modules/`, each with the same internal
shape (`components/`, and where it talks to the API, its own `api/`
module) -- no module is treated as "too small to bother" with that
consistency.

```
app/                       # routing only -- thin pages that compose module components, no business logic
  (auth)/                    # login, register (bootstrap), reset/update password, qr-login -- no sidebar
  (app)/                      # everything behind auth -- sidebar shell (layout.tsx), orders, admin
  auth/callback/page.tsx       # lands here from a password-reset email link -- see "Authentication" below
  proxy.ts                       # Next.js 16's middleware.ts equivalent (renamed upstream) -- session refresh + route guarding
modules/
  auth/
    components/                 # LoginForm (with a show/hide password toggle), RegisterForm, ResetPasswordForm, UpdatePasswordForm
    api/authApi.ts                # every HTTP call the Auth module makes -- login/logout/qrLogin also own writing/clearing the session cookies
  orders/
    components/                 # OrderForm (create+edit; no price -- pricing comes after saving), PricingCard + PricingDialog (Add pricing now? / set / correct with the double-check alert, price history), DeliveryDateField + DeliveryCalendar (due date with delivery-capacity check, full-day dialog, 2-month load calendar), ProductCategoryPicker (catalogue dialog: 47 categories / 6 collections, browse or debounced search), OrdersListClient (search, designer, master, stage, timeline, booking year / month filters -- server-side, page reset on change) + OrdersTable (the one order table: cards on phones and tablets, a table on desktop, StageProgress bars), CustomerLookup (the new-order form's "Fetch customer details": on press only, pick an earlier order with that phone, fill the name), dashboard/ (DashboardOverview: KpiStrip, PipelineCard, DeliveriesCard, MoneyStrip), BucketOrdersClient (focused /orders/bucket/[bucket] view), PendingPaymentsClient (dedicated collections view), OrderDetailView, ImageGallery/ImageUploadGrid, OrderQrCode, CustomerLabel (8.5x2.75in box sticker), PaymentLedger
    hooks/useTeamMembers.ts       # designer/master-tailor lookup, replaces hardcoded name lists
    api/ordersApi.ts               # every HTTP call the Orders module makes (list is paginated -- returns { orders, total, limit, offset }; also stats(), revenue(), staffReport(), ledgerEvents())
  revenue/
    components/RevenueClient.tsx   # owner_manager/accountant financial dashboard (/revenue): LedgerGuide (plain-words guide, text loaded on open) + BooksCheck (nightly check + Verify now) + ThisMonthCards + MonthlyLedger (paged months, range totals, Books column, CSV/PDF) + LedgerActivity audit trail; MonthBooksDialog closes / reopens a month
  reports/                       # owner-only (reports:staff) -- /reports
    components/                 # ReportPageHeader, TeamStatusCard (/reports/team: server-paged Working/Idle), ActivityFeedCard (/reports/activity: 7 days, each loaded when opened, in 5 category tabs), StaffReportClient + StaffPicker + WeeklyThroughputChart (/reports/staff: team -> searchable paged person list -> monthly report + SVG chart; /orders/staff-report redirects)
    requireReportsAccess.ts        # server-side owner-only gate shared by every /reports page
    api/reportsApi.ts              # staffActivity(), activityDays(), activity(day, category, offset) -- the staff report itself stays ordersApi.staffReport()
  payments/
    api/paymentsApi.ts             # every HTTP call the Payments module makes -- mirrors needleye-api's own Payments module
  admin-users/
    components/                 # UserManagementClient (searchable/paginated directory) + UserDetailClient (per-user actions) + LoginQrCard (printable/downloadable Master-Tailor login-QR card) -- owner_manager only
    api/usersApi.ts                # every HTTP call the Admin Users module makes (list paginated + get/reactivate)
components/                  # cross-MODULE only: ui/ primitives (Button, Card, Field, Modal, Pager (shared server-pagination footer), ...), shell/ (Sidebar, AppShell, nav config)
lib/
  hooks/useDebouncedValue.ts   # debounce hook + SEARCH_DEBOUNCE_MS (300 ms) -- EVERY search box uses it (orders, users, team status, staff picker; category picker 200 ms)
  hooks/useMediaQuery.ts       # live CSS media-query match (calendar: 2 months side by side from sm, 1 on a phone)
  domain/                      # this repo's OWN copy of RBAC/order-status/validation -- see below, not a package
    index.ts                     # barrel export of everything below
    constants/, types/, utils/, validation/
  session/                     # this app's OWN session handling -- cookies holding needleye-api-issued tokens, NOT Supabase's session mechanism
    constants.ts                  # cookie names/max-age (ne_at readable, ne_rt httpOnly)
    jwt.ts                          # local (unverified) expiry check, decoded from the access token itself
    client.ts                       # browser: read the access token only (ne_rt is httpOnly, unreadable by JS)
    server.ts                       # Server Component/Route Handler: read tokens + SET cookies (refresh httpOnly) via next/headers
    api-proxy.ts                     # server->needleye-api /auth/* helper used by the session route handlers (forwards client IP)
    proxy.ts                          # the session-refresh logic proxy.ts (root) delegates to
  api/                          # generic apiFetch/apiUpload wrappers (attach the access token, refresh via /api/session/refresh if expired) -- modules/*/api/ build on these, components never call these directly
app/api/session/                # Route Handlers that own the session cookies: login, qr-login, exchange-code, refresh, logout, establish (the only code that can set the httpOnly refresh cookie)
```

`app/` stays thin on purpose -- a page's job is data-fetching (Server
Components calling the API) plus capability checks (redirects), and it
renders a component from `modules/`. Business logic and API calls for a
module live inside that module's folder, not scattered across pages.

### Design system & branding

The whole visual language lives in **`app/globals.css`** as CSS custom
properties exposed to Tailwind v4 via `@theme inline` -- one place to retune
the brand. The palette is taken from the boutique's logo: **deep burgundy ink
on warm sand/taupe**, with a muted **antique-gold** accent (the "gold thread"
signature) used sparingly for active states, hairlines, focus rings, and the
brand mark. The file also defines the motion system (`animate-rise`,
`animate-fade-in`, `animate-scale-in`, the `.skeleton` shimmer) with a
`prefers-reduced-motion` guard, and material utilities (`gradient-primary`,
`gradient-gold`, `card-accent-top`). Shared primitives in `components/ui/`
(Button, Card, StatusPill, inputs) consume these tokens, so restyling is
centralized -- pages don't hardcode colours.

**Type:** *Playfair Display* (semibold) for page titles, card titles and
names; *Plus Jakarta Sans* (high legibility) for everything else. Muted and
secondary text colours meet WCAG AA contrast on the sand background (muted
4.7:1, secondary 8.8:1). **Numbers never use the serif**: serif digits and
commas are hard to read at a glance.
Every headline figure (counts, money, dates, KPIs) uses the `.figure` class:
sans, semibold, tabular. The gold dashed "tacking stitch" (`.stitch-rule`,
and the rule under `.page-title`) is the one signature flourish.

**Motion** (all in `globals.css`, all switched off by `prefers-reduced-motion`):
- `.stagger-in` makes children rise in one after another (dashboard cells,
  card columns, ledger entries).
- `.rows-in` fades a new page of table rows in.
- `.grow-x` fills progress and share bars from the left.
- `.current-pulse` makes the current production stage breathe.
- `.lift` gives clickable cards a slight hover rise.
- Buttons press in on click.
- `components/ui/CountUp.tsx` counts figures up on first view and always
  settles on the exact value (for money, the caller passes the formatted
  string as `final`, so the motion can never show a wrong amount).

**Cards:** the `CardHeader` icon sits in a brand-tinted badge (burgundy, or gold
for dates and timelines): one colour family, not a rainbow. Order-page
key/value rows (`InfoRow`) carry an icon and hairline dividers. Long text sits
in a soft inset panel, and empty notes show muted and italic. The order page
hero and the dashboard money band sit on the brand burgundy with gold accents.

**Responsiveness is mobile/tablet-first** (most staff are on phones/tablets),
checked at 360 / 768 / 1024 / 1280 px:
- **The sidebar is fixed only from `xl` (1280 px).** Below that -- phones and
  tablets, upright or sideways -- it is a drawer behind a glass header that
  carries the brand. So every desktop (`lg:`) layout gets at least ~940 px:
  1024 px without the sidebar, or 1280 px with it.
- **No list scrolls sideways on a phone or tablet.** Lists are cards below
  `lg` -- one column on phones, two from `md` (`CARD_GRID_CELL` in
  `components/ui/Card.tsx` draws the hairlines) -- and a table from `lg`:
  orders (`OrdersTable`), pending payments, leads, the monthly ledger; Ledger
  Activity switches at `md`. A table that is still wider than its card
  scrolls inside it (`relative overflow-x-auto`: `relative`, or its
  `sr-only` labels widen the page).
- **Headers wrap instead of squeezing:** `CardHeader` moves its action to its
  own line when it doesn't fit beside the title, and `wideAction` gives
  segmented tabs that whole line on phones. A page header's buttons use
  `.page-actions` (in a row beside the title; full width and stacked on
  phones). Filter bars stack.
- The e2e smoke suite opens the main pages at 390, 768 and 1024 px and fails if
  any of them scrolls sideways.

**Brand mark:** `components/shell/BrandMark.tsx` renders the logo from
**`public/Needleye-logo.png`**; if it's missing (or 404s) it degrades to a
burgundy "N" monogram, so the UI is never broken. The displayed wordmark is
**"Needleye · by Sakina Ahmed"**.

**Icons:** `components/ui/Icon.tsx` wraps **Lucide** (`lucide-react`), a
professional, consistent line-icon family. Only the ~55 icons named in its
`ICONS` map are imported, so the rest is tree-shaken (the whole set costs about
4 KB). Icons render in `currentColor`. No emoji or text glyphs are used as
icons in the UI (Yes/No options, buttons, empty and error states all use
Lucide). Because the app historically labelled things with
emoji, `Icon` also resolves an **emoji → its line icon** via an internal map,
so `CardHeader`, the sidebar nav, and the stat cards upgrade every icon at once
just by passing their existing emoji string; an unmapped emoji falls back to
rendering itself. Use `<Icon name="…" />` directly in new code, `emoji=` only
at the compatibility seams.

**Every module that talks to the backend has its own `api/*.ts` file**
(`ordersApi`, `authApi`, `usersApi`) wrapping the generic `lib/api/client.ts`
fetch helpers into named, typed methods. Components never call `apiFetch`
directly -- this is the frontend's equivalent of the backend's repository
layer: the one place HTTP calls for a given module are made, consistently
applied even to the smaller modules (Auth has exactly two calls; it still
gets its own `api/` file rather than inlining them, because consistency
across the codebase matters more than trimming one small file).

### Authentication

Every auth operation is a call to needleye-api, never to Supabase. Two
cookies hold the session: **`ne_at`** (access token) is a normal cookie the
browser reads to attach `Authorization: Bearer <token>` on its direct API
calls; **`ne_rt`** (refresh token) is **httpOnly** -- browser JS can neither
read nor write it, so an XSS can't steal the long-lived refresh token. Only
server code ever sees it.

Because JS can't set an httpOnly cookie, **everything that mints, rotates, or
clears a session goes through same-origin Next.js Route Handlers under
`app/api/session/*`**, which run server-side, call needleye-api, and set the
cookies (`lib/session/server.ts` -- access non-httpOnly, refresh httpOnly):

- **Login / QR login / code exchange** -- `authApi.login`/`qrLogin`/`exchangeCode`
  POST to `/api/session/{login,qr-login,exchange-code}`. Those handlers proxy
  to needleye-api's `/auth/*` server-side (forwarding the client IP as
  `X-Forwarded-For` so the API's per-IP auth rate limit still keys on the real
  user), set both cookies, and return just the profile -- **tokens never come
  back to the browser in a response body**.
- **Logout** -- `authApi.logout` → `/api/session/logout` revokes server-side and clears both cookies.
- **Refresh** -- `lib/api/client.ts` (browser), on a stale/missing access
  token, POSTs to `/api/session/refresh`, which reads the httpOnly `ne_rt`
  server-side, rotates both cookies, and returns the new access token.
  `lib/api/server.ts` (Server Components) and **`proxy.ts`** (root, at the
  edge) can read `ne_rt` directly server-side and refresh the same way;
  `proxy.ts` also redirects to `/login` when there's no valid session.
- **`app/auth/callback/page.tsx`** -- where a password-reset email link lands.
  This project's Supabase config uses the *implicit* flow, so GoTrue puts the
  tokens in the URL fragment (`#access_token=...&refresh_token=...`), which
  only browser JS can read. The page reads them and immediately hands them to
  `/api/session/establish` (`authApi.establish`) so the refresh token is
  stored httpOnly rather than in a JS-readable cookie. A `?code=` PKCE param
  is handled via `/api/session/exchange-code`.

Note: the proxy's route matcher excludes `/api/*` -- the session route
handlers own the cookies themselves and must not be intercepted/redirected as
if they were protected pages.

This API is stateless on its own side (see needleye-api's README) -- all of
the above session-cookie machinery is this app's concern, not something the
API dictates or participates in beyond verifying whatever bearer token it's
handed on each request.

### User management (dashboard + per-user detail)

Owner/Manager only, `/admin/users`. `UserManagementClient.tsx` is a
searchable, server-paginated staff directory (via `usersApi.list`'s
`{ users, total, limit, offset }` envelope -- it never loads every account at
once); each row links to `/admin/users/[userId]`, where all account actions
now live (`UserDetailClient.tsx`):

- **Create account** (on the directory): name/email/role only -- no password
  field. `usersApi.create` calls `POST /users`, which returns a
  server-generated password shown once in a dismissible overlay
  (`CredentialRevealOverlay`). Neither this app nor needleye-api can show it
  again afterward, only regenerate it.
- **Generate/regenerate password**: shown for **every** role (the earlier
  "self-managed roles can't regenerate" restriction was removed in ADR 0005) --
  the API accepts a regenerate for any account.
- **QR login card** (`designer`, `master_tailor`, `production_manager`,
  `worker` -- never `owner_manager` or `accountant`, `LoginQrCard.tsx`): the
  "Generate/Regenerate QR login" action calls `usersApi.generateQrToken`, then
  the one-time reveal overlay renders the returned `loginUrl` as an
  **ID-card-style login card** (company branding, name, role, the login QR)
  that can be **saved as a PNG or printed** -- both composed from the same
  offscreen canvas. This is intentionally the *only* card export and it is
  limited to those four roles (`QR_LOGIN_ROLES` in `UserDetailClient.tsx`,
  mirroring the API rule that actually enforces it): there is no separate
  staff-ID card, and the QR always encodes the login URL, never a plain
  identifier. The card is an extra way in -- password login is unaffected.
  Regenerating (or deactivating the account) invalidates it immediately.
- **Copy password**: the one-time password reveal has a Copy button
  (`navigator.clipboard`) since it's shown only once.
- **Activate/deactivate**: deactivation (`usersApi.deactivate`) is now
  reversible from the same page via `usersApi.reactivate`; self-deactivation
  is disabled in the UI and rejected by the API.

### Order QR

Each order's detail page (`modules/orders/components/OrderQrCode.tsx`)
renders a QR encoding `${NEXT_PUBLIC_WEB_APP_URL}/orders/{id}` -- literally
just that order's own URL. Nothing role-specific happens here: scanning it
is exactly like navigating there directly, so an unauthenticated scanner
hits the normal `/login` redirect, and an authenticated one sees exactly
what their role is allowed to see (payment fields already stripped
server-side for `master_tailor`, not just hidden in this UI -- see
needleye-api's README).

### Payment ledger

`modules/orders/components/PaymentLedger.tsx` (rendered by `OrderDetailView`
only when `canSeePayment` is true -- absent entirely for `master_tailor`,
same pattern as the payment summary above it) is self-fetching, like
`OrdersListClient`/`UserManagementClient`: on mount and after every
add/remove it fetches the ledger AND the order together
(`paymentsApi.list` + `ordersApi.get`), so the total / paid / outstanding /
derived status it shows are always mutually consistent and fresh -- never a
stale server-component prop (the order's `orderTotal`/`paymentStatus`/
`nextPaymentDate` props only seed the first paint). This is what keeps the
payment-status summary correct after an order edit + settling payment.
`canManage` is computed in
`app/(app)/orders/[orderId]/page.tsx` from the `payments:manage` capability
+ the assigned-designer check -- the same pattern already used for
`canEdit`; `canCorrect` (Remove) from `payments:correct` -- owner and
accountant only, and hidden once the order is delivered (payments are then
final) or for a payment dated in a closed month (`monthClosed`, shown as
"Month closed" -- needleye-api ADR 0008 phase 5). An unpriced order shows "Set the order's price first" instead of the
record form. Add/remove are real API calls (`paymentsApi.add`/`.remove`)
against `needleye-api`'s ledger endpoints, which enforce the actual RBAC
scoping -- these props only control whether the controls render, not whether
the write is allowed.

### Pricing (needleye-api ADR 0008)

The order form has **no price**. Saving a new order lands on
`/orders/[id]?pricing=1`, where `PricingCard` asks **"Add pricing now?"** →
`PricingDialog` (the total) → **"Record a payment?"** (opens the ledger's record
form). Typing a total shows an animated **"Please be double sure this total is
correct: ₹X (amount in words)"** alert (`amountInWords`, Indian lakh/crore;
`.price-alert` in `globals.css`, off under reduced motion) with the rule: after
the first price, the Owner or Accountant can **correct** it, up or down, with a
reason -- never below what's collected (fix the payment first) and not while the
order's booking month is closed in the books. Delivery locks nothing (owner,
2026-10-09). The card then shows the total, **Correct price** for the Owner and
Accountant, and the price history (older raise / discount rows read as
corrections). The dialogs render through
`components/ui/Portal` -- inside the animated card column a fixed overlay was
trapped under the next card. Delivered without a price opens **"Set the order
total first"** (`PRICE_REQUIRED_DIALOG`) from the status menu, the Kanban board
and the scan prompt (`order.priceSet` is sent to every role); the API refuses it
anyway (`ORDER_PRICE_REQUIRED`).

**Payment status is derived, never chosen.** The order form has no
payment-status picker: `payment_status` is computed by the API from the
ledger (unpaid → advance_paid → fully_paid), so it can't drift. Instead:
- **Advance after pricing** -- the pricing flow's last step opens the ledger's
  record form for the advance (there is no advance on the order form any more).
- **Rescheduling on record** -- when recording a payment that won't settle the
  balance, `PaymentLedger` asks for the next payment date and passes it to the
  API, which reschedules the order (fixing a stale "Due Today" after a same-day
  payment) and `router.refresh()`es so the summary props update.
- **Due tracking + overpaid guard (both directions)** --
  `lib/domain/utils/paymentDue.ts` derives Upcoming / Due&nbsp;Today / Overdue
  (with a day count) from `nextPaymentDate` + outstanding. The record form
  blocks a payment exceeding the outstanding balance, and the correction dialog
  blocks going below what's already been collected -- so the ledger can never
  exceed the total (no "overpaid" order, which keeps collected revenue
  accurate). The API enforces both for real (`PAYMENT_EXCEEDS_TOTAL` /
  `ORDER_TOTAL_BELOW_PAID`); `derivePaymentStatus` mirrors the status rule
  (incl. `not_priced`) for immediate UI feedback.

### Dashboard navigation & revenue reporting

The orders dashboard (`/orders`, `modules/orders/components/dashboard/`) is
`DashboardOverview` -- one `GET /orders/stats` (row-scoped) -- above the orders
list:
- **At a glance** (`KpiStrip`): Active orders, Due in 3 days, Overdue, Ready
  for delivery, Delivered this month -- one light board with the gold top line,
  each figure opening its list.
- **Production pipeline** (`PipelineCard`): the API's `pipeline` counts as a
  numbered stepper (Design → Received → On the floor → Final checks → Ready),
  each with what it holds, its count and its share on one scale; the step
  holding the most orders is drawn in the brand red ("Most orders").
- **Deliveries · next 2 months** (`DeliveriesCard`, roles that can book): orders
  due per day from `GET /orders/delivery-load` against the capacity line, in the
  brand's tones (light rose, wine when filling, oxblood when full, gold for
  today). The 60 days scroll sideways inside the card, two weeks a screen (‹ ›
  too), and **only what's on screen is fetched**: 14-day chunks load as they
  scroll into view (IntersectionObserver, stale answers dropped, Retry on a
  failed chunk). Below: This month / This week / Next week / Full days, from one
  small request (today to the end of this month, at least two weeks) that also
  serves the first screen. Helpers in `lib/domain/utils/dashboard.ts`.
- **Payments** (`MoneyStrip`, roles that see payments): Collected and
  Outstanding (Owner, Accountant) with the share of the booked value
  collected, Pending payments, Price not set.

The chart maths is in `lib/domain/utils/dashboard.ts` (unit-tested); the
greeting uses the shop's clock (`SHOP_TIME_ZONE`), not the server's. Every
figure opens a **dedicated focused page**: `/orders/bucket/[bucket]`
(`BucketOrdersClient`) or `/orders/pending-payments` (`PendingPaymentsClient`,
with All outstanding / Overdue / Upcoming and a paid bar per order). Both have a
search box (`OrderSearchBar`: customer, bill number or order ID; debounced,
searched by the server, back to page 1). Every pipeline step opens its own list
(`pipeline_design` / `_received` / `_production` / `_checks`, and `ready`), and the
Owner's board starts with **All orders** (every order ever booked, `/orders/bucket/all`). All
order lists share `OrdersTable` (order, customer, team, stage with its
`StageProgress` bar, due date and timeline, payment; a row opens the order).
Payment figures are absent for `master_tailor`, mirroring the API's field
stripping.

**The hero band** (`.hero-band` in `globals.css`): the brand red of the main
buttons (`--gradient-primary`) with a gold outline and top line, for the
numbers that matter most -- the dashboard's Payments, the Revenue page's
month, an order's header (`OrderDetailView`, with a `ProgressRing` of how much
is paid). On it, meaning uses the brand's tones (gold, apricot, rose -- no
green). Navigation that looks like a button is `ButtonLink` (one element; a
button inside a link is invalid HTML). On phones the order header is a tidy
stack (number and category with a small paid ring, the name, Bill no. / Booked /
Due as a list, the pills, then a 2x2 of facts).

**Green** is one solid colour, `#41a85f` (`--color-success`): green badges are
solid with white text (`StatusPill` tone `green`), never a pale mint; the soft
`--color-success-bg` tint is only for large panels. The sidebar lists only
screens that exist (no "soon" placeholders). The previous design is tagged
`design-classic` -- `git checkout design-classic -- <path>` restores a screen.

`/revenue` (`modules/revenue/RevenueClient.tsx`, owner_manager/accountant only,
gated by `reports:financial`) reads the API's daily ledger (needleye-api ADR
0008, phase 4) -- always **calendar months**:
- **Revenue & Ledger guide** (`LedgerGuide`, top of the page): closed until
  opened; then eight short sections in plain words for the Owner and the
  Accountant -- the four numbers (with a worked example), prices, payments,
  fixing a payment mistake, closing a month (and a monthly routine), the books
  check, exports and history, quick answers. The text
  (`LedgerGuideContent`) is loaded with `next/dynamic` only when the guide is
  opened, so the page doesn't carry it. It states the rules the API enforces
  (needleye-api ADR 0008) -- change it whenever a rule changes.
- **This month** (`ThisMonthCards`): Total booked (orders booked this month, and
  how many aren't priced yet), Paid so far (on those orders), Outstanding, and
  Cash collected (all money received this month, any order).
- **Monthly ledger** (`MonthlyLedger`): any range from 2020 (From / To month,
  plus This year / Last 12 months / Since 2020), newest month first, **12 a page
  from the API** with the shared `Pager`; the range's totals come from the API,
  not from summing the visible page. **Export CSV** fetches every month of the
  range (`ledgerMonthsToCsv`, unit-tested) and **Export PDF** opens the
  printable statement (`/revenue/print?from=YYYY-MM&to=YYYY-MM`).
- **Books** (ADR 0008 phase 5): the **books check** bar (`BooksCheck`) shows
  the latest check of the register against every order and payment -- run by
  the database every night at 2:00 AM, or now with **Verify now** -- and what
  didn't match, if anything; it warns when the nightly check is over 26 hours
  old. The month table's **Books** column reads *Closed* (a finished month
  whose books are closed), *Close…* (finished, open) or *Running* (this month).
  Both open `MonthBooksDialog`, loaded on demand: the month's figures now, the
  closing record beside them, every close and reopen, and the action the role
  allows -- Close (Owner, Accountant: `ledger:close`) or Reopen with a reason
  (Owner: `ledger:reopen`). The CSV gains a Books column (`booksLabel`) and the
  PDF marks closed months.

Below the history, **Ledger Activity** (`LedgerActivity.tsx`) is the payment
audit trail: who recorded, edited, or removed a payment, when, on which order,
and what changed (a before→after for edits, a signed amount for a
record/removal), with the payment's paid-on date (also a column in the CSV). Cascading **year → month → week** filters narrow the window
and the table pages through the matches (newest first), backed by
`GET /orders/ledger-events`. Same `reports:financial` gate as the rest of the
page.

In **Month** or **Week** view, Ledger Activity has its own **Export CSV** and
**Export PDF**: every row of that period (not just the visible page) with the
table's columns plus a totals block, from `GET /orders/ledger-events/export`
(which refuses more than 31 days -- there is no yearly export; the buttons hide
in Year view). The CSV is built in the browser by `ledgerEventsToCsv`
(`lib/domain/utils/ledgerExport.ts`, unit-tested; formula-looking text is
defused for Excel); the PDF is the print page `/revenue/ledger-print`. Times
are printed in the shop's timezone, which the export response carries.

### Print: order sheet & customer label

Two print paths off an order's detail page: the existing full-order print
(`window.print()` with app chrome `print:hidden`), and the **package-box
sticker** (`CustomerLabel.tsx`, `/orders/[orderId]/label`) -- an
**8.5in x 2.75in** label styled after the boutique's existing printed sticker
(antique-gold band, brand monogram, rule-underlined fields, ticked boxes for
hand/machine/purchase), carrying a scannable QR plus customer/order-number/
category/due-date/bill-number/order-details plus the assigned **designer and
master tailor** names (the customer's phone is deliberately omitted from the
package label). `@page { size: 8.5in 2.75in; margin: 0 }` makes Print emit
exactly one sticker, and `print-color-adjust: exact` keeps the gold band from
being dropped when "Background graphics" is unticked. Both live on their own routes so printing emits just the
intended sheet.

### Reference images: client-side compression

Reference photos are downscaled and re-encoded to JPEG **on the device before
upload** (`lib/images/compressImage.ts`, applied at the single selection choke
point in `OrderForm.handleImageSelect`, so it covers both the create-time
staged uploads and edit-time immediate uploads). Boutique staff shoot
fabric/designs on phones (several MB each) but the app only ever shows small
reference thumbnails, so the full-resolution original never needs to leave the
client -- this is the main lever on bandwidth and the API's Supabase
Storage/egress budget. It's WhatsApp-style: longest edge capped at 1600px,
quality 0.8, and it degrades safely (a non-raster/undecodable/already-smaller
file is uploaded unchanged).

### View-only orders

An order's detail page opened by someone it isn't assigned to (any
authenticated user, e.g. via its QR code) renders in **view-only** mode: a
banner explains the state, the payment ledger and the status-history feed are
hidden, and status controls are read-only -- the visual status tracker is the
only progress indicator. `OrderDetailView` takes a `viewOnly` prop the page
computes from the caller's role/assignment; the API is the real enforcer
(`GET /orders/:id` strips payments and writes still 403 -- see needleye-api's
README).

### Confirmation dialogs & error handling

Native `confirm()` is gone: `components/ui/ConfirmDialog.tsx` provides a
styled, promise-returning `useConfirm()` used for every destructive action
(payment delete, deactivate, password/QR regenerate). Any other dialog builds
on `components/ui/Modal.tsx` -- a portal-rendered panel (bottom sheet on
phones) that traps Tab focus, closes on Escape from anywhere, locks page
scroll, and returns focus to whatever opened it. Use it rather than a
hand-rolled overlay.

### Product category picker

`ProductCategoryPicker` replaces the category `<select>` on the order form --
47 categories in 6 collections is too many for a dropdown. It opens a
catalogue dialog: browse a collection from the rail (chips on a phone), or
search everything. Search (`lib/domain/utils/productCategorySearch.ts`, unit
tested) ignores case, spaces, and punctuation ("jumpsuit" finds "Jump Suit"),
requires every typed word to match the label or collection ("mens shirt" finds
only the Mens Wear one; "mens" alone lists that whole collection), and keeps
collections in a fixed order so results don't jump while typing. Typing is
debounced (200 ms); clearing applies instantly. It's an ARIA combobox: while
searching, the best match is pre-highlighted -- an EXACT label first
(`bestMatchIndex`), so "saree" + Enter picks Saree, not the Saree Blouse listed
above it -- then Up/Down move, Enter picks, Escape closes.

The catalogue itself is `lib/domain/constants/productCategories.ts`, mirroring
needleye-api's. **Never change an existing `value`** -- orders store it; labels
are display-only. Values are correctly spelled even where a label keeps the
business's spelling ("Plazo" -> `palazzo`), and Mens/Kids values are prefixed
so the repeated labels "Shirt", "Pant" and "Skirt" stay distinct. Outside the
picker (order page, sticker) `productCategoryDisplayName()` adds the collection
to a repeated label: "Shirt (Mens Wear)", "Skirt (Lower Body)".

### Dashboard delivery calendar (owner and production manager)

The Orders dashboard has a **Delivery Calendar** button, visible to the owner
and the production manager only. It opens the same `DeliveryCalendar` as the
order form, in **browse mode** (`mode="browse"`):
- it reaches **3 months back** (to review overdue days) and 6 months ahead;
- **any day can be clicked**, including past and full days;
- a click shows **that day's orders** (`DeliveryDayList`) inside the same
  dialog: order number, customer, category, stage, designer and master, each
  linking to the order, 20 per page, with a Back button.

The list is fetched for that day only (`GET /orders?dueOn=YYYY-MM-DD`). Pick
mode in the order form is unchanged. Day cells carry `data-date` for tests.
E2E: `e2e/delivery-calendar-dashboard.spec.ts`.

### Kanban board

The Kanban view (All Orders, then Kanban) shows only orders **booked in the last
2 months**, **50 at a time**, newest first, with the same Prev/Next pager as the
table. A note above the board gives the start date. The server does the
window and the paging (`GET /orders?createdFrom=<today minus 2 months>&limit=50&offset=…`),
so the board never loads more than 50 orders. Search and the designer/master
filters still apply. Older orders are in Table view. The constants are
`KANBAN_PAGE_SIZE` and `KANBAN_WINDOW_MONTHS` in `OrdersListClient`. E2E:
`e2e/more-workflows.spec.ts` checks the request, the window, the page size and
paging.

### Reports (owner only)

"Reports" in the sidebar opens `/reports`, which is owner_manager only
(`reports:staff`): the menu item is hidden from other roles, and every
reports page redirects them (`modules/reports/requireReportsAccess.ts`).

`/reports` is a home page with **three cards**; it fetches nothing. Each card
opens its own page, which has a "← Reports" back link:

- **Check team status** (`/reports/team`, `TeamStatusCard`): every active
  designer, master tailor, production manager and worker as **Working** or
  **Idle**. The rule is the API's: designers by undelivered orders they created
  in the last 45 days, everyone else by undelivered orders whose latest stage
  move was theirs in the last 30 days.
  - **Search (debounced), role, status and page (20 a page) are all sent to the
    API.** Nothing is filtered in the browser, so it stays fast however big
    the team gets.
  - The Working/Idle tiles show the API's counts and double as filters.
- **Check staff report** (`/reports/staff`, `StaffReportClient`): pick a team,
  then a person, then their month.
  - The person list (`StaffPicker`) is searchable (debounced) and paged (15 a
    page) through the same API endpoint with `role=`. It loads only after a
    team is chosen.
  - The old `/orders/staff-report` address redirects here. The All Orders page
    no longer has a Staff Report button, so Reports in the sidebar is the way in.
- **Check daily activity** (`/reports/activity`, `ActivityFeedCard`): today
  and the 6 days before it, in five tabs with counts -- **Orders** (created,
  edited, pricing), **Stages**, **Payments**, **Leads**, **Sign-ins &
  accounts** -- each its own log in the API (needleye-api ADR 0008).
  - A day loads only when opened (its Orders tab, plus every tab's count);
    another tab loads when chosen; 50 actions at a time, with "Show more".
  - `describeActivity` (`lib/domain/utils/activityEvent.ts`, unit tested)
    turns each event into a sentence that links to the order or lead, with a
    second line for the specifics: what an edit changed ("Due date: 20 Oct →
    25 Oct · Designer: Sunita → Anita"), why a price moved, a payment's date.
  - Times use the shop's timezone, which the API returns.

E2E: `e2e/reports.spec.ts` covers the three cards, the debounce (4 keystrokes
→ exactly 1 request), paging and access.

### Leads (owner and designers)

Its own sidebar section (**Customers -> Leads**); nothing about leads appears on
the orders dashboard. Decisions: needleye-api `docs/adr/0007-leads-and-public-enquiry-form.md`.

- **`/leads`** (`LeadsDashboard`): stage tiles that double as filters, an
  urgent filter, debounced search (name / phone / lead number), a stage select,
  and -- for the owner -- a designer filter, the **Designers** table (searched,
  debounced, 10 a page via `GET /leads/designers`; a name filters All leads) and
  **Copy enquiry form link**. All filtering and paging is in the API.
- **Picking a designer** (the filter, Assign, the manual form) is the
  `DesignerPicker` type-ahead -- debounced, at most 8 matches from
  `/team-members?role=designer&q=&limit=8` -- never a dropdown of the whole team.
- **`/leads/[leadId]`** (`LeadDetailView`): contact (call / WhatsApp), the
  requirement, **only the actions the API says this person may take**
  (`actions` in the response): Assign (owner), the next stages, and
  **Converted**, which asks "Create an order for this lead?" and opens
  `/orders/new?leadId=` pre-filled (with a banner); the lead becomes Converted
  when that order is saved. Comments and history below.
- **`/leads/new`** (owner): the manual lead form, with source and optional
  assignment.
- **The badge** (`LeadsBadgeProvider` in `AppShell`): the red count on the
  sidebar's Leads item, on the **logo** in the phone header when the menu is
  closed, in the tab title ("(3) Needleye") and on the installed app's icon
  (Badging API). Refreshed on open / reopen (visibility) / reload, **every 10
  minutes**, and right after an action that changes it (`notifyLeadsChanged`).
- **Access:** `requireLeadsAccess` gates the pages (owner + designers; `/leads/new`
  owner only); the API enforces the same on every call.

### The public enquiry page (`/enquiry`, no login)

`app/(public)/enquiry` -- Needle Eye's couture house page for customers
(`EnquiryLanding`), in a luxury theme of its own -- noir, ivory and champagne
gold, the `.lux` classes in `globals.css`; the staff app keeps its palette.
Sections: the hero (the tagline "Beauty finds its form" and the moving
**garment rail**, three columns on desktop), the atelier (Sakina Ahmed's story
and quote), bridal collections, the brides gallery, signature fabrics with the
studio photo, the seven-step bridal design process, testimonials, and the
studio's address / phone / email / directions / Instagram, Facebook and
YouTube. The page also carries the shop's details as schema.org
`ClothingStore` data for search engines. `/enquiry` is in the session proxy's
no-session list.

- **The form is a popup** (`EnquiryDialog`, a native `<dialog>` shown with
  `showModal()`): it opens the moment the page does, and from every "Book a
  consultation" link (`a[href="#enquiry"]`); focus stays inside, Esc closes,
  and "See our work" / "More about us" close it and glide to that section.
  On desktop a bride photo sits beside the form. The form is in the page's
  noir and gold (`EnquiryForm tone="lux"`, `.lux-form`).
- **While browsing** (`FloatingConsult`): once the hero is scrolled past, a
  "Book a consultation" pill floats at the bottom -- the brand red with a gold
  ring running round it and a soft shine (`.lux-chase`), on phones too.
- **Words and facts:** `modules/leads/content/needleEye.ts` -- taken from the
  shop's previous website (needleye.in: Home, About us, Contact, Fabrics,
  Bridal Collections). Edit there, not in the layout; nothing on the page is
  invented. The brand is written "Needle Eye", as on the logo.
- **Photos:** every image in `public/brand/` (file-name order; see the README
  there) -- read on the server (`lib/brand/gallery.ts`), so adding photos needs
  no code change; a section that prefers a photo by name falls back to another
  if it's gone. With none, woven fabric swatches stand in. The current eight
  are Needle Eye's own brides from its Instagram (WebP, about 1400 px tall,
  under 200 KB; Instagram's carousel dots cropped away, photographers' credits
  kept). `public/studio/` holds the fabric-library photo. Raw uploads go in
  `public/new/`, which git ignores -- never commit originals or database dumps
  (everything in `public/` is served to the internet as-is).
- **Site icon:** `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` -- the
  logo's "N" emblem on the logo's sand colour (readable at tab size).
- **Motion:** the rail is pure CSS transforms (`.rail-*` in `globals.css`) --
  no JavaScript, two slow columns on desktop, one slim strip on phones, paused
  on hover/touch, stopped by `prefers-reduced-motion`.
- **The form** talks to the API with a plain `fetch` (`publicEnquiryApi`) -- no
  session, no token. It carries the signed open-time token, a hidden honeypot
  field, and the Turnstile widget only when the API reports a site key (off by
  default). Every outcome shows a calm message; text is only ever rendered as
  text.

E2E: `e2e/leads.spec.ts` -- a customer's enquiry through the public form, the
owner assigns, the designer's badge and Received, a comment, Converted into a
pre-filled order, the manual lead + discard, and roles kept out.
`smoke-all-roles` opens `/leads`, `/leads/new` and `/enquiry` for every role
(and on a phone).

### Delivery due date & calendar

The workshop can deliver about 10 orders a day (the API's
`DELIVERY_DAY_CAPACITY`; the web never hard-codes it, it reads `capacity` /
`nearCapacity` from `GET /orders/delivery-load`). `DeliveryDateField` replaces
the order form's due-date input:

- **Picking a date checks it.** After a 300 ms debounce the field shows
  "Checking delivery availability…" with a spinner, then *Available for
  delivery · N of 10 booked* (green) or *Available, filling up* (amber, from
  80%). Results are keyed by date, so a slow answer for an older date is never
  shown. If the check itself fails, a note says it will be re-checked on save.
  The form still works.
- **A full day opens a dialog** with three choices. *Check the calendar* opens
  the calendar. *Already checked with Production Manager — proceed* sends
  `confirmedWithProductionManager: true` with the save, and the API audits the
  override. *Cancel* clears the date (or restores the saved one when editing).
  Changing the date resets the confirmation.
- **The API has the final word.** Its check runs under a per-day lock at save
  time, so a day that filled up in the meantime comes back as 409
  `DELIVERY_DAY_FULL`. `OrderForm` recognises it with `isApiErrorCode` (from
  `lib/api/client.ts`, whose `ApiRequestError` carries the status, code and
  details) and reopens the same dialog instead of showing an error toast.
- **Editing:** an unchanged due date isn't checked (the order already holds its
  slot), and `excludeOrderId` keeps the order out of its own day's count.

`DeliveryCalendar` (on the shared `Modal`) shows two months side by side (one
on a phone, paged via `useMediaQuery`), from this month up to six months ahead
(`lastBookableDate`). Each day shows its booked count: blue while open, amber
when filling up, red with a warning sign when full. Zeros are dimmed. A full day
**can** still be picked: doing so closes the calendar and opens the full-day
dialog again, every time. Past days and days beyond the window can't be picked;
today has a gold ring. **Loading is lazy:** only the months on screen are
fetched (one request covering them). Each arrow click fetches just the newly
shown month, and months already seen come from memory until the calendar
closes. (In `next dev`, React Strict Mode runs the first fetch twice; the
production build doesn't.) The date maths
(`lib/domain/utils/deliveryCalendar.ts`) works on plain `YYYY-MM-DD` strings in
UTC, so no timezone can move a day. Its tests check every month from 1900 to
2200 against independent rules that don't use JS `Date`: the leap-year rule
written out by hand (2000 and 2028 leap; 1900, 2100 and 2027 not) and Zeller's
congruence for weekdays. E2E: `e2e/delivery-capacity.spec.ts` fills a day
through the API and walks the dialog → calendar → override → create path. It
also picks a full day inside the calendar (with a browser-mocked load, so no
real near-term day is filled) and checks Cancel. Specs that create
orders use `uniqueDueDate()` (e2e/fixtures.ts) so repeated runs never fill a
day by accident.

Every self-fetching
surface renders explicit loading / empty / error states with a retry, and
route-group error/not-found boundaries (`app/(app)/error.tsx`,
`app/(app)/not-found.tsx`, plus the orders-specific ones) catch server-fetch
failures so a downed API shows a recoverable fallback, never a blank screen.

### No shared package, on purpose

`needleye-web` and `needleye-api` are separate repos with separate CI/CD and
separate deploys, and **nothing is imported across them** -- the only
connection is HTTP calls against the API's documented endpoints. That means
`lib/domain/` (RBAC matrix, order-status vocabulary, validation schemas,
formatting utils) is **this repo's own copy** of rules that also exist,
independently, in `needleye-api`'s `src/domain/`. Neither repo depends on
the other, and there is no third "shared" repo or package either.

**The real tradeoff:** if the RBAC rules or order-status vocabulary change,
both copies need updating by hand -- there's no compiler to catch drift
between them. That's an accepted cost of true service independence for two
apps this size; it stops being fine only if the two copies drift in
practice, at which point the fix is a documented API contract, not a shared
code package.

**RBAC in the UI:** nav items and form fields are gated via
`lib/domain`'s capability matrix (`hasCapability`/`getCapabilityScope`)
mirroring the same rules the API enforces -- this is UI convenience, not the
security boundary; the API is what actually rejects unauthorized writes. Six
roles: `owner_manager`, `designer`, `master_tailor`, `accountant`,
`production_manager` (a designer that sees *all* orders), and `worker` (no
dashboard -- nav is empty and `/orders` redirects to `/scan`; scans an order QR
and advances it). Status permissions are the four tiers in
`orderStatusPermissions.ts`'s `canChangeStage` (design / pm_received /
production / finalization -- QC, Alteration, Ready and Delivered are owner /
designer / PM only). The flow has 16 stages (Marking after Dyeing, Ready after
Alteration, right before Delivered); moves are forward-only except **Ready ->
Alteration** (the alteration loop), and **Delivered only from Ready**
(`stageMoveRefusal`). `canTransition` / `blockingStage` also refuse a jump past a
stage the role can't set (so a designer isn't offered Falls/Kutchu from Design
Approved -- that would skip PM Received). The status dropdown and the Kanban
board both apply this; the QR-scan prompt offers `nextMainStage` (QC and
Alteration -> Ready, Ready -> Delivered, never Alteration). The order tracker
doesn't tick Alteration as done once an order is past it (it's a side loop, not
a step every order passes). The API enforces all of it. See needleye-api ADR
0005 (and its 2026-09-24 amendment) and ADR 0008.

**Money — one way, decimal, string on the wire.** All money is a 2-decimal
**string** ("1500.00"), never a JS `number`, everywhere in this app (API JSON,
props, state) — mirroring the API contract. `lib/domain/utils/money.ts` (the
mirror of the API's `money.ts`, using **decimal.js**) is the single place money
math happens: `money`, `toMoneyString`, `addMoney`, `subtractMoney`,
`outstanding`, `moneyGreaterThan`, `moneyGte`, `isPositiveMoney`, `paidFraction`.
`formatCurrency` (in `currency.ts`) is the only thing that turns money into
display text; form inputs are validated via `moneyField`/`positiveMoneyField`
(`lib/domain/validation/money.ts`). Never do `+ - > Number() parseFloat` on
money.

**Frontend logging:** `lib/logging/logger.ts` is the one web-side logger
(leveled, structured, browser + server-component safe; never logs tokens).
`describeFetchError` turns a raw transport failure (server unreachable /
`ECONNREFUSED` / aborted) into a friendly, user-safe message; `apiFetch`,
`apiUpload`, and `apiFetchServer` route through it (a down API surfaces a `503`
with a friendly message instead of a raw stack).

## Environment variables

See `.env.example`: `NEXT_PUBLIC_API_BASE_URL` (needleye-api's URL) and
`NEXT_PUBLIC_WEB_APP_URL` (this app's own public origin, used only to build
absolute order-QR-code URLs that need to resolve correctly when scanned
from a phone). Nothing Supabase-related belongs here -- if you find
yourself adding a Supabase env var to this app, that's a sign an operation
is bypassing needleye-api and should go through it instead.

## Deployment

Independent from needleye-api -- deploy to Vercel (or any Next.js host),
pointed at a hosted Supabase project and the deployed needleye-api URL via
the same env vars used locally. `.github/workflows/ci.yml` runs
lint + typecheck + unit tests + build on every push/PR.
