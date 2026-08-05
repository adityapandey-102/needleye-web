"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Needleye brand mark. Renders the boutique's logo from
 * `public/Needleye-logo.png`; if that file isn't present it degrades to a
 * tasteful burgundy "N" monogram so the UI always looks finished. Drop the
 * real logo at `needleye-web/public/Needleye-logo.png` to activate it.
 */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const box = { width: size, height: size };

  // The <img> is server-rendered, so a 404 can fire its error event *before*
  // React hydrates and attaches onError. Re-check once mounted: a broken image
  // is `complete` with zero natural width.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div
        className={`gradient-primary flex items-center justify-center rounded-app font-serif font-bold text-gold-light shadow-primary ${className}`}
        style={{ ...box, fontSize: size * 0.5 }}
        aria-label="Needleye"
      >
        N
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand asset from /public; a plain <img> is needed for the onError monogram fallback
    <img
      ref={imgRef}
      src="/Needleye-logo.png"
      alt="Needleye"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-app object-cover ${className}`}
      style={box}
    />
  );
}
