import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  LiveScheduleWorkspaceSchema, ScheduleCommandSchema, ScoringCommandSchema,
  type LiveScheduleAcknowledgement, type LiveScheduleCommand,
} from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const id = (number: number) => "00000000-0000-4000-8000-" + String(number).padStart(12, "0");
const instant = "2026-12-05T08:00:00.000Z";
const sessionId = id(1);
const firstSlot = id(3);
const secondSlot = id(4);
const sheetId = id(5);
const livePath = "/app/moderator/events/e/live?session=" + sessionId;
const adminPath = "/app/admin/events/e/live?session=" + sessionId;
const error = (reason: string) => ({ reason, params: {}, issues: [] });

async function capture(page: Page, file: string) {
  const { html, styles } = await page.evaluate(() => {
    const body = document.body.cloneNode(true);
    if (!(body instanceof HTMLBodyElement)) throw new Error("Expected a captured document body");
    const selects = body.querySelectorAll("select");
    document.querySelectorAll("select").forEach((select, index) => {
      selects[index]?.querySelectorAll("option").forEach((option, position) => {
        option.toggleAttribute("selected", !!select.options[position]?.selected);
      });
    });
    return { html: body.innerHTML, styles: [...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
    }).join("\n") };
  });
  await writeFile(file, '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Live console</title><style>' +
    styles + "</style></head><body>" + html + "</body></html>", "utf8");
}

async function fixture(page: Page, locale: Locale = "en", organizer = false) {
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const main = { id: sessionId, stageName: "Main stage", name: "Morning session", startsAt: instant };
  const other = { id: id(2), stageName: "Studio stage", name: "Afternoon session", startsAt: "2026-12-05T12:00:00.000Z" };
  const next = { slotId: secondSlot, position: 2, title: "Second performance", studioName: "Second studio" };
  const current = { slotId: firstSlot, position: 1, title: "First performance", studioName: "First studio",
    completion: { locked: 1, required: 2, unavailable: 0 } };
  const workspace = LiveScheduleWorkspaceSchema.parse({
    eventId: "e", eventName: "Winter competition", eventStage: "LIVE", timeZone: "Europe/Tallinn", revision: 4,
    organizer, scoringReady: true, acknowledgement: null, sessions: [main, other],
    session: { ...main, state: "RUNNING", hasQueue: true, current, next, following: [
      { slotId: id(6), position: 3, title: "Third performance", studioName: "Third studio" },
    ], skipped: [], correctionSheets: [] },
  });
  const session = workspace.session!;
  const state = {
    workspace, session, commands: [] as LiveScheduleCommand[], operations: new Map<string, LiveScheduleAcknowledgement>(),
    reads: [] as Array<string | null>, lose: "none" as "none" | "before" | "after" | "race", denied: false,
    expired: false, expireOnWrite: false, denyAfterWrite: false, readFailure: false, corrections: [] as string[],
  };
  const user = { id: "operator", name: "Event operator", email: "operator@example.invalid" };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/profile")) return route.fulfill({ json: {
      ...user, createdAt: instant, isAdmin: organizer, preferredLocale: null, permissions: [],
      roles: [{ id: "assignment", eventId: "e", role: { id: "moderator", key: "moderator", name: "Moderator" }, event: { id: "e", name: workspace.eventName } }],
    } });
    if (url.pathname.endsWith("/auth/login")) {
      state.expired = false;
      return route.fulfill({ json: { user, session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z" } });
    }
    if (state.expired) return route.fulfill({ status: 401, json: error("authenticationRequired") });
    if (state.denied) return route.fulfill({ status: 403, json: error("permissionDenied") });
    if (url.pathname.endsWith("/schedule/live")) {
      const op = url.searchParams.get("operationId");
      state.reads.push(op);
      if (state.readFailure) return route.abort();
      const selected = url.searchParams.get("sessionId");
      if (selected && selected !== main.id && selected !== other.id) return route.fulfill({ status: 403, json: error("permissionDenied") });
      if (selected === other.id) return route.fulfill({ json: {
        ...workspace, session: { ...other, state: "PAUSED", hasQueue: false, current: null, next: null, following: [], skipped: [], correctionSheets: [] },
      } });
      return route.fulfill({ json: { ...workspace, acknowledgement: op ? state.operations.get(op) ?? null : null } });
    }
    if (url.pathname.endsWith("/schedule/commands")) {
      const command = ScheduleCommandSchema.parse(route.request().postDataJSON());
      if (!("sessionId" in command)) throw new Error("Expected a live command");
      state.commands.push(command);
      if (state.denyAfterWrite) {
        state.denied = true;
        return route.abort();
      }
      if (state.expireOnWrite) {
        state.expireOnWrite = false;
        state.expired = true;
        return route.fulfill({ status: 401, json: error("authenticationRequired") });
      }
      if (state.lose === "before") { state.lose = "none"; return route.abort(); }
      if (state.lose === "race") {
        state.lose = "none"; workspace.revision++; session.state = "PAUSED";
        return route.abort();
      }
      const { expectedSlotId, operationId, action } = command;
      if (command.sessionId !== session.id || command.expectedRevision !== workspace.revision || expectedSlotId !== (session.current?.slotId ?? null)) {
        return route.fulfill({ status: 409, json: error("concurrentChange") });
      }
      if (action === "PAUSE" || action === "REOPEN") session.state = "PAUSED";
      if (action === "START") {
        session.state = "RUNNING";
        if (!session.current && session.next) {
          session.current = { ...session.next, completion: { locked: 0, required: 2, unavailable: 0 } };
          session.next = session.following.shift() ?? null;
        }
      }
      if (action === "ADVANCE" && session.next) {
        session.current = { ...session.next, completion: { locked: 0, required: 2, unavailable: 0 } };
        session.next = session.following.shift() ?? null;
      }
      if (action === "SKIP" && session.current) {
        const { completion: _completion, ...skipped } = session.current;
        session.skipped.push(skipped);
        session.current = null; session.state = "PAUSED";
      }
      if (action === "REQUEUE") session.skipped = session.skipped.filter(slot => slot.slotId !== command.targetSlotId);
      const revision = ++workspace.revision;
      const live = { sessionId, expectedSlotId, ...("targetSlotId" in command && { targetSlotId: command.targetSlotId }) };
      state.operations.set(operationId, { kind: "schedule", action, operationId, revision, createdAt: instant, ...live });
      if (state.lose === "after") { state.lose = "none"; return route.abort(); }
      return route.fulfill({ json: { operationId, action, revision, live, workspace: {
        eventId: "e", eventName: workspace.eventName, eventStage: "LIVE", timeZone: workspace.timeZone,
        organizer, revision, stages: [], sessions: [], performances: [], moderators: [], receipts: [],
      } } });
    }
    if (url.pathname.endsWith("/scoring/commands")) {
      const command = ScoringCommandSchema.parse(route.request().postDataJSON());
      const sheet = session.correctionSheets[0];
      if (!organizer || command.action !== "REOPEN" || sheet?.id !== command.sheetId || sheet.revision !== command.expectedRevision) {
        return route.fulfill({ status: 409, json: error("concurrentChange") });
      }
      state.corrections.push(command.sheetId);
      sheet.state = "DRAFT"; sheet.revision++;
      if (session.current?.completion) session.current.completion.locked--;
      state.operations.set(command.operationId, { kind: "sheet", action: "REOPEN", operationId: command.operationId, sheetId, sessionId, revision: sheet.revision, createdAt: instant });
      return route.abort();
    }
    return route.fulfill({ status: 404, json: error("recordNotFound") });
  });
  return state;
}

