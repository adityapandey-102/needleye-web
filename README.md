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
    components/                 # LoginForm, RegisterForm, ResetPasswordForm, UpdatePasswordForm
    api/authApi.ts                # every HTTP call the Auth module makes -- login/logout/qrLogin also own writing/clearing the session cookies
  orders/
    components/                 # OrderForm (create+edit), OrdersListClient, OrderDetailView, ImageUploadGrid, OrderQrCode, PaymentLedger
    hooks/useTeamMembers.ts       # designer/master-tailor lookup, replaces hardcoded name lists
    api/ordersApi.ts               # every HTTP call the Orders module makes
  payments/
    api/paymentsApi.ts             # every HTTP call the Payments module makes -- mirrors needleye-api's own Payments module
  admin-users/
    components/                 # UserManagementClient (owner_manager only) -- create account, generate password/QR, role changes, deactivate
    api/usersApi.ts                # every HTTP call the Admin Users module makes
components/                  # cross-MODULE only: ui/ primitives (Button, Card, Field, ...), shell/ (Sidebar, AppShell, nav config)
lib/
  domain/                      # this repo's OWN copy of RBAC/order-status/validation -- see below, not a package
    index.ts                     # barrel export of everything below
    constants/, types/, utils/, validation/
  session/                     # this app's OWN session handling -- cookies holding needleye-api-issued tokens, NOT Supabase's session mechanism
    constants.ts                  # cookie names/max-age
    jwt.ts                          # local (unverified) expiry check, decoded from the access token itself
    client.ts, server.ts             # browser (document.cookie) vs Server Component/Route Handler (next/headers) cookie access
    proxy.ts                          # the session-refresh logic proxy.ts (root) delegates to
  api/                          # generic apiFetch/apiUpload wrappers (attach the session's access token, silently refresh via needleye-api if expired) -- modules/*/api/ build on these, components never call these directly
```

`app/` stays thin on purpose -- a page's job is data-fetching (Server
Components calling the API) plus capability checks (redirects), and it
renders a component from `modules/`. Business logic and API calls for a
module live inside that module's folder, not scattered across pages.

**Every module that talks to the backend has its own `api/*.ts` file**
(`ordersApi`, `authApi`, `usersApi`) wrapping the generic `lib/api/client.ts`
fetch helpers into named, typed methods. Components never call `apiFetch`
directly -- this is the frontend's equivalent of the backend's repository
layer: the one place HTTP calls for a given module are made, consistently
applied even to the smaller modules (Auth has exactly two calls; it still
gets its own `api/` file rather than inlining them, because consistency
across the codebase matters more than trimming one small file).

### Authentication

Every auth operation is a call to needleye-api, never to Supabase:

- **Login/logout** (`modules/auth/api/authApi.ts`) call `POST /auth/login` /
  `POST /auth/logout` and, as a side effect, write/clear two plain (not
  httpOnly) cookies -- `ne_at` (access token) and `ne_rt` (refresh token).
  They're plain rather than httpOnly because the browser needs to read them
  to attach `Authorization: Bearer <token>` on its own API calls, the same
  way Supabase's own browser client's cookies were never httpOnly either --
  this is not a regression in the security posture, just a different issuer
  for the same kind of token.
- **`lib/api/client.ts`/`lib/api/server.ts`** read the access token from
  those cookies and attach it as a bearer header; if it's missing or
  (locally, per `lib/session/jwt.ts`) expired, they call
  `POST /auth/refresh` first and update the cookies before the real request.
- **`proxy.ts`** (root) does the same refresh-and-check on every request at
  the edge, so a Server Component never even sees a stale cookie, and
  redirects to `/login` if there's no valid session and the route requires
  one.
- **`app/auth/callback/page.tsx`** is where a password-reset email link
  lands (there's no invite email -- see "Account creation" below). This
  project's Supabase config uses the *implicit* flow, so GoTrue puts the
  tokens directly in the URL fragment (`#access_token=...&refresh_token=...`)
  -- a fragment never reaches a server, so this has to be a client page, not
  a Route Handler. It reads the fragment and calls `setSession` directly. It
  also handles a `?code=` query param (PKCE) via `POST /auth/exchange-code`,
  in case the Supabase project is ever reconfigured to use that flow instead.
- **`app/(auth)/qr-login/page.tsx`** is where scanning a Master Tailor's QR
  lands (`?token=` in the URL). It calls `authApi.qrLogin`, which behaves
  exactly like `login` -- writes the session cookies as a side effect, then
  redirects to `/orders`. Deliberately reachable even with an existing
  session already present (see `lib/session/proxy.ts`'s comment) -- scanning
  a QR is an explicit intent to switch identity (e.g. a shared shop tablet).

This API is stateless on its own side (see needleye-api's README) -- all of
the above session-cookie machinery is this app's concern, not something the
API dictates or participates in beyond verifying whatever bearer token it's
handed on each request.

### Account creation, passwords, and QR login

`modules/admin-users/components/UserManagementClient.tsx` (Owner/Manager
only, `/admin/users`) replaces what used to be an email-invite form:

- **Create account**: name/email/role only -- no password field. `usersApi.create`
  calls `POST /users`, which returns a server-generated password shown once
  in a dismissible overlay (`RevealOverlay`). Neither this app nor
  needleye-api can show it again afterward, only regenerate it.
- **Generate/regenerate password**: a "Generate new password" action per
  row, shown for `designer`/`master_tailor` accounts always, and for
  `owner_manager`/`accountant` accounts only until they've logged in once
  (`user.lastLoginAt`) -- matching the backend's `UsersService.generatePassword`
  rule exactly (this UI condition is convenience; the API enforces it for real).
- **QR login**: a "Generate/Regenerate QR login" action, `master_tailor`
  rows only. Calls `usersApi.generateQrToken`, then renders the returned
  `loginUrl` as a QR code (`qrcode.react`'s `QRCodeSVG`) in the same
  one-time reveal overlay -- print or display it, since regenerating (or
  deactivating the account) invalidates it immediately.

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
`OrdersListClient`/`UserManagementClient`: it takes just `orderId` and
`canManage` as props and calls `paymentsApi.list` itself on mount, rather
than being fed data from the server page. `canManage` is computed in
`app/(app)/orders/[orderId]/page.tsx` from the `payments:manage` capability
+ the assigned-designer check -- the same pattern already used for
`canEdit`. Add/remove are real API calls (`paymentsApi.add`/`.remove`)
against `needleye-api`'s ledger endpoints, which enforce the actual RBAC
scoping and the `fully_paid`-must-reconcile-with-the-ledger rule -- this
component's `canManage` prop only controls whether the add/remove controls
render, not whether the write is allowed.

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
security boundary; the API is what actually rejects unauthorized writes.

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
typecheck + lint + build on every push/PR.
