import { test, expect, type Page } from "@playwright/test";
import { chooseWorkspaceLanguage } from "./workspace-language";
import { CreateDancerBodySchema, UpdateDancerBodySchema, DancerArchiveBodySchema, CreatePerformanceBodySchema, UpdatePerformanceBodySchema,
  DancerSchema, PerformanceSchema, StudioSchema, EntryContextSchema, EntryFieldSchema, EntryReviewSchema, EntryCommandSchema, EntryReceiptSchema, type Dancer, type Performance, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const base = "/app/events/e/studios/s/performances";
const denied = { code: "FORBIDDEN", reason: "stageLocked", params: {}, issues: [] };
async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const instant = "2026-01-01T00:00:00.000Z";
  const dancer = DancerSchema.parse({ id: "d", revision: 1, studioId: "s", firstName: "Synthetic", lastName: "Dancer", birthDate: "2012-02-29", photoUrl: null });
  const user: UserProfile = { id: "rep", name: "Synthetic representative", email: "rep@example.invalid", isAdmin: false, roles: [], permissions: [{ eventId: "e", keys: ["performance.manage", "dancer.manage"] }], preferredLocale: null, createdAt: instant };
  const studio = StudioSchema.parse({ id: "s", eventId: "e", name: "Synthetic studio", approvalStatus: "APPROVED", country: null, city: null, directorName: null, directorPhone: null, invoiceDetails: null, logoUrl: null, registrations: [], representatives: [] });
  const context = EntryContextSchema.parse({ eventId: "e", studioId: "s", studioName: studio.name, eventName: "Synthetic competition", ageDate: "2026-11-01", timeZone: "Europe/Tallinn", settings: null, issues: [], writableFields: EntryFieldSchema.options,
    options: { categories: [{ id: "c", eventId: "e", name: "Dance" }], ages: [{ id: "a", eventId: "e", name: "Children", minAge: 0, maxAge: 17 }], formats: [{ id: "f", eventId: "e", name: "Solo", minParticipants: 1, maxParticipants: 1, maxDurationSeconds: 210 }] } });
  const state = { dancers: [dancer], entries: [] as Performance[], operations: new Map<string, Dancer>(), creates: [] as unknown[], updates: [] as unknown[],
    lose: false, expired: false, reject: false, fail: false, context, adminReads: 0, hold: Promise.resolve(), readHold: Promise.resolve() };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method();
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user });
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00Z", user: { id: user.id, email: user.email, name: user.name } } }); }
    if (state.expired) return route.fulfill({ status: 401, json: { ...denied, code: "UNAUTHORIZED", reason: "authenticationRequired" } });
    if (path.endsWith("/entry-context")) { await state.readHold; return state.fail ? route.abort() : route.fulfill({ json: state.context }); }
    if (path === "/api/v1/studios/s") return route.fulfill({ json: studio });
    if (path.startsWith("/api/v1/studios/s/dancers")) {
      const id = path.split("/")[6];
      if (method === "GET") return route.fulfill(id ? state.dancers.find(row => row.id === id) ? { json: state.dancers.find(row => row.id === id) } : { status: 404, json: { ...denied, reason: "notFound" } } : { json: state.dancers });
      const body = method === "POST" ? CreateDancerBodySchema.parse(route.request().postDataJSON()) : method === "PATCH" ? UpdateDancerBodySchema.parse(route.request().postDataJSON()) : DancerArchiveBodySchema.parse(route.request().postDataJSON());
      state.updates.push(body); await state.hold;
      if (state.reject) return route.fulfill({ status: 403, json: denied });
      let response = state.operations.get(body.operationId);
      if (!response) {
        const current = state.dancers.find(row => row.id === id);
        if (method !== "POST" && (!current || !("expectedRevision" in body) || body.expectedRevision !== current.revision)) return route.fulfill({ status: 409, json: { ...denied, code: "CONFLICT", reason: "concurrentChange" } });
        response = DancerSchema.parse({ ...dancer, ...current, ...("firstName" in body && { firstName: body.firstName }), ...("lastName" in body && { lastName: body.lastName }), ...("birthDate" in body && { birthDate: body.birthDate }), id: current?.id ?? "new-dancer", revision: (current?.revision ?? 0) + 1 });
        state.operations.set(body.operationId, response);
        state.dancers = [...state.dancers.filter(row => row.id !== response?.id), ...(method === "DELETE" ? [] : [response])];
      }
      if (state.lose) return route.abort();
      return route.fulfill(method === "DELETE" ? { status: 204 } : { status: method === "POST" ? 201 : 200, json: response });
    }
    if (path.startsWith("/api/v1/events/e/performances")) {
      const id = path.split("/")[6];
      if (method === "GET") return route.fulfill({ json: id ? state.entries.find(row => row.id === id) : state.entries });
      if (state.reject) return route.fulfill({ status: 403, json: denied });
      if (method === "POST") {
        const body = CreatePerformanceBodySchema.parse(route.request().postDataJSON()); state.creates.push(body);
        const row = state.entries[0] ?? PerformanceSchema.parse({ id: "p", revision: 1, eventId: "e", studioId: "s", registrationId: "r", title: body.title, durationSec: null, orderOnStage: null, categoryId: null, ageGroupId: null, formatId: null, participants: [] });
        state.entries = [row]; if (state.lose) return route.abort(); return route.fulfill({ status: 201, json: row });
      }
      const body = UpdatePerformanceBodySchema.parse(route.request().postDataJSON()); state.updates.push(body);
      const row = state.entries.find(row => row.id === id);
      if (!row || body.expectedRevision !== row.revision) return route.fulfill({ status: 409, json: { ...denied, code: "CONFLICT", reason: "concurrentChange" } });
      const { expectedRevision, dancerIds, ...fields } = body;
      const updated = { ...row, ...fields, revision: expectedRevision + 1, participants: dancerIds ? dancerIds.map(id => ({ dancerId: id, dancer: state.dancers.find(row => row.id === id)! })) : row.participants };
      state.entries = [PerformanceSchema.parse(updated)];
      if (state.lose) return route.abort(); return route.fulfill({ json: updated });
    }
    if (/\/(categories|formats|age-groups)$/.test(path)) state.adminReads++;
    return route.fulfill({ status: 404, json: { ...denied, reason: "notFound" } });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} roster and participant draft at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); const t = (key: TranslationKey) => getTranslation(key, locale);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/app/studios/s/dancers"); await expect(page.getByRole("table")).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(t("Roster.title")));
    await page.getByRole("button", { name: t("Roster.add"), exact: true }).click();
    await expect(page.locator("#dancer-editor-title")).toBeFocused();
    await page.getByRole("button", { name: t("Entry.save"), exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused();
    await page.locator('.ui-error-summary a[href="#dancer-firstName"]').click(); await expect(page.locator("#dancer-firstName")).toBeFocused();
    await page.locator("#dancer-firstName").fill("Leap"); await page.locator("#dancer-lastName").fill("Fixture"); await page.locator("#dancer-birthDate").fill("2012-02-29");
    await page.getByRole("button", { name: t("Entry.save"), exact: true }).click(); await expect(page.getByText(t("Entry.saved"), { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`roster-${locale}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: t("Entry.close"), exact: true }).click();
    await expect(page.locator("#roster-add")).toBeFocused();
    await page.getByRole("link", { name: t("Roster.entries"), exact: true }).click();
    await page.getByRole("link", { name: t("Roster.newEntry"), exact: true }).click(); await page.locator("#entry-new-title").fill("Synthetic draft");
    await page.getByRole("button", { name: t("Performance.saveDraft"), exact: true }).click();
    await expect(page).toHaveURL(base + "/p/edit");
    await expect(page).toHaveTitle(new RegExp(t("Roster.entries")));
    await page.locator("#edit-categoryId").selectOption("c"); await page.locator("#edit-ageGroupId").selectOption("a"); await page.locator("#edit-formatId").selectOption("f");
    await page.locator("#edit-durationSec").fill("120"); await page.getByRole("checkbox", { name: "Leap Fixture", exact: true }).check();
    await page.screenshot({ path: info.outputPath(`participants-${locale}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: t("Entry.save"), exact: true }).click(); await expect(page.getByText(t("Entry.saved"), { exact: true })).toBeVisible();
    expect(state.entries[0].participants).toHaveLength(1); expect(state.entries[0].orderOnStage).toBeNull(); expect(state.adminReads).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await expect(page.getByRole("checkbox", { name: "Leap Fixture", exact: true })).toBeChecked(); expect(errors).toEqual([]);
  });
}

