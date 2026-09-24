"use client";

import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";

/**
 * Error boundary for the orders subtree (renders inside the app shell). Catches
 * any unexpected failure while loading/rendering an orders page -- a real API
 * 5xx, a network drop mid-render -- and shows a recoverable fallback instead of
 * a white screen. `notFound()` (404s) is handled separately by not-found.tsx;
 * this is for everything else.
 */
export default function OrdersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-primary"><Icon name="alert" size={26} /></div>
      <h1 className="mt-3 font-serif text-xl font-bold text-text-primary">Something went wrong</h1>
      <p className="mt-2 text-sm text-text-secondary">
        We couldn&rsquo;t load this page. This is usually temporary&nbsp;&mdash; try again in a moment.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Link href="/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    </div>
  );
}
