"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useLayoutEffect, useRef, useTransition, type CSSProperties } from "react";
import { useAppState } from "./AppShell";
import { markFinanceDataChanged } from "./DataRefreshSync";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { HistoryIcon, HomeIcon, PlusIcon, ChartIcon, WalletIcon } from "./AppIcons";

type NavHref = "/" | "/history" | "/budgets" | "/reports";
const items = [
  { href: "/" as const, label: "Tổng quan", icon: HomeIcon, column: 1 },
  { href: "/reports" as const, label: "Báo cáo", icon: ChartIcon, column: 2 },
  { href: "/history" as const, label: "Giao dịch", icon: HistoryIcon, column: 4 },
  { href: "/budgets" as const, label: "Ngân sách", icon: WalletIcon, column: 5 }
];
function PendingFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span className="sr-only" role="status" data-nav-pending="true">Đang mở…</span> : null;
}

export function BottomNav() {
  const state = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const navigationTarget = useRef<NavHref | "/add" | null>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [adding, startAdding] = useTransition();
  useEffect(() => { navigationTarget.current = null; }, [pathname]);
  useLayoutEffect(() => {
    const node = dock.current;
    if (!node) return;
    const measure = () => document.documentElement.style.setProperty("--dock-height", `${node.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname.startsWith("/add") || ["/login", "/register", "/forgot-password"].includes(pathname)) return null;

  function handleRefreshNavigation(event: React.MouseEvent<HTMLAnchorElement>, href: NavHref) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (pathname === href) {
      event.preventDefault();
      if (navigationTarget.current && navigationTarget.current !== href) {
        router.push(href === "/history" ? state.historyHref : href, { scroll: false });
      } else {
        markFinanceDataChanged();
        if (href === "/reports") router.refresh();
      }
    }
    navigationTarget.current = href;
  }

  return <div ref={dock} className="navbar">
    <div className="bottom-nav-grid mx-auto max-w-md text-sm font-semibold"
      style={{ "--dock-slot": (items.find(item => item.href === pathname)?.column ?? 1) - 1 } as CSSProperties}>
      <span className="dock-indicator" aria-hidden="true" />
      <nav className="bottom-nav-destinations" aria-label="Điều hướng chính">
        {items.map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return <Link key={item.href}
            style={{ gridColumn: item.column, gridRow: 1 }}
            href={item.href === "/history" ? state.historyHref : item.href}
            scroll={item.href !== "/history"} prefetch={false}
            onNavigate={state.saveScroll}
            onClick={event => handleRefreshNavigation(event, item.href)}
            className={clsx("bottom-nav-item", active ? "bottom-nav-item-active" : "bottom-nav-item-idle")}
            aria-current={active ? "page" : undefined}>
            <Icon className="h-6 w-6" /><span>{item.label}</span><PendingFeedback />
          </Link>;
        })}
      </nav>
      <button type="button" className="bottom-nav-add" aria-label="Thêm giao dịch" aria-busy={adding} disabled={adding}
        onClick={() => {
          state.saveScroll();
          navigationTarget.current = "/add";
          startAdding(() => router.push("/add"));
        }}>
        <span className="bottom-nav-add-orb" aria-hidden="true"><PlusIcon className="h-7 w-7" /></span>
        <span className="bottom-nav-label">Thêm</span>
        {adding ? <span className="sr-only" role="status" data-nav-pending="true">Đang mở…</span> : null}
      </button>
    </div>
  </div>;
}
