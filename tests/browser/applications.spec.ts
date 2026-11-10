import { test, expect, type Page } from "@playwright/test";
import { EventSchema, StudioSchema, StudioRegistrationSchema, NewStudioRegistrationBodySchema, UpdateStudioApprovalBodySchema, UpdateStudioRegistrationBodySchema, RegisterSchema, type StudioRegistration, type UserProfile } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey, type TranslationArgs } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";
type PlainKey = { [K in TranslationKey]: TranslationArgs<K> extends [] ? K : never }[TranslationKey];
const label = (key: PlainKey, locale: Locale = "en") => getTranslation(key, locale);
const instant = "2026-01-01T00:00:00.000Z";
const account = (admin: boolean): UserProfile => ({ id: "applicant", name: "Synthetic applicant", email: "applicant@example.invalid", createdAt: instant, preferredLocale: null, isAdmin: admin, roles: [], permissions: [] });
const eventFixture = () => EventSchema.parse({ id: "e", name: "Synthetic competition", startsAt: "2099-06-01T08:00:00.000Z", endsAt: "2099-06-01T10:00:00.000Z", timeZone: "Europe/Tallinn", registrationDeadline: null, createdAt: instant, stage: "REGISTRATION_OPEN", venue: "Hall", country: "EE", city: "Tallinn", description: null, unclassifiedDescription: null, organizerEmail: "organizer@example.invalid", organizerPhone: null, revision: 1, maxStudios: null, maxPerformances: null, imageUrl: null });
const registration = (): StudioRegistration => StudioRegistrationSchema.parse({ id: "r", studioId: "s", eventId: "e", status: "PENDING", revision: 1, decisionReason: null, nextActor: "ORGANIZER", canEditDuringReview: false, createdAt: instant, updatedAt: instant, studio: { id: "s", name: "Synthetic studio", approvalStatus: "PENDING", country: "EE", city: "Tallinn" } });
const failure = (reason = "concurrentChange") => ({ code: "CONFLICT", reason, params: {}, issues: [] });
async function fixture(page: Page, options: { admin?: boolean; empty?: boolean; locale?: Locale; width?: number; draft?: boolean } = {}) {
  await page.setViewportSize({ width: options.width ?? 390, height: 950 });
  await page.addInitScript(locale => localStorage.setItem("app-language", locale), options.locale ?? "en");
  const state = { admin: options.admin ?? false, event: eventFixture(), row: options.empty ? null : registration(), valid: true, failRead: false, failWrite: false, loseResponse: false, failReadback: false, writes: [] as Record<string, unknown>[], signups: [] as Record<string, unknown>[], city: "Tallinn", contact: "Synthetic applicant", contactEmail: "applicant@example.invalid" };
  const profile = () => { const row = state.row; return row ? StudioSchema.parse({ id: "s", eventId: "e", name: row.studio.name, approvalStatus: row.studio.approvalStatus, approvalReason: row.studio.approvalReason, country: "EE", city: state.city, directorName: null, directorPhone: null, invoiceDetails: null, logoUrl: null, registrations: [{ ...row, studio: undefined, nextActor: undefined }].map(({ studio: _studio, nextActor: _actor, ...value }) => value), representatives: [{ id: "rep", studioId: "s", userId: "applicant", name: state.contact, email: state.contactEmail, active: true, createdAt: instant }] }) : null; };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method();
    if (path.endsWith("/auth/register")) { const body = RegisterSchema.parse(route.request().postDataJSON()); state.signups.push(body); return route.fulfill({ status: 201, json: { message: "Registered", messageId: "registered", userId: "applicant", delivery: "unconfirmed" } }); }
    if (path.endsWith("/auth/verify-email")) { state.valid = true; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "applicant", name: "Synthetic applicant", email: "applicant@example.invalid" }, messageId: "emailVerified", message: "Verified" } }); }
    if (path.endsWith("/auth/login")) { state.valid = true; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "applicant", name: "Synthetic applicant", email: "applicant@example.invalid" } } }); }
    if (!state.valid) return route.fulfill({ status: 401, json: failure("authenticationRequired") });
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: account(state.admin) });
    if (path.endsWith("/auth/onboarding/read")) return route.fulfill({ json: { email: "applicant@example.invalid", emailVerified: true, returnTo: "/events/e", draft: options.draft ? { id: "draft", status: "DRAFT", revision: 2, intendedEventId: "e", details: { studioName: "Verified draft studio", country: "EE", city: "Tartu", directorName: "Director", directorPhone: "" }, updatedAt: instant } : null } });
    if (method === "GET" && state.failRead) return route.abort();
    if (path === "/api/v1/events/e" && method === "GET") return route.fulfill({ json: state.event });
    if (path === "/api/v1/events" && method === "GET") return route.fulfill({ json: [state.event] });
    if (path === "/api/v1/studios" && method === "GET") return route.fulfill({ json: state.row ? [profile()] : [] });
    if (path === "/api/v1/studios/s" && method === "GET") return route.fulfill({ json: profile() });
    if (path.endsWith("/review")) return route.fulfill({ json: { history: [{ action: "REGISTRATION_CREATED", createdAt: instant, revision: 1, fromStatus: null, toStatus: null, reason: null }], notifications: state.row && state.row.revision > 1 ? [{ id: "notice", revision: state.row.revision, axis: "EVENT", state: "RETRYING", createdAt: instant }] : [] } });
    if (path === "/api/v1/events/e/studio-registrations" && method === "GET") return route.fulfill({ json: state.row ? [state.row] : [] });
    const body: Record<string, unknown> = method === "DELETE" ? {} : route.request().postDataJSON(); state.writes.push(body);
    if (state.failWrite) return route.fulfill({ status: 409, json: failure() });
    if (method === "POST") {
      if ("studioId" in body && state.row) state.row = { ...state.row, status: "PENDING", revision: state.row.revision + 1 };
      else { const parsed = NewStudioRegistrationBodySchema.parse(body); state.row = registration(); state.row.studio.name = parsed.name; state.city = parsed.city ?? ""; }
    } else if (path.endsWith("/approval") && state.row) {
      const parsed = UpdateStudioApprovalBodySchema.parse(body); expect(parsed.revision).toBe(state.row.revision);
      state.row = { ...state.row, revision: state.row.revision + 1, studio: { ...state.row.studio, approvalStatus: parsed.status, approvalReason: parsed.reason ?? null } };
    } else if (method === "DELETE" && state.row) { state.row = { ...state.row, status: "CANCELLED", revision: state.row.revision + 1 }; }
    else if (path.endsWith("/studio-registrations/s") && state.row) {
      const parsed = UpdateStudioRegistrationBodySchema.parse(body); expect(parsed.revision).toBe(state.row.revision); state.row = { ...state.row, status: parsed.status, decisionReason: parsed.reason ?? null, canEditDuringReview: parsed.canEditDuringReview ?? false, revision: state.row.revision + 1 };
    } else if (state.row) { state.city = typeof body.city === "string" ? body.city : state.city; state.row = { ...state.row, revision: state.row.revision + 1 }; }
    if (state.loseResponse) { state.loseResponse = false; return route.abort(); }
    if (state.failReadback) { state.failRead = true; state.failReadback = false; }
    return route.fulfill({ ...(method === "DELETE" ? { status: 204 } : { json: path === "/api/v1/studios/s" || path.endsWith("/approval") ? profile() : state.row }) });
  });
  return state;
}

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} S06 independent decision ledger and S08 profile at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, { admin: true, locale, width });
    await page.goto("/admin/events/e/applications?studio=s");
    await expect(page.getByRole("heading", { name: "Synthetic studio", exact: true })).toBeVisible();
    await expect(page.locator("#organization-status")).toHaveValue("PENDING");
    await page.locator("#organization-status").selectOption("APPROVED");
    await page.locator("form").filter({ has: page.locator("#organization-status") }).getByRole("button").click();
    await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.getByRole("button", { name: label("Staff.cancel", locale), exact: true })).toBeFocused();
    await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("form").filter({ has: page.locator("#organization-status") }).getByRole("button").click();
    await page.getByRole("button", { name: label("Application.confirm", locale), exact: true }).click();
    await expect(page.locator("#organization-status")).toHaveValue("APPROVED");
    await expect(page.getByRole("heading", { name: "Synthetic studio", exact: true })).toBeFocused();
    expect(state.row?.status).toBe("PENDING");
    await expect(page.getByText(label("Application.retrying", locale), { exact: true })).toBeVisible();
    const wrapped = await page.locator(".event-workbench .ui-button").evaluateAll(elements => elements.filter(element => { const style = getComputedStyle(element); const range = document.createRange(); range.selectNodeContents(element); return range.getBoundingClientRect().height > Number.parseFloat(style.lineHeight) + 2; }).map(element => element.textContent));
    expect(wrapped).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`review-${locale}-${width}.png`), fullPage: true });
    state.admin = false; await page.goto("/events/e/studio?studio=s");
    await expect(page.locator("#profile-studioName")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`applicant-${locale}-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("organizer dashboard shows independent pending counts and keeps selected filtered detail recoverable", async ({ page }) => {
  await fixture(page, { admin: true }); await page.goto("/admin");
  await page.getByRole("link", { name: label("Application.organization") + ": 1", exact: true }).click();
  await expect(page.locator("#review-axis")).toHaveValue("ORGANIZATION");
  await page.getByRole("link", { name: "Synthetic studio", exact: true }).click();
  await page.locator("#review-filter").selectOption("APPROVED");
  await expect(page.getByText(label("Application.keepOpen"), { exact: true })).toBeVisible();
  await page.getByRole("button", { name: label("Application.showAll"), exact: true }).click();
  await expect(page.getByRole("link", { name: "Synthetic studio", exact: true })).toBeVisible();
});

test("synthetic signup, verification, application, independent review and returning applicant journey", async ({ page }) => {
  const state = await fixture(page, { empty: true, draft: true }); state.valid = false;
  await page.goto("/events/e/register"); await page.getByRole("link", { name: label("Shell.login"), exact: true }).last().click();
  await page.getByRole("link", { name: label("Flow.signup"), exact: true }).click(); await expect(page).toHaveURL(/\/auth\/register\?eventId=e$/);
  for (const [id, value] of Object.entries({ name: "Synthetic applicant", email: "applicant@example.invalid", password: "fixture-password", studioName: "Verified draft studio", country: "EE", city: "Tartu", directorName: "Director" })) await page.locator("#signup-" + id).fill(value);
  await page.getByRole("button", { name: label("Flow.signup"), exact: true }).click(); await expect(page.getByRole("heading", { name: label("Flow.checkEmail"), exact: true })).toBeVisible();
  expect(state.signups[0]).toHaveProperty("onboarding.intendedEventId", "e");
  await page.goto("/verify-email?token=synthetic-verification"); await page.getByRole("button", { name: label("Shell.verify"), exact: true }).click();
  await page.getByRole("link", { name: label("Shell.continue"), exact: true }).click(); await page.getByRole("link", { name: label("Application.open"), exact: true }).click();
  await expect(page.locator("#apply-studioName")).toHaveValue("Verified draft studio"); await page.getByRole("button", { name: label("Application.apply"), exact: true }).click();
  await expect(page.locator("#profile-studioName")).toBeVisible(); state.admin = true;
  await page.goto("/admin/events/e/applications?studio=s");
  for (const axis of ["organization", "event"]) { await page.locator(`#${axis}-status`).selectOption("APPROVED"); await page.locator("form").filter({ has: page.locator(`#${axis}-status`) }).getByRole("button").click(); await page.getByRole("button", { name: label("Application.confirm"), exact: true }).click(); await expect(page.locator(`#${axis}-status`)).toHaveValue("APPROVED"); }
  state.admin = false; await page.goto("/applications"); await page.getByRole("link", { name: label("Application.open") + ": Verified draft studio", exact: true }).click();
  await expect(page.locator(".application-ledger dd")).toHaveText([label("Registration.approved"), label("Registration.approved")]);
  await expect(page.getByText(label("Application.accepted"), { exact: true })).toBeVisible();
});

