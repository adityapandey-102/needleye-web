import { requireLeadsAccess } from "../../../modules/leads/requireLeadsAccess";
import { LeadsDashboard } from "../../../modules/leads/components/LeadsDashboard";

/** The Leads section: the owner sees every lead, a designer their own. */
export default async function LeadsPage() {
  const { isOwner } = await requireLeadsAccess();
  return <LeadsDashboard isOwner={isOwner} />;
}
