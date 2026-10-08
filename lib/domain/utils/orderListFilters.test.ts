import { describe, expect, it } from "vitest";
import { TIMELINE_FILTERS } from "./orderListFilters";

describe("TIMELINE_FILTERS", () => {
  it("values are exactly what GET /orders accepts as `timeline`", () => {
    expect(TIMELINE_FILTERS.map((t) => t.value)).toEqual(["overdue", "urgent", "due_soon", "on_track", "delivered"]);
  });
});
