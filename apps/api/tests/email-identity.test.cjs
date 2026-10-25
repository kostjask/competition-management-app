const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EmailSchema, LoginSchema, RegisterSchema, CreateInvitationSchema } = require('@dance/schemas');

test('account and invitation inputs share canonical email identity', () => {
  const email = '  Person.Tag+Studio@Example.INVALID  ';
  const expected = 'person.tag+studio@example.invalid';
  assert.equal(EmailSchema.parse(email), expected);
  assert.equal(LoginSchema.parse({ email, password: 'password123' }).email, expected);
  assert.equal(RegisterSchema.parse({ email, name: 'Fixture', password: 'password123' }).email, expected);
  assert.equal(CreateInvitationSchema.parse({ email, roleKey: 'judge', eventId: 'fixture' }).email, expected);
  assert.notEqual(EmailSchema.parse('person@example.invalid'), expected);
  for (const invalid of ['person @example.invalid', '\tperson@example.invalid', 'person@example.invalid\n', 'pérson@example.invalid', 'K@example.invalid']) {
    assert.equal(EmailSchema.safeParse(invalid).success, false);
  }
});
