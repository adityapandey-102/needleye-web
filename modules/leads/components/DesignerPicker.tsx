"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DesignerChoice } from "../../../lib/domain";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { leadsApi } from "../api/leadsApi";
import { Input } from "../../../components/ui/Field";
import { Icon } from "../../../components/ui/Icon";

const MATCHES = 8;

/**
 * Pick a designer by typing part of their name -- never a dropdown of the
 * whole team. The search is debounced and the API returns at most 8 matches
 * (GET /team-members?role=designer&q=&limit=8), so it costs the same with 10
 * designers or 300. Keyboard: arrows to move, Enter to pick, Esc to close.
 */
export function DesignerPicker({
  value,
  onChange,
  id,
  placeholder = "Type a designer's name",
  ariaLabel,
  className = "",
}: {
  value: DesignerChoice | null;
  onChange: (designer: DesignerChoice | null) => void;
  /** The input's id (for a <label htmlFor>). */
  id?: string;
  placeholder?: string;
  /** When there's no visible label. */
  ariaLabel?: string;
  className?: string;
}) {
  const ownId = useId();
  const inputId = id ?? `${ownId}-input`;
  const listId = `${ownId}-list`;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<DesignerChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = () => {
      setLoading(true);
      leadsApi
        .searchDesigners(debounced, MATCHES)
        .then((list) => {
          if (!cancelled) {
            setMatches(list);
            setActive(0);
          }
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  // Close when focus or a click leaves the picker.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(d: DesignerChoice) {
    onChange(d);
    setText("");
    setOpen(false);
  }

  if (value) {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-app-sm border border-border bg-card px-3 py-2 text-sm ${className}`}>
        <span className="truncate font-medium text-text-primary">{value.fullName}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-0.5 text-text-muted hover:bg-app-bg hover:text-text-primary"
          aria-label={`Clear ${value.fullName}`}
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Input
        id={inputId}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-app-sm border border-border bg-card py-1 shadow-app-lg"
        >
          {loading && matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">Searching…</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">No designer matches “{debounced}”</li>
          ) : (
            matches.map((d, i) => (
              <li
                key={d.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(d);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-primary-bg text-text-primary" : "text-text-secondary"}`}
              >
                {d.fullName}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
