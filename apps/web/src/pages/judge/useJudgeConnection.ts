import { useCallback, useEffect, useRef, useState } from "react";
import type { JudgeScoringWorkspace } from "@dance/schemas";
import { getJudgeScoring } from "../../api/scoring";
import { ApiError, toUiError, type UiError } from "../../api/error";

const POLL_MS = 5000;
const STALE_MS = 15000;
export const JUDGE_REQUEST_MS = 8000;

export function useJudgeConnection(eventId: string, operationId: string | undefined, paused: boolean,
  onRead: (workspace: JudgeScoringWorkspace) => void) {
  const [snapshot, setSnapshot] = useState<{ workspace: JudgeScoringWorkspace; receivedAt: number } | null>(null);
  const [failure, setFailure] = useState<{ ui: UiError; denied: boolean } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);

  const invalidate = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setLoading(false);
    setStale(true);
  }, []);

  const refresh = useCallback(async () => {
    if (paused || !navigator.onLine || active.current) return;
    const request = new AbortController();
    active.current = request;
    setLoading(true);
    try {
      const workspace = await getJudgeScoring(eventId, operationId, AbortSignal.any([request.signal, AbortSignal.timeout(JUDGE_REQUEST_MS)]));
      if (request.signal.aborted) return;
      if (workspace.eventId !== eventId) throw new ApiError(502, "Wrong scoring event", undefined, "INVALID_RESPONSE", "invalidResponse");
      onRead(workspace);
      setSnapshot({ workspace, receivedAt: Date.now() });
      setFailure(null);
      setStale(false);
    } catch (error) {
      if (request.signal.aborted) return;
      const denied = error instanceof ApiError && [401, 403, 404].includes(error.statusCode);
      if (denied) setSnapshot(null);
      setFailure({ ui: toUiError(error), denied });
      setStale(true);
    } finally {
      if (active.current === request) {
        active.current = null;
        setLoading(false);
      }
    }
  }, [eventId, onRead, operationId, paused]);

  useEffect(() => {
    const connectivity = () => {
      setOnline(navigator.onLine);
      invalidate();
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
    const timer = window.setTimeout(() => setStale(true), STALE_MS);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  const receivedAt = snapshot?.receivedAt;
  const fresh = useCallback(() => receivedAt !== undefined && online && navigator.onLine && !stale && !paused && Date.now() - receivedAt < STALE_MS,
    [receivedAt, online, stale, paused]);
  return { snapshot, failure, loading, online, connected: !!snapshot && online && !stale, fresh, invalidate, refresh };
}
