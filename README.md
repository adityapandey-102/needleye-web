# Needle Eye Web

Next.js (App Router) + TypeScript + Tailwind frontend for the Needle Eye ERP
(a boutique/tailoring order-management system). Deployed and managed
independently from [needleye-api](https://github.com/REPLACE_ME/needleye-api)
-- they talk to each other only over HTTP, share no runtime code, and each
has its own CI/CD pipeline.

> **Maintainers: keep this file current.** Whenever a change touches
> architecture, routing, env vars, or the dev workflow, update the relevant
> section here in the same change.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase Auth (`@supabase/ssr`) for login/session directly against Supabase -- not proxied through the API
- `@needleye/shared` (a sibling repo, installed as a git dependency) for the RBAC capability matrix, order-status vocabulary, and zod validation shared with the backend
- All other data (orders, users, images) goes through [needleye-api](https://github.com/REPLACE_ME/needleye-api) over HTTP

## Prerequisites

- Node.js 20+
- A running instance of [needleye-api](https://github.com/REPLACE_ME/needleye-api) (which brings up the local Supabase stack) -- this app has no backend of its own
- Access to the `@needleye/shared` git repo (see `package.json`'s dependency)

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
# needleye-api's `supabase start` output, and NEXT_PUBLIC_API_BASE_URL
# (default http://localhost:4000/api/v1 assumes needleye-api is running
# locally on its default port).

npm run dev
# ⤷ http://localhost:3000
```

First-time setup: visit `/register` to create the first Owner/Manager
account (self-disabling once one exists -- see needleye-api's README for
the invite-only model). Everyone else is invited from `/admin/users`.

## Architecture

```
app/                       # routing only -- thin pages that compose feature components
  (auth)/                    # login, register (bootstrap), reset/update password -- no sidebar
  (app)/                      # everything behind auth -- sidebar shell (layout.tsx), orders, admin
  auth/callback/route.ts       # exchanges a Supabase email-link code for a session
  proxy.ts                       # Next.js 16's middleware.ts equivalent (renamed upstream) -- session refresh + route guarding
features/
  auth/components/            # LoginForm, RegisterForm, ResetPasswordForm, UpdatePasswordForm
  orders/
    components/                 # OrderForm (create+edit), OrdersListClient, OrderDetailView, ImageUploadGrid
    hooks/useTeamMembers.ts       # designer/master-tailor lookup, replaces hardcoded name lists
    api/ordersApi.ts               # every HTTP call the Orders feature makes, in one place
  admin-users/components/       # UserManagementClient (owner_manager only)
components/                  # cross-feature only: ui/ primitives (Button, Card, Field, ...), shell/ (Sidebar, AppShell, nav config)
lib/
  supabase/                    # browser/server Supabase clients + the proxy.ts session-refresh helper
  api/                          # generic apiFetch/apiUpload wrappers (attach the Supabase access token); features/*/api/ build on these
```

`app/` stays thin on purpose -- a page's job is data-fetching (Server
Components calling the API) plus capability checks (redirects), and it
renders a component from `features/`. Business logic and API calls for a
feature live inside that feature's folder, not scattered across pages.

**RBAC in the UI:** nav items and form fields are gated via
`@needleye/shared`'s capability matrix (`hasCapability`/`getCapabilityScope`)
mirroring the same rules the API enforces -- this is UI convenience, not the
security boundary; the API is what actually rejects unauthorized writes.

## Environment variables

See `.env.example`. In short: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose -- RLS + the API enforce
access, not this key), `NEXT_PUBLIC_API_BASE_URL` (needleye-api's URL).

## Deployment

Independent from needleye-api -- deploy to Vercel (or any Next.js host),
pointed at a hosted Supabase project and the deployed needleye-api URL via
the same env vars used locally. `.github/workflows/ci.yml` runs
typecheck + lint + build on every push/PR.
