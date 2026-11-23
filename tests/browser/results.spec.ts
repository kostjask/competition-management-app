import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  ResultsCommandSchema, ResultsSnapshotSchema, type ResultsCommand, type ResultsReceipt, type ResultsWorkspace,
} from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const path = "/app/admin/events/e/results";
const previewSource = "a".repeat(64);
const open = "b".repeat(64);
const youth = "c".repeat(64);
const at = "2026-11-21T10:00:00.000Z";
const group = {
  category: { id: "dance", name: "Open" }, ageGroup: { id: "age", name: "Adults" }, format: { id: "solo", name: "Solo" },
};

async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(language => localStorage.setItem("app-language", language), locale);
  const snapshot = ResultsSnapshotSchema.parse({
    policy: "normalized-v1", eventName: "Synthetic festival", timeZone: "Europe/Tallinn", ungrouped: [], blockers: [],
    groups: [
      { ...group, id: open, entries: [
        { performanceId: "first", title: "Paper & Light", rank: 1, total: "12.500" },
        { performanceId: "tie", title: "Second dance", rank: 1, total: "12.500" },
        { performanceId: "zero", title: "Zero score", rank: 3, total: "0.000" },
      ].map(entry => ({ ...entry, state: "RANKABLE", required: 2, submitted: 2, deduction: "0.000", calculationSource: previewSource })) },
      { ...group, id: youth, ageGroup: { id: "youth", name: "Youth" }, entries: [
        { performanceId: "youth", title: "Evening dance", rank: 1, total: "50.000", state: "RANKABLE", required: 2,
          submitted: 2, deduction: "0.000", calculationSource: previewSource },
      ] },
    ],
  });
  const workspace: ResultsWorkspace = {
    eventId: "e", eventName: snapshot.eventName, stage: "LIVE", current: { source: previewSource, snapshot },
    saved: null, revisions: [], finalized: null, receipt: null,
  };
  const state = {
    workspace, denied: false, failed: false, expired: false, lose: false, reject: false, hold: Promise.resolve(),
    commands: [] as ResultsCommand[], receipts: new Map<string, ResultsReceipt>(),
  };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/login")) {
      state.expired = false;
      return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "admin", name: "Organizer", email: "organizer@example.invalid" } } });
    }
    if (url.pathname.endsWith("/auth/profile")) {
      return route.fulfill({ json: { id: "admin", name: "Organizer", email: "organizer@example.invalid", isAdmin: true, roles: [], permissions: [], preferredLocale: null, createdAt: at } });
    }
    if (state.expired) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (state.denied) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] } });
    if (url.pathname.endsWith("/results/commands")) {
      const command = ResultsCommandSchema.parse(route.request().postDataJSON());
      state.commands.push(command);
      const previous = state.receipts.get(command.operationId);
      if (previous) return route.fulfill({ json: previous });
      if (state.reject || command.source !== workspace.current?.source || command.expectedRevision !== (workspace.revisions[0]?.revision ?? 0)) {
        return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] } });
      }
      const revision = command.expectedRevision + Number(command.action === "CALCULATE");
      const receipt = { action: command.action, operationId: command.operationId, revision, createdAt: at };
      state.receipts.set(command.operationId, receipt);
      if (command.action === "CALCULATE") {
        const summary = { revision, source: command.source, createdAt: at };
        workspace.revisions.unshift(summary);
        workspace.saved = { ...summary, snapshot: structuredClone(workspace.current.snapshot) };
      } else {
        workspace.stage = "FINALIZED";
        workspace.finalized = { revision, createdAt: receipt.createdAt };
        workspace.current = null;
      }
      if (state.lose) { state.lose = false; return route.abort(); }
      return route.fulfill({ json: receipt });
    }
    if (url.pathname.endsWith("/results")) {
      await state.hold;
      if (state.failed) return route.abort();
      return route.fulfill({ json: { ...workspace, receipt: state.receipts.get(url.searchParams.get("operationId") ?? "") ?? null } });
    }
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} ranking, review and final acknowledgement at ${width}px`, async ({ page }) => {
    const state = await fixture(page, locale, width);
    const tr = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, locale);
    await page.goto(path);
    await expect(page.getByRole("link", { name: tr("Setup.title") })).toHaveAttribute("href", "/app/admin/events/e/setup");
    const table = page.getByRole("table", { name: "Open / Adults / Solo" });
    await expect(table.getByRole("rowheader", { name: /Paper & Light/ })).toBeVisible();
    await expect(table.getByText(tr("Results.tie"), { exact: true })).toHaveCount(2);
    await expect(table.getByText(new Intl.NumberFormat(locale, { minimumFractionDigits: 3 }).format(0), { exact: true })).toBeVisible();
    const filter = page.getByLabel(tr("Results.group"), { exact: true });
    await filter.selectOption(youth);
    await expect(page).toHaveURL(new RegExp(`group=${youth}`));
    await expect(page.getByRole("table", { name: "Open / Youth / Solo" })).toBeVisible();
    await filter.selectOption(open);
    await page.getByRole("button", { name: tr("Results.save") }).click();
    const review = page.getByRole("button", { name: tr("Results.finalize") });
    await review.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#results-confirm-title")).toBeFocused();
    const confirm = page.getByRole("button", { name: tr("Results.confirm"), exact: true });
    expect(await confirm.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.querySelector(".results-table")!.getBoundingClientRect().right <= innerWidth)).toBe(true);
    if (process.env.RESULTS_VISUAL === "1") {
      await page.screenshot({ path: `.hallmark/shots/results-${locale}-${width}.png`, fullPage: true });
      if (locale === "en" && width === 1440) {
        const styles = (await page.locator("style").allTextContents()).join("\n");
        const markup = await page.locator(".results-workbench").evaluate(element => element.outerHTML);
        await writeFile(".hallmark/results-render.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Private results fixture</title><style>${styles}</style></head><body><main>${markup}</main></body></html>`, "utf8");
      }
    }
    await page.getByRole("button", { name: tr("Common.cancel"), exact: true }).click();
    await expect(review).toBeFocused();
    await review.click();
    await confirm.click();
    await expect(page.getByRole("status").filter({ hasText: tr("Results.finalized") })).toBeVisible();
    await expect(page.getByRole("button", { name: tr("Results.finalize") })).toHaveCount(0);
    await page.getByLabel(tr("Results.calculation"), { exact: true }).selectOption("1");
    await expect(page).toHaveURL(/revision=1/);
    await expect(table).toBeVisible();
    expect(state.commands.map(command => command.action)).toEqual(["CALCULATE", "FINALIZE"]);
  });
}

