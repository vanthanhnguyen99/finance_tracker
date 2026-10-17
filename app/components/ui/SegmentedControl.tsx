"use client";
import type { CSSProperties } from "react";

export function SegmentedControl<T extends string>({ items, value, onChange, disabled, label, id }: {
  items: readonly { key: T; label: string }[]; value: T; onChange: (value: T) => void;
  disabled?: boolean; label: string; id: string;
}) {
  return <div className="segmented-control mt-6" role="tablist" aria-label={label}
    style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, "--segment-count": items.length, "--segment-index": items.findIndex(item => item.key === value) } as CSSProperties}>
    <span className="segmented-indicator" aria-hidden="true" />
    {items.map((item, index) => <button key={item.key} type="button" role="tab" id={`${id}-${item.key}`}
      aria-controls={`${id}-panel`} aria-selected={item.key === value} tabIndex={item.key === value ? 0 : -1}
      disabled={disabled} className={`segmented-item ${item.key === value ? "segmented-item-active" : ""}`}
      onClick={() => onChange(item.key)} onKeyDown={event => {
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!offset && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + offset + items.length) % items.length;
        onChange(items[next].key);
        document.getElementById(`${id}-${items[next].key}`)?.focus();
      }}>{item.label}</button>)}
  </div>;
}
