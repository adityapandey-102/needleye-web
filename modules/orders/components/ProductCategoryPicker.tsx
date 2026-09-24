"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_GROUPS,
  bestMatchIndex,
  highlightSegments,
  productCategoryGroup,
  productCategoryGroupLabel,
  productCategoryLabel,
  searchProductCategories,
  type ProductCategoryGroup,
} from "../../../lib/domain";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { Icon } from "../../../components/ui/Icon";
import { Modal } from "../../../components/ui/Modal";

const GROUP_SIZES = new Map<ProductCategoryGroup, number>(
  PRODUCT_CATEGORY_GROUPS.map((g) => [g.value, PRODUCT_CATEGORIES.filter((c) => c.group === g.value).length]),
);

/**
 * The product-category field on the order form. The catalogue is 43 categories
 * in 6 collections -- too many for a <select> -- so the field opens a catalogue
 * dialog: browse a collection from the rail (chips on a phone), or search
 * everything at once. Search is debounced and forgiving (see
 * searchProductCategories: "jumpsuit" finds "Jump Suit", "mens shirt" finds only
 * the Mens Wear one).
 *
 * Keyboard: the search box is an ARIA combobox driving the results listbox --
 * while searching, the best match (exact label first) is pre-highlighted so
 * Enter's target is always visible; Up/Down move, Enter picks, Escape closes. The value stored is always the category's
 * `value` ("mens_shirt"); the label is only ever shown.
 */
