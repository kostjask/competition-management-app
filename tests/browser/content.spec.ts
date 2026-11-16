import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CmsPayloadSchema, CmsIndexSchema, CmsEditionCreateSchema, emptyCmsPayload, cmsReadiness, cmsText, type CmsDocument, type CmsPayload, type CmsPublic, type UserProfile } from "../../packages/schemas/src/index";
import { contentTranslations, type ContentKey } from "../../apps/web/src/i18n/contentTranslations";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { Locale } from "../../apps/web/src/i18n/locale";
const id = "11111111-1111-4111-8111-111111111111"; const portalId = "22222222-2222-4222-8222-222222222222";
const label = (key: ContentKey, locale: Locale = "en") => contentTranslations[key][locale];
const profile = (admin = true): UserProfile => ({ id: "admin", name: "Synthetic director", email: "director@example.invalid", preferredLocale: null, createdAt: "2026-01-01T00:00:00.000Z", isAdmin: admin, roles: [], permissions: [] });
function cmsDocument(kind: CmsPayload["kind"], documentId: string): CmsDocument {
  const payload = emptyCmsPayload(kind); payload.title = { sourceLocale: "et", sourceText: "Stuudio", translations: { en: "Studio" } }; payload.introduction = { sourceLocale: "et", sourceText: "Tekst <script>literal</script>", translations: {} }; payload.metadata = { sourceLocale: "et", sourceText: "Kirjeldus", translations: {} }; payload.contact.email = "public@example.invalid";
  return { id: documentId, kind, version: 1, editionId: null, label: kind, slug: null, festivalSlug: null, archived: false, everPublished: false, draft: { id: randomUUID(), number: 1, createdAt: "2026-01-01T00:00:00.000Z", payload }, publishedRevisionId: null, assets: [], facts: null };
}
async function install(page: Page, locale: Locale = "en", width = 390) {
  await page.setViewportSize({ width, height: 950 }); await page.addInitScript(value => localStorage.setItem("app-language", value), locale);
  const state = { ...CmsIndexSchema.parse({ documents: [cmsDocument("STUDIO_SITE", id), cmsDocument("FESTIVAL_PORTAL", portalId)], festivals: [] }), admin: true, valid: true, writes: [] as Record<string, unknown>[], lost: false, conflict: false, failRead: false, receipts: new Map<string, unknown>(), publishCount: 0, policyDigest: 'a'.repeat(64) };
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method();
    const failure = (status: number, reason: string) => route.fulfill({ status, json: { code: "ERROR", reason, issues: [], params: {} } });
    if (path.endsWith("/auth/login")) { state.valid = true; return route.fulfill({ json: { session: "cookie", expiresAt: "2090-01-01T00:00:00.000Z", user: { id: "admin", email: profile().email, name: profile().name } } }); }
    if (!state.valid) return failure(401, "authenticationRequired");
    if (path.endsWith("/auth/profile")) return route.fulfill({ json: profile(state.admin) });
    if (!state.admin) return failure(403, "permissionDenied");
    if (state.failRead && method === "GET") return route.abort();
    if (path === "/api/v1/content/documents" && method === "GET") return route.fulfill({ json: { documents: state.documents, festivals: state.festivals } });
    if (path === "/api/v1/content/documents" && method === "POST") {
      const body: Record<string,unknown> = route.request().postDataJSON(); state.writes.push(body);
      const doc=cmsDocument(body.kind==='STUDIO_SITE'?'STUDIO_SITE':'FESTIVAL_PORTAL',randomUUID()); state.documents.push(doc);
      const receipt={operationId:body.operationId,documentId:doc.id,version:doc.version,revisionId:doc.draft.id,kind:'INITIALIZE',createdAt:doc.draft.createdAt}; state.receipts.set(String(body.operationId),receipt);
      if(state.lost){state.lost=false;return route.abort();} return route.fulfill({json:receipt});
    }
    const doc = state.documents.find(row => path.includes(row.id)); if (!doc) return failure(404, "recordNotFound");
    if (path.includes("/operations/")) { const value = state.receipts.get(path.split("/").at(-1)!); return value ? route.fulfill({ json: value }) : failure(404, "recordNotFound"); }
    if (path.endsWith("/preview")) {
      const requestedLocale = url.searchParams.get("locale") === "ru" ? "ru" : url.searchParams.get("locale") === "en" ? "en" : "et";
      const payload = doc.draft.payload;
      const content: CmsPublic = { kind: payload.kind, identity: null, revisionId: doc.draft.id, publishedAt: doc.draft.createdAt, requestedLocale, primaryLocale: "et", fields: ["title", "introduction"].flatMap(key => { const text = key === "title" ? payload.title : payload.introduction; return text ? [{ path: key, value: cmsText(text, requestedLocale) }] : []; }), images: [], links: [], facts: null, policyChanged: false, action: { kind: "contact", email: payload.contact.email, phone: null }, timetable: [], profiles: [], classes: [], brand: null, startsOn: null, endsOn: null };
      return route.fulfill({ json: { content, issues: cmsReadiness(payload), policyDigest: state.policyDigest, facts: doc.facts } });
    }
    if (path.endsWith("/revisions") && method === "GET") return route.fulfill({ json: [doc.draft] });
    if (method === "GET") return route.fulfill({ json: doc });
    const body: Record<string, unknown> = route.request().postDataJSON(); state.writes.push(body);
    if (state.conflict) return failure(409, "concurrentChange");
    const old = state.receipts.get(String(body.operationId)); if (old) return route.fulfill({ json: old });
    if (body.expectedVersion !== doc.version) return failure(409, "concurrentChange");
    if (path.endsWith("/publish") && body.policyDigest !== state.policyDigest) return failure(409, "concurrentChange");
    if (path.endsWith("/revisions")) doc.draft = { id: randomUUID(), number: doc.draft.number + 1, createdAt: doc.draft.createdAt, payload: CmsPayloadSchema.parse(body.payload) };
    if (path.endsWith("/publish")) { doc.publishedRevisionId = String(body.revisionId); state.publishCount++; }
    if (path.endsWith("/unpublish")) doc.publishedRevisionId = null;
    doc.version++; const receipt = { operationId: body.operationId, documentId: doc.id, version: doc.version, revisionId: doc.draft.id, kind: "COMMAND", createdAt: doc.draft.createdAt }; state.receipts.set(String(body.operationId), receipt);
    if (state.lost) { state.lost = false; return route.abort(); } return route.fulfill({ json: receipt });
  }); return state;
}
for (const locale of ["et", "en", "ru"] as const) for (const width of [320, 390, 768, 1440]) {
  test(`${locale} S20 save preview publish and keyboard at ${width}px`, async ({ page }, info) => {
    const state = await install(page, locale, width); await page.goto("/content/studio"); await expect(page.locator("#cms-title-sourceText")).toHaveValue("Stuudio");
    await page.locator("#cms-title-sourceText").fill("Muudetud"); await expect(page.getByText(label("unsaved",locale),{exact:true})).toBeVisible();
    await expect(page.getByRole("button", { name: label("preview",locale),exact:true })).toBeDisabled();
    await page.getByRole("button",{name:label("save",locale),exact:true}).click(); await expect(page.getByText(label("saved",locale),{exact:true})).toBeVisible(); expect(state.writes).toHaveLength(1); expect(state.publishCount).toBe(0);
    await page.locator("#cms-preview-locale").selectOption("ru"); await page.getByRole("button",{name:label("preview",locale),exact:true}).click();
    await expect(page.locator('.cms-preview h2[lang="et"]')).toHaveText("Muudetud"); await expect(page.locator('.cms-preview p[lang="et"]').filter({hasText:"<script>literal</script>"})).toBeVisible(); await expect(page.locator(".cms-preview script")).toHaveCount(0);
    await expect(page.getByRole("region", { name: label("preview", locale), exact: true })).toBeFocused();
    if (locale === "en" && width === 390) await page.screenshot({ path: info.outputPath("content-preview-390.png"), fullPage: true });
    await page.getByRole("button", { name: label("backToEditor", locale), exact: true }).click();
    await expect(page.getByRole("button", { name: label("preview", locale), exact: true })).toBeFocused();
    await page.getByRole("button",{name:label("publish",locale),exact:true}).click(); const region = page.locator(".cms-confirm"); await expect(region).toBeFocused(); await region.getByRole("button",{name:label("cancel",locale),exact:true}).click(); await expect(page.getByRole("button",{name:label("publish",locale),exact:true})).toBeFocused(); expect(state.publishCount).toBe(0);
    await page.getByRole("button",{name:label("publish",locale),exact:true}).click(); await region.getByRole("checkbox").check(); await region.getByRole("button",{name:label("confirm",locale),exact:true}).click(); await expect(page.getByText(label("saved",locale),{exact:true})).toBeVisible(); expect(state.publishCount).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`content-${locale}-${width}.png`),fullPage:true});
  });
}
test("S20 lost acknowledgement reconciles receipt without replay and retains local work", async ({page}) => {
  const state = await install(page); await page.goto("/content/studio"); await page.locator("#cms-title-sourceText").fill("Saved but uncertain"); state.lost = true;
  await page.getByRole("button",{name:label("save"),exact:true}).click(); await expect(page.getByRole("button",{name:label("reconcile"),exact:true})).toBeVisible(); await expect(page.locator("#cms-title-sourceText")).toHaveValue("Saved but uncertain"); await expect(page.locator("#cms-title-sourceText")).toBeDisabled();
  state.failRead = true; await page.getByRole("button",{name:label("reconcile"),exact:true}).click(); await expect(page.locator(".cms-error-summary")).toBeVisible(); state.failRead = false;
  await page.getByRole("button",{name:label("reconcile"),exact:true}).click(); await expect(page.getByText(label("server"),{exact:true})).toBeVisible(); expect(state.writes).toHaveLength(1); await expect(page.getByRole("button",{name:label("retrySame"),exact:true})).toBeDisabled();
  await page.getByRole("button",{name:label("useServer"),exact:true}).click(); await expect(page.locator("#cms-title-sourceText")).toBeEnabled(); expect(state.writes).toHaveLength(1);
});
test("S20 concurrent administrator conflict keeps local edits until explicit reconciliation", async ({page}) => {
  const state = await install(page); await page.goto("/content/studio"); await page.locator("#cms-title-sourceText").fill("My title"); state.conflict = true;
  await page.getByRole("button",{name:label("save"),exact:true}).click(); state.documents[0]!.version = 2; state.documents[0]!.draft.payload.title!.sourceText = "Other title";
  await page.getByRole("button",{name:label("reconcile"),exact:true}).click(); await expect(page.locator('[id="cms-comparison.title-sourceText"]')).toHaveValue("Other title"); await expect(page.locator("#cms-title-sourceText")).toHaveValue("My title");
  await page.getByRole("button",{name:label("keepLocal"),exact:true}).click(); state.conflict = false; await page.getByRole("button",{name:label("save"),exact:true}).click(); await expect(page.getByText(label("saved"),{exact:true})).toBeVisible(); expect(state.writes[1]?.expectedVersion).toBe(2);
});
test("S20 mounted session recovery requires receipt check and explicit same-operation retry", async ({page}) => {
  const state = await install(page); await page.goto("/content/studio"); await page.locator("#cms-title-sourceText").fill("Retained work"); state.valid = false;
  await page.getByRole("button",{name:label("save"),exact:true}).click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await dialog.getByLabel(getTranslation("Shell.password","en"),{exact:true}).fill("password123"); await dialog.getByRole("button",{name:getTranslation("Shell.login","en"),exact:true}).click(); await expect(dialog).not.toBeVisible(); await expect(page.locator("#cms-title-sourceText")).toHaveValue("Retained work"); expect(state.writes).toHaveLength(0);
  await page.getByRole("button",{name:label("reconcile"),exact:true}).click(); await page.getByRole("button",{name:label("retrySame"),exact:true}).click(); await expect(page.getByText(label("saved"),{exact:true})).toBeVisible(); expect(state.writes).toHaveLength(1);
});
test("S20 collections use stable identities and language changes retain edits", async ({page}) => {
  const state = await install(page); await page.goto("/content/studio?section=teachers"); await page.getByRole("button",{name:label("add")+" "+label("teachers"),exact:true}).click(); await page.locator('[id="cms-teachers.0.name"]').fill("Synthetic teacher");
  await page.getByRole("button",{name:"Русский",exact:true}).click(); await expect(page.locator('[id="cms-teachers.0.name"]')).toHaveValue("Synthetic teacher");
  await page.getByRole("button",{name:label("save","ru"),exact:true}).click(); await expect(page.getByText(label("saved","ru"),{exact:true})).toBeVisible(); const payload = CmsPayloadSchema.parse(state.writes[0]?.payload); expect(payload.kind).toBe("STUDIO_SITE"); if (payload.kind === "STUDIO_SITE") expect(payload.teachers[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
});

test("S20 changing documents clears a previous publication confirmation", async ({ page }) => {
  const state = await install(page);
  await page.goto("/content/studio");
  await page.getByRole("button", { name: label("preview"), exact: true }).click();
  await page.getByRole("button", { name: label("publish"), exact: true }).click();
  await expect(page.locator(".cms-confirm")).toBeVisible();
  await page.locator(".cms-mast").getByRole("link", { name: label("festivals"), exact: true }).click();
  await expect(page.locator("#cms-title-sourceText")).toHaveValue("Stuudio");
  await expect(page.locator(".cms-confirm")).toHaveCount(0);
  expect(state.publishCount).toBe(0);
});

test("S20 changed policy requires a fresh preview and explicit publication review", async ({ page }) => {
  const state = await install(page);
  await page.goto("/content/studio");
  await page.getByRole("button", { name: label("preview"), exact: true }).click();
  state.policyDigest = 'b'.repeat(64);
  await page.getByRole("button", { name: label("publish"), exact: true }).click();
  await page.locator(".cms-confirm").getByRole("checkbox").check();
  await page.locator(".cms-confirm").getByRole("button", { name: label("confirm"), exact: true }).click();
  await expect(page.locator(".cms-error-summary")).toBeVisible();
  expect(state.publishCount).toBe(0);
  expect(state.writes[0]?.policyDigest).toBe('a'.repeat(64));
  await page.getByRole("button", { name: label("reconcile"), exact: true }).click();
  await expect(page.getByRole("button", { name: label("retrySame"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: label("useServer"), exact: true }).click();
  await expect(page.getByRole("button", { name: label("publish"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: label("preview"), exact: true }).click();
  await page.getByRole("button", { name: label("publish"), exact: true }).click();
  await page.locator(".cms-confirm").getByRole("checkbox").check();
  await page.locator(".cms-confirm").getByRole("button", { name: label("confirm"), exact: true }).click();
  await expect(page.getByText(label("saved"), { exact: true })).toBeVisible();
  expect(state.publishCount).toBe(1);
  expect(state.writes[1]?.policyDigest).toBe('b'.repeat(64));
});

test("S20 delayed preview cannot move into another document", async ({ page }) => {
  await install(page);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/content/documents/${id}/preview?**`, async route => { await gate; await route.fallback(); });
  await page.goto("/content/studio");
  await page.getByRole("button", { name: label("preview"), exact: true }).click();
  await page.getByRole("navigation", { name: getTranslation("Shell.navigation", "en") }).getByRole("link", { name: label("festivals"), exact: true }).click();
  await expect(page).toHaveURL(/\/content\/festivals$/);
  release();
  await expect(page.getByRole("button", { name: label("preview"), exact: true })).toBeEnabled();
  await expect(page.locator(".cms-preview-result")).toHaveCount(0);
});

test("S20 festival copy selection and canonical edition facts stay separate", async ({ page }, info) => {
  const state = await install(page, "en", 768);
  const festivalId = randomUUID();
  state.festivals.push({ id: festivalId, name: "Synthetic festival", slug: "synthetic" });
  const source = cmsDocument("FESTIVAL_EDITION", randomUUID());
  source.editionId = randomUUID(); source.slug = "2027"; source.festivalSlug = "synthetic"; source.label = "Synthetic festival / 2027";
  source.facts = { eventId: "synthetic-event", startsAt: "2027-01-01T10:00:00.000Z", endsAt: "2027-01-02T10:00:00.000Z", timeZone: "Europe/Tallinn", venue: "Canonical hall", registrationDeadline: null, entrySettings: null };
  state.documents.push(source);
  await page.route("**/api/v1/content/editions", async route => {
    const body = CmsEditionCreateSchema.parse(route.request().postDataJSON()); state.writes.push(body);
    const draft = cmsDocument("FESTIVAL_EDITION", randomUUID());
    draft.editionId = randomUUID(); draft.slug = body.slug; draft.festivalSlug = "synthetic"; draft.label = "Synthetic festival / " + body.slug;
    state.documents.push(draft);
    const portal = state.documents.find(row => row.id === portalId)!; portal.version++;
    await route.fulfill({ json: { operationId: body.operationId, documentId: portalId, kind: "EDITION", version: portal.version, revisionId: draft.draft.id, createdAt: draft.draft.createdAt } });
  });
  await page.goto("/content/festivals");
  await page.locator(".cms-index summary").filter({ hasText: label("createEdition") }).click();
  await page.locator("#cms-new-festival").selectOption(festivalId);
  await page.locator("#cms-edition-slug").fill("2028");
  await page.locator("#cms-copy").selectOption(source.id);
  await page.locator(".cms-index").getByLabel(label("rules"), { exact: true }).check();
  await page.getByRole("button", { name: label("createEdition"), exact: true }).click();
  await expect(page.locator(".cms-index").getByRole("link", { name: "Synthetic festival / 2028", exact: true })).toBeVisible();
  expect(state.writes[0]).toMatchObject({ festivalId, slug: "2028", copyDocumentId: source.id, sections: ["rules"], expectedVersion: 1 });
  await page.locator(".cms-index").getByRole("link", { name: source.label, exact: true }).click();
  await expect(page.locator(".cms-facts")).toContainText("Canonical hall");
  await expect(page.locator(".cms-facts").getByRole("link", { name: label("setup"), exact: true })).toHaveAttribute("href", "/admin/events/synthetic-event/setup");
  await page.locator("#cms-section").selectOption("startsOn");
  await expect(page.locator("#cms-startsOn")).toBeDisabled();
  source.facts.venue = "Updated canonical hall";
  await page.getByRole("button", { name: label("preview"), exact: true }).click();
  await expect(page.locator(".cms-facts")).toContainText("Updated canonical hall");
  await page.screenshot({ path: info.outputPath("content-edition-canonical-768.png"), fullPage: true });
});
test("S20 ordinary users receive denied navigation and no CMS requests", async ({page}) => {
  const state = await install(page); state.admin = false; await page.goto("/content/studio"); await expect(page.getByRole("heading",{name:getTranslation("Access.denied","en"),exact:true})).toBeVisible(); await expect(page.getByRole("link",{name:label("studio"),exact:true})).toHaveCount(0); expect(state.writes).toHaveLength(0);
});
test("S20 validation summary focuses the exact field and leaves it in keyboard order",async({page})=>{
  const state=await install(page); await page.goto('/content/studio?section=teachers'); await page.getByRole('button',{name:label('add')+' '+label('teachers'),exact:true}).click();
  await page.getByRole('button',{name:label('save'),exact:true}).click(); await expect(page.locator('.cms-error-summary')).toBeFocused(); expect(state.writes).toHaveLength(0);
  await page.locator('.cms-error-summary a').first().click(); const field=page.locator('[id="cms-teachers.0.name"]'); await expect(field).toBeFocused(); expect(await field.getAttribute('tabindex')).toBeNull(); await field.fill('Corrected teacher');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:label('add')+' '+label('biography'),exact:true})).toBeFocused();
  await page.getByRole('button',{name:label('save'),exact:true}).click(); await expect(page.getByText(label('saved'),{exact:true})).toBeVisible();
});
test('S20 loading, read failure, retry and explicit first creation stay distinct',async({page},info)=>{
  const state=await install(page); state.documents=[]; let release=()=>{}; const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/v1/content/documents',async route=>{await gate;await route.fallback();});
  await page.goto('/content/studio'); await expect(page).toHaveTitle(label('title')+' | '+getTranslation('Shell.brand','en')); await expect(page.locator('.cms-loading')).toBeVisible(); await expect(page.locator('.cms-loading div')).toHaveCount(3); await page.screenshot({path:info.outputPath('content-loading.png'),fullPage:true});
  state.failRead=true; release(); await expect(page.locator('.cms-error-summary')).toBeVisible(); expect(state.writes).toHaveLength(0);
  state.failRead=false; await page.getByRole('button',{name:label('retry'),exact:true}).click(); await expect(page.getByText(label('empty'),{exact:true})).toBeVisible(); expect(state.writes).toHaveLength(0);
  state.lost=true; await page.getByRole('button',{name:label('add')+' '+label('studio'),exact:true}).click(); await expect(page.getByRole('button',{name:label('reconcile'),exact:true})).toBeVisible();
  await page.getByRole('button',{name:label('reconcile'),exact:true}).click(); await page.getByRole('button',{name:label('useServer'),exact:true}).click(); await expect(page.locator('#cms-title-sourceText')).toBeVisible(); expect(state.writes).toHaveLength(1);
  await page.setViewportSize({width:1920,height:1080}); await expect(page.locator('.cms-workbench')).toBeVisible(); expect(await page.locator('.cms-workbench').evaluate(element=>element.getBoundingClientRect().width)).toBeLessThanOrEqual(1280);
  await page.screenshot({path:info.outputPath('content-capped-1920.png'),fullPage:true});
});
