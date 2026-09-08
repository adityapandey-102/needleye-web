import { hasCapability, type Capability, type Role } from "../../lib/domain";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
  requires?: Capability;
  comingSoon?: boolean;
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
    label: "Production",
    items: [
      { label: "Stitching Queue", icon: "🧵", comingSoon: true },
      { label: "Hand Work", icon: "✋", comingSoon: true },
      { label: "Machine Work", icon: "⚙️", comingSoon: true },
      { label: "Quality Check", icon: "✅", comingSoon: true },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Revenue & Ledger", href: "/revenue", icon: "💰", requires: "reports:financial" },
      { label: "Purchases", icon: "🛒", comingSoon: true },
      { label: "Reports", icon: "📊", comingSoon: true },
      { label: "Team", icon: "👥", comingSoon: true },
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
