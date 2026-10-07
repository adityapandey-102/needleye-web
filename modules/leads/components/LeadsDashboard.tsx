"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  timeAgoLabel,
  type DesignerChoice,
  type DesignerStatsPage,
  type LeadListResult,
  type LeadStatus,
  type LeadSummary,
} from "../../../lib/domain";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { leadsApi } from "../api/leadsApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { CountUp } from "../../../components/ui/CountUp";
import { useToast } from "../../../components/ui/Toast";
import { LeadStatusPill, UrgentTag } from "./LeadStatusPill";
import { DesignerPicker } from "./DesignerPicker";

const PAGE_SIZE = 20;
const DESIGNERS_PAGE_SIZE = 10;
type StageFilter = LeadStatus | "open" | "";

/**
 * The Leads dashboard -- its own section, nothing about leads appears on the
 * orders dashboard. Owner: every lead, the unassigned pile, how each designer
 * is doing, and the link to the public enquiry form. Designer: their own leads.
 * Filters, search (debounced) and paging all run in the API.
 */
export function LeadsDashboard({ isOwner }: { isOwner: boolean }) {
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [data, setData] = useState<LeadListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stage, setStage] = useState<StageFilter>("open");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [designer, setDesigner] = useState<DesignerChoice | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    leadsApi
      .summary()
      .then((s) => !cancelled && setSummary(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      setLoading(true);
      leadsApi
        .list({
          status: stage || undefined,
          urgent: urgentOnly,
          q: debouncedSearch || undefined,
          assignedTo: isOwner && designer ? designer.id : undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load leads");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [stage, urgentOnly, designer, debouncedSearch, page, isOwner, reloadKey]);

  function pickStage(s: StageFilter) {
    setStage(s);
    setUrgentOnly(false);
    setPage(0);
  }

  const by = summary?.byStatus;
  const tiles: { key: StageFilter | "urgent"; label: string; value: number; tone: string }[] = by
    ? isOwner
      ? [
          { key: "new", label: "New · unassigned", value: by.new, tone: "text-info" },
          { key: "assigned", label: "Waiting for designer", value: by.assigned, tone: "text-gold" },
          { key: "open", label: "All open", value: by.new + by.assigned + by.unattended + by.attended + by.follow_up, tone: "text-text-primary" },
          { key: "urgent", label: "Urgent", value: summary.urgent, tone: "text-error" },
          { key: "converted", label: "Converted", value: by.converted, tone: "text-success" },
          { key: "lost", label: "Lost", value: by.lost, tone: "text-text-secondary" },
        ]
      : [
          { key: "assigned", label: "To receive", value: by.assigned, tone: "text-gold" },
          { key: "unattended", label: "Unattended", value: by.unattended, tone: "text-warning-text" },
          { key: "follow_up", label: "Follow-up", value: by.follow_up, tone: "text-primary" },
          { key: "urgent", label: "Urgent", value: summary.urgent, tone: "text-error" },
          { key: "converted", label: "Converted", value: by.converted, tone: "text-success" },
          { key: "lost", label: "Lost", value: by.lost, tone: "text-text-secondary" },
        ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="text-sm text-text-muted">
            {isOwner ? "Every enquiry, from first contact to order." : "Your enquiries — tap Received, contact the customer, follow up."}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <CopyFormLinkButton />
            <Link href="/leads/new">
              <Button>
                <Icon name="plus" size={16} /> Add lead
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="stagger-in grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.length === 0
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-19.5 animate-pulse rounded-app bg-card" />)
          : tiles.map((t) => {
              const active = t.key === "urgent" ? urgentOnly : !urgentOnly && stage === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (t.key === "urgent") {
                      setUrgentOnly(!urgentOnly);
                      setStage("open");
                      setPage(0);
                    } else pickStage(active ? "open" : t.key);
                  }}
                  className={`lift rounded-app border px-4 py-3 text-left shadow-app transition-colors ${
                    active ? "border-primary/40 bg-primary-bg" : "border-border-light bg-card hover:bg-app-bg"
                  }`}
                >
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-text-muted">
                    {t.key === "urgent" && <Icon name="flame" size={12} className="text-error" />}
                    {t.label}
                  </p>
                  <p className={`figure mt-1 text-[26px] leading-none ${t.tone}`}>
                    <CountUp to={t.value} />
                  </p>
                </button>
              );
            })}
      </div>

      <Card>
        <CardHeader
          icon={<Icon name="inbox" size={18} />}
          title={isOwner ? "All leads" : "My leads"}
          subtitle="Urgent first, then newest"
          action={
            <Button variant="ghost" onClick={() => setReloadKey((k) => k + 1)} aria-label="Refresh leads" className="px-2.5">
              <Icon name="refresh" size={16} />
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Search leads"
              placeholder="Search name, phone or lead no."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="sm:max-w-xs"
            />
            <Select aria-label="Filter by stage" value={stage} onChange={(e) => pickStage(e.target.value as StageFilter)} className="sm:max-w-48">
              <option value="open">All open</option>
              {LEAD_STATUSES.filter((s) => isOwner || (s !== "new" && s !== "discarded")).map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
              <option value="">Every stage</option>
            </Select>
            {isOwner && (
              <DesignerPicker
                ariaLabel="Filter by designer"
                placeholder="All designers — type a name"
                value={designer}
                onChange={(d) => {
                  setDesigner(d);
                  setPage(0);
                }}
                className="sm:w-60"
              />
            )}
          </div>

          {error && !data ? (
            <div className="py-10 text-center">
              <p className="font-semibold text-text-primary">Couldn&apos;t load leads</p>
              <p className="mt-1 text-sm text-text-muted">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </Button>
            </div>
          ) : !data ? (
            <div className="flex flex-col gap-2" aria-busy>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-app-sm bg-app-bg" />
              ))}
            </div>
          ) : data.leads.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="inbox" size={28} className="mx-auto text-text-muted" />
              <p className="mt-2 text-sm text-text-muted">No leads here.</p>
            </div>
          ) : (
            <div className={`overflow-hidden rounded-app-sm border border-border-light transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              <table className="w-full text-sm">
                <thead className="hidden bg-app-bg/60 text-left text-[11px] font-semibold text-text-muted md:table-header-group">
                  <tr>
                    <th className="px-4 py-2.5">Lead</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Requirement</th>
                    <th className="px-4 py-2.5">Stage</th>
                    {isOwner && <th className="px-4 py-2.5">Designer</th>}
                    <th className="px-4 py-2.5">Received</th>
                  </tr>
                </thead>
                <tbody className="rows-in divide-y divide-border-light">
                  {data.leads.map((l) => (
                    <tr key={l.id} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-primary-bg/30 md:table-row md:p-0">
                      <td className="md:px-4 md:py-3">
                        <Link href={`/leads/${l.id}`} className="font-semibold text-primary after:absolute after:inset-0 hover:underline">
                          {l.leadNumber}
                        </Link>
                        {l.urgent && (
                          <span className="ml-2 align-middle">
                            <UrgentTag compact />
                          </span>
                        )}
                      </td>
                      <td className="min-w-0 flex-1 md:px-4 md:py-3">
                        <p className="font-medium text-text-primary">{l.customerName}</p>
                        <p className="text-xs text-text-muted tabular-nums">{l.phone}</p>
                      </td>
                      <td className="hidden max-w-88 text-text-secondary md:table-cell md:px-4 md:py-3">
                        <p className="line-clamp-2">{l.requirement || <span className="text-text-muted italic">No details</span>}</p>
                      </td>
                      <td className="md:px-4 md:py-3">
                        <LeadStatusPill status={l.status} />
                      </td>
                      {isOwner && (
                        <td className="text-xs text-text-secondary md:px-4 md:py-3 md:text-sm">
                          {l.assignedToName ?? <span className="text-text-muted">Unassigned</span>}
                        </td>
                      )}
                      <td className="w-full text-xs text-text-muted md:w-auto md:px-4 md:py-3" title={l.createdAt}>
                        {timeAgoLabel(l.createdAt)} · {LEAD_SOURCE_LABELS[l.source]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </CardBody>
      </Card>

      {isOwner && (
        <DesignersCard
          reloadKey={reloadKey}
          onPick={(d) => {
            setDesigner(d);
            pickStage("");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

/** Copies the public enquiry form's address -- for Instagram bio, WhatsApp, a QR at the counter. */
function CopyFormLinkButton() {
  const { showToast } = useToast();
  return (
    <Button
      variant="outline"
      onClick={() => {
        const url = `${window.location.origin}/enquiry`;
        navigator.clipboard
          .writeText(url)
          .then(() => showToast(`Enquiry form link copied: ${url}`, "success"))
          .catch(() => showToast(`Enquiry form: ${url}`, "success"));
      }}
    >
      <Icon name="send" size={16} /> Copy enquiry form link
    </Button>
  );
}

/**
 * Owner: how each designer is doing with their leads. Searched by name
 * (debounced) and paged by the API -- 10 at a time, so 300 designers cost the
 * same as 3. Clicking a name filters All leads to that designer.
 */
function DesignersCard({ reloadKey, onPick }: { reloadKey: number; onPick: (d: DesignerChoice) => void }) {
  const [data, setData] = useState<DesignerStatsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      setLoading(true);
      leadsApi
        .designers({ q: debounced || undefined, limit: DESIGNERS_PAGE_SIZE, offset: page * DESIGNERS_PAGE_SIZE })
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load designers");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, page, reloadKey]);

  // Nothing assigned yet and no search typed: no table to show.
  if (data && data.total === 0 && !debounced) return null;

  return (
    <Card regionLabel="Designers">
      <CardHeader icon={<Icon name="users" size={18} />} title="Designers" subtitle="How each designer is doing with their leads" />
      <CardBody className="flex flex-col gap-4">
        <Input
          aria-label="Search designers"
          placeholder="Search a designer by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        {error && !data ? (
          <p className="text-sm text-error">{error}</p>
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-app-sm bg-app-bg" />
            ))}
          </div>
        ) : data.designers.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No designer with leads matches “{debounced}”.</p>
        ) : (
          <div className={`overflow-hidden rounded-app-sm border border-border-light transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-md text-sm">
                <thead className="bg-app-bg/60 text-left text-[11px] font-semibold text-text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Designer</th>
                    <th className="px-4 py-2.5 text-right">To receive</th>
                    <th className="px-4 py-2.5 text-right">Open</th>
                    <th className="px-4 py-2.5 text-right">Converted</th>
                    <th className="px-4 py-2.5 text-right">Lost</th>
                  </tr>
                </thead>
                <tbody className="rows-in divide-y divide-border-light">
                  {data.designers.map((d) => (
                    <tr key={d.designerId}>
                      <td className="px-4 py-2.5 font-medium text-text-primary">
                        <button
                          type="button"
                          className="text-left hover:text-primary hover:underline"
                          onClick={() => onPick({ id: d.designerId, fullName: d.designerName })}
                        >
                          {d.designerName}
                        </button>
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${d.waiting > 0 ? "font-semibold text-gold" : "text-text-secondary"}`}>{d.waiting}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{d.open}</td>
                      <td className="px-4 py-2.5 text-right text-success tabular-nums">{d.converted}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{d.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={DESIGNERS_PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
