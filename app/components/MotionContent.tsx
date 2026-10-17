"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppState } from "./AppShell";
import { cssTimeToMilliseconds } from "@/lib/ui-motion";
export function MotionContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { claimMotion } = useAppState();
  useLayoutEffect(() => {
    if (!claimMotion(pathname) || document.documentElement.dataset.visualStyle !== "glass" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;
    // WAAPI uses the CSS motion tokens and removes transform after completion.
    const style = getComputedStyle(document.documentElement);
    const duration = cssTimeToMilliseconds(style.getPropertyValue(pathname === "/add" ? "--motion-slow" : "--motion-base"));
    const animation = node.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration, easing: style.getPropertyValue("--ease-enter").trim() });
    return () => animation.cancel();
  }, [pathname, claimMotion]); // State holds persistent motion ownership; data refresh is not a route entry.
  return <div ref={ref} className="route-content">{children}</div>;
}
