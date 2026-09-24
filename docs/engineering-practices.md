# Engineering practices — needleye-web

This is the rulebook for the web app: what we do, and **why**. Each rule is
either already true everywhere in the code, or backed by a check that fails
when it is broken. The API and database have their own page
(`needleye-api/docs/engineering-practices.md`).

---

## 1. Talking to the API

| Practice | Why | Where |
| --- | --- | --- |
| **Every search box is debounced**: one request after the user pauses (`SEARCH_DEBOUNCE_MS` = 300 ms), not one per keystroke. | Typing "priyanka" would otherwise send 8 requests, and the answers can arrive out of order. | `lib/hooks/useDebouncedValue.ts`. Used by the orders list, user management, team status, the staff-report person picker, and the category picker (200 ms, in memory). Checked by `e2e/reports.spec.ts` (4 keystrokes → exactly 1 request). |
| **Only typing is debounced.** Page, filter and view clicks fetch immediately. | A click is one deliberate action, so delaying it only makes the app feel slow. | The debounced value is a dependency of the fetch; page and filter state are used directly. |
| **Lists are paginated by the server; nothing is filtered in the browser.** | Loading everything and then filtering works with 20 rows and breaks with 2,000. The server returns one page plus a total. | `components/ui/Pager.tsx` (shared), orders, users, bucket views, team status, staff picker. |
| **Any filter change goes back to page 1, in the same event handler.** | Otherwise a narrower filter can leave you on an empty page 5. Doing it in the handler, not an effect, avoids a wasted fetch. | `changeSearch` / `changeRole` / … in each list. |
| **Stale responses are ignored.** | A slow answer to an old query must not overwrite the answer to the new one. | A `cancelled` flag in every fetch effect; `DeliveryDateField` keys results by date. |
| **Load on demand.** Fetch a report only when it's opened, a calendar month only when it's shown, a day of activity only when it's expanded. | Most of what *could* be shown is never looked at; fetching it anyway wastes server and database time. | Reports home (no fetch), `ActivityFeedCard`, `DeliveryCalendar`, `StaffPicker`. |
| **One API module per feature** (`ordersApi`, `reportsApi`, …); components never call `fetch` directly. | Every request for a feature is in one place: easy to find, change and mock. | `modules/*/api/*.ts` |

## 2. Rendering and bundle size

| Practice | Why |
| --- | --- |
| **Pages are server components that check access and then render client islands.** | The access check runs before any page code reaches a user who shouldn't see it; only interactive parts ship JavaScript. |
| **A bundle budget: ≤ 300 KB of first-load JS per page, gzipped** (`npm run check:bundle`). All 26 pages pass at 182–252 KB, of which 168 KB is React plus the Next runtime shared by every page. | Phones on shop Wi-Fi feel every kilobyte. The check catches one heavy import quietly landing on every page. |
| **Few dependencies** (Next, React, zod, decimal.js, qrcode.react, dnd-kit). | Every dependency is download size and upgrade work. Prefer a small local helper (the calendar maths, the debounce hook). |
| **Fonts via `next/font`** (self-hosted and preloaded). | No layout shift, and no call to Google on every page view. |
| **Photos are compressed on the device before upload** (longest edge 1600 px, JPEG 0.8) and **lazy-loaded** when shown. | A 6 MB phone photo becomes about 300 KB; lists never load photos at all. |

## 3. Correctness

| Practice | Why |
| --- | --- |
| **Dates are `YYYY-MM-DD` strings with UTC maths** (`lib/domain/utils/deliveryCalendar.ts`). | A timezone or daylight-saving change can't move a day. The calendar is checked against the real Gregorian calendar for every month from 1900 to 2200, including leap years. |
| **Money is a string, handled with `decimal.js`.** | Floating point loses paise. |
| **Business rules live in `lib/domain/`** (this repo's own copy) and are unit tested. The UI's permission checks are for convenience only. | The API is what enforces permissions; the UI only hides what you can't use. |

## 4. UX and accessibility

- Every data view has **loading, empty and error states, with a retry**, plus route-level error boundaries. *Why:* a slow or down API never produces a blank screen.
- **Shared primitives instead of copy-paste**: `Modal` (focus trap, Escape, scroll lock, bottom sheet on phones), `Pager`, `Card`, `Button`. *Why:* fix a bug once and every screen gets the fix.
- Labelled inputs, `aria-live` status lines, ARIA combobox and listbox, and keyboard support.
- **Mobile layouts are tested**, for example the calendar shows 1 month on a phone and tables become cards.

## 5. Security

- The web holds **no Supabase keys and no secrets in `NEXT_PUBLIC_*`**. The refresh token is an httpOnly cookie. *Why:* anything shipped to the browser is public.
- There's no `dangerouslySetInnerHTML` with user data.

## 6. Testing and the release checklist

**Run before every release** (the API and local database must be running for e2e):

| Command | Checks |
| --- | --- |
| `npm run typecheck && npm run lint` | Types and lint are clean |
| `npm run test:unit` | `lib/domain` rules, including the genuine-calendar check |
| `npm run build && npm run check:bundle` | Production build, then the per-page JS budget. `--write` refreshes `docs/performance/bundle-budget.md`. |
| `E2E_OWNER_PASSWORD=… npm run test:e2e` | Critical flows: orders, payments, delivery capacity, reports (including debounce and paging) |

**When you add a search box:** use `useDebouncedValue(value, SEARCH_DEBOUNCE_MS)`
and send the search to the server with a page size. **When you add a list:**
paginate it on the server and use `Pager`.