for (const [locale, width] of [["et", 320], ["en", 390], ["ru", 768], ["en", 1440], ["ru", 1920]] as const) {
  test("assigned moderator operates the queue in " + locale + " at " + width + "px", async ({ page }) => {
    const state = await fixture(page, locale);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app/moderator");
    await page.getByRole("link", { name: "Winter competition", exact: true }).click();
    await expect(page).toHaveURL(livePath);
    const current = page.getByRole("region", { name: getTranslation("Moderator.current", locale) });
    await expect(current.getByText("First performance")).toBeVisible();
    await expect(current.getByText(getTranslation("Moderator.completion", locale, { locked: "1", required: "2" }))).toBeVisible();
    await expect(page.getByRole("button", { name: getTranslation("Moderator.ADVANCE", locale), exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: getTranslation("Moderator.ADVANCE_OVERRIDE", locale), exact: true })).toHaveCount(0);
    const pause = page.getByRole("button", { name: getTranslation("Moderator.PAUSE", locale), exact: true });
    await expect(pause).toBeEnabled();
    const pauseBounds = await pause.boundingBox();
    expect(pauseBounds?.height).toBeGreaterThanOrEqual(48);
    if (width === 390 && pauseBounds) expect(pauseBounds.y + pauseBounds.height).toBeLessThanOrEqual(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const later = page.getByRole("region", { name: getTranslation("Moderator.upcoming", locale) });
    if (width >= 768) await expect(later.getByText("Third performance")).toBeVisible();
    else await expect(later).toHaveCount(0);
    if (process.env.MODERATOR_HALLMARK_CAPTURE === "1" && locale === "en" && width === 1440) {
      await capture(page, ".hallmark/moderator-render.html");
    }
    await pause.focus(); await page.keyboard.press("Enter");
    const resume = page.getByRole("button", { name: getTranslation("Moderator.resume", locale), exact: true });
    await expect(resume).toBeEnabled();
    expect(state.commands[0]).toMatchObject({ sessionId, expectedRevision: 4, expectedSlotId: firstSlot, action: "PAUSE" });
    await expect(current.getByText("First performance")).toBeVisible();
    await resume.click();
    await expect(pause).toBeEnabled();
    expect(state.commands.map(command => command.action)).toEqual(["PAUSE", "START"]);
    const handoff = page.getByRole("status").getByText(getTranslation("Moderator.interruptionHelp", locale), { exact: true });
    await expect(handoff).toHaveCount(0);
    await page.context().setOffline(true);
    await expect(handoff).toBeVisible();
    await expect(pause).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.LIVE_INTERRUPTION_CAPTURE === "1" && locale === "en" && width === 390) {
      await capture(page, ".hallmark/moderator-interruption.html");
    }
  });
}

