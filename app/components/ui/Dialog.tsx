"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Native top-layer dialog supplies focus containment and makes the app inert. */
export function Dialog({ open, onClose, labelledBy, children }: {
  open: boolean; onClose: () => void; labelledBy: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={ref} className="app-dialog" aria-labelledby={labelledBy}
      onCancel={event => { event.preventDefault(); onCloseRef.current(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCloseRef.current();
      }}>
      {children}
    </dialog>, document.getElementById("overlay-root") ?? document.body
  );
}
