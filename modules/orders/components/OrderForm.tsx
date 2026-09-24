"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrderSchema,
  formatCurrency,
  GRANULAR_STATUSES,
  granularLabel,
  isPositiveMoney,
  toDateInputValue,
  moneyGreaterThan,
  PAYMENT_METHODS,
  type CreateOrderInput,
  type Order,
  type PaymentMethod,
  type Role,
} from "../../../lib/domain";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { paymentsApi } from "../../payments/api/paymentsApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Select, Textarea } from "../../../components/ui/Select";
import { RadioGroup } from "../../../components/ui/RadioGroup";
import { Icon } from "../../../components/ui/Icon";
import { StatusPill } from "../../../components/ui/StatusPill";
import { ImageUploadGrid, type ImageSlotState } from "./ImageUploadGrid";
import { ProductCategoryPicker } from "./ProductCategoryPicker";
import { DeliveryDateField } from "./DeliveryDateField";
import { isApiErrorCode } from "../../../lib/api/client";
import { compressImage } from "../../../lib/images/compressImage";
import { useToast } from "../../../components/ui/Toast";

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
  totalAmount: string;
  nextPaymentDate: string;
  productionStatus: string;
  designerInstructions: string;
  specialNotes: string;
  /** Optional advance collected at booking (create only) -- recorded as the first ledger entry. */
  advanceAmount: string;
  advanceMethod: PaymentMethod;
};

/**
 * Today on the user's own calendar. (toISOString() is UTC, which in India is
 * a day behind until 05:30 -- a new order's booking date defaulted to yesterday.)
 */
