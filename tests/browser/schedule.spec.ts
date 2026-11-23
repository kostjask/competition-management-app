import { test, expect, type Page } from "@playwright/test";
import { ScheduleCommandSchema, SchedulePreviewBodySchema, ScheduleWorkspaceSchema, type ScheduleReceipt, type ScheduleWorkspace } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const stage = "00000000-0000-4000-8000-000000000001";
const session = "00000000-0000-4000-8000-000000000002";
const session2 = "00000000-0000-4000-8000-000000000003";
const instant = "2026-12-05T08:00:00.000Z";
async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const workspace: ScheduleWorkspace = ScheduleWorkspaceSchema.parse({ eventId: "e", eventName: "Synthetic competition", eventStage: "DATA_REVIEW", timeZone: "Europe/Tallinn", revision: 1, organizer: true,
    stages: [{ id: stage, name: "Main stage" }], moderators: [{ id: "moderator", name: "Synthetic moderator" }], receipts: [],
    sessions: [session, session2].map((id, i) => ({ id, stageId: stage, name: i ? "Afternoon" : "Morning", startsAt: i ? "2026-12-05T12:00:00.000Z" : instant, bufferSec: 120, restSec: 120, moderatorId: null, state: "PAUSED", slots: [] })),
    performances: ["First <script>literal</script>", "Second", "Third", "Incomplete"].map((title, i) => ({ id: `p${i + 1}`, title, studioName: "Synthetic studio", revision: 1, durationSec: 60, legacyOrder: null, eligible: i < 3 })) });
  const state = { workspace, deny: false, failed: false, empty: false, expired: false, conflict: false, loseSave: false, saveCount: 0, admin: true, hold: Promise.resolve(), commands: [] as unknown[], receipts: new Map<string, ScheduleReceipt>() };
  await page.context().route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "admin", name: "Synthetic organizer", email: "organizer@example.invalid" } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: { id: "admin", name: "Synthetic organizer", email: "organizer@example.invalid", isAdmin: state.admin, roles: [], permissions: [], preferredLocale: null, createdAt: instant } });
    if (state.expired) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (state.deny) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] } });
    if (path.endsWith("/schedule/preview")) {
      const body = SchedulePreviewBodySchema.parse(route.request().postDataJSON());
      return route.fulfill({ json: { revision: body.expectedRevision, previewToken: "a".repeat(64), queues: body.queues,
        conflicts: state.conflict ? [{ kind: "DANCER", performanceIds: ["p1", "p2"], sessionIds: [session] }] : [],
        times: body.queues.flatMap(q => q.performanceIds.map((id, i) => { const start = Date.parse(state.workspace.sessions.find(s => s.id === q.sessionId)!.startsAt) + i * 180000; return { performanceId: id, sessionId: q.sessionId, startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60000).toISOString() }; })) } });
    }
    if (path.endsWith("/schedule/commands")) {
      const body = ScheduleCommandSchema.parse(route.request().postDataJSON()); state.commands.push(body);
      const replay = state.receipts.get(body.operationId); if (replay) return route.fulfill({ json: replay });
      if (body.expectedRevision !== state.workspace.revision) return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] } });
      state.workspace.revision++;
      if (body.action === "SAVE") { state.saveCount++; for (const q of body.queues) { const s = state.workspace.sessions.find(s => s.id === q.sessionId)!; s.slots = q.performanceIds.map((performanceId, i) => ({ id: `00000000-0000-4000-8000-${String(Number(performanceId.slice(1)) + 10).padStart(12, "0")}`, performanceId, position: i + 1, state: "WAITING", reason: null })); } }
      if (body.action === "CREATE_STAGE") state.workspace.stages.push({ id: body.id, name: body.name });
      if (body.action === "CREATE_SESSION") state.workspace.sessions.push({ id: body.id, stageId: body.stageId, name: body.name, startsAt: new Date(body.startsAt).toISOString(), bufferSec: body.bufferSec, restSec: body.restSec, moderatorId: body.moderatorId, state: "PAUSED", slots: [] });
      const result: ScheduleReceipt = { operationId: body.operationId, revision: state.workspace.revision, action: body.action, workspace: structuredClone(state.workspace) };
      state.receipts.set(body.operationId, result);
      if (state.loseSave) { state.loseSave = false; return route.abort(); }
      return route.fulfill({ json: result });
    }
    if (path.endsWith("/schedule")) { await state.hold; if (state.failed) return route.abort(); return route.fulfill({ json: state.empty ? { ...state.workspace, stages: [], sessions: [] } : state.workspace }); }
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} S13 keyboard queue, preview and confirmation at ${width}px`, async ({ page }) => {
    const state = await fixture(page, locale, width); const tr = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, locale);
    await page.goto("/app/admin/events/e/schedule");
    await page.getByRole("button", { name: tr("Schedule.generate"), exact: true }).click();
    const up = page.getByRole("button", { name: `${tr("Schedule.up")}: Second`, exact: true }); await up.focus(); await expect(up).toBeFocused(); await page.keyboard.press("Enter");
    await expect(page.locator(".schedule-ledger h3").first()).toHaveText("1. Second"); await expect(page.locator("#schedule-entry-p2")).toBeFocused();
    await page.locator("#destination-p3").selectOption(session2);
    await page.getByRole("combobox", { name: tr("Schedule.stage"), exact: true }).selectOption(stage); await expect(page).toHaveURL(new RegExp(`stage=${stage}`));
    await page.getByRole("combobox", { name: tr("Schedule.stage"), exact: true }).selectOption(""); await expect(page).not.toHaveURL(/stage=/);
    await page.getByLabel(tr("Schedule.session"), { exact: true }).selectOption(session2);
    await expect(page).toHaveURL(new RegExp(`session=${session2}`)); await expect(page.locator("#schedule-entry-p3")).toBeVisible();
    await page.getByRole("button", { name: tr("Schedule.preview"), exact: true }).click();
    await expect(page.locator("#schedule-preview-title")).toBeFocused();
    const save = page.getByRole("button", { name: tr("Schedule.save"), exact: true }); await expect(save).toBeDisabled();
    await page.getByLabel(tr("Schedule.confirm"), { exact: true }).check();
    await page.screenshot({ path: `.hallmark/shots/schedule-${locale}-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await save.click(); await expect(page.getByRole("status").filter({ hasText: tr("Schedule.saved") })).toBeVisible(); expect(state.saveCount).toBe(1);
    const command = ScheduleCommandSchema.parse(state.commands.at(-1)); expect(command.action).toBe("SAVE");
    expect(state.workspace.sessions.find(s => s.id === session2)?.slots[0]?.performanceId).toBe("p3");
  });
}

