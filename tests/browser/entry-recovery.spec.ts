import { test, expect, type Page } from "@playwright/test";
import { EntryConfigurationBodySchema, PerformanceLifecycleBodySchema, PerformanceSchema, StudioRegistrationSchema, EventSchema, type EntryOptions, type EntrySettings, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const instant = "2026-01-01T00:00:00.000Z";
  const row = PerformanceSchema.parse({ id: "p", revision: 1, eventId: "e", studioId: "s", registrationId: "r", title: "Recovery performance", categoryId: null, ageGroupId: null, formatId: null, durationSec: null, orderOnStage: null, participants: [] });
  const settings: EntrySettings = { basic: { enabled: true, deadline: "2099-12-01T10:00:00Z" }, final: { enabled: true, deadline: null }, allowYounger: false, olderPercent: 0, requireTeacher: false, requireAuthor: false, nominations: [] };
  const state = { row, expired: false, lose: false, failRead: false, stale: false, frozen: false, puts: [] as ReturnType<typeof EntryConfigurationBodySchema.parse>[],
    commands: [] as ReturnType<typeof PerformanceLifecycleBodySchema.parse>[], operations: new Map<string, { id: string; revision: number; archived: boolean }>(),
    options: { categories: [], ages: [], formats: [] } as EntryOptions, configuration: { revision: 0, frozen: false, settings } };
  const event = EventSchema.parse({ id: "e", name: "Recovery competition", startsAt: instant, endsAt: instant, createdAt: instant, stage: "REGISTRATION_OPEN", timeZone: "Europe/Tallinn", registrationDeadline: null, organizerEmail: null, organizerPhone: null, venue: null, country: null, city: null, description: null, unclassifiedDescription: null, revision: 1, maxStudios: null, maxPerformances: null, imageUrl: null });
  const studio = StudioRegistrationSchema.parse({ id: "r", eventId: "e", studioId: "s", status: "APPROVED", revision: 1, decisionReason: null, nextActor: "NONE", canEditDuringReview: false, createdAt: instant, updatedAt: instant, studio: { id: "s", name: "Recovery studio", approvalStatus: "APPROVED", country: null, city: null } });
  const user: UserProfile = { id: "organizer", name: "Synthetic organizer", email: "organizer@example.invalid", isAdmin: true, roles: [], permissions: [], preferredLocale: null, createdAt: instant };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method();
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: user.id, name: user.name, email: user.email } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user });
    if (state.expired) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (path.endsWith("/entry-configuration")) {
      if (method === "PUT") {
        const body = EntryConfigurationBodySchema.parse(route.request().postDataJSON()); state.puts.push(body);
        if (state.stale) return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] } });
        state.configuration = { revision: body.expectedRevision + 1, frozen: state.frozen, settings: body.settings };
        if (body.options) for (const key of ["categories", "ages", "formats"] as const) state.options = { ...state.options, [key]: [...state.options[key], ...body.options[key]] };
        if (state.lose) return route.abort();
      }
      return route.fulfill({ json: { ...state.configuration, frozen: state.frozen } });
    }
    const optionKey = path.endsWith("/categories") ? "categories" : path.endsWith("/age-groups") ? "ages" : path.endsWith("/formats") ? "formats" : null;
    if (optionKey) return route.fulfill({ json: state.options[optionKey].map(row => ({ ...row, eventId: "e" })) });
    if (path.endsWith("/performances/p/restore") || (path.endsWith("/performances/p") && method === "DELETE")) {
      const body = PerformanceLifecycleBodySchema.parse(route.request().postDataJSON()); state.commands.push(body);
      if (state.stale) { state.row.revision = 4; return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] } }); }
      let result = state.operations.get(body.operationId);
      if (!result) { state.row = { ...state.row, archived: body.action === "WITHDRAW", revision: state.row.revision + 1 }; result = { id: "p", archived: state.row.archived, revision: state.row.revision }; state.operations.set(body.operationId, result); }
      if (state.lose) return route.abort();
      return route.fulfill({ json: result });
    }
    if (path.endsWith("/performances/p")) return route.fulfill({ json: state.row });
    if (path.endsWith("/performances")) {
      if (state.failRead) return route.abort();
      return route.fulfill({ json: state.row.archived === (url.searchParams.get("state") === "withdrawn") ? [state.row] : [] });
    }
    if (path.endsWith("/studio-registrations")) return route.fulfill({ json: [studio] });
    if (path === "/api/v1/events/e") return route.fulfill({ json: event });
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 768, 1440, 1920]) {
  test(`${locale} withdrawal and same-identity restore at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); const t = (key: TranslationKey) => getTranslation(key, locale);
    await page.goto("/admin/events/e/performances?studio=s");
    await page.getByRole("button", { name: t("Entry.withdraw"), exact: true }).click();
    await page.getByLabel(t("Entry.reason"), { exact: true }).fill("Reviewed withdrawal");
    const confirmation = page.getByLabel(t("Entry.lifecycleConfirm"), { exact: true }); await confirmation.focus(); await page.keyboard.press("Space");
    const region = page.getByRole("region", { name: `${t("Entry.withdraw")}: Recovery performance`, exact: true });
    await region.getByRole("button", { name: t("Entry.withdraw"), exact: true }).click();
    await expect(region.getByRole("status")).toHaveText(t("Entry.withdrawn"));
    await region.getByRole("button", { name: t("Entry.close"), exact: true }).click();
    await expect(page.getByLabel(t("Entry.entryState"), { exact: true })).toBeFocused();
    await page.getByLabel(t("Entry.entryState"), { exact: true }).selectOption("withdrawn");
    await expect(page.getByRole("button", { name: t("Entry.edit"), exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(t("Entry.draftActiveOnly"), { exact: true })).toBeVisible();
    await page.getByRole("button", { name: t("Entry.restore"), exact: true }).click();
    await page.getByLabel(t("Entry.reason"), { exact: true }).fill("Restore same entry"); await page.getByLabel(t("Entry.lifecycleConfirm"), { exact: true }).check();
    const restored = page.getByRole("region", { name: `${t("Entry.restore")}: Recovery performance`, exact: true });
    await restored.getByRole("button", { name: t("Entry.restore"), exact: true }).click();
    await expect(restored.getByRole("status")).toHaveText(t("Entry.restored")); expect(state.row.id).toBe("p");
    await page.screenshot({ path: info.outputPath(`recovery-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`${locale} complete editable nomination preset at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); const t = (key: TranslationKey) => getTranslation(key, locale);
    await page.goto("/admin/events/e/performances?entry=rules");
    await page.getByText(t("Entry.presetFull"), { exact: true }).click();
    await page.getByLabel(t("Entry.presetConfirm"), { exact: true }).check();
    await page.getByRole("button", { name: t("Entry.copyPreset"), exact: true }).click();
    await expect(page.locator('[id^="nomination-"][id$="-duration"]')).toHaveCount(2);
    await expect(page.locator('[id^="nomination-"][id$="-duration"]').first()).toHaveValue("210");
    await page.getByRole("button", { name: t("Entry.save"), exact: true }).click();
    await expect(page.getByText(t("Entry.saved"), { exact: true })).toBeVisible();
    expect(state.configuration.settings.nominations).toHaveLength(182); expect(state.options.formats.some(row => row.minParticipants === 7 && row.maxParticipants === null)).toBe(true);
    expect(state.configuration.settings.basic.deadline).toBe("2099-12-01T10:00:00Z");
    await page.getByLabel(t("Entry.filterCategory"), { exact: true }).selectOption({ label: t("Entry.preset_stage") });
    await page.getByLabel(t("Entry.filterAge"), { exact: true }).selectOption({ label: t("Entry.preset_age7") });
    await expect(page.locator('[id^="nomination-"][id$="-duration"]')).toHaveCount(4);
    await page.screenshot({ path: info.outputPath(`preset-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("uncertain withdrawal preserves one operation across filters and session recovery", async ({ page }) => {
  const state = await fixture(page); state.lose = true;
  await page.goto("/admin/events/e/performances"); await page.getByRole("button", { name: "Withdraw performance", exact: true }).click();
  await page.getByLabel("Organizer reason", { exact: true }).fill("Lost response"); await page.getByLabel("I confirm this performance state change.").check();
  await page.getByRole("region", { name: "Withdraw performance: Recovery performance" }).getByRole("button", { name: "Withdraw performance", exact: true }).click();
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await page.getByLabel("Performance state", { exact: true }).selectOption("withdrawn"); await expect(page.getByRole("table")).toBeVisible(); state.lose = false; state.expired = true;
  await page.getByRole("button", { name: "Reconcile and retry the same operation", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator('input[type="password"]').fill("synthetic password");
  await page.getByRole("dialog").getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Reconcile and retry the same operation", exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.withdrawn", "en"), { exact: true })).toBeVisible();
  expect(state.commands).toHaveLength(2); expect(state.commands[0]).toEqual(state.commands[1]); expect(state.operations.size).toBe(1);
});

test("acknowledged action survives readback failure and stale state requires comparison", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/admin/events/e/performances"); await page.getByRole("button", { name: "Withdraw performance", exact: true }).click();
  await page.getByLabel("Organizer reason", { exact: true }).fill("Stale state"); await page.getByLabel("I confirm this performance state change.").check();
  const region = page.getByRole("region", { name: "Withdraw performance: Recovery performance" }); state.stale = true;
  await region.getByRole("button", { name: "Withdraw performance", exact: true }).click(); await expect(region.getByText("4: Active", { exact: false })).toBeVisible();
  await region.getByRole("button", { name: getTranslation("Entry.applyCompared", "en"), exact: true }).click();
  state.stale = false; state.failRead = true; await page.getByLabel("I confirm this performance state change.").check();
  await region.getByRole("button", { name: "Withdraw performance", exact: true }).click();
  await expect(region.getByRole("status")).toHaveText(getTranslation("Entry.withdrawn", "en"));
  state.failRead = false; await region.getByRole("button", { name: "Try again", exact: true }).click();
  expect(state.commands).toHaveLength(2); expect(state.commands[1].expectedRevision).toBe(4);
});

