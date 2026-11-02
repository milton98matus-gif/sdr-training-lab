import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {handleTrainingRequest} from '../lib/training-service.mjs';
import {evaluateDiagnostic,evaluateContrast,learningRecord} from '../lib/learning-service.mjs';
import content from '../content/learning-path.json' with {type:'json'};
import onboarding from '../content/onboarding.json' with {type:'json'};

const {DIAGNOSTIC,COMPARISONS,SERVICES}=content;
const lessonIds=new Set(onboarding.UNITS.map(u=>u.id));
assert.equal(DIAGNOSTIC.length,8);
assert.equal(SERVICES.length,6);
assert.equal(COMPARISONS.length,3);
assert.equal(new Set(DIAGNOSTIC.map(q=>q.id)).size,8);
assert.equal(new Set(COMPARISONS.map(f=>f.id)).size,3);
for(const question of DIAGNOSTIC){assert(lessonIds.has(question.unitId));assert.equal(question.options.length,3);assert(question.options[question.answer]);assert(question.options.every(o=>o.text&&o.why));}
for(const service of SERVICES){assert(lessonIds.has(service.unitId));for(const key of ['title','description','outcome','question','boundary'])assert(service[key],key);}
for(const family of COMPARISONS){assert(lessonIds.has(family.unitId));assert.equal(family.variants.length,3);assert.equal(new Set(family.variants.map(v=>v.id)).size,3);for(const v of family.variants){assert.equal(v.options.length,3);assert(v.options[v.answer]);assert(v.options.every(o=>o.text&&o.why));assert(v.reason&&v.boundary);assert(['continue','route','book','nurture','recycle','close','exclude'].includes(v.action));}}
new vm.Script(fs.readFileSync(new URL('../public/lab/learning-path-data.js',import.meta.url),'utf8'));

const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function statement(sql,args=[]){return {bind(...v){return statement(sql,v);},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}
const db={prepare:statement};
const owner={userId:'learning-owner',email:'owner@example.test',displayName:'Owner'},learner={userId:'learning-learner',email:'learner@example.test',displayName:'Learner'},other={userId:'learning-other',email:'other@example.test',displayName:'Other'};
let serial=0;const eid=()=>`learning-test-${String(++serial).padStart(5,'0')}`;
async function req(path,who=learner,body,origin='https://training.test'){
  const r=await handleTrainingRequest(new Request('https://training.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',origin},...(body?{body:JSON.stringify(body)}:{})}),{db,identity:who,ownerEmail:owner.email});
  return {status:r.status,data:await r.json()};
}
for(const who of [owner,learner,other])await req('/api/session',who);
let r=await req('/api/onboarding');
assert.equal(r.data.learning.diagnostic,null);
assert.deepEqual(r.data.learning.comparisons,{});
assert.equal(r.data.summary.learningActivityCount,0);
assert.equal(r.data.summary.unitsChecked,0);
assert.equal((await req('/api/onboarding/diagnostic',null,{id:eid(),choices:[]})).status,401);
assert.equal((await req('/api/admin/onboarding?user='+other.userId)).status,403);
const good=DIAGNOSTIC.map(q=>q.answer),bad=DIAGNOSTIC.map(q=>(q.answer+1)%3),id=eid();
assert.equal((await req('/api/onboarding/diagnostic',learner,{id,choices:good},'https://evil.test')).status,403);
assert.equal((await req('/api/onboarding/diagnostic',learner,{id:eid(),choices:[...good,0]})).status,400);
assert.equal((await req('/api/onboarding/diagnostic',learner,{id:eid(),choices:good.map((v,i)=>i? v:99)})).status,400);
assert.equal((await req('/api/onboarding/diagnostic',learner,{id:eid(),choices:good.map((v,i)=>i?v:'0')})).status,400);
assert.equal((await req('/api/onboarding/diagnostic',learner,{id:'!',choices:good})).status,400);
r=await req('/api/onboarding/diagnostic',learner,{id,choices:bad,score:8,aligned:true,userId:other.userId});
assert.equal(r.status,200);assert.equal(r.data.learning.diagnostic.latest.score,0);assert.equal(r.data.summary.diagnosticScore,0);
assert.equal(r.data.summary.unitsChecked,0,'Diagnostic never completes required lessons');
assert.equal(r.data.summary.complete,false,'Supplemental practice never bypasses readiness');
assert(r.data.learning.recommendations.length>0);assert(r.data.learning.recommendations.length<=3);
await req('/api/onboarding/diagnostic',learner,{id,choices:good});
assert.equal((await req('/api/onboarding')).data.learning.diagnostic.latest.score,0,'Activity retries are idempotent');
r=await req('/api/onboarding/diagnostic',learner,{id:eid(),choices:good});
assert.equal(r.data.learning.diagnostic.first.score,0);assert.equal(r.data.learning.diagnostic.latest.score,8);
assert.equal(r.data.learning.diagnostic.latest.domains.reduce((n,d)=>n+d.maxScore,0),8);
assert.equal(r.data.learning.diagnostic.latest.domains.reduce((n,d)=>n+d.score,0),8);
assert.equal((await req('/api/onboarding?user='+other.userId)).data.person.id,learner.userId);
assert.equal((await req('/api/onboarding',other)).data.learning.diagnostic,null,'Other profiles cannot be overwritten');

