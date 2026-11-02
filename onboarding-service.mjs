import {aiConfigured,taskAIReviews} from './ai-review-service.mjs';
import content from '../content/onboarding.json' with {type:'json'};
import {evaluateDiagnostic,evaluateContrast,learningRecord} from './learning-service.mjs';
import {participantLabel} from './portal-service.mjs';
const {UNITS,TASKS}=content;
export const BRIEF_FIELDS=[['mspName','MSP name'],['services','Approved services and customer profile'],['territory','Service territory'],['coverage','Support hours and coverage limits'],['assessmentTerms','Assessment scope, eligibility, fees, and commitments'],['handoff','Discovery CTA and handoff requirements'],['differentiators','Approved differentiators'],['restrictions','Claims and contact restrictions']];
const parse=s=>{try{return JSON.parse(s);}catch{return null;}};
const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
const allowed=u=>['owner','admin'].includes(u.role);
const clean=(s,max=2200)=>typeof s==='string'?s.trim().slice(0,max):'';
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9:_-]{8,160}$/.test(v);
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const briefReady=a=>!!a&&BRIEF_FIELDS.slice(0,6).every(([k])=>a.brief[k]?.trim());
async function readEntries(db,userId){const rows=[];let offset=0;while(true){const chunk=(await db.prepare('SELECT * FROM training_onboarding_entries WHERE user_id=? ORDER BY created_at,event_id LIMIT 1000 OFFSET ?').bind(userId,offset).all()).results||[];rows.push(...chunk);if(chunk.length<1000)break;offset+=1000;}return rows.map(r=>({...r,data:parse(r.payload)}));}
async function practiceEvidence(db,userId){
 const rows=(await db.prepare("SELECT event_id,kind,unit_id,aligned,recorded_at FROM training_events WHERE user_id=? AND ((kind='decision' AND mode='response' AND step=0) OR kind='call_complete') ORDER BY recorded_at,event_id").bind(userId).all()).results||[];
 const cases=new Set(rows.filter(r=>r.kind==='decision').map(r=>r.unit_id));
 return {cases:cases.size,calls:new Set(rows.filter(r=>r.kind==='call_complete').map(r=>r.unit_id)).size};
}
export async function onboardingRecord(db,userId,{aiEnabled=false}={}){
 const [rows,ar,rr,practice]=await Promise.all([readEntries(db,userId),db.prepare('SELECT * FROM training_assignments WHERE user_id=?').bind(userId).first(),db.prepare('SELECT * FROM training_readiness_reviews WHERE user_id=?').bind(userId).first(),practiceEvidence(db,userId)]);
 const assignment=ar?{brief:parse(ar.payload)||{},dueAt:ar.due_at,revision:ar.updated_at}:null;
 const checks={},firstChecks={},tasks={},taskReviews={},viewed=new Set(),resolved=new Map(),helps=[];
 for(const r of rows){if(r.kind==='view')viewed.add(r.unit_id);if(r.kind==='check'){checks[r.unit_id]={...r.data,eventId:r.event_id,at:r.created_at};if(!firstChecks[r.unit_id])firstChecks[r.unit_id]=checks[r.unit_id];viewed.add(r.unit_id);}if(r.kind==='task')tasks[r.unit_id]={...r.data,eventId:r.event_id,at:r.created_at};if(r.kind==='task_review')taskReviews[r.unit_id]={...r.data,eventId:r.event_id,at:r.created_at};if(r.kind==='help')helps.push({id:r.event_id,unitId:r.unit_id,...r.data,at:r.created_at});if(r.kind==='resolve_help')resolved.set(r.data.helpId,{comment:r.data.comment,at:r.created_at});}
 for(const [taskId,r]of Object.entries(taskReviews)){const t=TASKS.find(t=>t.id===taskId);r.current=!!tasks[taskId]&&r.taskEventId===tasks[taskId].eventId&&(!t?.requiresBrief||briefReady(assignment)&&tasks[taskId].briefRevision===assignment.revision);}
 const openHelp=helps.filter(x=>!resolved.has(x.id));
 const validTasks=TASKS.filter(t=>tasks[t.id]&&(!t.requiresBrief||briefReady(assignment)&&tasks[t.id].briefRevision===assignment.revision));
 const checked=UNITS.filter(u=>checks[u.id]?.aligned).length;
 const coreTasks=validTasks.filter(t=>!t.requiresBrief).length;
 const coreComplete=checked===UNITS.length&&coreTasks===TASKS.filter(t=>!t.requiresBrief).length&&practice.cases>=6&&practice.calls>=1;
 const aiReviews=aiEnabled?await taskAIReviews(db,userId,tasks):{};
 const aiPending=aiEnabled?validTasks.filter(t=>!taskReviews[t.id]?.current&&aiReviews[t.id]?.state!=='complete').length:0;
 const aiRevisions=aiEnabled?validTasks.filter(t=>!(taskReviews[t.id]?.current&&taskReviews[t.id].decision==='ready')&&aiReviews[t.id]?.state==='complete'&&aiReviews[t.id].feedback?.status!=='strong').length:0;
 const revisionOpen=Object.values(taskReviews).some(r=>r.current&&r.decision==='practice');
 const complete=coreComplete&&validTasks.length===TASKS.length&&!revisionOpen&&!aiPending&&!aiRevisions;
 const supplementalIds=rows.filter(r=>r.kind==='diagnostic'||r.kind==='contrast'||r.kind==='task_review').map(r=>r.event_id);
 const fingerprint=JSON.stringify({...((aiEnabled)?{ai:Object.entries(aiReviews).map(([id,r])=>[id,r.state,r.feedback?.status,r.version,r.current])}:{}),checks:UNITS.map(u=>checks[u.id]?.eventId||''),tasks:TASKS.map(t=>tasks[t.id]?.eventId||''),brief:assignment?.revision||null,practice:[practice.cases>=6,practice.calls>=1],...(supplementalIds.length?{learning:supplementalIds}:{})});
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));const evidenceVersion=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const review=rr?{status:rr.status,comment:rr.comment,at:rr.updated_at,current:rr.evidence_version===evidenceVersion}:null;
 const status=revisionOpen||aiRevisions?'Needs targeted practice':review?.current?review.status==='ready'&&complete?'Ready for supervised calls':'Needs targeted practice':complete?'Needs review':aiPending?'AI feedback pending':coreComplete?'Client briefing required':rows.length?'In progress':'Not started';
 const reinforcement=UNITS.filter(u=>checks[u.id]&&!checks[u.id].aligned).map(u=>({id:u.id,title:u.title,phase:u.phase}));
 const learning=learningRecord(rows,checks);
 const contextual=Object.values(learning.comparisons);
 const summary={dueAt:assignment?.dueAt||null,briefMspName:assignment?.brief?.mspName||null,status,aiEnabled,aiPending,aiRevisions,unitsViewed:viewed.size,unitsChecked:checked,totalUnits:UNITS.length,tasksSubmitted:validTasks.length,totalTasks:TASKS.length,firstCorrect:Object.values(firstChecks).reduce((n,c)=>n+c.score,0),firstPossible:Object.values(firstChecks).reduce((n,c)=>n+c.maxScore,0),latestCorrect:Object.values(checks).reduce((n,c)=>n+c.score,0),latestPossible:Object.values(checks).reduce((n,c)=>n+c.maxScore,0),practice,openHelp:openHelp.length,complete,coreComplete,briefReady:briefReady(assignment),overdue:!!assignment?.dueAt&&Date.now()>assignment.dueAt&&status!=='Ready for supervised calls',lastSubmitted:rows.filter(r=>['check','task','diagnostic','contrast'].includes(r.kind)).at(-1)?.created_at||null,reinforcement,learningActivityCount:learning.activityCount,contextualChecks:contextual.length,contextualAligned:contextual.filter(c=>c.aligned).length,diagnosticScore:learning.diagnostic?.latest.score??null,diagnosticMax:learning.diagnostic?.latest.maxScore??null,nextRecommendation:learning.recommendations[0]?.reason||null,nextRecommendedTopic:learning.recommendations[0]?.title||null,tasksWithFeedback:Object.values(taskReviews).filter(r=>r.current).length,tasksToRevise:Object.values(taskReviews).filter(r=>r.current&&r.decision==='practice').length};
 return {summary,aiReviews,learning,viewedUnits:[...viewed],checks,tasks,taskReviews,help:openHelp,resolvedHelp:helps.filter(x=>resolved.has(x.id)).map(x=>({...x,response:resolved.get(x.id)})),assignment,review,evidenceVersion};
}
async function append(db,userId,eventId,kind,unitId,payload){await db.prepare('INSERT INTO training_onboarding_entries (user_id,event_id,kind,unit_id,payload,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,event_id) DO NOTHING').bind(userId,eventId,kind,unitId,JSON.stringify(payload),Date.now()).run();}
async function input(request){const raw=await request.text();if(raw.length>24000)error(413,'Submission is too large.');if(!request.headers.get('content-type')?.includes('application/json'))error(415,'Send JSON.');const value=parse(raw);if(!value)error(400,'Invalid JSON.');return value;}
export async function handleOnboardingRequest(request,{db,user,ai={}}){
 try{
  const url=new URL(request.url),adminPath=url.pathname.startsWith('/api/admin/');
  if(adminPath&&!allowed(user))error(403,'Training administrator access is required.');
  const b=request.method==='GET'?null:await input(request);
  const target=adminPath?(request.method==='GET'?url.searchParams.get('user'):b.userId):user.user_id;
  if(!target)error(400,'Choose an enrolled participant.');
  const person=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(target).first();if(!person)error(404,'Participant not found. They must sign in to this private site first.');
  if(request.method==='GET'&&['/api/onboarding','/api/admin/onboarding'].includes(url.pathname))return reply({person:await participantLabel(db,person),...await onboardingRecord(db,target,{aiEnabled:aiConfigured(ai)})});
  if(request.method!=='POST')error(405,'Method not allowed.');
  if(url.pathname==='/api/onboarding/view'){
   if(!id(b.id)||!UNITS.some(u=>u.id===b.unitId))error(400,'Unknown lesson.');await append(db,target,b.id,'view',b.unitId,{});
  }else if(url.pathname==='/api/onboarding/diagnostic'){
   if(!id(b.id))error(400,'Use a valid activity identifier.');const result=evaluateDiagnostic(b.choices);await append(db,target,b.id,'diagnostic','starting-point',result);
  }else if(url.pathname==='/api/onboarding/contrast'){
   if(!id(b.id))error(400,'Use a valid activity identifier.');const result=evaluateContrast(b);await append(db,target,b.id,'contrast',result.familyId+':'+result.variantId,result);
  }else if(url.pathname==='/api/onboarding/check'){
   const unit=UNITS.find(u=>u.id===b.unitId);if(!id(b.id)||!unit||!Array.isArray(b.choices)||b.choices.length!==unit.questions.length||b.choices.some((c,i)=>!Number.isInteger(c)||!unit.questions[i].options[c]))error(400,'Answer each knowledge check.');
   const score=b.choices.filter((c,i)=>c===unit.questions[i].answer).length;await append(db,target,b.id,'check',unit.id,{choices:b.choices,score,maxScore:unit.questions.length,aligned:score===unit.questions.length});
  }else if(url.pathname==='/api/onboarding/task'){
   const task=TASKS.find(t=>t.id===b.taskId);if(!id(b.id)||!task)error(400,'Unknown applied exercise.');const answers={};
   for(const f of task.fields){const value=clean(b.answers?.[f.id],f.max+1);if(value.length<f.min||value.length>f.max)error(400,`${f.label}: write ${f.min}–${f.max} characters.`);answers[f.id]=value;}
   let briefRevision=null;if(task.requiresBrief){const ar=await db.prepare('SELECT * FROM training_assignments WHERE user_id=?').bind(target).first();const a=ar?{brief:parse(ar.payload),revision:ar.updated_at}:null;if(!briefReady(a))error(409,'Your administrator must complete the assigned MSP brief first.');if(b.briefRevision!==a.revision)error(409,'Your MSP brief changed. Read the current version before submitting.');briefRevision=a.revision;}
   await append(db,target,b.id,'task',task.id,{answers,briefRevision});
  }else if(url.pathname==='/api/onboarding/help'){
   const message=clean(b.message,801);if(!id(b.id)||message.length<10||message.length>800||b.unitId!=='general'&&!UNITS.some(u=>u.id===b.unitId)&&!TASKS.some(t=>t.id===b.unitId))error(400,'Choose a topic and describe your question in 10–800 characters.');await append(db,target,b.id,'help',b.unitId,{message});
  }else if(url.pathname==='/api/admin/onboarding/assignment'){
   const brief={};for(const [key]of BRIEF_FIELDS)brief[key]=clean(b.brief?.[key],2200);const due=b.dueAt==null?null:b.dueAt;if(due!==null&&(!Number.isFinite(due)||due<0||due>Date.now()+5*365*86400000))error(400,'Choose a valid target date.');
   const old=await db.prepare('SELECT payload,updated_at FROM training_assignments WHERE user_id=?').bind(target).first();const at=old?.payload===JSON.stringify(brief)?old.updated_at:Math.max(Date.now(),(old?.updated_at||0)+1);
   await db.prepare('INSERT INTO training_assignments (user_id,payload,due_at,updated_at,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,due_at=excluded.due_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(target,JSON.stringify(brief),due,at,user.user_id).run();
  }else if(url.pathname==='/api/admin/onboarding/review'){
   const record=await onboardingRecord(db,target,{aiEnabled:aiConfigured(ai)});if(b.evidenceVersion!==record.evidenceVersion)error(409,'The participant’s evidence changed. Refresh before reviewing.');if(!['ready','practice'].includes(b.status))error(400,'Choose a readiness outcome.');if(b.status==='ready'&&!record.summary.complete)error(409,'Complete the knowledge checks, applied work, assigned MSP brief, six cases, and one full call before a readiness approval.');const comment=clean(b.comment,2201);if(comment.length<15||comment.length>2200)error(400,'Add specific feedback in 15–2200 characters.');
   await db.prepare('INSERT INTO training_readiness_reviews (user_id,status,comment,evidence_version,updated_at,updated_by) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,comment=excluded.comment,evidence_version=excluded.evidence_version,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(target,b.status,comment,record.evidenceVersion,Date.now(),user.user_id).run();
  }else if(url.pathname==='/api/admin/onboarding/task-review'){
   const record=await onboardingRecord(db,target,{aiEnabled:aiConfigured(ai)}),task=TASKS.find(t=>t.id===b.taskId),submission=record.tasks[b.taskId];
   if(!id(b.id)||!task||!submission)error(400,'Choose a submitted exercise.');
   if(submission.eventId!==b.taskEventId)error(409,'The trainee updated this answer. Refresh before adding feedback.');
   if(!['ready','practice'].includes(b.decision))error(400,'Choose the next coaching step.');
   const strength=clean(b.strength,1201),adjustment=clean(b.adjustment,1201),nextStep=clean(b.nextStep,1201);
   if(strength.length<10||strength.length>1200||nextStep.length<10||nextStep.length>1200||adjustment.length>1200||b.decision==='practice'&&adjustment.length<10)error(400,'Add specific feedback: what worked and a next step (10–1200 characters each). A revision also needs one focused adjustment.');
   await append(db,target,b.id,'task_review',task.id,{taskEventId:submission.eventId,decision:b.decision,strength,adjustment,nextStep,reviewer:user.user_id});
  }else if(url.pathname==='/api/admin/onboarding/resolve-help'){
   const found=await db.prepare("SELECT event_id FROM training_onboarding_entries WHERE user_id=? AND event_id=? AND kind='help'").bind(target,b.helpId).first();if(!found||!id(b.id))error(400,'Question not found.');const note=clean(b.comment,1200);if(note.length<10)error(400,'Add a useful response of at least 10 characters.');await append(db,target,b.id,'resolve_help','general',{helpId:b.helpId,comment:note,actor:user.user_id});
  }else error(404,'Onboarding endpoint not found.');
  return reply({saved:true,...await onboardingRecord(db,target,{aiEnabled:aiConfigured(ai)})});
 }catch(e){if(e.status)return reply({error:e.message},e.status);console.error('Onboarding request failed:',e?.message);return reply({error:'Training storage is temporarily unavailable. Keep your draft and try again.'},503);}
}
