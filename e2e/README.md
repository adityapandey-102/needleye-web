# E2E tests (Playwright)

Critical-workflow coverage only (see CLAUDE.md's testing pyramid): login,
create order (incl. image upload), search orders, update order, record
payment. Not a full click-every-page suite.

## Prerequisites

- The local Supabase stack running (`npx supabase start` in `needleye-api`)
- `needleye-api` running (`npm run dev` in `needleye-api`, or `npm run
  dev:up` for the full one-command bring-up) with at least one
  `owner_manager` account
- `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` set to that account's
  credentials -- same convention as `needleye-api/tests/rbac-matrix.mjs`.
  The suite uses this account only to provision throwaway designer/
  master_tailor fixtures via the real `/users` endpoint; it never logs in
  as the owner itself.

This config only starts the Next.js dev server (`npm run dev`) itself.

## Running

```
E2E_OWNER_EMAIL=owner@needleeye.test E2E_OWNER_PASSWORD=... npm run test:e2e
```

First run: `npx playwright install chromium` to fetch the browser binary.

Each run creates its own fixture staff accounts and one order (bill number
stamped with the current time) -- no dependency on `npm run seed` having
been run first, and safe to run repeatedly. Fixtures are not deleted
afterward (same as `rbac-matrix.mjs`'s convention) -- this is a local/dev
database, not shared state.
