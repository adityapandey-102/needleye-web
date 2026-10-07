import { requireLeadsAccess } from "../../../../modules/leads/requireLeadsAccess";
import { ManualLeadForm } from "../../../../modules/leads/components/ManualLeadForm";

/** Owner only: add a lead by hand (walk-in, phone call, Instagram, ...). */
export default async function NewLeadPage() {
  await requireLeadsAccess({ ownerOnly: true });
  return <ManualLeadForm />;
}