test("S13 conflicts block save and cancelling a preview preserves the draft", async ({ page }) => {
  const state = await fixture(page); state.conflict = true;
  await page.goto("/app/admin/events/e/schedule"); await page.getByRole("button", { name: "Generate remaining queue", exact: true }).click(); await page.getByRole("button", { name: "Validate preview", exact: true }).click();
  await expect(page.getByText("Shared dancer timing or rest conflict", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Close preview", exact: true }).click(); await expect(page.getByRole("button", { name: "Validate preview", exact: true })).toBeFocused();
  expect(state.saveCount).toBe(0); await expect(page.locator(".schedule-ledger h3")).toHaveCount(3);
});

test("S13 a second organizer tab invalidates the first tab's confirmed preview", async ({ page, context }) => {
  const state = await fixture(page);
  const path = "/app/admin/events/e/schedule";
  await page.goto(path);
  await page.getByRole("button", { name: "Generate remaining queue", exact: true }).click();
  await page.getByRole("button", { name: "Validate preview", exact: true }).click();
  await page.getByLabel("I confirm this queue and timing").check();

  const other = await context.newPage();
  await other.goto(path);
  await other.getByRole("button", { name: "Add to queue: Second", exact: true }).click();
  await other.getByRole("button", { name: "Validate preview", exact: true }).click();
  await other.getByLabel("I confirm this queue and timing").check();
  await other.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(other.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible();

  await page.getByRole("button", { name: "Save schedule", exact: true }).press("Enter");
  await expect(page.locator(".ui-error-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true })).toHaveCount(0);
  await expect(page.getByLabel("I confirm this queue and timing")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Validate preview", exact: true })).toBeDisabled();
  await expect(page.locator(".schedule-queue .schedule-ledger h3")).toHaveCount(3);
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click();
  await expect(page.locator(".schedule-comparison").getByText("Second", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validate preview", exact: true })).toBeDisabled();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: getTranslation("Schedule.useServer", "en"), exact: true }).click();
  await expect(page.locator("#schedule-entry-p2")).toHaveText("1. Second");
  await page.getByRole("button", { name: "Validate preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toBeDisabled();
  expect(state.saveCount).toBe(1);
  expect(state.commands).toHaveLength(2);
});

test("S13 uncertain save retains exact UUID and recovers one receipt", async ({ page }) => {
  const state = await fixture(page); state.loseSave = true;
  await page.goto("/app/admin/events/e/schedule"); await page.getByRole("button", { name: "Generate remaining queue", exact: true }).click(); await page.getByRole("button", { name: "Validate preview", exact: true }).click(); await page.getByLabel("I confirm this queue and timing").check(); await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByText(/The outcome is unconfirmed/)).toBeVisible(); await page.getByRole("button", { name: "Compare current server state", exact: true }).click();
  await expect(page.getByRole("button", { name: getTranslation("Schedule.useServer", "en"), exact: true })).toBeDisabled();
  state.workspace.revision++;
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible(); expect(state.saveCount).toBe(1); expect(state.commands[0]).toEqual(state.commands[1]);
  await expect(page.getByRole("button", { name: "Validate preview", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: getTranslation("Schedule.useServer", "en"), exact: true }).click();
  await expect(page.getByRole("button", { name: "Validate preview", exact: true })).toBeEnabled();
});

test("S13 loading, failed reads, empty setup and denied access remain explicit", async ({ page }) => {
  const state = await fixture(page); let release: () => void = () => {}; state.hold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/app/admin/events/e/schedule"); await expect(page.locator(".entry-loading")).toBeVisible(); state.failed = true; release();
  await expect(page.locator(".ui-error-summary")).toBeVisible(); state.failed = false; state.empty = true;
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await expect(page.getByText("Create a stage and session to begin scheduling.", { exact: true })).toBeVisible();
  state.deny = true; await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible();
});

test("S13 organizer creates explicit stage/session with localized validation and retained form", async ({ page }) => {
  const state = await fixture(page); state.workspace.stages = []; state.workspace.sessions = [];
  await page.goto("/app/admin/events/e/schedule"); await page.getByText("Add stage", { exact: true }).first().click();
  await page.locator("#stage-name").fill("Annex"); state.workspace.revision++;
  await page.getByRole("button", { name: "Add stage", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible();
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click();
  await page.getByRole("button", { name: getTranslation("Schedule.useServer", "en"), exact: true }).click(); await expect(page.locator("#stage-name")).toHaveValue("Annex");
  await page.getByRole("button", { name: "Add stage", exact: true }).click();
  await page.getByText("Add session", { exact: true }).first().click(); await page.locator("#session-new-name").fill("Late session"); await page.locator("#session-new-starts").fill("2026-12-05T15:00:00");
  await page.getByRole("button", { name: "Add session", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible(); await expect(page.locator("#session-new-name")).toHaveValue("Late session");
  await page.locator("#session-new-starts").fill("2026-12-05T15:00:00+02:00"); await page.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Late session", exact: true })).toBeVisible(); expect(state.workspace.sessions).toHaveLength(1);
});

test("S13 session restoration preserves the command and navigation protects unsaved queue edits", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/app/admin/events/e/schedule"); await page.getByRole("button", { name: "Generate remaining queue", exact: true }).click();
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("link", { name: "Event details", exact: true }).click();
  await expect(page).toHaveURL(/\/schedule/); await expect(page.locator(".schedule-ledger h3")).toHaveCount(3);
  await page.getByRole("button", { name: "Validate preview", exact: true }).click(); await page.getByLabel("I confirm this queue and timing").check(); state.expired = true;
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill("password123"); await page.getByRole("dialog").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(page.locator(".schedule-ledger h3")).toHaveCount(3);
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible(); expect(state.saveCount).toBe(1);
});
