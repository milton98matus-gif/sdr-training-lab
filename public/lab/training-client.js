'use strict';
const Training=(()=>{
 const scopes=['sdr-lab-msp-v2','sdr-call-lab-preview-v1'];
 let ai={enabled:false},user=null,snapshots={},pending=[],busy=false,online=true,lastView='',timers={},saveCount=0,flushPromise=null;
 const dirtyScopes=new Map(),savingScopes=new Set();
 const listeners=new Set();
 const keyFor=scope=>scope+':'+(user?.id||'unsigned-preview');
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function banner(message){let el=document.querySelector('#account-status');if(!el){el=document.createElement('div');el.id='account-status';el.setAttribute('role','status');document.querySelector('.topbar').after(el);}el.innerHTML=message;}
 function status(){const el=document.querySelector('#account-sync');if(el)el.textContent=!online?'Browser copy available · sync pending':busy||saveCount||dirtyScopes.size?'Saving practice…':'Progress saved to your profile';}
 async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await r.json();if(!r.ok)throw new Error(data.error||'Training request failed.');if(options.method==='POST'&&options.body){let b;try{b=JSON.parse(options.body);}catch{}const attempts=path==='/api/events'?(b?.events||[]).filter(e=>['decision','call_complete'].includes(e.kind)).map(e=>({source:'practice',eventId:e.id})):['/api/onboarding/task','/api/onboarding/check','/api/onboarding/diagnostic','/api/onboarding/contrast'].includes(path)?[{source:'onboarding',eventId:b?.id}]:[];for(const attempt of attempts)window.dispatchEvent(new CustomEvent('sdr-submission-saved',{detail:attempt}));}return data;}
 function localRead(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
 function notify(){for(const f of listeners)f();}
 function legacy(){return !!localRead('sdr-lab-v1')?.history?.length||scopes.some(s=>{const v=localRead(s);return s===scopes[0]?Object.keys(v?.firsts||{}).length>0:Object.values(v?.sessions||{}).some(r=>r.history?.length);});}
 async function initialize(){
  try{const r=await api('/api/session');if(!r?.user?.id)throw new Error('Not authenticated');user=r.user;ai=r.ai||{enabled:false};snapshots=r.snapshots||{};pending=localRead(keyFor('training-pending-events'))||[];
   for(const scope of scopes){
    const existing=localRead(keyFor(scope));
    if(snapshots[scope]){
     const merged=merge(scope,snapshots[scope],existing);
     localStorage.setItem(keyFor(scope),JSON.stringify(merged));
     if(existing)save(scope,merged);
    }else if(existing){
     save(scope,existing);
    }
   }
   const ledger=localRead(keyFor('training-event-ledger'))||[];
   if(ledger.length > (r.eventCount||0)){
    const pendingIds=new Set(pending.map(p=>p.id));
    for(const ev of ledger)if(!pendingIds.has(ev.id))pending.push(ev);
    storeQueue();
   }
   const sideEl=document.querySelector('.sidebar-bottom');if(sideEl)sideEl.innerHTML=`<span class="avatar">${safe(user.name.slice(0,1).toUpperCase())}</span><div class="sidebar-user-block"><span class="sidebar-user-name">${safe(user.name)}</span></div><span class="status-dot" title="Active session"></span>`;
   document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=!['owner','admin'].includes(user.role));
   banner(`<span><strong>${safe(user.name)}</strong> <span id="account-sync">Progress saved to your profile</span></span><span>${legacy()?'<button class="text-button" data-training="import">Import earlier browser practice</button>':''}<a href="/logout" target="_top">Sign out</a></span>`);
   const foot=document.querySelector('.footer-copy');if(foot)foot.textContent='L&D-SDRlab · Private learning & development environment · Osprey Strategic Research';
   flush();
  }catch{online=false;window.location.href='/login';}
  notify();
 }
 function merge(scope,cloud,local){if(!local)return cloud;if(scope===scopes[0]){const firsts={...cloud.firsts};for(const [k,a]of Object.entries(local.firsts||{}))if(!firsts[k]||a.at<firsts[k].at)firsts[k]=a;const history=new Map([...(cloud.history||[]),...(local.history||[])].map(a=>[[a.caseId,a.mode,a.step,a.at,a.choice].join(':'),a]));return {...local,firsts,history:[...history.values()].sort((a,b)=>a.at-b.at).slice(-100)};}const sessions={...cloud.sessions};for(const [k,r]of Object.entries(local.sessions||{}))if(!sessions[k]||(r.updatedAt||r.at)>=(sessions[k].updatedAt||sessions[k].at))sessions[k]=r;const runs=new Map([...(cloud.runs||[]),...(local.runs||[])].map(r=>[r.call+':'+r.at,r]));return {sessions,runs:[...runs.values()].sort((a,b)=>a.at-b.at).slice(-24)};}
 function storeQueue(){try{localStorage.setItem(keyFor('training-pending-events'),JSON.stringify(pending));}catch{online=false;}}
 function save(scope,payload,{reset=false}={}){
  if(!user||!scopes.includes(scope))return;snapshots[scope]=payload;dirtyScopes.set(scope,{payload:JSON.parse(JSON.stringify(payload)),reset:reset||dirtyScopes.get(scope)?.reset||false});clearTimeout(timers[scope]);timers[scope]=setTimeout(()=>writeScope(scope),300);status();
 }
 async function writeScope(scope){if(savingScopes.has(scope)||!dirtyScopes.has(scope))return;const entry=dirtyScopes.get(scope);savingScopes.add(scope);saveCount++;status();let failed=false;try{await api('/api/state',{method:'PUT',body:JSON.stringify({scope,...entry})});if(dirtyScopes.get(scope)===entry)dirtyScopes.delete(scope);online=true;}catch{online=false;failed=true;}finally{savingScopes.delete(scope);saveCount--;status();if(dirtyScopes.has(scope)){clearTimeout(timers[scope]);timers[scope]=setTimeout(()=>writeScope(scope),failed?5000:0);}}}
 function retrySync(){flush();for(const scope of dirtyScopes.keys())writeScope(scope);}
 function event(value){
  if(!user)return null;
  const entry={id:crypto.randomUUID(),at:Date.now(),...value};
  pending.push(entry);
  storeQueue();
  try{
   const ledger=(localRead(keyFor('training-event-ledger'))||[]).slice(-499);
   ledger.push(entry);
   localStorage.setItem(keyFor('training-event-ledger'),JSON.stringify(ledger));
  }catch{}
  flush();
  return entry.id;
 }
 function flush(){if(flushPromise)return flushPromise;if(!user||!pending.length)return Promise.resolve();flushPromise=(async()=>{busy=true;status();try{while(pending.length){const batch=pending.slice(0,30);await api('/api/events',{method:'POST',body:JSON.stringify({events:batch})});pending=pending.slice(batch.length);storeQueue();}online=true;}catch{online=false;}finally{busy=false;status();}})().finally(()=>{flushPromise=null;});return flushPromise;}
 function view(unitType,unitId){if(!user)return;const key=unitType+':'+unitId;if(key===lastView)return;lastView=key;event({kind:'view',unitType,unitId});}
 function importDialog(){let d=document.querySelector('#training-import');if(!d){d=document.createElement('dialog');d.id='training-import';d.innerHTML='<h2>Import your earlier practice?</h2><p>Browser practice may include activity completed by someone else on this device. Import only if these decisions and calls are yours.</p><p>Expanded-bank and Call Lab results will be labeled as browser imports. They do not prove when the original training happened. The earlier 18-case edition stays in this browser as a separate archive.</p><div class="dialog-actions"><button class="button secondary" data-training="cancel-import">Cancel</button><button class="button accent" data-training="confirm-import">This practice is mine · Import</button></div>';document.body.append(d);}d.showModal();}
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-training]');if(!b)return;const action=b.dataset.training;
  if(action==='import'){importDialog();return;}if(action==='cancel-import'){document.querySelector('#training-import').close();return;}
  if(action==='confirm-import'&&user){b.disabled=true;try{await api('/api/import',{method:'POST',body:JSON.stringify({cases:localRead(scopes[0])||{},calls:localRead(scopes[1])||{}})});localStorage.setItem(keyFor('legacy-claimed'),'true');const fresh=await api('/api/session');for(const scope of scopes)if(fresh.snapshots[scope])localStorage.setItem(keyFor(scope),JSON.stringify(fresh.snapshots[scope]));location.reload();}catch(err){b.disabled=false;const d=document.querySelector('#training-import');let p=d.querySelector('.import-error');if(!p){p=document.createElement('p');p.className='import-error';d.prepend(p);}p.textContent=err.message;}}
 });
 window.addEventListener('online',retrySync);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')retrySync();});
 function setUser(value){if(!user||value.id!==user.id)return;user={...user,...value};const side=document.querySelector('.sidebar-bottom');if(side)side.innerHTML=`<span class="avatar">${safe(user.name.slice(0,1).toUpperCase())}</span><div class="sidebar-user-block"><span class="sidebar-user-name">${safe(user.name)}</span></div><span class="status-dot" title="Active session"></span>`;const label=document.querySelector('#account-status strong');if(label)label.textContent=user.name;}
 const ready=initialize();
 return {ready,setUser,keyFor,save,event,view,api,flush,get user(){return user;},get ai(){return ai;},get synced(){return online&&!busy&&!pending.length&&!saveCount&&!dirtyScopes.size;}};
})();