test("dancer uncertain response, session retry, comparison and archive retain their exact operation", async ({ page }, info) => {
  const state = await fixture(page); await page.goto("/app/studios/s/dancers");
  await page.getByRole("button", { name: "Edit dancer: Synthetic Dancer" }).click();
  await page.locator("#dancer-firstName").fill("Retained"); state.expired = true;
  await page.getByRole("button", { name: getTranslation("Entry.save", "en"), exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill("password123"); await page.getByRole("dialog").getByRole("button", { name: "Sign in", exact: true }).click();
  state.lose = true; await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused();
  state.lose = false; await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible();
  expect(state.operations.size).toBe(1); expect(state.updates[0]).toEqual(state.updates[1]);
  await page.locator("#dancer-lastName").fill("Local"); state.dancers[0] = { ...state.dancers[0], lastName: "Server", revision: state.dancers[0].revision + 1 };
  await page.getByRole("button", { name: getTranslation("Entry.save", "en"), exact: true }).click(); await expect(page.getByText("Retained Server:", { exact: false })).toBeVisible();
  await page.screenshot({ path: info.outputPath("dancer-comparison.png"), fullPage: true });
  await page.getByRole("checkbox", { name: getTranslation("Entry.compareConfirm", "en") }).check(); await page.getByRole("button", { name: getTranslation("Entry.applyCompared", "en") }).click();
  await page.getByRole("button", { name: getTranslation("Entry.save", "en"), exact: true }).click(); await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Archive dancer", exact: true }).click(); await page.getByRole("checkbox", { name: "I confirm archiving this dancer" }).check();
  await page.getByRole("button", { name: "Archive dancer", exact: true }).click(); await expect(page.getByText("Dancer archived.", { exact: true })).toBeVisible(); expect(state.dancers).toHaveLength(0);
});

test("entry denied writes preserve input and route departure warns about unsaved changes", async ({ page }) => {
  const state = await fixture(page); await page.goto(base + "/new"); await page.locator("#entry-new-title").fill("Keep this draft");
  state.reject = true; await page.getByRole("button", { name: "Save draft", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused(); await expect(page.locator("#entry-new-title")).toHaveValue("Keep this draft");
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Close", exact: true }).click(); await expect(page).toHaveURL(base + "/new");
  state.reject = false; await page.getByRole("button", { name: "Save draft", exact: true }).click(); await expect(page).toHaveURL(base + "/p/edit");
  state.lose = true; await page.locator("#edit-title").fill("Committed once"); await page.getByRole("button", { name: getTranslation("Entry.save", "en"), exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused();
  state.lose = false; const writes = state.updates.length; await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible(); expect(state.updates).toHaveLength(writes);
});

test("selected correction enables only its field and links the server's saved-draft issue", async ({ page }, info) => {
  const state = await fixture(page);
  state.entries = [PerformanceSchema.parse({ id: "p", revision: 1, eventId: "e", studioId: "s", registrationId: "r", title: "Scoped correction", durationSec: 220, orderOnStage: null, categoryId: "c", ageGroupId: "a", formatId: "f", participants: [] })];
  state.context = { ...state.context, writableFields: ["durationSec"], issues: [{ performanceId: "p", field: "durationSec", reason: "duration" }] };
  await page.goto(base + "/p/edit");
  await expect(page.locator("#edit-title")).toBeDisabled(); await expect(page.locator("#edit-durationSec")).toBeEnabled();
  await page.getByRole("link", { name: getTranslation("Entry.field_durationSec", "en"), exact: true }).click(); await expect(page.locator("#edit-durationSec")).toBeFocused();
  await page.locator("#edit-durationSec").fill("210"); await page.getByRole("button", { name: "Save", exact: true }).click(); await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible();
  expect(state.updates[0]).toEqual({ expectedRevision: 1, durationSec: 210 });
  await page.screenshot({ path: info.outputPath("scoped-correction.png"), fullPage: true });
});

test("roster loading, read failure and retry preserve editor fields", async ({ page }, info) => {
  const state = await fixture(page); let release = () => {};
  state.readHold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/app/studios/s/dancers"); await expect(page.locator(".entry-loading")).toBeVisible();
  await page.screenshot({ path: info.outputPath("roster-loading.png"), fullPage: true }); release();
  await page.getByRole("button", { name: "Edit dancer: Synthetic Dancer" }).click(); await page.locator("#dancer-lastName").fill("Keep local");
  state.fail = true; await page.getByRole("button", { name: "Refresh options and locks", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeFocused(); await expect(page.locator("#dancer-lastName")).toHaveValue("Keep local");
  state.fail = false; await page.getByRole("button", { name: "Try again", exact: true }).click(); await expect(page.locator("#dancer-lastName")).toBeEnabled(); await expect(page.locator("#dancer-lastName")).toHaveValue("Keep local");
});

async function submissionFixture(page: Page, locale: Locale = "en", width = 390) {
  const owner = await fixture(page, locale, width);
  owner.entries = [PerformanceSchema.parse({ id: "p", revision: 1, eventId: "e", studioId: "s", registrationId: "r", title: "Synthetic entry", durationSec: 120,
    orderOnStage: null, categoryId: "c", ageGroupId: "a", formatId: "f", participants: [{ dancerId: "d", dancer: owner.dancers[0] }] })];
  const settings = { basic: { enabled: true, deadline: null }, final: { enabled: true, deadline: null }, allowYounger: true, olderPercent: 20, requireTeacher: false, requireAuthor: false, nominations: [] };
  const review = EntryReviewSchema.parse({ studioId: "s", organizer: false, music: { configured: false, entries: [{ performanceId: "p", status: "MISSING" }] },
    checkpoints: (["BASIC", "FINAL"] as const).map(kind => ({ kind, reviewToken: "a".repeat(64), revision: 1, status: "DRAFT", enabled: true, locked: false, canSubmit: true, deadline: null, grant: null, issues: [], receipts: [] })) });
  const state = { review, owner, commands: [] as ReturnType<typeof EntryCommandSchema.parse>[], receipts: new Map<string, ReturnType<typeof EntryReceiptSchema.parse>>(),
    lose: false, failRead: false, reject: false, stale: false, hold: Promise.resolve(), readHold: Promise.resolve() };
  await page.route("**/api/v1/events/e/studios/s/entry-review**", async route => {
    if (owner.expired) return route.fulfill({ status: 401, json: { ...denied, code: "UNAUTHORIZED", reason: "authenticationRequired" } });
    if (route.request().method() === "GET") { await state.readHold; return state.failRead ? route.abort() : route.fulfill({ json: review }); }
    const body = EntryCommandSchema.parse(route.request().postDataJSON()); state.commands.push(body); await state.hold;
    if (state.reject || state.stale) return route.fulfill({ status: state.reject ? 403 : 409, json: { ...denied, ...(state.stale && { code: "CONFLICT", reason: "concurrentChange" }) } });
    const kind = route.request().url().endsWith("/FINAL") ? "FINAL" : "BASIC";
    const head = review.checkpoints.find(row => row.kind === kind)!;
    let receipt = state.receipts.get(body.operationId);
    if (!receipt) {
      const p = owner.entries[0];
      receipt = EntryReceiptSchema.parse({ id: `receipt-${state.receipts.size + 1}`, revision: head.revision + 1, kind, action: body.action, createdAt: "2026-11-19T12:00:00Z", actorKind: "USER", reason: null, visible: false,
        manifest: { settings, roster: [], entries: [{ id: p.id, revision: p.revision, snapshot: { policyVersion: 3, eventId: "e", studioId: "s", registrationId: "r", studioName: "Synthetic studio", title: p.title,
          teacher: null, author: null, durationSec: p.durationSec, orderOnStage: null, timeZone: "Europe/Tallinn", ageDate: "2026-11-01", archived: false,
          configuration: { category: { id: "c", name: "Dance" }, ageGroup: { id: "a", name: "Children", minAge: 0, maxAge: 17 }, format: { id: "f", name: "Solo", minParticipants: 1, maxParticipants: 1, maxDurationSeconds: 210 } }, participants: [] } }] } });
      state.receipts.set(body.operationId, receipt); head.revision++; head.status = "REVIEW_PENDING"; head.locked = true; head.canSubmit = false; head.grant = null; head.receipts.unshift(receipt);
    }
    if (state.lose) return route.abort(); return route.fulfill({ json: receipt });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} representative submission receipt and independent music at ${width}px`, async ({ page }, info) => {
    const state = await submissionFixture(page, locale, width); const t = (key: TranslationKey) => getTranslation(key, locale);
    await page.goto(base + "?entry=review&checkpoint=FINAL");
    await expect(page.getByRole("button", { name: t("Entry.accept"), exact: true })).toHaveCount(0);
    await expect(page.getByText(t("Entry.music_MISSING"), { exact: false })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`submission-review-${locale}-${width}.png`), fullPage: true });
    const confirm = page.getByLabel(t("Entry.confirm"), { exact: true }); await confirm.focus(); await page.keyboard.press("Space");
    await page.getByRole("button", { name: t("Entry.submit"), exact: true }).click();
    await expect(page.locator(".entry-submission-receipt h4")).toBeFocused();
    await expect(page.locator(".entry-submission-receipt")).toContainText("receipt-1");
    await expect(confirm).toBeDisabled(); expect(state.receipts.size).toBe(1);
    expect(state.commands[0].expectedReview).toBe("a".repeat(64));
    await page.screenshot({ path: info.outputPath(`submission-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".entry-review button:visible").evaluateAll(buttons => buttons.every(button => button.scrollWidth <= button.clientWidth))).toBe(true);
    await page.reload(); await expect(page.locator(".entry-receipts")).toContainText("receipt-1");
  });
}

test("submission blockers open the exact duration field and return to the same checkpoint", async ({ page }) => {
  const state = await submissionFixture(page); const head = state.review.checkpoints[1];
  head.issues = [{ performanceId: "p", field: "durationSec", reason: "duration" }];
  await page.goto(base + "?entry=review&checkpoint=FINAL");
  await page.getByRole("link", { name: "Duration", exact: true }).click();
  await expect(page.locator("#edit-durationSec")).toBeFocused();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(base + "?entry=review&checkpoint=FINAL");
});

test("submission lost response retains the exact operation through session recovery and comparison", async ({ page }) => {
  const state = await submissionFixture(page); state.lose = true;
  await page.goto(base + "?entry=review&checkpoint=FINAL"); await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "en"), exact: true }).click();
  await expect(page.locator(".entry-checkpoint .ui-error-summary")).toBeFocused();
  await expect(page.getByText(getTranslation("Entry.noReceipts", "en"), { exact: true })).toHaveCount(0);
  await expect(page.getByText(getTranslation("Entry.ready", "en"), { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: getTranslation("Entry.basic", "en"), exact: true })).toBeDisabled();
  state.owner.expired = true; await page.getByRole("button", { name: getTranslation("Entry.retrySubmission", "en"), exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await dialog.locator('input[type="password"]').fill("synthetic password");
  await dialog.getByRole("button", { name: getTranslation("Shell.login", "en"), exact: true }).click(); await expect(dialog).not.toBeVisible();
  state.lose = false; await page.getByRole("button", { name: getTranslation("Entry.retrySubmission", "en"), exact: true }).click();
  await expect(page.locator(".entry-submission-receipt h4")).toBeFocused();
  expect(state.receipts.size).toBe(1); expect(state.commands.at(-1)).toEqual(state.commands[0]);
});

test("submission refresh compares uncertain success, and stale or denied writes require confirmation again", async ({ page }) => {
  const state = await submissionFixture(page); state.lose = true;
  await page.goto(base + "?entry=review"); await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "en"), exact: true }).click();
  await page.getByRole("button", { name: getTranslation("Entry.refresh", "en"), exact: true }).click();
  await expect(page.locator(".entry-receipts")).toContainText("receipt-1");
  await page.getByRole("button", { name: getTranslation("Entry.useReview", "en"), exact: true }).click();
  await expect(page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: getTranslation("Entry.final", "en"), exact: true }).click();
  state.stale = true; state.lose = false; await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "en"), exact: true }).click();
  await expect(page.locator(".entry-checkpoint .ui-error-summary")).toBeFocused();
  await expect(page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: getTranslation("Entry.refresh", "en"), exact: true }).click();
  state.stale = false; state.reject = true; await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "en"), exact: true }).click();
  await expect(page.locator(".entry-checkpoint .ui-error-summary")).toBeFocused();
  expect(state.receipts.size).toBe(1);
});

