import Link from "next/link";
import { Icon } from "../../../components/ui/Icon";

/** "← Reports" plus the report's title -- the top of each report page. */
export function ReportPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <Icon name="chevron-right" size={15} className="rotate-180" />
        Reports
      </Link>
      <h1 className="page-title mt-2">{title}</h1>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}
