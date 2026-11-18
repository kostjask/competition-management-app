import { test, expect, type Page } from "@playwright/test";
import { CreateDancerBodySchema, UpdateDancerBodySchema, DancerArchiveBodySchema, CreatePerformanceBodySchema, UpdatePerformanceBodySchema,
  DancerSchema, PerformanceSchema, StudioSchema, EntryContextSchema, EntryFieldSchema, type Dancer, type Performance, type UserProfile } from "../../packages/schemas/src/index";
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
