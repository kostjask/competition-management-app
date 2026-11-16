const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = ({ serverEnv }) => {
  const result = spawnSync(process.execPath, [__filename], { env: serverEnv, encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error('Content cleanup fixture failed: ' + result.stderr.trim());
  console.log('PASS: tracked crash staging, live-reference preservation, rights retirement, failed deletion retry, lease expiry and restored-byte withdrawal.');
};
async function main() {
  const target = new URL(process.env.DATABASE_URL); assert.equal(target.hostname, 'localhost'); assert.match(target.pathname, /^\/dance_baseline_[a-f0-9]{32}$/);
  const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg');
  const { cleanupContentAssets, writeContentBytes, readContentBytes } = require('../apps/api/dist/services/contentStorage.js');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const document = await db.contentDocument.findFirstOrThrow({ where: { kind: 'STUDIO_SITE' } }); const actor = await db.user.findFirstOrThrow({ where: { email: 'admin@test.com' } });
    const now = new Date(); const old = new Date(now.getTime()-90000000);
    const create = async (extras = {}) => { const id = randomUUID(); return db.publicAsset.create({ data: { id, documentId: document.id, actorId: actor.id, key: `${document.id}/${id}.webp`, digest: 'fixture', size: 1, width: 1, height: 1, createdAt: old, ...extras } }); };
    const pending = await create(); await writeContentBytes(pending.key, Buffer.from('fixture'));
    const live = await create({ ready: true, rights: 'APPROVED' }); await writeContentBytes(live.key, Buffer.from('live'));
    await db.contentRevisionAsset.create({ data: { revisionId: document.draftRevisionId, assetId: live.id, fieldPath: 'fixture' } });
    await cleanupContentAssets(db, now); assert.ok((await db.publicAsset.findUniqueOrThrow({ where: { id: pending.id } })).retiredAt); await assert.rejects(readContentBytes(pending.key)); assert.equal((await readContentBytes(live.key)).toString(), 'live'); assert.equal(await db.contentAssetCleanup.count({ where: { assetId: live.id } }), 0);
    const failed = await create({ rights: 'REVOKED' }); const full = path.resolve(process.env.STORAGE_PATH,'content-private',failed.key); const intended = path.resolve(process.env.STORAGE_PATH,'content-private'); assert.equal(path.relative(intended,full).startsWith('..'),false); await fs.mkdir(full,{recursive:true});
    await cleanupContentAssets(db,now); let job = await db.contentAssetCleanup.findUniqueOrThrow({where:{assetId:failed.id}}); assert.equal(job.completedAt,null); assert.equal(job.failureCode,'DELETE_RETRY'); assert.equal(job.attempts,1);
    await fs.rmdir(full); await writeContentBytes(failed.key,Buffer.from('retry')); await db.contentAssetCleanup.update({where:{id:job.id},data:{leaseUntil:new Date(now.getTime()-1000)}});
    await cleanupContentAssets(db,new Date(now.getTime()+120000)); job = await db.contentAssetCleanup.findUniqueOrThrow({where:{id:job.id}}); assert.ok(job.completedAt); await assert.rejects(readContentBytes(failed.key));
    // Restoring deleted bytes never restores rights/readiness or publication.
    await writeContentBytes(failed.key,Buffer.from('restored')); const restored = await db.publicAsset.findUniqueOrThrow({where:{id:failed.id}}); assert.equal(restored.ready,false); assert.equal(restored.rights,'REVOKED'); assert.ok(restored.retiredAt);
  } finally { await db.$disconnect(); }
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
