import content from '../content/opportunity-game.json' with {type:'json'};
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export async function submitGame(db,userId,b){
 const mission=content.missions.find(m=>m.id===b.missionId);
 if(typeof b.id!=='string'||!/^[a-zA-Z0-9:_-]{8,160}$/.test(b.id)||!mission||b.version!==content.version||!Array.isArray(b.choices)||b.choices.length!==mission.rounds.length||b.choices.some((c,i)=>!Number.isInteger(c)||!mission.rounds[i].options[c]))fail(400,'Complete each mission decision before saving this attempt.');
 const existing=await db.prepare('SELECT mission_id,payload FROM training_game_runs WHERE user_id=? AND event_id=?').bind(userId,b.id).first();
 if(existing){const old=JSON.parse(existing.payload);if(existing.mission_id!==mission.id||JSON.stringify(old.choices)!==JSON.stringify(b.choices))fail(409,'That attempt is already saved. Start a new attempt to change your decisions.');return {saved:true,duplicate:true};}
 const count=await db.prepare('SELECT COUNT(*) AS n FROM training_game_runs WHERE user_id=? AND created_at>?').bind(userId,Date.now()-86400000).first();if(count.n>=100)fail(429,'Your mission attempts are saved. Continue with another learning activity today.');
 const rounds=mission.rounds.map((r,i)=>({title:r.title,criterion:r.criterion,response:r.options[b.choices[i]].text,points:r.options[b.choices[i]].points,coaching:r.options[b.choices[i]].why,reference:r.options.find(o=>o.points===2).text}));
 const score=rounds.reduce((n,r)=>n+r.points,0),payload={title:mission.title,topic:mission.skill,choices:b.choices,rounds};
 await db.prepare('INSERT INTO training_game_runs (user_id,event_id,mission_id,version,score,max_score,payload,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,event_id) DO NOTHING').bind(userId,b.id,mission.id,content.version,score,mission.rounds.length*2,JSON.stringify(payload),Date.now()).run();
 return {saved:true,score,maxScore:mission.rounds.length*2};
}
export async function gameRecord(db,userId,{from=null,to=null}={}){
 let sql='SELECT * FROM training_game_runs WHERE user_id=?',args=[userId];if(from!==null){sql+=' AND created_at>=?';args.push(from);}if(to!==null){sql+=' AND created_at<=?';args.push(to);}
 const stats=await db.prepare('SELECT COUNT(*) AS attempts,COUNT(DISTINCT mission_id) AS missions,MAX(created_at) AS lastSubmitted FROM ('+sql+')').bind(...args).first();
 const rows=(await db.prepare(sql+' ORDER BY created_at DESC,event_id DESC LIMIT 12').bind(...args).all()).results||[];
 const latest=(await db.prepare('SELECT r.*,(SELECT score FROM training_game_runs f WHERE f.user_id=r.user_id AND f.mission_id=r.mission_id ORDER BY created_at,event_id LIMIT 1) AS first_score,(SELECT max_score FROM training_game_runs f WHERE f.user_id=r.user_id AND f.mission_id=r.mission_id ORDER BY created_at,event_id LIMIT 1) AS first_max FROM training_game_runs r WHERE r.user_id=? AND NOT EXISTS (SELECT 1 FROM training_game_runs n WHERE n.user_id=r.user_id AND n.mission_id=r.mission_id AND (n.created_at>r.created_at OR (n.created_at=r.created_at AND n.event_id>r.event_id)))').bind(userId).all()).results||[];
 return {attempts:Number(stats?.attempts||0),missions:Number(stats?.missions||0),totalMissions:content.missions.length,lastSubmitted:stats?.lastSubmitted||null,latest:latest.map(r=>({missionId:r.mission_id,firstScore:r.first_score,firstMaxScore:r.first_max,score:r.score,maxScore:r.max_score,at:r.created_at,title:JSON.parse(r.payload).title})),recent:rows.map(r=>({id:r.event_id,missionId:r.mission_id,score:r.score,maxScore:r.max_score,at:r.created_at,...JSON.parse(r.payload)}))};
}
