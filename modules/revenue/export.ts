// Pure formatting/CSV-building logic lives in lib/domain (unit-tested there);
// re-exported here so revenue components have one import site.
export { periodLabel, revenueToCsv } from "../../lib/domain";

/** Triggers a client-side download of `content` as a CSV file. */
export function downloadCsv(filename: string, content: string): void {
  // Prepend a UTF-8 BOM so Excel reads currency/unicode correctly.
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