export function ProductCategoryPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const listboxId = `${uid}-listbox`;
  const optionId = (v: string) => `${uid}-opt-${v}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [browseGroup, setBrowseGroup] = useState<ProductCategoryGroup>("upper_body");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce typing, but apply a CLEARED box at once -- waiting 200ms to show
  // the collection again after deleting the query just feels broken.
  const debounced = useDebouncedValue(query, 200);
  const effectiveQuery = query.trim() === "" ? "" : debounced;
  const searching = effectiveQuery.trim() !== "";

  const results = useMemo(
    () =>
      searching
        ? searchProductCategories(effectiveQuery)
        : searchProductCategories("").filter((g) => g.group === browseGroup),
    [searching, effectiveQuery, browseGroup],
  );
  const flat = useMemo(() => results.flatMap((g) => g.categories), [results]);
  /** Position of each visible category in the keyboard order (results are grouped, the order is flat). */
  const flatIndexOf = useMemo(() => new Map(flat.map((c, i) => [c.value, i])), [flat]);
  const matchCounts = useMemo(() => new Map(results.map((g) => [g.group, g.categories.length])), [results]);
  // While searching, the best match is highlighted by default, so Enter's
  // target is always visible (typing "saree" lights up Saree, not the Saree
  // Blouse listed above it). Arrow keys / hover then take over. Clamped rather
  // than reset in an effect: results change a beat after typing (debounce).
  const bestIndex = useMemo(() => (searching ? bestMatchIndex(flat, effectiveQuery) : -1), [searching, flat, effectiveQuery]);
  const active = activeIndex >= 0 && activeIndex < flat.length ? activeIndex : bestIndex;
  const activeValue = active >= 0 ? flat[active]?.value : undefined;

  useEffect(() => {
    if (activeValue) document.getElementById(optionId(activeValue))?.scrollIntoView({ block: "nearest" });
    // optionId is a pure function of the stable useId() value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue]);

  const selectedGroup = productCategoryGroup(value);

  function openPicker() {
    setQuery("");
    setActiveIndex(-1);
    setBrowseGroup(selectedGroup ?? "upper_body");
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  function browse(group: ProductCategoryGroup) {
    setBrowseGroup(group);
    setQuery("");
    setActiveIndex(-1);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length > 0) setActiveIndex(active < 0 ? 0 : Math.min(active + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length > 0) setActiveIndex(active <= 0 ? 0 : active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = active >= 0 ? flat[active] : undefined;
      if (pick) choose(pick.value);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          value ? `Product category: ${productCategoryLabel(value)}. Change category` : "Choose a product category"
        }
        className="group flex w-full items-center justify-between gap-3 rounded-app-sm border border-border bg-card px-3 py-2.5 text-left text-sm outline-none transition-all hover:border-gold/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value ? (
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium text-text-primary">{productCategoryLabel(value)}</span>
            {selectedGroup && (
              <span className="shrink-0 text-[11px] tracking-wide text-text-muted uppercase">
                {productCategoryGroupLabel(selectedGroup)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-text-muted">Choose a category</span>
        )}
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
          {value ? "Change" : "Browse"}
          <Icon name="chevron-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={titleId}
        initialFocusRef={searchRef}
        panelClassName="h-[88vh] sm:h-[min(640px,86vh)] sm:max-w-3xl"
      >
        {/* Header + search */}
        <div className="border-b border-border-light px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">Product category</p>
              <h2 id={titleId} className="mt-1 font-serif text-xl font-bold text-text-primary">
                Choose from the catalogue
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-app-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:outline-none"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="relative mt-4">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeValue ? optionId(activeValue) : undefined}
              aria-label="Search categories"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={`Search ${PRODUCT_CATEGORIES.length} categories`}
              className="h-11 w-full rounded-app border border-border bg-app-bg/50 pr-10 pl-10 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-primary focus:bg-card focus:ring-2 focus:ring-gold/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(-1);
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:bg-border-light hover:text-text-primary"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Collections: chips on a phone */}
        <div className="flex gap-2 overflow-x-auto border-b border-border-light px-5 py-3 sm:hidden">
          {PRODUCT_CATEGORY_GROUPS.map((g) => {
            const current = !searching && browseGroup === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => browse(g.value)}
                aria-pressed={current}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  current
                    ? "border-primary bg-primary-bg font-semibold text-primary"
                    : "border-border text-text-secondary hover:border-gold/60"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Collections: rail on desktop */}
          <nav aria-label="Collections" className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-light bg-app-bg/40 p-3 sm:flex">
            <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-[0.16em] text-text-muted uppercase">
              Collections
            </p>
            {PRODUCT_CATEGORY_GROUPS.map((g) => {
              const current = !searching && browseGroup === g.value;
              const count = searching ? (matchCounts.get(g.value) ?? 0) : (GROUP_SIZES.get(g.value) ?? 0);
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => browse(g.value)}
                  aria-pressed={current}
                  className={`relative flex items-center justify-between rounded-app-sm px-3 py-2 text-left text-sm transition-colors ${
                    current
                      ? "bg-card font-semibold text-primary shadow-app"
                      : searching && count === 0
                        ? "text-text-muted/60 hover:text-text-secondary"
                        : "text-text-secondary hover:bg-card/70 hover:text-text-primary"
                  }`}
                >
                  {current && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" />}
                  <span className="truncate">{g.label}</span>
                  <span className="ml-2 shrink-0 text-xs text-text-muted tabular-nums">{count}</span>
                </button>
              );
            })}
          </nav>

          {/* Results */}
          <div id={listboxId} role="listbox" aria-label="Categories" className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {results.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Icon name="search" size={28} className="text-border" />
                <p className="mt-3 font-serif text-lg font-bold text-text-primary">
                  No category matches &ldquo;{query.trim()}&rdquo;
                </p>
                <p className="mt-1 text-sm text-text-muted">Check the spelling, or browse a collection instead.</p>
                <button
                  type="button"
                  onClick={() => browse(browseGroup)}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              results.map((g) => {
                const headingId = `${uid}-group-${g.group}`;
                return (
                  <div key={g.group} role="group" aria-labelledby={headingId} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-baseline justify-between border-b border-border-light pb-2">
                      <h3 id={headingId} className="font-serif text-base font-bold text-text-primary">
                        {g.label}
                      </h3>
                      <span className="text-xs text-text-muted">
                        {g.categories.length} {g.categories.length === 1 ? "category" : "categories"}
                      </span>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {g.categories.map((c) => {
                        const index = flatIndexOf.get(c.value) ?? -1;
                        const isSelected = c.value === value;
                        const isActive = index === active;
                        return (
                          <div
                            key={c.value}
                            id={optionId(c.value)}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => choose(c.value)}
                            onMouseEnter={() => setActiveIndex(index)}
                            // Highlighted = the rail's own language: a warm tint + a straight
                            // gold bar on the left. (An outline read as an empty input.)
                            className={`relative flex cursor-pointer items-center justify-between gap-2 rounded-app-sm px-3 py-2.5 text-sm transition-colors ${
                              isActive ? "bg-gold-soft/45" : "hover:bg-primary-bg/70"
                            } ${isSelected ? "font-semibold text-primary" : "text-text-primary"}`}
                          >
                            {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" />}
                            <span className="truncate">
                              {highlightSegments(c.label, searching ? effectiveQuery : "").map((seg, i) =>
                                seg.match ? (
                                  <mark key={i} className="rounded-sm bg-gold-soft px-px text-inherit">
                                    {seg.text}
                                  </mark>
                                ) : (
                                  <span key={i}>{seg.text}</span>
                                ),
                              )}
                            </span>
                            {isSelected && <Icon name="check" size={16} className="shrink-0 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-light bg-app-bg/40 px-5 py-2.5 text-[11px] text-text-muted sm:px-6">
          <span aria-live="polite">
            {searching
              ? `${flat.length} ${flat.length === 1 ? "match" : "matches"}`
              : `${PRODUCT_CATEGORIES.length} categories · ${PRODUCT_CATEGORY_GROUPS.length} collections`}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move <span className="text-border">·</span> <Kbd>Enter</Kbd> select{" "}
            <span className="text-border">·</span> <Kbd>Esc</Kbd> close
          </span>
        </div>
      </Modal>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card px-1.5 py-px font-sans text-[10px] text-text-secondary">
      {children}
    </kbd>
  );
}
