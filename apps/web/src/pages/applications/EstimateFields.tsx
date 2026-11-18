import { eventCalendarDays, type Event } from "@dance/schemas";
import { AccountField } from "../../auth/AccountField";
import { useTranslation } from "../../i18n/useTranslation";
import type { UiError } from "../../api/error";

export function EstimateFields({ event, values, onChange, error, prefix, path = "counts" }: {
  event: Event; values: Record<string, string>; onChange: (value: Record<string, string>) => void;
  error: UiError | null; prefix: string; path?: string;
}) {
  const { t, locale } = useTranslation();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  return <div className="estimate-fields">{eventCalendarDays(event.startsAt, event.endsAt, event.timeZone).map((date, index) =>
    <AccountField key={date} id={`${prefix}-${date}`} path={`${path}.${index}.count`} type="number"
      label={`${format.format(new Date(`${date}T12:00:00Z`))}: ${t("Application.estimateCount")}`}
      value={values[date] ?? ""} onChange={value => onChange({ ...values, [date]: value })} error={error} />
  )}</div>;
}
