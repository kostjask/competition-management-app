const assert = require('node:assert/strict');
const { test } = require('node:test');
const { assertApplicationWindow, assertStageTransition } = require('../dist/services/registrationPolicy.js');
const { AuthoredContentSchema, resolveAuthoredContent, EventTimeZoneSchema, CreateEventBodySchema } = require('@dance/schemas');

test('registration cutoff is exclusive and uses instants across Tallinn DST boundaries', () => {
  for (const deadline of ['2026-03-29T01:00:00Z', '2026-10-25T01:00:00Z']) {
    const instant = new Date(deadline);
    const event = { stage: 'REGISTRATION_OPEN', registrationDeadline: instant };
    assert.doesNotThrow(() => assertApplicationWindow(event, new Date(+instant - 1)));
    assert.throws(() => assertApplicationWindow(event, instant));
    assert.throws(() => assertApplicationWindow(event, new Date(+instant + 1)));
  }
  assert.equal(+new Date('2026-10-25T03:30:00+03:00') + 3600000, +new Date('2026-10-25T03:30:00+02:00'));
  assert.doesNotThrow(() => assertApplicationWindow({ stage: 'PRE_REGISTRATION', registrationDeadline: null }));
  for (const stage of ['DATA_REVIEW', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    assert.throws(() => assertApplicationWindow({ stage, registrationDeadline: null }));
  }
  for (const timeZone of ['UTC', 'Europe/Tallinn', 'America/New_York']) assert.equal(EventTimeZoneSchema.safeParse(timeZone).success, true);
  assert.equal(EventTimeZoneSchema.safeParse('Mars/Olympus').success, false);
  assert.equal(CreateEventBodySchema.safeParse({ name: 'DST', startsAt: '2026-03-29T03:30:00', endsAt: '2026-03-29T05:00:00' }).success, false);
});

test('M2 stages enforce forward transitions, expected state and bounded cancellation', () => {
  for (const [from, to] of [['PRE_REGISTRATION', 'REGISTRATION_OPEN'], ['REGISTRATION_OPEN', 'DATA_REVIEW'], ['DATA_REVIEW', 'CANCELLED']]) {
    assert.doesNotThrow(() => assertStageTransition(from, to, from));
    assert.throws(() => assertStageTransition(from, to, 'ENDED'));
  }
  for (const [from, to] of [['PRE_REGISTRATION', 'DATA_REVIEW'], ['DATA_REVIEW', 'REGISTRATION_OPEN'], ['DATA_REVIEW', 'FINALIZED'], ['ENDED', 'CANCELLED']]) {
    assert.throws(() => assertStageTransition(from, to, from));
  }
});

test('M2 authored content declares actual language and explicit source fallback for all locales', () => {
  for (const sourceLocale of ['et', 'en', 'ru']) {
    const content = AuthoredContentSchema.parse({ sourceLocale, sourceText: 'Source title', translations: {} });
    for (const locale of ['et', 'en', 'ru']) {
      assert.deepEqual(resolveAuthoredContent(content, locale), { text: 'Source title', lang: sourceLocale, fallback: locale !== sourceLocale });
      if (locale !== sourceLocale) {
        const translated = AuthoredContentSchema.parse({ ...content, translations: { [locale]: 'Authored translation' } });
        assert.deepEqual(resolveAuthoredContent(translated, locale), { text: 'Authored translation', lang: locale, fallback: false });
      }
    }
  }
  for (const value of [
    { sourceLocale: 'fi', sourceText: 'Source', translations: {} },
    { sourceLocale: 'et', sourceText: ' ', translations: {} },
    { sourceLocale: 'et', sourceText: 'Source', translations: { ru: ' ' } },
    { sourceLocale: 'et', sourceText: 'Source', translations: { et: 'Other' } },
  ]) assert.equal(AuthoredContentSchema.safeParse(value).success, false);
});