test("option creation and lost configuration response reconcile without duplicate writes", async ({ page }) => {
  const state = await fixture(page); state.lose = true;
  await page.goto("/admin/events/e/performances?entry=rules");
  await page.getByText("Create category, age group or format", { exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Custom category <script>literal</script>");
  await page.getByRole("button", { name: "Add option to draft", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused();
  state.lose = false; await page.getByRole("button", { name: "Reconcile and retry the same operation", exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible(); expect(state.puts).toHaveLength(1); expect(state.options.categories).toHaveLength(1);
});

test("custom options form a complete nomination and frozen rules disable creation", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/admin/events/e/performances?entry=rules");
  await page.getByText("Create category, age group or format", { exact: true }).click();
  const kind = page.getByLabel("Option type", { exact: true }); const name = page.getByLabel("Name", { exact: true });
  await name.fill("Custom stage"); await page.getByRole("button", { name: "Add option to draft", exact: true }).click();
  await kind.selectOption("ages"); await name.fill("Custom age 0+"); await page.getByRole("button", { name: "Add option to draft", exact: true }).click();
  await kind.selectOption("formats"); await name.fill("Custom large group"); await page.getByLabel("Minimum dancers", { exact: true }).fill("7");
  await page.getByLabel("Maximum dancers (blank = unlimited)", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Add option to draft", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused();
  await page.getByLabel("Maximum dancers (blank = unlimited)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Add option to draft", exact: true }).click();
  await page.getByRole("button", { name: "Add combination", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible();
  expect(state.options.categories).toHaveLength(1); expect(state.options.ages).toHaveLength(1); expect(state.options.formats).toHaveLength(1);
  expect(state.configuration.settings.nominations[0].maxParticipants).toBeNull();
  state.frozen = true; await page.reload();
  await page.getByText("Create category, age group or format", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Add option to draft", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add combination", exact: true })).toBeDisabled();
});

test("discarding a stale local setup also discards its unsaved option identities", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/admin/events/e/performances?entry=rules");
  await page.getByText("Create category, age group or format", { exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Discarded option");
  await page.getByRole("button", { name: "Add option to draft", exact: true }).click();
  state.configuration.revision = 1; state.configuration.settings.olderPercent = 30;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel(getTranslation("Entry.compareConfirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.replaceSaved", "en"), exact: true }).click();
  await expect(page.getByRole("option", { name: "Discarded option", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0); expect(state.options.categories).toHaveLength(0);
});
