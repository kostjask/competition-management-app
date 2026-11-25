import { expect, test } from "@playwright/test";
import { chooseWorkspaceLanguage } from "./workspace-language";
import type { UserProfile } from "../../packages/schemas/src/auth.schema";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import { languageNames } from "../../apps/web/src/i18n/locale";

const admin: UserProfile = {
  id: "director", name: "Sample organizer", email: "director@example.invalid", preferredLocale: null,
  createdAt: "2026-01-01T00:00:00.000Z", isAdmin: true, roles: [], permissions: [],
};
const signedOut = { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] };

for (const [locale, width, mode] of [["et", 320, "day"], ["ru", 390, "night"], ["en", 1440, "day"]] as const) {
  test(`header preferences fit and dismiss with keyboard in ${locale} at ${width}px ${mode}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 780 });
    await page.addInitScript(preference => localStorage.setItem("workspace-appearance", preference), mode);
    await page.route("**/api/v1/**", route => route.fulfill({ json: route.request().url().endsWith("/auth/profile") ? admin : [] }));
    let showPage = () => {};
    const pageModule = new Promise<void>(resolve => { showPage = resolve; });
    await page.route("**/src/pages/admin/AdminDashboard.tsx*", async route => { await pageModule; await route.continue(); }, { times: 1 });
    await page.goto(`/app/admin?lang=${locale}`, { waitUntil: "commit" });
    const language = page.locator("#workspace-language");
    const languageTrigger = language.locator("summary");
    const appearance = page.locator("#workspace-appearance");
    const appearanceTrigger = appearance.locator("summary");
    try {
      await expect(languageTrigger).toHaveText(languageNames[locale], { timeout: 10000 });
      await languageTrigger.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(language.getByRole("button", { name: "Eesti", exact: true })).toBeFocused();
    } finally {
      showPage();
    }
    await expect(page.locator("main h1")).toBeVisible();
    await expect(language.getByRole("button", { name: "Eesti", exact: true })).toBeFocused();
    await expect(language.getByRole("button", { name: languageNames[locale], exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(language).not.toHaveAttribute("open", "");
    await expect(languageTrigger).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(appearanceTrigger).toBeFocused();
    await page.keyboard.press("Space");
    await expect(appearance.getByText(getTranslation("Shell.venueAppearanceHelp", locale))).toBeVisible();
    await expect(appearance.getByText(getTranslation("Shell.systemAppearanceHelp", locale))).toBeVisible();
    const bounds = await appearance.getByRole("group").boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect(bounds ? bounds.x + bounds.width : width + 1).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath("appearance.png") });
    await languageTrigger.click();
    await expect(appearance).not.toHaveAttribute("open", "");
    await language.getByRole("button", { name: "English", exact: true }).click();
    await expect(languageTrigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", mode);
    await appearanceTrigger.click();
    await page.locator(".workspace-header").click({ position: { x: 3, y: 3 } });
    await expect(appearance).not.toHaveAttribute("open", "");
  });
}

test("organizer navigation advertises staff work only for actual assignments", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("app-language", "en"));
  let profile = admin;
  await page.route("**/api/v1/**", route => route.fulfill({
    json: route.request().url().endsWith("/auth/profile") ? profile : [],
  }));
  await page.goto("/app/admin");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Events", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Moderator", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Judge", exact: true })).toHaveCount(0);
  await page.goto("/app/moderator");
  await expect(page).toHaveURL("/app/admin");

  profile = { ...admin, roles: [{
    id: "staff", eventId: "assigned-event", role: { id: "role", key: "moderator", name: "Moderator" },
    event: { id: "assigned-event", name: "Assigned event" },
  }] };
  await page.reload();
  await nav.getByRole("link", { name: "Moderator", exact: true }).click();
  await expect(page.getByRole("link", { name: "Assigned event", exact: true })).toBeVisible();
});

test("venue sign-in is dark before the app loads and appearance survives reload and locale changes", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("app-language", "en"));
  await page.route("**/api/v1/**", route => route.fulfill({ status: 401, json: signedOut }));
  let startApp = () => {};
  const blocked = new Promise<void>(resolve => { startApp = resolve; });
  await page.route("**/src/main.tsx", async route => { await blocked; await route.continue(); }, { times: 1 });
  try {
    await page.goto("/app/auth/login?returnTo=%2Fapp%2Fjudge%2Fevents%2Fevent-a%2Fscore", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", "night");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await expect(page.getByRole("heading")).toHaveCount(0);
  } finally {
    startApp();
  }
  const appearance = page.locator("#workspace-appearance");
  const choice = appearance.locator("summary");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("venue-sign-in.png") });
  await page.getByRole("link", { name: "Recover password" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", "night");
  await page.getByRole("link", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/auth\/login\?returnTo=/);
  await choice.click();
  await appearance.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", "day");
  await page.reload();
  await choice.click();
  await expect(appearance.getByRole("button", { name: "Day", exact: true })).toHaveAttribute("aria-pressed", "true");
  await chooseWorkspaceLanguage(page, "et");
  await expect(page.locator("html")).toHaveAttribute("lang", "et");
  await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", "day");
  await choice.click();
  await appearance.getByRole("button", { name: /Seadme järgi/ }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-workspace-mode", "night");
});

test("inline password visibility preserves typing and a service error gives a retry instruction", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("app-language", "en"));
  await page.route("**/api/v1/**", route => route.request().url().endsWith("/auth/login")
    ? route.fulfill({ status: 500, json: { code: "INTERNAL_SERVER_ERROR", reason: "unexpected", params: {}, issues: [] } })
    : route.fulfill({ status: 401, json: signedOut }));
  await page.goto("/app/auth/login");
  const email = page.getByRole("textbox", { name: "Email", exact: true });
  const password = page.getByLabel("Password", { exact: true });
  await email.fill("entrant@example.invalid");
  await email.press("Tab");
  await expect(password).toBeFocused();
  await expect(password).toHaveCSS("outline-width", "2px");
  await password.fill("sample password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("sample password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Sign-in is temporarily unavailable. Try again in a moment.");
  await expect(email).toHaveValue("entrant@example.invalid");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});
