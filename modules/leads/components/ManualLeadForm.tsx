"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_SOURCE_LABELS, MANUAL_LEAD_SOURCES, type DesignerChoice, type LeadSource } from "../../../lib/domain";
import { ApiRequestError } from "../../../lib/api/client";
import { leadsApi } from "../api/leadsApi";
import { notifyLeadsChanged } from "./LeadsBadgeProvider";
import { DesignerPicker } from "./DesignerPicker";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Select, Textarea } from "../../../components/ui/Select";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";

type Fields = "customerName" | "phone" | "requirement" | "source";

/** The owner adds a lead by hand -- a walk-in, a phone call, an Instagram DM -- and may assign it straight away. */
export function ManualLeadForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [requirement, setRequirement] = useState("");
  const [source, setSource] = useState<Exclude<LeadSource, "public_form">>("walk_in");
  const [assignTo, setAssignTo] = useState<DesignerChoice | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { lead } = await leadsApi.create({ customerName, phone, requirement, source, assignTo: assignTo?.id ?? null });
      showToast(`Lead ${lead.leadNumber} added.`, "success");
      notifyLeadsChanged();
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "VALIDATION_ERROR") {
        const fe = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {};
        setErrors({ customerName: fe.customerName?.[0], phone: fe.phone?.[0], requirement: fe.requirement?.[0], source: fe.source?.[0] });
      } else {
        showToast(err instanceof Error ? err.message : "Couldn't add the lead", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Icon name="chevron-right" size={15} className="rotate-180" />
          Leads
        </Link>
        <h1 className="page-title mt-2">Add a lead</h1>
        <p className="text-sm text-text-muted">A customer who called, walked in or messaged — they appear in Leads like any enquiry.</p>
      </div>

      <Card>
        <CardHeader icon={<Icon name="user" size={18} />} title="Customer" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="lead-name" required>
              Name
            </FieldLabel>
            <Input id="lead-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={80} autoComplete="off" />
            <FieldError>{errors.customerName}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="lead-phone" required>
              Mobile number
            </FieldLabel>
            <Input id="lead-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} placeholder="98765 43210" autoComplete="off" />
            <FieldError>{errors.phone}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="lead-req">Requirement</FieldLabel>
            <Textarea id="lead-req" rows={4} maxLength={1000} value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder="What they're looking for, occasion, budget, dates..." />
            <FieldError>{errors.requirement}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="lead-source" required>
              Where it came from
            </FieldLabel>
            <Select id="lead-source" value={source} onChange={(e) => setSource(e.target.value as Exclude<LeadSource, "public_form">)}>
              {MANUAL_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
            <FieldError>{errors.source}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="lead-assign">Assign to (optional)</FieldLabel>
            <DesignerPicker id="lead-assign" value={assignTo} onChange={setAssignTo} placeholder="Leave unassigned, or type a name" />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/leads">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          <Icon name="plus" size={16} /> {saving ? "Adding..." : "Add lead"}
        </Button>
      </div>
    </form>
  );
}
