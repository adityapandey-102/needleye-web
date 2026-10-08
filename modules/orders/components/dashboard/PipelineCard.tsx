import Link from "next/link";
import { percentLabel, pipelineSegments, type PipelineKey, type PipelineSegment } from "../../../../lib/domain";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Icon } from "../../../../components/ui/Icon";
import { CountUp } from "../../../../components/ui/CountUp";

/** One brand ramp, in flow order: light rose -> deep wine, and gold once ready. */
const COLOR: Record<PipelineKey, string> = {
  design: "bg-[#dcbcc3]",
  received: "bg-primary-light",
  production: "bg-[#a2445e]",
  checks: "bg-primary",
  ready: "bg-gold-light",
};

/** What each step holds, in a few words. */
const NOTE: Record<PipelineKey, string> = {
  design: "Pending · Approved",
  received: "With the production manager",
  production: "Falls / Kutchu → Finishing",
  checks: "Quality check · Alteration",
  ready: "Awaiting pickup",
};

/** Where a step leads, when there's a list for it. */
const LINK: Partial<Record<PipelineKey, string>> = {
  production: "/orders/bucket/production",
  ready: "/orders/bucket/ready",
};

/**
 * Where every order in progress is right now, as the flow it moves through: a
 * numbered stepper, one row per step -- what it holds, how many, and its share
 * on one common scale -- with the step holding the most orders (the bottleneck)
 * in the brand red with the gold outline.
 */
export function PipelineCard({ pipeline, active, className = "" }: { pipeline: Record<PipelineKey, number>; active: number; className?: string }) {
  const segments = pipelineSegments(pipeline);
  const shown = segments.filter((s) => s.count > 0);
  const bottleneck = shown.length > 1 ? shown.reduce((best, s) => (s.count > best.count ? s : best)) : null;

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader
        icon={<Icon name="layers" size={17} />}
        title="Production pipeline"
        subtitle={`${active.toLocaleString("en-IN")} orders in progress`}
        action={
          // Not on phones: there it would need a line of its own, and the "On the floor" step opens the same list.
          <Link href="/orders/bucket/production" className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex">
            In production <Icon name="chevron-right" size={13} />
          </Link>
        }
      />
      <ol className="stagger-in flex flex-1 flex-col justify-center gap-1.5 px-4 py-4 sm:px-5">
        {segments.map((s, i) => (
          <Step key={s.key} segment={s} step={i + 1} first={i === 0} last={i === segments.length - 1} highlight={bottleneck?.key === s.key} />
        ))}
      </ol>
    </Card>
  );
}

/*
 * The thread the steps hang on, drawn per step so it always meets the badge
 * centres exactly, whatever each row's height or the card's padding: from the
 * middle of the gap above (gap-1.5 = 6px, so 3px up) down to this badge's
 * centre, and from the centre down to the middle of the gap below. x = the
 * row's px-2.5 (10px) + half the 28px badge (14px) - half the 1px line.
 */
const THREAD = "pointer-events-none absolute left-[23.5px] w-px bg-border";

function Step({
  segment: s,
  step,
  first,
  last,
  highlight,
}: {
  segment: PipelineSegment;
  step: number;
  first: boolean;
  last: boolean;
  highlight: boolean;
}) {
  const href = LINK[s.key];
  const body = (
    <>
      <span
        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-4 ${
          highlight ? "bg-gold-light text-primary-dark ring-transparent" : "bg-card text-primary ring-card"
        } ${highlight ? "" : "border border-border"}`}
      >
        {step}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-[13px] font-semibold ${highlight ? "text-white" : "text-text-primary"}`}>{s.label}</span>
          {highlight && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold text-gold-light ring-1 ring-gold-light/40">
              <Icon name="flame" size={10} /> Most orders
            </span>
          )}
        </span>
        <span className={`block truncate text-[11.5px] ${highlight ? "text-white/70" : "text-text-muted"}`} title={s.hint}>
          {NOTE[s.key]}
        </span>
      </span>
      <span className={`figure w-14 shrink-0 text-right text-[20px] leading-none ${highlight ? "text-gold-light" : "text-text-primary"}`}>
        <CountUp to={s.count} />
      </span>
      <span className="hidden w-36 shrink-0 items-center gap-2 sm:flex">
        <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${highlight ? "bg-white/15" : "bg-border-light"}`}>
          <span
            className={`grow-x block h-full rounded-full ${highlight ? "gradient-gold" : COLOR[s.key]}`}
            style={{ width: `${Math.max(s.share * 100, s.count > 0 ? 3 : 0)}%` }}
          />
        </span>
        <span className={`w-8 text-right text-[11px] font-semibold ${highlight ? "text-gold-light" : "text-text-secondary"}`}>{percentLabel(s.share)}</span>
      </span>
    </>
  );
  const row = `flex items-center gap-3 rounded-app-lg px-2.5 py-2 transition-colors duration-200 ${
    highlight ? "hero-band" : href ? "hover:bg-primary-bg/40" : ""
  }`;
  return (
    <li className="relative">
      {!first && <span aria-hidden className={`${THREAD} -top-0.75 bottom-1/2`} />}
      {!last && <span aria-hidden className={`${THREAD} top-1/2 -bottom-0.75`} />}
      {href ? (
        <Link href={href} className={`${row} focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60`}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}