test("a lost committed advance is acknowledged with the original operation and double activation sends once", async ({ page }) => {
  const state = await fixture(page);
  state.session.current!.completion!.locked = 2;
  state.lose = "after";
  await page.goto(livePath);
  const advance = page.getByRole("button", { name: "Advance", exact: true });
  await expect(advance).toBeEnabled();
  await advance.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByText(/^Server acknowledged Advance at revision 5/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Current performance" }).getByText("Second performance")).toBeVisible();
  expect(state.commands).toHaveLength(1);
  expect(state.reads).toContain(state.commands[0]?.operationId);
});

test("an uncommitted write offers an exact retry after a fresh read", async ({ page }) => {
  const state = await fixture(page);
  state.lose = "before";
  await page.goto(livePath);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const retry = page.getByRole("button", { name: "Retry the same action" });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue from current state" })).toBeVisible();
  expect(state.reads).toContain(state.commands[0]?.operationId);
  await retry.click();
  await expect(page.getByText(/^Server acknowledged Pause/)).toBeVisible();
  expect(state.commands).toHaveLength(2);
  expect(state.commands[1]).toEqual(state.commands[0]);
});

test("a competing change requires explicit review and a new operation", async ({ page }) => {
  const state = await fixture(page);
  state.lose = "race";
  await page.goto(livePath);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText(/^No matching acknowledgement was found/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry the same action" })).toHaveCount(0);
  const resume = page.getByRole("button", { name: "Resume queue" });
  await expect(resume).toBeDisabled();
  await page.getByRole("button", { name: "Continue from current state" }).click();
  await resume.click();
  await expect(page.getByText(/^Server acknowledged Start queue/)).toBeVisible();
  expect(state.commands[1]?.operationId).not.toBe(state.commands[0]?.operationId);
  expect(state.commands[1]).toMatchObject({ expectedRevision: 5, expectedSlotId: firstSlot });
});

test("offline and failed reads disable controls, and reassignment clears private content and handoff", async ({ page, context }) => {
  const state = await fixture(page);
  await page.goto(livePath);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  const help = page.getByRole("status").getByText(getTranslation("Moderator.interruptionHelp", "en"), { exact: true });
  await expect(pause).toBeEnabled();
  await context.setOffline(true);
  await expect(page.getByText("Offline. Controls are disabled.")).toBeVisible();
  await expect(help).toBeVisible();
  await expect(pause).toBeDisabled();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "Stage handoff" })).toBeVisible();
  await expect(page.getByText(/^Last read of revision 4/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip performance" })).toHaveCount(0);
  await page.emulateMedia({ media: "screen" });
  let releaseRead = () => {};
  const holdRead = new Promise<void>(resolve => { releaseRead = resolve; });
  await page.route("**/schedule/live?*", async route => {
    await holdRead;
    await route.fallback();
  }, { times: 1 });
  await context.setOffline(false);
  await expect(page.getByText("Live data may be stale. Controls are disabled.")).toBeVisible();
  await expect(help).toBeVisible();
  await expect(pause).toBeDisabled();
  releaseRead();
  await expect(pause).toBeEnabled();
  await expect(help).toHaveCount(0);
  state.readFailure = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(help).toBeVisible();
  await expect(pause).toBeDisabled();
  state.readFailure = false; state.denied = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose an available session" })).toBeVisible();
  await expect(page.getByText("First performance")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print handoff" })).toHaveCount(0);
  await expect(help).toHaveCount(0);
  expect(state.commands).toHaveLength(0);
});

test("access revocation discards an outstanding stage action even if access later returns", async ({ page }) => {
  const state = await fixture(page, "en", true);
  state.session.current!.completion!.locked = 2;
  state.denyAfterWrite = true;
  await page.goto(adminPath);
  const advance = page.getByRole("button", { name: "Advance", exact: true });
  await advance.click();
  const refresh = page.getByRole("button", { name: getTranslation("Moderator.refresh", "en"), exact: true });
  await expect(page.locator(".ui-tone-danger").getByRole("alert")).toBeVisible();
  await expect(page.getByText("First performance", { exact: true })).toHaveCount(0);
  state.denied = false;
  state.denyAfterWrite = false;
  await refresh.click();
  await expect(advance).toBeEnabled();
  await expect(page.getByRole("button", { name: getTranslation("Moderator.retrySame", "en"), exact: true })).toHaveCount(0);
  expect(state.reads.at(-1)).toBe(null);
  expect(state.commands).toHaveLength(1);
});

test("session recovery retains the exact outstanding command", async ({ page }) => {
  const state = await fixture(page);
  state.expireOnWrite = true;
  await page.goto(livePath);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Password").fill("synthetic-password");
  await dialog.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Retry the same action" }).click();
  await expect(page.getByText(/^Server acknowledged Pause/)).toBeVisible();
  expect(state.commands[0]).toEqual(state.commands[1]);
});

test("skip requires reason and cancellation restores focus, with organizer requeue separately confirmed", async ({ page }) => {
  const state = await fixture(page, "en", true);
  await page.goto(adminPath);
  const skip = page.getByRole("button", { name: "Skip performance", exact: true });
  await skip.click();
  const reason = page.getByRole("textbox", { name: "Reason" });
  await expect(reason).toBeFocused();
  await expect(page.getByRole("button", { name: getTranslation("Setup.confirm", "en"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(skip).toBeFocused();
  expect(state.commands).toHaveLength(0);
  await skip.click(); await reason.fill("Waiting for a safe stage");
  await page.getByRole("button", { name: getTranslation("Setup.confirm", "en"), exact: true }).click();
  await expect(page.getByText(/^Server acknowledged Skip performance/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Current performance" }).getByText("No performance is current.")).toBeVisible();
  await page.getByRole("button", { name: getTranslation("Moderator.REQUEUE", "en"), exact: true }).click();
  await page.getByRole("combobox", { name: "Item to correct" }).selectOption(firstSlot);
  await reason.fill("Stage is clear");
  await page.getByRole("button", { name: getTranslation("Setup.confirm", "en"), exact: true }).click();
  await expect(page.getByText(/^Server acknowledged Requeue skipped entry/)).toBeVisible();
  expect(state.commands[0]).toMatchObject({ action: "SKIP", reason: "Waiting for a safe stage", expectedSlotId: firstSlot });
  expect(state.commands[1]).toMatchObject({ action: "REQUEUE", targetSlotId: firstSlot, expectedSlotId: null });
});

test("organizer sheet correction reads its own acknowledgement after a lost response", async ({ page }) => {
  const state = await fixture(page, "en", true);
  state.session.state = "PAUSED";
  state.session.correctionSheets.push({
    id: sheetId, revision: 2, performance: { slotId: firstSlot, position: 1, title: "First performance", studioName: "First studio" },
    judgeName: "Assigned judge", state: "LOCKED",
  });
  await page.goto(adminPath);
  const reopen = page.getByRole("button", { name: "Reopen judge sheet", exact: true });
  await expect(reopen).toBeEnabled();
  if (process.env.MODERATOR_HALLMARK_CAPTURE === "1") await capture(page, ".hallmark/moderator-admin-render.html");
  await reopen.click();
  await page.getByRole("combobox", { name: "Item to correct" }).selectOption(sheetId);
  await page.getByRole("textbox", { name: "Reason" }).fill("Correct judging input");
  if (process.env.MODERATOR_HALLMARK_CAPTURE === "1") await capture(page, ".hallmark/moderator-exception-render.html");
  await page.getByRole("button", { name: getTranslation("Setup.confirm", "en"), exact: true }).click();
  await expect(page.getByText(/^Server acknowledged Reopen judge sheet at revision 3/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Current performance" }).getByText("Locked judge sheets 0/2")).toBeVisible();
  expect(state.corrections).toEqual([sheetId]);

  await page.getByRole("button", { name: "Reopen judge sheet", exact: true }).click();
  await expect(page.getByRole("option", { name: /Assigned judge/ })).toHaveCount(1);
  state.workspace.organizer = false;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose an available session" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Assigned judge/ })).toHaveCount(0);
});

test("session switching keeps authority and identity in the URL", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(livePath);
  const select = page.getByRole("combobox", { name: "Stage and session" });
  await select.selectOption(id(2));
  await expect(page).toHaveURL("/app/moderator/events/e/live?session=" + id(2));
  await expect(page.getByText("This session has no scheduled performances.")).toBeVisible();
  await expect(select).toBeFocused();
  await expect(page.getByRole("button", { name: "Start queue" })).toBeDisabled();
  await expect(page.getByText("First performance")).toHaveCount(0);
  expect(state.commands).toHaveLength(0);
});
