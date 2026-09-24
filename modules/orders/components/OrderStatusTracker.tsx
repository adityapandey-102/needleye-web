import { ALARMING_STATUS, CANONICAL_STAGES, canonicalLabel, stageIndex, toCanonicalStage, type GranularStatus } from "../../../lib/domain";
import { Icon } from "../../../components/ui/Icon";

const GREEN = "var(--color-success)";
const GRAY = "var(--color-border)";
const RED = "var(--color-error)";

type NodeState = { done: boolean; isCurrent: boolean; alarming: boolean };

/** The circle's fill/border/glow, shared by the desktop bar and the mobile list. */
function circleStyle({ done, isCurrent, alarming }: NodeState): React.CSSProperties {
  if (alarming) return { background: RED, borderColor: RED, color: "#fff" };
  if (done) return { background: GREEN, borderColor: GREEN, color: "#fff" };
  if (isCurrent)
    return {
      background: "var(--color-card)",
      borderColor: GREEN,
      color: GREEN,
      boxShadow: `0 0 0 4px color-mix(in srgb, ${GREEN} 22%, transparent)`,
    };
  return { background: "var(--color-card)", borderColor: GRAY, color: "var(--color-text-muted)" };
}

/** The label's colour/weight, shared by both layouts. */
function labelClass({ done, isCurrent, alarming }: NodeState): string {
  if (alarming) return "font-bold text-error";
  if (isCurrent) return "font-bold text-text-primary";
  if (done) return "font-medium text-text-secondary";
  return "text-text-muted";
}

/**
 * The 14-stage production progress, forward-only.
 *
 * - Desktop / tablet (>= sm): a connected, horizontal progress bar. A green
 *   line traces through the completed stages up to the current one; each stage
 *   is a numbered node with its label. It WRAPS onto the next line when the
 *   stages don't fit (never a horizontal scrollbar). The wrapper clips the
 *   connector that would dangle at the left of each wrapped row.
 * - Mobile (< sm): a collapsible dropdown. Collapsed, it shows only the CURRENT
 *   stage; tapping it expands the full stage list as a VERTICAL connected
 *   tracker. Uses a native <details> so this stays a server component (no JS).
 *
 * The Alteration stage, when current, renders red with an alarming ripple to
 * flag that the order needs rework attention.
 */
export function OrderStatusTracker({ status }: { status: GranularStatus }) {
  const current = toCanonicalStage(status);
  const currentIndex = stageIndex(current);
  const stepLabel = `Step ${currentIndex + 1} of ${CANONICAL_STAGES.length}`;

  return (
    <div role="group" aria-label={`Production progress: ${canonicalLabel(current)} (${stepLabel})`}>
      {/* ---------- Desktop / tablet: one continuous connected bar ---------- */}
      {/* The rail is drawn as two half-segments per node (left half = incoming,
          right half = outgoing) that meet at each column boundary, so a row is
          one unbroken line. Crucially the outgoing half of a row's LAST node
          runs to the right edge and the incoming half of the next row's FIRST
          node starts at the left edge -- so when the flow wraps, the line exits
          right and re-enters left (like wrapped text) instead of the rows
          reading as two separate bars. Works at any column count. */}
      <div className="hidden overflow-hidden sm:block">
        <div className="grid grid-cols-5 gap-y-4 lg:grid-cols-7">
          {CANONICAL_STAGES.map((stage, i) => {
            const state: NodeState = { done: i < currentIndex, isCurrent: i === currentIndex, alarming: i === currentIndex && stage.value === ALARMING_STATUS };
            const isFirst = i === 0;
            const isLast = i === CANONICAL_STAGES.length - 1;
            const leftGreen = i <= currentIndex; // segment entering this node
            const rightGreen = i + 1 <= currentIndex; // segment leaving toward the next

            return (
              <div key={stage.value} className="relative flex flex-col items-center px-0.5">
                <div className="relative flex h-7 w-full items-center justify-center">
                  {/* incoming (left) half of the rail */}
                  {!isFirst && (
                    <span className="absolute top-1/2 right-1/2 left-0 h-[2.5px] -translate-y-1/2" style={{ background: leftGreen ? GREEN : GRAY }} />
                  )}
                  {/* outgoing (right) half of the rail */}
                  {!isLast && (
                    <span className="absolute top-1/2 right-0 left-1/2 h-[2.5px] -translate-y-1/2" style={{ background: rightGreen ? GREEN : GRAY }} />
                  )}
                  <span
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${state.alarming ? "alarm-ripple" : state.isCurrent ? "current-pulse" : ""}`}
                    style={circleStyle(state)}
                  >
                    {state.done ? <Icon name="check" size={14} strokeWidth={2.75} /> : i + 1}
                  </span>
                </div>
                <span className={`mt-1.5 max-w-[92px] text-center text-[10px] leading-tight ${labelClass(state)}`}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Mobile: collapsible vertical tracker ---------- */}
      <details className="group rounded-app-sm border border-border-light sm:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          {(() => {
            const state: NodeState = { done: false, isCurrent: true, alarming: current === ALARMING_STATUS };
            return (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${state.alarming ? "alarm-ripple" : state.isCurrent ? "current-pulse" : ""}`}
                style={circleStyle(state)}
              >
                {currentIndex + 1}
              </span>
            );
          })()}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-text-muted">{stepLabel}</span>
            <span className={`block truncate text-sm ${current === ALARMING_STATUS ? "font-bold text-error" : "font-bold text-text-primary"}`}>
              {canonicalLabel(current)}
            </span>
          </span>
          {/* Chevron rotates when open. */}
          <svg
            className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>

        <ol className="border-t border-border-light px-3 py-2">
          {CANONICAL_STAGES.map((stage, i) => {
            const state: NodeState = { done: i < currentIndex, isCurrent: i === currentIndex, alarming: i === currentIndex && stage.value === ALARMING_STATUS };
            const topGreen = i <= currentIndex; // segment above this node
            const bottomGreen = i + 1 <= currentIndex; // segment below this node
            const isFirst = i === 0;
            const isLast = i === CANONICAL_STAGES.length - 1;

            return (
              <li key={stage.value} className="flex gap-3">
                {/* Left rail: vertical tracing line + node circle. */}
                <div className="relative flex w-8 shrink-0 flex-col items-center">
                  <span className="absolute top-0 h-1/2 w-[3px] rounded-full" style={{ background: isFirst ? "transparent" : topGreen ? GREEN : GRAY }} />
                  <span className="absolute bottom-0 h-1/2 w-[3px] rounded-full" style={{ background: isLast ? "transparent" : bottomGreen ? GREEN : GRAY }} />
                  <span
                    className={`relative z-10 my-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${state.alarming ? "alarm-ripple" : state.isCurrent ? "current-pulse" : ""}`}
                    style={circleStyle(state)}
                  >
                    {state.done ? <Icon name="check" size={14} strokeWidth={2.75} /> : i + 1}
                  </span>
                </div>
                <span className={`flex min-h-10 items-center py-1 text-sm leading-tight ${labelClass(state)}`}>{stage.label}</span>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