test("submission review distinguishes loading, failure, no configuration and empty blockers", async ({ page }) => {
  const state = await submissionFixture(page); let release = () => {};
  state.readHold = new Promise<void>(resolve => { release = resolve; });
  await page.goto(base + "?entry=review"); await expect(page.locator(".entry-loading")).toBeVisible(); state.failRead = true; release();
  await expect(page.locator(".entry-review .ui-error-summary")).toBeVisible(); state.failRead = false; state.review.checkpoints = [];
  await page.getByRole("button", { name: getTranslation("Shell.retry", "en"), exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.noSetup", "en"), { exact: true })).toBeVisible();
});

test("submission correction keeps unrelated fields locked and resubmits the final checkpoint", async ({ page }) => {
  const state = await submissionFixture(page); const head = state.review.checkpoints[1];
  head.status = "REQUIRES_CHANGES"; head.reviewToken = "b".repeat(64); head.grant = { fields: ["durationSec"], performanceIds: ["p"], until: "2099-01-01T00:00:00Z" };
  head.issues = [{ performanceId: "p", field: "durationSec", reason: "duration" }];
  state.owner.context.writableFields = ["durationSec"];
  await page.goto(base + "?entry=review&checkpoint=FINAL");
  await expect(page.getByText(getTranslation("Entry.REQUIRES_CHANGES", "en"), { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Duration", exact: true }).click();
  await expect(page.locator("#edit-title")).toBeDisabled(); await expect(page.locator("#edit-durationSec")).toBeEnabled();
  await page.locator("#edit-durationSec").fill("110"); await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(getTranslation("Entry.saved", "en"), { exact: true })).toBeVisible(); head.issues = [];
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "en"), exact: true }).click();
  await expect(page.locator(".entry-submission-receipt h4")).toBeFocused(); expect(state.commands[0].expectedReview).toBe("b".repeat(64));
  expect(state.owner.updates[0]).toEqual({ expectedRevision: 1, durationSec: 110 });
  await expect(page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true })).toBeDisabled();
});

