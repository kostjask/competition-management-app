import { useEffect, useState } from "react";
import type { Studio } from "@dance/schemas";
import { getMyStudios } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { ownedStudios } from "./applicationModel";
export function useOwnedApplications() {
  const { user } = useAuth();
  const [studios, setStudios] = useState<Studio[] | null>(null); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getMyStudios().then(result => { if (active) { setStudios(ownedStudios(result, user?.id ?? "")); setError(null); } }).catch((e: unknown) => { if (active) setError(toUiError(e)); });
    return () => { active = false; };
  }, [user?.id, attempt]);
  return { studios, error, retry: () => setAttempt(value => value + 1) };
}
