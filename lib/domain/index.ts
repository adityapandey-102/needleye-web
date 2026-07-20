/**
 * RBAC roles/capabilities, order-status vocabulary, product/payment
 * constants, formatting utils, and zod validation schemas -- the business
 * rules this app's UI reflects. Deliberately NOT a shared package:
 * needleye-api keeps its own copy of the same rules. The two apps are
 * fully independent repos that only talk over HTTP; if that duplication
 * ever becomes painful, that's a signal to introduce a documented API
 * contract, not to re-couple the repos with shared code.
 *
 * UI-side capability checks here are convenience/UX only (hide a button,
 * disable a field) -- the API is what actually enforces access.
 */
export * from "./constants/roles";
export * from "./constants/capabilities";
export * from "./constants/orderStatus";
export * from "./constants/productCategories";
export * from "./types";
export * from "./utils/date";
export * from "./utils/currency";
export * from "./utils/timeline";
export * from "./validation/order";
export * from "./validation/payment";
export * from "./validation/user";
