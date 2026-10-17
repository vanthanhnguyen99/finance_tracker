"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HistoryResult } from "@/lib/history";
import { useAppState } from "./AppShell";
import { getFinanceDataVersion } from "./DataRefreshSync";

type Position = { y: number; anchor: string | null; offset: number };
type Entry = { result: HistoryResult; pages: number; signature: string; version: string; position: Position };
function merge(previous: HistoryResult, next: HistoryResult): HistoryResult {
  const seen = new Set(previous.items.map(item => `${item.type}:${item.id}`));
  return { ...next, items: [...previous.items, ...next.items.filter(item => !seen.has(`${item.type}:${item.id}`))] };
}
function position(): Position {
  const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-history-key]"));
  const row = rows.find(node => node.getBoundingClientRect().bottom > 90);
  return { y: window.scrollY, anchor: row?.dataset.historyKey ?? null, offset: row?.getBoundingClientRect().top ?? 0 };
}
function restore(saved: Position) {
  const row = Array.from(document.querySelectorAll<HTMLElement>("[data-history-key]"))
    .find(node => node.dataset.historyKey === saved.anchor);
  window.scrollTo({ top: row ? window.scrollY + row.getBoundingClientRect().top - saved.offset : saved.y, behavior: "instant" });
}
export function useHistoryState(initial: HistoryResult, query: string, timeZone: string) {
  const app = useAppState();
  const cacheKey = `history:${app.userId}:${timeZone}:${query}`;
  const signature = JSON.stringify(initial);
  const entry = app.cache.get(cacheKey) as Entry | undefined;
  const version = getFinanceDataVersion();
  const reusable = entry?.signature === signature && entry.version === version;
  const [result, setResult] = useState(reusable ? entry.result : initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const record = useRef<Entry>(entry ?? { result: initial, pages: 1, signature, version, position: { y: 0, anchor: null, offset: 0 } });
  const generation = useRef(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const restoring = useRef(false);
  const savedCache = app.cache;
  const saveRecord = useCallback(() => {
    savedCache.set(cacheKey, record.current);
    if (savedCache.size > 12) savedCache.delete(savedCache.keys().next().value!);
  }, [savedCache, cacheKey]);

  const fetchPage = useCallback(async (cursor: string | null, signal: AbortSignal): Promise<HistoryResult> => {
    const params = new URLSearchParams(query); if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/history?${params}`, { cache: "no-store", signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Không thể tải giao dịch.");
    return payload;
  }, [query]);
  useEffect(() => {
    function invalidate() {
      controller.current?.abort(); generation.current++; busy.current = false;
      setRevision(value => value + 1);
    }
    window.addEventListener("finance-tracker:data-changed", invalidate);
    return () => window.removeEventListener("finance-tracker:data-changed", invalidate);
  }, []);
  useLayoutEffect(() => {
    const cached = savedCache.get(cacheKey) as Entry | undefined;
    const dataVersion = getFinanceDataVersion();
    const valid = cached?.signature === signature && cached.version === dataVersion;
    const targetPages = cached?.pages ?? record.current.pages;
    const savedPosition = cached?.position ?? record.current.position;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const run = ++generation.current;
    let frame = 0;
    async function rebuild() {
      busy.current = true; restoring.current = true; setLoading(true); setError("");
      try {
        let fresh = valid ? cached.result : initial;
        // Events can arrive before the RSC refresh; query the first page for that case.
        if (!valid && cached && cached.version !== dataVersion) fresh = await fetchPage(null, abort.signal);
        let pages = valid ? cached.pages : 1;
        if (!valid) {
          setResult(fresh);
          while (pages < targetPages && fresh.nextCursor) {
            fresh = merge(fresh, await fetchPage(fresh.nextCursor, abort.signal)); pages++;
          }
        }
        if (run !== generation.current || abort.signal.aborted) return;
        record.current = { result: fresh, pages, signature, version: dataVersion, position: savedPosition };
        setResult(fresh); saveRecord();
        frame = requestAnimationFrame(() => { restore(savedPosition); restoring.current = false; });
      } catch (err) {
        if (!abort.signal.aborted) { setError(err instanceof Error ? err.message : "Không thể khôi phục giao dịch."); restoring.current = false; }
      } finally {
        if (run === generation.current) { busy.current = false; setLoading(false); }
      }
    }
    void rebuild();
    return () => { abort.abort(); cancelAnimationFrame(frame); generation.current = run + 1; };
    // Only first-page data, the query identity, or explicit invalidation can rebuild pages.
  }, [signature, cacheKey, revision, saveRecord, fetchPage, initial, savedCache]);

  useEffect(() => {
    let frame = 0;
    function freezePosition() {
      cancelAnimationFrame(frame); frame = 0;
      record.current.position = position(); saveRecord();
      restoring.current = true;
    }
    function beforeNavigation(event: MouseEvent) {
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank") return;
      const target = new URL(link.href);
      if (target.origin !== location.origin || target.pathname.startsWith("/api/") || target.href === location.href) return;
      // Router scroll handling may run before effect cleanup; do not overwrite the saved anchor.
      freezePosition();
    }
    function remember() {
      if (restoring.current || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; record.current.position = position(); saveRecord(); });
    }
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("pagehide", remember);
    window.addEventListener("finance-tracker:before-navigation", freezePosition);
    document.addEventListener("click", beforeNavigation, true);
    return () => {
      window.removeEventListener("scroll", remember); window.removeEventListener("pagehide", remember);
      window.removeEventListener("finance-tracker:before-navigation", freezePosition);
      document.removeEventListener("click", beforeNavigation, true);
      cancelAnimationFrame(frame);
    };
  }, [saveRecord]);

  async function loadMore() {
    if (busy.current || !record.current.result.nextCursor) return;
    busy.current = true; setLoading(true); setError("");
    const run = generation.current;
    const abort = controller.current ?? new AbortController(); controller.current = abort;
    try {
      const next = await fetchPage(record.current.result.nextCursor, abort.signal);
      if (run !== generation.current || abort.signal.aborted) return;
      record.current = { ...record.current, result: merge(record.current.result, next), pages: record.current.pages + 1 };
      setResult(record.current.result); saveRecord();
    } catch (err) { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Không thể tải thêm giao dịch."); }
    finally { if (run === generation.current) { busy.current = false; setLoading(false); } }
  }
  return { result, loading, error, loadMore };
}
