import assert from "node:assert/strict";
import { test } from "node:test";
import { getTranslation } from "../src/i18n/translations";
import { AuthoredContentSchema, resolveAuthoredContent } from "@dance/schemas";

test("M2 statuses, next actors, review reasons and content fallback have ET/EN/RU copy", () => {
  const keys = ["pending", "approved", "rejected", "cancelled", "locked", "organizerNext", "applicantNext",
    "contactOrganizer", "incompleteDetails", "ineligible", "capacity", "contentFallback"] as const;
  for (const locale of ["et", "en", "ru"] as const) {
    for (const key of keys) {
      const text = getTranslation(`Registration.${key}`, locale);
      assert.ok(text.trim()); assert.notEqual(text, key); assert.ok(!text.startsWith("Registration."));
    }
    const content = AuthoredContentSchema.parse({ sourceLocale: "et", sourceText: "Autori tekst", translations: { en: "Authored text" } });
    const result = resolveAuthoredContent(content, locale);
    assert.equal(result.lang, locale === "ru" ? "et" : locale);
    assert.equal(result.fallback, locale === "ru");
  }
});
