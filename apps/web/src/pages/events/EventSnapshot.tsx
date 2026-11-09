import type { Event } from "@dance/schemas";
import { useTranslation } from "../../i18n/useTranslation";
import { EventContent } from "./EventContent";
import { eventDate, stageKey } from "../../features/events/setup";
import { languageNames } from "../../i18n/locale";
export function EventSnapshot({ event, allLanguages = true }: { event: Event; allLanguages?: boolean }) {
  const { t, locale } = useTranslation();
  return <dl className="setup-grid">
    <div><dt>{t("Events.nameLabel")}</dt><dd>{event.name}</dd></div>
    <div><dt>{t("Events.stageLabel")}</dt><dd>{t(stageKey[event.stage])}</dd></div>
    <div><dt>{t("Events.startsAtLabel")}</dt><dd>{eventDate(event.startsAt, locale, event.timeZone)}</dd></div>
    <div><dt>{t("Events.endsAtLabel")}</dt><dd>{eventDate(event.endsAt, locale, event.timeZone)}</dd></div>
    <div><dt>{t("Setup.timeZone")}</dt><dd>{event.timeZone}</dd></div>
    <div><dt>{t("Setup.cutoff")}</dt><dd>{event.registrationDeadline ? eventDate(event.registrationDeadline, locale, event.timeZone) : t("Setup.noCutoff")}</dd></div>
    <div><dt>{t("Events.venue")}</dt><dd>{event.venue || "—"}</dd></div>
    <div><dt>{t("Common.city")}</dt><dd>{event.city || "—"}</dd></div>
    <div><dt>{t("Common.country")}</dt><dd>{event.country || "—"}</dd></div>
    <div><dt>{t("Setup.organizerEmail")}</dt><dd>{event.organizerEmail || "—"}</dd></div>
    <div><dt>{t("Setup.organizerPhone")}</dt><dd>{event.organizerPhone || "—"}</dd></div>
    <div><dt>{t("Setup.maxStudios")}</dt><dd>{event.maxStudios === null ? "—" : new Intl.NumberFormat(locale).format(event.maxStudios)}</dd></div>
    <div><dt>{t("Setup.maxPerformances")}</dt><dd>{event.maxPerformances === null ? "—" : new Intl.NumberFormat(locale).format(event.maxPerformances)}</dd></div>
    <div><dt>{t("Setup.description")}</dt><dd><EventContent event={event} />
      {allLanguages && event.description && <><p>{t("Setup.sourceLocale")}: <span lang={event.description.sourceLocale}>{languageNames[event.description.sourceLocale]}</span></p>
        <p lang={event.description.sourceLocale} className="setup-prose">{event.description.sourceText}</p>
        {Object.entries(event.description.translations).map(([language, text]) => <div key={language}><p>{language}</p><p lang={language} className="setup-prose">{text}</p></div>)}</>}
    </dd></div>
  </dl>;
}
