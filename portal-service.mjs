const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const isAdmin=user=>['owner','admin'].includes(user.role);
const name=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').normalize('NFC'):'';
const validName=value=>value.length>=1&&value.length<=60&&/^[\p{L}\p{M} .’'\-]+$/u.test(value)&&/\p{L}/u.test(value);
export async function participantDetails(db,userId){
 const row=await db.prepare('SELECT d.*,a.name AS approved_msp,r.name AS requested_msp FROM training_participant_details d LEFT JOIN training_msp_accounts a ON a.id=d.approved_msp_id LEFT JOIN training_msp_accounts r ON r.id=d.requested_msp_id WHERE d.user_id=?').bind(userId).first();
 return row?{firstName:row.first_name,lastName:row.last_name,complete:!!row.first_name&&!!row.last_name,requestedMspId:row.requested_msp_id,requestedMsp:row.requested_msp,approvedMspId:row.approved_msp_id,approvedMsp:row.approved_msp,verified:row.verified_at!==null,verifiedAt:row.verified_at,tourCompletedAt:row.tour_completed_at,updatedAt:row.updated_at}:{firstName:'',lastName:'',complete:false,requestedMspId:null,requestedMsp:null,approvedMspId:null,approvedMsp:null,verified:false,verifiedAt:null,tourCompletedAt:null};
}
export async function participantLabel(db,row){
 const profile=await participantDetails(db,row.user_id);
 return {id:row.user_id,name:profile.complete?profile.firstName+' '+profile.lastName:row.display_name,email:row.email,role:row.role,joinedAt:row.created_at,profile};
}
export async function mspAccounts(db,all=false){
 return (await db.prepare('SELECT id,name,active FROM training_msp_accounts'+(all?'':' WHERE active=1')+' ORDER BY name').all()).results||[];
}
export async function saveParticipant(db,userId,b){
 const previous=await participantDetails(db,userId);
 if(b.tourCompleted===true&&b.firstName===undefined){
  await db.prepare("INSERT INTO training_participant_details (user_id,first_name,last_name,requested_msp_id,approved_msp_id,verified_at,verified_by,tour_completed_at,updated_at) VALUES (?,'','',NULL,NULL,NULL,NULL,?,?) ON CONFLICT(user_id) DO UPDATE SET tour_completed_at=excluded.tour_completed_at").bind(userId,Date.now(),Date.now()).run();
  return participantDetails(db,userId);
 }
 const first=name(b.firstName),last=name(b.lastName),requested=b.requestedMspId||null;if(requested!==null&&(typeof requested!=='string'||requested.length>100))fail(400,'Choose an available MSP account.');
 if(!validName(first)||!validName(last))fail(400,'Add your real first name and last name, using letters, spaces, apostrophes or hyphens.');
 if(requested&&!(await db.prepare('SELECT id FROM training_msp_accounts WHERE id=? AND active=1').bind(requested).first()))fail(400,'Choose an available MSP account or Not assigned yet.');
 const changed=first!==previous.firstName||last!==previous.lastName||requested!==previous.requestedMspId;
 await db.prepare('INSERT INTO training_participant_details (user_id,first_name,last_name,requested_msp_id,approved_msp_id,verified_at,verified_by,tour_completed_at,updated_at) VALUES (?,?,?,?,NULL,NULL,NULL,NULL,?) ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,requested_msp_id=excluded.requested_msp_id,verified_at=CASE WHEN ? THEN NULL ELSE training_participant_details.verified_at END,verified_by=CASE WHEN ? THEN NULL ELSE training_participant_details.verified_by END,updated_at=excluded.updated_at').bind(userId,first,last,requested,Date.now(),Number(changed),Number(changed)).run();
 return participantDetails(db,userId);
}
export async function verifyParticipant(db,user,b){
 if(!isAdmin(user))fail(403,'Training administrator access is required.');
 if(typeof b.userId!=='string'||b.userId.length>200)fail(400,'Choose an enrolled participant.');
 const target=await db.prepare('SELECT user_id FROM training_profiles WHERE user_id=?').bind(b.userId).first();if(!target)fail(404,'Participant not found.');
 const detail=await participantDetails(db,b.userId);if(!detail.complete)fail(409,'Ask this person to complete their first and last name first.');
 const approved=b.approvedMspId||null;if(approved!==null&&(typeof approved!=='string'||approved.length>100))fail(400,'Choose an active MSP account.');
 if(approved&&!(await db.prepare('SELECT id FROM training_msp_accounts WHERE id=? AND active=1').bind(approved).first()))fail(400,'Choose an active MSP account.');
 const at=Date.now();
 await db.batch([
  db.prepare('UPDATE training_participant_details SET approved_msp_id=?,verified_at=?,verified_by=?,updated_at=? WHERE user_id=?').bind(approved,at,user.user_id,at,b.userId),
  db.prepare('INSERT INTO training_role_audit (id,actor_id,target_id,previous_role,new_role,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),user.user_id,b.userId,'profile:'+JSON.stringify({msp:detail.approvedMspId,verified:detail.verified}),'profile:'+JSON.stringify({msp:approved,verified:true}),at)
 ]);
 return participantDetails(db,b.userId);
}
export async function saveMspAccount(db,user,b){
 if(!isAdmin(user))fail(403,'Training administrator access is required.');
 if(b.id!==undefined&&(typeof b.id!=='string'||b.id.length>100))fail(400,'Choose an existing MSP account.');
 const label=name(b.name);if(label.length<2||label.length>100||/[<>\x00-\x1f]/.test(label))fail(400,'Use an MSP name with 2–100 characters.');
 const existing=b.id?await db.prepare('SELECT * FROM training_msp_accounts WHERE id=?').bind(b.id).first():null;
 if(b.id&&!existing)fail(404,'MSP account not found.');
 const duplicate=await db.prepare('SELECT id FROM training_msp_accounts WHERE normalized_name=?').bind(label.toLocaleLowerCase('en-US')).first();
 if(duplicate&&duplicate.id!==b.id)fail(409,'That MSP already exists.');
 const count=await db.prepare('SELECT COUNT(*) AS n FROM training_msp_accounts').first();if(!existing&&count.n>=150)fail(429,'The MSP account list has reached its limit.');
 const id=existing?.id||crypto.randomUUID(),at=Date.now();
 await db.prepare('INSERT INTO training_msp_accounts (id,name,normalized_name,active,updated_at,updated_by) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,normalized_name=excluded.normalized_name,active=excluded.active,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(id,label,label.toLocaleLowerCase('en-US'),b.active===false?0:1,at,user.user_id).run();
 return {saved:true,accounts:await mspAccounts(db,true)};
}
export function executiveSignal(person){
 const o=person.report.onboarding||{},p=person.profile||{},activity=person.report.activity||{},reasons=[];
 if(o.openHelp)reasons.push({kind:'help',text:o.openHelp+' training question(s) waiting',action:'Answer the training question'});
 if(o.overdue)reasons.push({kind:'overdue',text:'Assigned target date passed',action:'Review the target and remaining work'});
 if(o.tasksToRevise||o.aiRevisions||o.status==='Needs targeted practice')reasons.push({kind:'practice',text:'A focused revision is needed',action:o.nextRecommendation||'Open the written feedback and assign a focused retry'});
 if(o.status==='Needs review')reasons.push({kind:'review',text:'Required evidence is ready for review',action:'Review the submissions and supervised-call readiness'});
 if(!p.complete||!p.verified)reasons.push({kind:'profile',text:!p.complete?'Profile incomplete':'Profile needs confirmation',action:'Confirm identity and MSP'});
 const status=o.status==='Ready for supervised calls'?'Ready for supervised calls':reasons.length?'Needs attention':activity.submissions?'Learning in progress':'Check learning evidence';
 const s=person.report.suggestions?.[0];
 return {status,reasons,nextAction:reasons[0]?.action||o.nextRecommendation||(s?'Practice '+s.topic:'Continue the next required lesson'),lastSubmitted:Math.max(activity.lastSubmitted||0,o.lastSubmitted||0)||null};
}