test("submission language changes retain confirmation and the uncertain operation", async ({ page }, info) => {
  const state = await submissionFixture(page, "en", 320); state.lose = true;
  await page.goto(base + "?entry=review&checkpoint=FINAL");
  await page.getByLabel(getTranslation("Entry.confirm", "en"), { exact: true }).check();
  await chooseWorkspaceLanguage(page, "ru");
  await expect(page.getByLabel(getTranslation("Entry.confirm", "ru"), { exact: true })).toBeChecked();
  await page.getByRole("button", { name: getTranslation("Entry.submit", "ru"), exact: true }).click();
  await expect(page.locator(".entry-checkpoint .ui-error-summary")).toBeFocused();
  await page.screenshot({ path: info.outputPath("submission-retry-ru-320.png"), fullPage: true });
  expect(await page.locator(".entry-review button:visible").evaluateAll(buttons => buttons.every(button => button.scrollWidth <= button.clientWidth))).toBe(true);
  await chooseWorkspaceLanguage(page, "en"); state.lose = false;
  await page.getByRole("button", { name: getTranslation("Entry.retrySubmission", "en"), exact: true }).click();
  await expect(page.locator(".entry-submission-receipt h4")).toBeFocused();
  expect(state.receipts.size).toBe(1); expect(state.commands[1]).toEqual(state.commands[0]);
});

test("submission empty checklist keeps its checkpoint through entry creation and editing", async ({ page }, info) => {
  const state = await submissionFixture(page); state.owner.entries = []; state.review.music.entries = [];
  state.review.checkpoints[0].issues = [{ performanceId: null, field: "entries", reason: "required" }];
  await page.goto(base + "?entry=review&checkpoint=BASIC");
  await page.screenshot({ path: info.outputPath("submission-empty.png"), fullPage: true });
  await page.getByRole("link", { name: getTranslation("Entry.field_entries", "en"), exact: true }).click();
  await expect(page).toHaveURL(base + "/new?entry=review&checkpoint=BASIC");
  await page.locator("#entry-new-title").fill("Created from checklist"); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(base + "/p/edit?entry=review&checkpoint=BASIC");
  state.review.checkpoints[0].issues = (["categoryId", "ageGroupId", "formatId"] as const).map(field => ({ performanceId: "p", field, reason: "required" }));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(base + "?entry=review&checkpoint=BASIC");
  await expect(page.getByRole("link", { name: "Category", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("submission-empty-return.png"), fullPage: true });
});
