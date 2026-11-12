import { test, expect, type Page } from "@playwright/test";
import type { Event, ReviewOverview, UserProfile } from "../../packages/schemas/src/index";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";
const event = (): Event => ({
  id: "e",
  name: "Synthetic competition",
  revision: 1,
  organizerEmail: "organizer@example.invalid",
  organizerPhone: null,
  authoredDescription: {
    sourceLocale: "et",
    sourceText: "Synthetic source",
    translations: { en: "Synthetic translation" },
  },
  startsAt: "2027-06-01T09:00:00.000Z",
  endsAt: "2027-06-01T16:00:00.000Z",
  timeZone: "Europe/Tallinn",
  registrationDeadline: null,
  stage: "PRE_REGISTRATION",
  createdAt: "2026-01-01T00:00:00.000Z",
  venue: "Synthetic hall",
  city: "Tallinn",
  country: "EE",
  description: null,
  maxStudios: null,
  maxPerformances: null,
  imageUrl: null,
});
const user = (admin = true): UserProfile => ({
  id: "u",
  name: "Synthetic organizer",
  email: "synthetic@example.invalid",
  preferredLocale: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  isAdmin: admin,
  roles: admin
    ? [{ id: "global", eventId: null, role: { id: "r", key: "admin", name: "Admin" }, event: null }]
    : [],
  permissions: [],
});
const overview = (): ReviewOverview => ({
  event: event(),
  applications: [
    {
      studio: {
        id: "s",
        eventId: "e",
        name: "Synthetic studio",
        approvalStatus: "PENDING",
        country: "EE",
        city: "Tallinn",
        directorName: "Synthetic director",
        directorPhone: null,
        invoiceDetails: null,
        logoUrl: null,
        representatives: [],
        registrations: [],
      },
      registration: {
        id: "a",
        studioId: "s",
        eventId: "e",
        status: "PENDING",
        canEditDuringReview: false,
        revision: 1,
        decisionReason: null,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        nextActor: "ORGANIZER",
        studio: {
          id: "s",
          name: "Synthetic studio",
          approvalStatus: "PENDING",
          country: "EE",
          city: "Tallinn",
        },
      },
      history: [],
      notifications: [],
    },
  ],
});
async function setup(page: Page, locale: Locale, width = 390) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((value) => localStorage.setItem("app-language", value), locale);
}
for (const locale of ["et", "en", "ru"] as const)
  for (const width of [320, 390, 768, 1440]) {
    test(`${locale} organizer setup and review at ${width}px`, async ({ page }, info) => {
      await setup(page, locale, width);
      const data = overview();
      let writes = 0;
      await page.route("**/api/v1/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("/auth/profile")) return route.fulfill({ json: user() });
        if (route.request().method() === "PATCH" && path.endsWith("/approval")) {
          writes++;
          expect(route.request().postDataJSON()).toEqual({
            status: "APPROVED",
            eventId: "e",
            revision: 1,
          });
          data.applications[0].studio.approvalStatus = "APPROVED";
          data.applications[0].registration.revision++;
          return route.fulfill({ json: data.applications[0].studio });
        }
        if (path.endsWith("/review")) return route.fulfill({ json: data });
        return route.fulfill({ json: data.event });
      });
      await page.goto("/admin/events/e/setup");
      await expect(
        page.getByRole("heading", { name: getTranslation("Organizer.setup", locale), exact: true }),
      ).toBeVisible();
      await expect(
        page.getByLabel(getTranslation("Organizer.zone", locale), { exact: true }),
      ).toHaveValue("Europe/Tallinn");
      await expect(page.locator("#event-startsAt")).toHaveValue("2027-06-01T12:00");
      await page.getByText(getTranslation("Organizer.preview", locale), { exact: true }).click();
      await expect(page.locator('p[lang="et"]').first()).toBeVisible();
      await expect(
        page.getByText(getTranslation("Registration.contentFallback", locale), { exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath("setup.png"), fullPage: true });
      await page.goto("/admin/events/e/applications?studio=s");
      await expect(
        page.getByRole("heading", { name: "Synthetic studio", exact: true }),
      ).toBeVisible();
      await page.locator("#organization-status").selectOption("APPROVED");
      await page
        .getByRole("button", { name: getTranslation("Organizer.saveOrg", locale), exact: true })
        .click();
      await expect(
        page.getByText(getTranslation("Organizer.savedDecision", locale), { exact: true }),
      ).toBeVisible();
      expect(writes).toBe(1);
      await expect(page.locator("#event-decision")).toHaveValue("PENDING");
      await expect(
        page.getByRole("button", {
          name: getTranslation("Organizer.refresh", locale),
          exact: true,
        }),
      ).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath("review.png"), fullPage: true });
    });
  }
