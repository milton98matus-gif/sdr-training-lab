import cases from '../content/cases.json' with {type:'json'};
import onboarding from '../content/onboarding.json' with {type:'json'};
import learning from '../content/learning-path.json' with {type:'json'};
const {UNITS,TASKS}=onboarding;
const parse=value=>{try{return JSON.parse(value);}catch{return {};}};
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const submitted="kind IN ('decision','call_complete','check','task','diagnostic','contrast','game_complete') AND origin<>'browser-import'";
const union="SELECT 'practice' AS stream,event_id AS id,unit_id,kind,recorded_at AS at,details AS payload,source AS origin,unit_type,topic,score,max_score,aligned FROM training_events WHERE user_id=? UNION ALL SELECT 'onboarding' AS stream,event_id AS id,unit_id,kind,created_at AS at,payload,'onboarding' AS origin,'' AS unit_type,'' AS topic,NULL AS score,NULL AS max_score,NULL AS aligned FROM training_onboarding_entries WHERE user_id=? UNION ALL SELECT 'review' AS stream,'current-review' AS id,'' AS unit_id,'review' AS kind,updated_at AS at,json_object('status',status,'comment',comment) AS payload,'administrator' AS origin,'' AS unit_type,'' AS topic,NULL AS score,NULL AS max_score,NULL AS aligned FROM training_readiness_reviews WHERE user_id=? UNION ALL SELECT 'game' AS stream,event_id AS id,mission_id AS unit_id,'game_complete' AS kind,created_at AS at,payload,'game' AS origin,'mission' AS unit_type,'' AS topic,score,max_score,NULL AS aligned FROM training_game_runs WHERE user_id=?";
function range(from,to){
 if(from!==null&&(!Number.isFinite(from)||from<0)||to!==null&&(!Number.isFinite(to)||to<0)||from!==null&&to!==null&&from>to)fail('Choose a valid activity period.');
 let sql='',args=[];if(from!==null){sql+=' AND at>=?';args.push(from);}if(to!==null){sql+=' AND at<=?';args.push(to);}return {sql,args};
}
function bindUser(userId){return [userId,userId,userId,userId];}
export async function activitySummary(db,userId,{from=null,to=null}={}){
 const r=range(from,to);
 const row=await db.prepare("SELECT COUNT(CASE WHEN kind='view' THEN 1 END) AS openEvents,COUNT(CASE WHEN "+submitted+" THEN 1 END) AS submissions,COUNT(DISTINCT CASE WHEN "+submitted+" THEN date(at/1000.0,'unixepoch','-6 hours') END) AS practiceDays,MAX(CASE WHEN kind='view' THEN at END) AS lastOpened,MAX(CASE WHEN "+submitted+" THEN at END) AS lastSubmitted,COUNT(CASE WHEN origin='browser-import' THEN 1 END) AS imports FROM ("+union+") WHERE 1=1"+r.sql).bind(...bindUser(userId),...r.args).first();
 return {openEvents:Number(row?.openEvents||0),submissions:Number(row?.submissions||0),practiceDays:Number(row?.practiceDays||0),lastOpened:row?.lastOpened||null,lastSubmitted:row?.lastSubmitted||null,imports:Number(row?.imports||0),status:row?.submissions?'Submitted work':row?.openEvents?'Opened only':'No activity in this period',from,to};
}
function describe(row){
 const data=parse(row.payload),unit=UNITS.find(u=>u.id===row.unit_id),task=TASKS.find(t=>t.id===row.unit_id),details=[];
 let title=unit?.title||task?.title||data.title||row.unit_id,label='',score=row.score,maxScore=row.max_score,aligned=row.aligned===null?null:!!row.aligned;
 if(row.stream==='game'){label='Opportunity mission submitted';for(const r of data.rounds||[])details.push({label:r.criterion,text:r.response+' '+r.coaching});}
 else if(row.stream==='practice'){
  label=row.kind==='view'?'Practice item opened':row.kind==='call_complete'?'Full call submitted':'Practice decision submitted';
  if(row.kind==='decision'){details.push({label:'Your response',text:data.response||''},{label:'Coaching',text:data.coaching||''},{label:'The boundary',text:data.limit||''});}
  if(row.kind==='call_complete'){for(const d of data.decisions||[])details.push({label:d.skill,text:d.response+' '+d.coach});details.push({label:'Recorded next step',text:cases.ACTIONS[data.selectedOutcome]?.label||'Not classified'},{label:'Reference next step',text:cases.ACTIONS[data.outcome]?.label||'Check the call evidence'});}
 }else if(row.kind==='view')label='Lesson opened';
 else if(row.kind==='check'){
  label='Lesson decisions submitted';score=data.score;maxScore=data.maxScore;aligned=!!data.aligned;
  for(const [i,q] of (unit?.questions||[]).entries()){const option=q.options[data.choices?.[i]];details.push({label:q.prompt,text:(option?.text||'')+' '+(option?.why||'')});}
 }else if(row.kind==='task'){label='Written exercise submitted';for(const f of task?.fields||[])details.push({label:f.label,text:data.answers?.[f.id]||''});}
 else if(row.kind==='diagnostic'){label='Starting-point diagnostic submitted';title='Find your starting point';score=data.score;maxScore=data.maxScore;aligned=null;for(const d of data.domains||[])details.push({label:d.name,text:d.score+' / '+d.maxScore+' reference decisions'});}
 else if(row.kind==='contrast'){
  label='Context decision submitted';const family=learning.COMPARISONS.find(f=>f.id===data.familyId),variant=family?.variants.find(v=>v.id===data.variantId);title=family?family.title+' · '+variant?.label:row.unit_id;aligned=!!data.aligned;
  if(variant)details.push({label:'Your response',text:variant.options[data.choice]?.text||''},{label:'Coaching',text:variant.options[data.choice]?.why||''},{label:'The boundary',text:variant.boundary});
 }else if(row.kind==='task_review'){label='Exercise feedback received';title=task?.title||row.unit_id;details.push({label:'What you handled well',text:data.strength||''},{label:'One useful adjustment',text:data.adjustment||'Keep building on this approach.'},{label:'Try this next',text:data.nextStep||''});}
 else if(row.kind==='help'){label='Help requested';title=unit?.title||task?.title||'Training question';details.push({label:'Question',text:data.message||''});}
 else if(row.kind==='resolve_help'){label='Administrator replied';title='A response to your training question';details.push({label:'Feedback',text:data.comment||''});}
 else if(row.kind==='review'){label='Latest readiness review';title=data.status==='ready'?'Recorded review: ready for supervised calls':'Recorded review: focused practice';details.push({label:'Administrator feedback',text:data.comment||''});}
 return {aiReviewable:['decision','call_complete','check','task','diagnostic','contrast'].includes(row.kind),id:row.stream+':'+row.id,at:row.at,title,label,score,maxScore,aligned,evidence:row.origin==='browser-import'?'import':row.kind==='view'?'opened':row.kind==='review'||row.kind==='resolve_help'||row.kind==='task_review'?'coaching':row.kind==='help'?'help':'submitted',imported:row.origin==='browser-import',details};
}
export async function activityTimeline(db,userId,{from=null,to=null,cursor=null,limit=30}={}){
 if(!Number.isInteger(limit)||limit<1||limit>50)fail('Choose up to 50 activity records per page.');
 const r=range(from,to);let sql="SELECT * FROM ("+union+") WHERE 1=1"+r.sql,args=[...bindUser(userId),...r.args];
 if(cursor){
  let c;try{c=JSON.parse(atob(cursor));}catch{fail('Refresh the activity timeline to continue.');}
  if(!Number.isFinite(c.at)||!['practice','onboarding','review','game'].includes(c.stream)||typeof c.id!=='string'||c.id.length>160)fail('Refresh the activity timeline to continue.');
  sql+=' AND (at<? OR (at=? AND (stream<? OR (stream=? AND id<?))))';args.push(c.at,c.at,c.stream,c.stream,c.id);
 }
 const rows=(await db.prepare(sql+' ORDER BY at DESC,stream DESC,id DESC LIMIT ?').bind(...args,limit+1).all()).results||[],page=rows.slice(0,limit),last=page.at(-1);
 return {items:page.map(describe),nextCursor:rows.length>limit&&last?btoa(JSON.stringify({at:last.at,stream:last.stream,id:last.id})):null};
}
