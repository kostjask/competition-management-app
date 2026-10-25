const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AuditRecordSchema } = require('@dance/schemas');
const { appendAudit } = require('../dist/services/audit.js');

test('audit metadata rejects private payloads and inconsistent actors before persistence', async () => {
  const base = { action: 'PASSWORD_RESET', actor: { kind: 'USER', userId: 'u' }, targetType: 'USER', targetId: 'u' };
  for (const metadata of [{ token: 'secret' }, { password: 'secret' }, { email: 'private@example.invalid' },
    { roleKey: 'private@example.invalid' }, { fromStatus: 'private' }, { invoiceDetails: {} }]) {
    assert.equal(AuditRecordSchema.safeParse({ ...base, metadata }).success, false);
  }
  assert.equal(AuditRecordSchema.safeParse({ ...base, actor: { kind: 'ANONYMOUS', userId: 'u' } }).success, false);
  const rows = [];
  await appendAudit({ auditLog: { create: async ({ data }) => { rows.push(data); } } }, base);
  assert.deepEqual(rows, [{ action: 'PASSWORD_RESET', actorKind: 'USER', actorId: 'u', targetType: 'USER', targetId: 'u', eventId: null, studioId: null, metadata: {} }]);
  await assert.rejects(appendAudit({ auditLog: { create: async () => assert.fail('invalid audit must not write') } }, { ...base, metadata: { token: 'secret' } }));
});
