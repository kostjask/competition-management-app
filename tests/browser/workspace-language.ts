import type { Page } from "@playwright/test";
import { languageNames, type Locale } from "../../apps/web/src/i18n/locale";

export async function chooseWorkspaceLanguage(page: Page, locale: Locale) {
  const disclosure = page.locator("#workspace-language");
  await disclosure.locator("summary").click();
  await disclosure.getByRole("button", { name: languageNames[locale], exact: true }).click();
}
