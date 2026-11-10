import { test, expect, type Page } from "@playwright/test";
import { EventSchema, type Event, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey, type TranslationArgs } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

type PlainKey = { [K in TranslationKey]: TranslationArgs<K> extends [] ? K : never }[TranslationKey];
const label = (key: PlainKey, locale: Locale = "en") => getTranslation(key, locale);
const user = (admin = true): UserProfile => ({ id: "organizer", name: "Synthetic organizer", email: "organizer@example.invalid", preferredLocale: null, createdAt: "2026-01-01T00:00:00.000Z", isAdmin: admin, roles: [], permissions: [] });
const event = (): Event => ({ id: "e", name: "Synthetic competition", startsAt: "2027-06-01T08:00:00.000Z", endsAt: "2027-06-01T10:00:00.000Z", timeZone: "Europe/Tallinn", registrationDeadline: null, createdAt: "2026-01-01T00:00:00.000Z", stage: "PRE_REGISTRATION", venue: "Hall", country: "EE", city: "Tallinn", description: { sourceLocale: "et", sourceText: "Algtekst <script>literal</script>", translations: { en: "Instructions" } }, unclassifiedDescription: null, organizerEmail: "organizer@example.invalid", organizerPhone: null, revision: 1, maxStudios: null, maxPerformances: null, imageUrl: null });
const error = (reason = "concurrentChange") => ({ code: "CONFLICT", reason, params: {}, issues: [] });
async function install(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 }); await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const state = { current: event(), admin: true, valid: true, readFail: false, writeFailure: 0, loseResponse: false, writes: [] as Record<string, unknown>[], creates: [] as Record<string, unknown>[], empty: false };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { state.valid = true; return route.fulfill({ json: { session: "cookie", expiresAt: "2027-06-01T00:00:00.000Z", user: { id: "organizer", email: "organizer@example.invalid", name: "Synthetic organizer" } } }); }
    if (!state.valid) return route.fulfill({ status: 401, json: error("authenticationRequired") });
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user(state.admin) });
    if (route.request().method() === "POST" && path.endsWith("/events")) {
      const body: Record<string, unknown> = route.request().postDataJSON(); state.creates.push(body);
      const { operationId: _operationId, ...fields } = body;
      state.current = EventSchema.parse({ ...state.current, ...fields, description: fields.description ?? null });
      if (state.loseResponse) { state.loseResponse = false; return route.abort(); }
      return route.fulfill({ status: 201, json: state.current });
    }
    if (route.request().method() === "PATCH") {
      const body: Record<string, unknown> = route.request().postDataJSON(); state.writes.push(body);
      if (state.writeFailure) return route.fulfill({ status: state.writeFailure, json: error(state.writeFailure === 400 ? "invalidInput" : "concurrentChange") });
      const { expectedRevision: _revision, expectedStage: _stage, ...fields } = body;
      state.current = EventSchema.parse({ ...state.current, ...fields, revision: state.current.revision + 1 });
      if (state.loseResponse) { state.loseResponse = false; return route.abort(); }
      return route.fulfill({ json: state.current });
    }
    if (state.readFail) return route.abort();
    if (path === "/api/v1/events") return route.fulfill({ json: state.empty ? [] : [state.current] });
    if (path === "/api/v1/events/e") return route.fulfill({ json: state.current });
    return route.fulfill({ status: 404, json: error("recordNotFound") });
  });
  return state;
}
async function save(page: Page, locale: Locale = "en") {
  await page.getByRole("button", { name: label("Events.saveChanges", locale), exact: true }).click();
}
for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} S05 setup, language preview and lifecycle at ${width}px`, async ({ page }, info) => {
    const state = await install(page, locale, width);
    await page.goto("/admin"); await page.getByRole("link", { name: label("Setup.title", locale) + ": " + state.current.name, exact: true }).click();
    await expect(page.getByRole("heading", { name: label("Setup.title", locale) + ": " + state.current.name, exact: true })).toBeVisible();
    await expect(page.locator("#event-startsAt")).toHaveValue("2027-06-01T11:00");
    await page.locator("#event-city").fill("Synthetic city");
    await expect(page.getByRole("button", { name: label("Setup.open", locale), exact: true })).toBeDisabled();
    await page.getByText(label("Setup.preview", locale), { exact: true }).click();
    await expect(page.locator('p[lang="et"]').filter({ hasText: "<script>literal</script>" }).first()).toBeVisible();
    await expect(page.locator('script').filter({ hasText: "literal" })).toHaveCount(0);
    await save(page, locale); await expect(page.getByText(label("Setup.saved", locale), { exact: true })).toBeVisible();
    expect(state.writes[0]).toMatchObject({ city: "Synthetic city", expectedRevision: 1, startsAt: "2027-06-01T08:00:00.000Z" });
    const open = page.getByRole("button", { name: label("Setup.open", locale), exact: true }); await open.click();
    const dialog = page.getByRole("dialog"); const cancel = dialog.getByRole("button", { name: label("Common.cancel", locale), exact: true });
    await expect(cancel).toBeFocused(); await page.keyboard.press("Escape"); await expect(open).toBeFocused(); expect(state.writes).toHaveLength(1);
    await open.click(); await dialog.getByRole("button", { name: label("Setup.confirm", locale), exact: true }).click();
    await expect(page.getByText(label("Setup.stageSaved", locale), { exact: true })).toBeVisible(); expect(state.current.stage).toBe("REGISTRATION_OPEN");
    // Action labels must fit the graphite rail in all delivered locales/widths.
    const actionsFit = await page.locator(".setup-rail button").evaluateAll(buttons => buttons.every(button => {
      const range = document.createRange(); range.selectNodeContents(button);
      return range.getClientRects().length === 1;
    }));
    expect(actionsFit).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const contrast = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable");
      const luminance = (color: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const bytes = ctx.getImageData(0, 0, 1, 1).data; const rgb = [bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0].map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }); return (rgb[0] ?? 0) * .2126 + (rgb[1] ?? 0) * .7152 + (rgb[2] ?? 0) * .0722; };
      const ratio = (a: string, b: string) => { const first = luminance(a); const second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); };
      const style = (selector: string) => { const element = document.querySelector(selector); if (!element) throw new Error("Missing contrast target"); return getComputedStyle(element); };
      const workbench = style(".event-workbench"); const field = style("#event-name"); const button = style("button[type=submit]"); const rail = style(".setup-rail");
      return { text: ratio(workbench.color, workbench.backgroundColor), control: ratio(field.borderTopColor, field.backgroundColor), button: ratio(button.color, button.backgroundColor), rail: ratio(rail.color, rail.backgroundColor) };
    });
    expect(contrast.text).toBeGreaterThanOrEqual(4.5); expect(contrast.control).toBeGreaterThanOrEqual(3); expect(contrast.button).toBeGreaterThanOrEqual(4.5); expect(contrast.rail).toBeGreaterThanOrEqual(4.5);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath("event-setup.png"), fullPage: true });
    await page.goto("/events/e"); await expect(page.getByRole("heading", { name: state.current.name, exact: true })).toBeFocused();
    await expect(page.getByText(label("Setup.windowOpen", locale), { exact: true })).toBeVisible();
    if (locale === "ru") { await expect(page.getByText(label("Registration.contentFallback", locale), { exact: true })).toBeVisible(); await expect(page.locator('p[lang="et"]').filter({ hasText: "Algtekst" })).toBeVisible(); }
  });
}
test("S05 create and retry retains operation identity, explicit timezone and no-cutoff choice", async ({ page }) => {
  const state = await install(page); state.loseResponse = true;
  await page.goto("/events/new"); await page.locator("#event-name").fill("Synthetic creation");
  await page.locator("form button[type=submit]").click(); await expect(page.locator(".ui-error-summary")).toBeFocused(); expect(state.creates).toHaveLength(0);
  await page.locator("#event-timeZone").fill("UTC"); await page.locator("#event-cutoff").selectOption("none");
  await page.locator("form button[type=submit]").click(); await expect(page.getByText(label("Setup.reconcile"), { exact: true })).toBeVisible();
  await expect(page.locator("#event-name")).toHaveValue("Synthetic creation"); await expect(page.locator("#event-name")).toBeDisabled();
  await page.getByRole("button", { name: label("Setup.retrySame"), exact: true }).click(); await expect(page).toHaveURL("/admin/events/e/setup");
  expect(state.creates).toHaveLength(2); expect(state.creates[1]).toEqual(state.creates[0]); expect(state.creates[0]?.operationId).toMatch(/^[0-9a-f-]{36}$/);
});
test("S05 linked checklist and UTC offset choice reject DST gaps and require fold disambiguation", async ({ page }) => {
  const state = await install(page); state.current = { ...event(), venue: null, organizerEmail: null, description: null, unclassifiedDescription: "Retained prose" };
  await page.goto("/admin/events/e/setup"); await expect(page.getByRole("button", { name: label("Setup.open"), exact: true })).toBeDisabled();
  await page.locator('a[href="#event-venue"]').click(); await expect(page.locator("#event-venue")).toBeFocused();
  await page.locator("#event-startsAt").fill("2026-03-29T03:30"); await save(page); expect(state.writes).toHaveLength(0);
  await expect(page.getByText(label("Setup.invalidTime"), { exact: true })).toBeVisible();
  await page.locator("#event-description-language").selectOption("et");
  await page.locator("#event-startsAt").fill("2026-10-25T03:30"); await save(page); expect(state.writes).toHaveLength(0);
  await expect(page.locator("#event-startsAt-offset")).toBeVisible();
  await page.locator("#event-startsAt-offset").selectOption("2026-10-25T01:30:00.000Z"); await save(page);
  await expect(page.getByText(label("Setup.saved"), { exact: true })).toBeVisible();
  expect(state.writes[0]?.startsAt).toBe("2026-10-25T01:30:00.000Z"); expect(state.writes[0]?.description).toMatchObject({ sourceLocale: "et", sourceText: "Retained prose" });
});
test("S05 stale edits compare every server detail and keep local work only by explicit choice", async ({ page }) => {
  const state = await install(page); state.writeFailure = 409;
  await page.goto("/events/e/edit"); await page.locator("#event-city").fill("My city"); await save(page);
  await expect(page.getByText(label("Setup.reconcile"), { exact: true })).toBeVisible();
  state.current = { ...event(), revision: 2, venue: "Concurrent venue", city: "Other city" };
  await page.getByRole("button", { name: label("Setup.compare"), exact: true }).click();
  await expect(page.getByRole("region", { name: label("Setup.serverCopy"), exact: true }).getByText("Concurrent venue", { exact: true })).toBeVisible();
  await expect(page.locator("#event-city")).toHaveValue("My city");
  await page.getByRole("button", { name: label("Setup.keepMine"), exact: true }).click(); state.writeFailure = 0;
  await save(page); await expect(page.getByText(label("Setup.saved"), { exact: true })).toBeVisible();
  expect(state.writes[1]?.expectedRevision).toBe(2); expect(state.writes[1]?.city).toBe("My city");
});
test("S05 lost saved response and failed compare preserve draft and prohibit silent replay", async ({ page }) => {
  const state = await install(page); state.loseResponse = true;
  await page.goto("/admin/events/e/setup"); await page.locator("#event-city").fill("Saved but unconfirmed"); await save(page);
  await expect(page.getByText(label("Setup.reconcile"), { exact: true })).toBeVisible(); state.readFail = true;
  await page.getByRole("button", { name: label("Setup.compare"), exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible();
  expect(state.writes).toHaveLength(1); await expect(page.locator("#event-city")).toHaveValue("Saved but unconfirmed");
  state.readFail = false; await page.getByRole("button", { name: label("Setup.compare"), exact: true }).click();
  await page.getByRole("button", { name: label("Setup.useServer"), exact: true }).click();
  await expect(page.locator("#event-city")).toHaveValue("Saved but unconfirmed"); await expect(page.locator("#event-city")).toBeEnabled(); expect(state.writes).toHaveLength(1);
});
test("S05 language and session recovery retain mounted form and disable writes until explicit action", async ({ page }) => {
  const state = await install(page); await page.goto("/admin/events/e/setup"); await page.locator("#event-city").fill("Retained local city");
  await page.getByRole("button", { name: "Русский", exact: true }).click(); await expect(page.locator("#event-city")).toHaveValue("Retained local city");
  state.valid = false; await save(page, "ru"); await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = page.getByRole("dialog"); await dialog.getByLabel(label("Shell.password", "ru"), { exact: true }).fill("password123");
  await dialog.getByRole("button", { name: label("Shell.login", "ru"), exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect(page.locator("#event-city")).toHaveValue("Retained local city"); expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: label("Setup.retrySame", "ru"), exact: true }).click(); await expect(page.getByText(label("Setup.saved", "ru"), { exact: true })).toBeVisible(); expect(state.writes).toHaveLength(1);
});
test("S05 direct URL denial, empty dashboard and read retry stay actionable", async ({ page }) => {
  const state = await install(page); state.admin = false;
  await page.goto("/admin/events/e/setup"); await expect(page.getByRole("heading", { name: label("Access.denied"), exact: true })).toBeVisible(); expect(state.writes).toHaveLength(0);
  state.admin = true; state.empty = true; await page.goto("/admin"); await expect(page.getByText(label("Setup.noEvents"), { exact: true })).toBeVisible();
  state.empty = false; state.readFail = true; await page.goto("/admin/events/e/setup"); await expect(page.locator(".ui-error-summary")).toBeVisible();
  state.readFail = false; await page.getByRole("button", { name: label("Shell.retry"), exact: true }).click(); await expect(page.locator("#event-name")).toHaveValue(state.current.name);
});

test("S05 confirmed close and cancellation retain history and restore logical keyboard focus", async ({ page }) => {
  const state = await install(page); state.current.stage = "REGISTRATION_OPEN";
  await page.goto("/admin/events/e/setup");
  await page.getByRole("button", { name: label("Setup.close"), exact: true }).click();
  const dialog = page.getByRole("dialog"); const cancel = dialog.getByRole("button", { name: label("Common.cancel"), exact: true });
  await expect(cancel).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("button", { name: label("Setup.confirm"), exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(cancel).toBeFocused();
  await dialog.getByRole("button", { name: label("Setup.confirm"), exact: true }).click();
  await expect(page.locator("#event-stage-heading")).toBeFocused(); expect(state.current.stage).toBe("DATA_REVIEW");
  await expect(page.getByRole("button", { name: label("Setup.open"), exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: label("Setup.cancelEvent"), exact: true }).click(); await dialog.getByRole("button", { name: label("Setup.confirm"), exact: true }).click();
  await expect(page.getByText(label("Setup.stageSaved"), { exact: true })).toBeVisible(); expect(state.current.stage).toBe("CANCELLED");
  await expect(page.locator("#event-stage-heading")).toBeFocused();
  await expect(page.getByRole("button", { name: label("Setup.cancelEvent"), exact: true })).toHaveCount(0);
  await page.goto("/events/e"); await expect(page.getByText(label("Setup.windowClosed"), { exact: true })).toBeVisible();
});
test("S05 pending save disables mutations and never claims success before acknowledgement", async ({ page }) => {
  const state = await install(page); let release: (() => void) | undefined;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/events/e", async route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await wait; return route.fulfill({ json: { ...state.current, city: "Pending city", revision: 2 } });
  });
  await page.goto("/admin/events/e/setup"); await page.locator("#event-city").fill("Pending city"); await save(page);
  await expect(page.locator("#event-city")).toBeDisabled(); await expect(page.getByRole("button", { name: label("Events.saveChanges"), exact: true })).toBeDisabled();
  await expect(page.getByText(label("Setup.saved"), { exact: true })).toHaveCount(0); release?.();
  await expect(page.getByText(label("Setup.saved"), { exact: true })).toBeVisible();
});
test("S05 image unknown outcome reloads the authoritative image before another upload", async ({ page }) => {
  const state = await install(page); let uploads = 0; let fail = true;
  const imageUrl = "/uploads/events/00000000-0000-4000-8000-000000000001.webp";
  await page.route("**/uploads/events/**", route => route.fulfill({ contentType: "image/webp", body: Buffer.from("UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAIAAUAmJaQAA3AA/vv2AAA=", "base64") }));
  await page.route("**/api/v1/images/events/e", route => { uploads++; state.current.imageUrl = imageUrl; return fail ? route.abort() : route.fulfill({ json: { success: true, messageId: "saved", imageUrl } }); });
  await page.goto("/admin/events/e/setup"); await page.locator("#event-image-file").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from("synthetic image fixture") });
  await page.getByRole("button", { name: label("Setup.upload"), exact: true }).click(); await expect(page.getByText(label("Setup.imageUncertain"), { exact: true })).toBeVisible();
  await expect(page.locator("#event-image-file")).toBeDisabled(); expect(uploads).toBe(1);
  await page.getByRole("button", { name: label("Setup.refresh"), exact: true }).click(); await expect(page.getByRole("img", { name: label("Common.eventPhoto"), exact: true })).toBeVisible();
  await expect(page.locator("#event-image-file")).toBeEnabled(); fail = false;
  await page.getByRole("button", { name: label("Setup.upload"), exact: true }).click(); await expect(page.getByText(label("Setup.imageSaved"), { exact: true })).toBeVisible(); expect(uploads).toBe(2);
});
test("S05 event-bound direct links and guest recovery cannot display another setup", async ({ page }) => {
  const state = await install(page); await page.goto("/admin/events/e/setup"); await expect(page.locator("#event-name")).toHaveValue(state.current.name);
  await page.goto("/admin/events/missing/setup"); await expect(page.locator(".ui-error-summary")).toBeVisible(); await expect(page.locator("#event-name")).toHaveCount(0);
  await page.route("**/api/v1/auth/profile", route => route.fulfill({ status: 401, json: error("authenticationRequired") }));
  await page.goto("/admin/events/e/setup"); await expect(page).toHaveURL(/\/auth\/login\?returnTo=%2Fadmin%2Fevents%2Fe%2Fsetup/);
});

test("S05 unrelated edits retain exact stored instants, including a repeated DST minute", async ({ page }) => {
  const state = await install(page);
  const dates = {
    startsAt: "2026-10-25T01:30:42.123Z",
    endsAt: "2026-10-25T03:00:17.456Z",
    registrationDeadline: "2026-10-24T12:00:59.789Z",
  };
  state.current = { ...state.current, ...dates };
  await page.goto("/admin/events/e/setup");
  await expect(page.locator("#event-startsAt-offset")).toHaveValue("2026-10-25T01:30:00.000Z");
  await page.locator("#event-city").fill("Unrelated change"); await save(page);
  await expect(page.getByText(label("Setup.saved"), { exact: true })).toBeVisible();
  expect(state.writes[0]).toMatchObject(dates);
  await page.locator("#event-startsAt-offset").selectOption("2026-10-25T00:30:00.000Z"); await save(page);
  await expect(page.getByText(label("Setup.saved"), { exact: true })).toBeVisible();
  expect(state.writes[1]).toMatchObject({ ...dates, startsAt: "2026-10-25T00:30:00.000Z" });
});

for (const [locale, width] of [["en", 320], ["ru", 390], ["et", 768], ["en", 1440]] as const) {
  test(`${locale} S01/S02/S05 organizer screens and discovery states at ${width}px`, async ({ page }, info) => {
    const state = await install(page, locale, width);
    for (const [path, file, title] of [
      ["/admin", "dashboard", label("Setup.dashboard", locale)],
      ["/events", "event-list", label("Events.listTitle", locale)],
      ["/events/e", "event-detail", state.current.name],
      ["/events/new", "event-create", label("Events.createTitle", locale)],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeFocused();
      if (path === "/events") {
        const details = page.getByRole("link", { name: label("Events.moreInfo", locale) + ": " + state.current.name, exact: true });
        await expect(details).toBeVisible();
        expect(await details.evaluate(element => { const range = document.createRange(); range.selectNodeContents(element); return range.getClientRects().length; })).toBe(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(file + ".png"), fullPage: true });
    }
    state.empty = true;
    await page.goto("/admin"); await expect(page.getByText(label("Setup.noEvents", locale), { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("dashboard-empty.png"), fullPage: true });
    state.admin = false;
    await page.goto("/events"); await expect(page.getByText(label("Events.noEventsYet", locale), { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: label("Events.createTitle", locale), exact: true })).toHaveCount(0);
    state.empty = false; state.current.stage = "DATA_REVIEW";
    await page.goto("/events/e"); await expect(page.getByText(label("Setup.windowClosed", locale), { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: label("Setup.title", locale), exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("event-closed.png"), fullPage: true });
    state.readFail = true;
    await page.goto("/events"); await expect(page.locator(".ui-error-summary")).toBeVisible();
    await expect(page.locator(".ui-error-summary").getByRole("heading", { name: label("Events.loadError", locale), exact: true })).toBeVisible();
    await expect(page.getByText(label("Events.noEventsYet", locale), { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("event-list-error.png"), fullPage: true });
    state.readFail = false;
    await page.getByRole("button", { name: label("Shell.retry", locale), exact: true }).click();
    await expect(page.getByRole("heading", { name: state.current.name, exact: true })).toBeVisible();
    state.admin = true; state.readFail = true;
    for (const path of ["/admin", "/events/e", "/admin/events/e/setup"]) {
      await page.goto(path);
      await expect(page.locator(".ui-error-summary").getByRole("heading", { name: label("Events.loadError", locale), exact: true })).toBeVisible();
      await expect(page.locator(".ui-error-summary").getByRole("heading", { name: label("Feedback.validation", locale), exact: true })).toHaveCount(0);
    }
    expect(state.writes).toHaveLength(0); expect(state.creates).toHaveLength(0);
  });
}
