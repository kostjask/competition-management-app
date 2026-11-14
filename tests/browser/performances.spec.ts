import { test, expect, type Page } from "@playwright/test";
import { CreatePerformanceBodySchema, EventSchema, PerformanceSchema, PerformanceHistorySchema, PerformanceQuerySchema, StudioRegistrationSchema,
  EntryReviewSchema, EntryCommandSchema, EntryReceiptSchema, EntryConfigurationBodySchema, EntryKindSchema, UpdatePerformanceBodySchema, type EntrySettings, type Performance, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const instant = "2026-01-01T00:00:00.000Z";
async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const state = { admin: true, failed: false, denied: false, empty: false, expired: false, reads: 0, filter: "", hold: Promise.resolve(), historyFailed: false, historyEmpty: false, historyHold: Promise.resolve(),
    loseCreateResponse: false, rejectCreate: false, noDraftOwner: false, mixedHistory: false, createHold: Promise.resolve(), creates: [] as unknown[], drafts: [] as Performance[] };
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
    if (path === "/api/v1/events/e/performances/draft/history") {
      const draft = state.drafts[0];
      return route.fulfill({ json: PerformanceHistorySchema.parse([{ ...history[0], origin: "CREATE", actorKind: "USER",
        snapshot: { ...history[0].snapshot, policyVersion: 2, title: draft.title, durationSec: null, orderOnStage: null,
          configuration: { category: null, ageGroup: state.mixedHistory ? history[0].snapshot.configuration.ageGroup : null, format: null } } }]) });
    }
    if (path === "/api/v1/events/e/performances") {
      if (route.request().method() === "POST") {
        const body = CreatePerformanceBodySchema.parse(route.request().postDataJSON()); state.creates.push(body);
        await state.createHold;
        if (state.rejectCreate) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "stageLocked", params: {}, issues: [] } });
        const draft = state.drafts[0] ?? PerformanceSchema.parse({ studioId: body.studioId, title: body.title, durationSec: body.durationSec,
          categoryId: body.categoryId, ageGroupId: body.ageGroupId, formatId: body.formatId, orderOnStage: body.orderOnStage,
          id: "draft", eventId: "e", registrationId: `r-${body.studioId}`, revision: 1, participants: [] });
        state.drafts = [draft];
        if (state.loseCreateResponse) return route.abort();
        return route.fulfill({ status: 201, json: draft });
      }
      state.reads++; state.filter = PerformanceQuerySchema.parse(Object.fromEntries(url.searchParams)).studioId ?? "";
      await state.hold;
      if (state.failed) return route.abort();
      if (state.denied) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] } });
      return route.fulfill({ json: [...(state.empty || state.filter === "empty" ? [] : [performance]), ...state.drafts.filter(row => !state.filter || row.studioId === state.filter)] });
    }
    if (path === "/api/v1/events/e/studio-registrations") return route.fulfill({ json: state.noDraftOwner ? studios.map(row => ({ ...row, status: "PENDING" })) : studios });
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

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 375, 768, 1440, 1920]) {
  test(`${locale} incomplete draft keyboard save at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); state.empty = true;
    await page.goto("/admin/events/e/performances");
    const owner = page.getByLabel(getTranslation("Performance.draftOwner", locale), { exact: true });
    await owner.selectOption("s"); await owner.focus();
    await expect(owner).toBeFocused();
    const save = page.getByRole("button", { name: getTranslation("Performance.saveDraft", locale), exact: true });
    await save.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(getTranslation("Performance.draftSaved", locale));
    await expect(page.getByRole("rowheader")).toContainText(getTranslation("Performance.untitled", locale));
    await expect(page.getByRole("rowheader")).toContainText(getTranslation("Performance.unscheduled", locale));
    await expect(page.getByRole("rowheader")).toContainText(getTranslation("Performance.missing_durationSec", locale));
    expect(state.creates).toHaveLength(1);
    await page.getByRole("button", { name: `${getTranslation("Performance.history", locale)} 1`, exact: true }).click();
    const historyRegion = page.getByRole("region", { name: getTranslation("Performance.history", locale), exact: true });
    await expect(historyRegion).toContainText(getTranslation("Performance.notSelected", locale));
    await expect(historyRegion).toContainText(`${getTranslation("Performance.missing_categoryId", locale)}: ${getTranslation("Performance.notSelected", locale)}`);
    await expect(historyRegion).toContainText(`${getTranslation("Performance.missing_ageGroupId", locale)}: ${getTranslation("Performance.notSelected", locale)}`);
    await expect(historyRegion).toContainText(`${getTranslation("Performance.missing_formatId", locale)}: ${getTranslation("Performance.notSelected", locale)}`);
    await expect(historyRegion.getByRole("heading", { name: new RegExp(getTranslation("Performance.untitled", locale)) })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`draft-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await expect(page.getByRole("rowheader")).toContainText(getTranslation("Performance.untitled", locale));
  });
}

