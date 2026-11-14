import { test, expect, type Page } from "@playwright/test";
import type { StaffOverview, UserProfile, Invitation } from "../../packages/schemas/src/index";
import { getTranslation, type TranslationKey, type TranslationArgs } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";

const user = (admin = true): UserProfile => ({ id: admin ? "admin" : "invitee", name: admin ? "Synthetic admin" : "Synthetic judge", email: admin ? "admin@example.invalid" : "judge@example.invalid", preferredLocale: null, createdAt: "2026-01-01T00:00:00.000Z", isAdmin: admin, roles: admin ? [{ id: "global", eventId: null, role: { id: "r", key: "admin", name: "Admin" }, event: null }] : [], permissions: [] });
const denied = { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] };
const pending = (): Invitation => ({ id: "pending", eventId: "e", email: "judge@example.invalid", roleKey: "judge", status: "PENDING", createdAt: "2026-11-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", usedAt: null, revokedAt: null, supersededAt: null });
const overview = (): StaffOverview => ({ event: { id: "e", name: "Synthetic event" }, invitations: [pending(), ...(["ACCEPTED", "EXPIRED", "REVOKED", "SUPERSEDED"] as const).map(status => ({ ...pending(), id: status, email: status.toLowerCase() + "@example.invalid", status }))],
  assignments: (["ACTIVE", "REMOVED", "ACCOUNT_UNAVAILABLE", "JUDGE_MISSING"] as const).map((status, i) => ({ id: "assignment-" + i, user: { id: "user-" + i, name: "Synthetic staff " + i, email: "long-synthetic-staff-address-" + i + "@example.invalid" }, roleKey: i === 2 ? "moderator" : "judge", status, removedAt: status === "REMOVED" ? "2026-11-01T00:00:00.000Z" : null })) });
async function localeSetup(page: Page, locale: Locale, width = 390) {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
}
type PlainKey = { [K in TranslationKey]: TranslationArgs<K> extends [] ? K : never }[TranslationKey];
const label = (key: PlainKey, locale: Locale) => getTranslation(key, locale);

