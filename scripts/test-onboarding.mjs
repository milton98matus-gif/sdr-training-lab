import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {handleTrainingRequest} from '../lib/training-service.mjs';
import content from '../content/onboarding.json' with {type:'json'};
import caseData from '../content/cases.json' with {type:'json'};
import callData from '../content/calls.json' with {type:'json'};
const {UNITS,TASKS}=content;
assert.equal(UNITS.length,18);assert.equal(UNITS.reduce((n,u)=>n+u.questions.length,0),40);assert.equal(TASKS.length,5);
assert.equal(new Set(UNITS.map(u=>u.id)).size,18);
for(const u of UNITS){assert.equal(u.cards.length,3);for(const q of u.questions){assert.equal(q.options.length,3);assert(q.options[q.answer]);assert(q.options.every(o=>o.text&&o.why));}}
for(const file of ['onboarding.js','onboarding-data.js','msp-app.js','reporting.js'])new vm.Script(fs.readFileSync(new URL('../public/lab/'+file,import.meta.url),'utf8'));
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function statement(sql,args=[]){return {bind(...v){return statement(sql,v);},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}
const db={prepare:statement,async batch(items){sqlite.exec('BEGIN');try{const rs=[];for(const s of items)rs.push(await s.run());sqlite.exec('COMMIT');return rs;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const owner={userId:'owner',email:'owner@example.test',displayName:'Owner'},learner={userId:'learner',email:'learner@example.test',displayName:'Learner'},other={userId:'other',email:'other@example.test',displayName:'Other'};
let serial=0;const eid=()=>`onboarding-test-${String(++serial).padStart(5,'0')}`;
async function req(path,who=learner,body,origin='https://training.test'){const method=body?'POST':'GET';const r=await handleTrainingRequest(new Request('https://training.test'+path,{method,headers:{'Content-Type':'application/json',origin},...(body?{body:JSON.stringify(body)}:{})}),{db,identity:who,ownerEmail:owner.email});return {status:r.status,data:await r.json()};}
for(const who of [owner,learner,other])await req('/api/session',who);
assert.equal((await req('/api/onboarding',null)).status,401);
assert.equal((await req('/api/admin/onboarding?user=other')).status,403);
assert.equal((await req('/api/onboarding?user=other')).data.person.id,'learner');
let r=await req('/api/onboarding/view',learner,{id:eid(),unitId:UNITS[0].id});assert.equal(r.data.summary.unitsViewed,1);assert.equal(r.data.summary.unitsChecked,0,'Viewing is not checking');
const u=UNITS[0],bad=u.questions.map(q=>(q.answer+1)%3),good=u.questions.map(q=>q.answer),eventId=eid();
assert.equal((await req('/api/onboarding/check',learner,{id:eventId,unitId:u.id,choices:bad,score:999,aligned:true})).data.checks[u.id].score,0);
await req('/api/onboarding/check',learner,{id:eventId,unitId:u.id,choices:good});assert.equal((await req('/api/onboarding')).data.checks[u.id].score,0,'Retrying the same activity ID is idempotent');
r=await req('/api/onboarding/check',learner,{id:eid(),unitId:u.id,choices:good});assert.equal(r.data.summary.firstCorrect,0);assert.equal(r.data.summary.latestCorrect,2);
assert.equal((await req('/api/onboarding/check',learner,{id:eid(),unitId:u.id,choices:[999,0]})).status,400);
assert.equal((await req('/api/onboarding/check',learner,{id:eid(),unitId:u.id,choices:good},'https://evil.test')).status,403);
assert.equal((await req('/api/onboarding',other)).data.summary.unitsChecked,0);
assert.equal((await req('/api/admin/onboarding/assignment',learner,{userId:other.userId,brief:{}})).status,403);
const t=TASKS[0];assert.equal((await req('/api/onboarding/task',learner,{id:eid(),taskId:t.id,answers:{}})).status,400);
let record=(await req('/api/onboarding')).data;
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'ready',comment:'All work has been reviewed.',evidenceVersion:record.evidenceVersion})).status,409,'Readiness requires all evidence');
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'practice',comment:'Practice a relevant discovery follow-up before returning to the pitch.',evidenceVersion:record.evidenceVersion})).status,200);
const brief={mspName:'Fictional Test MSP',services:'Managed help desk and cloud administration for small businesses.',territory:'Fictional service area only.',coverage:'Business-hours help desk. No live 24/7 promise.',assessmentTerms:'Scope and fees must be confirmed before any assessment.',handoff:'Discovery with a specialist; no prices or system access on the SDR call.',differentiators:'',restrictions:''};
r=await req('/api/admin/onboarding/assignment',owner,{userId:'learner',brief,dueAt:Date.now()-1000});const revision=r.data.assignment.revision;assert(r.data.summary.overdue);assert.equal(r.data.review.current,false);
r=await req('/api/admin/onboarding/assignment',owner,{userId:'learner',brief,dueAt:Date.now()+86400000});assert.equal(r.data.assignment.revision,revision,'A due-date-only edit does not invalidate the client brief');
for(const unit of UNITS)await req('/api/onboarding/check',learner,{id:eid(),unitId:unit.id,choices:unit.questions.map(q=>q.answer)});
const answers=task=>Object.fromEntries(task.fields.map(f=>[f.id,('Fictional applied explanation with concrete evidence and an honest next step. ').repeat(Math.ceil(f.min/75)+1)]));
for(const task of TASKS){r=await req('/api/onboarding/task',learner,{id:eid(),taskId:task.id,answers:answers(task),briefRevision:revision});assert.equal(r.status,200);}
assert.equal((await req('/api/onboarding')).data.summary.complete,false,'Applied work alone does not replace conversation practice');
for(const c of caseData.CASES.slice(0,6))await req('/api/events',learner,{events:[{id:eid(),kind:'decision',unitId:c.id,mode:'response',step:0,at:Date.now(),choice:c.options.findIndex(o=>o.scores.every(s=>s===2))}]});
const call=callData.calls[0],run={node:call.start,history:[],done:true,disposition:'',at:Date.now()};while(!call.nodes[run.node].end){const n=call.nodes[run.node],option=n.options.findIndex(o=>o.grade==='supported');run.history.push({node:run.node,option});run.node=n.options[option].next;}run.disposition=call.nodes[run.node].outcome;
await req('/api/events',learner,{events:[{id:eid(),kind:'call_complete',unitId:call.id,run}]});
record=(await req('/api/onboarding')).data;assert(record.summary.complete);assert.equal(record.summary.status,'Needs review');
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'ready',comment:'Explanations and call evidence support moving to supervised practice.',evidenceVersion:record.evidenceVersion})).status,200);
assert.equal((await req('/api/onboarding')).data.summary.status,'Ready for supervised calls');
const helpId=eid();await req('/api/onboarding/help',learner,{id:helpId,unitId:'cloud',message:'How can I explain cloud administration without making a technical claim?'});
assert.equal((await req('/api/onboarding')).data.summary.openHelp,1);
await req('/api/admin/onboarding/resolve-help',owner,{id:eid(),userId:'learner',helpId,comment:'Describe user access and support ownership; route architecture questions to the specialist.'});
record=(await req('/api/onboarding')).data;assert.equal(record.summary.openHelp,0);assert(record.resolvedHelp[0].response.comment.includes('specialist'));

