"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { HistoryIcon, HomeIcon, PlusIcon } from "./AppIcons";

type NavHref = "/" | "/add" | "/history";

const items = [
  { href: "/" as const, label: "Tổng quan", icon: HomeIcon },
  { href: "/add" as const, label: "Thêm", icon: PlusIcon },
  { href: "/history" as const, label: "Giao dịch", icon: HistoryIcon }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (
    pathname.startsWith("/add") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  ) {
    return null;
  }

  function handleRefreshNavigation(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: NavHref
  ) {
    if (href !== "/" && href !== "/history") return;
    event.preventDefault();
    const target = `${href}?refresh=${Date.now()}`;
    if (pathname === href) {
      router.replace(target, { scroll: false });
      return;
    }
    router.push(target, { scroll: false });
  }

  return (
    <nav className="navbar">
      <div className="mx-auto max-w-md px-3 text-sm font-semibold">
        <div className="bottom-nav-grid">
          {items.map((item) => {
            const active = pathname === item.href;
            const isAdd = item.href === "/add";
            const Icon = item.icon;

            if (isAdd) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => handleRefreshNavigation(event, item.href)}
                  className="bottom-nav-add"
                  aria-label="Thêm giao dịch"
                >
                  <span
                    className={clsx(
                      "bottom-nav-add-orb",
                      active && "bottom-nav-add-orb-active"
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={clsx(
                      "bottom-nav-label",
                      active && "bottom-nav-label-active"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(event) => handleRefreshNavigation(event, item.href)}
                className={clsx(
                  "bottom-nav-item",
                  active ? "bottom-nav-item-active" : "bottom-nav-item-idle"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-6 w-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
