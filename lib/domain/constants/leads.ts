/** A stage's colour -- a subset of the StatusPill tones (kept here so domain code never imports UI). */
export type LeadTone = "purple" | "pink" | "green" | "amber" | "blue" | "gray" | "gold";

/** Lead stages -- mirror of needleye-api modules/leads/domain/lead.entity.ts. */
export const LEAD_STATUSES = ["new", "assigned", "unattended", "attended", "follow_up", "converted", "lost", "discarded"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["public_form", "walk_in", "phone_call", "instagram", "whatsapp", "referral", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
/** The owner's manual form offers every source except the public form itself. */
export const MANUAL_LEAD_SOURCES = LEAD_SOURCES.filter((s): s is Exclude<LeadSource, "public_form"> => s !== "public_form");

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  assigned: "Assigned",
  unattended: "Unattended",
  attended: "Attended",
  follow_up: "Follow-up",
  converted: "Converted",
  lost: "Lost",
  discarded: "Discarded",
};

/** What each stage means, for the stage picker and the dashboard tooltips. */
export const LEAD_STATUS_HINTS: Record<LeadStatus, string> = {
  new: "Just arrived — not assigned to a designer yet",
  assigned: "Given to a designer — waiting for them to tap Received",
  unattended: "Received by the designer — customer not contacted yet",
  attended: "The designer has spoken to the customer",
  follow_up: "Needs another call or visit",
  converted: "Became an order",
  lost: "Customer isn't going ahead",
  discarded: "Rejected by the owner (spam, fake, duplicate)",
};

export const LEAD_STATUS_TONES: Record<LeadStatus, LeadTone> = {
  new: "blue",
  assigned: "gold",
  unattended: "amber",
  attended: "purple",
  follow_up: "pink",
  converted: "green",
  lost: "gray",
  discarded: "gray",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  public_form: "Enquiry form",
  walk_in: "Walk-in",
  phone_call: "Phone call",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  referral: "Referral",
  other: "Other",
};

/** The stage a button moves a lead to, worded as the action ("Received", "Mark attended", ...). */
export const LEAD_ACTION_LABELS: Partial<Record<LeadStatus, string>> = {
  unattended: "Received",
  attended: "Mark attended",
  follow_up: "Follow-up",
  lost: "Mark lost",
  discarded: "Discard",
  new: "Restore",
};

/** The badge as a short label: 1..99, then "99+". Null when there's nothing to show. */
export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}

/** The browser tab title with the badge in front -- "(3) Needleye" -- or the plain title. */
export function titleWithBadge(baseTitle: string, count: number): string {
  const plain = baseTitle.replace(/^\(\d+\+?\)\s*/, "");
  const label = badgeLabel(count);
  return label ? `(${label}) ${plain}` : plain;
}

/** A WhatsApp chat link for an Indian mobile stored as 10 digits. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}`;
}
