const assert = require('node:assert/strict');
const jwt = require('node:module').createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'))('jsonwebtoken');
const { newIdentitySecret } = require('../apps/api/dist/services/identityTokens.js');
module.exports = async function ({ client, baseUrl, adminToken, jwtSecret }) {
  const creator = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const event = await client.event.create({ data: { name: 'Staff acceptance fixture', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const other = await client.event.create({ data: { name: 'Other staff scope', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const judgeRole = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
  const moderatorRole = await client.role.findUniqueOrThrow({ where: { key: 'moderator' } });
  const request = async (path, body, token = adminToken, method = 'POST') => {
    const res = await fetch(baseUrl + '/api/v1' + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  const snapshot = async () => Object.fromEntries(await Promise.all(['user','userRole','judge','score','invitation','auditLog'].map(async model => [model, await client[model].findMany({ orderBy: { id: 'asc' } })])));
  const failure = async (action, run) => {
    await client.$executeRawUnsafe(`CREATE FUNCTION staff_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = '${action}' THEN RAISE EXCEPTION 'synthetic staff rollback'; END IF; RETURN NEW; END $$`);
    await client.$executeRawUnsafe('CREATE TRIGGER staff_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION staff_failure()');
    try { await run(); } finally { await client.$executeRawUnsafe('DROP TRIGGER staff_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION staff_failure()'); }
  };
  const invite = async (user, role = judgeRole) => {
    const secret = newIdentitySecret('INVITATION');
    const row = await client.invitation.create({ data: { email: user.email, roleKey: role.key, roleId: role.id, eventId: event.id, tokenDigest: secret.digest, expiresAt: secret.expiresAt, createdBy: creator.id } });
    return { row, body: { token: secret.raw } };
  };
  const user = await client.user.create({ data: { name: 'Staff fixture', email: 'staff-accept@example.invalid', active: true, emailVerified: true } });
  const session = jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, jwtSecret);
  const pending = await invite(user);
  const before = await snapshot();
  for (const action of ['ACCESS_RECONCILED','INVITATION_ACCEPTED']) await failure(action, async () => {
    assert.equal((await request('/invitations/accept', pending.body, session)).status, 500);
    assert.deepEqual(await snapshot(), before, 'Judge/access/consumption/audit rollback');
  });
  assert.equal((await request('/invitations/accept', pending.body, session)).status, 201);
  const judge = await client.judge.findUniqueOrThrow({ where: { userId_eventId: { userId: user.id, eventId: event.id } } });
  assert.equal(judge.name, user.name);
  const assignment = await client.userRole.findFirstOrThrow({ where: { userId: user.id, roleId: judgeRole.id, eventId: event.id } });
  assert.equal(await client.auditLog.count({ where: { action: 'ACCESS_RECONCILED', targetId: assignment.id } }), 1);
  // Cover every pre-existing combination without overwriting curated Judge fields.
  for (const [hasRole, hasJudge] of [[true,false],[false,true],[true,true]]) {
    const u = await client.user.create({ data: { name: 'Existing staff', email: 'staff-' + hasRole + '-' + hasJudge + '@example.invalid', active: true, emailVerified: true } });
    const a = hasRole ? await client.userRole.create({ data: { userId: u.id, roleId: judgeRole.id, eventId: event.id } }) : null;
    const j = hasJudge ? await client.judge.create({ data: { userId: u.id, eventId: event.id, name: 'Curated name', country: 'EE', description: 'Preserved biography' } }) : null;
    const link = await invite(u); const token = jwt.sign({ userId:u.id, sessionVersion:0 }, jwtSecret);
    const outcomes = await Promise.all([request('/invitations/accept',link.body,token),request('/invitations/accept',link.body,token)]);
    assert.equal(outcomes.filter(row=>row.status===201).length,1); assert.ok(outcomes.every(row=>[201,400,409].includes(row.status)));
    assert.equal(await client.judge.count({where:{userId:u.id,eventId:event.id}}),1);
    if(j) assert.deepEqual(await client.judge.findUniqueOrThrow({where:{id:j.id}}),j);
    if(a) assert.deepEqual(await client.userRole.findUniqueOrThrow({where:{id:a.id}}),a);
  }
  const moderatorInvite = await invite(user,moderatorRole);
  assert.equal((await request('/invitations/accept',moderatorInvite.body,session)).status,201);
  assert.equal(await client.judge.count({where:{userId:user.id,eventId:event.id}}),1);
  const otherAssignment = await client.userRole.create({data:{userId:user.id,roleId:judgeRole.id,eventId:other.id}});
  const performance = await (async () => {
    const category = await client.danceCategory.create({data:{name:'Staff fixture',eventId:event.id}});
    const format = await client.danceFormat.create({data:{name:'Staff fixture',eventId:event.id,minParticipants:1,maxParticipants:10,maxDurationSeconds:120}});
    const ageGroup = await client.ageGroup.create({data:{name:'Staff fixture',eventId:event.id,minAge:0}});
    return client.performance.create({ data: { ...await require("./performance-fixture.cjs")(client, event.id, "check-staff-access.cjs owner"),eventId:event.id,categoryId:category.id,formatId:format.id,ageGroupId:ageGroup.id,title:'Staff history',durationSec:60,orderOnStage:1}});
  })();
  const score = await client.score.create({data:{judgeId:judge.id,performanceId:performance.id,criterion:'staff-preservation',value:5}});
  const path = '/events/' + event.id + '/staff/' + assignment.id + '/remove';
  const stable = await snapshot();
  assert.equal((await request(path,{},null)).status,401);
  assert.equal((await request(path,{},session)).status,403);
  assert.equal((await request('/events/'+other.id+'/staff/'+assignment.id+'/remove',{})).status,404);
  assert.equal((await request(path,{userId:user.id})).status,400);
  assert.deepEqual(await snapshot(),stable);
  await failure('ACCESS_REMOVED',async()=>{assert.equal((await request(path,{})).status,500);assert.deepEqual(await snapshot(),stable);});
  const removed = await Promise.all([request(path,{}),request(path,{})]);
  assert.ok(removed.some(row=>row.status===204)); assert.ok(removed.every(row=>[204,409].includes(row.status)));
  assert.equal((await request(path,{})).status,204);
  assert.equal(await client.auditLog.count({where:{action:'ACCESS_REMOVED',targetId:assignment.id}}),1);
  assert.ok((await client.userRole.findUniqueOrThrow({where:{id:assignment.id}})).removedAt);
  assert.deepEqual(await client.judge.findUniqueOrThrow({where:{id:judge.id}}),judge);
  assert.deepEqual(await client.score.findUniqueOrThrow({where:{id:score.id}}),score);
  assert.deepEqual(await client.userRole.findUniqueOrThrow({where:{id:otherAssignment.id}}),otherAssignment);
  const profile = await request('/auth/profile',undefined,session,'GET');
  assert.equal(profile.status,200); assert.ok(!profile.body.roles.some(row=>row.id===assignment.id));
  assert.ok(profile.body.roles.some(row=>row.role.key==='moderator'&&row.eventId===event.id));
  const replacement = await invite(user); const removedSnapshot = await snapshot();
  assert.equal((await request('/invitations/accept',replacement.body,session)).status,409);
  assert.deepEqual(await snapshot(),removedSnapshot,'Acceptance cannot restore removed staff');
  const overviewPath = '/events/' + event.id + '/staff';
  assert.equal((await request(overviewPath,undefined,null,'GET')).status,401);
  assert.equal((await request(overviewPath,undefined,session,'GET')).status,403);
  assert.equal((await request('/events/missing/staff',undefined,adminToken,'GET')).status,404);
  const missingJudge = await client.user.create({data:{email:'staff-missing-judge@example.invalid',name:'Missing Judge',emailVerified:true}});
  const missingAssignment = await client.userRole.create({data:{userId:missingJudge.id,roleId:judgeRole.id,eventId:event.id}});
  const overview = (await request(overviewPath,undefined,adminToken,'GET')).body;
  require('../packages/schemas/dist/index.js').StaffOverviewSchema.parse(overview);
  assert.equal(overview.event.id,event.id);
  assert.equal(overview.assignments.find(row=>row.id===assignment.id).status,'REMOVED');
  assert.equal(overview.assignments.find(row=>row.id===missingAssignment.id).status,'JUDGE_MISSING');
  assert.ok(!overview.assignments.some(row=>row.id===otherAssignment.id));
  assert.ok(overview.invitations.every(row=>row.eventId===event.id));
  assert.equal(overview.invitations.find(row=>row.id===pending.row.id).status,'ACCEPTED');
  assert.ok(overview.assignments.some(row=>row.roleKey==='moderator'&&row.status==='ACTIVE'));
  await client.user.update({where:{id:missingJudge.id},data:{active:false}});
  assert.equal((await request(overviewPath,undefined,adminToken,'GET')).body.assignments.find(row=>row.id===missingAssignment.id).status,'ACCOUNT_UNAVAILABLE');
  for(const row of overview.invitations) assert.deepEqual(Object.keys(row).sort(),['id','email','roleKey','eventId','createdAt','expiresAt','usedAt','revokedAt','supersededAt','status'].sort());
  for(const row of overview.assignments) { assert.deepEqual(Object.keys(row).sort(),['id','user','roleKey','removedAt','status'].sort()); assert.deepEqual(Object.keys(row.user).sort(),['id','name','email'].sort()); }
  console.log('Staff Judge reconciliation, existing combinations, serializable acceptance/removal, audit rollback, scope denial and retained Score history passed.');
};
