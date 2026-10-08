"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  formatDate,
  formatDateOnly,
  isoToday,
  LEAD_ACTION_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_HINTS,
  LEAD_STATUS_LABELS,
  whatsappLink,
  type DesignerChoice,
  type LeadDetail,
  type LeadEvent,
  type LeadStatus,
} from "../../../lib/domain";
import { leadsApi } from "../api/leadsApi";
import { notifyLeadsChanged } from "./LeadsBadgeProvider";
import { DesignerPicker } from "./DesignerPicker";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button, ButtonLink } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Textarea } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { LeadStatusPill, UrgentTag } from "./LeadStatusPill";

/**
 * One lead: who, what they want, how to reach them, and -- only the actions the
 * API says this person may take -- assign (owner), the next stages, and
 * "Converted" (which asks to create the order). Comments run as a log; the
 * history shows every assignment and stage change with who and when.
 */
export function LeadDetailView({ leadId, isOwner }: { leadId: string; isOwner: boolean }) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageDialog, setStageDialog] = useState<"follow_up" | "lost" | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const load = useCallback(() => {
    leadsApi
      .detail(leadId)
      .then((d) => {
        setDetail(d);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load this lead"));
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStage(status: LeadStatus, extra: { followUpOn?: string | null; lostReason?: string | null } = {}) {
    if (!detail) return;
    if (status === "discarded") {
      const ok = await confirm({
        title: "Discard this lead?",
        body: "Use this for spam, fake or duplicate enquiries. You can restore it later.",
        confirmLabel: "Discard",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await leadsApi.changeStatus(detail.lead.id, { status, version: detail.lead.version, ...extra });
      showToast(`Lead moved to ${LEAD_STATUS_LABELS[status]}.`, "success");
      setStageDialog(null);
      notifyLeadsChanged();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't change the stage", "error");
      load();
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-text-primary">Couldn&apos;t open this lead</p>
        <p className="mt-1 text-sm text-text-muted">{error}</p>
        <Link href="/leads" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="h-36 animate-pulse rounded-app-lg bg-card" />
        <div className="h-48 animate-pulse rounded-app-lg bg-card" />
      </div>
    );
  }

  const { lead, actions } = detail;
  const stageButtons = actions.nextStatuses;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Icon name="chevron-right" size={15} className="rotate-180" />
          Leads
        </Link>
      </div>

      {/* The lead at a glance. */}
      <Card accent>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gold">{lead.leadNumber}</p>
              <h1 className="page-title mt-1 break-words">{lead.customerName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <LeadStatusPill status={lead.status} />
                {lead.urgent && <UrgentTag />}
                <span className="text-xs text-text-muted">
                  {LEAD_SOURCE_LABELS[lead.source]} · {formatDate(lead.createdAt)}
                  {lead.enquiryCount > 1 && ` · enquired ${lead.enquiryCount} times`}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`tel:+91${lead.phone}`} variant="outline">
                <Icon name="phone" size={16} /> {lead.phone}
              </ButtonLink>
              <ButtonLink href={whatsappLink(lead.phone)} variant="outline" target="_blank" rel="noopener noreferrer">
                <Icon name="message" size={16} /> WhatsApp
              </ButtonLink>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold text-text-muted">Designer</dt>
              <dd className="mt-0.5 text-text-primary">{lead.assignedToName ?? <span className="text-text-muted italic">Not assigned</span>}</dd>
            </div>
            {lead.followUpOn && (
              <div>
                <dt className="text-[11px] font-semibold text-text-muted">Follow up on</dt>
                <dd className="mt-0.5 text-text-primary">{formatDateOnly(lead.followUpOn)}</dd>
              </div>
            )}
            {lead.lostReason && (
              <div>
                <dt className="text-[11px] font-semibold text-text-muted">Why it was lost</dt>
                <dd className="mt-0.5 text-text-primary">{lead.lostReason}</dd>
              </div>
            )}
            {lead.convertedOrderId && (
              <div>
                <dt className="text-[11px] font-semibold text-text-muted">Order</dt>
                <dd className="mt-0.5">
                  <Link href={`/orders/${lead.convertedOrderId}`} className="font-semibold text-primary hover:underline">
                    {lead.convertedOrderNumber ?? "Open the order"}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="text-[11px] font-semibold text-text-muted">Requirement</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
              {lead.requirement || <span className="text-text-muted italic">No details given</span>}
            </p>
          </div>
        </CardBody>
      </Card>

      {(actions.canAssign || stageButtons.length > 0 || actions.canConvert) && (
        <Card>
          <CardHeader icon={<Icon name="check-circle" size={18} />} title="Next step" subtitle={LEAD_STATUS_HINTS[lead.status]} />
          <CardBody className="flex flex-col gap-4">
            {actions.canAssign && <AssignControl leadId={lead.id} version={lead.version} current={lead.assignedTo} onDone={load} />}
            {(stageButtons.length > 0 || actions.canConvert) && (
              <div className="flex flex-wrap gap-2">
                {stageButtons.map((s) => (
                  <Button
                    key={s}
                    variant={s === "unattended" && lead.status === "assigned" ? "primary" : s === "discarded" || s === "lost" ? "ghost" : "outline"}
                    disabled={busy}
                    onClick={() => (s === "follow_up" || s === "lost" ? setStageDialog(s) : void changeStage(s))}
                  >
                    {s === "unattended" && lead.status === "assigned" && <Icon name="check" size={16} />}
                    {s === "unattended" && lead.status !== "assigned" ? "Reopen" : (LEAD_ACTION_LABELS[s] ?? LEAD_STATUS_LABELS[s])}
                  </Button>
                ))}
                {actions.canConvert && (
                  <Button variant="gold" disabled={busy} onClick={() => setConvertOpen(true)}>
                    <Icon name="sparkles" size={16} /> Converted
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <CommentsCard detail={detail} onAdded={load} />
        <HistoryCard events={detail.events} />
      </div>

      {isOwner && detail.samePhone.length > 0 && (
        <Card>
          <CardHeader icon={<Icon name="history" size={18} />} title="Earlier enquiries from this number" />
          <CardBody>
            <ul className="divide-y divide-border-light text-sm">
              {detail.samePhone.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/leads/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.leadNumber}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {formatDateOnly(p.createdAt)} <LeadStatusPill status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {stageDialog && (
        <StageDialog kind={stageDialog} busy={busy} onCancel={() => setStageDialog(null)} onSave={(extra) => void changeStage(stageDialog, extra)} />
      )}

      <ConvertDialog
        open={convertOpen}
        onCancel={() => setConvertOpen(false)}
        onCreate={() => router.push(`/orders/new?leadId=${lead.id}`)}
      />
    </div>
  );
}

function AssignControl({ leadId, version, current, onDone }: { leadId: string; version: number; current: string | null; onDone: () => void }) {
  const [designer, setDesigner] = useState<DesignerChoice | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const id = useId();

  async function assign() {
    setSaving(true);
    try {
      if (!designer) return;
      await leadsApi.assign(leadId, designer.id, version);
      showToast("Lead assigned. The designer will see it in their Leads.", "success");
      notifyLeadsChanged();
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't assign the lead", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="sm:w-64">
        <FieldLabel htmlFor={id}>{current ? "Reassign to" : "Assign to a designer"}</FieldLabel>
        <DesignerPicker id={id} value={designer} onChange={setDesigner} />
      </div>
      <Button disabled={!designer || designer.id === current || saving} onClick={() => void assign()}>
        <Icon name="user-plus" size={16} /> {current ? "Reassign" : "Assign"}
      </Button>
    </div>
  );
}

function StageDialog({
  kind,
  busy,
  onCancel,
  onSave,
}: {
  kind: "follow_up" | "lost";
  busy: boolean;
  onCancel: () => void;
  onSave: (extra: { followUpOn?: string | null; lostReason?: string | null }) => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const today = isoToday();

  return (
    <Modal open onClose={onCancel} labelledBy={titleId} panelClassName="max-w-md">
      <div className="p-6">
        <h2 id={titleId} className="font-serif text-xl font-semibold text-text-primary">
          {kind === "follow_up" ? "Follow up" : "Mark as lost"}
        </h2>
        <div className="mt-4">
          {kind === "follow_up" ? (
            <>
              <FieldLabel htmlFor={fieldId}>Next follow-up date (optional)</FieldLabel>
              <Input id={fieldId} type="date" min={today} value={value} onChange={(e) => setValue(e.target.value)} />
            </>
          ) : (
            <>
              <FieldLabel htmlFor={fieldId} required>
                Why was it lost?
              </FieldLabel>
              <Textarea id={fieldId} rows={3} maxLength={300} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Budget too high, went elsewhere" />
            </>
          )}
          <FieldError>{err}</FieldError>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (kind === "lost" && value.trim().length < 2) return setErr("Say briefly why");
              if (kind === "follow_up" && value && value < today) return setErr("Pick today or a later date");
              onSave(kind === "follow_up" ? { followUpOn: value || null } : { lostReason: value.trim() });
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** "Create an order for this lead?" -- the lead becomes Converted only when that order is saved. */
function ConvertDialog({ open, onCancel, onCreate }: { open: boolean; onCancel: () => void; onCreate: () => void }) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} panelClassName="max-w-md">
      <div className="p-6">
        <h2 id={titleId} className="font-serif text-xl font-semibold text-text-primary">
          Create an order for this lead?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          The order form opens with the customer&apos;s name, phone and requirement filled in. The lead becomes{" "}
          <span className="font-semibold">Converted</span> when you save the order.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onCreate}>
            <Icon name="sparkles" size={16} /> Create order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CommentsCard({ detail, onAdded }: { detail: LeadDetail; onAdded: () => void }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const id = useId();

  async function add() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    try {
      await leadsApi.addComment(detail.lead.id, text);
      setBody("");
      onAdded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't add the comment", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader icon={<Icon name="message" size={18} />} title="Comments" subtitle="Every call, visit and note" />
      <CardBody className="flex flex-col gap-4">
        {detail.comments.length === 0 ? (
          <p className="text-sm text-text-muted">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {detail.comments.map((c) => (
              <li key={c.id} className="rounded-app-sm border border-border-light bg-app-bg/50 px-3 py-2">
                <p className="text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary">{c.authorName ?? "Former staff"}</span> · {formatDate(c.createdAt)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        {detail.actions.canComment && (
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor={id}>Add a comment</FieldLabel>
            <Textarea id={id} rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Called — visiting Saturday with her sister" />
            <div className="flex justify-end">
              <Button disabled={saving || body.trim() === ""} onClick={() => void add()}>
                <Icon name="send" size={16} /> Add comment
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function eventText(e: LeadEvent): string {
  const who = e.actorName ?? "Enquiry form";
  switch (e.kind) {
    case "created":
      return e.actorName ? `${who} added the lead` : "Enquiry received from the website form";
    case "enquiry_merged":
      return "The customer enquired again (marked urgent)";
    case "assigned":
      return `${who} assigned it to ${e.assignedToName ?? "a designer"}`;
    case "converted":
      return `${who} converted it`;
    default:
      return `${who} moved it to ${e.toStatus ? LEAD_STATUS_LABELS[e.toStatus] : "a new stage"}`;
  }
}

function HistoryCard({ events }: { events: LeadEvent[] }) {
  return (
    <Card>
      <CardHeader icon={<Icon name="history" size={18} />} title="History" subtitle="Who did what, and when" />
      <CardBody>
        <ol className="relative ml-2 border-l border-border-light">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="mb-4 ml-4 last:mb-0">
              <span className="absolute -left-1.25 mt-1.5 h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />
              <p className="text-sm text-text-primary">{eventText(e)}</p>
              {e.note && <p className="mt-0.5 text-xs whitespace-pre-wrap text-text-secondary">{e.note}</p>}
              <p className="mt-0.5 text-[11px] text-text-muted">{formatDate(e.createdAt)}</p>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
