import express from "express";
import { resolve } from "node:path";
import { legacyWorkspaceRedirect, ReturnPathSchema } from "@dance/schemas";

/** Explicit local cohosting rehearsal only. Never infer a directory or change ingress. */
export function workspaceRouter(directory: string) {
  const router = express.Router();
  const root = resolve(directory);
  router.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) { next(); return; }
    const target = legacyWorkspaceRedirect(req.originalUrl);
    if (target) { res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }).redirect(302, target); return; }
    if (req.path !== "/app" && !req.path.startsWith("/app/")) { next(); return; }
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    next();
  });
  router.use("/app/assets", express.static(resolve(root, "assets"), { dotfiles: "deny", etag: false, lastModified: false, cacheControl: false }), (_req, res) => { res.status(404).end(); });
  router.get("/app/identity-link.js", (_req, res) => { res.sendFile(resolve(root, "identity-link.js"), { cacheControl: false, etag: false, lastModified: false }); });
  router.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method) || !req.path.startsWith("/app")) { next(); return; }
    const internal = req.path.slice(4) || "/";
    if (!ReturnPathSchema.safeParse(req.path).success && !legacyWorkspaceRedirect(internal)) { res.status(404).end(); return; }
    res.sendFile(resolve(root, "index.html"), { cacheControl: false, lastModified: false, etag: false });
  });
  return router;
}
