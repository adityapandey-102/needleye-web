"use client";

import { Input } from "../../../components/ui/Field";
import { Icon } from "../../../components/ui/Icon";

/**
 * The search box over a focused order list (a dashboard figure's orders,
 * Pending payments): customer name, bill number or order ID -- the same
 * search as All orders, searched by the server. The caller debounces the
 * value (useDebouncedValue) and resets to page 1 when it changes.
 */
export function OrderSearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="border-b border-border-light px-5 py-3.5">
      <div className="relative sm:max-w-md">
        <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
        <Input
          className="w-full pr-9 pl-9"
          placeholder="Search customer, bill number, or order ID"
          aria-label="Search these orders"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
