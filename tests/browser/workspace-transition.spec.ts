import { test, expect } from "@playwright/test";
import { getTranslation } from "../../apps/web/src/i18n/translations";

for (const locale of ["et", "en", "ru"] as const) test(`${locale} queued verification link canonicalizes and strips secrets before app requests`, async ({ page }) => {
  let verified = false; let verifications = 0;
  const token = "synthetic-queued-secret";
  const resources: { url: string; referrer?: string; type: string }[] = [];
  page.on("request", request => { if (request.resourceType() !== "document") resources.push({ url: request.url(), referrer: request.headers().referer, type: request.resourceType() }); });
  await page.addInitScript(() => localStorage.setItem("app-language", "en"));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/verify-email")) { expect(route.request().postDataJSON()).toEqual({ token }); verifications++; verified = true; return route.fulfill({ json: { message: "Verified", messageId: "emailVerified", session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u", name: "Synthetic", email: "synthetic@example.invalid" } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill(verified ? { json: { id: "u", name: "Synthetic", email: "synthetic@example.invalid", createdAt: "2026-01-01T00:00:00.000Z", preferredLocale: "en", isAdmin: false, roles: [], permissions: [] } } : { status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (path.endsWith("/auth/onboarding/read")) return route.fulfill({ json: { email: "synthetic@example.invalid", emailVerified: true, returnTo: "/app/events/e/register", draft: null } });
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "notFound", params: {}, issues: [] } });
  });
  await page.goto(`/verify-email?token=${token}&lang=${locale}&returnTo=%2Fevents%2Fe%2Fregister&email=PRIVATE`);
  await expect(page).toHaveURL(/\/app\/verify-email/); await expect(page).not.toHaveURL(/token=|PRIVATE/);
  await expect(page.locator("html")).toHaveAttribute("lang", locale); expect(verifications).toBe(0);
  await page.getByRole("button", { name: getTranslation("Shell.verify", locale), exact: true }).click();
  await expect(page.getByRole("link", { name: getTranslation("Shell.continue", locale), exact: true })).toHaveAttribute("href", "/app/events/e/register");
  await expect(page.locator("html")).toHaveAttribute("lang", locale); expect(verifications).toBe(1);
  expect(resources.filter(request => request.url.includes(token) || request.referrer?.includes(token))).toEqual([]);
  expect(resources.filter(request => ["stylesheet", "font"].includes(request.type) && new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(token);
});

test("legacy operational links retain only supported studio selections and canonical entry returns", async ({ page, request }) => {
  const response = await request.get("/admin/events/e/applications?studio=s&token=PRIVATE&entry=review", { maxRedirects: 0 });
  expect(response.status()).toBe(302); expect(response.headers().location).toBe("/app/admin/events/e/applications?studio=s");
  expect(response.headers()["cache-control"]).toBe("no-store"); expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  await page.route("**/api/v1/**", route => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } }));
  await page.goto("/app/auth/login?returnTo=%2Fapp%2Fevents%2Fe%2Fstudios%2Fs%2Fperformances%2Fp%2Fedit");
  await expect(page.getByRole("heading", { name: /Sign in|Logi sisse|Войти/ })).toBeVisible();
});
