"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrderSchema,
  GRANULAR_STATUSES,
  granularLabel,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  type CreateOrderInput,
  type Order,
  type Role,
} from "@needleye/shared";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Select, Textarea } from "../../../components/ui/Select";
import { RadioGroup } from "../../../components/ui/RadioGroup";
import { StatusPill } from "../../../components/ui/StatusPill";
import { ImageUploadGrid, type ImageSlotState } from "./ImageUploadGrid";

type FormState = {
  customerName: string;
  phone: string;
  billNumber: string;
  bookingDate: string;
  dueDate: string;
  designerId: string;
  masterTailorId: string;
  productCategory: string;
  orderDetails: string;
  handWork: boolean;
  machineWork: boolean;
  purchaseRequired: boolean;
  paymentStatus: string;
  totalAmount: string;
  productionStatus: string;
  designerInstructions: string;
  specialNotes: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    customerName: "",
    phone: "",
    billNumber: "",
    bookingDate: todayISO(),
    dueDate: "",
    designerId: "",
    masterTailorId: "",
    productCategory: "",
    orderDetails: "",
    handWork: false,
    machineWork: false,
    purchaseRequired: false,
    paymentStatus: "",
    totalAmount: "",
    productionStatus: "",
    designerInstructions: "",
    specialNotes: "",
  };
}

function formFromOrder(order: Order): FormState {
  return {
    customerName: order.customerName,
    phone: order.phone,
    billNumber: order.billNumber,
    bookingDate: order.bookingDate,
    dueDate: order.dueDate,
    designerId: order.designerId,
    masterTailorId: order.masterTailorId,
    productCategory: order.productCategory,
    orderDetails: order.orderDetails,
    handWork: order.handWork,
    machineWork: order.machineWork,
    purchaseRequired: order.purchaseRequired,
    paymentStatus: order.paymentStatus,
    totalAmount: String(order.totalAmount ?? ""),
    productionStatus: order.productionStatus,
    designerInstructions: order.designerInstructions ?? "",
    specialNotes: order.specialNotes ?? "",
  };
}

interface OrderFormProps {
  mode: "create" | "edit";
  order?: Order;
  canEditCustomerProduct: boolean;
  canEditPricing: boolean;
  currentUserId: string;
  currentUserRole: Role;
}

