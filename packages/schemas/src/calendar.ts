import { z } from "zod";
import { DancerBirthDateSchema } from "./dancer.schema.js";

const CalendarDateSchema = DancerBirthDateSchema;

/** Calendar day of an instant in the event zone, independent of viewer locale. */
export function eventAgeDate(startsAt: string, timeZone: string): string {
  z.iso.datetime({ offset: true }).parse(startsAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(startsAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value;
  return CalendarDateSchema.parse(`${part("year")}-${part("month")}-${part("day")}`);
}

/** Completed years; a leap-day birthday advances on March 1 in non-leap years. */
export function ageOnDate(birthDate: string, referenceDate: string): number {
  CalendarDateSchema.parse(birthDate); CalendarDateSchema.parse(referenceDate);
  if (birthDate > referenceDate) throw new RangeError("Birth date is after the eligibility date");
  return Number(referenceDate.slice(0, 4)) - Number(birthDate.slice(0, 4)) -
    (referenceDate.slice(5) < birthDate.slice(5) ? 1 : 0);
}
