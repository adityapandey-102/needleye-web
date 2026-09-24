import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_GROUPS,
  type ProductCategoryEntry,
  type ProductCategoryGroup,
} from "../constants/productCategories";

export interface CategoryGroupResult {
  group: ProductCategoryGroup;
  label: string;
  categories: ProductCategoryEntry[];
}

/** Lower-cased, letters and digits only -- so "Jump Suit", "jumpsuit" and "jump-suit" all compare equal. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokensOf(query: string): string[] {
  return query.split(/\s+/).map(normalize).filter(Boolean);
}

/**
 * Filters the catalogue for the category picker, grouped by collection in
 * catalogue order (empty collections dropped).
 *
 * Every whitespace-separated word of the query must appear in the category's
 * label OR its collection's name, compared ignoring case, spaces, and
 * punctuation. So "jumpsuit" finds "Jump Suit", "mens shirt" finds only the
 * Mens Wear shirt, and a collection name on its own ("mens", "upper") lists that
 * whole collection. Within a collection, labels that START with the query come
 * first, then labels containing it, then collection-only matches; ties keep
 * catalogue order. An empty query returns the full catalogue.
 */
export function searchProductCategories(query: string): CategoryGroupResult[] {
  const tokens = tokensOf(query);
  const whole = tokens.join("");

  return PRODUCT_CATEGORY_GROUPS.map((g) => {
    const groupText = normalize(g.label);
    const inGroup = PRODUCT_CATEGORIES.filter((c) => c.group === g.value);

    if (tokens.length === 0) return { group: g.value, label: g.label, categories: [...inGroup] };

    const rank = (c: ProductCategoryEntry): number => {
      const label = normalize(c.label);
      if (label.startsWith(whole)) return 0;
      if (label.includes(whole)) return 1;
      return 2;
    };
    const matches = inGroup
      .filter((c) => {
        const label = normalize(c.label);
        return tokens.every((t) => label.includes(t) || groupText.includes(t));
      })
      .map((c, index) => ({ c, index, rank: rank(c) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((m) => m.c);

    return { group: g.value, label: g.label, categories: matches };
  }).filter((g) => g.categories.length > 0);
}

/**
 * Index (in `categories`' order) of the single best match for `query` -- what
 * Enter should pick when the user hasn't highlighted anything. An EXACT label
 * match wins, then a label starting with the query, then one containing it,
 * ties going to the earlier entry; -1 if `categories` is empty.
 *
 * Needed because the grouped results keep collections in a fixed order: for
 * "saree", Upper Body's "Saree Blouse" is listed first, but someone who typed
 * "saree" and pressed Enter meant "Saree".
 */
export function bestMatchIndex(categories: readonly ProductCategoryEntry[], query: string): number {
  const whole = tokensOf(query).join("");
  const score = (c: ProductCategoryEntry): number => {
    const label = normalize(c.label);
    if (label === whole) return 0;
    if (label.startsWith(whole)) return 1;
    if (label.includes(whole)) return 2;
    return 3;
  };
  let best = -1;
  let bestScore = Infinity;
  categories.forEach((c, i) => {
    const s = score(c);
    if (s < bestScore) {
      best = i;
      bestScore = s;
    }
  });
  return best;
}

/** Total number of categories across a grouped result. */
export function countCategories(groups: CategoryGroupResult[]): number {
  return groups.reduce((sum, g) => sum + g.categories.length, 0);
}

/**
 * Splits `label` into plain and matched runs for highlighting: every query word
 * found literally in the label (case-insensitive) is marked. A match the search
 * only made by ignoring spaces ("jumpsuit" vs "Jump Suit") isn't highlighted --
 * the label is still shown, just without emphasis.
 */
export function highlightSegments(label: string, query: string): { text: string; match: boolean }[] {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return [{ text: label, match: false }];

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return label
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: words.some((w) => new RegExp(`^${w}$`, "i").test(part)) }));
}
