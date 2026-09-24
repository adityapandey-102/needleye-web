import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_VALUES, productCategoryDisplayName, productCategoryLabel } from "./productCategories";

describe("product catalogue", () => {
  it("has 47 unique values, including a Custom entry in every collection", () => {
    expect(PRODUCT_CATEGORIES).toHaveLength(47);
    expect(new Set(PRODUCT_CATEGORY_VALUES).size).toBe(47);
    const customGroups = new Set(PRODUCT_CATEGORIES.filter((c) => c.label.startsWith("Custom")).map((c) => c.group));
    expect(customGroups.size).toBe(6);
  });

  it("uses the business's labels: Divided Skirt, Plazo, Peticoat", () => {
    expect(productCategoryLabel("divided_skirt")).toBe("Divided Skirt");
    expect(productCategoryLabel("palazzo")).toBe("Plazo");
    expect(productCategoryLabel("petticoat")).toBe("Peticoat");
  });

  it("names a repeated label with its collection, and leaves unique labels alone", () => {
    expect(productCategoryDisplayName("mens_shirt")).toBe("Shirt (Mens Wear)");
    expect(productCategoryDisplayName("shirt")).toBe("Shirt (Upper Body)");
    expect(productCategoryDisplayName("mens_skirt")).toBe("Skirt (Mens Wear)");
    expect(productCategoryDisplayName("skirt")).toBe("Skirt (Lower Body)");
    expect(productCategoryDisplayName("pant")).toBe("Pant (Lower Body)");
    expect(productCategoryDisplayName("saree")).toBe("Saree");
    expect(productCategoryDisplayName("unknown_value")).toBe("unknown_value");
  });
});
