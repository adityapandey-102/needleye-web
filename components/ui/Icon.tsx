import type { ReactNode } from "react";

/**
 * Premium line-icon set — hand-inlined SVGs (Feather/Lucide-style, MIT paths),
 * no runtime dependency. Icons render in `currentColor` so they inherit the
 * surrounding text/tint colour, and share one 24×24 stroke grid for visual
 * consistency across the whole app.
 *
 * Most surfaces (CardHeader, the sidebar nav, stat cards) already carry an
 * emoji string, so `Icon` also resolves an emoji → the matching line icon via
 * EMOJI_MAP. That lets the app upgrade every icon at once without rewriting
 * every call site; an unmapped emoji simply falls back to rendering itself.
 */
export type IconName =
  | "package"
  | "calendar"
  | "hammer"
  | "needle"
  | "check"
  | "clock"
  | "alert"
  | "card"
  | "wallet"
  | "cart"
  | "bar-chart"
  | "trending-up"
  | "users"
  | "user"
  | "shield"
  | "receipt"
  | "briefcase"
  | "search"
  | "image"
  | "wrench"
  | "edit"
  | "palette"
  | "shirt"
  | "factory"
  | "qr"
  | "clipboard"
  | "list"
  | "sparkles"
  | "printer"
  | "columns"
  | "settings"
  | "hand"
  | "home"
  | "download"
  | "chevron-right"
  | "history"
  | "key"
  | "refresh"
  | "ban"
  | "eye"
  | "scissors";

const PATHS: Record<IconName, ReactNode> = {
  package: (
    <>
      <path d="M16.5 9.4 7.5 4.2" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  calendar: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </>
  ),
  hammer: (
    <>
      <path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" />
      <path d="M17.6 15 22 10.6" />
      <path d="m20.9 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16 4.6A5.56 5.56 0 0 0 12.07 3H9l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h.86c.85 0 1.65.33 2.25.93l1.25 1.25" />
    </>
  ),
  needle: (
    <>
      <path d="M3.5 20.5 20 4" />
      <path d="M14 6.5 17.5 10" />
      <circle cx="5.5" cy="18.5" r="1.6" />
    </>
  ),
  check: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  card: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2.5" />
      <path d="M2 10h20" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M17.5 12.5a1 1 0 0 0 0 2H21v-2Z" />
    </>
  ),
  cart: (
    <>
      <circle cx="8" cy="21" r="1.2" />
      <circle cx="18" cy="21" r="1.2" />
      <path d="M2.5 3h2l2.5 12.5a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.77-1.43L21 7H6" />
    </>
  ),
  "bar-chart": (
    <>
      <path d="M12 20V9M18 20V4M6 20v-5" />
    </>
  ),
  "trending-up": (
    <>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  briefcase: (
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2.5" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  palette: (
    <>
      <circle cx="13.5" cy="6.5" r=".6" />
      <circle cx="17.5" cy="10.5" r=".6" />
      <circle cx="8.5" cy="7.5" r=".6" />
      <circle cx="6.5" cy="12.5" r=".6" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10a1.7 1.7 0 0 0 1.6-2.4c-.4-.7-.2-1.6.5-2 .3-.2.7-.3 1.1-.3H18a4 4 0 0 0 4-4c0-5.5-4.5-9.3-10-9.3Z" />
    </>
  ),
  shirt: (
    <path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47A2 2 0 0 0 20.4 3.5Z" />
  ),
  factory: (
    <>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h.01M12 18h.01M7 18h.01" />
    </>
  ),
  qr: (
    <>
      <rect width="6" height="6" x="3" y="3" rx="1" />
      <rect width="6" height="6" x="15" y="3" rx="1" />
      <rect width="6" height="6" x="3" y="15" rx="1" />
      <path d="M15 15h2v2h-2zM19 15h2M21 19v2M15 19v2h2M19 21h2" />
    </>
  ),
  clipboard: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  sparkles: (
    <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z" />
  ),
  printer: (
    <>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" rx="1" />
    </>
  ),
  columns: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  hand: (
    <>
      <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </>
  ),
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  history: (
    <>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8.3-8.3M17 6l2 2M15 8l1.5 1.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </>
  ),
};

/** Emoji currently used across the app → its line-icon replacement. */
const EMOJI_MAP: Record<string, IconName> = {
  "📦": "package",
  "📅": "calendar",
  "🗓": "calendar",
  "🔨": "hammer",
  "🧵": "needle",
  "✅": "check",
  "⏰": "clock",
  "🕓": "history",
  "⚠": "alert",
  "💳": "card",
  "💰": "wallet",
  "🛒": "cart",
  "📊": "bar-chart",
  "📈": "trending-up",
  "👥": "users",
  "👤": "user",
  "🛡": "shield",
  "🧾": "receipt",
  "🧑‍💼": "briefcase",
  "🔎": "search",
  "🖼": "image",
  "🔧": "wrench",
  "🛠": "wrench",
  "📝": "edit",
  "👩‍🎨": "palette",
  "👗": "shirt",
  "🏭": "factory",
  "📱": "qr",
  "📌": "clipboard",
  "📋": "list",
  "✦": "sparkles",
  "🏷": "printer",
  "🖨": "printer",
  "🗂": "columns",
  "⚙": "settings",
  "✋": "hand",
  "⬇": "download",
  "›": "chevron-right",
  "🎨": "palette",
  "✂": "scissors",
};

export function Icon({
  name,
  emoji,
  size = 20,
  className = "",
  strokeWidth = 1.75,
}: {
  name?: IconName;
  /** A string to resolve to a line icon: either a canonical icon name (e.g. "bar-chart") or an emoji (e.g. "📊"). Falls back to the emoji itself if unmapped. */
  emoji?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  // Resolve the string: try it as a canonical icon name first, then as an
  // emoji (dropping the VS16 variation selector so "⚠️" matches "⚠", etc.).
  const resolved =
    name ?? (emoji ? (emoji in PATHS ? (emoji as IconName) : EMOJI_MAP[emoji.replace(/️/g, "")]) : undefined);

  if (!resolved) {
    return emoji ? <span className={className}>{emoji}</span> : null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      {PATHS[resolved]}
    </svg>
  );
}
