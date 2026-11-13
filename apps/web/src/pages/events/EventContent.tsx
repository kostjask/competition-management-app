import { resolveAuthoredContent, type Event } from "@dance/schemas";
import { useTranslation } from "../../i18n/useTranslation";
export function EventContent({ event }: { event: Event }) {
  const { t, locale } = useTranslation();
  if (event.description) {
    const content = resolveAuthoredContent(event.description, locale);
    return <>{content.fallback && <p className="ui-help">{t("Registration.contentFallback")}</p>}<p className="setup-prose" lang={content.lang}>{content.text}</p></>;
  }
  return event.unclassifiedDescription ? <><p className="ui-help">{t("Setup.unclassified")}</p><p className="setup-prose" lang="">{event.unclassifiedDescription}</p></> : <p className="ui-help">{t("Setup.noDescription")}</p>;
}
