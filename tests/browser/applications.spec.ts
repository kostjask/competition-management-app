import { test, expect, type Page } from "@playwright/test";
import type { Event, Studio, StudioRegistration, UserProfile } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey, type TranslationArgs } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const owner = (): UserProfile => ({ id: "u", name: "Synthetic owner", email: "owner@example.invalid", preferredLocale: null, createdAt: "2026-01-01T00:00:00.000Z", isAdmin: false, roles: [], permissions: [] });
const event = (): Event => ({ id: "e", name: "Synthetic application event", revision: 1, stage: "REGISTRATION_OPEN", timeZone: "Europe/Tallinn", registrationDeadline: "2099-01-01T00:00:00.000Z", startsAt: "2099-06-01T09:00:00.000Z", endsAt: "2099-06-01T16:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", organizerEmail: "organizer@example.invalid", organizerPhone: null, authoredDescription: { sourceLocale: "et", sourceText: "Synthetic source", translations: {} }, description: null, venue: "Synthetic hall", country: "EE", city: "Tallinn", maxStudios: null, maxPerformances: null, imageUrl: null });
const studio = (): Studio => ({ id: "s", eventId: "e", name: "Synthetic studio", approvalStatus: "PENDING", country: "EE", city: "Tallinn", directorName: null, directorPhone: null, invoiceDetails: null, logoUrl: null, registrations: [], representatives: [{ id: "m", studioId: "s", userId: "u", name: "Synthetic owner", email: "contact@example.invalid", active: true, createdAt: "2026-01-01T00:00:00.000Z" }] });
const registration = (): StudioRegistration => ({ id: "r", studioId: "s", eventId: "e", status: "PENDING", revision: 1, decisionReason: null, nextActor: "ORGANIZER", canEditDuringReview: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", studio: { id: "s", name: "Synthetic studio", approvalStatus: "PENDING", country: "EE", city: "Tallinn" } });
const failure = (reason = "concurrentChange") => ({ code: "CONFLICT", reason, params: {}, issues: [] });
async function fixture(page: Page, locale: Locale, width: number, existing = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const state = { event: event(), studio: studio(), registration: registration(), user: owner(), exists: existing, creates: 0, patches: 0, failProfile: false, loseCreate: true, savedBody: null as unknown };
  await page.route("**/api/v1/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname; const method = request.method();
    state.studio.registrations = [{ ...state.registration, studio: undefined, nextActor: undefined }].map(({ studio: omittedStudio, nextActor: omittedActor, ...rest }) => { void omittedStudio; void omittedActor; return rest; });
    state.registration.studio = { id: state.studio.id, name: state.studio.name, approvalStatus: state.studio.approvalStatus, country: state.studio.country, city: state.studio.city };
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: state.user });
    if (path.endsWith("/auth/onboarding/read")) return route.fulfill({ json: { email: state.user.email, emailVerified: true, returnTo: "/events/e", draft: { id: "d", revision: 1, status: state.exists ? "COMPLETED" : "DRAFT", intendedEventId: "e", details: { studioName: "Synthetic studio", country: "EE", city: "Tallinn", directorName: "", directorPhone: "" }, updatedAt: "2026-01-01T00:00:00.000Z" } } });
    if (path.endsWith("/studio-registrations") && method === "POST") {
      const body: unknown = request.postDataJSON();
      if (typeof body === "object" && body !== null && "studioId" in body) {
        expect(body).toEqual({ studioId: "s", revision: state.registration.revision }); state.registration.status = "PENDING"; state.registration.revision++; return route.fulfill({ json: state.registration });
      }
      state.creates++;
      if (state.savedBody) expect(body).toEqual(state.savedBody); else state.savedBody = body;
      expect(body).toMatchObject({ name: "Synthetic studio", representativeName: state.user.name, representativeEmail: state.user.email, onboarding: { draftId: "d", revision: 1 } });
      state.exists = true;
      if (state.loseCreate) { state.loseCreate = false; return route.abort("failed"); }
      return route.fulfill({ status: 201, json: state.registration });
    }
    if (path.endsWith("/studio-registrations/s") && method === "DELETE") {
      expect(new URL(request.url()).searchParams.get("revision")).toBe(String(state.registration.revision));
      state.registration.status = "CANCELLED"; state.registration.revision++; return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/studio-registrations")) return route.fulfill({ json: state.exists ? [state.registration] : [] });
    if (path.endsWith("/studios/s") && method === "PATCH") {
      state.patches++;
      if (state.failProfile) return route.fulfill({ status: 409, json: failure() });
      expect(request.postDataJSON().revision).toBe(state.registration.revision);
      state.studio.name = request.postDataJSON().name; state.registration.revision++; return route.fulfill({ json: state.studio });
    }
    if (path.endsWith("/studios/s")) return route.fulfill({ json: state.studio });
    if (path.endsWith("/studios")) return route.fulfill({ json: state.exists ? [state.studio] : [] });
    if (path.endsWith("/events")) return route.fulfill({ json: [state.event] });
    if (path.endsWith("/events/e")) return route.fulfill({ json: state.event });
    return route.fulfill({ status: 404, json: failure("recordNotFound") });
  });
  return state;
}
for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`F02/F03 ${locale} apply, recover, correct, cancel, reapply and return at ${width}px`, async ({ page }, info) => {
    const state = await fixture(page, locale, width); const t = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => getTranslation(key, locale, ...args);
    await page.goto("/events/e"); await page.getByRole("link", { name: t("Application.apply"), exact: true }).click();
    await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio");
    await expect(page.locator("#apply-representativeEmail")).toHaveValue(state.user.email);
    await page.locator("#apply-name").fill(""); await page.getByRole("button", { name: t("Application.apply"), exact: true }).click();
    await expect(page.locator(".ui-error-summary")).toBeFocused();
    await page.locator("#apply-name").fill("Synthetic studio");
    await page.locator('button[lang="en"]').click(); await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio"); await page.locator(`button[lang="${locale}"]`).click();
    await page.getByRole("button", { name: t("Application.apply"), exact: true }).click();
    await expect(page.getByText(t("Application.uncertain"), { exact: false })).toBeVisible();
    await expect(page.locator("#apply-name")).toBeDisabled();
    await page.getByRole("button", { name: t("Application.retryCreate") }).click();
    await expect(page).toHaveURL(/\/studios\/s$/); expect(state.creates).toBe(2);
    await expect(page.locator(".application-ledger > div")).toHaveCount(2);
    await expect(page.locator("#profile-representativeEmail")).toBeDisabled();
    await page.locator("#profile-name").fill("Corrected synthetic studio");
    await page.getByRole("button", { name: t("Application.saveProfile") }).click();
    await expect(page.getByText(t("Application.saved"))).toBeVisible();
    page.once("dialog", dialog => void dialog.accept()); await page.getByRole("button", { name: t("Application.cancel"), exact: true }).click();
    await expect(page.getByRole("button", { name: t("Application.reapply") })).toBeVisible();
    await page.getByRole("button", { name: t("Application.reapply") }).click();
    await expect(page.getByRole("button", { name: t("Application.cancel"), exact: true })).toBeVisible();
    state.studio.approvalStatus = "APPROVED"; state.registration.status = "APPROVED"; state.registration.nextActor = "APPLICANT"; state.registration.revision++;
    state.user.permissions = [{ eventId: "e", keys: ["studio.manage"] }];
    await page.getByRole("button", { name: t("Application.refresh") }).click();
    await expect(page.getByText(t("Application.approvedHelp"))).toBeVisible();
    await expect(page.locator("#profile-representativeEmail")).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("application-status.png"), fullPage: true });
    await page.goto("/applications"); await expect(page.getByRole("link", { name: "Corrected synthetic studio", exact: true })).toBeVisible();
  });
}

