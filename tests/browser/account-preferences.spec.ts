import { test, expect } from "@playwright/test";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { UserProfile } from "../../packages/schemas/src/auth.schema";

const profile = (preferredLocale: UserProfile["preferredLocale"]): UserProfile => ({
  id: "preference-user", name: "Synthetic account", email: "preference@example.invalid",
  preferredLocale, createdAt: "2026-01-01T00:00:00.000Z", isAdmin: false, roles: [], permissions: [],
});

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} account preference at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("app-language", "en"));
    let user = profile(locale);
    let writes = 0;
    await page.route("**/api/v1/**", async route => {
      if (route.request().url().endsWith("/auth/preferences")) {
        writes++;
        expect(route.request().headers()["x-csrf-protection"]).toBe("1");
        expect(route.request().postDataJSON()).toEqual({ preferredLocale: null });
        user = { ...user, preferredLocale: null };
        return route.fulfill({ json: { preferredLocale: null } });
      }
      return route.fulfill({ json: user });
    });
    await page.goto("/auth/profile?locale=de");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(writes).toBe(0);
    const field = page.getByLabel(getTranslation("Preferences.language", locale), { exact: true });
    await expect(field).toHaveValue(locale);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("account-preference.png"), fullPage: true });
    await field.selectOption("");
    await page.getByRole("button", { name: getTranslation("Preferences.save", locale), exact: true }).focus();
    await page.keyboard.press("Enter");
    // Clearing the preference restores the saved browser fallback without writing it to the account.
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("status")).toContainText(getTranslation("Preferences.saved", "en"));
    expect(writes).toBe(1);
    await page.reload();
    await expect(page.getByLabel(getTranslation("Preferences.language", "en"))).toHaveValue("");
  });
}

for (const locale of ["et", "en", "ru"] as const) {
  test(`${locale} preference failure retry and explicit session language`, async ({ page, context }) => {
    let user = profile(locale);
    let fail = true;
    let release = () => {};
    const wait = new Promise<void>(resolve => { release = resolve; });
    await context.route("**/api/v1/**", async route => {
      if (route.request().url().endsWith("/auth/preferences")) {
        if (fail) return route.abort("failed");
        await wait;
        user = { ...user, ...route.request().postDataJSON() };
        return route.fulfill({ json: { preferredLocale: user.preferredLocale } });
      }
      return route.fulfill({ json: user });
    });
    await page.goto("/auth/profile");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.getByRole("button", { name: "English", exact: true }).click();
    const field = page.getByLabel(getTranslation("Preferences.language", "en"));
    await field.selectOption("ru");
    const save = page.getByRole("button", { name: getTranslation("Preferences.save", "en") });
    await save.click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(field).toHaveValue("ru");
    await expect(page.getByText(getTranslation("Preferences.saved", "en"))).toHaveCount(0);
    fail = false;
    await save.click();
    await expect(field).toBeDisabled();
    await expect(save).toBeDisabled();
    release();
    await expect(page.getByRole("status")).toContainText(getTranslation("Preferences.saved", "en"));
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const anotherDevice = await context.newPage();
    await anotherDevice.goto("/auth/profile");
    await expect(anotherDevice.locator("html")).toHaveAttribute("lang", "ru");
    await expect(anotherDevice.getByLabel(getTranslation("Preferences.language", "ru"))).toHaveValue("ru");
  });
}

test("login reconciles account preference and logout returns to browser choice", async ({ page }) => {
  let signedIn = false;
  const user = profile("ru");
  await page.addInitScript(() => localStorage.setItem("app-language", "en"));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) {
      signedIn = true;
      return route.fulfill({ json: { session: "cookie", expiresAt: "2027-01-01T00:00:00.000Z", user: { id: user.id, email: user.email, name: user.name } } });
    }
    if (path.endsWith("/auth/logout")) { signedIn = false; return route.fulfill({ status: 204 }); }
    if (!signedIn) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    return route.fulfill({ json: user });
  });
  await page.goto("/auth/login");
  await page.getByLabel(getTranslation("Shell.email", "en"), { exact: true }).fill(user.email);
  await page.getByLabel(getTranslation("Shell.password", "en"), { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: getTranslation("Shell.account", "ru"), exact: true }).click();
  await page.getByRole("button", { name: getTranslation("Shell.logout", "ru"), exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