test("uncertain draft saves preserve one operation across filters and expired sessions", async ({ page }, info) => {
  const state = await fixture(page); state.loseCreateResponse = true;
  await page.goto("/admin/events/e/performances");
  await page.getByLabel("Studio (required)", { exact: true }).selectOption("s");
  const title = page.getByLabel("Title (optional)", { exact: true });
  await title.fill("Saved draft <script>literal</script>");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await expect(title).toBeDisabled(); await expect(title).toHaveValue("Saved draft <script>literal</script>");
  state.rejectCreate = true;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await expect(title).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible();
  state.rejectCreate = false;
  await page.getByLabel("Studio", { exact: true }).selectOption("s");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible();
  state.expired = true;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator('input[type="password"]').fill("synthetic password");
  await page.getByRole("dialog").getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  state.loseCreateResponse = false;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved on the server");
  expect(state.creates).toHaveLength(3); expect(state.creates[1]).toEqual(state.creates[0]); expect(state.creates[2]).toEqual(state.creates[0]);
  expect(state.drafts).toHaveLength(1);
  await expect(page.getByRole("rowheader", { name: /Saved draft/ })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("draft-recovered.png"), fullPage: true });
});

test("draft pending and definite stage rejection retain entered values without claiming success", async ({ page }, info) => {
  const state = await fixture(page); state.rejectCreate = true;
  let release = () => {};
  state.createHold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/admin/events/e/performances");
  await page.getByLabel("Studio (required)", { exact: true }).selectOption("s");
  await page.getByLabel("Title (optional)", { exact: true }).fill("Retain this title");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving", exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("draft-pending.png"), fullPage: true }); release();
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await expect(page.getByLabel("Title (optional)", { exact: true })).toHaveValue("Retain this title");
  await expect(page.getByLabel("Title (optional)", { exact: true })).toBeEnabled();
  await expect(page.getByText("Draft saved on the server", { exact: false })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("draft-denied.png"), fullPage: true });
});

test("a save finishing after a filter change respects the current studio", async ({ page }) => {
  const state = await fixture(page);
  let release = () => {};
  state.createHold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/admin/events/e/performances");
  await page.getByLabel("Studio (required)", { exact: true }).selectOption("s");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving", exact: true })).toBeDisabled();
  await page.getByLabel("Studio", { exact: true }).selectOption("empty");
  await expect(page.getByRole("heading", { name: "No performances for this studio" })).toBeVisible();
  release();
  await expect(page.getByRole("status")).toContainText("Draft saved on the server");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Show all studios", exact: true }).click();
  await expect(page.getByRole("rowheader", { name: /Untitled draft/ })).toBeVisible();
});