export function OrderForm({
  mode,
  order,
  canEditCustomerProduct,
  canEditPricing,
  currentUserId,
  currentUserRole,
}: OrderFormProps) {
  const router = useRouter();
  const { members: designers } = useTeamMembers("designer");
  const { members: masters } = useTeamMembers("master_tailor");

  const [form, setForm] = useState<FormState>(() => {
    const base = order ? formFromOrder(order) : emptyForm();
    // Pre-select the current user as designer when a Designer creates a new order.
    if (mode === "create" && currentUserRole === "designer") {
      return { ...base, designerId: currentUserId };
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [stagedFiles, setStagedFiles] = useState<Partial<Record<1 | 2 | 3 | 4, File>>>({});
  const [stagedPreviews, setStagedPreviews] = useState<Partial<Record<1 | 2 | 3 | 4, string>>>({});
  const [images, setImages] = useState<Record<1 | 2 | 3 | 4, ImageSlotState | undefined>>(() => {
    const initial: Record<1 | 2 | 3 | 4, ImageSlotState | undefined> = {
      1: undefined,
      2: undefined,
      3: undefined,
      4: undefined,
    };
    order?.images.forEach((img) => {
      initial[img.slot] = { url: img.url };
    });
    return initial;
  });

  useEffect(() => {
    return () => {
      Object.values(stagedPreviews).forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [stagedPreviews]);

  const canEditPricingFields = mode === "create" || canEditPricing;
  const canEditContentFields = mode === "create" || canEditCustomerProduct;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageSelect(slot: 1 | 2 | 3 | 4, file: File) {
    if (mode === "create" || !order) {
      const previewUrl = URL.createObjectURL(file);
      setStagedFiles((s) => ({ ...s, [slot]: file }));
      setStagedPreviews((s) => ({ ...s, [slot]: previewUrl }));
      setImages((s) => ({ ...s, [slot]: { url: previewUrl } }));
      return;
    }

    setImages((s) => ({ ...s, [slot]: { ...s[slot], uploading: true } }));
    ordersApi
      .uploadImage(order.id, slot, file)
      .then((res) => setImages((s) => ({ ...s, [slot]: { url: res.url } })))
      .catch((err) => {
        setSubmitError(err instanceof Error ? err.message : "Image upload failed");
        setImages((s) => ({ ...s, [slot]: undefined }));
      });
  }

  function handleImageRemove(slot: 1 | 2 | 3 | 4) {
    if (mode === "create" || !order) {
      const preview = stagedPreviews[slot];
      if (preview) URL.revokeObjectURL(preview);
      setStagedFiles((s) => ({ ...s, [slot]: undefined }));
      setStagedPreviews((s) => ({ ...s, [slot]: undefined }));
      setImages((s) => ({ ...s, [slot]: undefined }));
      return;
    }

    setImages((s) => ({ ...s, [slot]: undefined }));
    ordersApi.deleteImage(order.id, slot).catch((err) => {
      setSubmitError(err instanceof Error ? err.message : "Failed to remove image");
    });
  }

  const payload: Partial<CreateOrderInput> = useMemo(
    () => ({
      customerName: form.customerName,
      phone: form.phone,
      billNumber: form.billNumber,
      bookingDate: form.bookingDate || undefined,
      dueDate: form.dueDate,
      designerId: form.designerId || undefined,
      masterTailorId: form.masterTailorId || undefined,
      productCategory: (form.productCategory || undefined) as CreateOrderInput["productCategory"] | undefined,
      orderDetails: form.orderDetails,
      handWork: form.handWork,
      machineWork: form.machineWork,
      purchaseRequired: form.purchaseRequired,
      paymentStatus: (form.paymentStatus || undefined) as CreateOrderInput["paymentStatus"] | undefined,
      totalAmount: form.totalAmount === "" ? 0 : Number(form.totalAmount),
      productionStatus: (form.productionStatus || undefined) as CreateOrderInput["productionStatus"] | undefined,
      designerInstructions: form.designerInstructions || undefined,
      specialNotes: form.specialNotes || undefined,
    }),
    [form],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (mode === "create") {
      const parsed = createOrderSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        const { order: created } = await ordersApi.create(parsed.data);

        const uploads = (Object.entries(stagedFiles) as [string, File | undefined][])
          .filter(([, file]) => file)
          .map(([slot, file]) => ordersApi.uploadImage(created.id, Number(slot), file as File));
        await Promise.all(uploads);

        router.push(`/orders/${created.id}`);
        router.refresh();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to create order");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Edit mode: only submit fields the caller is allowed to touch.
    if (!order) return;
    const editable: Record<string, unknown> = {};
    if (canEditContentFields) {
      Object.assign(editable, {
        customerName: form.customerName,
        phone: form.phone,
        billNumber: form.billNumber,
        bookingDate: form.bookingDate,
        dueDate: form.dueDate,
        productCategory: form.productCategory,
        orderDetails: form.orderDetails,
        handWork: form.handWork,
        machineWork: form.machineWork,
        purchaseRequired: form.purchaseRequired,
        paymentStatus: form.paymentStatus,
        designerInstructions: form.designerInstructions,
        specialNotes: form.specialNotes,
      });
    }
    if (canEditPricingFields) {
      Object.assign(editable, {
        totalAmount: form.totalAmount === "" ? 0 : Number(form.totalAmount),
        designerId: form.designerId,
        masterTailorId: form.masterTailorId,
      });
    }

    setSubmitting(true);
    try {
      await ordersApi.update(order.id, editable);
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-24">
      <Card>
        <CardHeader icon="📅" iconTone="amber" title="Order Timeline" subtitle="Booking and delivery schedule" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Booking Date</FieldLabel>
            <Input
              type="date"
              disabled={!canEditContentFields}
              value={form.bookingDate}
              onChange={(e) => set("bookingDate", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel required>Delivery Due Date</FieldLabel>
            <Input
              type="date"
              disabled={!canEditContentFields}
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
            <FieldError>{errors.dueDate}</FieldError>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader icon="👤" iconTone="purple" title="Customer Information" subtitle="Bill & contact details" />
          <CardBody className="flex flex-col gap-3.5">
            <div>
              <FieldLabel required>Customer Name</FieldLabel>
              <Input
                disabled={!canEditContentFields}
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
              <FieldError>{errors.customerName}</FieldError>
            </div>
            <div>
              <FieldLabel required>Phone Number</FieldLabel>
              <Input
                type="tel"
                maxLength={10}
                disabled={!canEditContentFields}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="e.g. 9876543210"
              />
              <FieldError>{errors.phone}</FieldError>
            </div>
            <div>
              <FieldLabel required>Bill Number</FieldLabel>
              <Input
                disabled={!canEditContentFields}
                value={form.billNumber}
                onChange={(e) => set("billNumber", e.target.value)}
                placeholder="e.g. BILL-2024-001"
              />
              <FieldError>{errors.billNumber}</FieldError>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon="🖼️"
            iconTone="pink"
            title="Product Reference Images"
            subtitle="Upload up to 4 design reference photos"
          />
          <CardBody>
            <ImageUploadGrid
              images={images}
              onSelect={handleImageSelect}
              onRemove={handleImageRemove}
              disabled={!canEditContentFields}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon="👩‍🎨" iconTone="blue" title="Production Team" subtitle="Assign designer & master tailor" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>Designer</FieldLabel>
              <Select
                disabled={!canEditPricingFields}
                value={form.designerId}
                onChange={(e) => set("designerId", e.target.value)}
              >
                <option value="">Select Designer</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.designerId}</FieldError>
            </div>
            <div>
              <FieldLabel required>Master Tailor</FieldLabel>
              <Select
                disabled={!canEditPricingFields}
                value={form.masterTailorId}
                onChange={(e) => set("masterTailorId", e.target.value)}
              >
                <option value="">Select Master</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.masterTailorId}</FieldError>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="👗" iconTone="pink" title="Product Details" subtitle="Category & description" />
          <CardBody className="flex flex-col gap-3.5">
            <div>
              <FieldLabel required>Product Category</FieldLabel>
              <Select
                disabled={!canEditContentFields}
                value={form.productCategory}
                onChange={(e) => set("productCategory", e.target.value)}
              >
                <option value="">Select Category</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.productCategory}</FieldError>
            </div>
            <div>
              <FieldLabel required>Order Details</FieldLabel>
              <Textarea
                rows={3}
                disabled={!canEditContentFields}
                value={form.orderDetails}
                onChange={(e) => set("orderDetails", e.target.value)}
                placeholder="Measurements, design references, fabric type, embellishments, color preferences..."
              />
              <FieldError>{errors.orderDetails}</FieldError>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon="🔧" iconTone="amber" title="Work Requirements" />
          <CardBody className="flex flex-col gap-3.5">
            <div>
              <FieldLabel>Hand Work Required</FieldLabel>
              <RadioGroup
                name="handWork"
                disabled={!canEditContentFields}
                value={form.handWork ? "yes" : "no"}
                onChange={(v) => set("handWork", v === "yes")}
                options={[
                  { value: "yes", label: "✋ Yes" },
                  { value: "no", label: "✕ No" },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Machine Work Required</FieldLabel>
              <RadioGroup
                name="machineWork"
                disabled={!canEditContentFields}
                value={form.machineWork ? "yes" : "no"}
                onChange={(v) => set("machineWork", v === "yes")}
                options={[
                  { value: "yes", label: "⚙️ Yes" },
                  { value: "no", label: "✕ No" },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="🛒" iconTone="green" title="Purchase Section" />
          <CardBody>
            <FieldLabel>Purchase Required</FieldLabel>
            <RadioGroup
              name="purchaseRequired"
              disabled={!canEditContentFields}
              value={form.purchaseRequired ? "yes" : "no"}
              onChange={(v) => set("purchaseRequired", v === "yes")}
              options={[
                { value: "yes", label: "🛍️ Yes" },
                { value: "no", label: "✕ No" },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="💳" iconTone="green" title="Payment Status" />
          <CardBody className="flex flex-col gap-3.5">
            <div>
              <FieldLabel required>Payment Status</FieldLabel>
              <RadioGroup
                name="paymentStatus"
                column
                disabled={!canEditContentFields}
                value={form.paymentStatus}
                onChange={(v) => set("paymentStatus", v)}
                options={PAYMENT_STATUSES.map((p) => ({ value: p.value, label: p.label }))}
              />
              <FieldError>{errors.paymentStatus}</FieldError>
            </div>
            <div>
              <FieldLabel>Total Amount (₹)</FieldLabel>
              <Input
                type="number"
                min={0}
                disabled={!canEditPricingFields}
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
                placeholder="e.g. 25000"
              />
              {!canEditPricingFields && (
                <p className="mt-1 text-[11px] text-text-muted">Only Owner/Manager can change pricing.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader icon="🏭" iconTone="purple" title="Manufacturing Status" subtitle="Current production stage" />
          <CardBody>
            {mode === "create" ? (
              <>
                <FieldLabel required>Current Product Status</FieldLabel>
                <Select value={form.productionStatus} onChange={(e) => set("productionStatus", e.target.value)}>
                  <option value="">Select Status</option>
                  {GRANULAR_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <FieldError>{errors.productionStatus}</FieldError>
              </>
            ) : (
              <>
                <StatusPill label={granularLabel(order!.productionStatus)} />
                <p className="mt-2 text-[11px] text-text-muted">
                  Status changes happen from the Production Board, not this form.
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="📝" iconTone="blue" title="Instructions & Notes" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Designer Instructions</FieldLabel>
              <Textarea
                rows={4}
                disabled={!canEditContentFields}
                value={form.designerInstructions}
                onChange={(e) => set("designerInstructions", e.target.value)}
                placeholder="Embroidery patterns, bead placement, color schemes..."
              />
            </div>
            <div>
              <FieldLabel>Special Notes</FieldLabel>
              <Textarea
                rows={4}
                disabled={!canEditContentFields}
                value={form.specialNotes}
                onChange={(e) => set("specialNotes", e.target.value)}
                placeholder="Special requirements, preferences, deadline constraints..."
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <FieldError>{submitError}</FieldError>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-app-lg border border-border bg-card p-4 shadow-app-lg">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || (!canEditContentFields && !canEditPricingFields)}>
          {submitting ? "Saving…" : mode === "create" ? "✦ Create Product Order" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
