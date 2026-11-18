import express from "express";
import type { PrismaClient } from "@prisma/client";
import { CmsLocaleSchema, type CmsLocale } from "@dance/schemas";
import { parsePublicRoute, publicMetadata, renderPublicPage, renderPublicError, renderSitemap, studioSections, editionSections, type PublicData, type PublicRoute } from "@dance/public-site";
import { PublicSiteOptionsSchema, type PublicSiteOptions } from "./config/public";
import { readPublishedVariants } from "./services/content";
import { publicContentRouter } from "./routes/content";
import { securityHeaders } from "./middleware/securityHeaders";
import { requestLimit } from "./middleware/authRecoveryLimit";
import { errorHandler } from "./errors/handler";
import { AppError } from "./errors";
import { workspaceRouter } from "./workspaceApp";
import { createApp } from "./app";

const missing = (error: unknown) => error instanceof AppError && error.statusCode === 404;

// Public-only by default; explicit festival rehearsal may mount the bounded workspace.
export function createPublicApp(prisma: PrismaClient, input: PublicSiteOptions, workspaceDirectory?: string) {
  const options = PublicSiteOptionsSchema.parse(input);
  const app = express(); app.disable("x-powered-by"); app.disable("etag"); app.set("trust proxy", false);
  app.use(securityHeaders);
  app.use((_req, res, next) => { res.set("Content-Security-Policy", "default-src 'none'; style-src 'self'; img-src 'self'; script-src 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"); next(); });
  app.use((req, res, next) => {
    if (req.headers.host !== new URL(options.origins[options.surface]).host) { res.status(421).end(); return; }
    next();
  });
  app.use(requestLimit());
  // Opt-in local rehearsal; public-only entry and production configuration stay separate.
  if (workspaceDirectory) {
    if (options.surface !== "festival") throw new Error("Workspace cohosting requires the festival surface");
    app.use(workspaceRouter(workspaceDirectory));
    const api = createApp(prisma);
    app.use((req, res, next) => {
      if ((req.path.startsWith("/api/v1/") && !req.path.startsWith("/api/v1/public/")) || req.path.startsWith("/uploads/")) api(req, res, next);
      else next();
    });
  }
  app.get("/site.css", (_req, res, next) => { res.sendFile(require.resolve("@dance/public-site/site.css"), { cacheControl: false, lastModified: false, etag: false }, error => { if (error) next(error); }); });
  app.use("/api/v1/public", publicContentRouter(prisma));
  app.get("/", (_req, res) => { res.redirect(302, "/et"); });
  app.get("/robots.txt", (_req, res) => { res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${options.origins[options.surface]}/sitemap.xml\n`); });

  async function variants(route: PublicRoute): Promise<Record<CmsLocale, PublicData>> {
    const kind = options.surface === "studio" ? "STUDIO_SITE" : route.editionSlug ? "FESTIVAL_EDITION" : "FESTIVAL_PORTAL";
    const identity = route.festivalSlug && route.editionSlug ? { festivalSlug: route.festivalSlug, editionSlug: route.editionSlug } : undefined;
    return readPublishedVariants(prisma, kind, identity);
  }
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const home: PublicRoute = { surface: options.surface, locale: "et", section: "home" };
      const homeVariants = await variants(home);
      const routes: PublicRoute[] = [home];
      if (options.surface === "studio") routes.push(...studioSections.map(section => ({ ...home, section })));
      else if ("editions" in homeVariants.et) {
        const portal = homeVariants.et;
        for (const festivalSlug of new Set([...portal.festivals.map(row => row.slug), ...portal.editions.map(row => row.festivalSlug)])) routes.push({ ...home, festivalSlug });
        for (const edition of portal.editions) for (const section of ["home", ...editionSections] as const) routes.push({ ...home, section, festivalSlug: edition.festivalSlug, editionSlug: edition.editionSlug });
      }
      const urls: string[] = [];
      for (const route of routes) {
        const values = route.editionSlug ? await variants(route) : homeVariants;
        urls.push(...publicMetadata(values.et, route, values, options.origins).alternates.map(row => row.url));
      }
      res.type("application/xml").send(renderSitemap(urls));
    } catch (error) {
      if (missing(error)) { res.type("application/xml").send(renderSitemap([])); return; }
      res.status(503).set("Retry-After", "60").end();
    }
  });
  app.use(async (req, res) => {
    const route = parsePublicRoute(req.path, options.surface);
    const locale = CmsLocaleSchema.safeParse(req.path.split("/")[1]);
    const errorRoute: PublicRoute = route ?? { surface: options.surface, locale: locale.success ? locale.data : "et", section: "home" };
    const notFound = () => res.status(404).set("X-Robots-Tag", "noindex, nofollow").type("html").send(renderPublicError(errorRoute,options.origins,404));
    // There are no public preview/query capabilities. Unknown parameters are never forwarded.
    if (!route || !["GET", "HEAD"].includes(req.method) || Object.keys(req.query).length) { notFound(); return; }
    try {
      const values = await variants(route); const data = values[route.locale];
      if (route.festivalSlug && !route.editionSlug && "editions" in data && !data.festivals.some(row => row.slug === route.festivalSlug) && !data.editions.some(row => row.festivalSlug === route.festivalSlug)) { notFound(); return; }
      res.type("html").send(renderPublicPage({ route, data, variants: values, origins: options.origins }));
    } catch (error) {
      if (missing(error)) { notFound(); return; }
      res.status(503).set({ "Retry-After": "60", "X-Robots-Tag": "noindex, nofollow" }).type("html").send(renderPublicError(errorRoute, options.origins, 503));
    }
  });
  app.use(errorHandler);
  return app;
}
