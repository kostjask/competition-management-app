import { test, expect, type Page } from "@playwright/test";
import { EventSchema, PerformanceSchema, PerformanceHistorySchema, PerformanceQuerySchema, StudioRegistrationSchema, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const instant = "2026-01-01T00:00:00.000Z";
async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const state = { admin: true, failed: false, denied: false, empty: false, expired: false, reads: 0, filter: "", hold: Promise.resolve(), historyFailed: false, historyEmpty: false, historyHold: Promise.resolve() };
  const user = (): UserProfile => ({ id: "organizer", name: "Synthetic organizer", email: "organizer@example.invalid", isAdmin: state.admin, roles: [], permissions: [], preferredLocale: null, createdAt: instant });
  const event = EventSchema.parse({ id: "e", name: "Synthetic competition", startsAt: instant, endsAt: instant, createdAt: instant, stage: "REGISTRATION_OPEN", timeZone: "Europe/Tallinn", registrationDeadline: null, organizerEmail: null, organizerPhone: null, venue: null, country: null, city: null, description: null, unclassifiedDescription: null, revision: 1, maxStudios: null, maxPerformances: null, imageUrl: null });
  const registration = (id: string, name: string) => StudioRegistrationSchema.parse({ id: `r-${id}`, eventId: "e", studioId: id, status: "APPROVED", revision: 1, decisionReason: null, nextActor: "NONE", canEditDuringReview: false, createdAt: instant, updatedAt: instant, studio: { id, name, approvalStatus: "APPROVED", country: null, city: null } });
  const studios = [registration("s", "Synthetic studio"), registration("empty", "Other studio")];
  const performance = PerformanceSchema.parse({ revision: 1, id: "p", eventId: "e", studioId: "s", registrationId: "r-s", title: "Synthetic performance <script>literal</script>", durationSec: 60, orderOnStage: 1, categoryId: "c", ageGroupId: "a", formatId: "f", participants: [] });
  const history = PerformanceHistorySchema.parse([{ revision: 1, origin: "LEGACY_BASELINE", actorKind: "MIGRATION", capturedAt: instant,
    snapshot: { policyVersion: 1, eventId: "e", studioId: "s", registrationId: "r-s", studioName: "Studio at capture", title: "Title at capture <script>literal</script>", durationSec: 60, orderOnStage: 1, timeZone: "Europe/Tallinn", ageDate: "2025-12-31", archived: false,
      configuration: { category: { id: "c", name: "Saved category" }, ageGroup: { id: "a", name: "Saved age group", minAge: 0, maxAge: null }, format: { id: "f", name: "Saved format", minParticipants: 1, maxParticipants: 10, maxDurationSeconds: 300 } }, participants: [] } }]);
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "organizer", name: "Synthetic organizer", email: "organizer@example.invalid" } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (state.expired) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (path === "/api/v1/events/e/performances/p/history") {
      await state.historyHold;
      if (state.historyFailed) return route.abort();
      return route.fulfill({ json: state.historyEmpty ? [] : history });
    }
    if (path === "/api/v1/events/e/performances") {
      state.reads++; state.filter = PerformanceQuerySchema.parse(Object.fromEntries(url.searchParams)).studioId ?? "";
      await state.hold;
      if (state.failed) return route.abort();
      if (state.denied) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] } });
      return route.fulfill({ json: state.empty || state.filter === "empty" ? [] : [performance] });
    }
    if (path === "/api/v1/events/e/studio-registrations") return route.fulfill({ json: studios });
    if (path === "/api/v1/events/e") return route.fulfill({ json: event });
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} ownership register, filter and keyboard at ${width}px`, async ({ page }, info) => {
    await fixture(page, locale, width); await page.goto("/admin/events/e/performances");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Synthetic performance <script>literal</script>" })).toBeVisible();
    await expect(page.locator("tbody td").last()).toHaveText("0");
    const filter = page.getByLabel(getTranslation("Performance.filter", locale), { exact: true });
    await filter.focus(); await expect(filter).toBeFocused();
    const outline = await filter.evaluate(element => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
    await filter.selectOption("empty"); await expect(filter).toBeFocused();
    await expect(page.getByRole("heading", { name: getTranslation("Performance.noMatch", locale) })).toBeVisible();
    await expect(page).toHaveURL(/\?studio=empty$/);
    await page.getByRole("button", { name: getTranslation("Performance.clear", locale) }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`ownership-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const link = page.getByRole("link", { name: "Synthetic studio", exact: true });
    await expect(link).toHaveAttribute("href", "/admin/events/e/applications?studio=s");
    await link.focus(); await expect(link).toBeFocused();
    const historyButton = page.getByRole("button", { name: `${getTranslation("Performance.history", locale)} 1`, exact: true });
    await historyButton.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Title at capture/ })).toBeVisible();
    await expect(page.getByRole("region", { name: getTranslation("Performance.history", locale) })).toContainText("Studio at capture");
    await expect(page).toHaveURL(/performance=p/);
    await page.screenshot({ path: info.outputPath(`history-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await expect(page.getByRole("heading", { name: /Title at capture/ })).toBeVisible();
    await page.getByRole("button", { name: getTranslation("Performance.closeHistory", locale), exact: true }).click();
    await expect(historyButton).toBeFocused();
    await page.reload(); await expect(page.getByRole("table")).toBeVisible();
  });
}

test("loading, empty, network retry and API denial never present stale rows", async ({ page }, info) => {
  const state = await fixture(page);
  let release = () => {};
  state.hold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/admin/events/e/performances");
  await expect(page.locator(".performance-skeleton")).toBeVisible();
  await page.screenshot({ path: info.outputPath("ownership-loading.png"), fullPage: true }); release();
  await expect(page.getByRole("table")).toBeVisible();
  state.failed = true;
  await page.getByLabel("Studio", { exact: true }).selectOption("s");
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await expect(page.getByRole("table")).toHaveCount(0);
  state.failed = false;
  await page.getByRole("button", { name: getTranslation("Shell.retry", "en") }).click();
  await expect(page.getByRole("table")).toBeVisible(); expect(state.filter).toBe("s");
  state.empty = true; await page.reload();
  await expect(page.getByRole("heading", { name: "No performances for this studio" })).toBeVisible();
  await page.getByRole("button", { name: "Show all studios" }).click();
  await expect(page.getByRole("heading", { name: "No performances", exact: true })).toBeVisible();
  state.denied = true; await page.reload();
  await expect(page.locator(".ui-error-summary")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("history loading, retry, empty and session recovery preserve the selected URL", async ({ page }, info) => {
  const state = await fixture(page);
  let release = () => {};
  state.historyHold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/admin/events/e/performances?studio=s&performance=p");
  const region = page.getByRole("region", { name: "Saved history", exact: true });
  await expect(region.getByRole("status")).toBeVisible();
  await page.screenshot({ path: info.outputPath("history-loading.png"), fullPage: true });
  state.historyFailed = true; release();
  await expect(region.locator(".ui-error-summary")).toBeFocused();
  await page.screenshot({ path: info.outputPath("history-error.png"), fullPage: true });
  state.historyFailed = false;
  await region.getByRole("button", { name: "Try again" }).click();
  await expect(region.getByRole("heading", { name: /Title at capture/ })).toBeVisible();
  state.historyEmpty = true; await page.reload();
  await expect(region.getByRole("heading", { name: "History unavailable" })).toBeVisible();
  state.historyEmpty = false; state.expired = true; await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator('input[type="password"]').fill("synthetic password");
  await page.getByRole("dialog").getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: getTranslation("Shell.retry", "en"), exact: true }).click();
  await expect(region.getByRole("heading", { name: /Title at capture/ })).toBeVisible();
  await expect(page).toHaveURL(/studio=s&performance=p$/);
});

test("direct routes enforce organizer role and preserve a filtered session recovery", async ({ page }) => {
  const state = await fixture(page); state.admin = false;
  await page.goto("/admin/events/e/performances");
  await expect(page.getByRole("heading", { name: getTranslation("Access.denied", "en") })).toBeFocused();
  expect(state.reads).toBe(0);
  state.admin = true; await page.reload(); await expect(page.getByRole("table")).toBeVisible();
  state.expired = true;
  await page.getByLabel("Studio", { exact: true }).selectOption("s");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator('input[type="password"]').fill("synthetic password");
  await page.getByRole("dialog").getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: getTranslation("Shell.retry", "en") }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page).toHaveURL(/performances\?studio=s$/);
});
