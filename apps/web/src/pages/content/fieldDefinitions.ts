import type { CmsLocale } from "@dance/schemas";
import { contentTranslations } from "../../i18n/contentTranslations";
export type Field = { type: "text" | "number" | "date" | "time" | "boolean" | "authored" | "select" | "multi"; optional?: boolean; options?: readonly string[]; source?: "teachers" | "classes" | "assets" | "festivals" }
  | { type: "object"; fields: Record<string, Field>; optional?: boolean }
  | { type: "array"; item: Field; initial: () => unknown; max: number };
const text: Field = { type: "text" }; const prose: Field = { type: "authored", optional: true }; const requiredProse: Field = { type: "authored" };
const image: Field = { type: "object", optional: true, fields: { assetId: { type: "select", source: "assets" }, decorative: { type: "boolean" }, alt: prose } };
const profile: Field = { type: "object", fields: { name: text, biography: prose, portrait: image } };
export const newText = () => ({ sourceLocale: "et", sourceText: "", translations: {} });
const array = (item: Field, initial: () => unknown, max: number): Field => ({ type: "array", item, initial, max });
const contact: Field = { type: "object", fields: { email: { ...text, optional: true }, phone: { ...text, optional: true }, address: prose,
  links: array({ type: "object", fields: { title: requiredProse, url: text } }, () => ({ id: crypto.randomUUID(), title: newText(), url: "" }), 12) } };
const brand: Field = { type: "object", fields: { accent: { type: "select", options: ["cobalt", "forest", "brick"] }, artwork: image } };
export const contentFields: Record<string, Field> = {
  primaryLocale: { type: "select", options: ["et", "en", "ru"] }, title: prose, introduction: prose, metadata: prose, about: prose, contact, joining: prose,
  teachers: array(profile, () => ({ id: crypto.randomUUID(), name: "", biography: null, portrait: null }), 30),
  judges: array(profile, () => ({ id: crypto.randomUUID(), name: "", biography: null, portrait: null }), 30),
  classes: array({ type: "object", fields: { title: requiredProse, style: prose, ages: prose, teacherIds: { type: "multi", source: "teachers" }, joining: prose } },
    () => ({ id: crypto.randomUUID(), title: newText(), style: null, ages: null, teacherIds: [], joining: null }), 60),
  timetable: array({ type: "object", fields: { classId: { type: "select", source: "classes" }, weekday: { type: "number" }, start: { type: "time" }, end: { type: "time" }, timeZone: text, location: text, validFrom: { type: "date", optional: true }, validUntil: { type: "date", optional: true } } },
    () => ({ id: crypto.randomUUID(), classId: "", weekday: 1, start: "", end: "", timeZone: "Europe/Tallinn", location: "", validFrom: null, validUntil: null }), 150),
  media: array({ ...image, optional: false }, () => ({ assetId: "", decorative: false, alt: null }), 30),
  brand, festivals: array({ type: "object", fields: { festivalId: { type: "select", source: "festivals" }, summary: requiredProse } }, () => ({ festivalId: "", summary: newText() }), 20),
  studioUrl: { ...text, optional: true }, startsOn: { type: "date", optional: true }, endsOn: { type: "date", optional: true }, location: prose,
  rules: array({ type: "object", fields: { heading: requiredProse, paragraphs: array(requiredProse, newText, 50) } }, () => ({ id: crypto.randomUUID(), heading: newText(), paragraphs: [] }), 30),
  results: array({ type: "object", fields: { title: requiredProse, url: text, editionLabel: text, date: { type: "date" }, locale: { type: "select", options: ["et", "en", "ru"] }, reviewed: { type: "boolean" } } },
    () => ({ id: crypto.randomUUID(), title: newText(), url: "", editionLabel: "", date: "", locale: "et", reviewed: false }), 50),
};
export function record(value: unknown): Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {}; }
export function fieldLabel(field: string, locale: CmsLocale): string {
  const key = field === "title" ? "fieldTitle" : field;
  return key in contentTranslations ? Object.entries(contentTranslations).find(([name]) => name === key)![1][locale] : field;
}
export function setField(value: unknown, path: readonly string[], next: unknown): unknown {
  if (!path.length) return next;
  const [key, ...rest] = path; if (key === undefined) return value;
  if (Array.isArray(value)) return value.map((row, index) => String(index) === key ? setField(row, rest, next) : row);
  return { ...record(value), [key]: setField(record(value)[key], rest, next) };
}
