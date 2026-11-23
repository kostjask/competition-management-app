import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, toUiError, type UiError } from "../../api/error";

const POLL_MS = 5000;
const STALE_MS = 15000;
export const LIVE_REQUEST_MS = 8000;

export function useLiveConnection<T extends { eventId: string }>(eventId: string, paused: boolean,
  read: (signal: AbortSignal) => Promise<T>, onRead: (workspace: T) => void, onAccessLost: () => void) {
  const [snapshot, setSnapshot] = useState<{ workspace: T; receivedAt: number } | null>(null);
  const [failure, setFailure] = useState<{ ui: UiError; denied: boolean } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [stale, setStale] = useState<"awaiting" | "interrupted" | null>(() => navigator.onLine ? null : "interrupted");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);

  const invalidate = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setLoading(false);
    setStale(current => current ?? "awaiting");
  }, []);

  const refresh = useCallback(async () => {
    if (paused || !navigator.onLine || active.current) return;
    const request = new AbortController();
    active.current = request;
    setLoading(true);
    try {
      const workspace = await read(AbortSignal.any([request.signal, AbortSignal.timeout(LIVE_REQUEST_MS)]));
      if (request.signal.aborted) return;
      if (workspace.eventId !== eventId) throw new ApiError(502, "Wrong live event", undefined, "INVALID_RESPONSE", "invalidResponse");
      onRead(workspace);
      setSnapshot({ workspace, receivedAt: Date.now() });
      setFailure(null);
      setStale(null);
    } catch (error) {
      if (request.signal.aborted) return;
      const denied = error instanceof ApiError && [401, 403, 404].includes(error.statusCode);
      if (denied) setSnapshot(null);
      if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) onAccessLost();
      setFailure({ ui: toUiError(error), denied });
      setStale(denied ? "awaiting" : "interrupted");
    } finally {
      if (active.current === request) {
        active.current = null;
        setLoading(false);
      }
    }
  }, [eventId, onAccessLost, onRead, paused, read]);

  useEffect(() => {
    const connectivity = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      invalidate();
      if (!isOnline) setStale("interrupted");
      void refresh();
    };
    const resume = () => { if (document.visibilityState === "visible") connectivity(); };
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    window.addEventListener("offline", connectivity);
    window.addEventListener("online", connectivity);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("online", connectivity);
      document.removeEventListener("visibilitychange", resume);
      active.current?.abort();
      active.current = null;
    };
  }, [invalidate, refresh]);

  useEffect(() => {
    if (!snapshot) return;
    const timer = window.setTimeout(() => setStale("interrupted"), STALE_MS);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  const receivedAt = snapshot?.receivedAt;
  const fresh = useCallback(() => receivedAt !== undefined && online && navigator.onLine && !stale && !paused && Date.now() - receivedAt < STALE_MS,
    [receivedAt, online, stale, paused]);
  return { snapshot, failure, loading, online, connected: !!snapshot && online && !stale && !paused,
    interrupted: stale === "interrupted" && !failure?.denied, fresh, invalidate, refresh };
}
