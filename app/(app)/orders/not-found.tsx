import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";

/**
 * Rendered (inside the app shell) whenever an order page calls `notFound()` --
 * i.e. the order doesn't exist, or it's outside the caller's row scope (a
 * Designer/Master Tailor opening an order that isn't assigned to them). The
 * API returns 404 rather than 403 on purpose, so existence is never confirmed.
 */
export default function OrderNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-primary"><Icon name="search" size={26} /></div>
      <h1 className="mt-3 font-serif text-xl font-bold text-text-primary">Order not available</h1>
      <p className="mt-2 text-sm text-text-secondary">
        This order doesn&rsquo;t exist, or it isn&rsquo;t assigned to you. Designers and Master Tailors can only open orders
        assigned to them.
      </p>
      <Link href="/orders" className="mt-5 inline-block">
        <Button>
          <Icon name="chevron-right" size={16} className="rotate-180" />
          Back to Orders
        </Button>
      </Link>
    </div>
  );
}
