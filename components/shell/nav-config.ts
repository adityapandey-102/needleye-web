import { hasCapability, type Capability, type Role } from "../../lib/domain";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  requires?: Capability;
  /** Shows a red count bubble (see modules/leads/components/LeadsBadgeProvider). */
  badge?: "leads";
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Orders",
    items: [
      { label: "Create New Order", href: "/orders/new", icon: "✦", requires: "orders:create" },
      { label: "All Orders", href: "/orders", icon: "📋", requires: "orders:read" },
    ],
  },
  {
    // Enquiries until they become orders: the owner sees every lead, a designer their own.
    label: "Customers",
    items: [{ label: "Leads", href: "/leads", icon: "inbox", requires: "leads:read", badge: "leads" }],
  },
  {
    // Only real pages live here -- no greyed-out "soon" placeholders.
    label: "Business",
    items: [
      { label: "Revenue & Ledger", href: "/revenue", icon: "💰", requires: "reports:financial" },
      { label: "Reports", href: "/reports", icon: "📊", requires: "reports:staff" },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "User Management", href: "/admin/users", icon: "🛡️", requires: "users:manage" }],
  },
];

export function visibleNavSections(role: Role): NavSection[] {
  // Workers have no dashboard at all -- they only ever open a single order via
  // its QR scan. Their landing is /scan (see app/(app)/scan), the sidebar is empty.
  if (role === "worker") return [];

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.requires || hasCapability(role, item.requires)),
  })).filter((section) => section.items.length > 0);
}
