import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {handleTrainingRequest,mergeSnapshots,normalizeSnapshot} from '../lib/training-service.mjs';
import caseData from '../content/cases.json' with {type:'json'};
import callData from '../content/calls.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function statement(sql,args=[]){return {bind(...values){return statement(sql,values);},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}
const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const owner={userId:'owner-user',email:'owner@example.test',displayName:'Training owner'},learner={userId:'learner-user',email:'learner@example.test',displayName:'Learner'},other={userId:'other-user',email:'other@example.test',displayName:'Other learner'};
async function request(path,identity=owner,method='GET',payload,origin='https://training.test'){
 const r=await handleTrainingRequest(new Request('https://training.test'+path,{method,headers:{origin,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})}),{db,identity,ownerEmail:owner.email});return {status:r.status,data:await r.json()};
}
assert.equal((await request('/api/session',null)).status,401);
assert.equal((await request('/api/session')).data.user.role,'owner');
assert.equal((await request('/api/session',learner)).data.user.role,'participant');
await request('/api/session',other);
assert.equal((await request('/api/admin/users',learner)).status,403);
assert.equal((await request('/api/report?user='+other.userId,learner)).status,403);
assert.equal((await request('/api/events',learner,'POST',{events:[]},'https://elsewhere.test')).status,403);
const c=caseData.CASES[0],bad=c.options.findIndex(o=>o.scores.reduce((a,b)=>a+b,0)===0),good=c.options.findIndex(o=>o.scores.every(s=>s===2));
const event={id:'decision-fixture-01',kind:'decision',unitId:c.id,mode:'response',step:0,choice:bad,at:Date.now(),score:999,aligned:1};
assert.equal((await request('/api/events',learner,'POST',{events:[event]})).status,200);
await request('/api/events',learner,'POST',{events:[event]});
let result=(await request('/api/report',learner)).data.report;
assert.equal(result.casesCompleted,1);assert.equal(result.firstDecisions,1);assert.equal(result.firstAligned,0);assert.equal(result.recent.length,1);assert.equal(result.recent[0].score,0);
await request('/api/events',learner,'POST',{events:[{...event,id:'decision-fixture-02',choice:good,at:Date.now()}]});
result=(await request('/api/report',learner)).data.report;
assert.equal(result.firstAligned,0);assert.equal(result.latestAligned,1);assert.equal(result.firstDecisions,1);assert(!result.suggestions.some(s=>s.topic===c.category));
assert.equal((await request('/api/events',learner,'POST',{events:[{...event,id:'decision-invalid01',unitId:'missing-case'}]})).status,400);
assert.equal((await request('/api/events',learner,'POST',{events:Array(31).fill(event)})).status,400);
const call=callData.calls.find(c=>c.id==='contract'),run={node:call.start,history:[],note:'Private practice draft',disposition:'nurture',done:true,at:Date.now()};
while(!call.nodes[run.node].end){const n=call.nodes[run.node],option=n.options.findIndex(o=>o.grade==='supported');run.history.push({node:run.node,option});run.node=n.options[option].next;}
assert.equal((await request('/api/events',learner,'POST',{events:[{id:'call-fixture-01',kind:'call_complete',unitId:call.id,run}]})).status,200);
result=(await request('/api/report',learner)).data.report;assert.equal(result.callsCompleted,1);assert.equal(result.callRuns,1);assert(!JSON.stringify(result).includes('Private practice draft'));
assert.equal((await request('/api/report?topic=Discovery',learner)).data.report.callsCompleted,1,'Topic filters include the relevant skill inside a full call');
assert.equal((await request('/api/report?from='+String(Date.now()+10000),learner)).data.report.casesCompleted,0);
const state={firsts:{[c.id+':response']:{caseId:c.id,mode:'response',choice:bad,step:0,at:Date.now()}},history:[],caseId:c.id,mode:'response'};
assert.equal((await request('/api/state',learner,'PUT',{scope:'sdr-lab-msp-v2',payload:state,userId:other.userId})).status,200);
assert.equal(Object.keys((await request('/api/session',other)).data.snapshots).length,0);
assert.equal((await request('/api/state',learner,'PUT',{scope:'wrong-key',payload:state})).status,400);
const imported={cases:state,calls:{sessions:{[call.id+':sdr']:run},runs:[]}};
await request('/api/import',learner,'POST',imported);const afterImport=(await request('/api/report',learner)).data.report.recent.length;
await request('/api/import',learner,'POST',imported);assert.equal((await request('/api/report',learner)).data.report.recent.length,afterImport);
assert((await request('/api/report',learner)).data.report.recent.some(e=>e.source==='browser-import'));
assert.equal((await request('/api/report',learner)).data.report.latestAligned,1,'Historical import must not replace the latest live decision');
assert.equal((await request('/api/admin/role',owner,'POST',{userId:learner.userId,role:'admin'})).status,200);
assert.equal((await request('/api/admin/users',learner)).status,200);
assert.equal((await request('/api/admin/users',learner)).data.canManageRoles,false);
assert.equal((await request('/api/admin/role',learner,'POST',{userId:other.userId,role:'admin'})).status,403);
assert.equal((await request('/api/admin/role',owner,'POST',{userId:owner.userId,role:'participant'})).status,400);
assert.equal((await request('/api/admin/role',owner,'POST',{userId:'not-enrolled',role:'admin'})).status,404);
assert.equal((await request('/api/admin/role',owner,'POST',{userId:learner.userId,role:'participant'})).status,200);
assert.equal((await request('/api/admin/users',learner)).status,403);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM training_role_audit').get().n,2);
const beforeReset=(await request('/api/report',learner)).data.report.casesCompleted;
await request('/api/state',learner,'PUT',{scope:'sdr-lab-msp-v2',payload:{},reset:true});
assert.equal(Object.keys((await request('/api/session',learner)).data.snapshots['sdr-lab-msp-v2'].firsts).length,0);
assert.equal((await request('/api/report',learner)).data.report.casesCompleted,beforeReset);
const normalized=normalizeSnapshot('sdr-lab-msp-v2',state);
assert.equal(mergeSnapshots('sdr-lab-msp-v2',normalized,normalizeSnapshot('sdr-lab-msp-v2',{})).firsts[c.id+':response'].choice,bad);
if(process.argv.includes('--write-layout-fixture')){
 const demo=caseData.CASES[1];await request('/api/events',learner,'POST',{events:[{id:'layout-extra-bad-01',kind:'decision',unitId:demo.id,mode:'response',step:0,choice:demo.options.findIndex(o=>o.scores.reduce((a,b)=>a+b,0)===0),at:Date.now()}]});
 const list=(await request('/api/admin/users')).data,records={};for(const p of list.people)records[p.id]=(await request('/api/report?user='+p.id)).data;
 fs.mkdirSync(new URL('../work/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../work/reporting-fixture.json',import.meta.url),JSON.stringify({list,records}));
}
sqlite.close();
console.log('PASS: authenticated profiles, participant isolation, owner/admin authorization and revocation, CSRF, server-derived scoring, idempotent events/imports, call evidence, private notes, snapshot sync, and historical reporting.');
