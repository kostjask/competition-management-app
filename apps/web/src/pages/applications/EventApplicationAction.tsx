import { Link } from "react-router-dom";
import type { Event } from "@dance/schemas";
import { useAuth } from "../../auth/useAuth";
import { useTranslation } from "../../i18n/useTranslation";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { Button, LoadingState } from "../../components/ui/Foundation";
import { applicationOpen, applyUrl, studioUrl } from "./applicationModel";
import type { useOwnedApplications } from "./useOwnedApplications";

export function EventApplicationAction({ event, studios, error, retry }: { event: Event } & ReturnType<typeof useOwnedApplications>) {
  const { t } = useTranslation(); const { user } = useAuth();
  const owned = studios?.filter(studio => studio.eventId === event.id);
  if (error) return <div><ErrorFeedback error={error} /><Button variant="secondary" onClick={retry}>{t("Application.refresh")}</Button></div>;
  if (studios === null) return <LoadingState label={t("Access.loading")} />;
  if (owned?.length) return <>{owned.map(studio => <Link className="ui-button ui-button-secondary" key={studio.id} to={studioUrl(studio.id)}>{t("Application.status")}: {studio.name}</Link>)}</>;
  if (user?.isAdmin) return null;
  return applicationOpen(event) ? <Link className="ui-button ui-button-primary" to={applyUrl(event.id)}>{t("Application.apply")}</Link> : <p>{t("Application.closed")}</p>;
}
