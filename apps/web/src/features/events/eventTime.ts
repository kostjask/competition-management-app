// Resolve wall times against the selected IANA zone, never the browser zone.
export function wallTime(instant: string, timeZone: string): string {
  if (!Number.isFinite(Date.parse(instant))) return "";
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === name)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  } catch { return ""; }
}
export function wallTimeCandidates(value: string, timeZone: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const wall = Date.parse(value + ":00Z");
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== value) return [];
  const offsets = new Set<number>();
  // Sampling both sides covers DST folds/gaps, half-hour shifts and date-line changes.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wall + hours * 3600000;
    const local = wallTime(new Date(sample).toISOString(), timeZone);
    if (!local) return [];
    offsets.add(Date.parse(local + ":00Z") - sample);
  }
  return [...offsets].map(offset => new Date(wall - offset).toISOString())
    .filter(instant => wallTime(instant, timeZone) === value).sort();
}
// The editor displays minutes, but an unchanged instant may contain seconds.
// Normalize only the offset option; retain the exact instant until its time changes.
export function minuteInstant(instant: string): string {
  const timestamp = Date.parse(instant);
  return Number.isFinite(timestamp) ? new Date(Math.floor(timestamp / 60000) * 60000).toISOString() : "";
}
export function resolveWallTime(value: string, timeZone: string, choice: string): string | null {
  const candidates = wallTimeCandidates(value, timeZone);
  const selected = candidates.length === 1 ? candidates[0] : candidates.find(instant => instant === minuteInstant(choice));
  if (!selected) return null;
  return minuteInstant(choice) === selected && wallTime(choice, timeZone) === value ? new Date(choice).toISOString() : selected;
}
export function offsetLabel(instant: string, timeZone: string): string {
  const offset = (Date.parse(wallTime(instant, timeZone) + ":00Z") - Date.parse(instant)) / 60000;
  return `UTC${offset < 0 ? "−" : "+"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}