test("guest return retains exact studio and refuses arbitrary redirect parameters", async ({ page }) => {
  const state = await fixture(page); state.valid = false; await page.goto("/events/e/studio?studio=s");
  await page.getByRole("link", { name: label("Shell.login"), exact: true }).last().click();
  await expect(page).toHaveURL(/returnTo=%2Fevents%2Fe%2Fstudio%3Fstudio%3Ds$/);
  await page.locator("#login-email").fill("applicant@example.invalid"); await page.locator("#login-password").fill("fixture-password"); await page.getByRole("button", { name: label("Shell.login"), exact: true }).click();
  await expect(page).toHaveURL(/\/events\/e\/studio\?studio=s$/); await expect(page.locator("#profile-studioName")).toBeVisible();
});

test("roleless verified draft applies, preserves operation ID after lost response and returns through My applications", async ({ page }) => {
  const state = await fixture(page, { empty: true, draft: true }); await page.goto("/events/e/register");
  await expect(page.locator("#apply-studioName")).toHaveValue("Verified draft studio"); state.loseResponse = true;
  await page.getByRole("button", { name: label("Application.apply"), exact: true }).click();
  await expect(page.getByText(label("Application.uncertain"), { exact: true })).toBeVisible();
  await page.getByRole("button", { name: label("Setup.retrySame"), exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verified draft studio", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(2); expect(state.writes[0]).toEqual(state.writes[1]); expect(state.writes[0]?.onboardingRevision).toBe(2);
  await page.goto("/applications"); await page.getByRole("link", { name: label("Application.open") + ": Verified draft studio" }).click();
  await expect(page.locator("#profile-studioName")).toHaveValue("Verified draft studio");
});

test("pending cancellation confirms, retains identity and reapplies", async ({ page }) => {
  const state = await fixture(page); await page.goto("/events/e/studio");
  await page.getByRole("button", { name: label("Application.cancel"), exact: true }).click();
  await page.getByRole("button", { name: label("Application.confirm"), exact: true }).click();
  await expect(page.getByRole("button", { name: label("Application.reapply"), exact: true })).toBeVisible();
  expect(state.row?.studioId).toBe("s"); await page.getByRole("button", { name: label("Application.reapply"), exact: true }).click();
  await expect(page.getByRole("button", { name: label("Application.cancel"), exact: true })).toBeVisible(); expect(state.row?.revision).toBe(3);
});

test("stale decision retains chosen reason until explicit server comparison", async ({ page }) => {
  const state = await fixture(page, { admin: true }); await page.goto("/admin/events/e/applications?studio=s");
  await page.locator("#event-status").selectOption("REJECTED"); await page.locator("#event-reason").selectOption("CAPACITY"); state.failWrite = true;
  await page.locator("form").filter({ has: page.locator("#event-status") }).getByRole("button").click();
  await page.getByRole("button", { name: label("Application.confirm"), exact: true }).click();
  await expect(page.locator("#event-reason")).toHaveValue("CAPACITY");
  await page.getByRole("button", { name: label("Application.compare"), exact: true }).click();
  await expect(page.getByRole("heading", { name: label("Setup.serverCopy"), exact: true })).toBeVisible();
  await expect(page.locator("#event-reason")).toHaveValue("CAPACITY");
  state.failWrite = false; await page.getByRole("button", { name: label("Application.replace"), exact: true }).click();
  await expect(page.locator("#event-status")).toHaveValue("PENDING");
});

test("acknowledged decision survives failed readback without repeating write", async ({ page }) => {
  const state = await fixture(page, { admin: true }); await page.goto("/admin/events/e/applications?studio=s"); await page.locator("#event-status").selectOption("APPROVED");
  state.failReadback = true; await page.locator("form").filter({ has: page.locator("#event-status") }).getByRole("button").click(); await page.getByRole("button", { name: label("Application.confirm"), exact: true }).click();
  await expect(page.getByText(label("Application.readbackFailed"), { exact: true })).toBeVisible(); expect(state.writes).toHaveLength(1);
  state.failRead = false; await page.getByRole("button", { name: label("Application.compare"), exact: true }).click(); await expect(page.locator("#event-status")).toHaveValue("APPROVED"); expect(state.writes).toHaveLength(1);
});

test("profile input survives language and expired-session recovery", async ({ page }) => {
  const state = await fixture(page); await page.goto("/events/e/studio"); await page.locator("#profile-city").fill("Retained city");
  await page.getByRole("button", { name: "Русский", exact: true }).click(); await expect(page.locator("#profile-city")).toHaveValue("Retained city");
  state.valid = false; await page.locator("form").filter({ has: page.locator("#profile-city") }).getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.getByRole("dialog").getByLabel(label("Shell.password", "ru"), { exact: true }).fill("fixture-password");
  await page.getByRole("dialog").getByRole("button", { name: label("Shell.login", "ru"), exact: true }).click();
  await expect(page.locator("#profile-city")).toHaveValue("Retained city");
  await page.getByRole("button", { name: label("Setup.retrySame", "ru"), exact: true }).click();
  await expect(page.getByText(label("Application.saved", "ru"), { exact: true })).toBeVisible();
});

test("empty, failed, locked, wrong studio and denied review routes are truthful", async ({ page }) => {
  const state = await fixture(page, { empty: true }); await page.goto("/applications"); await expect(page.getByRole("heading", { name: label("Application.none"), exact: true })).toBeVisible();
  state.failRead = true; await page.reload(); await expect(page.getByRole("button", { name: label("Shell.retry"), exact: true })).toBeVisible();
  state.failRead = false; state.row = registration(); state.event.stage = "DATA_REVIEW"; await page.goto("/events/e/studio?studio=s"); await expect(page.locator("#profile-studioName")).toBeDisabled();
  await page.goto("/events/e/studio?studio=other"); await expect(page.getByText(label("Shell.notFound"), { exact: true })).toBeVisible();
  await page.goto("/admin/events/e/applications"); await expect(page.getByRole("heading", { name: label("Access.denied"), exact: true })).toBeVisible();
});
