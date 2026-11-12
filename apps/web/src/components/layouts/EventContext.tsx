import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getEvent, type Event } from "../../api/events";
import { useAuth } from "../../auth/useAuth";
import { useTranslation } from "../../i18n/useTranslation";
import { toUiError, type UiError } from "../../api/error";
import { ErrorFeedback } from "../ErrorFeedback";
import { Button } from "../ui/Foundation";

function EventName({ id }: { id: string }) {
  const { t } = useTranslation(); const [value, setValue] = useState<Event | null>(null); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void getEvent(id).then(event => { if (active) setValue(event); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [id, attempt]);
  return <aside className="mx-auto max-w-6xl px-4 pt-4 break-words" aria-label={t("Shell.events")}>
    {value ? <p>{t("Shell.eventContext", { name: value.name })}</p> : error ? <><ErrorFeedback error={error} /><Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button></> : <p role="status">{t("Access.loading")}</p>}
    {value && <p className="text-sm text-slate-600">{t("Organizer.zone")}: {value.timeZone}</p>}
  </aside>;
}
export function EventContext() {
  const { pathname } = useLocation(); const { user } = useAuth();
  const id = /^\/events\/([A-Za-z0-9_-]+)(?:\/edit)?$/.exec(pathname)?.[1];
  return user && id && id !== "new" ? <EventName key={id} id={id} /> : null;
}
