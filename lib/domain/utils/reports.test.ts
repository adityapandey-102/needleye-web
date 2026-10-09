import { describe, expect, it } from "vitest";
import { initialsOf, lookBackPhrase, parseReportView, workingShare } from "./reports";

describe("parseReportView", () => {
  it("accepts the three sections", () => {
    expect(parseReportView("team")).toBe("team");
    expect(parseReportView("staff")).toBe("staff");
    expect(parseReportView("activity")).toBe("activity");
  });

  it("opens Team status for anything missing or unknown", () => {
    expect(parseReportView(undefined)).toBe("team");
    expect(parseReportView(null)).toBe("team");
    expect(parseReportView("")).toBe("team");
    expect(parseReportView("Staff")).toBe("team");
    expect(parseReportView("revenue")).toBe("team");
  });

  it("takes the first value when the parameter repeats", () => {
    expect(parseReportView(["activity", "staff"])).toBe("activity");
    expect(parseReportView([])).toBe("team");
  });
});

describe("lookBackPhrase", () => {
  it("reads the API's windows in plain words", () => {
    expect(lookBackPhrase(30, "day")).toBe("in the last 30 days");
    expect(lookBackPhrase(24, "hour")).toBe("in the last 24 hours");
  });

  it("says 'the last day' / 'the last hour' for one", () => {
    expect(lookBackPhrase(1, "day")).toBe("in the last day");
    expect(lookBackPhrase(1, "hour")).toBe("in the last hour");
  });

  it("falls back to 'recently' when the number is missing or nonsense", () => {
    expect(lookBackPhrase(undefined, "hour")).toBe("recently");
    expect(lookBackPhrase(null, "day")).toBe("recently");
    expect(lookBackPhrase(0, "day")).toBe("recently");
    expect(lookBackPhrase(Number.NaN, "hour")).toBe("recently");
  });
});

describe("initialsOf", () => {
  it("takes the first letters of the first two names", () => {
    expect(initialsOf("Priya Nair")).toBe("PN");
    expect(initialsOf("anita  devi  sharma")).toBe("AD");
    expect(initialsOf("  sunita ")).toBe("S");
  });

  it("never returns an empty avatar", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("workingShare", () => {
  it("is the rounded percentage of the team that is Working", () => {
    expect(workingShare(3, 1)).toBe(75);
    expect(workingShare(1, 2)).toBe(33);
    expect(workingShare(0, 5)).toBe(0);
    expect(workingShare(4, 0)).toBe(100);
  });

  it("is 0 for an empty team", () => {
    expect(workingShare(0, 0)).toBe(0);
  });
});
