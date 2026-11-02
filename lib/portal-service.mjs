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
 let creds = null;
 try {
  creds = await db.prepare('SELECT organization, title, reset_requested, reset_requested_at FROM training_user_credentials WHERE user_id=?').bind(row.user_id).first();
 } catch(e) {}

 return {
  id:row.user_id,
  name:profile.complete?profile.firstName+' '+profile.lastName:row.display_name,
  email:row.email,
  role:row.role,
  joinedAt:row.created_at,
  organization:creds?.organization || profile.approvedMsp || 'OSR Manage',
  title:creds?.title || '',
  resetRequested:!!creds?.reset_requested,
  resetRequestedAt:creds?.reset_requested_at || null,
  profile
 };
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
 await db.prepare('INSERT INTO training_participant_details (user_id,first_name,last_name,requested_msp_id,approved_msp_id,verified_at,verified_by,tour_completed_at,updated_at) VALUES (?,?,?,?,NULL,NULL,NULL,?,?) ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,requested_msp_id=excluded.requested_msp_id,approved_msp_id=CASE WHEN ? THEN NULL ELSE training_participant_details.approved_msp_id END,verified_at=CASE WHEN ? THEN NULL ELSE training_participant_details.verified_at END,verified_by=CASE WHEN ? THEN NULL ELSE training_participant_details.verified_by END,updated_at=excluded.updated_at').bind(userId,first,last,requested,previous.tourCompletedAt||null,Date.now(),changed,changed,changed).run();
 return participantDetails(db,userId);
}

export async function verifyParticipant(db,adminUser,b){
 if(!isAdmin(adminUser))fail(403,'Only administrators can verify participant assignments.');
 const targetId=typeof b?.userId==='string'?b.userId.trim():'';if(!targetId)fail(400,'Choose a participant to verify.');
 const person=await db.prepare('SELECT user_id FROM training_profiles WHERE user_id=?').bind(targetId).first();if(!person)fail(404,'Participant not found.');
 const mspId=typeof b?.mspId==='string'?b.mspId.trim():'';if(!mspId)fail(400,'Choose an approved MSP account.');
 if(!(await db.prepare('SELECT id FROM training_msp_accounts WHERE id=? AND active=1').bind(mspId).first()))fail(400,'The selected MSP account is not active.');
 await db.prepare('INSERT INTO training_participant_details (user_id,first_name,last_name,requested_msp_id,approved_msp_id,verified_at,verified_by,tour_completed_at,updated_at) VALUES (?,"","",?, ?, ?, ?, NULL, ?) ON CONFLICT(user_id) DO UPDATE SET approved_msp_id=excluded.approved_msp_id,verified_at=excluded.verified_at,verified_by=excluded.verified_by,updated_at=excluded.updated_at').bind(targetId,mspId,mspId,Date.now(),adminUser.user_id,Date.now()).run();
 return participantDetails(db,targetId);
}

export async function saveMspAccount(db,adminUser,b){
 if(!isAdmin(adminUser))fail(403,'Only administrators can manage MSP accounts.');
 const accountName=typeof b?.name==='string'?b.name.trim().replace(/\s+/g,' '):'';
 if(accountName.length<2||accountName.length>80)fail(400,'Add an account name between 2 and 80 characters.');
 const normalized=accountName.toLowerCase();
 const active=b.active===false?0:1;
 const id=typeof b?.id==='string'&&b.id.trim()?b.id.trim():normalized.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(!id)fail(400,'Invalid MSP account identifier.');
 const existing=await db.prepare('SELECT id,normalized_name FROM training_msp_accounts WHERE normalized_name=?').bind(normalized).first();
 if(existing&&existing.id!==id)fail(409,'An MSP account with this name already exists.');
 await db.prepare('INSERT INTO training_msp_accounts (id,name,normalized_name,active,updated_at,updated_by) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,normalized_name=excluded.normalized_name,active=excluded.active,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(id,accountName,normalized,active,Date.now(),adminUser.user_id).run();
 return {id,name:accountName,active:Boolean(active)};
}

export function executiveSignal(person){
 const p=person?.report;if(!p)return {status:'Pending start',color:'muted',nextAction:'Sign in and explore onboarding'};
 if((p.onboarding?.tasksSubmitted||0)>=5&&p.casesCompleted>=50&&p.callsCompleted>=3)return {status:'Ready for live execution',color:'green',nextAction:'Schedule first live call'};
 if((p.onboarding?.tasksSubmitted||0)>0||p.casesCompleted>10)return {status:'Active practice',color:'blue',nextAction:'Complete mission simulations'};
 return {status:'Onboarding foundations',color:'orange',nextAction:'Finish core onboarding modules'};
}
