/**
 * Customer-facing pages (no login, no app chrome) -- the enquiry page, which
 * draws its own full brand layout (modules/leads/components/EnquiryLanding).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
