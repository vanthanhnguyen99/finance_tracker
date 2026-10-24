import type { ComponentProps } from "react";
import clsx from "clsx";

export function GlassSurface({ as: Tag = "div", className, ...props }: ComponentProps<"div"> & { as?: "div" | "header" }) {
  return <Tag className={clsx("glass-surface", className)} {...props} />;
}
export function DataCard({ className, ...props }: ComponentProps<"section">) {
  return <section className={clsx("card", className)} {...props} />;
}
export function Button({ className, variant = "primary", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = { primary: "", secondary: "button-secondary", ghost: "button-ghost", danger: "button-danger" };
  return <button className={clsx("button", variants[variant], className)} {...props} />;
}
export function TextField({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx("input", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx("select", className)} {...props} />;
}
export function Feedback({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return <div role={tone === "error" ? "alert" : "status"} className={clsx("alert mt-4", tone === "error" ? "bg-danger-light text-danger-dark" : "bg-success-light text-success-dark")}>{children}</div>;
}
