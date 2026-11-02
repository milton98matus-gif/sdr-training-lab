import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleTrainingRequest} from '../lib/training-service.mjs';
import {presenceAnalytics,recordPresence} from '../lib/presence-service.mjs';
import game from '../content/opportunity-game.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');
for(const f of fs.readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
function stmt(q,a=[]){return {bind(...v){return stmt(q,v)},async first(){return sqlite.prepare(q).get(...a)||null},async all(){return {results:sqlite.prepare(q).all(...a)}},async run(){const r=sqlite.prepare(q).run(...a);return {meta:{changes:Number(r.changes)}}}};}
let queue=Promise.resolve();const db={prepare:stmt,batch(ss){const task=queue.then(async()=>{sqlite.exec('BEGIN');try{const result=[];for(const s of ss)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}});queue=task.catch(()=>{});return task;}};
const actualNow=Date.now;let clock=Date.UTC(2026,10,2,15);Date.now=()=>clock;
const owner={userId:'owner',email:'owner@example.test',displayName:'Demo owner'},learner={userId:'learner',email:'learner@example.test',displayName:'Provider display name'},other={userId:'other',email:'other@example.test',displayName:'Second trainee'},admin={userId:'admin',email:'admin@example.test',displayName:'Demo administrator'};
async function req(path,who=learner,data,method=data?'POST':'GET',origin='https://lab.test'){
 const r=await handleTrainingRequest(new Request('https://lab.test'+path,{method,headers:{origin,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),{db,identity:who,ownerEmail:owner.email});return {status:r.status,data:await r.json()};
}
for(const p of [owner,learner,other,admin])assert.equal((await req('/api/session',p)).status,200);
await req('/api/admin/role',owner,{userId:'admin',role:'admin'});
assert.equal((await req('/api/portal/profile',null)).status,401);
assert.equal((await req('/api/portal/accounts',learner,{name:'Example IT'})).status,403);
let added=await req('/api/portal/accounts',admin,{name:'Example IT'});assert.equal(added.status,200);const account=added.data.accounts[0];
assert.equal((await req('/api/portal/accounts',owner,{name:'example it'})).status,409);
assert.equal((await req('/api/portal/profile',learner,{firstName:'<b>Fake</b>',lastName:'Name'},'PUT')).status,400);
assert.equal((await req('/api/portal/profile',learner,{firstName:'Alex',lastName:'Rivera',requestedMspId:'unknown'},'PUT')).status,400);
let saved=await req('/api/portal/profile',learner,{firstName:'Alex',lastName:'Rivera',requestedMspId:account.id,userId:'other',role:'admin'},'PUT');assert.equal(saved.status,200);assert.equal(saved.data.user.name,'Alex Rivera');assert.equal(saved.data.user.role,'participant');assert.equal(saved.data.user.profile.verified,false);
assert.equal((await req('/api/session')).data.user.name,'Alex Rivera','The authenticated provider display name must not overwrite the real-name learning profile');
assert.equal((await req('/api/portal/profile',other)).data.user.profile.complete,false,'Profile writes cannot target another identity');
assert.equal((await req('/api/portal/verify',learner,{userId:'learner',approvedMspId:account.id})).status,403);
assert.equal((await req('/api/portal/verify',admin,{userId:'learner',approvedMspId:account.id})).status,200);
assert.equal((await req('/api/session')).data.user.profile.approvedMsp,'Example IT');
await req('/api/portal/profile',learner,{firstName:'Alex',lastName:'Rivera',requestedMspId:account.id},'PUT');assert.equal((await req('/api/session')).data.user.profile.verified,true,'An unchanged profile keeps its verification');
await req('/api/portal/profile',learner,{firstName:'Alex',lastName:'Rivera López',requestedMspId:account.id},'PUT');assert.equal((await req('/api/session')).data.user.profile.verified,false,'Changing a name requires fresh confirmation');assert.equal((await req('/api/session')).data.user.profile.approvedMsp,'Example IT','A trainee cannot replace the confirmed assignment');
await req('/api/portal/verify',owner,{userId:'learner',approvedMspId:account.id});
assert.equal((await req('/api/portal/profile',learner,{tourCompleted:true},'PUT','https://evil.example')).status,403);
await req('/api/portal/profile',learner,{tourCompleted:true},'PUT');assert((await req('/api/session')).data.user.profile.tourCompletedAt);assert.equal((await req('/api/onboarding')).data.summary.unitsChecked,0,'Walkthrough completion never grants learning credit');
await req('/api/portal/accounts',owner,{id:account.id,name:account.name,active:false});assert.equal((await req('/api/portal/accounts',learner)).data.accounts.length,0);assert.equal((await req('/api/session')).data.user.profile.approvedMsp,'Example IT','Archived MSP assignments remain readable');
await req('/api/portal/accounts',owner,{id:account.id,name:account.name,active:true});
for(const m of game.missions){const choices=m.rounds.map(r=>r.options.findIndex(o=>o.points===2));const body={id:'mission-test-'+m.id,missionId:m.id,version:game.version,choices,score:999,userId:'other'};
 const r=await req('/api/portal/game',learner,body);assert.equal(r.status,200);assert.equal(r.data.score,6);assert.equal((await req('/api/portal/game',learner,body)).data.duplicate,true);assert.equal((await req('/api/portal/game',learner,{...body,choices:choices.map(c=>(c+1)%3)})).status,409);clock+=1000;
}
assert.equal((await req('/api/portal/game',learner,{id:'incomplete-game',missionId:game.missions[0].id,version:game.version,choices:[0]})).status,400);
assert.equal((await req('/api/portal/game?user=other')).status,403);assert.equal((await req('/api/portal/game?user=learner',admin)).status,200);
assert.equal((await req('/api/portal/game',other)).data.attempts,0);
const activity=(await req('/api/activity')).data;assert.equal(activity.summary.submissions,6);assert.equal(activity.items.filter(i=>i.label==='Opportunity mission submitted').length,6);assert.equal(activity.items[0].aiReviewable,false,'Published mission coaching is never presented as an AI response');
assert.equal((await req('/api/onboarding')).data.summary.practice.cases,0);assert.equal((await req('/api/onboarding')).data.summary.complete,false,'Missions do not replace required cases or human readiness approval');
const midnight=Date.UTC(2026,10,3,6),session='analytics-session-0001';clock=midnight-15000;
const beat=(sequence,segments,section='lab')=>({sessionId:session,sequence,section,state:'interaction',spanMs:segments.reduce((n,s)=>n+s.spanMs,0),visibleMs:segments.reduce((n,s)=>n+s.visibleMs,0),interactionMs:segments.reduce((n,s)=>n+s.interactionMs,0),segments});
await recordPresence(db,'learner',beat(1,[]),clock);clock=midnight+15000;
const pieces=[{section:'foundations',spanMs:15000,visibleMs:15000,interactionMs:10000},{section:'lab',spanMs:15000,visibleMs:10000,interactionMs:5000}];
await recordPresence(db,'learner',beat(2,pieces),clock);let analytics=await presenceAnalytics(db,'learner',{from:midnight-15000,to:midnight+15000});
assert.equal(analytics.daily.reduce((n,d)=>n+d.connectedMs,0),30000);assert.equal(analytics.daily.find(d=>d.day==='2026-11-02').connectedMs,15000);assert.equal(analytics.daily.find(d=>d.day==='2026-11-03').connectedMs,15000);
assert.equal(analytics.modules.find(m=>m.section==='foundations').connectedMs,15000);assert.equal(analytics.modules.find(m=>m.section==='lab').visibleMs,10000);
analytics=await presenceAnalytics(db,'learner',{from:midnight-5000,to:midnight+6000});assert.equal(analytics.summary.connectedMs,11000);assert.equal(analytics.daily.reduce((n,d)=>n+d.connectedMs,0),11000);assert.equal(analytics.modules.reduce((n,d)=>n+d.connectedMs,0),11000);
const before=analytics.summary.connectedMs;await recordPresence(db,'learner',beat(2,pieces),clock);assert.equal((await presenceAnalytics(db,'learner',{from:midnight-5000,to:midnight+6000})).summary.connectedMs,before);
assert.equal((await req('/api/portal/time?user=other')).status,403);assert.equal((await req('/api/portal/time?from=invalid')).status,400);assert.equal((await req('/api/portal/time?from=0')).status,400);
const bad={...beat(3,pieces),segments:[{...pieces[0],spanMs:0}]};assert.equal((await req('/api/presence/beat',learner,bad)).status,400);
const cohort=(await req('/api/admin/users',owner)).data;assert(cohort.people.find(p=>p.id==='other').executive.reasons.some(r=>r.kind==='profile'));assert.equal(cohort.people.find(p=>p.id==='learner').profile.approvedMsp,'Example IT');assert.equal((await req('/api/admin/role',admin,{userId:'other',role:'admin'})).status,403);
if(process.argv.includes('--fixture')){
 // Local-only fictional UI fixture; never populate production with these records.
 for(const [who,first,last]of [[owner,'Demo','Owner'],[other,'Jamie','Chen'],[admin,'Demo','Administrator']])await req('/api/portal/profile',who,{firstName:first,lastName:last,requestedMspId:account.id},'PUT');
 clock=Date.UTC(2026,10,3,18);const records={},onboarding={},presence={},time={},games={},activities={};
 for(const p of [owner,learner,other,admin]){records[p.userId]=(await req('/api/report?user='+p.userId,owner)).data;onboarding[p.userId]=(await req('/api/admin/onboarding?user='+p.userId,owner)).data;presence[p.userId]=(await req('/api/presence?user='+p.userId,owner)).data;time[p.userId]=(await req('/api/portal/time?user='+p.userId,owner)).data;games[p.userId]=(await req('/api/portal/game?user='+p.userId,owner)).data;activities[p.userId]=(await req('/api/activity?user='+p.userId,owner)).data;}
 fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/experience-fixture.json',JSON.stringify({session:(await req('/api/session',owner)).data,accounts:(await req('/api/portal/accounts',owner)).data,cohort:(await req('/api/admin/users',owner)).data,records,onboarding,presence,time,games,activities}));
}
Date.now=actualNow;sqlite.close();
console.log('PASS: real-name profiles, account-bound identity, audited MSP confirmation, archived-account history, role/CSRF boundaries, server-scored missions, idempotency, submitted evidence, walkthrough separation, midnight/module attribution, partial-bucket clipping, validated ranges and executive action signals.');
