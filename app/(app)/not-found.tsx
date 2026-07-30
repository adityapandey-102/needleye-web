import Link from "next/link";
import { Button } from "../../components/ui/Button";

/**
 * App-shell-wide not-found: rendered whenever an authenticated page calls
 * `notFound()` outside the orders subtree (e.g. a user detail / ID-card route
 * for a staff id that doesn't exist), and for unknown app URLs. Order pages
 * have their own, more specific not-found.tsx.
 */
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-4xl">🔍</div>
      <h1 className="mt-3 font-serif text-xl font-bold text-text-primary">Page not available</h1>
      <p className="mt-2 text-sm text-text-secondary">
        The page or record you&rsquo;re looking for doesn&rsquo;t exist, or you don&rsquo;t have access to it.
      </p>
      <Link href="/orders" className="mt-5 inline-block">
        <Button>← Back to Orders</Button>
      </Link>
    </div>
  );
}
