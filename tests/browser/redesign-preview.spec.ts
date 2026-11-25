import { expect, test } from "@playwright/test";
import { getTranslation } from "../../apps/web/src/i18n/translations";

for (const [locale, width] of [["et", 320], ["en", 390], ["ru", 768], ["en", 1440]] as const) {
  test(`the redesign preview connects all three journeys in ${locale} at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/app/__fixtures/redesign?lang=${locale}`);
    const brand = page.locator(".redesign-preview");
    const main = page.getByRole("main");
    await expect(brand).toHaveAttribute("data-mode", "day");
    await main.getByRole("link").click();
    const live = getTranslation("Moderator.title", locale);
    await main.getByRole("link", { name: live, exact: true }).last().click();
    await expect(brand).toHaveAttribute("data-mode", "night");
    const pause = main.getByRole("button", { name: getTranslation("Moderator.PAUSE", locale), exact: true });
    await expect(pause).toBeVisible();
    const bounds = await pause.boundingBox();
    expect(bounds ? bounds.y + bounds.height : 844).toBeLessThan(844);
    await page.screenshot({ path: info.outputPath("organizer-night.png") });

    const appearance = page.getByRole("combobox", { name: getTranslation("Shell.appearance", locale) });
    await appearance.selectOption("day");
    await expect(brand).toHaveAttribute("data-mode", "day");
    if (width >= 832) {
      await page.locator(".redesign-layout-choice").selectOption("bar");
      await expect(brand).toHaveAttribute("data-layout", "bar");
      await page.screenshot({ path: info.outputPath("organizer-top-bar.png") });
    }

    await page.locator(".redesign-switch nav a").nth(1).click();
    await expect(main.getByRole("heading", { name: getTranslation("Application.title", locale) })).toBeFocused();
    await page.screenshot({ path: info.outputPath("applicant-day.png") });
    await main.getByRole("link").first().click();
    await main.getByRole("textbox").fill("Step across the stage");
    await main.getByRole("button", { name: getTranslation("Performance.saveDraft", locale) }).click();
    await expect(main.getByRole("status")).toContainText("Step across the stage");

    await page.locator(".redesign-switch nav a").last().click();
    await appearance.selectOption("night");
    const password = main.getByLabel(getTranslation("Shell.password", locale), { exact: true });
    await password.fill("1234");
    await main.getByRole("button", { name: getTranslation("Shell.showPassword", locale) }).click();
    await expect(password).toHaveAttribute("type", "text");
    await main.getByRole("button", { name: getTranslation("Shell.hidePassword", locale) }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("1234");
    await page.screenshot({ path: info.outputPath("judge-night-sign-in.png") });
    await main.getByRole("button", { name: getTranslation("Shell.login", locale), exact: true }).click();
    await main.getByRole("textbox").first().fill("0");
    await main.getByRole("textbox").last().fill("8,5");
    await main.getByRole("link").click();
    await expect(brand).toHaveAttribute("data-mode", "night");
    await expect(main.getByRole("heading", { name: getTranslation("Shell.expired", locale) })).toBeFocused();
    await main.getByLabel(getTranslation("Shell.password", locale), { exact: true }).fill("1234");
    await main.getByRole("button", { name: getTranslation("Shell.login", locale), exact: true }).click();
    await expect(main.getByRole("textbox").last()).toHaveValue("8,5");
    await page.screenshot({ path: info.outputPath("judge-night-sheet.png") });
    await main.getByRole("button", { name: getTranslation("Judge.review", locale) }).click();
    await main.getByRole("button", { name: getTranslation("Judge.submit", locale) }).click();
    await expect(main.getByText(getTranslation("Judge.locked", locale))).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
