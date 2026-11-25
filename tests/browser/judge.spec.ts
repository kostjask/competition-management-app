import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { JudgeScoringCommandSchema, JudgeScoringWorkspaceSchema, type JudgeScoringAck, type JudgeScoringCommand } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const id = (suffix: number) => `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const instant = "2026-12-05T08:00:00.000Z";
const labels = { et: "Tehnika", en: "Technique", ru: "Техника" };
const scorePath = "/app/judge/events/e/score";
const error = (reason: string) => ({ reason, params: {}, issues: [] });

async function capture(page: Page, file: string) {
  const { html, styles } = await page.evaluate(() => ({ html: document.body.innerHTML, styles: [...document.styleSheets].flatMap(sheet => {
    try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
  }).join("\n") }));
  await writeFile(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Judge score sheet</title><style>${styles}</style></head><body>${html}</body></html>`, "utf8");
}

test("a judge can add and clear an optional comment in Day mode", async ({ page }, info) => {
  const state = await fixture(page);
  await page.addInitScript(() => localStorage.setItem("workspace-appearance", "day"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await expect(score).toHaveCSS("color-scheme", "light");
  await score.fill("2.5");
  const saved = page.getByText(getTranslation("Judge.saved", "en"), { exact: true });
  await expect(saved).toBeVisible();
  await page.screenshot({ path: info.outputPath("judge-day.png"), fullPage: true });
  const comment = page.getByLabel(getTranslation("Judge.comment", "en", { criterion: "Technique" }), { exact: true });
  await expect(comment).toBeHidden();
  await page.getByText("Comment (optional)", { exact: true }).click();
  await comment.fill("Clear timing.");
  await expect.poll(() => state.commands.at(-1)?.values[0]?.comment).toBe("Clear timing.");
  await expect(saved).toBeVisible();
  await comment.fill("");
  await expect(comment).toBeFocused();
  await expect(comment).toBeEditable();
  await expect.poll(() => state.commands.at(-1)?.values[0]?.comment).toBeFalsy();
  await expect(saved).toBeVisible();
  await expect(score).toHaveValue("2.5");
});

async function fixture(page: Page, locale: Locale = "en") {
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const workspace = JudgeScoringWorkspaceSchema.parse({ eventId: "e", eventName: "Winter competition", acknowledgement: null, sheets: [{
    id: id(1), performanceId: "first", title: "First performance", sessionName: "Morning", stageName: "Main",
    state: "DRAFT", revision: 1, current: true, writable: true, reopenReason: null, savedAt: instant, submittedAt: null, values: [],
    rubric: { id: id(2), name: "Open rubric", criteria: [{ id: id(3), label: labels,
      instructions: { en: "Evaluate timing.", et: "Hinda ajastust.", ru: "Оцените чувство ритма." }, min: "0", max: "10", step: "0.5", weightBps: 10000 }] },
  }] });
  const state = { workspace, reads: [] as Array<string | null>, commands: [] as JudgeScoringCommand[], acks: new Map<string, JudgeScoringAck>(),
    lose: "none" as "none" | "before" | "after", denied: false, expired: false, expireOnWrite: false, denyAfterWrite: false };
  const user = { id: "judge-user", name: "Event judge", email: "judge@example.invalid" };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/profile")) return route.fulfill({ json: { ...user, createdAt: instant, isAdmin: true,
      preferredLocale: null, roles: [{ id: "assignment", eventId: "e", role: { id: "judge", key: "judge", name: "Judge" }, event: { id: "e", name: workspace.eventName } }], permissions: [] } });
    if (url.pathname.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user } }); }
    if (state.denied) return route.fulfill({ status: 403, json: error("permissionDenied") });
    if (state.expired) return route.fulfill({ status: 401, json: error("authenticationRequired") });
    if (url.pathname.endsWith("/scoring/judge")) {
      const op = url.searchParams.get("operationId"); state.reads.push(op);
      return route.fulfill({ json: { ...workspace, acknowledgement: op ? state.acks.get(op) ?? null : null } });
    }
    if (url.pathname.endsWith("/scoring/commands")) {
      const command = JudgeScoringCommandSchema.parse(route.request().postDataJSON()); state.commands.push(command);
      if (state.denyAfterWrite) { state.denied = true; return route.abort(); }
      if (state.expireOnWrite) { state.expired = true; state.expireOnWrite = false; return route.fulfill({ status: 401, json: error("authenticationRequired") }); }
      if (state.lose === "before") { state.lose = "none"; return route.abort(); }
      const sheet = workspace.sheets.find(row => row.id === command.sheetId);
      if (!sheet?.writable || sheet.revision !== command.expectedRevision) return route.fulfill({ status: 409, json: error("concurrentChange") });
      sheet.revision++;
      sheet.values = command.values;
      if (command.action === "SUBMIT") { sheet.state = "LOCKED"; sheet.submittedAt = instant; sheet.writable = false; }
      const ack = { operationId: command.operationId, action: command.action, sheetId: sheet.id, revision: sheet.revision, createdAt: instant };
      state.acks.set(ack.operationId, ack);
      if (state.lose === "after") { state.lose = "none"; return route.abort(); }
      const { id: sheetId, performanceId, title, revision, state: sheetState, values, submittedAt, rubric } = sheet;
      return route.fulfill({ json: { operationId: command.operationId, action: command.action, revision: 1, calculation: null, workspace: {
        eventId: "e", eventName: workspace.eventName, eventStage: "LIVE", organizer: false, revision: 1, setup: { templates: [rubric], bindings: [], panels: [] },
        categories: [], sessions: [], judges: [], blockers: [], completion: [], receipts: [], sheets: [{ id: sheetId, performanceId, title, revision,
          state: sheetState, values, submittedAt, recordId: id(4), judgeId: "private-judge", templateId: rubric.id }],
      } } });
    }
    return route.fulfill({ status: 404, json: error("recordNotFound") });
  });
  return state;
}

