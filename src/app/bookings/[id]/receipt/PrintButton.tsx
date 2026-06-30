"use client";

import { Printer } from "lucide-react";

// Triggers the browser's print dialog (→ "Save as PDF"). Itself hidden in print.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-base btn-secondary print-hide text-sm"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      Print / Save as PDF
    </button>
  );
}
