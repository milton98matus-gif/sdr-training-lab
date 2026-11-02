import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleTrainingRequest} from '../lib/training-service.mjs';
import {reviewInput,validateFeedback} from '../lib/ai-review-service.mjs';
import content from '../content/onboarding.json' with {type:'json'};
import learning from '../content/learning-path.json' with {type:'json'};
import cases from '../content/cases.json' with {type:'json'};
import calls from '../content/calls.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
function statement(query,args=[]){return {bind(...a){return statement(query,a)},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}}},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}}};}
const db={prepare:statement,async batch(ss){sql.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const owner={userId:'owner',email:'owner@test.example'},person={userId:'learner',email:'learner@test.example'},other={userId:'other',email:'other@test.example'};
let count=0,mode='normal',captured=[],release;
function feedback(input,status='strong'){return {status,summary:status==='try_again'?'These entries need a meaningful explanation before I can evaluate the skill.':'Your explanation connects the service to a useful business outcome.',strengths:status==='try_again'?[]:[{evidence:input.fields[0].answer.slice(0,30),feedback:'You used a concrete support example.'}],adjustments:status==='strong'?[]:[{fieldId:input.fields[0].id,feedback:'Replace filler with a clear explanation of the service and the condition behind the promise.'}],fields:input.fields.map(f=>({id:f.id,status:status==='try_again'?'needs_answer':'strong',feedback:status==='try_again'?'This text does not yet answer the prompt. Explain one actual service in your own words.':'Keep connecting the service to the stated business need.'})),nextStep:'Write one clear service example and name the scope you would confirm.',example:'I would confirm the support hours in the agreement before discussing after-hours coverage.',flags:status==='try_again'?['insufficient_answer']:[]};}
const transport=async(url,options)=>{count++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-only-not-a-key');const b=JSON.parse(options.body);captured.push(b);assert.equal(b.store,false);assert(!b.tools);assert.equal(b.text.format.strict,true);const input=JSON.parse(b.input[0].content[0].text);if(mode==='slow')await new Promise(r=>release=r);if(mode==='timeout')throw Object.assign(new Error('late'),{name:'TimeoutError'});if(mode==='quota')return new Response('{}',{status:429});if(mode==='refusal')return Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Cannot review this input.'}]}]});if(mode==='invalid')return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not-json'}]}]});let f=feedback(input,mode==='filler'?'try_again':'strong');if(mode==='fabricated')f.strengths[0].evidence='A quote the learner never wrote';return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(f)}]}],usage:{input_tokens:100,output_tokens:200}});};
const ai={apiKey:'test-only-not-a-key',fetch:transport};
let serial=0;const id=()=>`ai-test-event-${String(++serial).padStart(6,'0')}`;
async function req(path,who=person,body,config=ai,origin='https://lab.test'){const r=await handleTrainingRequest(new Request('https://lab.test'+path,{method:body?'POST':'GET',headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{db,identity:who,ownerEmail:owner.email,ai:config});return {status:r.status,data:await r.json()};}
for(const p of [owner,person,other])await req('/api/session',p);
assert((await req('/api/session')).data.ai.enabled);
assert.equal((await req('/api/ai/review',null,{source:'onboarding',eventId:id()})).status,401);
const task=content.TASKS[0],answers=Object.fromEntries(task.fields.map(f=>[f.id,('An MSP supports agreed IT services, owns execution and helps users stay productive. Coverage and assessment fees depend on the approved scope. ').repeat(2)]));
const event=id();await req('/api/onboarding/task',person,{id:event,taskId:task.id,answers});
const body={source:'onboarding',eventId:event};
assert.equal((await req('/api/ai/review',person,{...body,userId:'other'})).status,403);
assert.equal((await req('/api/ai/review',other,body)).status,404);
assert.equal((await req('/api/ai/review',person,body,ai,'https://evil.test')).status,403);
assert.equal((await req('/api/ai/review',person,{...body,eventId:'not-recorded'})).status,404);
assert.equal((await req('/api/ai/review',person,body,{})).data.state,'not_configured');assert.equal(count,0);
let r=await req('/api/ai/review',person,body);assert.equal(r.data.state,'complete');assert.equal(count,1);assert.equal(r.data.feedback.status,'strong');assert(!JSON.stringify(captured).includes('learner@test.example'));
await req('/api/ai/review',person,body);assert.equal(count,1,'Same attempt is cached');
r=await req('/api/ai/review?source=onboarding&eventId='+event+'&user=learner',owner);assert.equal(r.data.feedback.status,'strong');
assert.equal((await req('/api/onboarding')).data.aiReviews[task.id].feedback.status,'strong');
// New answers receive their own feedback and cannot borrow the previous strong review.
mode='filler';const filler=id();await req('/api/onboarding/task',person,{id:filler,taskId:task.id,answers:Object.fromEntries(task.fields.map(f=>[f.id,'Blqtiqksnsisksndniwnsdbjdkamsdndjiwks'.repeat(6)]))});
r=await req('/api/ai/review',person,{source:'onboarding',eventId:filler});assert.equal(r.data.feedback.status,'try_again');assert.deepEqual(r.data.feedback.strengths,[]);
r=await req('/api/onboarding');assert.equal(r.data.summary.aiRevisions,1);assert.equal(r.data.summary.complete,false);assert.equal(r.data.summary.status,'Needs targeted practice');
// The model cannot turn a canonically mismatched check into a strong decision.
mode='normal';const unit=content.UNITS[0],check=id();await req('/api/onboarding/check',person,{id:check,unitId:unit.id,choices:unit.questions.map(q=>(q.answer+1)%3)});
r=await req('/api/ai/review',person,{source:'onboarding',eventId:check});assert.equal(r.data.feedback.status,'almost_there');assert(r.data.feedback.fields.every(f=>f.status==='developing'));assert.equal((await req('/api/onboarding')).data.checks[unit.id].score,0);
// Views, another person's identity, prompts and private notes are never model inputs.
const view=id();await req('/api/onboarding/view',person,{id:view,unitId:unit.id});assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:view})).status,400);
const diagnostic=id();await req('/api/onboarding/diagnostic',person,{id:diagnostic,choices:learning.DIAGNOSTIC.map(q=>q.answer)});assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:diagnostic})).data.feedback.fields.length,8);
const family=learning.COMPARISONS[0],v=family.variants[0],contrast=id();await req('/api/onboarding/contrast',person,{id:contrast,familyId:family.id,variantId:v.id,choice:v.answer});assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:contrast})).data.state,'complete');
const c=cases.CASES[0],decision=id();await req('/api/events',person,{events:[{id:decision,kind:'decision',unitId:c.id,mode:'response',choice:0,at:Date.now()}]});assert.equal((await req('/api/ai/review',person,{source:'practice',eventId:decision})).data.state,'complete');
const call=calls.calls[0],run={node:call.start,history:[],done:true,disposition:'',at:Date.now(),note:'PRIVATE-NOTE-DO-NOT-SEND'};while(!call.nodes[run.node].end){const n=call.nodes[run.node],option=n.options.findIndex(o=>o.grade==='supported');run.history.push({node:run.node,option});run.node=n.options[option].next;}run.disposition=call.nodes[run.node].outcome;const callEvent=id();await req('/api/events',person,{events:[{id:callEvent,kind:'call_complete',unitId:call.id,run}]});
assert(!JSON.stringify((await reviewInput(db,'learner','practice',callEvent)).input).includes('PRIVATE-NOTE'));
// Reset time on recorded tests so subsequent fixtures are not blocked by the real rate guard.
sql.exec('UPDATE training_ai_reviews SET updated_at=updated_at-120000');
assert.equal((await req('/api/ai/review',person,{source:'practice',eventId:callEvent})).data.state,'complete');assert(!JSON.stringify(captured).includes('PRIVATE-NOTE'));
const clientTask=content.TASKS.find(t=>t.requiresBrief),brief={mspName:'Fictional MSP',services:'IT support',territory:'Test area',coverage:'Business hours',assessmentTerms:'Confirm scope and fees',handoff:'Specialist discovery'};
let assigned=await req('/api/admin/onboarding/assignment',owner,{userId:'learner',brief});const clientEvent=id();await req('/api/onboarding/task',person,{id:clientEvent,taskId:clientTask.id,answers:Object.fromEntries(clientTask.fields.map(f=>[f.id,'The approved account brief defines the actual service, hours, terms, territory and discovery handoff. '.repeat(5)])),briefRevision:assigned.data.assignment.revision});
sql.exec('UPDATE training_ai_reviews SET updated_at=updated_at-120000');assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:clientEvent})).data.state,'complete');
await req('/api/admin/onboarding/assignment',owner,{userId:'learner',brief:{...brief,coverage:'Updated scope'}});assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:clientEvent})).data.current,false);
// Concurrent requests claim one model job. Invalid/refused/failing output never becomes complete.
async function freshReview(testMode){const ev=id();await req('/api/onboarding/task',person,{id:ev,taskId:task.id,answers});sql.exec('UPDATE training_ai_reviews SET updated_at=updated_at-120000');mode=testMode;return {source:'onboarding',eventId:ev};}
const slow=await freshReview('slow'),before=count;const pending=req('/api/ai/review',person,slow);while(!release)await new Promise(r=>setTimeout(r,1));assert.equal((await req('/api/ai/review',person,slow)).data.state,'pending');assert.equal(count,before+1);release();assert.equal((await pending).data.state,'complete');release=null;
for(const [testMode,error]of [['refusal','invalid_output'],['invalid','invalid_output'],['fabricated','invalid_output'],['quota','provider_quota'],['timeout','timeout']]){const b=await freshReview(testMode),r=await req('/api/ai/review',person,b);assert.equal(r.data.state,'failed');assert.equal(r.data.error,error);const n=count;await req('/api/ai/review',person,b);assert.equal(count,n,'Immediate failures have a retry cooldown');}
const input=(await reviewInput(db,'learner','onboarding',filler)).input;const unearned=feedback(input);unearned.flags=['insufficient_answer'];assert.equal(validateFeedback(unearned,input).status,'try_again');assert.deepEqual(unearned.strengths,[]);
// Complete the real learning gates: an insufficient written answer still blocks approval.
mode='normal';
for(const u of content.UNITS)await req('/api/onboarding/check',person,{id:id(),unitId:u.id,choices:u.questions.map(q=>q.answer)});
for(const t of content.TASKS){
 const ev=id(),a=Object.fromEntries(t.fields.map(f=>[f.id,('An MSP owns delivery of agreed IT support, cloud and security services. I would confirm coverage, assessment terms and the discovery handoff in the account brief. ').repeat(4)]));
 const current=(await req('/api/onboarding')).data.assignment;
 await req('/api/onboarding/task',person,{id:ev,taskId:t.id,answers:a,briefRevision:current.revision});
 sql.exec('UPDATE training_ai_reviews SET updated_at=updated_at-120000');mode=t.id===task.id?'filler':'normal';
 assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:ev})).data.state,'complete');
}
for(const c of cases.CASES.slice(0,6))await req('/api/events',person,{events:[{id:id(),kind:'decision',unitId:c.id,mode:'response',choice:0,at:Date.now()}]});
let complete=(await req('/api/onboarding')).data;assert(complete.summary.coreComplete);assert.equal(complete.summary.aiPending,0);assert.equal(complete.summary.aiRevisions,1);assert(!complete.summary.complete);
assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'ready',comment:'This cannot bypass the outstanding AI revision.',evidenceVersion:complete.evidenceVersion})).status,409);
await req('/api/admin/onboarding/task-review',owner,{id:id(),userId:'learner',taskId:task.id,taskEventId:complete.tasks[task.id].eventId,decision:'ready',strength:'The explanation states a valid service and scope boundary.',adjustment:'',nextStep:'Carry this explanation into supervised discovery practice.'});
complete=(await req('/api/onboarding')).data;assert(complete.summary.complete,'A current human exercise review can resolve an AI concern.');assert.equal((await req('/api/admin/onboarding/review',owner,{userId:'learner',status:'ready',comment:'Required evidence and written work have been reviewed.',evidenceVersion:complete.evidenceVersion})).status,200);
const countBefore=count;sql.exec("UPDATE training_ai_reviews SET attempts=120,updated_at="+Date.now());assert.equal((await req('/api/ai/review',person,{source:'practice',eventId:decision+'missing'})).status,404);
const limited=id();await req('/api/onboarding/task',person,{id:limited,taskId:task.id,answers});assert.equal((await req('/api/ai/review',person,{source:'onboarding',eventId:limited})).data.state,'rate_limit');assert.equal(count,countBefore);
if(process.argv.includes('--write-layout-fixture')){fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/ai-layout-fixture.json',JSON.stringify({strong:feedback((await reviewInput(db,'learner','onboarding',event)).input),filler:feedback(input,'try_again'),written:(await req('/api/onboarding',person,undefined,{})).data,session:(await req('/api/session',person,undefined,{})).data}));}
sql.close();console.log('PASS: AI review authentication, exact-attempt ownership, all submission families, structured provider contract, evidence quotes, canonical check protection, filler revisions, caching, concurrency claims, scope changes, private-note exclusion, safe errors, retries and usage guards. Provider responses were simulated; live AI is not verified.');
