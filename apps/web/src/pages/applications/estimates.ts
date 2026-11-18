import { eventCalendarDays, type Event } from "@dance/schemas";

export function estimateInput(event: Event, values: Record<string, string>) {
  return eventCalendarDays(event.startsAt, event.endsAt, event.timeZone).map(date => ({ date, count: values[date]?.trim() ? Number(values[date]) : undefined }));
}
export function estimateFieldLinks(event: Event, prefix: string, path = "counts") {
  return Object.fromEntries(eventCalendarDays(event.startsAt, event.endsAt, event.timeZone).flatMap((date, index) => [
    [`${path}.${index}.count`, `${prefix}-${date}`], ...(index === 0 ? [[path, `${prefix}-${date}`]] : []),
  ]));
}
