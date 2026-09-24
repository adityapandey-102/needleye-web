@AGENTS.md

# Project Scale & Engineering Strategy

Internal Line-of-Business (LOB) app. ~100 users, ~300 orders/month, single
organization, business-critical data. Accuracy, maintainability, and
reliability matter far more than extreme scalability. **Do not overengineer.**
Always prefer the simplest solution that satisfies the current requirement
while remaining extensible.

This repo has no database or backend of its own -- it talks to `needleye-api`
over HTTP only (see README's "No shared package, on purpose"). The
Docker/migrations/seed-data parts of the engineering charter below live in
`needleye-api/CLAUDE.md`, not here.

## Mandatory, non-negotiable

Consistent architecture · clean code · SOLID · high cohesion · low coupling ·
strong validation · consistent error handling · comprehensive documentation.

## Keep it simple

Unless explicitly requested, do **not** introduce: state-management
frameworks beyond what's already here, complex caching layers, highly
abstract generic component frameworks, or any of the backend-side items
Kubernetes/Redis/Kafka/etc. listed in `needleye-api/CLAUDE.md` (irrelevant
here regardless, since this repo has no backend).

**The current `modules/` (feature) + `lib/domain/` (independent domain
copy) + `components/ui/` structure is the correct architecture for this
project. Keep improving it, don't replace it.**

## Testing strategy (Testing Pyramid — don't test every line equally)

- **Unit tests (highest priority)**: `lib/domain/`'s business logic --
  validation schemas, timeline/currency utilities, capability checks,
  order-status permission mirrors (`orderStatusPermissions.ts`). These
  should be the majority of tests.
- **Integration tests**: component behavior against a mocked `apiFetch`
  (API calls, auth flows, form submission).
- **E2E tests**: only for critical workflows -- login, create order, update
  order, upload images, record payment, search orders. Not every
  page/button. Playwright is the natural fit here (already used ad hoc for
  live verification this session via `playwright-core`).
- **Manual testing** before calling a feature done: desktop, mobile
  responsiveness, auth, authz, error scenarios, the important workflows.

## Security

Every change touching auth, forms, or user input gets a security review:
XSS protection, safe handling of the session tokens in `lib/session/`, CSRF
where applicable, no secrets ever in `NEXT_PUBLIC_*` env vars.

## Performance

The concrete rules and their reasons are in `docs/engineering-practices.md`:
every search box debounced (`useDebouncedValue` + `SEARCH_DEBOUNCE_MS`),
every list paginated by the server (shared `Pager`), data loaded on demand,
and first-load JS per page within budget (`npm run check:bundle` after a
build).

## CI strategy

CI only -- no complex CD until a deployment platform is finalized.
Frontend CI: install, lint, typecheck, build. (Already in place --
`.github/workflows/ci.yml`.)

## Engineering standard — applies to every future change

Every implementation, refactor, optimization, bug fix, and feature must
automatically include a review of whether these need updating -- **do not
wait to be asked**:

Automated tests · documentation (this repo's README + needleye-api's, if the
contract changed) · flow diagrams (when workflow changes) · error handling ·
validation · security · performance · environment configuration · CI
configuration.

## Definition of done

Not done just because the feature works. Done means: implemented correctly ·
existing functionality unaffected · tests added/updated · documentation
current · error handling reviewed · security reviewed · performance
reviewed · build succeeds · typecheck passes · lint passes · CI passes.

Always balance maintainability, simplicity, and production readiness. Avoid
overengineering. Prefer the simplest architecture and implementation that
cleanly solves the problem while staying extensible.
