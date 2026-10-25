const assert = require('node:assert/strict');
const { test } = require('node:test');

test('email stub never logs secret delivery arguments', async t => {
  const email = require('../dist/utils/email.js');
  const output = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => output.push(args));
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  const data = { to: 'private@example.invalid', token: 'synthetic-secret', name: 'Private', roleKey: 'judge' };
  await email.sendVerificationEmail(data);
  await email.sendInvitationEmail(data);
  assert.deepEqual(output, []);
});

test('email stub rejects production delivery without logging arguments', async t => {
  const email = require('../dist/utils/email.js');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  const output = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => output.push(args));
  for (const send of [email.sendVerificationEmail, email.sendInvitationEmail]) {
    await assert.rejects(send({ to: 'private@example.invalid', token: 'synthetic-secret', roleKey: 'judge' }),
      { message: 'Email delivery is unavailable' });
  }
  assert.deepEqual(output, []);
});
