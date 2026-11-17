import { z } from "zod";
const Origin = z.url().refine(value => {
  const url = new URL(value);
  return url.origin === value && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
}, "Use an exact HTTPS origin, or HTTP loopback for local validation");
export const PublicSiteOptionsSchema = z.strictObject({ surface: z.enum(["studio", "festival"]), origins: z.strictObject({ studio: Origin, festival: Origin }) })
  .refine(value => value.origins.studio !== value.origins.festival, "Public surfaces require distinct origins until the coordinated ingress transition");
export type PublicSiteOptions = z.infer<typeof PublicSiteOptionsSchema>;

export function publicServerConfig() {
  const options = PublicSiteOptionsSchema.parse({ surface: process.env.PUBLIC_SURFACE, origins: { studio: process.env.PUBLIC_STUDIO_ORIGIN, festival: process.env.PUBLIC_FESTIVAL_ORIGIN } });
  const port = z.coerce.number().int().min(1).max(65535).parse(process.env.PUBLIC_PORT);
  return { ...options, port };
}
