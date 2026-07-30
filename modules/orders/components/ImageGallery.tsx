"use client";

import { useState } from "react";
import type { OrderImage } from "../../../lib/domain";

/**
 * Reference-image gallery for the order detail page. Built to be
 * mobile-robust: every tile is a fixed-aspect (square), overflow-hidden,
 * min-w-0 grid cell with a background placeholder, and the image is absolutely
 * positioned to fill it with object-cover -- so a tile can never collapse,
 * overlap, or overflow its container regardless of the source image's
 * dimensions or screen size. A failed load (e.g. an unreachable signed URL)
 * degrades to a clear placeholder instead of a broken/collapsed image.
 */
export function ImageGallery({ images }: { images: OrderImage[] }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  if (images.length === 0) {
    return <p className="text-xs text-text-muted">No reference images uploaded.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((img) => (
        <a
          key={img.id}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-square min-w-0 overflow-hidden rounded-app-sm border border-border bg-primary-bg/40"
        >
          {failed[img.id] ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-muted">
              <span className="text-xl">🖼️</span>
              <span className="text-[10px]">Image {img.slot}</span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static asset */
            <img
              src={img.url}
              alt={`Reference ${img.slot}`}
              loading="lazy"
              onError={() => setFailed((f) => ({ ...f, [img.id]: true }))}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 text-[10px] text-white">{img.slot}</span>
        </a>
      ))}
    </div>
  );
}