test("F03 stale profile keeps local input, requires refresh and explicit replacement", async ({ page }) => {
  const state = await fixture(page, "en", 390, true); state.failProfile = true;
  await page.goto("/studios/s"); await page.locator("#profile-name").fill("Unsaved local studio");
  await page.getByRole("button", { name: "Save studio profile" }).click();
  await expect(page.locator("#profile-name")).toHaveValue("Unsaved local studio");
  await expect(page.locator("#profile-name")).toBeDisabled();
  state.studio.name = "Concurrent server studio"; state.registration.revision++;
  await page.getByRole("button", { name: "Refresh server status" }).click();
  await expect(page.locator("#profile-name")).toHaveValue("Unsaved local studio");
  await expect(page.locator("#profile-name")).toBeDisabled();
  page.once("dialog", dialog => void dialog.accept()); await page.getByRole("button", { name: "Replace fields with server details" }).click();
  await expect(page.locator("#profile-name")).toHaveValue("Concurrent server studio"); expect(state.patches).toBe(1);
});

test("F02 closed discovery resumes the owned studio without offering new applications", async ({ page }) => {
  const state = await fixture(page, "en", 320, true); state.event.stage = "DATA_REVIEW";
  await page.goto("/events"); await expect(page.getByRole("link", { name: "Application status: Synthetic studio", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply to event", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Application status: Synthetic studio", exact: true }).click();
  await expect(page.locator("#profile-name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel application", exact: true })).toBeEnabled();
});

