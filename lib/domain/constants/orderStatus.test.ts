import { describe, expect, it } from "vitest";
import { GRANULAR_STATUS_VALUES, STAGE_CAPABILITY, nextMainStage, stageIndex, stageMoveRefusal } from "./orderStatus";

/** Mirror of needleye-api's order-status tests -- the two lists must stay identical. */
describe("order status flow (ADR 0008)", () => {
  it("has 16 stages: Marking after Dyeing, Ready right before Delivered", () => {
    expect(GRANULAR_STATUS_VALUES).toHaveLength(16);
    expect(stageIndex("marking")).toBe(stageIndex("dyeing") + 1);
    expect(GRANULAR_STATUS_VALUES.slice(-4)).toEqual(["quality_check", "alteration", "ready", "delivered"]);
    expect(STAGE_CAPABILITY.marking).toBe("orders:status:production");
    expect(STAGE_CAPABILITY.ready).toBe("orders:status:finalization");
  });

  it("refuses Delivered from anything but Ready, and every backward move except Ready -> Alteration", () => {
    for (const from of GRANULAR_STATUS_VALUES.filter((s) => s !== "ready" && s !== "delivered")) {
      expect(stageMoveRefusal(from, "delivered")).toBe("deliver_requires_ready");
    }
    expect(stageMoveRefusal("ready", "delivered")).toBeNull();
    expect(stageMoveRefusal("ready", "alteration")).toBeNull();
    expect(stageMoveRefusal("alteration", "ready")).toBeNull();
    expect(stageMoveRefusal("ready", "quality_check")).toBe("backward");
    expect(stageMoveRefusal("delivered", "ready")).toBe("backward");
    expect(stageMoveRefusal("cutting", "cutting")).toBe("same_stage");
  });

  it("scans advance along the main path, never into Alteration", () => {
    expect(nextMainStage("dyeing")).toBe("marking");
    expect(nextMainStage("quality_check")).toBe("ready");
    expect(nextMainStage("alteration")).toBe("ready");
    expect(nextMainStage("ready")).toBe("delivered");
    expect(nextMainStage("delivered")).toBeNull();
    for (const from of GRANULAR_STATUS_VALUES) {
      const next = nextMainStage(from);
      if (next) expect(stageMoveRefusal(from, next)).toBeNull();
    }
  });
});
