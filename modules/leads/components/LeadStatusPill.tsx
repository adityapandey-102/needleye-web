import { LEAD_STATUS_HINTS, LEAD_STATUS_LABELS, LEAD_STATUS_TONES, type LeadStatus } from "../../../lib/domain";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Icon } from "../../../components/ui/Icon";

export function LeadStatusPill({ status }: { status: LeadStatus }) {
  return (
    <span title={LEAD_STATUS_HINTS[status]}>
      <StatusPill label={LEAD_STATUS_LABELS[status]} tone={LEAD_STATUS_TONES[status]} />
    </span>
  );
}

/** "Urgent" -- a repeat enquiry nobody has contacted yet. */
export function UrgentTag({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-app-sm bg-danger-strong px-1.5 py-0.5 text-[11px] font-semibold text-white"
      title="The customer enquired again — contact them first"
    >
      <Icon name="flame" size={12} />
      {!compact && "Urgent"}
    </span>
  );
}
