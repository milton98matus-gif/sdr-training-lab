import crypto from 'node:crypto';
import { hashPassword } from '../server/auth.mjs';
import {recordPresence,presenceSummary,presenceRecord,presenceAnalytics} from './presence-service.mjs';
import {participantLabel,participantDetails,mspAccounts,saveParticipant,verifyParticipant,saveMspAccount,executiveSignal} from './portal-service.mjs';
import {submitGame,gameRecord} from './game-service.mjs';
import {aiConfigured,aiReview} from './ai-review-service.mjs';
import {activitySummary,activityTimeline} from './activity-service.mjs';
import {handleOnboardingRequest,onboardingRecord} from './onboarding-service.mjs';
import caseContent from '../content/cases.json' with {type:'json'};
import callContent from '../content/calls.json' with {type:'json'};
import glossaryContent from '../content/glossary.json' with {type:'json'};
const {CASES,ACTIONS}=caseContent,{calls}=callContent,{GLOSSARY}=glossaryContent;
const CASE_KEY='sdr-lab-msp-v2',CALL_KEY='sdr-call-lab-preview-v1';
const callTopics={expansion:'Discovery',covered:'Positioning',contract:'Next steps'};
const roles=['participant','admin','owner'];
class Failure extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new Failure(status,message);};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const now=()=>Date.now();
const admin=u=>u.role==='owner'||u.role==='admin';
const scalarTime=v=>Number.isFinite(v)&&v>0&&v<now()+86400000?v:null;
const parse=s=>{try{return JSON.parse(s);}catch{return null;}};
function validateAttempt(a){const c=CASES.find(c=>c.id===a?.caseId);const m=a?.step===1?c?.followup:c;if(!m||!['response','evaluation'].includes(a?.mode)||!scalarTime(a.at))return null;const choice=a.choice;if(a.mode==='response'?!Number.isInteger(choice)||!m.options[choice]:!Object.hasOwn(ACTIONS,choice))return null;return {caseId:c.id,mode:a.mode,choice,step:a.step===1?1:0,at:a.at,...(typeof a.eventId==='string'&&/^[a-zA-Z0-9:_-]{8,160}$/.test(a.eventId)?{eventId:a.eventId}:{})};}
function validateCall(c,r){if(!r||!Array.isArray(r.history)||r.history.length>20)return null;let node=c.start;const history=[];for(const h of r.history){const n=c.nodes[node];if(!n||n.end||h.node!==node||!Number.isInteger(h.option)||!n.options[h.option])return null;history.push({node,option:h.option});node=n.options[h.option].next;}if(r.node!==node||r.disposition&&!Object.hasOwn(ACTIONS,r.disposition)||r.done&&(!c.nodes[node].end||!r.disposition))return null;return {node,history,disposition:r.disposition||'',note:typeof r.note==='string'?r.note.slice(0,6000):'',done:!!r.done,at:scalarTime(r.at)||now(),updatedAt:scalarTime(r.updatedAt)||scalarTime(r.at)||now(),...(typeof r.eventId==='string'&&/^[a-zA-Z0-9:_-]{8,160}$/.test(r.eventId)?{eventId:r.eventId}:{})};}
export function normalizeSnapshot(scope,payload){
 if(!payload||typeof payload!=='object')fail(400,'A practice state is required.');
 if(scope===CASE_KEY){const firsts={};for(const a of Object.values(payload.firsts||{})){const v=validateAttempt(a);if(v&&!v.step)firsts[`${v.caseId}:${v.mode}`]=v;}return {firsts,history:(Array.isArray(payload.history)?payload.history:[]).map(validateAttempt).filter(Boolean).slice(-100),caseId:CASES.some(c=>c.id===payload.caseId)?payload.caseId:CASES[0].id,mode:['response','evaluation'].includes(payload.mode)?payload.mode:'response'};}
 if(scope===CALL_KEY){const sessions={};for(const c of calls){const v=validateCall(c,payload.sessions?.[c.id+':sdr']);if(v)sessions[c.id+':sdr']=v;}return {sessions,runs:(Array.isArray(payload.runs)?payload.runs:[]).filter(r=>r.mode==='sdr'&&calls.some(c=>c.id===r.call)&&scalarTime(r.at)).map(r=>({call:r.call,mode:'sdr',at:r.at})).slice(-24)};}
 fail(400,'Unknown practice state.');
}
export function mergeSnapshots(scope,previous,incoming){
 if(!previous)return incoming;
 if(scope===CASE_KEY){const firsts={...previous.firsts};for(const [k,a]of Object.entries(incoming.firsts)){if(!firsts[k]||a.at<firsts[k].at)firsts[k]=a;}const hs=new Map([...previous.history,...incoming.history].map(a=>[[a.caseId,a.mode,a.step,a.at,a.choice].join(':'),a]));return {...incoming,firsts,history:[...hs.values()].sort((a,b)=>a.at-b.at).slice(-100)};}
 const sessions={...previous.sessions};for(const [k,s]of Object.entries(incoming.sessions))if(!sessions[k]||(s.updatedAt||s.at)>=(sessions[k].updatedAt||sessions[k].at))sessions[k]=s;const rs=new Map([...previous.runs,...incoming.runs].map(r=>[r.call+':'+r.at,r]));return {sessions,runs:[...rs.values()].sort((a,b)=>a.at-b.at).slice(-24)};
}
export function normalizeEvent(e){
 if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9:_-]{8,160}$/.test(e.id))fail(400,'Invalid activity identifier.');
 const base={eventId:e.id,kind:e.kind,unitType:e.unitType,unitId:e.unitId,topic:'',mode:'',step:0,score:null,maxScore:null,aligned:null,details:{},clientAt:scalarTime(e.at)};
 if(e.kind==='view'){
  if(e.unitType==='section'){
   const group=e.unitId?.startsWith('vocabulary:')?e.unitId.slice(11):null;
   if(e.unitId!=='glossary'&&!GLOSSARY.some(t=>t.group===group))fail(400,'Unknown training section.');
   return {...base,topic:group?'Vocabulary: '+group:'Vocabulary overview',details:{title:group||'Glossary overview'}};
  }
  const item=e.unitType==='case'?CASES.find(c=>c.id===e.unitId):e.unitType==='call'?calls.find(c=>c.id===e.unitId):e.unitType==='glossary'?GLOSSARY.find(t=>t.id===e.unitId):null;if(!item)fail(400,'Unknown practice item.');
  return {...base,topic:e.unitType==='case'?item.category:e.unitType==='call'?callTopics[item.id]:'Vocabulary: '+item.group,details:{title:item.title||item.label}};
 }
 if(e.kind==='decision'){
  const a=validateAttempt({...e,caseId:e.unitId});if(!a)fail(400,'Invalid practice decision.');const c=CASES.find(c=>c.id===a.caseId),m=a.step?c.followup:c;const response=a.mode==='response';const score=response?m.options[a.choice].scores.reduce((x,y)=>x+y,0):Number(a.choice===m.action),maxScore=response?8:1;
  return {...base,unitType:'case',topic:c.category,mode:a.mode,step:a.step,score,maxScore,aligned:Number(score===maxScore),details:{choice:a.choice,criterionScores:response?m.options[a.choice].scores:null,title:c.title,expectedAction:m.action,response:response?m.options[a.choice].text:ACTIONS[a.choice].label,coaching:response?m.options[a.choice].why:m.evidence,signal:m.evidence,limit:m.limit},clientAt:a.at};
 }
 if(e.kind==='call_complete'){
  const c=calls.find(c=>c.id===e.unitId);if(!c)fail(400,'Unknown call.');const r=validateCall(c,e.run);if(!r||!r.done)fail(400,'A completed call path is required.');const terminal=c.nodes[r.node];const decisions=r.history.map(h=>{const n=c.nodes[h.node],o=n.options[h.option];return {skill:n.skill,grade:o.grade,coach:o.coach,signal:n.line,response:o.say};});const score=decisions.filter(d=>d.grade==='supported').length;
  return {...base,unitType:'call',topic:callTopics[c.id],mode:'sdr',score,maxScore:decisions.length,aligned:Number(score===decisions.length&&r.disposition===terminal.outcome),details:{title:c.title,decisions,outcome:terminal.outcome,selectedOutcome:r.disposition,outcomeAligned:r.disposition===terminal.outcome}};
 }
 fail(400,'Unknown activity type.');
}
async function body(request){const type=request.headers.get('content-type')||'';if(!type.includes('application/json'))fail(415,'Send JSON.');const value=await request.text();if(value.length>180000)fail(413,'Request is too large.');const data=parse(value);if(!data)fail(400,'Invalid JSON.');return data;}
async function profile(db,identity,ownerEmail,adminEmails=[]){
 const at=now();
 const KNOWN_OWNERS = new Set(['milton98matus@gmail.com', 'mmatus@osrmanage.com', (ownerEmail||'').toLowerCase()].filter(Boolean));
 const isOwner = KNOWN_OWNERS.has((identity.email||'').toLowerCase()) || identity.role === 'owner';
 
 await db.prepare('INSERT INTO training_profiles (user_id,email,display_name,role,created_at,last_seen_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,last_seen_at=excluded.last_seen_at').bind(identity.userId,identity.email,identity.displayName||identity.email,isOwner?'owner':'participant',at,at).run();
 let user=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(identity.userId).first();
 if(isOwner && user.role !== 'owner'){
  await db.prepare("UPDATE training_profiles SET role='owner' WHERE user_id=?").bind(user.user_id).run();
  user.role='owner';
 }
 if(user.role!=='owner'&&configuredAdmins(adminEmails).has(identity.email.toLowerCase())){
  const marker='configured-admin:'+user.user_id;
  await db.batch([
   db.prepare("UPDATE training_profiles SET role='admin' WHERE user_id=? AND role<>'owner' AND NOT EXISTS (SELECT 1 FROM training_role_audit WHERE id=?)").bind(user.user_id,marker),
   db.prepare("INSERT INTO training_role_audit (id,actor_id,target_id,previous_role,new_role,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(marker,'site-owner-configuration',user.user_id,user.role,'admin',at)
  ]);
  user=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(user.user_id).first();
 }
 return user;
}
function configuredAdmins(value){
 const list=typeof value==='string'?parse(value):value;
 return new Set((Array.isArray(list)?list:[]).slice(0,50).filter(v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).map(v=>v.trim().toLowerCase()));
}
async function recordEvents(db,userId,events,source='practice'){
 if(!Array.isArray(events)||events.length>30)fail(400,'Send up to 30 activities at a time.');
 const normalized=events.map(normalizeEvent),at=now();
 if(normalized.length)await db.batch(normalized.map(e=>db.prepare('INSERT INTO training_events (user_id,event_id,kind,unit_type,unit_id,topic,mode,step,score,max_score,aligned,details,client_at,recorded_at,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,event_id) DO NOTHING').bind(userId,e.eventId,e.kind,e.unitType,e.unitId,e.topic,e.mode,e.step,e.score,e.maxScore,e.aligned,JSON.stringify(e.details),e.clientAt,at,source)));
 return normalized.length;
}
async function saveSnapshot(db,userId,scope,incoming,reset=false){
 for(let attempt=0;attempt<4;attempt++){
  const old=await db.prepare('SELECT payload,updated_at FROM training_snapshots WHERE user_id=? AND scope=?').bind(userId,scope).first();
  const payload=reset?incoming:mergeSnapshots(scope,parse(old?.payload),incoming),at=Math.max(now(),(old?.updated_at||0)+1);
  const statement=old?db.prepare('UPDATE training_snapshots SET payload=?,updated_at=? WHERE user_id=? AND scope=? AND updated_at=?').bind(JSON.stringify(payload),at,userId,scope,old.updated_at):db.prepare('INSERT INTO training_snapshots (user_id,scope,payload,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,scope) DO NOTHING').bind(userId,scope,JSON.stringify(payload),at);
  const result=await statement.run();if(result.meta?.changes)return;
 }
 fail(409,'Practice changed on another device. Please try saving again.');
}
function labelRole(row){return {id:row.user_id,name:row.display_name,email:row.email,role:row.role,joinedAt:row.created_at};}
function summarize(rows){
 const seen=new Set(),done=new Set(),callDone=new Set(),vocab=new Set(),firsts=new Map(),latest=new Map(),topics=new Map(),callsAll=[],latestCalls=new Map();
 const topic=name=>{if(!topics.has(name))topics.set(name,{name,viewed:new Set(),practiced:new Set(),firsts:[],latest:[],callGaps:0,callDecisions:0});return topics.get(name);};
 for(const e of rows){const t=topic(e.topic);if(e.kind==='view'){t.viewed.add(e.unit_type+':'+e.unit_id);if(e.unit_type==='case')seen.add(e.unit_id);if(e.unit_type==='glossary')vocab.add(e.unit_id);}
  if(e.kind==='decision'){seen.add(e.unit_id);t.viewed.add('case:'+e.unit_id);t.practiced.add('case:'+e.unit_id);if(!e.step){done.add(e.unit_id);const k=e.unit_id+':'+e.mode;if(!firsts.has(k))firsts.set(k,e);if(!latest.has(k)||e.source==='practice'||latest.get(k).source!=='practice')latest.set(k,e);}}
  if(e.kind==='call_complete'){callDone.add(e.unit_id);t.viewed.add('call:'+e.unit_id);t.practiced.add('call:'+e.unit_id);callsAll.push(e);if(!latestCalls.has(e.unit_id)||e.source==='practice'||latestCalls.get(e.unit_id).source!=='practice')latestCalls.set(e.unit_id,e);}
 }
 for(const e of firsts.values())topic(e.topic).firsts.push(e);for(const e of latest.values())topic(e.topic).latest.push(e);for(const e of latestCalls.values()){const details=parse(e.details);for(const d of details?.decisions||[]){const name=d.skill==='Agreement & handoff'?'Next steps':d.skill==='Listening & boundaries'?'Nurture & exit':d.skill;const dt=topic(name);dt.callDecisions++;if(d.grade!=='supported')dt.callGaps++;}const close=topic('Next steps');close.callDecisions++;if(!details?.outcomeAligned)close.callGaps++;}
 const topicRows=[...topics.values()].map(t=>({name:t.name,viewed:t.viewed.size,practiced:t.practiced.size,firstDecisions:t.firsts.length,firstAligned:t.firsts.filter(e=>e.aligned).length,latestDecisions:t.latest.length,latestAligned:t.latest.filter(e=>e.aligned).length,callDecisions:t.callDecisions,callGaps:t.callGaps}));
 const criteria=['Listening & boundaries','Evidence & judgment','Relevance & honesty','Agreement & handoff'].map((name,i)=>{const es=[...firsts.values()].filter(e=>e.mode==='response');return {name,observations:es.length,points:es.reduce((n,e)=>n+(parse(e.details)?.criterionScores?.[i]||0),0),possible:es.length*2};});
 const suggestions=topicRows.filter(t=>t.latestAligned<t.latestDecisions||t.callGaps).sort((a,b)=>(b.latestDecisions-b.latestAligned+b.callGaps)-(a.latestDecisions-a.latestAligned+a.callGaps)).map(t=>({topic:t.name,latestGaps:t.latestDecisions-t.latestAligned,latestDecisions:t.latestDecisions,callGaps:t.callGaps,callDecisions:t.callDecisions}));
 return {casesViewed:seen.size,casesCompleted:done.size,totalCases:CASES.length,firstDecisions:firsts.size,totalDecisions:CASES.length*2,firstAligned:[...firsts.values()].filter(e=>e.aligned).length,latestAligned:[...latest.values()].filter(e=>e.aligned).length,callsCompleted:callDone.size,totalCalls:calls.length,callRuns:callsAll.length,vocabularyOpened:vocab.size,totalVocabulary:GLOSSARY.length,lastActivity:rows.at(-1)?.recorded_at||null,topics:topicRows,criteria,suggestions};
}
async function report(db,userId,from,to,topic){
 let sql='SELECT * FROM training_events WHERE user_id=?',args=[userId];
 if(from){sql+=' AND recorded_at>=?';args.push(from);}if(to){sql+=' AND recorded_at<=?';args.push(to);}
 // Aggregate the complete selected range in pages; no silently truncated report.
 let rows=[],offset=0;while(true){const chunk=(await db.prepare(sql+' ORDER BY recorded_at,event_id LIMIT 1000 OFFSET ?').bind(...args,offset).all()).results||[];rows.push(...chunk);if(chunk.length<1000)break;offset+=1000;}
 if(topic)rows=rows.filter(e=>{if(e.topic===topic)return true;if(e.kind!=='call_complete')return false;if(topic==='Next steps')return true;return (parse(e.details)?.decisions||[]).some(d=>(d.skill==='Agreement & handoff'?'Next steps':d.skill==='Listening & boundaries'?'Nurture & exit':d.skill)===topic);});
 const summary=summarize(rows);if(topic){summary.topics=summary.topics.filter(t=>t.name===topic);summary.suggestions=summary.suggestions.filter(t=>t.topic===topic);}
 const recent=rows.slice(-20).reverse().map(e=>({kind:e.kind,unitType:e.unit_type,unitId:e.unit_id,topic:e.topic,mode:e.mode,checkpoint:!!e.step,score:e.score,maxScore:e.max_score,aligned:e.aligned,at:e.recorded_at,source:e.source,title:parse(e.details)?.title||e.unit_id,details:parse(e.details)}));
 return {...summary,recent};
}
export async function handleTrainingRequest(request,{db,identity,ownerEmail,adminEmails=[],ai={}}){
 try{
  if(!identity?.userId||!identity?.email)fail(401,'Inicia sesión para guardar tu práctica y abrir registros.');
  if(!db)fail(503,'Training storage is temporarily unavailable.');
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
  if(!['GET','POST','PUT'].includes(request.method))fail(405,'Method not allowed.');
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)fail(403,'Use the training site to submit changes.');
  const user=await profile(db,identity,ownerEmail,adminEmails);
  if(path==='/api/onboarding'||path.startsWith('/api/onboarding/')||path==='/api/admin/onboarding'||path.startsWith('/api/admin/onboarding/'))return handleOnboardingRequest(request,{db,user,ai});
  if(path==='/api/session'&&request.method==='GET'){
   const rows=(await db.prepare('SELECT scope,payload FROM training_snapshots WHERE user_id=?').bind(user.user_id).all()).results||[];
   return json({user:await participantLabel(db,user),ai:{enabled:aiConfigured(ai)},snapshots:Object.fromEntries(rows.map(r=>[r.scope,parse(r.payload)]))});
  }
  if(path.startsWith('/api/portal/')){
   try{
    if(path==='/api/portal/profile'&&request.method==='GET')return json({user:await participantLabel(db,user),accounts:await mspAccounts(db)});
    if(path==='/api/portal/profile'&&request.method==='PUT'){await saveParticipant(db,user.user_id,await body(request));return json({user:await participantLabel(db,user)});}
    if(path==='/api/portal/accounts'&&request.method==='GET')return json({accounts:await mspAccounts(db,admin(user))});
    if(path==='/api/portal/accounts'&&request.method==='POST')return json(await saveMspAccount(db,user,await body(request)));
    if(path==='/api/portal/verify'&&request.method==='POST')return json({profile:await verifyParticipant(db,user,await body(request))});
    if(path==='/api/portal/game'&&request.method==='POST')return json(await submitGame(db,user.user_id,await body(request)));
    if(['/api/portal/game','/api/portal/time'].includes(path)&&request.method==='GET'){
     const target=url.searchParams.get('user')||user.user_id;
     if(target!==user.user_id&&!admin(user))fail(403,'Training administrator access is required to open another participant’s record.');
     if(!await db.prepare('SELECT user_id FROM training_profiles WHERE user_id=?').bind(target).first())fail(404,'Participant not found.');
     const read=k=>url.searchParams.has(k)?Number(url.searchParams.get(k)):null,bounds={from:read('from'),to:read('to')};
     if(bounds.from!==null&&(!Number.isFinite(bounds.from)||bounds.from<0)||bounds.to!==null&&(!Number.isFinite(bounds.to)||bounds.to<0)||bounds.from!==null&&bounds.to!==null&&bounds.from>bounds.to)fail(400,'Choose a valid reporting period.');
     return json(path==='/api/portal/time'?await presenceAnalytics(db,target,bounds):await gameRecord(db,target,bounds));
    }
    fail(404,'Portal endpoint not found.');
   }catch(e){if(e.status)fail(e.status,e.message);throw e;}
  }
  if(path==='/api/events'&&request.method==='POST'){const b=await body(request);return json({accepted:await recordEvents(db,user.user_id,b.events)});}
  if(path==='/api/state'&&request.method==='PUT'){
   const b=await body(request);const incoming=normalizeSnapshot(b.scope,b.payload);await saveSnapshot(db,user.user_id,b.scope,incoming,b.reset===true);return json({saved:true});
  }
  if(path==='/api/import'&&request.method==='POST'){
   const b=await body(request),state=normalizeSnapshot(CASE_KEY,b.cases||{}),callState=normalizeSnapshot(CALL_KEY,b.calls||{}),events=[];
   for(const a of Object.values(state.firsts))events.push({id:`import:${a.caseId}:${a.mode}`,kind:'decision',unitId:a.caseId,...a});
   for(const [key,r]of Object.entries(callState.sessions))if(r.done)events.push({id:'import:call:'+key,kind:'call_complete',unitId:key.split(':')[0],run:r,at:r.at});
   for(let i=0;i<events.length;i+=30)await recordEvents(db,user.user_id,events.slice(i,i+30),'browser-import');
   for(const [scope,incoming]of [[CASE_KEY,state],[CALL_KEY,callState]])await saveSnapshot(db,user.user_id,scope,incoming);
   return json({imported:events.length});
  }
  const readBound=k=>{if(!url.searchParams.has(k))return null;const n=Number(url.searchParams.get(k));if(!Number.isFinite(n)||n<0)fail(400,'Choose a valid reporting period.');return n;};
  const from=readBound('from'),to=readBound('to'),topic=url.searchParams.get('topic')||'';if(from!==null&&to!==null&&from>to)fail(400,'Choose a valid reporting period.');
  if(path==='/api/presence/beat'&&request.method==='POST'){
   try{return json(await recordPresence(db,user.user_id,await body(request)));}catch(e){if(e.status)fail(e.status,e.message);throw e;}
  }
  if(path==='/api/presence'&&request.method==='GET'){
   const target=url.searchParams.get('user')||user.user_id;if(target!==user.user_id&&!admin(user))fail(403,'Only reporting administrators can open another participant’s portal timing.');
   const person=await db.prepare('SELECT user_id FROM training_profiles WHERE user_id=?').bind(target).first();if(!person)fail(404,'Participant not found.');
   const number=k=>url.searchParams.has(k)?Number(url.searchParams.get(k)):null;
   try{return json(await presenceRecord(db,target,{from:number('from'),to:number('to'),cursor:url.searchParams.get('cursor'),limit:Number(url.searchParams.get('limit')||10)}));}catch(e){if(e.status)fail(e.status,e.message);throw e;}
  }
  if(path==='/api/ai/review'){
   const b=request.method==='GET'?null:await body(request);
   const target=(b?b.userId:url.searchParams.get('user'))||user.user_id;
   if(target!==user.user_id&&!admin(user))fail(403,'Only reporting administrators can open another participant’s AI feedback.');
   if(!['GET','POST'].includes(request.method))fail(405,'Method not allowed.');
   try{return json(await aiReview(db,target,b?.source||url.searchParams.get('source'),b?.eventId||url.searchParams.get('eventId'),ai,request.method==='POST'));}catch(e){if(e.status)fail(e.status,e.message);throw e;}
  }
  if(path==='/api/activity'&&request.method==='GET'){
   const target=url.searchParams.get('user')||user.user_id;if(target!==user.user_id&&!admin(user))fail(403,'Only reporting administrators can open another participant’s activity.');
   const person=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(target).first();if(!person)fail(404,'Participant not found.');
   const bounds={from,to};try{return json({person:await participantLabel(db,person),summary:await activitySummary(db,target,bounds),...await activityTimeline(db,target,{...bounds,cursor:url.searchParams.get('cursor'),limit:Number(url.searchParams.get('limit')||30)})});}catch(e){if(e.status)fail(e.status,e.message);throw e;}
  }
  if(path==='/api/report'&&request.method==='GET'){
   const target=url.searchParams.get('user')||user.user_id;if(target!==user.user_id&&!admin(user))fail(403,'Only reporting administrators can open another participant’s record.');
   const p=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(target).first();if(!p)fail(404,'Participant not found.');return json({person:await participantLabel(db,p),report:{...await report(db,target,from,to,topic),onboarding:(await onboardingRecord(db,target,{aiEnabled:aiConfigured(ai)})).summary,presence:await presenceSummary(db,target,{from,to}),activity:await activitySummary(db,target,{from,to}),games:await gameRecord(db,target,{from,to})}});
  }
  if(path.startsWith('/api/admin/')){
   if(!admin(user))fail(403,'Reporting administrator access is required.');
   if(path==='/api/admin/users'&&request.method==='GET'){
    const profiles=(await db.prepare('SELECT * FROM training_profiles ORDER BY display_name').all()).results||[];
    const people=[];for(const p of profiles){const person={...await participantLabel(db,p),report:{...await report(db,p.user_id,from,to,topic),onboarding:(await onboardingRecord(db,p.user_id,{aiEnabled:aiConfigured(ai)})).summary,presence:await presenceSummary(db,p.user_id,{from,to}),activity:await activitySummary(db,p.user_id,{from,to}),games:await gameRecord(db,p.user_id,{from,to})}};person.executive=executiveSignal(person);people.push(person);}
    return json({people,canManageRoles:user.role==='owner',topics:[...new Set([...CASES.map(c=>c.category),'Vocabulary overview',...GLOSSARY.map(t=>'Vocabulary: '+t.group)])]});
   }
   if(path==='/api/admin/role'&&request.method==='POST'){
    if(user.role!=='owner')fail(403,'Only the site owner can name reporting administrators or assign owners.');
    const b=await body(request);if(!roles.includes(b.role))fail(400,'Choose participant, admin, or owner.');
    const target=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(b.userId).first();
    if(!target)fail(404,'User profile was not found.');
    if(target.user_id===user.user_id)fail(400,'You cannot modify your own role.');
    await db.batch([
      db.prepare('UPDATE training_profiles SET role=? WHERE user_id=?').bind(b.role,target.user_id),
      db.prepare('INSERT INTO training_role_audit (id,actor_id,target_id,previous_role,new_role,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),user.user_id,target.user_id,target.role,b.role,now())
    ]);
    return json({changed:true,role:b.role});
   }
   if(path==='/api/admin/users/create'&&request.method==='POST'){
    const b=await body(request);
    const email=(b.email||'').trim().toLowerCase();
    const name=(b.name||'').trim();
    const org=(b.organization||'OSR Manage').trim();
    const title=(b.title||'').trim();
    const requestedRole=b.role||'participant';
    const password=(b.password||'').trim();

    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Provide a valid email address.');
    if(!name)fail(400,'Provide the person’s full name.');
    if(!password||password.length<6)fail(400,'Password must be at least 6 characters.');
    if(!roles.includes(requestedRole))fail(400,'Invalid role.');
    if(requestedRole==='owner'&&user.role!=='owner')fail(403,'Only an owner can create another owner.');

    const existing=await db.prepare('SELECT user_id FROM training_user_credentials WHERE email=?').bind(email).first();
    if(existing)fail(409,'A user with this email already exists.');

    const newUserId=`usr_${Buffer.from(email).toString('hex').slice(0, 24)}`;
    const {hash,salt}=hashPassword(password);
    const at=now();

    await db.prepare(`
      INSERT INTO training_user_credentials 
      (user_id, email, display_name, organization, title, password_hash, salt, reset_requested, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(newUserId, email, name, org, title, hash, salt, at, at).run();

    await db.prepare(`
      INSERT INTO training_profiles (user_id, email, display_name, role, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET email=excluded.email, display_name=excluded.display_name, role=excluded.role
    `).bind(newUserId, email, name, requestedRole, at, at).run();

    const [firstName, ...rest]=name.split(' ');
    const lastName=rest.join(' ')||'';
    await db.prepare(`
      INSERT INTO training_participant_details
      (user_id, first_name, last_name, requested_msp_id, approved_msp_id, verified_at, verified_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET approved_msp_id=excluded.approved_msp_id, updated_at=excluded.updated_at
    `).bind(newUserId, firstName, lastName, org, org, at, user.user_id, at).run();

    return json({ok:true, user:{id:newUserId, email, name, organization:org, role:requestedRole}});
   }
   if(path==='/api/admin/users/reset-password'&&request.method==='POST'){
    const b=await body(request);
    const targetId=b.userId;
    const newPassword=(b.newPassword||'').trim();
    if(!targetId)fail(400,'Missing userId.');
    if(!newPassword||newPassword.length<6)fail(400,'New password must be at least 6 characters.');

    const targetProfile=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(targetId).first();
    if(!targetProfile)fail(404,'User profile not found.');
    if(targetProfile.role==='owner'&&user.role!=='owner')fail(403,'Only an owner can reset an owner’s password.');

    const {hash,salt}=hashPassword(newPassword);
    const at=now();
    await db.prepare(`
      UPDATE training_user_credentials 
      SET password_hash=?, salt=?, reset_requested=0, reset_requested_at=NULL, updated_at=?
      WHERE user_id=?
    `).bind(hash, salt, at, targetId).run();

    return json({ok:true, message:'Password updated successfully.'});
   }
   if(path==='/api/admin/users/delete'&&request.method==='POST'){
    if(user.role!=='owner')fail(403,'Only the site owner can remove users.');
    const b=await body(request);
    const targetId=b.userId;
    if(!targetId||targetId===user.user_id)fail(400,'You cannot remove yourself.');
    const targetProfile=await db.prepare('SELECT * FROM training_profiles WHERE user_id=?').bind(targetId).first();
    if(!targetProfile)fail(404,'User not found.');
    if(targetProfile.role==='owner')fail(403,'Another owner cannot be deleted directly. Demote their role first.');

    await db.prepare('DELETE FROM training_profiles WHERE user_id=?').bind(targetId).run();
    await db.prepare('DELETE FROM training_user_credentials WHERE user_id=?').bind(targetId).run();
    await db.prepare('DELETE FROM training_participant_details WHERE user_id=?').bind(targetId).run();

    return json({ok:true, removed:targetId});
   }
  }
  fail(404,'Training endpoint not found.');
 }catch(e){if(e instanceof Failure)return json({error:e.message},e.status);console.error('Training request failed:',e?.message);return json({error:'Training storage is temporarily unavailable. Your browser copy remains available.'},503);}
}
