import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudios } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { Button } from "../../components/ui/Foundation";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { useTranslation } from "../../i18n/useTranslation";

export function EventReviewSummary({ eventId }: { eventId: string }) {
  const { t, locale } = useTranslation(); const [counts, setCounts] = useState<{ organization: number; event: number } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void getStudios(eventId).then(rows => { if (active) setCounts({ organization: rows.filter(row => row.studio.approvalStatus === "PENDING").length, event: rows.filter(row => row.status === "PENDING").length }); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId, attempt]);
  const root = `/admin/events/${encodeURIComponent(eventId)}/applications`;
  return <div>{error ? <><ErrorFeedback error={error} /><Button variant="quiet" onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button></> : !counts ? <p role="status">{t("Access.loading")}</p> : <>
    <p><Link to={root + "?axis=ORGANIZATION&status=PENDING"}>{t("Application.organization")}: {new Intl.NumberFormat(locale).format(counts.organization)}</Link></p>
    <p><Link to={root + "?axis=EVENT&status=PENDING"}>{t("Application.event")}: {new Intl.NumberFormat(locale).format(counts.event)}</Link></p>
  </>}</div>;
}
