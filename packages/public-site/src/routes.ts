import { CmsLocaleSchema, CmsSlugSchema, type CmsLocale } from "@dance/schemas";
export const studioSections = ["about", "teachers", "classes", "timetable", "join", "contact", "media"] as const;
export const editionSections = ["rules", "judges", "registration", "results", "contact"] as const;
export type PublicSurface = "studio" | "festival";
export type PublicSection = "home" | typeof studioSections[number] | typeof editionSections[number];
export type PublicRoute = { surface: PublicSurface; locale: CmsLocale; section: PublicSection; festivalSlug?: string; editionSlug?: string };
export type PublicOrigins = { studio: string; festival: string };
export function publicPath(route: PublicRoute, locale = route.locale, section = route.section): string {
  return `/${locale}${route.festivalSlug ? `/festivals/${route.festivalSlug}${route.editionSlug ? `/${route.editionSlug}` : ""}` : ""}${section === "home" ? "" : `/${section}`}`;
}
export function parsePublicRoute(path: string, surface: PublicSurface): PublicRoute | null {
  const parts = path.split("/");
  const locale = CmsLocaleSchema.safeParse(parts[1]);
  if (!locale.success || parts[0] !== "") return null;
  if (parts.length === 2) return { surface, locale: locale.data, section: "home" };
  if (surface === "studio" && parts.length === 3) {
    const section = studioSections.find(value => value === parts[2]);
    return section ? { surface, locale: locale.data, section } : null;
  }
  if (surface !== "festival" || parts[2] !== "festivals" || parts.length < 4 || parts.length > 6) return null;
  const festival = CmsSlugSchema.safeParse(parts[3]);
  if (!festival.success) return null;
  if (parts.length === 4) return { surface, locale: locale.data, section: "home", festivalSlug: festival.data };
  const edition = CmsSlugSchema.safeParse(parts[4]);
  if (!edition.success) return null;
  const section = parts.length === 5 ? "home" : editionSections.find(value => value === parts[5]);
  return section ? { surface, locale: locale.data, section, festivalSlug: festival.data, editionSlug: edition.data } : null;
}
