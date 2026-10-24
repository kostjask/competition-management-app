import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { translations, getTranslation, translate } from "../src/i18n/translations";
import { errorMessages, validationMessages, successMessages } from "../src/i18n/feedback";
import { resolveLocale, initialLocale, SUPPORTED_LOCALES } from "../src/i18n/locale";
import { LanguageContext } from "../src/i18n/LanguageContext";
import { ErrorFeedback } from "../src/components/ErrorFeedback";
import { LanguageSelector } from "../src/components/LanguageSelector";
import { ApiError, toUiError, parseApiError } from "../src/api/error";
import { formatError, formatIssue } from "../src/i18n/errors";
import { CreateEventBodySchema, UpdatePerformanceBodySchema, CreateDancerBodySchema, RegisterSchema, validationIssues, ErrorReasonSchema, ValidationRuleSchema, SuccessMessageIdSchema } from "@dance/schemas";

test("catalogues have complete nonempty ET/EN/RU values and matching placeholders/plural forms", () => {
  for (const dictionary of [errorMessages, validationMessages, successMessages, ...Object.values(translations)]) {
    for (const value of Object.values(dictionary)) {
      let expected: string | undefined;
      for (const locale of SUPPORTED_LOCALES) {
        assert.ok(locale in value); const localized = value[locale];
        const forms = typeof localized === "string" ? [localized] : Object.values(localized);
        if (typeof localized !== "string") { assert.ok(localized.other); for (const category of new Intl.PluralRules(locale).resolvedOptions().pluralCategories) assert.ok(category in localized); }
        for (const form of forms) {
          assert.equal(typeof form, "string"); assert.ok(form.trim()); assert.ok(!form.includes("???"));
          const placeholders = JSON.stringify([...form.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort());
          expected ??= placeholders; assert.equal(placeholders, expected);
        }
      }
    }
  }
  assert.deepEqual(Object.keys(errorMessages).sort(), [...ErrorReasonSchema.options].sort());
  assert.deepEqual(Object.keys(validationMessages).sort(), [...ValidationRuleSchema.options].sort());
  assert.deepEqual(Object.keys(successMessages).sort(), [...SuccessMessageIdSchema.options].sort());
});

test("locale policy rejects malformed storage and chooses a supported browser language or ET", () => {
  assert.equal(resolveLocale("en", ["ru-RU"]), "en");
  for (const saved of [null, "", "de", "__proto__", 123]) assert.equal(resolveLocale(saved, ["de-DE", "ru-RU"]), "ru");
  assert.equal(resolveLocale("invalid", ["zz"]), "et");
  assert.equal(resolveLocale(null, ["EN-us"]), "en");
});

test("typed interpolation and Russian plural rules handle zero/one/few/many/fractions safely", () => {
  assert.equal(getTranslation("Feedback.items", "en", { count: 1 }), "1 item");
  assert.equal(getTranslation("Feedback.items", "et", { count: 0 }), "0 kirjet");
  for (const [count, suffix] of [[0, "записей"], [1, "запись"], [2, "записи"], [5, "записей"], [11, "записей"], [21, "запись"], [1.5, "записи"]] as const) assert.ok(getTranslation("Feedback.items", "ru", { count }).endsWith(suffix));
  for (const [key, params] of [["Missing.key", {}], ["Feedback.items", {}], ["Feedback.items", { count: NaN }]] as const) assert.equal(translate(key, "en", params), translations.Feedback.fallback.en);
  assert.equal(translate("Common.save", "invalid"), translations.Common.save.et);
});

test("one stored error re-renders in all locales without technical prose or a new request", () => {
  const descriptor = toUiError(parseApiError(403, { code: "FORBIDDEN", reason: "stageLocked", error: "PRIVATE ACCOUNT AND SQL", params: {}, issues: [] }));
  const outputs = SUPPORTED_LOCALES.map(locale => renderToStaticMarkup(<LanguageContext.Provider value={{ locale, setLocale: () => {} }}><ErrorFeedback error={descriptor} /></LanguageContext.Provider>));
  assert.equal(new Set(outputs).size, 3);
  for (const output of outputs) { assert.ok(output.includes('role="alert"')); assert.ok(!output.includes("PRIVATE")); }
  for (const legacy of [{ error: "PRIVATE" }, { reason: "futureReason", error: "PRIVATE" }, null]) assert.equal(formatError(toUiError(parseApiError(500, legacy)), "en"), errorMessages.unexpected.en);
  assert.equal(formatError(toUiError(new Error("PRIVATE")), "ru"), errorMessages.unexpected.ru);
});

test("shared validation preserves nested/root/date/range/duplicate rules and safe bounds", () => {
  const cases = [
    CreateEventBodySchema.safeParse({ name: " ", startsAt: "2026-11-02T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" }),
    UpdatePerformanceBodySchema.safeParse({ dancerIds: ["d", "d"] }),
    UpdatePerformanceBodySchema.safeParse({}),
    CreateDancerBodySchema.safeParse({ firstName: "D", lastName: "D", birthDate: "2025-02-29" }),
    RegisterSchema.safeParse({ email: "private-invalid", name: "N", password: "short" }),
  ];
  const rules = new Set<string>();
  for (const result of cases) {
    assert.equal(result.success, false); if (result.success) continue;
    const local = validationIssues(result.error.issues); const remote = toUiError(parseApiError(400, { reason: "invalidInput", issues: local }));
    assert.deepEqual(remote.issues, local);
    for (const locale of SUPPORTED_LOCALES) for (const issue of local) { rules.add(issue.rule); assert.ok(formatIssue(issue, locale)); assert.ok(!JSON.stringify(issue).includes("private-invalid")); }
  }
  for (const rule of ["too_small", "invalid_format", "dateOrder", "duplicate", "nonemptyPatch"]) assert.ok(rules.has(rule));
  const error = toUiError(new ApiError(400, "PRIVATE", undefined, "VALIDATION_ERROR", "invalidInput", {}, [{ path: ["name"], rule: "too_small", params: { minimum: 2 } }]));
  const output = renderToStaticMarkup(<LanguageContext.Provider value={{ locale: "en", setLocale: () => {} }}><ErrorFeedback error={error} fields={{ name: "name" }} /></LanguageContext.Provider>);
  assert.ok(output.includes('href="#name"')); assert.ok(!output.includes("PRIVATE"));
});

test("language selector uses native names and an accessible selected state", () => {
  const output = renderToStaticMarkup(<LanguageContext.Provider value={{ locale: "ru", setLocale: () => {} }}><LanguageSelector /></LanguageContext.Provider>);
  assert.ok(output.includes("Eesti")); assert.ok(output.includes("English")); assert.ok(output.includes("Русский")); assert.equal((output.match(/aria-pressed="true"/g) ?? []).length, 1);
});


test("initialization tolerates unavailable storage and unknown/nested validation stays safe", t => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const browser = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  t.after(() => { if (storage) Object.defineProperty(globalThis, "localStorage", storage); else Reflect.deleteProperty(globalThis, "localStorage"); if (browser) Object.defineProperty(globalThis, "navigator", browser); else Reflect.deleteProperty(globalThis, "navigator"); });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Unavailable"); } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { languages: ["ru-RU"] } });
  assert.equal(initialLocale(), "ru");
  for (const result of [RegisterSchema.safeParse({}), UpdatePerformanceBodySchema.safeParse({ dancerIds: [42] })]) {
    assert.equal(result.success, false); if (result.success) continue;
    const issues = validationIssues(result.error.issues); assert.ok(issues.some(issue => issue.rule === "invalid_type"));
    if (issues.some(issue => issue.path[0] === "dancerIds")) assert.deepEqual(issues[0].path, ["dancerIds", 0]);
  }
  const future = RegisterSchema.refine(() => false, { params: { reason: "futureRule" } }).safeParse({ email: "fixture@example.invalid", name: "Fixture", password: "fixture-password" });
  assert.equal(future.success, false); if (future.success) return;
  assert.equal(validationIssues(future.error.issues)[0].rule, "invalid");
  const remote = toUiError(parseApiError(400, { reason: "invalidInput", issues: [{ path: ["name"], rule: "futureRule", params: {} }] }));
  assert.equal(formatError(remote, "en"), errorMessages.invalidInput.en);
  const descriptor = toUiError(new ApiError(400, "Private", undefined, "VALIDATION_ERROR", "invalidInput", {}, [{ path: ["__proto__"], rule: "invalid", params: {} }]));
  const output = renderToStaticMarkup(<LanguageContext.Provider value={{ locale: "en", setLocale: () => {} }}><ErrorFeedback error={descriptor} /></LanguageContext.Provider>);
  assert.ok(!output.includes("href="));
});