function todayISO() {
  return toDateInputValue(new Date());
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
    totalAmount: "",
    nextPaymentDate: "",
    productionStatus: "",
    designerInstructions: "",
    specialNotes: "",
    advanceAmount: "",
    advanceMethod: PAYMENT_METHODS[0]!.value,
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
    totalAmount: String(order.totalAmount ?? ""),
    nextPaymentDate: order.nextPaymentDate ?? "",
    productionStatus: order.productionStatus,
    designerInstructions: order.designerInstructions ?? "",
    specialNotes: order.specialNotes ?? "",
    // Advance is a create-only field; on edit, payments are managed via the ledger.
    advanceAmount: "",
    advanceMethod: PAYMENT_METHODS[0]!.value,
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
  const { showToast } = useToast();
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
  // Delivery capacity: the due date's day is full and the Production Manager
  // agreed to take it anyway (sent as confirmedWithProductionManager, audited
  // by the API), and whether the full-day dialog is showing.
  const [pmConfirmed, setPmConfirmed] = useState(false);
  const [fullDayPromptOpen, setFullDayPromptOpen] = useState(false);

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

  async function handleImageSelect(slot: 1 | 2 | 3 | 4, original: File) {
    // Downscale + JPEG re-encode on the device so the full-resolution phone
    // photo never leaves the client (bandwidth + Storage cost). Falls back to
    // the original on any failure -- see lib/images/compressImage.ts.
    const file = await compressImage(original);

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
      totalAmount: form.totalAmount === "" ? "0.00" : form.totalAmount,
      nextPaymentDate: form.nextPaymentDate || null,
      productionStatus: (form.productionStatus || undefined) as CreateOrderInput["productionStatus"] | undefined,
      designerInstructions: form.designerInstructions || undefined,
      specialNotes: form.specialNotes || undefined,
      confirmedWithProductionManager: pmConfirmed || undefined,
    }),
    [form, pmConfirmed],
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
      // Validate an optional advance against the order total before creating,
      // so the derived status ends up right and the API's overpayment guard
      // isn't hit after the order already exists.
      const advance = form.advanceAmount === "" ? "0.00" : form.advanceAmount;
      const total = form.totalAmount === "" ? "0.00" : form.totalAmount;
      if (isPositiveMoney(advance) && moneyGreaterThan(advance, total)) {
        setErrors({ advanceAmount: `Advance can't exceed the total (${formatCurrency(total)}).` });
        return;
      }
      setErrors({});
      setSubmitting(true);

      // Step 1: create the order. A failure here means no order exists, so it's
      // safe to keep the user on the form to retry.
      let createdId: string;
      try {
        const { order: created } = await ordersApi.create(parsed.data);
        createdId = created.id;
      } catch (err) {
        setSubmitting(false);
        if (isApiErrorCode(err, "DELIVERY_DAY_FULL")) {
          // The day filled up (or was already full) -- same choice as picking it.
          setFullDayPromptOpen(true);
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to create order";
        setSubmitError(message);
        showToast(message, "error");
        return;
      }

      // Step 2: the order now EXISTS. The advance + image uploads are follow-up
      // writes -- if any fails we must NOT strand the user on the create form
      // (re-submitting would create a duplicate order). Navigate to the order
      // regardless and surface a warning so they can finish it from there.
      const warnings: string[] = [];
      if (isPositiveMoney(advance)) {
        try {
          await paymentsApi.add(createdId, {
            amount: advance,
            method: form.advanceMethod,
            nextPaymentDate: moneyGreaterThan(total, advance) ? form.nextPaymentDate || null : null,
          });
        } catch {
          warnings.push("the advance payment wasn't recorded — add it from the payment ledger");
        }
      }

      const uploads = (Object.entries(stagedFiles) as [string, File | undefined][]).filter(([, file]) => file);
      const results = await Promise.allSettled(
        uploads.map(([slot, file]) => ordersApi.uploadImage(createdId, Number(slot), file as File)),
      );
      if (results.some((r) => r.status === "rejected")) {
        warnings.push("some reference images didn't upload — add them by editing the order");
      }

      if (warnings.length > 0) {
        showToast(`Order created, but ${warnings.join("; ")}.`, "error");
      } else {
        showToast("Order created successfully.", "success");
      }
      router.push(`/orders/${createdId}`);
      router.refresh();
      setSubmitting(false);
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
        nextPaymentDate: form.nextPaymentDate || null,
        designerInstructions: form.designerInstructions,
        specialNotes: form.specialNotes,
      });
    }
    if (canEditPricingFields) {
      const newTotal = form.totalAmount === "" ? "0.00" : form.totalAmount;
      // Mirror the API's invariant: the total can't drop below what's already
      // been collected (that would make the order "overpaid"). Reduce the
      // payment in the ledger first. The API enforces this for real.
      const alreadyPaid = order.amountPaid ?? "0.00";
      if (moneyGreaterThan(alreadyPaid, newTotal)) {
        setErrors({ totalAmount: `Total can't be below the ${formatCurrency(alreadyPaid)} already collected — reduce a payment in the ledger first.` });
        return;
      }
      Object.assign(editable, {
        totalAmount: newTotal,
        designerId: form.designerId,
        masterTailorId: form.masterTailorId,
      });
    }

    // Optimistic-lock token: the version this order was loaded with. If someone
    // else saved a change in the meantime, the API rejects this with a clear
    // "changed by someone else" message instead of silently overwriting them.
    editable.version = order.version;
    if (pmConfirmed && "dueDate" in editable) editable.confirmedWithProductionManager = true;

    setSubmitting(true);
    try {
      await ordersApi.update(order.id, editable);
      showToast("Order updated successfully.", "success");
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      if (isApiErrorCode(err, "DELIVERY_DAY_FULL")) {
        setFullDayPromptOpen(true);
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setSubmitError(message);
      showToast(message, "error");
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
            <DeliveryDateField
              disabled={!canEditContentFields}
              value={form.dueDate}
              onChange={(date) => set("dueDate", date)}
              confirmed={pmConfirmed}
              onConfirmedChange={setPmConfirmed}
              promptOpen={fullDayPromptOpen}
              onPromptOpenChange={setFullDayPromptOpen}
              originalValue={mode === "edit" ? order?.dueDate : undefined}
              excludeOrderId={mode === "edit" ? order?.id : undefined}
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
              <ProductCategoryPicker
                disabled={!canEditContentFields}
                value={form.productCategory}
                onChange={(v) => set("productCategory", v)}
              />
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
                  { value: "yes", label: "Yes", icon: "hand" },
                  { value: "no", label: "No", icon: "x" },
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
                  { value: "yes", label: "Yes", icon: "cog" },
                  { value: "no", label: "No", icon: "x" },
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
                { value: "yes", label: "Yes", icon: "cart" },
                { value: "no", label: "No", icon: "x" },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="💳" iconTone="green" title="Payment" subtitle={mode === "create" ? "Total, advance & schedule" : "Total & schedule"} />
          <CardBody className="flex flex-col gap-3.5">
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
              <FieldError>{errors.totalAmount}</FieldError>
              {!canEditPricingFields && (
                <p className="mt-1 text-[11px] text-text-muted">Only Owner/Manager can change pricing.</p>
              )}
              {mode === "edit" && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Payment status is derived from the ledger. Record payments on the order&rsquo;s Payment Ledger.
                </p>
              )}
            </div>

            {/* Optional advance collected at booking -- recorded as the first
                ledger entry, which derives the payment status. Create only. */}
            {mode === "create" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel>Advance Paid (₹)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={form.advanceAmount}
                      onChange={(e) => set("advanceAmount", e.target.value)}
                      placeholder="Optional"
                    />
                    <FieldError>{errors.advanceAmount}</FieldError>
                  </div>
                  <div>
                    <FieldLabel>Advance Method</FieldLabel>
                    <Select
                      disabled={form.advanceAmount === ""}
                      value={form.advanceMethod}
                      onChange={(e) => set("advanceMethod", e.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <p className="text-[11px] text-text-muted">
                  Leave the advance blank for an unpaid order. Enter the full total to mark it fully paid.
                </p>
              </>
            )}

            <div>
              <FieldLabel>Next Payment Date</FieldLabel>
              <Input
                type="date"
                disabled={!canEditContentFields}
                value={form.nextPaymentDate}
                onChange={(e) => set("nextPaymentDate", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-text-muted">When the next payment is expected (for due tracking). Optional.</p>
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
          {submitting ? (
            "Saving…"
          ) : mode === "create" ? (
            <>
              <Icon name="sparkles" size={16} /> Create Product Order
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
