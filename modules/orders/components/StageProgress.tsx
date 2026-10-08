import { GRANULAR_STATUS_VALUES, granularLabel, stageIndex, type GranularStatus } from "../../../lib/domain";

const LAST = GRANULAR_STATUS_VALUES.length - 1;

/** Fill colour by where the order is: oxblood (gold on the dark red) while it's being made, amber in alteration, green once ready. */
function fill(status: GranularStatus, onDark: boolean): string {
  if (status === "ready" || status === "delivered") return onDark ? "bg-(--on-dark-success)" : "bg-success";
  if (status === "alteration") return onDark ? "bg-(--on-dark-warning)" : "bg-warning";
  return onDark ? "gradient-gold" : "bg-primary";
}

/**
 * An order's stage, and how far along the 16-stage flow it is: the stage name
 * over a thin bar that fills as it moves (stage n of 16 in the tooltip).
 * `onDark` for the hero band; `headerClassName` lets a caller hide the name /
 * counter row (e.g. `max-lg:hidden` where it shows them elsewhere).
 */
export function StageProgress({
  status,
  onDark = false,
  headerClassName = "",
}: {
  status: GranularStatus;
  onDark?: boolean;
  headerClassName?: string;
}) {
  const index = stageIndex(status);
  const share = LAST > 0 ? index / LAST : 0;
  return (
    <div title={`Stage ${index + 1} of ${LAST + 1}`}>
      <div className={`flex items-baseline justify-between gap-2 ${headerClassName}`}>
        <span className={`font-medium ${onDark ? "text-[15px] leading-snug text-white" : "truncate text-[12.5px] text-text-primary"}`}>{granularLabel(status)}</span>
        <span className={`shrink-0 text-[10.5px] ${onDark ? "text-white/60" : "text-text-muted"}`}>
          {index + 1}/{LAST + 1}
        </span>
      </div>
      <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${onDark ? "bg-white/15" : "bg-border-light"}`}>
        <div className={`grow-x h-full rounded-full ${fill(status, onDark)}`} style={{ width: `${Math.max(share * 100, 4)}%` }} />
      </div>
    </div>
  );
}