test("F03 keyboard validation, offline retry, session recovery and stage change retain input", async ({ page }) => {
  const state = await fixture(page, "en", 390);
  await page.goto("/events/e/register");
  await page.locator("#apply-name").fill("");
  await page.getByRole("button", { name: "Apply to event", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await page.locator('.ui-error-summary a[href="#apply-name"]').click(); await expect(page.locator("#apply-name")).toBeFocused();
  await page.locator("#apply-name").fill("Synthetic studio");
  await page.route("**/api/v1/events/e/studio-registrations", route => route.fulfill({ status: 401, json: failure("authenticationRequired") }));
  await page.getByRole("button", { name: "Apply to event", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: state.user.id, email: state.user.email, name: state.user.name } } }));
  const dialog = page.getByRole("dialog"); await dialog.locator('input[type="password"]').fill("synthetic-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio");
  await page.route("**/api/v1/events/e/studio-registrations", route => route.fulfill({ status: 403, json: failure("stageLocked") }));
  await page.getByRole("button", { name: "Apply to event", exact: true }).click();
  await expect(page.locator(".ui-error-summary")).toBeFocused(); await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio");
  expect(state.creates).toBe(0);
});

test("F03 approved contact updates use the member id and revision without losing profile edits", async ({ page }) => {
  const state = await fixture(page, "en", 390, true);
  state.user.permissions = [{ eventId: "e", keys: ["studio.manage"] }];
  state.studio.approvalStatus = "APPROVED"; state.registration.status = "APPROVED";
  await page.route("**/api/v1/studios/s/representatives/m", route => {
    expect(route.request().postDataJSON()).toEqual({ name: "New synthetic contact", email: "new-contact@example.invalid", revision: 1 });
    state.studio.representatives[0].name = "New synthetic contact"; state.studio.representatives[0].email = "new-contact@example.invalid"; state.registration.revision++;
    return route.fulfill({ json: state.studio.representatives[0] });
  });
  await page.goto("/studios/s"); await page.locator("#profile-name").fill("Unsaved profile edit");
  await page.locator("#profile-representativeName").fill("New synthetic contact"); await page.locator("#profile-representativeEmail").fill("new-contact@example.invalid");
  await page.getByRole("button", { name: "Save contact details" }).click(); await expect(page.getByText("The server acknowledged the change.")).toBeVisible();
  await expect(page.locator("#profile-name")).toHaveValue("Unsaved profile edit"); expect(state.user.email).toBe("owner@example.invalid");
});

