import { describe, expect, it } from "vitest";
import { bestMatchIndex, countCategories, highlightSegments, searchProductCategories } from "./productCategorySearch";
import { PRODUCT_CATEGORIES } from "../constants/productCategories";

const values = (query: string) => searchProductCategories(query).flatMap((g) => g.categories.map((c) => c.value));

describe("searchProductCategories", () => {
  it("returns the whole catalogue, all six collections, for an empty or blank query", () => {
    expect(countCategories(searchProductCategories(""))).toBe(PRODUCT_CATEGORIES.length);
    expect(searchProductCategories("   ")).toHaveLength(6);
  });

  it("ignores case, spaces and punctuation: 'jumpsuit' and 'JUMP-SUIT' find Jump Suit", () => {
    expect(values("jumpsuit")).toEqual(["jumpsuit"]);
    expect(values("JUMP-SUIT")).toEqual(["jumpsuit"]);
  });

  it("finds a label across collections -- 'kurta' returns the women's AND men's kurtas", () => {
    expect(values("kurta")).toEqual(["short_kurta", "pakistani_kurta", "mens_kurta"]);
  });

  it("narrows a repeated label by collection: 'mens shirt' is only the Mens Wear shirt", () => {
    expect(values("mens shirt")).toEqual(["mens_shirt"]);
    expect(values("shirt")).toEqual(["shirt", "mens_shirt"]);
  });

  it("lists a whole collection when the query is its name", () => {
    const upper = searchProductCategories("upper");
    expect(upper).toHaveLength(1);
    expect(upper[0]?.group).toBe("upper_body");
    expect(upper[0]?.categories).toHaveLength(9);
  });

  it("ranks labels that START with the query first WITHIN a collection; collections keep their order", () => {
    // Collections never reorder as you type (the list would jump under the
    // cursor), so Upper Body's "HW Blouse Skirt" still precedes Lower Body. But
    // inside Lower Body, "Skirt" (starts with it) leads the ones that contain it.
    const groups = searchProductCategories("skirt");
    expect(groups.map((g) => g.group)).toEqual(["upper_body", "lower_body"]);
    const lower = groups.find((g) => g.group === "lower_body")!.categories.map((c) => c.value);
    expect(lower[0]).toBe("skirt");
    expect(lower).toEqual(["skirt", "divided_skirt", "drape_skirt", "mermaid_skirt"]);
  });

  it("matches the business's own spelling of a label ('plazo'), not only the stored value", () => {
    expect(values("plazo")).toEqual(["palazzo"]);
  });

  it("returns nothing for a query that matches no category or collection", () => {
    expect(searchProductCategories("zzzz")).toEqual([]);
  });
});

describe("bestMatchIndex (what Enter picks)", () => {
  const flat = (query: string) => searchProductCategories(query).flatMap((g) => g.categories);
  const best = (query: string) => flat(query)[bestMatchIndex(flat(query), query)]?.value;

  it("picks the EXACT label over an earlier-listed partial match: 'saree' is Saree, not Saree Blouse", () => {
    expect(flat("saree")[0]?.value).toBe("saree_blouse"); // listed first (Upper Body)...
    expect(best("saree")).toBe("saree"); // ...but Enter means Saree
  });

  it("prefers a label that starts with the query when there's no exact match", () => {
    expect(best("mermaid")).toBe("mermaid_skirt");
  });

  it("breaks ties by list order -- 'shirt' is an exact label twice, Upper Body's comes first", () => {
    expect(best("shirt")).toBe("shirt");
    expect(best("mens shirt")).toBe("mens_shirt");
  });

  it("returns -1 for no results", () => {
    expect(bestMatchIndex([], "anything")).toBe(-1);
  });
});

describe("highlightSegments", () => {
  it("marks the matched run, case-insensitively", () => {
    expect(highlightSegments("Pakistani Kurta", "kur")).toEqual([
      { text: "Pakistani ", match: false },
      { text: "Kur", match: true },
      { text: "ta", match: false },
    ]);
  });

  it("returns the label unmarked for an empty query", () => {
    expect(highlightSegments("Gown", "")).toEqual([{ text: "Gown", match: false }]);
  });

  it("treats regex characters in the query literally", () => {
    expect(() => highlightSegments("3 Piece Set", "3 (")).not.toThrow();
  });
});
