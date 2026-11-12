/** A wall time has zero (DST gap), one, or two (DST fold) matching instants. */
export function wallTime(instant: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  } catch {
    return "";
  }
}
export function matchingInstants(value: string, timeZone: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const wall = Date.parse(value + "Z");
  if (!Number.isFinite(wall)) return [];
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = wall + hours * 3600000;
    const rendered = wallTime(new Date(probe).toISOString(), timeZone);
    if (rendered) offsets.add(Date.parse(rendered + "Z") - probe);
  }
  return [...offsets]
    .map((offset) => new Date(wall - offset).toISOString())
    .filter((instant) => wallTime(instant, timeZone) === value)
    .sort();
}

export function minuteInstant(instant: string): string {
  return new Date(instant).toISOString().slice(0, 16) + ":00.000Z";
}

/** Editing unrelated fields must not truncate stored seconds/milliseconds. */
export function resolveWallTime(value: string, zone: string, chosen: string | undefined,
  original: string | null | undefined, originalZone: string): string | undefined {
  const candidates = matchingInstants(value, zone);
  const resolved = candidates.length === 1 ? candidates[0] : candidates.find(candidate => candidate === chosen);
  if (original && zone === originalZone && resolved === minuteInstant(original)) return original;
  return resolved;
}
