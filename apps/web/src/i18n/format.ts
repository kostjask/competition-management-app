import type { Locale } from "./locale";

export function formatInstant(value: string, locale: Locale, dateStyle: "short" | "medium" | "long" = "long", timeStyle?: "short" | "medium" | "long"): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle, timeZone: "UTC" }).format(date);
}

export function formatCalendarDate(value: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(value + "T12:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "—";
  return formatInstant(date.toISOString(), locale);
}

export function formatNumber(value: number, locale: Locale): string {
  return Number.isFinite(value) ? new Intl.NumberFormat(locale).format(value) : "—";
}
