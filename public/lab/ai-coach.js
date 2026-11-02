'use strict';
const AICoach=(()=>{
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cache=new Map(),jobs=new Map(),queue=[];let running=0;
 const key=a=>[a.userId||Training.user?.id||'',a.source,a.eventId].join(':');
 function slot(source,eventId,userId='',auto=true){if(!eventId)return '';return '<div class="ai-coach-slot" data-ai-source="'+h(source)+'" data-ai-event="'+h(eventId)+'" data-ai-user="'+h(userId)+'" data-ai-auto="'+(auto?'yes':'no')+'" aria-live="polite"><p class="ob-caption">Loading AI feedback…</p></div>';}
 function title(status){return {strong:'Nicely done. Keep building on this.',almost_there:'Almost there. Let’s sharpen the next move.',try_again:'Let’s give this another try.',needs_context:'A little more context will help.'}[status]||'Your AI coaching';}
 function render(el,r){if(!el.isConnected)return;
  if(r.state==='complete'){
   const f=r.feedback;el.innerHTML='<section class="ai-feedback '+h(f.status)+'"><div class="ai-feedback-heading"><span class="eyebrow">AI COACH · THIS ATTEMPT</span><h2>'+h(title(f.status))+'</h2></div><p>'+h(f.summary)+'</p>'+
    (f.strengths.length?'<div class="ai-strength"><h3>What you handled well</h3>'+f.strengths.map(s=>'<p>'+h(s.feedback)+'</p><blockquote>“'+h(s.evidence)+'”</blockquote>').join('')+'</div>':'')+
    (f.adjustments.length?'<div class="ai-adjustment"><h3>One useful adjustment</h3>'+f.adjustments.map(a=>'<p>'+h(a.feedback)+'</p>').join('')+'</div>':'')+
    '<div class="ai-next"><h3>Try this next</h3><p>'+h(f.nextStep)+'</p></div><details><summary>See feedback for each answer</summary>'+f.fields.map(x=>'<div class="ai-field"><strong>'+h(x.label||x.id.replaceAll('-',' '))+'</strong><p>'+h(x.feedback)+'</p></div>').join('')+'</details><details><summary>A phrase to practice</summary><p>'+h(f.example)+'</p></details><p class="ob-caption">AI-generated coaching · '+h(new Date(r.at).toLocaleString('en-US',{timeZone:'America/Managua'}))+(r.current===false?' · This belongs to an earlier account brief.':'')+'. Your coach can add feedback. Readiness for supervised calls still needs a person.</p></section>';
  }else if(r.state==='loading'||r.state==='pending')el.innerHTML='<section class="ai-feedback ai-waiting" role="status"><span class="eyebrow">AI COACH</span><h2>Let’s look at your answer.</h2><p>Your work is saved. The AI is checking the reasoning and preparing a useful next step…</p></section>';
  else el.innerHTML='<section class="ai-feedback ai-unavailable"><span class="eyebrow">AI COACH</span><h2>'+(r.state==='not_configured'?'AI feedback needs a connection.':r.state==='stale'?'Use the current account brief.':'Your work is saved.')+'</h2><p>'+h(r.message||'AI feedback has not been generated for this attempt yet.')+'</p>'+(!['not_configured','stale','signed_out'].includes(r.state)?'<button class="button secondary" data-ai-retry>Review this attempt with AI →</button>':'')+'</section>';
 }
 function matching(a){return Array.from(document.querySelectorAll('.ai-coach-slot')).filter(el=>key(attempt(el))===key(a));}
 function attempt(el){return {source:el.dataset.aiSource,eventId:el.dataset.aiEvent,userId:el.dataset.aiUser||'',generate:el.dataset.aiAuto==='yes'};}
 function paint(a,r){cache.set(key(a),r);for(const el of matching(a))render(el,r);}
 async function work(a){
  await Training.ready;if(!Training.user){paint(a,{state:'signed_out',message:'Sign in with your authorized ChatGPT account to save this attempt and receive AI coaching.'});return;}
  paint(a,{state:'loading'});
  try{
   let r;
   if(a.generate&&Training.ai.enabled)r=await Training.api('/api/ai/review',{method:'POST',body:JSON.stringify({source:a.source,eventId:a.eventId,...(a.userId?{userId:a.userId}:{})})});
   else r=await Training.api('/api/ai/review?'+new URLSearchParams({source:a.source,eventId:a.eventId,...(a.userId?{user:a.userId}:{})}));
   // Another tab may already own this review; wait without starting a second model call.
   for(let i=0;r.state==='pending'&&i<12;i++){paint(a,r);await new Promise(resolve=>setTimeout(resolve,2500));r=await Training.api('/api/ai/review?'+new URLSearchParams({source:a.source,eventId:a.eventId,...(a.userId?{user:a.userId}:{})}));}
   if(r.state==='pending')r={state:'waiting',message:'This attempt is still being reviewed. Reopen it shortly to see the saved feedback.'};
   paint(a,r);window.dispatchEvent(new CustomEvent('sdr-ai-feedback-ready',{detail:{...a,state:r.state}}));
  }catch(e){paint(a,{state:'failed',message:'The AI review could not finish. Your saved answer is available. '+e.message});}
 }
 function drain(){while(running<2&&queue.length){const {a,resolve}=queue.shift();running++;work(a).finally(()=>{running--;jobs.delete(key(a));resolve();drain();});}}
 function request(a,force=false){if(!a.eventId)return Promise.resolve();const k=key(a);if(jobs.has(k))return jobs.get(k);if(!force&&cache.has(k)){for(const el of matching(a))render(el,cache.get(k));return Promise.resolve();}const p=new Promise(resolve=>{queue.push({a,resolve});});jobs.set(k,p);drain();return p;}
 function scan(){for(const el of document.querySelectorAll('.ai-coach-slot:not([data-ai-mounted])')){el.dataset.aiMounted='yes';request(attempt(el));}}
 window.addEventListener('sdr-submission-saved',e=>{request({...e.detail,generate:true});});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-retry]');if(b){const el=b.closest('.ai-coach-slot');request({...attempt(el),generate:true},true);}});
 const observer=new MutationObserver(scan);observer.observe(document.querySelector('#main'),{childList:true,subtree:true});Training.ready.then(scan);
 return {slot};
})();
