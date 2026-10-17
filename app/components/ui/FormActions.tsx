"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
/** Fixed actions never sit inside the route's animated transform. */
export function FormActions({ children }: { children: React.ReactNode }) {
  const [fixed, setFixed] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 768px)");
    const viewport = window.visualViewport;
    let baseline = window.innerHeight;
    function update() {
      const element = document.activeElement;
      const editing = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
      const height = viewport?.height ?? window.innerHeight;
      if (!editing) baseline = Math.max(window.innerHeight, height);
      const keyboard = editing && (baseline - height > 120 || window.innerHeight - height > 120);
      setFixed(!desktop.matches && !keyboard);
    }
    update();
    desktop.addEventListener("change", update);
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      desktop.removeEventListener("change", update); viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update);
    };
  }, []);
  const content = <div className={fixed ? "form-actions" : "form-actions-inline"} data-keyboard-layout={fixed ? "fixed" : "flow"}>
    <div className="form-actions-inner">{children}</div>
  </div>;
  return fixed ? createPortal(content, document.getElementById("overlay-root") ?? document.body) : content;
}
