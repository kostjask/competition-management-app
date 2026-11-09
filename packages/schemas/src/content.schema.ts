import { z } from "zod";

const ContentLocaleSchema = z.enum(["et", "en", "ru"]);
export const AuthoredContentSchema = z.strictObject({
  sourceLocale: ContentLocaleSchema,
  sourceText: z.string().trim().min(1).max(20000),
  translations: z.strictObject({
    et: z.string().trim().min(1).max(20000).optional(),
    en: z.string().trim().min(1).max(20000).optional(),
    ru: z.string().trim().min(1).max(20000).optional(),
  }),
}).refine(value => value.translations[value.sourceLocale] === undefined, {
  message: "Source language cannot also be a translation", path: ["translations"],
});
export type AuthoredContent = z.infer<typeof AuthoredContentSchema>;
export function resolveAuthoredContent(content: AuthoredContent, requested: z.infer<typeof ContentLocaleSchema>) {
  const translation = content.translations[requested];
  return translation !== undefined
    ? { text: translation, lang: requested, fallback: false }
    : { text: content.sourceText, lang: content.sourceLocale, fallback: requested !== content.sourceLocale };
}
