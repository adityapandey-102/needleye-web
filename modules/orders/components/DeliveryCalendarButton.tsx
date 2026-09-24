"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { DeliveryCalendar } from "./DeliveryCalendar";

/**
 * "Delivery Calendar" on the Orders dashboard (owner and production manager):
 * the same calendar as the order form, in browse mode -- every day's load at a
 * glance, and a click on any day lists the orders due that day.
 */
export function DeliveryCalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Icon name="calendar" size={16} /> Delivery Calendar
      </Button>
      {open && <DeliveryCalendar mode="browse" onClose={() => setOpen(false)} />}
    </>
  );
}