for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} S17 staff states and safe confirmation at ${width}px`, async ({ page }, info) => {
    await localeSetup(page, locale, width); let removals = 0;
    await page.route("**/api/v1/**", route => {
      if (route.request().url().endsWith("/remove")) { removals++; return route.fulfill({ status: 204 }); }
      return route.fulfill({ json: route.request().url().endsWith("/auth/profile") ? user() : overview() });
    });
    await page.goto("/admin/events/e/staff");
    await expect(page.getByRole("heading", { name: label("Staff.title", locale), exact: true })).toBeFocused();
    await expect(page).toHaveTitle(new RegExp(label("Staff.title", locale)));
    await expect(page.getByRole("heading", { name: "Synthetic event", exact: true })).toBeVisible();
    for (const key of ["Staff.active", "Staff.removedStatus", "Staff.accountUnavailable", "Staff.judgeMissing", "Flow.pending", "Flow.acceptedStatus", "Flow.expired", "Flow.revoked", "Flow.superseded"] as const) await expect(page.getByText(label(key, locale), { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByLabel(label("Shell.email", locale), { exact: true }).fill("preserved@example.invalid");
    const remove = page.getByRole("button", { name: getTranslation("Staff.removeNamed", locale, { name: "Synthetic staff 0" }) });
    await remove.click(); const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: label("Staff.cancel", locale), exact: true })).toBeFocused();
    await expect(dialog).toContainText("Synthetic event"); await expect(dialog).toContainText("Synthetic staff 0");
    await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("button", { name: label("Staff.remove", locale), exact: true })).toBeFocused();
    await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: label("Staff.cancel", locale), exact: true })).toBeFocused();
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(remove).toBeFocused();
    await remove.click(); await dialog.getByRole("button", { name: label("Staff.cancel", locale), exact: true }).click();
    await expect(dialog).toHaveCount(0); await expect(remove).toBeFocused();
    expect(removals).toBe(0); await expect(page.getByLabel(label("Shell.email", locale), { exact: true })).toHaveValue("preserved@example.invalid");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("staff.png"), fullPage: true });
    await page.getByRole("button", { name: locale === "en" ? "Eesti" : "English", exact: true }).click();
    await expect(page.getByLabel(label("Shell.email", locale === "en" ? "et" : "en"), { exact: true })).toHaveValue("preserved@example.invalid");
  });
}

for (const locale of ["et", "en", "ru"] as const) {
  test(`${locale} F06 invite accept revoke and remove are separate`, async ({ page, context }) => {
    await localeSetup(page, locale); const data: StaffOverview = { ...overview(), assignments: [], invitations: [] }; let creates = 0; let accepts = 0; let removes = 0;
    await page.route("**/api/v1/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/profile")) return route.fulfill({ json: user() });
      if (path.endsWith("/invitations") && route.request().method() === "POST") {
        creates++; expect(route.request().postDataJSON()).toEqual({ email: "judge@example.invalid", roleKey: "judge", eventId: "e", locale: "ru" });
        data.invitations = [pending()]; return route.fulfill({ status: 201, json: { invitationId: "pending", messageId: "invitationCreated", message: "Created", delivery: "unconfirmed" } });
      }
      if (path.endsWith("/resend")) return route.fulfill({ json: { invitationId: "pending", messageId: "invitationResent", delivery: "unconfirmed" } });
      if (path.endsWith("/revoke")) { data.invitations[0] = { ...pending(), status: "REVOKED", revokedAt: "2026-11-06T00:00:00.000Z" }; return route.fulfill({ json: { invitationId: "pending", messageId: "invitationRevoked" } }); }
      if (path.endsWith("/remove")) { removes++; data.assignments[0] = { ...data.assignments[0], status: "REMOVED", removedAt: "2026-11-06T00:00:00.000Z" }; return route.fulfill({ status: 204 }); }
      return route.fulfill({ json: data });
    });
    await page.goto("/admin/events/e/staff");
    await expect(page.getByText(label("Staff.noAssignments", locale))).toBeVisible();
    await page.getByLabel(label("Shell.email", locale), { exact: true }).fill("judge@example.invalid");
    await page.getByLabel(label("Flow.language", locale), { exact: true }).selectOption("ru");
    await page.getByRole("button", { name: label("Flow.invite", locale), exact: true }).click();
    await expect(page.getByText(label("Staff.created", locale))).toBeVisible(); expect(creates).toBe(1);
    await page.getByRole("button", { name: getTranslation("Staff.resendNamed", locale, { email: "judge@example.invalid" }) }).click();
    await expect(page.getByText(label("Staff.resent", locale))).toBeVisible();
    await page.getByRole("button", { name: getTranslation("Staff.revokeNamed", locale, { email: "judge@example.invalid" }) }).click();
    await page.getByRole("dialog").getByRole("button", { name: label("Flow.revoke", locale), exact: true }).click();
    await expect(page.getByText(label("Staff.revoked", locale))).toBeVisible(); expect(removes).toBe(0);
    // Model a fresh pending replacement, then exercise the real acceptance UI in another tab.
    data.invitations = [pending()];
    const invitee = await context.newPage(); await localeSetup(invitee, locale);
    await invitee.route("**/api/v1/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/profile")) return route.fulfill({ json: user(false) });
      if (path.endsWith("/invitations/accept")) {
        accepts++; data.invitations[0] = { ...pending(), status: "ACCEPTED", usedAt: "2026-11-06T00:00:00.000Z" };
        data.assignments = [{ id: "accepted-assignment", user: { id: "invitee", name: "Synthetic judge", email: "judge@example.invalid" }, roleKey: "judge", status: "ACTIVE", removedAt: null }];
        return route.fulfill({ status: 201, json: { accountCreated: false, user: { id: "invitee", name: "Synthetic judge", email: "judge@example.invalid" }, message: "Accepted", messageId: "invitationAccepted" } });
      }
      return route.fulfill({ json: { email: "judge@example.invalid", roleKey: "judge", event: data.event, expiresAt: pending().expiresAt, status: "PENDING", accountExists: true } });
    });
    await invitee.goto("/auth/accept-invitation?token=synthetic-staff-link");
    await invitee.getByRole("button", { name: label("Flow.invitation", locale), exact: true }).click();
    await expect(invitee.getByText(label("Flow.accepted", locale), { exact: true })).toBeVisible(); expect(accepts).toBe(1);
    await invitee.close(); await page.bringToFront();
    await page.getByRole("button", { name: label("Staff.refresh", locale), exact: true }).click();
    await expect(page.getByText(label("Flow.acceptedStatus", locale), { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: getTranslation("Staff.revokeNamed", locale, { email: "judge@example.invalid" }) })).toHaveCount(0);
    await page.getByRole("button", { name: getTranslation("Staff.removeNamed", locale, { name: "Synthetic judge" }) }).click();
    await page.getByRole("dialog").getByRole("button", { name: label("Staff.remove", locale), exact: true }).click();
    await expect(page.getByText(label("Staff.removed", locale))).toBeVisible();
    await expect(page.getByText(label("Staff.removedStatus", locale), { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(label("Flow.acceptedStatus", locale), { exact: true })).toBeVisible(); expect(removes).toBe(1);
    await expect(page.getByRole("button", { name: label("Staff.refresh", locale), exact: true })).toBeFocused();
  });
}

test("uncertain removal requires refresh and never repeats the command", async ({ page }) => {
  await localeSetup(page, "en"); const data = overview(); let removes = 0;
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/remove")) { removes++; data.assignments[0] = { ...data.assignments[0], status: "REMOVED", removedAt: "2026-11-06T00:00:00.000Z" }; return route.abort("failed"); }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff");
  await page.getByLabel("Email", { exact: true }).fill("local-draft@example.invalid");
  await page.getByRole("button", { name: "Remove access for Synthetic staff 0", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove access", exact: true }).click();
  await expect(page.getByText(label("Staff.stale", "en"))).toBeVisible();
  await expect(page.locator(".ui-error-summary")).toBeFocused();
  await expect(page.getByRole("button", { name: label("Flow.invite", "en"), exact: true })).toBeDisabled();
  expect(removes).toBe(1); await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove access for Synthetic staff 0", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("local-draft@example.invalid"); expect(removes).toBe(1);
});

test("pending removal keeps confirmation modal and controls disabled until acknowledgement", async ({ page }) => {
  await localeSetup(page, "en"); const data = overview(); let removes = 0; let release = () => {};
  const pendingResponse = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/**", async route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/remove")) {
      removes++; await pendingResponse;
      data.assignments[0] = { ...data.assignments[0], status: "REMOVED", removedAt: "2026-11-06T00:00:00.000Z" };
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff"); await page.getByRole("button", { name: "Remove access for Synthetic staff 0", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Remove access", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Remove access", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape"); await expect(dialog).toBeVisible(); expect(removes).toBe(1);
  release(); await expect(dialog).toHaveCount(0); await expect(page.getByText(label("Staff.removed", "en"))).toBeVisible(); expect(removes).toBe(1);
});

test("acknowledged removal restores focus without waiting for an animation frame", async ({ page }) => {
  await localeSetup(page, "en"); const data = overview(); let removes = 0;
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/remove")) {
      removes++; data.assignments[0] = { ...data.assignments[0], status: "REMOVED", removedAt: "2026-11-06T00:00:00.000Z" };
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff");
  await page.getByLabel("Email", { exact: true }).fill("retained@example.invalid");
  await page.getByRole("button", { name: "Remove access for Synthetic staff 0", exact: true }).click();
  // Background tabs can suspend animation frames while a completed request still commits.
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.getByRole("dialog").getByRole("button", { name: "Remove access", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh status", exact: true })).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("retained@example.invalid"); expect(removes).toBe(1);
});

test("failed initial read is not empty success and accepted missing assignment needs review", async ({ page }) => {
  await localeSetup(page, "en"); let fail = true;
  const data: StaffOverview = { ...overview(), assignments: [], invitations: [{ ...pending(), status: "ACCEPTED", usedAt: "2026-11-06T00:00:00.000Z" }] };
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (fail) return route.abort("failed");
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff"); await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText(label("Staff.noAssignments", "en"))).toHaveCount(0);
  fail = false; await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByText(label("Staff.noAssignments", "en"))).toBeVisible();
  await expect(page.getByText(label("Staff.acceptedHelp", "en"))).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove access for/ })).toHaveCount(0);
});

test("stale invitation conflict preserves draft and uses refreshed expiry on explicit retry", async ({ page }) => {
  await localeSetup(page, "en"); const data = overview(); let resends = 0;
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/resend")) {
      resends++;
      if (resends === 1) { data.invitations[0].expiresAt = "2027-02-01T00:00:00.000Z"; return route.fulfill({ status: 409, json: { code: "CONFLICT", reason: "conflict", params: {}, issues: [] } }); }
      expect(route.request().postDataJSON()).toEqual({ expiresAt: "2027-02-01T00:00:00.000Z" });
      return route.fulfill({ json: { invitationId: "pending", messageId: "invitationResent", delivery: "unconfirmed" } });
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff");
  const resend = page.getByRole("button", { name: "Resend invitation for judge@example.invalid", exact: true });
  await resend.click(); await expect(resend).toBeDisabled(); expect(resends).toBe(1);
  await page.getByRole("button", { name: "Refresh status", exact: true }).click(); await expect(resend).toBeEnabled();
  await resend.click(); await expect(page.getByText(label("Staff.resent", "en"))).toBeVisible(); expect(resends).toBe(2);
});

test("accepted receipt survives failed refresh and pending controls stay disabled", async ({ page }) => {
  await localeSetup(page, "en"); let acknowledged = false; let failRead = true; let creates = 0;
  const data: StaffOverview = { ...overview(), invitations: [], assignments: [] };
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/invitations")) { creates++; acknowledged = true; data.invitations = [pending()]; return route.fulfill({ status: 201, json: { invitationId: "pending", messageId: "invitationCreated", message: "Created", delivery: "unconfirmed" } }); }
    if (acknowledged && failRead) return route.abort("failed");
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/staff"); await page.getByLabel("Email", { exact: true }).fill("judge@example.invalid");
  await page.getByRole("button", { name: label("Flow.invite", "en"), exact: true }).click();
  await expect(page.getByText(label("Staff.created", "en"))).toBeVisible();
  await expect(page.getByText(label("Staff.stale", "en"))).toBeVisible();
  failRead = false; await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByText("judge@example.invalid", { exact: true })).toBeVisible(); expect(creates).toBe(1);
});

test("expired session preserves staff input and requires explicit status reload", async ({ page }) => {
  await localeSetup(page, "en"); let valid = true;
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { valid = true; return route.fulfill({ json: { session: "cookie", expiresAt: "2027-01-01T00:00:00.000Z", user: { id: "admin", name: "Synthetic admin", email: "admin@example.invalid" } } }); }
    if (!valid) return route.fulfill({ status: 401, json: denied });
    return route.fulfill({ json: path.endsWith("/auth/profile") ? user() : overview() });
  });
  await page.goto("/admin/events/e/staff"); await page.getByLabel("Email", { exact: true }).fill("preserved@example.invalid");
  valid = false; await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  const recovery = page.getByRole("dialog"); await recovery.getByLabel("Password", { exact: true }).fill("password123");
  await recovery.getByRole("button", { name: label("Shell.login", "en"), exact: true }).click();
  await expect(recovery).not.toBeVisible(); await expect(page.getByLabel("Email", { exact: true })).toHaveValue("preserved@example.invalid");
  await expect(page.getByRole("button", { name: label("Flow.invite", "en"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("button", { name: label("Flow.invite", "en"), exact: true })).toBeEnabled();
});

for (const mode of ["guest", "scoped-admin", "roleless", "missing"] as const) {
  test(`staff direct URL ${mode} cannot expose unrelated staff`, async ({ page }) => {
    await localeSetup(page, "en"); let staffReads = 0;
    await page.route("**/api/v1/**", route => {
      if (route.request().url().endsWith("/auth/profile")) {
        if (mode === "guest") return route.fulfill({ status: 401, json: denied });
        const profile = mode === "missing" ? user() : { ...user(false), roles: mode === "scoped-admin" ? [{ id: "scoped", eventId: "e", role: { id: "r", key: "admin", name: "Admin" }, event: { id: "e", name: "Event" } }] : [] };
        return route.fulfill({ json: profile });
      }
      staffReads++; return route.fulfill({ status: 404, json: { code: "NOT_FOUND", reason: "recordNotFound", params: {}, issues: [] } });
    });
    await page.goto("/admin/events/missing/staff");
    if (mode === "guest") await expect(page).toHaveURL(/returnTo=%2Fadmin%2Fevents%2Fmissing%2Fstaff/);
    else if (mode !== "missing") await expect(page.getByRole("heading", { name: label("Access.denied", "en") })).toBeVisible();
    else { await expect(page.getByRole("alert")).toBeVisible(); await expect(page.getByRole("button", { name: "Refresh status", exact: true })).toBeEnabled(); }
    await expect(page.getByText("long-synthetic-staff-address-0@example.invalid", { exact: true })).toHaveCount(0);
    if (mode !== "missing") expect(staffReads).toBe(0);
  });
}
