const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export interface EnquiryFormConfig {
  formToken: string;
  /** Set only while Cloudflare Turnstile is switched on (API env). */
  turnstileSiteKey: string | null;
}

export interface EnquiryFields {
  name: string;
  phone: string;
  requirement: string;
}

export type EnquiryResult =
  | { kind: "received" | "already_received"; message: string }
  | { kind: "invalid"; fieldErrors: Partial<Record<keyof EnquiryFields, string>> }
  | { kind: "expired" | "verification" | "rate_limited" | "error"; message: string };

/**
 * The PUBLIC enquiry form's two calls -- deliberately NOT apiFetch: no session,
 * no bearer token, no refresh. Anyone on the internet may use these, so they
 * carry nothing but the form's own fields.
 */
export const publicEnquiryApi = {
  async formConfig(): Promise<EnquiryFormConfig> {
    const res = await fetch(`${API_BASE_URL}/public/enquiry-form`, { cache: "no-store" });
    if (!res.ok) throw new Error("The form couldn't load. Please refresh the page.");
    return (await res.json()) as EnquiryFormConfig;
  },

  async submit(fields: EnquiryFields & { formToken: string; website: string; turnstileToken?: string }): Promise<EnquiryResult> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/public/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    } catch {
      return { kind: "error", message: "We couldn't reach our server. Please check your connection and try again." };
    }
    const body = (await res.json().catch(() => ({}))) as {
      result?: "received" | "already_received";
      message?: string;
      code?: string;
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
    if (res.ok && body.result) return { kind: body.result, message: body.message ?? "" };
    if (res.status === 429) return { kind: "rate_limited", message: body.error ?? "Too many enquiries. Please try again later." };
    if (body.code === "ENQUIRY_FORM_EXPIRED") return { kind: "expired", message: body.error ?? "This form has expired. Please reload the page." };
    if (body.code === "ENQUIRY_VERIFICATION_FAILED") return { kind: "verification", message: body.error ?? "Please complete the check and try again." };
    if (body.code === "VALIDATION_ERROR") {
      const fe = body.details?.fieldErrors ?? {};
      return {
        kind: "invalid",
        fieldErrors: { name: fe.name?.[0], phone: fe.phone?.[0], requirement: fe.requirement?.[0] },
      };
    }
    return { kind: "error", message: "Something went wrong. Please try again in a moment." };
  },
};