test("draft creation explains the absence of an approved owner", async ({ page }) => {
  const state = await fixture(page); state.noDraftOwner = true;
  await page.goto("/admin/events/e/performances");
  await expect(page.getByText("A studio needs both approvals before creating a draft.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  expect(state.creates).toHaveLength(0);
});

test("mixed saved configuration labels every present and unselected value", async ({ page }, info) => {
  const state = await fixture(page, "en", 375); state.empty = true; state.mixedHistory = true;
  await page.goto("/admin/events/e/performances");
  await page.getByLabel("Studio (required)", { exact: true }).selectOption("s");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Saved history 1", exact: true }).click();
  const region = page.getByRole("region", { name: "Saved history", exact: true });
  await expect(region).toContainText("category: Not selected");
  await expect(region).toContainText("age group: Saved age group");
  await expect(region).toContainText("format: Not selected");
  await page.screenshot({ path: info.outputPath("draft-mixed-history.png"), fullPage: true });
});

async function checkpointFixture(page: Page, locale: Locale = 'en', width = 390) {
  const base = await fixture(page, locale, width);
  const settings: EntrySettings = { basic: { enabled: true, deadline: null }, final: { enabled: true, deadline: null }, allowYounger: true, olderPercent: 20, requireTeacher: true, requireAuthor: true, nominations: [] };
  const state = { loseResponse: false, failRead: false, failConfiguration: false, stale: false, emptyReview: false, readHold: Promise.resolve(), commandHold: Promise.resolve(), commands: [] as unknown[], configuration: { revision: 1, frozen: true, settings }, receipts: new Map<string, ReturnType<typeof EntryReceiptSchema.parse>>() };
  const review = EntryReviewSchema.parse({ studioId: 's', checkpoints: (['BASIC', 'FINAL'] as const).map(kind => ({ kind, revision: 1, status: 'DRAFT', enabled: true, locked: false, deadline: null, grant: null, issues: [], receipts: [] })) });
  const snapshot = { policyVersion: 3, eventId: 'e', studioId: 's', registrationId: 'r-s', studioName: 'Synthetic studio', title: 'Synthetic performance', durationSec: 210, orderOnStage: null, teacher: 'Teacher', author: 'Author', timeZone: 'Europe/Tallinn', ageDate: '2026-01-01', archived: false,
    configuration: { category: { id: 'c', name: 'Kids' }, ageGroup: { id: 'a', name: 'Up to 7', minAge: 0, maxAge: 7 }, format: { id: 'f', name: 'Group', minParticipants: 3, maxParticipants: 1000, maxDurationSeconds: 240 } }, participants: [] };
  await page.route('**/api/v1/events/e/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (base.expired) return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', reason: 'authenticationRequired', params: {}, issues: [] } });
    if (path.endsWith('/entry-configuration')) {
      if (route.request().method() === 'PUT') {
        const body = EntryConfigurationBodySchema.parse(route.request().postDataJSON()); state.configuration = { ...state.configuration, settings: body.settings, revision: body.expectedRevision + 1 };
        if (state.failConfiguration) return route.abort();
      }
      return route.fulfill({ json: state.configuration });
    }
    if (path.endsWith('/categories')) return route.fulfill({ json: [{ id: 'c', eventId: 'e', name: 'Kids' }] });
    if (path.endsWith('/age-groups')) return route.fulfill({ json: [{ id: 'a', eventId: 'e', name: 'Up to 7', minAge: 0, maxAge: 7 }] });
    if (path.endsWith('/formats')) return route.fulfill({ json: [{ id: 'f', eventId: 'e', name: 'Group', minParticipants: 3, maxParticipants: 1000, maxDurationSeconds: 240 }] });
    if (path.endsWith('/entry-review')) {
      await state.readHold;
      if (state.failRead) return route.abort();
      return route.fulfill({ json: state.emptyReview ? { studioId: 's', checkpoints: [] } : review });
    }
    if (/entry-review\/(BASIC|FINAL)$/.test(path)) {
      const kind = EntryKindSchema.parse(path.split('/').at(-1));
      const body = EntryCommandSchema.parse(route.request().postDataJSON()); state.commands.push(body);
      await state.commandHold;
      if (state.stale) return route.fulfill({ status: 409, json: { code: 'CONFLICT', reason: 'concurrentChange', params: {}, issues: [] } });
      let receipt = state.receipts.get(body.operationId);
      if (!receipt) {
        const head = review.checkpoints.find(row => row.kind === kind)!;
        receipt = EntryReceiptSchema.parse({ id: `receipt-${state.receipts.size + 1}`, kind, revision: head.revision + 1, action: body.action,
          createdAt: instant, actorKind: 'USER', reason: body.reason ?? null, visible: body.visible,
          manifest: { settings, entries: [{ id: 'p', revision: 2, snapshot }], roster: [] } });
        state.receipts.set(body.operationId, receipt); head.revision++; head.receipts.unshift(receipt);
        head.status = body.action === 'ACCEPT' ? 'ACCEPTED' : body.action === 'REOPEN' ? 'REQUIRES_CHANGES' : 'REVIEW_PENDING';
        head.locked = body.action !== 'REOPEN'; head.grant = body.grant ?? null;
      }
      if (state.loseResponse) return route.abort();
      return route.fulfill({ json: receipt });
    }
    return route.fallback();
  });
  return { base, state };
}

