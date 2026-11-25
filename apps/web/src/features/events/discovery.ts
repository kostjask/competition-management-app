import type { Event } from "@dance/schemas";
import type { Locale } from "../../i18n/locale";

export function eventDateRange(event: Event, locale: Locale) {
  const format = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: event.timeZone,
  });
  return format.formatRange(new Date(event.startsAt), new Date(event.endsAt));
}

export function discoveryTime(value: string, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(new Date(value));
}

export function eventLocality(event: Event, locale: Locale) {
  const country = event.country && /^[a-z]{2}$/i.test(event.country)
    ? new Intl.DisplayNames(locale, { type: "region" }).of(event.country.toUpperCase())
    : event.country;
  return [event.city, country].filter(Boolean).join(", ");
}
