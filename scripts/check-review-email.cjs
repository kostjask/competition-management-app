const assert = require('node:assert/strict');
module.exports = async function checkReviewEmail(client, mail) {
  const { queueReviewNotice, readApplicationReview } = require('../apps/api/dist/services/reviewNotifications.js');
  const event = await client.event.create({ data: { name: 'Review mail fixture', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02') } });
  const studio = await client.studio.create({ data: { name: 'Review mail studio', eventId: event.id, registrations: { create: { eventId: event.id } } }, include: { registrations: true } });
  const registration = studio.registrations[0];
  for (const locale of ['et', 'en', 'ru']) {
    const user = await client.user.create({ data: { email: `review-mail-${locale}@example.invalid`, name: 'Mail member', emailVerified: true, preferredLocale: locale } });
    await client.studioRepresentative.create({ data: { studioId: studio.id, userId: user.id, name: 'Editable contact', email: 'untrusted-contact@example.invalid' } });
  }
  const excluded = await client.user.create({ data: { email: 'review-mail-unverified@example.invalid', name: 'Unverified member' } });
  await client.studioRepresentative.create({ data: { studioId: studio.id, userId: excluded.id, name: 'Unverified', email: excluded.email } });
  const count = await client.emailDelivery.count(); const noticeCount = await client.reviewNotice.count();
  await assert.rejects(client.$transaction(async tx => { await queueReviewNotice(tx, registration, 'ORGANIZATION'); throw new Error('Synthetic domain rollback'); }));
  assert.equal(await client.emailDelivery.count(), count); assert.equal(await client.reviewNotice.count(), noticeCount);
  await client.$transaction(tx => queueReviewNotice(tx, registration, 'ORGANIZATION'));
  const notice = await client.reviewNotice.findFirstOrThrow({ where: { registrationId: registration.id } });
  const rows = await client.emailDelivery.findMany({ where: { reviewNoticeId: notice.id } }); assert.equal(rows.length, 3);
  for (const row of rows) {
    const envelope = mail.decryptEmail(row.ciphertext, row.id, process.env.EMAIL_QUEUE_KEY);
    assert.match(envelope.message.to, /^review-mail-(et|en|ru)@example.invalid$/);
    const locale = /review-mail-(et|en|ru)@/.exec(envelope.message.to)[1];
    assert.ok(envelope.message.html.includes(`lang="${locale}"`));
    const link = new URL(envelope.message.text.split('\n\n')[1]); assert.equal(link.pathname, '/applications'); assert.equal(link.searchParams.get('lang'), locale);
    assert.equal(JSON.stringify(row).includes(envelope.message.to), false); assert.equal(JSON.stringify(row).includes('untrusted-contact'), false);
  }
  let review = await readApplicationReview(client, event.id, studio.id, registration.id); assert.equal(review.notifications[0].state, 'QUEUED');
  const attempts = new Map();
  const failedProvider = { send: async (_message, key) => { attempts.set(key, (attempts.get(key) ?? 0) + 1); throw new Error('Synthetic provider timeout'); } };
  await mail.dispatchEmailBatch(client, failedProvider);
  review = await readApplicationReview(client, event.id, studio.id, registration.id); assert.equal(review.notifications[0].state, 'RETRYING');
  await client.emailDelivery.updateMany({ where: { reviewNoticeId: notice.id }, data: { nextAttemptAt: new Date(0) } });
  const provider = { send: async (_message, key) => { assert.equal(attempts.get(key), 1); return 'review-fixture-' + key; } };
  await Promise.all([mail.dispatchEmailBatch(client, provider), mail.dispatchEmailBatch(client, provider)]);
  review = await readApplicationReview(client, event.id, studio.id, registration.id); assert.equal(review.notifications[0].state, 'ACCEPTED');
  assert.equal(await client.emailDelivery.count({ where: { reviewNoticeId: notice.id, ciphertext: null, state: 'ACCEPTED' } }), 3);
  await client.$transaction(tx => queueReviewNotice(tx, { ...registration, revision: 2 }, 'EVENT'));
  const expired = await client.reviewNotice.findFirstOrThrow({ where: { registrationId: registration.id, revision: 2 } });
  await client.emailDelivery.updateMany({ where: { reviewNoticeId: expired.id }, data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 24 * 3600000) } });
  await mail.dispatchEmailBatch(client, { send: async () => { throw new Error('Expired review mail must never dispatch'); } });
  review = await readApplicationReview(client, event.id, studio.id, registration.id); assert.equal(review.notifications[0].state, 'EXPIRED');
};
