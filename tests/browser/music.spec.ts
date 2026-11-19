import { test, expect, type Page } from "@playwright/test";
import { MusicCreateSchema, MusicCommandSchema, MusicConfigureSchema, MusicWorkspaceSchema, MusicReceiptSchema } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const base = "/app/events/e/studios/s/music";
const trackId = "00000000-0000-4000-8000-000000000001";
const versionId = "00000000-0000-4000-8000-000000000002";
const denied = { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] };
const file = { name: "Synthetic recording.wav", mimeType: "audio/wav", buffer: Buffer.from("synthetic audio, content validation covered by API checks") };
function audioFixture() {
  const data = Buffer.alloc(1644); data.write('RIFF'); data.writeUInt32LE(1636, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(1600, 40); return data;
}
async function fixture(page: Page, locale: Locale = "en", width = 390, organizer = false) {
  await page.setViewportSize({ width, height: 950 }); await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const value = MusicWorkspaceSchema.parse({ eventName: "Synthetic festival", studioName: "Synthetic studio", configuration: { revision: 1, providerReady: true, policy: { allowedMime: ["audio/wav", "audio/mpeg"], maxBytes: 20000000, maxDurationMs: 240000, deadline: "2099-01-01T00:00:00Z", exceptionUntil: "2099-01-02T00:00:00Z" } }, organizer, tracks: [] });
  const user = { id: "rep", name: "Synthetic user", email: "music@example.invalid", isAdmin: organizer, roles: [], permissions: [], preferredLocale: null, createdAt: "2026-01-01T00:00:00Z" };
  const state = { value, lose: false, fail: false, expired: false, hold: Promise.resolve(), calls: [] as { operationId: string; revision: string }[], operations: new Map<string, unknown>() };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method();
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user });
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00Z", user: { id: user.id, email: user.email, name: user.name } } }); }
    if (state.expired) return route.fulfill({ status: 401, json: { ...denied, code: "UNAUTHORIZED", reason: "authenticationRequired" } });
    if (path === "/api/v1/events/e/studios/s/music") {
      if (method === "GET") return route.fulfill({ json: state.value });
      const body = MusicCreateSchema.parse(route.request().postDataJSON());
      const response = state.operations.get(body.operationId) ?? { operationId: body.operationId, track: { id: body.trackId, eventId: "e", studioId: "s", registrationId: "r", revision: 1, performanceId: body.performanceId ?? null, state: "DRAFT", currentVersion: null, correctionUntil: null } };
      if (!state.operations.has(body.operationId)) { state.operations.set(body.operationId, response); const parsed = MusicWorkspaceSchema.parse({ ...state.value, tracks: [...state.value.tracks, MusicReceiptSchema.parse(response).track] }); state.value.tracks = parsed.tracks; }
      return route.fulfill({ status: 201, json: response });
    }
    const track = state.value.tracks[0];
    if (path.endsWith("/versions") && method === "POST" && track) {
      const headers = route.request().headers(); const operationId = headers["x-operation-id"]; if (!operationId || !headers["x-music-revision"]) throw new Error("Missing operation headers"); state.calls.push({ operationId, revision: headers["x-music-revision"] }); await state.hold;
      if (state.fail) return route.fulfill({ status: 400, json: { ...denied, code: "VALIDATION_ERROR", reason: "uploadType" } });
      const response = state.operations.get(operationId) ?? { operationId, track: { ...track, revision: track.revision + 1, currentVersion: { id: versionId, displayName: file.name, detectedMime: "audio/wav", byteLength: 1644, durationMs: 100, createdAt: "2026-11-19T00:00:00Z" } } };
      state.operations.set(operationId, response); state.value.tracks = [MusicReceiptSchema.parse(response).track];
      return state.lose ? route.abort() : route.fulfill({ json: response });
    }
    if (path.endsWith("/commands") && track) {
      const body = MusicCommandSchema.parse(route.request().postDataJSON());
      const row = { ...track, revision: track.revision + 1, state: body.action === "CONFIRM" ? "CONFIRMED" : body.action === "ACCEPT" ? "ACCEPTED" : body.action === "REOPEN" ? "DRAFT" : track.state, correctionUntil: body.until ?? null, performanceId: body.performanceId ?? track.performanceId };
      state.value.tracks = MusicWorkspaceSchema.parse({ ...state.value, tracks: [row] }).tracks;
      return route.fulfill({ json: { operationId: body.operationId, track: row } });
    }
    if (path.endsWith("/bytes")) return route.fulfill({ contentType: "audio/wav", body: audioFixture() });
    if (path.endsWith("/music-configuration")) { const body = MusicConfigureSchema.parse(route.request().postDataJSON()); state.value.configuration = { policy: body.policy, providerReady: true, revision: state.value.configuration.revision + 1 }; return route.fulfill({ json: state.value.configuration }); }
    return route.fulfill({ status: 404, json: denied });
  });
  return state;
}
async function add(page: Page, t: (key: TranslationKey) => string) { await page.getByRole("button", { name: t("Music.newTrack"), exact: true }).click(); await expect(page.locator("#music-file")).toBeVisible(); }

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} music preparation, upload and confirmation at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); const t = (key: TranslationKey) => getTranslation(key, locale);
    await page.goto(base); await expect(page.getByText(t("Music.noTracks"))).toBeVisible(); await add(page, t);
    await page.locator("#music-file").setInputFiles(file); await page.screenshot({ path: info.outputPath(`music-selected-${locale}-${width}.png`), fullPage: true });
    expect(state.value.tracks[0].currentVersion).toBeNull();
    await page.getByRole("button", { name: t("Music.upload"), exact: true }).click(); await expect(page.getByText(file.name, { exact: true })).toBeVisible();
    await expect(page.getByText(t("Music.fileSaved"), { exact: true })).toBeVisible(); await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.locator("audio")).toHaveAttribute("preload", "none"); await expect(page.locator("audio")).not.toHaveAttribute("autoplay");
    await expect(page).toHaveTitle(new RegExp(t("Music.title")));
    if (locale === "en" && width === 390) { await page.locator("audio").evaluate(node => node instanceof HTMLMediaElement ? node.play() : null); await expect.poll(() => page.locator("audio").evaluate(node => node instanceof HTMLMediaElement ? node.duration : 0)).toBe(0.1); }
    await page.screenshot({ path: info.outputPath(`music-ready-${locale}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: t("Music.confirm"), exact: true }).click(); await expect(page.getByText(t("Music.CONFIRMED"), { exact: true })).toBeVisible();
    await expect(page.locator("#music-file")).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await expect(page.getByText(t("Music.CONFIRMED"), { exact: true })).toBeVisible();
  });
}
test('failed replacement retains saved file; lost responses reconcile the same operation', async ({ page }) => {
  const state = await fixture(page); const t = (key: TranslationKey) => getTranslation(key, "en");
  await page.goto(base); await add(page, t); await page.locator("#music-file").setInputFiles(file); state.lose = true;
  await page.getByRole("button", { name: t("Music.upload"), exact: true }).click(); await expect(page.getByText(t("Music.uncertain"))).toBeVisible();
  await expect(page.locator("#music-file")).toBeDisabled(); state.lose = false;
  await page.getByRole("button", { name: t("Entry.retry"), exact: true }).click(); await expect(page.getByText(t("Music.fileSaved"))).toBeVisible();
  expect(state.calls[0]).toEqual(state.calls[1]); expect(state.value.tracks[0].revision).toBe(2);
  const audio = await page.locator("audio").getAttribute("src"); state.fail = true;
  await page.locator("#music-file").setInputFiles(file); await expect(page.getByRole("button", { name: t("Music.replace"), exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: t("Music.replaceConfirm") }).check();
  await page.getByRole("button", { name: t("Music.replace"), exact: true }).click(); await expect(page.getByText(t("Music.uncertain"))).toBeVisible();
  expect(await page.locator("audio").getAttribute("src")).toBe(audio);
  await expect(page.getByRole("button", { name: t("Music.compared"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: t("Music.refresh"), exact: true }).click(); await page.getByRole("button", { name: t("Music.compared"), exact: true }).click();
  await expect(page.locator("#music-file")).toBeEnabled(); expect(state.value.tracks[0].revision).toBe(2);
});
test('organizer acceptance and reasoned correction stay separate from application decisions', async ({ page }, info) => {
  const state = await fixture(page, "ru", 390, true); const t = (key: TranslationKey) => getTranslation(key, "ru");
  state.value.tracks = [{ id: trackId, eventId: "e", studioId: "s", registrationId: "r", performanceId: null, state: "CONFIRMED", revision: 2, correctionUntil: null, currentVersion: { id: versionId, displayName: file.name, detectedMime: "audio/wav", byteLength: 1644, durationMs: 100, createdAt: "2026-11-19T00:00:00Z" } }];
  await page.goto(base); await page.getByRole("button", { name: t("Music.accept"), exact: true }).click(); await expect(page.getByText(t("Music.ACCEPTED"))).toBeVisible();
  await page.locator("#music-reason").fill("Synthetic correction"); await page.locator("#music-until").fill("2099-01-01T12:00");
  await page.screenshot({ path: info.outputPath("organizer-music-correction.png"), fullPage: true });
  await page.getByRole("button", { name: t("Music.reopen"), exact: true }).click(); await expect(page.locator("#music-file")).toBeVisible(); expect(state.value.tracks[0].state).toBe("DRAFT");
});
test('upload cancellation keeps a retryable operation and the selected file', async ({ page }) => {
  const state = await fixture(page); const t = (key: TranslationKey) => getTranslation(key, "en");
  let release!: () => void; state.hold = new Promise<void>(resolve => { release = resolve; });
  await page.goto(base); await add(page, t); await page.locator("#music-file").setInputFiles(file);
  await page.getByRole("button", { name: t("Music.upload"), exact: true }).click(); await expect(page.locator("#music-progress")).toBeVisible();
  await page.getByRole("button", { name: t("Music.cancel"), exact: true }).click(); await expect(page.getByText(t("Music.uncertain"))).toBeVisible();
  release(); await expect.poll(() => state.operations.size).toBe(2); state.hold = Promise.resolve();
  await page.getByRole("button", { name: t("Entry.retry"), exact: true }).click(); await expect(page.getByText(t("Music.fileSaved"))).toBeVisible();
  expect(state.calls[0]).toEqual(state.calls[1]);
});
test('unconfigured music stays unavailable; organizer can enter explicit limits with keyboard focus', async ({ page }, info) => {
  const state = await fixture(page, "et", 320, true); const t = (key: TranslationKey) => getTranslation(key, "et");
  state.value.configuration.policy = null;
  await page.goto(base); await expect(page.getByText(t("Music.disabled"))).toBeVisible(); await expect(page.getByRole("button", { name: t("Music.newTrack"), exact: true })).toBeDisabled();
  await page.locator("summary").focus(); await page.keyboard.press("Enter"); await expect(page.locator("#music-policy-maxBytes")).toBeVisible();
  await page.locator("#music-policy-maxBytes").fill("20"); await page.locator("#music-policy-maxDurationMs").fill("240");
  await page.locator("#music-policy-deadline").fill("2099-01-01T00:00"); await page.locator("#music-policy-exceptionUntil").fill("2099-01-02T00:00");
  await page.getByRole("checkbox", { name: t("Music.wav"), exact: true }).check();
  await page.screenshot({ path: info.outputPath("music-policy-et-320.png"), fullPage: true });
  await page.getByRole("button", { name: t("Entry.save"), exact: true }).click(); await expect(page.getByText(t("Music.policySaved"))).toBeVisible();
  const saved = MusicWorkspaceSchema.parse(state.value); expect(saved.configuration.policy?.maxBytes).toBe(20 * 1048576); expect(saved.configuration.policy?.maxDurationMs).toBe(240000);
});
test('expired upload session preserves the selected file for the same-operation retry', async ({ page }) => {
  const state = await fixture(page); const t = (key: TranslationKey) => getTranslation(key, "en");
  await page.goto(base); await add(page, t); await page.locator("#music-file").setInputFiles(file); state.expired = true;
  await page.getByRole("button", { name: t("Music.upload"), exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill("password123"); await page.getByRole("dialog").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: t("Entry.retry"), exact: true }).click(); await expect(page.getByText(t("Music.fileSaved"))).toBeVisible();
  expect(state.value.tracks[0].currentVersion?.displayName).toBe(file.name);
});
