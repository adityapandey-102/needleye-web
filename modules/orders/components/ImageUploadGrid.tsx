"use client";

import { useRef } from "react";

export interface ImageSlotState {
  url?: string;
  uploading?: boolean;
}

export function ImageUploadGrid({
  images,
  onSelect,
  onRemove,
  disabled,
}: {
  images: Record<1 | 2 | 3 | 4, ImageSlotState | undefined>;
  onSelect: (slot: 1 | 2 | 3 | 4, file: File) => void;
  onRemove: (slot: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const slots: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {slots.map((slot) => {
        const state = images[slot];
        return (
          <div
            key={slot}
            onClick={() => !disabled && !state?.uploading && inputRefs.current[slot]?.click()}
            className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-app-sm border-2 border-dashed border-border transition-colors ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary"
            } ${state?.url ? "border-solid" : ""}`}
          >
            <input
              ref={(el) => {
                inputRefs.current[slot] = el;
              }}
              type="file"
              accept="image/*"
              disabled={disabled}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSelect(slot, file);
                e.target.value = "";
              }}
            />

            {state?.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URLs, not a static asset */}
                <img src={state.url} alt={`Reference ${slot}`} className="absolute inset-0 h-full w-full object-cover" />
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(slot);
                    }}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-text-muted">
                <span className="text-xl">📷</span>
                <span className="text-[11px]">Image {slot}</span>
              </div>
            )}

            {state?.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-text-secondary">
                Uploading…
              </div>
            )}

            <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 text-[10px] text-white">{slot}</div>
          </div>
        );
      })}
    </div>
  );
}
