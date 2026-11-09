const assert = require('node:assert/strict');
const jwt = require('node:module').createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'))('jsonwebtoken');
module.exports = async function ({ client, baseUrl, jwtSecret }) {
  const users = await Promise.all(['preference-a','preference-b'].map(name => client.user.create({data:{name,email:name+'@example.invalid',active:true,emailVerified:true}})));
  const tokens = users.map(user=>jwt.sign({userId:user.id,sessionVersion:user.sessionVersion},jwtSecret));
  const request = async (body,token=tokens[0]) => {const res=await fetch(baseUrl+'/api/v1/auth/preferences',{method:'POST',headers:{'Content-Type':'application/json',...(token&&{Authorization:'Bearer '+token})},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
  for(const body of [{preferredLocale:'de'},{preferredLocale:'en',userId:users[1].id},{locale:'ru'},{}]) assert.equal((await request(body)).status,400);
  assert.equal((await request({preferredLocale:'en'},null)).status,401);
  const before=await client.user.findMany({where:{id:{in:users.map(u=>u.id)}},orderBy:{id:'asc'}});
  assert.ok(before.every(user=>user.preferredLocale===null));
  const results=await Promise.all([request({preferredLocale:'ru'},tokens[0]),request({preferredLocale:'en'},tokens[1])]);
  assert.ok(results.every(row=>row.status===200));
  for(let i=0;i<users.length;i++) {
    const row=await client.user.findUniqueOrThrow({where:{id:users[i].id}});
    assert.deepEqual(row,{...users[i],preferredLocale:i===0?'ru':'en'});
    const profile=await fetch(baseUrl+'/api/v1/auth/profile',{headers:{Authorization:'Bearer '+tokens[i]}});
    assert.equal((await profile.json()).preferredLocale,row.preferredLocale);
  }
  assert.equal((await request({preferredLocale:null})).status,200);
  assert.equal((await client.user.findUniqueOrThrow({where:{id:users[0].id}})).preferredLocale,null);
  await client.user.update({where:{id:users[0].id},data:{active:false}});
  assert.equal((await request({preferredLocale:'et'})).status,401);
  assert.equal((await client.user.findUniqueOrThrow({where:{id:users[0].id}})).preferredLocale,null);
  console.log('Self-only account preference strict validation, concurrent recipient isolation, profile persistence, clear and inactive denial passed.');
};
