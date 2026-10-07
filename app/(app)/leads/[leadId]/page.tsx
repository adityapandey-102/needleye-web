import { notFound } from "next/navigation";
import { requireLeadsAccess } from "../../../../modules/leads/requireLeadsAccess";
import { LeadDetailView } from "../../../../modules/leads/components/LeadDetailView";

/** One lead (the owner: any; a designer: their own -- the API answers 404 otherwise). */
export default async function LeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { isOwner } = await requireLeadsAccess();
  const { leadId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) notFound();
  return <LeadDetailView leadId={leadId} isOwner={isOwner} />;
}
