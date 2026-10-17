"use client";
import { useId, useState } from "react";
export function FilterAccordion({ initiallyOpen, children }: { initiallyOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return <div className="filter-accordion" data-open={open}>
    <button type="button" className="filter-trigger min-h-11 w-full py-3 text-left text-sm font-semibold text-slate-700"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Bộ lọc nâng cao<span aria-hidden="true">⌄</span></button>
    <div id={id} className="filter-grid" aria-hidden={!open} inert={!open}>
      <div className="filter-content">{children}</div>
    </div>
  </div>;
}
