import { describe, expect, it } from "vitest";
import { badgeLabel, LEAD_STATUSES, LEAD_STATUS_LABELS, MANUAL_LEAD_SOURCES, titleWithBadge, whatsappLink } from "./leads";

describe("badgeLabel", () => {
  it("shows nothing for zero, the number up to 99, then 99+", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
    expect(badgeLabel(Number.NaN)).toBeNull();
    expect(badgeLabel(3)).toBe("3");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(140)).toBe("99+");
  });
});

describe("titleWithBadge", () => {
  it("prefixes the count, replaces an old prefix, and removes it at zero", () => {
    expect(titleWithBadge("Needleye", 3)).toBe("(3) Needleye");
    expect(titleWithBadge("(3) Needleye", 5)).toBe("(5) Needleye");
    expect(titleWithBadge("(99+) Needleye", 0)).toBe("Needleye");
  });
});

describe("leads constants", () => {
  it("labels every stage, and the manual form never offers 'Enquiry form' as a source", () => {
    for (const s of LEAD_STATUSES) expect(LEAD_STATUS_LABELS[s]).toBeTruthy();
    expect(MANUAL_LEAD_SOURCES).not.toContain("public_form");
    expect(MANUAL_LEAD_SOURCES).toContain("walk_in");
  });

  it("builds a WhatsApp link with the +91 country code", () => {
    expect(whatsappLink("9876543210")).toBe("https://wa.me/919876543210");
  });
});