test("uncertain saved decision refreshes without repeating and preserves local choice", async ({
  page,
}) => {
  await setup(page, "en");
  const data = overview();
  let writes = 0;
  await page.route("**/api/v1/**", (route) => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().method() === "PATCH") {
      writes++;
      data.applications[0].registration.status = "REJECTED";
      data.applications[0].registration.revision = 2;
      data.applications[0].notifications = [
        {
          id: "n",
          kind: "EVENT",
          status: "REJECTED",
          reason: "CAPACITY",
          revision: 2,
          createdAt: "2026-11-12T10:00:00.000Z",
          delivery: "CANCELLED",
        },
      ];
      return route.abort();
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/applications?studio=s");
  await page.locator("#event-decision").selectOption("REJECTED");
  await page.locator("#decision-reason").selectOption("CAPACITY");
  await page.getByRole("button", { name: "Save event decision", exact: true }).click();
  await expect(
    page.getByText(getTranslation("Organizer.stale", "en"), { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save event decision", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Refresh server state", exact: true }).click();
  await expect(
    page.getByText(getTranslation("Organizer.expired", "en"), { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await expect(page.locator("#event-decision")).toHaveValue("REJECTED");
});
test("stale event setup retains input, compares server state and retries with fresh revision", async ({
  page,
}) => {
  await setup(page, "en");
  const data = event();
  let writes = 0;
  await page.route("**/api/v1/**", (route) => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().method() === "PATCH") {
      writes++;
      if (writes === 1) {
        data.revision++;
        data.city = "Server city";
        return route.fulfill({
          status: 409,
          json: { code: "CONFLICT", reason: "concurrentChange", params: {}, issues: [] },
        });
      }
      expect(route.request().postDataJSON().expectedRevision).toBe(2);
      return route.fulfill({ json: { ...data, ...route.request().postDataJSON() } });
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/setup");
  await page.locator("#event-city").fill("My local city");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh server state", exact: true }).click();
  await expect(page.locator("#event-city")).toHaveValue("My local city");
  await expect(page.getByText("Server city", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect(writes).toBe(2);
});
test("DST ambiguity needs explicit instant and stage change needs keyboard confirmation", async ({
  page,
}) => {
  await setup(page, "en");
  const data = event();
  let posted: unknown;
  await page.route("**/api/v1/**", (route) => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().method() === "PATCH") {
      posted = route.request().postDataJSON();
      return route.fulfill({ json: data });
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/setup");
  await page.locator("#event-startsAt").fill("2026-10-25T03:30");
  await page.locator("#event-endsAt").fill("2026-10-25T05:30");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText(getTranslation("Organizer.timeInvalid", "en"), { exact: true }),
  ).toBeVisible();
  expect(posted).toBeUndefined();
  await page.locator("#event-startsAt-offset").selectOption("2026-10-25T01:30:00.000Z");
  await page.locator("#event-stage").selectOption("REGISTRATION_OPEN");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  expect(posted).toBeUndefined();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() => posted)
    .toMatchObject({ startsAt: "2026-10-25T01:30:00.000Z", expectedStage: "PRE_REGISTRATION" });
});
test("organizer direct routes deny roleless access without loading private review", async ({
  page,
}) => {
  await setup(page, "en");
  let reads = 0;
  await page.route("**/api/v1/**", (route) => {
    if (!route.request().url().endsWith("/auth/profile")) reads++;
    return route.fulfill({ json: user(false) });
  });
  await page.goto("/admin/events/e/applications");
  await expect(page.getByRole("heading", { name: "Access denied", exact: true })).toBeVisible();
  expect(reads).toBe(0);
});

test("review session expiry preserves choice and requires refresh after sign-in", async ({ page }) => {
  await setup(page, "en"); const data = overview(); let expired = false; let writes = 0;
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { expired = false; return route.fulfill({ json: { session: "cookie", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u", name: user().name, email: user().email } } }); }
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().method() === "PATCH") { writes++; expired = true; return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } }); }
    return route.fulfill(expired ? { status: 401, json: { code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] } } : { json: data });
  });
  await page.goto("/admin/events/e/applications?studio=s"); await page.locator("#event-decision").selectOption("REJECTED"); await page.locator("#decision-reason").selectOption("INCOMPLETE_DETAILS"); await page.getByRole("button", { name: "Save event decision", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await dialog.getByLabel("Password", { exact: true }).fill("password123"); await dialog.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(dialog).not.toBeVisible();
  await expect(page.locator("#decision-reason")).toHaveValue("INCOMPLETE_DETAILS"); await expect(page.getByRole("button", { name: "Save event decision", exact: true })).toBeDisabled(); await page.getByRole("button", { name: "Refresh server state", exact: true }).click(); await expect(page.getByRole("button", { name: "Save event decision", exact: true })).toBeEnabled(); expect(writes).toBe(1);
});

test("notification retry is separate from a saved decision and never claims inbox delivery", async ({ page }) => {
  await setup(page, "en"); const data = overview(); let retries = 0; let decisions = 0;
  data.applications[0].notifications = [{ id: "n", kind: "EVENT", status: "APPROVED", reason: null, revision: 1, createdAt: "2026-11-12T10:00:00.000Z", delivery: "CANCELLED" }];
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/profile")) return route.fulfill({ json: user() });
    if (route.request().url().endsWith("/retry")) { retries++; data.applications[0].notifications[0].delivery = "PENDING"; return route.fulfill({ status: 204 }); }
    if (route.request().method() === "PATCH") decisions++;
    return route.fulfill({ json: data });
  });
  await page.goto("/admin/events/e/applications?studio=s"); await page.getByRole("button", { name: "Retry notification", exact: true }).click(); await expect(page.getByText(getTranslation("Organizer.queued", "en"), { exact: true })).toBeVisible(); expect(retries).toBe(1); expect(decisions).toBe(0); await expect(page.getByRole("button", { name: "Retry notification", exact: true })).toHaveCount(0);
});

test("missing selected application is distinct from an unselected empty queue", async ({ page }) => {
  await setup(page, "en"); const data = overview(); data.applications = [];
  await page.route("**/api/v1/**", route => route.fulfill({ json: route.request().url().endsWith("/auth/profile") ? user() : data }));
  await page.goto("/admin/events/e/applications?studio=missing"); await expect(page.getByText(getTranslation("Organizer.missingApplication", "en"), { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Save event decision", exact: true })).toHaveCount(0);
});
