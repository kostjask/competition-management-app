import { test, expect, type Page } from "@playwright/test";
import { ScoringWorkspaceSchema, ScoringCommandSchema, ScoringPreviewBodySchema, type ScoringWorkspace } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";
import { writeFile } from "node:fs/promises";
const session = "00000000-0000-4000-8000-000000000001";
const instant = "2026-12-05T08:00:00.000Z";
async function fixture(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 }); await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const workspace: ScoringWorkspace = ScoringWorkspaceSchema.parse({ eventId: "e", eventName: "Synthetic competition", eventStage: "DATA_REVIEW", revision: 0, organizer: true,
    setup: { templates: [], bindings: [], panels: [] }, categories: [{ id: "category", name: "Open" }], sessions: [{ id: session, name: "Morning", state: "PAUSED" }], judges: [{ id: "judge", name: "Synthetic judge", eligible: true }],
    blockers: [{ kind: "TEMPLATE", targetId: "category" }, { kind: "PANEL", targetId: session }], sheets: [], completion: [], receipts: [] });
  const state = { workspace, failed: false, denied: false, admin: true, lose: false, expired: false, saves: 0, hold: Promise.resolve(), commands: [] as unknown[], receipts: new Map<string, unknown>() };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { state.expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "admin", name: "Synthetic organizer", email: "organizer@example.invalid" } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: { id: "admin", name: "Synthetic organizer", email: "organizer@example.invalid", isAdmin: state.admin, roles: [], permissions: [], preferredLocale: null, createdAt: instant } });
    if (state.expired) return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } });
    if (state.denied) return route.fulfill({ status: 403, json: { code: "FORBIDDEN", reason: "permissionDenied", params: {}, issues: [] } });
    if (path.endsWith("/scoring/preview")) { const body = ScoringPreviewBodySchema.parse(route.request().postDataJSON()); return route.fulfill({ json: { revision: body.expectedRevision, setup: body.setup, previewToken: "a".repeat(64), blockers: [] } }); }
    if (path.endsWith("/scoring/commands")) {
      const body = ScoringCommandSchema.parse(route.request().postDataJSON()); state.commands.push(body); const replay = state.receipts.get(body.operationId); if (replay) return route.fulfill({ json: replay });
      if (body.expectedRevision !== state.workspace.revision) return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] } });
      if (body.action !== "CONFIGURE") throw new Error("Unexpected fixture operation");
      state.workspace.revision++; state.workspace.setup = body.setup; state.workspace.blockers = []; state.saves++;
      state.workspace.receipts.unshift({ operationId: body.operationId, revision: state.workspace.revision, action: body.action, createdAt: instant });
      const result = { operationId: body.operationId, revision: state.workspace.revision, action: body.action, workspace: structuredClone(state.workspace), calculation: null }; state.receipts.set(body.operationId, result);
      if (state.lose) { state.lose = false; return route.abort(); } return route.fulfill({ json: result });
    }
    if (path.endsWith("/scoring")) { await state.hold; if (state.failed) return route.abort(); return route.fulfill({ json: state.workspace }); }
    return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
  }); return state;
}
async function fillRubric(page: Page, locale: Locale = "en") {
  const tr = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, locale);
  await page.getByRole("button", { name: tr("Scoring.newVersion"), exact: true }).click(); await page.getByLabel(tr("Scoring.name"), { exact: true }).fill("Synthetic rubric <script>literal</script>");
  for (const language of ["et", "en", "ru"]) {
    const input = page.locator(`.scoring-editor input[id^='label-'][id$='-${language}']`);
    if (!await input.isVisible()) await page.locator(".scoring-editor summary").filter({ hasText: new RegExp(`^${language.toUpperCase()}$`) }).click();
    await input.fill(language === "ru" ? "Техника" : "Technique");
  }
  for (const [key, value] of [["min", "0"], ["max", "10"], ["step", "0,5"], ["weight", "100"]]) await page.locator(`.scoring-editor input[id^='${key}-']`).fill(value);
  const option = await page.locator("#category-category option").last().getAttribute("value"); await page.locator("#category-category").selectOption(option!);
  await page.getByLabel("Synthetic judge", { exact: true }).check();
}
for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440, 1920]) {
  test(`${locale} rubric setup, source preview and receipt at ${width}px`, async ({ page }) => {
    const state = await fixture(page, locale, width); const tr = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, locale);
    await page.goto("/app/admin/events/e/scoring"); await fillRubric(page, locale);
    await page.getByRole("button", { name: tr("Scoring.preview"), exact: true }).click(); await expect(page.locator(".scoring-preview h2")).toBeFocused();
    const save = page.getByRole("button", { name: tr("Scoring.save"), exact: true }); await expect(save).toBeDisabled();
    await page.getByLabel(tr("Scoring.confirm"), { exact: true }).check(); await page.screenshot({ path: `.hallmark/shots/scoring-${locale}-${width}.png`, fullPage: true });
    if (locale === "en" && width === 1440) {
      const styles = (await page.locator("style").allTextContents()).join("\n");
      const html = await page.locator(".scoring-workbench").evaluate(element => {
        const copy = element.cloneNode(true); if (!(copy instanceof HTMLElement)) throw new Error("Expected a workbench element");
        const originals = element.querySelectorAll("input, textarea, select"), copies = copy.querySelectorAll("input, textarea, select");
        originals.forEach((control, i) => {
          const target = copies[i];
          if (control instanceof HTMLInputElement && target instanceof HTMLInputElement) { target.setAttribute("value", control.value); target.toggleAttribute("checked", control.checked); }
          else if (control instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) target.textContent = control.value;
          else if (control instanceof HTMLSelectElement && target instanceof HTMLSelectElement) [...target.options].forEach((option, index) => option.toggleAttribute("selected", control.options[index]?.selected ?? false));
        });
        return copy.outerHTML;
      });
      await writeFile(".hallmark/scoring-render.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Scoring setup synthetic preview</title><style>${styles}</style></head><body><main>${html}</main></body></html>`, "utf8");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await save.click(); await expect(page.getByRole("status").filter({ hasText: tr("Scoring.saved") })).toBeVisible(); expect(state.saves).toBe(1);
    const command = ScoringCommandSchema.parse(state.commands[0]); if (command.action !== "CONFIGURE") throw new Error("Expected configure");
    expect(command.setup.templates[0].criteria[0].step).toBe("0.5"); expect(command.setup.panels[0].judgeIds).toEqual(["judge"]);
    await page.getByText("Synthetic rubric <script>literal</script>", { exact: true }).first().click(); await expect(page.locator(".scoring-version h3")).toContainText("<script>literal</script>");
  });
}
test("rubric validation retains bad inputs and criterion keyboard ordering", async ({ page }) => {
  await fixture(page); await page.goto("/app/admin/events/e/scoring"); await fillRubric(page);
  await page.locator(".scoring-editor input[id^='step-']").fill("0.3"); await page.getByRole("button", { name: "Review scoring preview", exact: true }).click();
  await expect(page.locator(".ui-error-summary")).toBeVisible(); await expect(page.locator(".scoring-editor input[id^='step-']")).toHaveValue("0.3");
  await page.locator(".scoring-editor input[id^='step-']").fill("0.5"); await page.getByRole("button", { name: "Add criterion", exact: true }).click();
  const up = page.getByRole("button", { name: "Move up: 2", exact: true }); await up.focus(); await page.keyboard.press("Enter"); await expect(page.locator(".scoring-criteria > li").first()).toBeFocused();
  await page.getByRole("button", { name: "Remove criterion: 1", exact: true }).click();
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await expect(page.locator(".scoring-preview")).toBeVisible();
  await page.getByRole("button", { name: "Close preview", exact: true }).click(); await expect(page.getByRole("button", { name: "Review scoring preview", exact: true })).toBeFocused();
});
test("uncertain configuration reconciles the exact UUID without duplicate writes", async ({ page }) => {
  const state = await fixture(page); await page.goto("/app/admin/events/e/scoring"); await fillRubric(page);
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await page.getByLabel("I confirm these rubrics and panels").check(); state.lose = true;
  await page.getByRole("button", { name: "Save scoring setup", exact: true }).click(); await expect(page.getByText(/The outcome is unconfirmed/)).toBeVisible();
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await expect(page.getByRole("button", { name: "Replace local setup with server state", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible();
  expect(state.saves).toBe(1); expect(state.commands[0]).toEqual(state.commands[1]);
});
test("session expiry preserves draft and exact operation; navigation protects unsaved work", async ({ page }) => {
  const state = await fixture(page); await page.goto("/app/admin/events/e/scoring"); await fillRubric(page);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("link", { name: "Event details", exact: true }).click(); await expect(page).toHaveURL(/\/scoring$/);
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await page.getByLabel("I confirm these rubrics and panels").check(); state.expired = true;
  await page.getByRole("button", { name: "Save scoring setup", exact: true }).click(); await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill("password123"); await page.getByRole("dialog").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(page.locator("#rubric-name")).toHaveValue("Synthetic rubric <script>literal</script>");
  await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible(); expect(state.saves).toBe(1);
});
test("loading, failed reads, denied access and empty prerequisite states stay explicit", async ({ page }) => {
  const state = await fixture(page); let release = () => {}; state.hold = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/app/admin/events/e/scoring"); await expect(page.locator(".entry-loading")).toBeVisible(); state.failed = true; release(); await expect(page.locator(".ui-error-summary")).toBeVisible();
  state.failed = false; state.workspace.sessions = []; state.workspace.categories = []; state.workspace.judges = [];
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await expect(page.getByText("Create sessions in the schedule editor.", { exact: true })).toBeVisible();
  state.denied = true; await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible();
});
test("stale preview keeps edits until explicit server comparison and replacement", async ({ page }) => {
  const state = await fixture(page); await page.goto("/app/admin/events/e/scoring"); await fillRubric(page);
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await page.getByLabel("I confirm these rubrics and panels").check(); state.workspace.revision++;
  await page.getByRole("button", { name: "Save scoring setup", exact: true }).click(); await expect(page.locator("#rubric-name")).toHaveValue("Synthetic rubric <script>literal</script>");
  await page.getByRole("button", { name: "Compare current server state", exact: true }).click(); await page.getByRole("button", { name: "I compared server state; resolve this attempt", exact: true }).click();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Replace local setup with server state", exact: true }).click(); await expect(page.locator("#rubric-name")).toHaveCount(0); expect(state.saves).toBe(0);
});

test("unavailable assigned judges can be removed from future panels", async ({ page }) => {
  const state = await fixture(page); state.workspace.judges[0].eligible = false; state.workspace.setup.panels = [{ sessionId: session, judgeIds: ["judge"] }];
  state.workspace.blockers = [{ kind: "JUDGE", targetId: "judge" }]; await page.goto("/app/admin/events/e/scoring");
  const choice = page.getByLabel("Synthetic judge (Judge access unavailable)", { exact: true }); await expect(choice).toBeChecked(); await choice.uncheck(); await expect(choice).toBeDisabled();
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await page.getByLabel("I confirm these rubrics and panels").check(); await page.getByRole("button", { name: "Save scoring setup", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible(); expect(state.workspace.setup.panels).toEqual([]);
});

test("saved rubric copy uses new template and criterion identities", async ({ page }) => {
  const state = await fixture(page); const id = "00000000-0000-4000-8000-000000000010", criterionId = "00000000-0000-4000-8000-000000000011";
  state.workspace.setup.templates = [{ id, name: "Existing rubric", criteria: [{ id: criterionId, label: { et: "Tehnika", en: "Technique", ru: "Техника" }, instructions: { et: "", en: "", ru: "" }, min: "0.000", max: "10.000", step: "0.500", weightBps: 10000 }] }];
  await page.goto("/app/admin/events/e/scoring"); await page.getByText("Existing rubric", { exact: true }).first().click();
  await page.getByRole("button", { name: "Copy to a new version", exact: true }).click(); await page.getByRole("button", { name: "Review scoring preview", exact: true }).click();
  await page.getByLabel("I confirm these rubrics and panels").check(); await page.getByRole("button", { name: "Save scoring setup", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Server acknowledged" })).toBeVisible();
  const templates = state.workspace.setup.templates; expect(templates).toHaveLength(2); expect(templates[0].id).toBe(id); expect(templates[1].id).not.toBe(id); expect(templates[1].criteria[0].id).not.toBe(criterionId);
});

test("receipt readback detects queue state changes at the same scoring revision", async ({ page }) => {
  const state = await fixture(page); await page.goto("/app/admin/events/e/scoring"); await fillRubric(page);
  await page.getByRole("button", { name: "Review scoring preview", exact: true }).click(); await page.getByLabel("I confirm these rubrics and panels").check(); state.lose = true;
  await page.getByRole("button", { name: "Save scoring setup", exact: true }).click(); await expect(page.getByText(/The outcome is unconfirmed/)).toBeVisible();
  state.workspace.sessions[0].state = "RUNNING"; await page.getByRole("button", { name: getTranslation("Entry.retry", "en"), exact: true }).click();
  await expect(page.getByRole("button", { name: "Replace local setup with server state", exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Review scoring preview", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Replace local setup with server state", exact: true }).click(); await expect(page.getByText("Scoring setup is locked. Pause running queues.", { exact: true })).toBeVisible();
});