test("F03 empty, failed and denied application reads remain distinct", async ({ page }) => {
  await fixture(page, "en", 320);
  await page.goto("/applications"); await expect(page.getByText("You have no applications yet. Choose an event to apply to.")).toBeVisible();
  await page.route("**/api/v1/studios", route => route.abort("failed"));
  await page.getByRole("button", { name: "Refresh server status" }).click(); await expect(page.locator(".ui-error-summary")).toBeVisible();
  await expect(page.getByText("You have no applications yet. Choose an event to apply to.")).toHaveCount(0);
  await page.route("**/api/v1/studios/foreign", route => route.fulfill({ status: 403, json: failure("ownershipRequired") }));
  await page.goto("/studios/foreign"); await expect(page.locator(".ui-error-summary")).toBeVisible(); await expect(page.locator("#profile-name")).toHaveCount(0);
});

test.describe("F03 touch and focus", () => {
  test.use({ hasTouch: true });
  test("pending cancellation restores the initiating control when dismissed", async ({ page }) => {
    await fixture(page, "en", 320, true); await page.goto("/studios/s");
    const cancel = page.getByRole("button", { name: "Cancel application", exact: true });
    const size = await cancel.boundingBox(); expect(size?.height).toBeGreaterThanOrEqual(44);
    await cancel.focus(); page.once("dialog", dialog => void dialog.dismiss()); await cancel.tap();
    await expect(cancel).toBeFocused(); await expect(page.getByRole("button", { name: "Reapply with this studio" })).toHaveCount(0);
  });
});

test("F03 changed owner draft reconciles before retrying the same operation", async ({ page }) => {
  const state = await fixture(page, "en", 390); let originalOperation: unknown;
  await page.goto("/events/e/register"); await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio");
  await page.route("**/api/v1/events/e/studio-registrations", route => {
    originalOperation = route.request().postDataJSON().operationId; return route.fulfill({ status: 409, json: failure() });
  });
  await page.getByRole("button", { name: "Apply to event", exact: true }).click(); await expect(page.locator("#apply-name")).toBeDisabled();
  await page.route("**/api/v1/auth/onboarding/read", route => route.fulfill({ json: { email: state.user.email, emailVerified: true, returnTo: "/events/e", draft: { id: "d", revision: 2, status: "DRAFT", intendedEventId: "e", details: { studioName: "Other tab name", country: "EE", city: "Tallinn", directorName: "", directorPhone: "" }, updatedAt: "2026-01-01T00:00:00.000Z" } } }));
  await page.getByRole("button", { name: "Refresh server status" }).click();
  await expect(page.locator("#apply-name")).toBeEnabled(); await expect(page.locator("#apply-name")).toHaveValue("Synthetic studio");
  await page.route("**/api/v1/events/e/studio-registrations", route => {
    expect(route.request().postDataJSON()).toMatchObject({ operationId: originalOperation, onboarding: { draftId: "d", revision: 2 } }); state.exists = true; return route.fulfill({ status: 201, json: state.registration });
  });
  await page.getByRole("button", { name: "Apply to event", exact: true }).click(); await expect(page).toHaveURL(/\/studios\/s$/);
});

test("F03 lost cancellation and reapplication responses are read without repeating writes", async ({ page }) => {
  const state = await fixture(page, "en", 390, true); let cancellations = 0; let reapplications = 0;
  await page.route("**/api/v1/events/e/studio-registrations/s?revision=*", route => {
    cancellations++; state.registration.status = "CANCELLED"; state.registration.revision++; return route.abort("failed");
  });
  await page.goto("/studios/s"); page.once("dialog", dialog => void dialog.accept());
  await page.getByRole("button", { name: "Cancel application", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel application", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh server status" }).click(); await expect(page.getByRole("button", { name: "Reapply with this studio" })).toBeEnabled();
  await page.route("**/api/v1/events/e/studio-registrations", route => {
    if (route.request().method() === "GET") return route.fallback();
    reapplications++; state.registration.status = "PENDING"; state.registration.revision++; return route.abort("failed");
  });
  await page.getByRole("button", { name: "Reapply with this studio" }).click(); await expect(page.getByRole("button", { name: "Reapply with this studio" })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh server status" }).click(); await expect(page.getByRole("button", { name: "Cancel application", exact: true })).toBeEnabled();
  expect(cancellations).toBe(1); expect(reapplications).toBe(1);
});