const family=COMPARISONS[0],variant=family.variants[0],key=family.id+':'+variant.id,contrastId=eid(),wrong=(variant.answer+1)%3;
assert.equal((await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:'unknown',choice:0})).status,400);
assert.equal((await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:variant.id,choice:99})).status,400);
assert.equal((await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:variant.id,choice:null})).status,400);
assert.equal((await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:variant.id,choice:variant.answer},'https://evil.test')).status,403);
r=await req('/api/onboarding/contrast',learner,{id:contrastId,familyId:family.id,variantId:variant.id,choice:wrong,aligned:true,action:'book'});
assert.equal(r.status,200);assert.equal(r.data.learning.comparisons[key].aligned,false);assert.equal(r.data.learning.comparisons[key].action,variant.action);
assert.equal(r.data.summary.contextualChecks,1);assert.equal(r.data.summary.contextualAligned,0);
await req('/api/onboarding/contrast',learner,{id:contrastId,familyId:family.id,variantId:variant.id,choice:variant.answer});
assert.equal((await req('/api/onboarding')).data.learning.comparisons[key].aligned,false);
r=await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:variant.id,choice:variant.answer});
assert.equal(r.data.learning.comparisons[key].firstChoice,wrong);assert.equal(r.data.learning.comparisons[key].firstAligned,false);assert.equal(r.data.learning.comparisons[key].aligned,true);assert.equal(r.data.summary.contextualAligned,1);
assert.equal(r.data.summary.practice.cases,0,'Context comparisons do not manufacture main-case submissions');
assert.deepEqual((await req('/api/onboarding',other)).data.learning.comparisons,{});

const record=r.data;
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:learner.userId,status:'ready',comment:'A review cannot waive incomplete required submissions.',evidenceVersion:record.evidenceVersion})).status,409);
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:learner.userId,status:'practice',comment:'Review context and permission before choosing a next step.',evidenceVersion:record.evidenceVersion})).status,200);
assert.equal((await req('/api/onboarding')).data.review.current,true);
await req('/api/onboarding/contrast',learner,{id:eid(),familyId:family.id,variantId:variant.id,choice:variant.answer});
assert.equal((await req('/api/onboarding')).data.review.current,false,'New relevant practice requires an updated readiness review');
const admin=(await req('/api/admin/onboarding?user='+learner.userId,owner)).data;
assert.equal(admin.learning.diagnostic.latest.score,8);
assert.equal((await req('/api/report')).data.report.onboarding.contextualAligned,1);

const now=2000000000000,unitId=family.unitId,check={aligned:true,at:now-8*86400000};
assert(learningRecord([],{[unitId]:check},now).dueLessons.some(u=>u.id===unitId));
assert(!learningRecord([],{[unitId]:{...check,at:now-6*86400000}},now).dueLessons.some(u=>u.id===unitId));
const newContrast={event_id:'spaced-contrast-1',kind:'contrast',created_at:now-86400000,data:evaluateContrast({familyId:family.id,variantId:variant.id,choice:variant.answer})};
assert(!learningRecord([newContrast],{[unitId]:check},now).dueLessons.some(u=>u.id===unitId),'Aligned context practice refreshes the relevant spaced-review date');
const failedContrast={...newContrast,data:evaluateContrast({familyId:family.id,variantId:variant.id,choice:wrong})};
assert(learningRecord([failedContrast],{[unitId]:check},now).dueLessons.some(u=>u.id===unitId),'A mismatched practice attempt does not postpone a due review');
assert(!learningRecord([newContrast,{...failedContrast,event_id:'spaced-later-mismatch',created_at:now}],{[unitId]:check},now).dueLessons.some(u=>u.id===unitId),'Spaced-review timing uses the most recent aligned event while the newer mismatch receives its own recommendation');
assert.equal(learningRecord([failedContrast],{[unitId]:check},now).recommendations[0].kind,'contrast');
const diagnosticRow={event_id:'starting-point-review',kind:'diagnostic',created_at:now-86400000,data:evaluateDiagnostic(bad)};
const weakId=DIAGNOSTIC[0].unitId;
assert(!learningRecord([diagnosticRow],{[weakId]:{aligned:true,at:now}},now).recommendations.some(rec=>rec.unitId===weakId),'Later aligned lesson evidence supersedes a diagnostic recommendation');
assert(learningRecord([],{[weakId]:{aligned:false,at:now}},now).recommendations.some(rec=>rec.unitId===weakId));
sqlite.close();
console.log('PASS: learning data integrity, canonical diagnostic/context scoring, first/latest evidence, authentication and ownership, CSRF, bounded inputs, idempotency, unchanged readiness requirements, review invalidation, actionable recommendations, and spaced-practice timing.');
