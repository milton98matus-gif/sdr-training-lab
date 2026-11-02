const BUCKET=30000,SECOND=1000,FULL=2**30-1,MAX_SPAN=45000;
const sections=new Set(['onboarding','foundations','lab','calllab','progress','glossary','training','reporting','guide','game','walkthrough']);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
export const popcount=n=>{let count=0;for(n=n>>>0;n;n&=n-1)count++;return count;};
export function intervalMask(start,end,bucket){
 const low=Math.max(0,Math.min(30,Math.floor((start-bucket)/SECOND))),high=Math.max(0,Math.min(30,Math.ceil((end-bucket)/SECOND)));
 return high>low?((2**high-1)^(2**low-1))>>>0:0;
}
export function presenceStatus(row,now=Date.now()){
 if(!row)return 'Not recorded yet';
 if(row.closed_at!==null)return row.close_reason==='sign_out'?'Signed out':'Session ended';
 if(now-row.last_seen_at>90000)return 'No recent signal';
 return row.state==='interaction'?'Recent interaction':row.state==='visible'?'Open · no recent interaction':'Background / away';
}
function validate(b){
 if(!b||!validId(b.sessionId)||!Number.isSafeInteger(b.sequence)||b.sequence<1||b.sequence>1000000||!Number.isFinite(b.spanMs)||b.spanMs<0||b.spanMs>86400000||!Number.isFinite(b.visibleMs)||b.visibleMs<0||b.visibleMs>b.spanMs||!Number.isFinite(b.interactionMs)||b.interactionMs<0||b.interactionMs>b.visibleMs||!['interaction','visible','away'].includes(b.state)||!sections.has(b.section)||b.closeReason&&!['sign_out','page_exit'].includes(b.closeReason))fail(400,'Send a valid portal timing signal.');
 if(b.segments!==undefined){
  if(!Array.isArray(b.segments)||b.segments.length>24||b.segments.some(s=>!sections.has(s.section)||!Number.isFinite(s.spanMs)||s.spanMs<0||!Number.isFinite(s.visibleMs)||s.visibleMs<0||s.visibleMs>s.spanMs||!Number.isFinite(s.interactionMs)||s.interactionMs<0||s.interactionMs>s.visibleMs))fail(400,'Send valid module timing intervals.');
  for(const key of ['spanMs','visibleMs','interactionMs'])if(Math.abs(b.segments.reduce((n,s)=>n+s[key],0)-b[key])>5)fail(400,'Module timing must match the observed interval.');
 }
}
const upsert="INSERT INTO training_time_buckets (user_id,session_id,bucket_start,connected_mask,visible_mask,interaction_mask) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM training_portal_sessions WHERE user_id=? AND session_id=? AND claim_id=?) ON CONFLICT(user_id,session_id,bucket_start) DO UPDATE SET connected_mask=training_time_buckets.connected_mask|excluded.connected_mask,visible_mask=training_time_buckets.visible_mask|excluded.visible_mask,interaction_mask=training_time_buckets.interaction_mask|excluded.interaction_mask";
export async function recordPresence(db,userId,b,now=Date.now()){
 validate(b);const old=await db.prepare('SELECT * FROM training_portal_sessions WHERE user_id=? AND session_id=?').bind(userId,b.sessionId).first();
 if(!old){
  const count=await db.prepare('SELECT COUNT(*) AS n FROM training_portal_sessions WHERE user_id=? AND started_at>?').bind(userId,now-86400000).first();if(count.n>=200)fail(429,'Portal session recording is temporarily limited. Your learning submissions remain available.');
  await db.prepare('INSERT INTO training_portal_sessions (user_id,session_id,started_at,last_seen_at,last_sequence,state,section,closed_at,close_reason,claim_id) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,session_id) DO NOTHING').bind(userId,b.sessionId,now,now,b.sequence,b.state,b.section,b.closeReason?now:null,b.closeReason||null,crypto.randomUUID()).run();
  return {saved:true,started:true};
 }
 if(b.sequence<=old.last_sequence||old.closed_at!==null)return {saved:true,duplicate:true};
 // Server receipt time bounds every interval. Delayed/offline gaps cannot inflate it.
 const span=Math.max(0,Math.min(MAX_SPAN,b.spanMs,now-old.last_seen_at)),scale=b.spanMs?span/b.spanMs:0;
 const visible=Math.min(span,b.visibleMs*scale),interaction=Math.min(visible,b.interactionMs*scale),claim=crypto.randomUUID();
 const statements=[db.prepare('UPDATE training_portal_sessions SET last_seen_at=?,last_sequence=?,state=?,section=?,closed_at=?,close_reason=?,claim_id=? WHERE user_id=? AND session_id=? AND last_sequence<? AND closed_at IS NULL').bind(now,b.sequence,b.state,b.section,b.closeReason?now:null,b.closeReason||null,claim,userId,b.sessionId,b.sequence)];
 const start=now-span;
 for(let bucket=Math.floor(start/BUCKET)*BUCKET;span>0&&bucket<now;bucket+=BUCKET){
  const connected=intervalMask(start,now,bucket),v=intervalMask(now-visible,now,bucket),a=intervalMask(now-interaction,now,bucket);
  for(const id of [b.sessionId,'all'])statements.push(db.prepare(upsert).bind(userId,id,bucket,connected,v&connected,a&v&connected,userId,b.sessionId,claim));
 }
 // Module observations retain the interval's section, including navigation mid-pulse.
 // A union per module removes duplicate tabs; different modules can still overlap.
 let position=start;
 for(const s of b.segments||[{section:b.section,spanMs:b.spanMs,visibleMs:b.visibleMs,interactionMs:b.interactionMs}]){
  const length=s.spanMs*scale,end=Math.min(now,position+length),v=s.visibleMs*scale,a=s.interactionMs*scale;
  for(let bucket=Math.floor(position/BUCKET)*BUCKET;length>0&&bucket<end;bucket+=BUCKET){
   const c=intervalMask(position,end,bucket),vm=intervalMask(end-v,end,bucket)&c,am=intervalMask(end-a,end,bucket)&vm;
   statements.push(db.prepare('INSERT INTO training_section_time_buckets (user_id,section,bucket_start,connected_mask,visible_mask,interaction_mask) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM training_portal_sessions WHERE user_id=? AND session_id=? AND claim_id=?) ON CONFLICT(user_id,section,bucket_start) DO UPDATE SET connected_mask=training_section_time_buckets.connected_mask|excluded.connected_mask,visible_mask=training_section_time_buckets.visible_mask|excluded.visible_mask,interaction_mask=training_section_time_buckets.interaction_mask|excluded.interaction_mask').bind(userId,s.section,bucket,c,vm,am,userId,b.sessionId,claim));
  }
  position=end;
 }
 await db.batch(statements);return {saved:true};
}
function bounds({from=null,to=null}={},now=Date.now()){
 if(from!==null&&(!Number.isFinite(from)||from<0)||to!==null&&(!Number.isFinite(to)||to<0)||from!==null&&to!==null&&from>to)fail(400,'Choose a valid portal timing period.');
 // A future-only filter is a valid empty reporting window.
 const start=from??0;return {from:start,to:Math.max(start,Math.min(to??now,now))};
}
async function aggregate(db,userId,ids,period){
 const {from,to}=period,fullStart=Math.ceil(from/BUCKET)*BUCKET,fullEnd=Math.floor(to/BUCKET)*BUCKET;
 const marks=ids.map(()=>'?').join(','),totals=Object.fromEntries(ids.map(id=>[id,{connectedMs:0,visibleMs:0,interactionMs:0}]));
 if(fullEnd>fullStart){const rows=(await db.prepare('SELECT session_id,SUM(connected_seconds) AS c,SUM(visible_seconds) AS v,SUM(interaction_seconds) AS a FROM training_time_buckets WHERE user_id=? AND session_id IN ('+marks+') AND bucket_start>=? AND bucket_start<? GROUP BY session_id').bind(userId,...ids,fullStart,fullEnd).all()).results||[];for(const row of rows)totals[row.session_id]={connectedMs:Number(row.c||0)*SECOND,visibleMs:Number(row.v||0)*SECOND,interactionMs:Number(row.a||0)*SECOND};}
 const edges=[...new Set([Math.floor(from/BUCKET)*BUCKET,Math.floor(to/BUCKET)*BUCKET])].filter(b=>!(b>=fullStart&&b<fullEnd));
 if(edges.length){const rows=(await db.prepare('SELECT session_id,bucket_start,connected_mask,visible_mask,interaction_mask FROM training_time_buckets WHERE user_id=? AND session_id IN ('+marks+') AND bucket_start IN ('+edges.map(()=>'?').join(',')+')').bind(userId,...ids,...edges).all()).results||[];for(const row of rows){const mask=intervalMask(from,to,row.bucket_start),t=totals[row.session_id];t.connectedMs+=popcount(row.connected_mask&mask)*SECOND;t.visibleMs+=popcount(row.visible_mask&mask)*SECOND;t.interactionMs+=popcount(row.interaction_mask&mask)*SECOND;}}
 return totals;
}
async function summaryRows(db,userId,{from,to}){
 const counts=await db.prepare('SELECT COUNT(*) AS sessions,MIN(started_at) AS firstSeen FROM training_portal_sessions WHERE user_id=? AND started_at<=? AND last_seen_at>=?').bind(userId,to,from).first();
 const latest=await db.prepare('SELECT * FROM training_portal_sessions WHERE user_id=? ORDER BY last_seen_at DESC,session_id DESC LIMIT 1').bind(userId).first();
 const recent=await db.prepare("SELECT * FROM training_portal_sessions WHERE user_id=? AND closed_at IS NULL AND last_seen_at>=? ORDER BY CASE state WHEN 'interaction' THEN 0 WHEN 'visible' THEN 1 ELSE 2 END,last_seen_at DESC LIMIT 1").bind(userId,Date.now()-90000).first();
 return {sessions:Number(counts?.sessions||0),firstSeen:counts?.firstSeen??null,lastSeen:latest?.last_seen_at??null,status:presenceStatus(recent||latest),lastSection:(recent||latest)?.section||null};
}
export async function presenceSummary(db,userId,options={}){
 const period=bounds(options),times=await aggregate(db,userId,['all'],period);
 return {...times.all,...await summaryRows(db,userId,period),from:period.from,to:period.to};
}
export async function presenceRecord(db,userId,options={}){
 const period=bounds(options),limit=options.limit??10;if(!Number.isInteger(limit)||limit<1||limit>25)fail(400,'Choose up to 25 sessions per page.');
 let sql='SELECT * FROM training_portal_sessions WHERE user_id=? AND started_at<=? AND last_seen_at>=?',args=[userId,period.to,period.from];
 if(options.cursor){let cursor;try{cursor=JSON.parse(atob(options.cursor));}catch{fail(400,'Refresh the session history to continue.');}if(!Number.isFinite(cursor.at)||!validId(cursor.id))fail(400,'Refresh the session history to continue.');sql+=' AND (started_at<? OR (started_at=? AND session_id<?))';args.push(cursor.at,cursor.at,cursor.id);}
 const rows=(await db.prepare(sql+' ORDER BY started_at DESC,session_id DESC LIMIT ?').bind(...args,limit+1).all()).results||[],page=rows.slice(0,limit),totals=await aggregate(db,userId,['all',...page.map(r=>r.session_id)],period),last=page.at(-1);
 return {summary:{...totals.all,...await summaryRows(db,userId,period),from:period.from,to:period.to},sessions:page.map(r=>({id:r.session_id,startedAt:r.started_at,lastSeenAt:r.last_seen_at,endedAt:r.closed_at,closeReason:r.close_reason,windowMs:Math.max(0,Math.min(r.last_seen_at,period.to)-Math.max(r.started_at,period.from)),section:r.section,status:presenceStatus(r),...totals[r.session_id]})),nextCursor:rows.length>limit&&last?btoa(JSON.stringify({at:last.started_at,id:last.session_id})):null};
}
const dayKey=at=>new Date(at-21600000).toISOString().slice(0,10);
export async function presenceAnalytics(db,userId,options={}){
 const selected=bounds(options),period={from:options.from??Math.max(0,selected.to-14*86400000),to:selected.to};
 if(period.to-period.from>90*86400000)fail(400,'Choose up to 90 days for the detailed time report. All-time totals remain available in the training record.');
 const daily=new Map(),firstBucket=Math.floor(period.from/BUCKET)*BUCKET,lastBucket=Math.floor(period.to/BUCKET)*BUCKET;
 const dailyRow=day=>{if(!daily.has(day))daily.set(day,{day,connectedMs:0,visibleMs:0,interactionMs:0,sessions:0,submissions:0});return daily.get(day);};
 const rows=(await db.prepare("SELECT date(bucket_start/1000.0,'unixepoch','-6 hours') AS day,SUM(connected_seconds)*1000 AS connectedMs,SUM(visible_seconds)*1000 AS visibleMs,SUM(interaction_seconds)*1000 AS interactionMs FROM training_time_buckets WHERE user_id=? AND session_id='all' AND bucket_start>=? AND bucket_start<=? GROUP BY day ORDER BY day").bind(userId,firstBucket,lastBucket).all()).results||[];
 for(const r of rows)Object.assign(dailyRow(r.day),r);
 const modules=(await db.prepare('SELECT section,SUM(connected_seconds)*1000 AS connectedMs,SUM(visible_seconds)*1000 AS visibleMs,SUM(interaction_seconds)*1000 AS interactionMs FROM training_section_time_buckets WHERE user_id=? AND bucket_start>=? AND bucket_start<=? GROUP BY section ORDER BY visibleMs DESC').bind(userId,firstBucket,lastBucket).all()).results||[];
 const moduleMap=new Map(modules.map(m=>[m.section,m]));
 // Subtract seconds outside a partial first/last bucket from both breakdowns.
 for(const table of ['training_time_buckets','training_section_time_buckets']){
  const es=(await db.prepare('SELECT * FROM '+table+' WHERE user_id=?'+(table==='training_time_buckets'?" AND session_id='all'":'')+' AND bucket_start IN (?,?)').bind(userId,firstBucket,lastBucket).all()).results||[];
  for(const e of es){const mask=intervalMask(period.from,period.to,e.bucket_start),target=table==='training_time_buckets'?dailyRow(dayKey(e.bucket_start)):moduleMap.get(e.section);if(!target)continue;for(const [field,key]of [['connectedMs','connected_mask'],['visibleMs','visible_mask'],['interactionMs','interaction_mask']])target[field]-=popcount(e[key]&(~mask>>>0))*SECOND;}
 }
 const visits=(await db.prepare("SELECT date(started_at/1000.0,'unixepoch','-6 hours') AS day,COUNT(*) AS n FROM training_portal_sessions WHERE user_id=? AND started_at>=? AND started_at<=? GROUP BY day").bind(userId,period.from,period.to).all()).results||[];
 for(const r of visits)dailyRow(r.day).sessions=Number(r.n);
 const evidence="SELECT recorded_at AS at FROM training_events WHERE user_id=? AND kind IN ('decision','call_complete') AND source<>'browser-import' UNION ALL SELECT created_at AS at FROM training_onboarding_entries WHERE user_id=? AND kind IN ('check','task','diagnostic','contrast') UNION ALL SELECT created_at AS at FROM training_game_runs WHERE user_id=?";
 const work=(await db.prepare("SELECT date(at/1000.0,'unixepoch','-6 hours') AS day,COUNT(*) AS n FROM ("+evidence+") WHERE at>=? AND at<=? GROUP BY day").bind(userId,userId,userId,period.from,period.to).all()).results||[];
 for(const r of work)dailyRow(r.day).submissions=Number(r.n);
 for(let at=Date.parse(dayKey(period.from)+'T00:00:00-06:00');at<=period.to;at+=86400000)dailyRow(dayKey(at));
 const firstModule=await db.prepare('SELECT MIN(bucket_start) AS at FROM training_section_time_buckets WHERE user_id=?').bind(userId).first();
 return {from:period.from,to:period.to,timezone:'America/Guatemala',summary:await presenceSummary(db,userId,period),daily:[...daily.values()].sort((a,b)=>a.day.localeCompare(b.day)),modules,modulesRecordedFrom:firstModule?.at??null};
}