test("loading, read failure, incomplete sheets and revoked access retain truthful states", async ({ page }) => {
  const state = await fixture(page);
  const snapshot = state.workspace.current!.snapshot;
  snapshot.blockers.push({ kind: "SHEETS", performanceId: "first", title: "First dance" });
  Object.assign(snapshot.groups[0].entries[0], { title: "First dance <script>text</script>", rank: null, state: "PENDING", total: null, submitted: 1 });
  let release = () => {};
  state.hold = new Promise<void>(resolve => { release = resolve; });
  state.failed = true;
  await page.goto(path);
  await expect(page.locator(".entry-loading")).toBeVisible();
  release();
  await expect(page.locator(".ui-error-summary")).toBeVisible();
  state.failed = false;
  const refresh = page.getByRole("button", { name: "Refresh from server" });
  await refresh.click();
  await expect(page.getByRole("button", { name: "Save calculation" })).toBeDisabled();
  await expect(page.getByText("Submitted sheets 1/2")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /First dance <script>text<\/script>/ })).toBeVisible();
  await expect(page.getByText("Some required sheets are missing.")).toBeVisible();
  state.denied = true;
  await refresh.click();
  await expect(page.locator(".ui-error-summary")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("lost finalization acknowledgement is reconciled by its exact receipt", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(path);
  await page.getByRole("button", { name: "Save calculation" }).click();
  await page.getByRole("button", { name: "Review finalization" }).click();
  state.lose = true;
  await page.getByRole("button", { name: "Finalize revision" }).click();
  await expect(page.getByText("The change was not acknowledged.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Results finalized" })).toBeVisible();
  expect(state.commands).toHaveLength(2);
});

test("a stale command can be retried exactly or cleared after reading the changed source", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(path);
  await expect(page.getByRole("table")).toBeVisible();
  state.workspace.current!.source = "d".repeat(64);
  await page.getByRole("button", { name: "Save calculation" }).click();
  const refresh = page.getByRole("button", { name: "Refresh from server" });
  await refresh.click();
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click();
  expect(state.commands[0]).toEqual(state.commands[1]);
  await refresh.click();
  await page.getByRole("button", { name: "Use current server state" }).click();
  await page.getByRole("button", { name: "Save calculation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Calculation saved" })).toBeVisible();
  expect(state.commands[2].source).toBe("d".repeat(64));
  expect(state.commands[2].operationId).not.toBe(state.commands[0].operationId);
});

test("same-account session restoration retains the pending exact command", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(path);
  await expect(page.getByRole("table")).toBeVisible();
  state.expired = true;
  await page.getByRole("button", { name: "Save calculation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password", { exact: true }).fill("password123");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Calculation saved" })).toBeVisible();
  expect(state.commands).toHaveLength(1);
});