const reviewedTask=TASKS[0],taskEventId=record.tasks[reviewedTask.id].eventId;
const exerciseReview={id:eid(),userId:'learner',taskId:reviewedTask.id,taskEventId,decision:'practice',strength:'You explained ongoing support and ownership in plain English.',adjustment:'Add one business-level discovery question about the current support model.',nextStep:'Revise the explanation with one question and submit the updated answer.'};
assert.equal((await req('/api/admin/onboarding/task-review',learner,exerciseReview)).status,403);
assert.equal((await req('/api/admin/onboarding/task-review',owner,{...exerciseReview,taskEventId:'old-submission'})).status,409);
r=await req('/api/admin/onboarding/task-review',owner,exerciseReview);
assert.equal(r.status,200);assert.equal(r.data.taskReviews[reviewedTask.id].current,true);assert.equal(r.data.summary.tasksToRevise,1);assert.equal(r.data.summary.complete,false);assert.equal(r.data.summary.status,'Needs targeted practice');
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'ready',comment:'Cannot skip a current requested revision.',evidenceVersion:r.data.evidenceVersion})).status,409);
r=await req('/api/onboarding/task',learner,{id:eid(),taskId:reviewedTask.id,answers:answers(reviewedTask)});
assert.equal(r.data.taskReviews[reviewedTask.id].current,false);assert.equal(r.data.summary.tasksToRevise,0);assert.equal(r.data.summary.complete,true);assert.equal(r.data.review.current,false);
r=await req('/api/admin/onboarding/task-review',owner,{...exerciseReview,id:eid(),taskEventId:r.data.tasks[reviewedTask.id].eventId,decision:'ready',adjustment:'',nextStep:'Carry this clear explanation into your next practice conversation.'});
assert.equal(r.data.summary.tasksWithFeedback,1);assert.equal(r.data.summary.tasksToRevise,0);
assert((await req('/api/activity',learner)).data.items.some(e=>e.label==='Exercise feedback received'));

await req('/api/admin/onboarding/assignment',owner,{userId:'learner',brief:{...brief,coverage:'New approved coverage scope.'},dueAt:null});
record=(await req('/api/onboarding')).data;assert(!record.summary.complete);assert.equal(record.summary.tasksSubmitted,4);assert.equal(record.summary.status,'Client briefing required');assert.equal(record.review.current,false);
assert.equal((await req('/api/onboarding/task',learner,{id:eid(),taskId:'client-brief',answers:answers(TASKS.find(t=>t.id==='client-brief')),briefRevision:revision})).status,409);
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'practice',comment:'Review the new coverage before the next call.',evidenceVersion:'stale'})).status,409);
assert.equal((await req('/api/report',learner)).data.report.onboarding.unitsChecked,18);
assert.equal((await req('/api/admin/users',owner)).data.people.find(p=>p.id==='learner').report.onboarding.tasksSubmitted,4);
if(process.argv.includes('--write-layout-fixture')){const records={},practiceRecords={},activityRecords={};for(const p of [owner,learner,other]){records[p.userId]=(await req('/api/admin/onboarding?user='+p.userId,owner)).data;practiceRecords[p.userId]=(await req('/api/report?user='+p.userId,owner)).data;activityRecords[p.userId]=(await req('/api/activity?limit=50&user='+p.userId,owner)).data;}fs.mkdirSync(new URL('../work/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../work/onboarding-fixture.json',import.meta.url),JSON.stringify({records,practiceRecords,activityRecords,list:(await req('/api/admin/users',owner)).data,owner:(await req('/api/session',owner)).data}));}
sqlite.close();console.log('PASS: 18 lessons / 40 checks, authenticated onboarding, ownership and admin authorization, viewed vs checked, canonical scores, first/latest attempts, idempotency, written evidence, current client brief, deadlines, help/replies, readiness gates, and stale-review protection.');
