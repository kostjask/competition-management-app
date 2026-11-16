import { Link } from "react-router-dom";
import { EntrySettingsSchema, type CmsDocument, type CmsLocale } from "@dance/schemas";
import { contentTranslations } from "../../i18n/contentTranslations";
export function ContentFacts({ facts, locale }: { facts: NonNullable<CmsDocument["facts"]>; locale: CmsLocale }) {
  const copy = contentTranslations; const policy = EntrySettingsSchema.safeParse(facts.entrySettings);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: facts.timeZone }).format(new Date(value)) : copy.none[locale];
  return <section className="cms-facts"><h3>{copy.facts[locale]}</h3><dl>
    <dt>{copy.startsAt[locale]}</dt><dd>{date(facts.startsAt)}</dd><dt>{copy.endsAt[locale]}</dt><dd>{date(facts.endsAt)}</dd>
    <dt>{copy.timeZone[locale]}</dt><dd>{facts.timeZone}</dd><dt>{copy.venue[locale]}</dt><dd>{facts.venue ?? copy.none[locale]}</dd>
    <dt>{copy.registrationDeadline[locale]}</dt><dd>{date(facts.registrationDeadline)}</dd>
    {policy.success && <><dt>{copy.basicDeadline[locale]}</dt><dd>{policy.data.basic.enabled ? date(policy.data.basic.deadline) : copy.disabled[locale]}</dd><dt>{copy.finalDeadline[locale]}</dt><dd>{policy.data.final.enabled ? date(policy.data.final.deadline) : copy.disabled[locale]}</dd></>}
  </dl><Link to={`/admin/events/${facts.eventId}/setup`}>{copy.setup[locale]}</Link><p><Link to={`/admin/events/${facts.eventId}/performances?entry=rules`}>{copy.rules[locale]}</Link></p></section>;
}
