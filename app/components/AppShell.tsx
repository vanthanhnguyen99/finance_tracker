"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { DataRefreshSync } from "./DataRefreshSync";
import { activateUiUser, readUiSession, writeUiSession } from "@/lib/ui-session";

type UiState = {
  userId: string;
  historyHref: string;
  returnHref: string;
  cache: Map<string, unknown>;
  claimMotion: (pathname: string) => boolean;
  saveScroll: () => void;
};
const StateContext = createContext<UiState | null>(null);
export function useAppState() {
  const state = useContext(StateContext);
  if (!state) throw new Error("Financial UI requires AppShell");
  return state;
}
function safeHref(value: string, fallback: string) {
  return typeof value === "string" && /^\/(?:history|reports|budgets)?(?:\?[^#]*)?$/.test(value) ? value : fallback;
}
export function AppShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const url = `${pathname}${params.size ? `?${params}` : ""}`;
  const [historyHref, setHistoryHref] = useState("/history");
  const [returnHref, setReturnHref] = useState("/");
  const cache = useRef(new Map<string, unknown>());
  const motionPath = useRef<string | null>(null);
  const previousUrl = useRef<string | null>(null);
  const currentUrl = useRef(url);
  const lastScroll = useRef(0);
  // Record scroll while this URL is active; layout cleanup runs after router scroll handling.
  useEffect(() => {
    function remember() { lastScroll.current = window.scrollY; }
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, []);
  useLayoutEffect(() => {
    activateUiUser(userId);
    setHistoryHref(safeHref(readUiSession(userId, "history-href", "/history"), "/history"));
  }, [userId]);
  useLayoutEffect(() => {
    if (previousUrl.current && previousUrl.current !== url) {
      writeUiSession(userId, `scroll:${previousUrl.current}`, lastScroll.current);
    }
    if (pathname !== "/add") {
      setReturnHref(url);
      writeUiSession(userId, "return-href", url);
    } else {
      setReturnHref(safeHref(readUiSession(userId, "return-href", "/"), "/"));
    }
    if (pathname === "/history") {
      setHistoryHref(url);
      writeUiSession(userId, "history-href", url);
    }
    previousUrl.current = url;
    currentUrl.current = url;
    lastScroll.current = 0;
  }, [pathname, url, userId]);
  const claimMotion = useCallback((path: string) => {
    if (motionPath.current === path) return false;
    motionPath.current = path; return true;
  }, []);
  const state: UiState = {
    userId, historyHref, returnHref, cache: cache.current,
    claimMotion,
    saveScroll() {
      // Freeze list anchors for route actions as well as links before router scrolling.
      window.dispatchEvent(new Event("finance-tracker:before-navigation"));
      writeUiSession(userId, `scroll:${currentUrl.current}`, window.scrollY);
    }
  };
  return <StateContext.Provider value={state}>
    <a href="#main-content" className="skip-link">Đi đến nội dung</a>
    <DataRefreshSync />
    {children}
    <BottomNav />
    <div id="overlay-root" />
  </StateContext.Provider>;
}
