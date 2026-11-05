import { test, expect } from "@playwright/test";
import type { UserProfile } from "../../packages/schemas/src/auth.schema";
import { getTranslation } from "../../apps/web/src/i18n/translations";

function profile(key = "judge", eventId: string | null = "a", name = "Renamed display label"): UserProfile {
  return { id: "u", name: "Synthetic", email: "synthetic@example.invalid", createdAt: "2026-01-01T00:00:00.000Z", isAdmin: false,
    roles: [{ id: "assignment", eventId, role: { id: "role", key, name }, event: eventId ? { id: eventId, name: "Synthetic event" } : null }],
    permissions: [{ eventId, keys: ["score.submit"] }] };
}
for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(locale + " direct scoped role navigation and denied recovery at " + width + "px", async ({ page }, info) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(value => { localStorage.setItem("app-language", value); localStorage.setItem("auth_token", "obsolete-synthetic-session"); }, locale);
    let user = profile();
    await page.route("**/api/v1/auth/profile", route => route.fulfill({ json: user }));
    const allowed = getTranslation("Access.allowed", locale); const denied = getTranslation("Access.denied", locale);
    await page.goto("/__fixtures/access/a");
    await expect(page.getByRole("heading", { name: allowed })).toBeVisible();
    await page.getByRole("button", { name: allowed }).focus(); await expect(page.getByRole("button", { name: allowed })).toBeFocused();
    await page.goto("/__fixtures/access/b");
    await expect(page.getByRole("heading", { name: denied })).toBeFocused();
    await page.screenshot({ path: info.outputPath("denied.png"), fullPage: true });
    await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: getTranslation("Access.home", locale) })).toBeFocused();
    await page.keyboard.press("Enter"); await expect(page).toHaveURL("/");
    for (const unsupported of [profile("custom", "a", "Chief Judge"), profile("judge", null), { ...profile(), roles: [], permissions: [] }]) {
      user = unsupported; await page.goto("/judge"); await expect(page.getByRole("heading", { name: denied })).toBeVisible();
    }
    user = profile("admin", "a", "Administrator"); await page.goto("/admin"); await expect(page.getByRole("heading", { name: denied })).toBeVisible();
    user = { ...profile("admin", null), isAdmin: true };
    await page.goto("/__fixtures/access/b"); await expect(page.getByRole("button", { name: allowed })).toBeVisible();
    user = profile(); user.roles.push(...profile("moderator", "b").roles);
    await page.goto("/__fixtures/access/a"); await expect(page.getByRole("button", { name: allowed })).toBeVisible();
    user.permissions = []; await page.reload();
    await expect(page.getByRole("heading", { name: allowed })).toBeVisible(); await expect(page.getByRole("button", { name: allowed })).toHaveCount(0);
    await expect(page.getByText(denied, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test("guest direct navigation requires sign-in; expired profile cannot retain role content", async ({ page }) => {
  await page.route("**/api/v1/auth/profile", route => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } }));
  await page.goto("/judge"); await expect(page).toHaveURL(/auth\/login/);
  await page.evaluate(() => localStorage.setItem("auth_token", "expired-synthetic-session"));
  await page.route("**/api/v1/auth/profile", route => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } }));
  await page.goto("/judge"); await expect(page).toHaveURL(/auth\/login/);
  expect(await page.evaluate(() => localStorage.getItem("auth_token"))).toBeNull();
});
