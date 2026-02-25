"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

type NavHref = "/" | "/add" | "/history";

const items: { href: NavHref; label: string }[] = [
  { href: "/", label: "Tổng quan" },
  { href: "/add", label: "Thêm" },
  { href: "/history", label: "Lịch sử" }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") return null;

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
      <div className="mx-auto max-w-md px-4 pt-2 text-sm font-semibold">
        <div className="bottom-nav-grid">
          {items.map((item) => {
            const active = pathname === item.href;
            const isAdd = item.href === "/add";

            if (isAdd) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => handleRefreshNavigation(event, item.href)}
                  className="bottom-nav-add"
                >
                  <span
                    className={clsx(
                      "bottom-nav-add-orb",
                      active && "bottom-nav-add-orb-active"
                    )}
                    aria-hidden="true"
                  >
                    +
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
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
