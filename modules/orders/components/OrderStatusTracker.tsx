import { CANONICAL_STAGES, canonicalLabel, toCanonicalStage, type GranularStatus } from "../../../lib/domain";

const GREEN = "var(--color-success)";
const GRAY = "var(--color-border)";

/**
 * Amazon/delivery-style horizontal order tracker: the 9 canonical production
 * stages as labelled nodes on a line, with a green progress line tracing up to
 * the current stage (done stages get a check, the current one is highlighted,
 * later ones are muted). Position is derived from the current status -- the
 * stages are linear. Scrolls horizontally on small screens; the timestamped
 * "Status History" card below carries the full detailed trail.
 */
export function OrderStatusTracker({ status }: { status: GranularStatus }) {
  const current = toCanonicalStage(status);
  const currentIndex = CANONICAL_STAGES.findIndex((s) => s.value === current);

  return (
    <div className="overflow-x-auto pb-1" role="group" aria-label={`Production progress: ${canonicalLabel(current)}`}>
      <div className="flex min-w-[680px] items-start">
        {CANONICAL_STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const isCurrent = i === currentIndex;
          const reached = i <= currentIndex; // the line leading INTO this node is green once reached
          return (
            <div key={stage.value} className="relative flex flex-1 flex-col items-center">
              {/* connector from the previous node's centre to this node's centre */}
              {i > 0 && (
                <span
                  className="absolute top-[13px] right-1/2 left-[-50%] h-[3px] rounded-full"
                  style={{ background: reached ? GREEN : GRAY }}
                />
              )}
              {/* node */}
              <span
                className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold"
                style={
                  done
                    ? { background: GREEN, borderColor: GREEN, color: "#fff" }
                    : isCurrent
                      ? { background: "var(--color-card)", borderColor: GREEN, color: GREEN, boxShadow: `0 0 0 4px color-mix(in srgb, ${GREEN} 20%, transparent)` }
                      : { background: "var(--color-card)", borderColor: GRAY, color: "var(--color-text-muted)" }
                }
              >
                {done ? "✓" : i + 1}
              </span>
              {/* label */}
              <span
                className={`mt-2 max-w-[74px] px-0.5 text-center text-[10px] leading-tight ${
                  isCurrent ? "font-bold text-text-primary" : done ? "font-medium text-text-secondary" : "text-text-muted"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
