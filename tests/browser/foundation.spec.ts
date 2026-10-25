import { test, expect } from "@playwright/test";
import { fixtureCopy } from "../../apps/web/src/components/ui/fixtureCopy";

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} foundation states at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/__fixtures/foundation");
    const text = fixtureCopy[locale];
    await expect(page.getByRole("heading", { name: text.title })).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("lang", locale);
    await expect(page.locator(".ui-tone-danger").first()).toHaveCSS("color", "rgb(185, 28, 28)");
    await expect(page.locator(".ui-button-primary").first()).toHaveCSS("background-color", "rgb(29, 78, 216)");
    const field = page.getByLabel(text.name);
    await field.focus(); await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: text.save })).toBeFocused();
    await page.keyboard.press("Enter");
    const summary = page.locator(".ui-error-summary");
    await expect(summary).toBeFocused();
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
    await expect(field).toBeFocused();
    await expect(field).toHaveCSS("outline-style", "solid");
    await expect(field).toHaveCSS("outline-width", "3px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("validation.png"), fullPage: true });
    await field.fill("Synthetic studio / Синтетическая студия");
    const alternate = locale === "ru" ? "English" : "Русский";
    await page.getByRole("button", { name: alternate, exact: true }).click();
    await expect(page.locator("#fixture-name")).toHaveValue("Synthetic studio / Синтетическая студия");
    const nativeNames = { et: "Eesti", en: "English", ru: "Русский" };
    await page.getByRole("button", { name: nativeNames[locale], exact: true }).click();
    await page.getByRole("button", { name: text.save }).click();
    await expect(page.getByText(text.saved, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: text.submit })).toBeDisabled();
    await expect(page.getByRole("button", { name: text.busy })).toBeDisabled();
    await expect(page.getByRole("button", { name: text.busy })).toHaveAttribute("aria-busy", "true");
    await expect(page.getByText(text.accepted, { exact: true })).toBeVisible();
    await expect(page.getByText(text.failed, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath("states.png"), fullPage: true });
  });
}