for (const [locale, width] of [["et", 320], ["en", 390], ["ru", 768], ["en", 1440], ["ru", 1920]] as const) {
  test(`judge scores and locks in ${locale} at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/app/judge");
    await page.getByRole("link", { name: "Winter competition", exact: true }).click();
    const score = page.getByRole("textbox", { name: labels[locale], exact: true });
    const review = page.getByRole("button", { name: getTranslation("Judge.review", locale), exact: true });
    await expect(score).toBeEditable();
    await expect(score).toHaveCSS("color-scheme", "dark");
    await expect(score).toHaveAttribute("inputmode", "decimal");
    expect((await score.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    if (width <= 390) {
      const bounds = await score.boundingBox();
      expect(bounds ? bounds.y + bounds.height : 844).toBeLessThan(560);
      await expect(page.getByLabel(getTranslation("Judge.comment", locale, { criterion: labels[locale] }), { exact: true })).toBeHidden();
    }
    await expect(review).toBeDisabled();
    await score.fill("0,1");
    await expect(score).toHaveAttribute("aria-invalid", "true");
    expect(state.commands).toHaveLength(0);
    await score.fill("0");
    await expect(page.getByText(getTranslation("Judge.saved", locale), { exact: true })).toBeVisible();
    await expect(score).toHaveValue("0");
    expect(state.commands[0]?.values[0]?.value).toBe("0.000");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (locale === "en") await page.screenshot({ path: info.outputPath("judge-sheet.png"), fullPage: true });
    if (process.env.JUDGE_HALLMARK_CAPTURE === "1" && locale === "en" && width === 1440) {
      await capture(page, ".hallmark/judge-render.html");
    }
    await review.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: getTranslation("Judge.confirmTitle", locale) })).toBeFocused();
    await page.getByRole("button", { name: getTranslation("Judge.cancel", locale) }).click();
    await expect(review).toBeFocused();
    await review.click(); await page.getByRole("button", { name: getTranslation("Judge.submit", locale) }).click();
    await expect(page.getByText(getTranslation("Judge.locked", locale), { exact: true })).toBeVisible();
    expect(state.commands.map(command => command.action)).toEqual(["DRAFT", "SUBMIT"]);
    await page.reload(); await expect(score).toHaveValue("0"); await expect(score).not.toBeEditable();
    const handoff = page.getByRole("status").getByText(getTranslation("Judge.interruptionHelp", locale), { exact: true });
    await expect(handoff).toHaveCount(0);
    await page.context().setOffline(true);
    await expect(handoff).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.LIVE_INTERRUPTION_CAPTURE === "1" && locale === "en" && width === 390) {
      await capture(page, ".hallmark/judge-interruption.html");
    }
  });
}

test("lost response after submit reads the actor receipt and never resubmits", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(scorePath);
  await page.getByRole("textbox", { name: "Technique", exact: true }).fill("2.5");
  await expect(page.getByText("Draft saved to the server", { exact: true })).toBeVisible();
  state.lose = "after";
  await page.getByRole("button", { name: "Review scores" }).click();
  await page.getByRole("button", { name: "Submit and lock sheet" }).click();
  await expect(page.getByText("Submitted and locked", { exact: true })).toBeVisible();
  expect(state.reads).toContain(state.commands[1]?.operationId);
  expect(state.commands).toHaveLength(2);
});

test("only retries a lost uncommitted draft with the same body after reading", async ({ page }) => {
  const state = await fixture(page);
  state.lose = "before";
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await score.fill("3");
  const retry = page.getByRole("button", { name: "Retry the same operation" });
  await expect(retry).toBeVisible();
  expect(state.reads).toContain(state.commands[0]?.operationId);
  expect(state.commands).toHaveLength(1);
  await expect(score).toHaveValue("3");
  await retry.click();
  await expect(page.getByText("Draft saved to the server", { exact: true })).toBeVisible();
  expect(state.commands).toHaveLength(2);
  expect(state.commands[1]).toEqual(state.commands[0]);
});

test("offline drafts stay pinned when the stage advances and must be resolved before switching", async ({ page, context }) => {
  const state = await fixture(page);
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await score.fill("1,1");
  await context.setOffline(true);
  await expect(page.getByText("Offline. Editing and submission are paused.")).toBeVisible();
  const help = page.getByRole("status").getByText(getTranslation("Judge.interruptionHelp", "en"), { exact: true });
  await expect(help).toBeVisible();
  await expect(score).not.toBeEditable();
  const first = state.workspace.sheets[0];
  first.writable = false; first.current = false;
  state.workspace.sheets.push({ ...first, id: id(5), title: "Second performance", performanceId: "second", current: true, writable: true });
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "First performance" })).toBeVisible();
  await expect(score).toHaveValue("1,1");
  await page.getByRole("button", { name: "Compare with the server" }).click();
  await expect(help).toHaveCount(0);
  await expect(page.getByText("Server score blank, my score 1,1")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Use the server version" }).click();
  await expect(page.getByRole("heading", { name: "Second performance" })).toBeFocused();
  await expect(score).toHaveValue("");
  expect(state.commands).toHaveLength(0);
});

test("restored session compares a newer draft and only reapplies after explicit choice", async ({ page }) => {
  const state = await fixture(page);
  state.expireOnWrite = true;
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await score.fill("3");
  const login = page.getByRole("dialog");
  await expect(login).toBeVisible();
  state.workspace.sheets[0].revision = 2;
  state.workspace.sheets[0].values = [{ criterionId: id(3), value: "4.000", comment: "Another tab" }];
  await login.getByLabel("Password", { exact: true }).fill("example-password");
  await login.getByRole("button", { name: "Sign in" }).click();
  await expect(login).toBeHidden();
  await page.getByRole("button", { name: "Compare with the server" }).click();
  await expect(page.getByText("Server score 4, my score 3")).toBeVisible();
  await expect(page.getByText("Server comment Another tab, my comment blank")).toBeVisible();
  expect(state.commands).toHaveLength(1);
  await page.getByRole("button", { name: "Use my whole draft" }).click();
  await expect(page.getByText("Draft saved to the server", { exact: true })).toBeVisible();
  expect(state.commands[1]?.expectedRevision).toBe(2);
  expect(state.commands[1]?.operationId).not.toBe(state.commands[0]?.operationId);
});

test("shows a reopened correction and clears private data when authority is removed", async ({ page }) => {
  const state = await fixture(page);
  const sheet = state.workspace.sheets[0];
  sheet.current = false; sheet.revision = 4; sheet.reopenReason = "Correct the timing criterion";
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await expect(page.getByText("Reason for reopening: Correct the timing criterion")).toBeVisible();
  await expect(score).toBeEditable();
  state.denied = true;
  await page.getByRole("button", { name: "Check server state" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(score).toHaveCount(0);
  expect(state.commands).toHaveLength(0);
});

test("access revocation discards a pending score and its draft even if access later returns", async ({ page }) => {
  const state = await fixture(page);
  state.denyAfterWrite = true;
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await score.fill("3");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(score).toHaveCount(0);
  state.denied = false;
  state.denyAfterWrite = false;
  await page.getByRole("button", { name: "Check server state" }).click();
  await expect(score).toBeEditable();
  await expect(score).toHaveValue("");
  await expect(page.getByRole("button", { name: "Retry the same operation" })).toHaveCount(0);
  expect(state.reads.at(-1)).toBe(null);
  expect(state.commands).toHaveLength(1);
});

test("waiting read can reveal a newly assigned sheet", async ({ page }) => {
  const state = await fixture(page);
  const sheet = state.workspace.sheets.pop();
  await page.goto(scorePath);
  await expect(page.getByRole("heading", { name: "Waiting for a score sheet" })).toBeVisible();
  if (!sheet) throw new Error("Fixture requires an assigned sheet");
  state.workspace.sheets.push(sheet);
  await page.getByRole("button", { name: "Check server state" }).click();
  await expect(page.getByRole("heading", { name: "First performance" })).toBeFocused();
});

test("another stage starting does not move focus from a current assigned sheet", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(scorePath);
  const score = page.getByRole("textbox", { name: "Technique", exact: true });
  await expect(score).toBeEditable();
  await score.focus();
  state.workspace.sheets.push({ ...state.workspace.sheets[0], id: id(6), title: "Parallel performance", stageName: "Second stage",
    performanceId: "parallel", savedAt: "2026-12-05T08:01:00.000Z" });
  const picker = page.getByRole("combobox", { name: "Score sheet" });
  await expect(picker.getByRole("option", { name: /Parallel performance.*Second stage/ })).toHaveCount(1, { timeout: 8000 });
  await expect(picker).toHaveValue(id(1));
  await expect(page.getByRole("heading", { name: "First performance" })).toBeVisible();
  await expect(score).toBeFocused();
  await picker.selectOption(id(6));
  await expect(page.getByRole("heading", { name: "Parallel performance" })).toBeFocused();
});