for (const locale of ['et', 'en', 'ru'] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} studio checkpoint confirmation and review at ${width}px`, async ({ page }, info) => {
    await checkpointFixture(page, locale, width);
    await page.goto('/admin/events/e/performances?studio=s&entry=review');
    const basic = page.getByRole('region', { name: getTranslation('Entry.basic', locale), exact: true });
    await expect(basic.getByText(getTranslation('Entry.DRAFT', locale), { exact: true })).toBeVisible();
    const confirm = basic.getByLabel(getTranslation('Entry.confirm', locale), { exact: true });
    await confirm.focus(); await page.keyboard.press('Space');
    await basic.getByRole('button', { name: getTranslation('Entry.submit', locale), exact: true }).click();
    await expect(basic.getByText(getTranslation('Entry.REVIEW_PENDING', locale), { exact: true })).toBeVisible();
    await confirm.check();
    await basic.getByRole('button', { name: getTranslation('Entry.accept', locale), exact: true }).click();
    await expect(basic.getByText(getTranslation('Entry.ACCEPTED', locale), { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`checkpoint-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await expect(basic.getByText(getTranslation('Entry.ACCEPTED', locale), { exact: true })).toBeVisible();
  });
}

test('checkpoint lost responses retain one operation through session recovery', async ({ page }) => {
  const { state, base } = await checkpointFixture(page);
  state.loseResponse = true;
  await page.goto('/admin/events/e/performances?studio=s&entry=review');
  const basic = page.getByRole('region', { name: 'Basic performance details', exact: true });
  await basic.getByLabel('I confirm this checkpoint for the whole studio and its lock.').check();
  await basic.getByRole('button', { name: 'Submit studio checkpoint', exact: true }).click();
  await expect(basic.locator('.ui-error-summary')).toBeFocused();
  base.expired = true;
  await basic.getByRole('button', { name: 'Reconcile and retry the same operation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').locator('input[type="password"]').fill('synthetic password');
  await page.getByRole('dialog').getByRole('button', { name: getTranslation('Shell.login', 'en'), exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  state.loseResponse = false;
  await basic.getByRole('button', { name: 'Reconcile and retry the same operation' }).click();
  await expect(basic.getByText('Review pending', { exact: true })).toBeVisible();
  expect(state.receipts.size).toBe(1); expect(state.commands.at(-1)).toEqual(state.commands[0]);
});

test('organizer reopens a named field, retains confirmation if readback fails, and shows stale errors', async ({ page }) => {
  const { state } = await checkpointFixture(page);
  await page.goto('/admin/events/e/performances?studio=s&entry=review');
  const basic = page.getByRole('region', { name: 'Basic performance details', exact: true });
  await basic.getByText('Reopen for correction', { exact: true }).first().click();
  await basic.getByLabel('Organizer reason', { exact: true }).fill('Correct the title');
  await basic.getByLabel('Title', { exact: true }).check();
  await basic.getByLabel('Correction deadline (Europe/Tallinn)', { exact: true }).fill('2027-01-01T10:00');
  await basic.getByRole('button', { name: 'Reopen for correction', exact: true }).click();
  await expect(basic.getByText('Requires changes', { exact: true })).toBeVisible();
  expect(EntryCommandSchema.parse(state.commands[0]).grant?.fields).toEqual(['title']);
  state.failRead = true;
  await basic.getByLabel('I confirm this checkpoint for the whole studio and its lock.').check();
  await basic.getByRole('button', { name: 'Submit studio checkpoint', exact: true }).click();
  await expect(basic.getByRole('status').filter({ hasText: 'Saved and acknowledged' })).toBeVisible();
  state.failRead = false; state.stale = true;
  await basic.getByLabel('I confirm this checkpoint for the whole studio and its lock.').check();
  await basic.getByRole('button', { name: 'Submit studio checkpoint', exact: true }).click();
  await expect(basic.locator('.ui-error-summary')).toBeFocused();
  await expect(basic.getByLabel('Organizer reason', { exact: true })).toHaveValue('Correct the title');
  await basic.getByRole('button', { name: 'Refresh saved checkpoint', exact: true }).click();
  await expect(basic.getByText('Review pending', { exact: true })).toBeVisible();
  await expect(basic.getByLabel('I confirm this checkpoint for the whole studio and its lock.')).not.toBeChecked();
});

for (const locale of ['et', 'en', 'ru'] as const) test(`${locale} rule freeze and deadline save at 320px`, async ({ page }, info) => {
  await checkpointFixture(page, locale, 320);
  await page.goto('/admin/events/e/performances?entry=rules');
  await expect(page.getByText(getTranslation('Entry.frozen', locale), { exact: true })).toBeVisible();
  await expect(page.getByLabel(getTranslation('Entry.olderPercent', locale), { exact: true })).toBeDisabled();
  await page.locator('#config-basic-deadline').fill('2026-12-01T18:00');
  await page.getByRole('button', { name: getTranslation('Entry.save', locale), exact: true }).click();
  await expect(page.getByText(getTranslation('Entry.saved', locale), { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath(`configuration-${locale}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('organizer details editor reconciles a lost save without duplicating the revision', async ({ page }) => {
  await checkpointFixture(page);
  const dancer = { id: 'd', studioId: 's', firstName: 'Synthetic', lastName: 'Dancer', birthDate: '2020-01-01', photoUrl: null };
  let performance = PerformanceSchema.parse({ revision: 1, id: 'p', eventId: 'e', studioId: 's', registrationId: 'r-s', title: 'Synthetic performance', durationSec: 60, orderOnStage: 1, categoryId: 'c', ageGroupId: 'a', formatId: 'f', participants: [] });
  let writes = 0; let loseResponse = true;
  await page.route('**/api/v1/studios/s/dancers', route => route.fulfill({ json: [dancer] }));
  await page.route('**/api/v1/events/e/performances/p', async route => {
    if (route.request().method() === 'PATCH') {
      const { expectedRevision, dancerIds, ...fields } = UpdatePerformanceBodySchema.parse(route.request().postDataJSON());
      if (expectedRevision !== performance.revision) return route.fulfill({ status: 409, json: { code: 'CONFLICT', reason: 'concurrentChange', params: {}, issues: [] } });
      writes++;
      expect(expectedRevision).toBe(performance.revision); expect(dancerIds).toEqual(['d']);
      performance = PerformanceSchema.parse({ ...performance, ...fields,
        revision: performance.revision + 1, participants: [{ dancerId: 'd', dancer }] });
      if (loseResponse) return route.abort();
    }
    return route.fulfill({ json: performance });
  });
  await page.goto('/admin/events/e/performances?studio=s&edit=p');
  const editor = page.getByRole('region', { name: /Edit details:/ });
  await editor.getByLabel('Teacher', { exact: true }).fill('Synthetic teacher');
  await editor.getByLabel('Author / choreographer', { exact: true }).fill('Synthetic author');
  await editor.getByLabel('Synthetic Dancer', { exact: true }).check();
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.locator('.ui-error-summary')).toBeFocused();
  await expect(editor.getByLabel('Teacher', { exact: true })).toBeDisabled();
  loseResponse = false;
  await editor.getByRole('button', { name: 'Reconcile and retry the same operation' }).click();
  await expect(editor.getByRole('status')).toContainText('Saved and acknowledged');
  expect(writes).toBe(1);
  performance = { ...performance, revision: performance.revision + 1, title: 'Saved by another organizer' };
  await editor.getByLabel('Teacher', { exact: true }).fill('Kept local correction');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.getByRole('heading', { name: 'Compare the saved server version', exact: true })).toBeVisible();
  await expect(editor.getByLabel('Teacher', { exact: true })).toHaveValue('Kept local correction');
  await editor.getByLabel('I have compared the saved version with my changes.', { exact: true }).check();
  await editor.getByRole('button', { name: 'Keep my changes for this revision', exact: true }).click();
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText('Saved and acknowledged');
  expect(writes).toBe(2); expect(performance.teacher).toBe('Kept local correction');
});

test('stale entry settings require explicit comparison while retaining local deadlines', async ({ page }) => {
  const { state } = await checkpointFixture(page);
  await page.goto('/admin/events/e/performances?entry=rules');
  await page.locator('#config-basic-deadline').fill('2026-12-01T18:00');
  state.configuration = { ...state.configuration, revision: 2, settings: { ...state.configuration.settings, basic: { enabled: true, deadline: '2026-11-30T18:00:00Z' } } };
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compare the saved server version', exact: true })).toBeVisible();
  await expect(page.locator('#config-basic-deadline')).toHaveValue('2026-12-01T18:00');
  await page.getByLabel('I have compared the saved version with my changes.', { exact: true }).check();
  await page.getByRole('button', { name: 'Keep my changes for this revision', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved and acknowledged by the server.', { exact: true })).toBeVisible();
  expect(state.configuration.revision).toBe(3); expect(state.configuration.settings.basic.deadline).toBe('2026-12-01T16:00:00.000Z');
});

test('uncertain configuration save reconciles its stored values and has no React key errors', async ({ page }) => {
  const { state } = await checkpointFixture(page);
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/admin/events/e/performances?entry=rules');
  await page.locator('#config-basic-deadline').fill('2026-12-01T18:00');
  state.failConfiguration = true;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.ui-error-summary')).toBeFocused();
  await expect(page.locator('#config-basic-deadline')).toBeDisabled();
  await page.getByRole('button', { name: 'Reconcile and retry the same operation' }).click();
  await expect(page.getByText('Saved and acknowledged by the server.', { exact: true })).toBeVisible();
  expect(errors.some(message => /same key|unique.*key/i.test(message))).toBe(false);
});

test('checkpoint loading, read failure, pending command and unconfigured state stay distinct', async ({ page }) => {
  const { state } = await checkpointFixture(page);
  let releaseRead = () => {};
  state.readHold = new Promise<void>(resolve => { releaseRead = resolve; });
  await page.goto('/admin/events/e/performances?studio=s&entry=review');
  await expect(page.locator('.entry-loading')).toBeVisible();
  state.failRead = true; releaseRead();
  const review = page.getByRole('region', { name: 'Studio checkpoints', exact: true });
  await expect(review.locator('.ui-error-summary')).toBeFocused();
  state.failRead = false;
  await review.getByRole('button', { name: 'Try again', exact: true }).click();
  const basic = page.getByRole('region', { name: 'Basic performance details', exact: true });
  await expect(basic).toBeVisible();
  let releaseCommand = () => {};
  state.commandHold = new Promise<void>(resolve => { releaseCommand = resolve; });
  await basic.getByLabel('I confirm this checkpoint for the whole studio and its lock.').check();
  await basic.getByRole('button', { name: 'Submit studio checkpoint', exact: true }).click();
  await expect(basic.getByRole('button', { name: 'Reconcile and retry the same operation' })).toBeDisabled();
  await expect(basic.getByText('Saved and acknowledged by the server.', { exact: true })).toHaveCount(0);
  releaseCommand();
  await expect(basic.getByText('Review pending', { exact: true })).toBeVisible();
  state.emptyReview = true; await page.reload();
  await expect(review.getByText('Checkpoints have not been configured.', { exact: true })).toBeVisible();
});

test('unchanged ambiguous deadline keeps its UTC offset and exact seconds', async ({ page }) => {
  const { state } = await checkpointFixture(page);
  const exact = '2026-10-25T00:30:22.456Z';
  state.configuration.settings.basic.deadline = exact;
  await page.goto('/admin/events/e/performances?entry=rules');
  await expect(page.locator('#config-basic-deadline')).toHaveValue('2026-10-25T03:30');
  await expect(page.getByLabel('Choose a valid local time and its UTC offset when needed.', { exact: true })).toHaveValue('2026-10-25T00:30:00.000Z');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved and acknowledged by the server.', { exact: true })).toBeVisible();
  expect(state.configuration.settings.basic.deadline).toBe(exact);
});
