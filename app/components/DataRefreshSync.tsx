"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const DATA_VERSION_KEY = "finance_tracker_data_version";
const SEEN_VERSION_PREFIX = "finance_tracker_seen_version:";
const DATA_CHANGED_EVENT = "finance-tracker:data-changed";

let memoryVersion: string | null = null;
const memorySeenVersions = new Map<string, string>();

function readStorage(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // The in-memory fallback still covers client-side navigation in restricted WebViews.
  }
}

export function markFinanceDataChanged() {
  const version = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memoryVersion = version;
  writeStorage(DATA_VERSION_KEY, version);
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

export function DataRefreshSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/" && pathname !== "/history") return;

    function refreshIfStale() {
      const version = readStorage(DATA_VERSION_KEY) ?? memoryVersion;
      if (!version) return;

      const seenKey = `${SEEN_VERSION_PREFIX}${pathname}`;
      const seenVersion = readStorage(seenKey) ?? memorySeenVersions.get(pathname);
      if (seenVersion === version) return;

      memorySeenVersions.set(pathname, version);
      writeStorage(seenKey, version);
      router.refresh();
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") refreshIfStale();
    }

    refreshIfStale();
    window.addEventListener("pageshow", refreshIfStale);
    window.addEventListener(DATA_CHANGED_EVENT, refreshIfStale);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("pageshow", refreshIfStale);
      window.removeEventListener(DATA_CHANGED_EVENT, refreshIfStale);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pathname, router]);

  return null;
}
