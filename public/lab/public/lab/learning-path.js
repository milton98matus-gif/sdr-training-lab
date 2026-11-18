'use strict';
/* Supplemental learning: advisory placement, contextual transfer and spaced review. */
const LearningPath = (() => {
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {DIAGNOSTIC, SERVICES, COMPARISONS, TEACHBACK} = LEARNING_PATH;
  const icons = {
    book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3ZM12 6v15',
    support:'M3 13v-2a9 9 0 0 1 18 0v2M3 12h4v7H3ZM17 12h4v7h-4ZM18 19c0 2-3 3-6 3',
    cloud:'M6 18a5 5 0 1 1 1-10 6 6 0 0 1 11 1 4.5 4.5 0 0 1 0 9Z',
    network:'M8 3h8v6H8ZM2 17h6v5H2ZM16 17h6v5h-6ZM12 9v4M5 17v-4h14v4',
    continuity:'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',
    security:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',
    planning:'M5 4h14v17H5ZM9 2v5M15 2v5M8 12h8M8 16h5',
    practice:'M5 3h14v18H5ZM9 8h6M9 12h6M9 16h4',
    phone:'M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z',
    check:'M5 12l4 4L19 6'
  };
  const bundles = [
    {id:'service-models',title:'Service models',units:['msp-model','service-map','support-delivery'],cases:['msp-075','msp-076','msp-006','msp-013']},
    {id:'discovery',title:'Follow the signal',units:['discovery','listening-lab','business-value'],cases:['msp-025','msp-029','msp-049','msp-032']},
    {id:'stakeholders',title:'Find the right route',units:['stakeholders'],cases:['msp-017','msp-019','msp-023','msp-057']},
    {id:'next-steps',title:'Earn an agreed next step',units:['next-steps','handoff-lab'],cases:['msp-033','msp-034','msp-035','msp-040']},
    {id:'boundaries',title:'Persist with judgment',units:['boundaries'],cases:['msp-016','msp-031','msp-044','msp-048']},
    {id:'assessments',title:'Position an assessment honestly',units:['assessments','security'],cases:['msp-037','msp-067','msp-070','msp-072']}
  ];
  let feature='diagnostic', record=null, diagnosticIndex=0, answers=[], diagnosticDone=false;
  let familyId=COMPARISONS[0].id, variantIndex=0, contrastResult=null, serviceId=SERVICES[0].id;
  let requestGeneration=0, tourIndex=0; const pendingIds=new Map();
  const uid=()=> 'learning-'+Date.now()+'-'+Math.random().toString(36).slice(2,12);
  const preview=()=>!Training.user;
  const submissionId=key=>{if(!pendingIds.has(key))pendingIds.set(key,uid());return pendingIds.get(key);};
  const localKey=()=>Training.keyFor('sdr-starting-point-draft-v1');
  function icon(name='book'){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(icons[name]||icons.book)+'"/></svg>';}
  function date(value){return value?new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Guatemala'}):'Not submitted';}
  function saveDraft(){try{localStorage.setItem(localKey(),JSON.stringify({answers,index:diagnosticIndex}));}catch{}}
  function readDraft(){try{const value=JSON.parse(localStorage.getItem(localKey())||'null');if(value&&Array.isArray(value.answers)){answers=value.answers.slice(0,DIAGNOSTIC.length).map((a,i)=>Number.isInteger(a)&&DIAGNOSTIC[i]?.options[a]?a:null);diagnosticIndex=Math.max(0,Math.min(value.index||0,DIAGNOSTIC.length-1));}}catch{}}
  function start(type,args={}){
    requestGeneration++;
    feature=type;
    if(type==='diagnostic'){answers=[];diagnosticIndex=0;diagnosticDone=false;readDraft();}
    if(type==='contrast'){familyId=COMPARISONS.some(f=>f.id===args.familyId)?args.familyId:COMPARISONS[0].id;const f=COMPARISONS.find(f=>f.id===familyId);variantIndex=Math.max(0,f.variants.findIndex(v=>v.id===args.variantId));contrastResult=null;}
    if(type==='map'&&args.serviceId)serviceId=args.serviceId;
  }
  function back(){return '<button class="text-button ob-back" data-ob="route">← Start here</button>';}
  function home(data){
    const learning=data.learning||{},diagnostic=learning.diagnostic?.latest,recs=learning.recommendations||[];
    const prompt=diagnostic?
      '<div class="lp-diagnostic-prompt"><div><strong>Your starting point is saved.</strong><p>'+diagnostic.score+' / '+diagnostic.maxScore+' initial checks aligned. Use the recommendations to choose your focus.</p></div><button class="text-button" data-learning="diagnostic-results">View recommendations →</button></div>':
      '<div class="lp-diagnostic-prompt"><div><strong>Sales experience? New to MSPs?</strong><p>Find your starting point with eight practical questions. Your full learning route stays available.</p></div><button class="button secondary" data-learning="diagnostic">Find my starting point →</button></div>';
    return prompt+'<div class="lp-home-bottom"><section class="content-card"><span class="eyebrow">RECOMMENDED FOCUS</span><h2>Your next practice session</h2>'+
      (recs.length?recs.map(r=>'<div class="lp-recommendation"><div><strong>'+h(r.title)+'</strong><p>'+h(r.reason)+'</p></div>'+(r.kind==='contrast'?'<button class="button secondary" data-learning="contrast" data-family="'+h(r.familyId)+'" data-variant="'+h(r.variantId)+'">Practice →</button>':'<button class="button secondary" data-ob-unit="'+h(r.unitId)+'">Revisit →</button>')+'</div>').join(''):
      '<p>Start with the next lesson above, then apply it to a conversation. As you submit work, this space suggests a focused next move.</p><button class="text-button" data-learning="contrast">Try the same objection in a different context →</button>')+
      '<p class="ob-caption">Recommendations use submitted decisions. They do not replace the required onboarding or a readiness review.</p></section>'+
      '<section class="content-card"><span class="eyebrow">KNOW YOUR ACCOUNT</span><h2>'+h(data.assignment?.brief?.mspName||'Your assigned MSP')+'</h2><p>Review the approved services, coverage, assessment terms and discovery handoff before representing your account.</p><button class="text-button" data-ob="brief">Read my client brief →</button>'+
      (data.assignment?.dueAt?'<p class="ob-caption">Training target: '+date(data.assignment.dueAt)+(data.summary.overdue?' · Past due':'')+'</p>':'')+
      '<hr><p>Need a concept explained or a scope confirmed?</p><button class="text-button" data-ob="help">Ask your training administrator →</button>'+
      (data.help?.length?'<p class="ob-caption">'+data.help.length+' question(s) awaiting a response.</p>':'')+'</section></div>';
  }
  function serviceMap(){
    const s=SERVICES.find(s=>s.id===serviceId)||SERVICES[0];
    return '<div class="lp-services" aria-label="Explore MSP services">'+SERVICES.map(item=>'<button class="lp-service" data-learning-service="'+h(item.id)+'" aria-controls="lp-service-detail" aria-pressed="'+(item.id===s.id)+'"><span class="lp-icon">'+icon(item.icon)+'</span><strong>'+h(item.title)+'</strong><p>'+h(item.description)+'</p><span>Business value & discovery →</span></button>').join('')+'</div>'+
      '<section class="lp-service-detail" id="lp-service-detail" tabindex="-1" aria-live="polite"><span class="eyebrow">SERVICE → OUTCOME → CONVERSATION</span><h2>'+h(s.title)+'</h2><dl><div><dt>WHAT IT DOES</dt><dd>'+h(s.description)+'</dd></div><div><dt>WHY THE BUSINESS MAY CARE</dt><dd>'+h(s.outcome)+'</dd></div><div><dt>A NATURAL DISCOVERY QUESTION</dt><dd>“'+h(s.question)+'”</dd></div></dl><div class="lp-boundary"><strong>Keep the promise within scope</strong>'+h(s.boundary)+'</div><button class="text-button" data-ob-unit="'+h(s.unitId)+'">Explore the full lesson →</button><br><button class="text-button" data-learning="map-top">Choose another service ↑</button></section>';
  }
  function mapScreen(){return back()+'<div class="page-heading"><div><span class="eyebrow">MSP FOUNDATIONS</span><h1>Connect the service to the business.</h1><p>Explore what an MSP can manage, why it matters, and how to ask about it naturally.</p></div></div>'+serviceMap()+teachback();}
  function teachback(){return '<section class="lp-teachback"><span class="eyebrow">APPLY · '+h(TEACHBACK.timeLabel||'45–60 SECONDS')+'</span><h3>'+h(TEACHBACK.title)+'</h3><p>'+h(TEACHBACK.context)+'</p><ul>'+TEACHBACK.checklist.map(s=>'<li>'+h(s)+'</li>').join('')+'</ul><details><summary>See an example explanation</summary><p>'+h(TEACHBACK.model||'')+'</p></details><p class="ob-caption">'+h(TEACHBACK.note||'Practice speaking aloud, then submit the existing written exercise for AI feedback and coach review.')+'</p><button class="button secondary" data-ob-task="'+h(TEACHBACK.taskId)+'">Write my explanation →</button></section>';}
  function options(items,name,selected){return items.map((o,i)=>'<label class="ob-option"><input type="radio" name="'+name+'" value="'+i+'" required '+(selected===i?'checked':'')+'><span>'+h(o.text)+'</span></label>').join('');}
  function diagnosticScore(choices){
    const domains=[...new Set(DIAGNOSTIC.map(q=>q.domain))].map(name=>({name,score:DIAGNOSTIC.filter((q,i)=>q.domain===name&&q.answer===choices[i]).length,maxScore:DIAGNOSTIC.filter(q=>q.domain===name).length}));
    return {choices,score:DIAGNOSTIC.filter((q,i)=>q.answer===choices[i]).length,maxScore:DIAGNOSTIC.length,domains,recommendations:[...new Set(DIAGNOSTIC.filter((q,i)=>q.answer!==choices[i]).map(q=>q.unitId))],at:Date.now()};
  }
  function diagnosticScreen(){
    if(diagnosticDone&&record.learning?.diagnostic?.latest)return diagnosticResults();
    const q=DIAGNOSTIC[diagnosticIndex];
    return back()+'<section class="lp-panel"><span class="eyebrow">FIND YOUR STARTING POINT</span><h1>One decision at a time.</h1><p class="ob-caption">Advisory diagnostic · '+(diagnosticIndex+1)+' of '+DIAGNOSTIC.length+' · '+h(q.domain)+'</p><progress max="'+DIAGNOSTIC.length+'" value="'+diagnosticIndex+'" aria-label="Diagnostic questions answered"></progress><form id="lp-diagnostic-form" class="lp-question-card"><h2>'+h(q.prompt)+'</h2><fieldset aria-label="Choose your response">'+options(q.options,'choice',answers[diagnosticIndex])+'</fieldset><div class="ob-form-actions">'+(diagnosticIndex?'<button type="button" class="text-button" data-learning="diagnostic-back">← Previous question</button>':'<span class="ob-caption">Choose the best response for this situation.</span>')+'<button class="button" type="submit">'+(diagnosticIndex===DIAGNOSTIC.length-1?'See my recommended focus':'Next question')+' →</button></div><p class="ob-inline-status" role="status"></p></form><p class="ob-caption">'+(preview()?'Preview only. Sign in to submit your diagnostic and save recommendations.':'Submitted results are visible to your training administrators.')+' This does not skip lessons or approve call readiness.</p></section>';
  }
  function diagnosticResults(){
    const d=record.learning?.diagnostic?.latest;
    if(!d)return diagnosticScreen();
    return back()+'<section class="lp-panel"><span class="eyebrow">YOUR RECOMMENDED FOCUS</span><h1>Build from what you know.</h1><p class="ob-caption">'+(preview()?'Preview result · not submitted':'Diagnostic submitted · '+date(d.at))+'. The result guides practice; the full onboarding stays available.</p><div class="lp-summary">'+d.domains.map(x=>'<div><strong>'+x.score+' / '+x.maxScore+'</strong><span>'+h(x.name)+'</span></div>').join('')+'</div><section class="content-card"><h2>Start with these topics</h2>'+(d.recommendations.length?d.recommendations.map(id=>{const u=ONBOARDING.UNITS.find(u=>u.id===id);return u?'<div class="lp-recommendation"><div><strong>'+h(u.title)+'</strong><p>'+h(u.subtitle)+'</p></div><button class="button secondary" data-ob-unit="'+id+'">Open lesson →</button></div>':'';}).join(''):'<p>Your choices aligned with these eight situations. Continue the required lessons and apply your reasoning to fresh conversations.</p>')+'</section>'+AICoach.slot('onboarding',d.eventId)+'<details class="content-card"><summary>Review the eight decisions and explanations</summary>'+DIAGNOSTIC.map((q,i)=>'<div class="lp-example-move"><strong>'+h(q.prompt)+'</strong><p>'+h(q.options[d.choices[i]]?.text)+'</p><p class="lp-example-why">'+h(q.options[d.choices[i]]?.why)+'</p>'+(d.choices[i]!==q.answer?'<p class="lp-example-why"><b>Reference:</b> '+h(q.options[q.answer].text)+' '+h(q.options[q.answer].why)+'</p>':'')+'</div>').join('')+'</details><div class="ob-bottom-actions"><button class="text-button" data-learning="diagnostic">Try a new diagnostic attempt</button><button class="button" data-ob="route">Continue my route →</button></div></section>';
  }
  function contrastHub(){
    return back()+'<div class="page-heading"><div><span class="eyebrow">PRACTICE · READ THE CONTEXT</span><h1>Same objection. A different opening.</h1><p>Listen for the evidence that changes what you can reasonably do next.</p></div></div><div class="lp-contrast-grid">'+COMPARISONS.map(f=>'<section class="lp-contrast-card"><span class="eyebrow">'+h(f.skill)+'</span><h3>'+h(f.title)+'</h3><p>Three situations. Different signals, agreements and boundaries.</p><button class="text-button" data-learning="contrast" data-family="'+h(f.id)+'">Explore the situations →</button></section>').join('')+'</div><section class="content-card" style="margin-top:25px"><h2>Take the skill into a new case</h2><p>Practice an independent situation after the comparison. These response cases contribute to your existing training record.</p>'+bundleLinks()+'</section><p class="ob-caption">Context drills are supplemental practice. They do not replace the six distinct response cases or the full Call Lab requirement.</p>';
  }
  function contrastScreen(){
    const f=COMPARISONS.find(f=>f.id===familyId)||COMPARISONS[0],v=f.variants[variantIndex],saved=record.learning?.comparisons?.[f.id+':'+v.id];
    return '<button class="text-button ob-back" data-learning="contrast-hub">← All comparison topics</button><section class="lp-panel"><span class="eyebrow">'+h(f.skill)+'</span><h1>'+h(f.title)+'</h1><p class="ob-caption">Read the complete situation before choosing. Context '+(variantIndex+1)+' of '+f.variants.length+'.</p><div class="lp-variant-tabs" aria-label="Choose a context">'+f.variants.map((x,i)=>'<button data-learning-variant="'+i+'" aria-pressed="'+(i===variantIndex)+'">'+(i+1)+'. '+h(x.label)+'</button>').join('')+'</div><section class="lp-question-card"><span class="eyebrow">THE PROSPECT SAYS</span><blockquote>“'+h(v.quote)+'”</blockquote><div class="lp-boundary"><strong>What you know</strong>'+h(v.context)+'</div>'+
      (contrastResult?contrastFeedback(f,v,contrastResult)+AICoach.slot('onboarding',saved?.eventId):'<form id="lp-contrast-form"><fieldset><legend>What is the most useful next move?</legend>'+options(v.options,'choice',null)+'</fieldset><button class="button" type="submit">Compare my decision →</button><p class="ob-inline-status" role="status"></p></form>'+
        (saved?'<p class="ob-caption">Previously submitted '+date(saved.at)+'. A new decision preserves the first attempt.</p>':''))+
      '</section><div class="ob-bottom-actions"><button class="text-button" data-ob-unit="'+h(f.unitId)+'">Revisit the related lesson →</button>'+(variantIndex<f.variants.length-1?'<button class="button secondary" data-learning-variant="'+(variantIndex+1)+'">Next context →</button>':'<button class="button" data-learning="contrast-hub">Choose another topic →</button>')+'</div><p class="ob-caption">'+(preview()?'Preview only · not submitted to a profile.':'Submitted decisions and first/latest results are visible to your training administrators.')+' Supplemental practice does not replace required onboarding.</p></section>';
  }
  function contrastFeedback(f,v,result){
    const ok=result.choice===v.answer,action=ACTIONS[v.action];
    return '<div class="lp-feedback '+(ok?'':'gap')+'" tabindex="-1" id="lp-feedback"><span class="eyebrow">'+(ok?'NICELY DONE':'ALMOST THERE')+'</span><h3>'+h(action?.label||v.action)+'</h3><p>'+h(v.options[result.choice].why)+'</p>'+(!ok?'<p><b>Try this next time:</b> '+h(v.options[v.answer].text)+'</p>':'')+'<p>'+h(v.reason)+'</p><div class="lp-boundary"><strong>Know when to stop</strong>'+h(v.boundary)+'</div></div><button class="text-button" data-learning="contrast-retry">Try this context again</button>';
  }
  function bundleLinks(unitId){
    const bs=unitId?bundles.filter(b=>b.units.includes(unitId)):bundles;
    return bs.map(b=>{const ids=unitId?b.cases.slice(1):b.cases;return '<details class="lp-example-move"><summary>'+h(b.title)+' · '+ids.length+' independent cases</summary>'+ids.map(id=>{const c=CASES.find(c=>c.id===id);return '<button class="text-button" data-learning-case="'+id+'">'+h(c?.title||id)+' →</button><br>';}).join('')+'</details>';}).join('');
  }
  function lessonExample(u){
    const family=COMPARISONS.find(f=>f.unitId===u.id);
    if(family){const v=family.variants[0];return {scene:v.context+' The prospect says: “'+v.quote+'”',move:v.options[v.answer].text,why:v.reason,boundary:v.boundary};}
    const b=bundles.find(b=>b.units.includes(u.id)),c=b&&CASES.find(c=>c.id===b.cases[0]);
    if(c)return {scene:c.context+' '+c.transcript.map(t=>t[0]+': “'+t[1]+'”').join(' '),move:c.model,why:c.evidence,boundary:c.limit};
    const q=u.questions[0];
    return {scene:u.scene,move:q.options[q.answer].text,why:q.options[q.answer].why,boundary:'Use only confirmed facts and approved scope. If the contact declines further discussion, respect the boundary.'};
  }
  function screen(data){record=data;if(feature==='map')return mapScreen();if(feature==='contrast-hub')return contrastHub();if(feature==='contrast')return contrastScreen();if(feature==='diagnostic-results')return diagnosticResults();return diagnosticScreen();}
  function adminEvidence(data){
    const l=data.learning;if(!l)return '';
    const d=l.diagnostic,cs=Object.values(l.comparisons||{});
    return '<section class="lp-admin-evidence"><span class="eyebrow">SUPPLEMENTAL LEARNING EVIDENCE</span><h3>Starting point and context practice</h3><p>'+h(data.summary.nextRecommendation||'No recommendation yet. Review the submitted work alongside the required onboarding evidence.')+'</p>'+
      (d?'<p><b>Diagnostic:</b> first '+d.first.score+'/'+d.first.maxScore+' · latest '+d.latest.score+'/'+d.latest.maxScore+' · '+date(d.latest.at)+'</p><details><summary>Diagnostic responses and focus</summary>'+DIAGNOSTIC.map((q,i)=>'<p><b>'+h(q.prompt)+'</b><br>'+h(q.options[d.latest.choices[i]]?.text)+'<br>'+h(q.options[d.latest.choices[i]]?.why)+'</p>').join('')+'</details>':'<p>Starting-point diagnostic not submitted.</p>')+
      '<p><b>Context practice:</b> '+cs.length+' of 9 situations submitted · '+cs.filter(c=>c.aligned).length+' latest decisions aligned.</p>'+
      cs.map(c=>{const f=COMPARISONS.find(f=>f.id===c.familyId),v=f?.variants.find(v=>v.id===c.variantId);return v?'<details><summary>'+h(f.title)+' · '+h(v.label)+'</summary><p><b>First:</b> '+h(v.options[c.firstChoice]?.text)+'<br><b>Latest:</b> '+h(v.options[c.choice]?.text)+'<br>'+h(v.options[c.choice]?.why)+'<br><b>Boundary:</b> '+h(v.boundary)+'<br>'+date(c.at)+'</p></details>':'';}).join('')+
      '<p class="ob-caption">Supplemental work supports coaching. It does not waive required lessons, written work, main response cases, a full call or human review.</p></section>';
  }
  const tourSteps=[
    {title:'Make this your learning profile.',body:'Use your real first and last name, and select your MSP or Not assigned yet. Your training administrator confirms the assignment. Your records stay linked to your signed-in account.',icon:'book',label:'My profile → Name · MSP · Account'},
    {title:'Start with one clear next step.',body:'Start here shows the next lesson or submission in your route. Use Find my starting point for a recommended focus; all required onboarding stays available.',icon:'book',label:'Start here → Continue learning'},
    {title:'Learn it. See it. Try it.',body:'Lessons separate a short explanation, a worked example and your own decisions. Open the service map or glossary whenever a concept needs clarification.',icon:'cloud',label:'MSP Foundations → Learn · Example · Practice'},
    {title:'Use the context to choose.',body:'Practice lab lets you compare a response or opportunity path. Context practice changes the signals behind the same objection. Call Lab follows a complete conversation.',icon:'phone',label:'Read → Choose → Understand why'},
    {title:'Submit work and use the feedback.',body:'Written drafts stay in your browser until you submit. Read the available feedback and use one concrete adjustment in your next attempt. Training record shows submitted work and portal timing. Your administrator reviews readiness for supervised calls.',icon:'check',label:'Submit → Review feedback → Apply it'}
  ];
  function tour(){
    let dialog=document.querySelector('#portal-tour');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='portal-tour';dialog.className='lp-tour';dialog.setAttribute('aria-labelledby','portal-tour-title');document.body.append(dialog);}
    const s=tourSteps[tourIndex];
    dialog.innerHTML='<div class="dialog-top"><span class="eyebrow">PORTAL WALKTHROUGH · '+(tourIndex+1)+' / '+tourSteps.length+'</span><button class="icon-button" data-tour="close" aria-label="Close walkthrough">×</button></div><h2 id="portal-tour-title">'+s.title+'</h2><p>'+s.body+'</p><div class="lp-tour-illustration">'+icon(s.icon)+'<span>'+s.label+'</span></div><small>You can reopen this walkthrough from the header.</small><div class="dialog-actions">'+(tourIndex?'<button class="text-button" data-tour="back">← Back</button>':'<button class="text-button" data-tour="close">Explore on my own</button>')+'<button class="button" data-tour="'+(tourIndex===tourSteps.length-1?'finish':'next')+'">'+(tourIndex===tourSteps.length-1?'Got it':'Next')+' →</button></div>';
    if(!dialog.open)dialog.showModal();dialog.querySelector('#portal-tour-title').tabIndex=-1;dialog.querySelector('#portal-tour-title').focus();
  }
  function focus(selector){const e=document.querySelector(selector);if(e){e.focus({preventScroll:true});e.scrollIntoView({block:'start',behavior:'instant'});}}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tour){switch(b.dataset.tour){case'start':tourIndex=0;tour();break;case'next':tourIndex++;tour();break;case'back':tourIndex--;tour();break;default:if(b.dataset.tour==='finish')window.dispatchEvent(new CustomEvent('sdr-tour-finished'));document.querySelector('#portal-tour')?.close();try{localStorage.setItem(Training.keyFor('sdr-tour-seen-v1'),'true');}catch{}}return;}
    if(b.dataset.learningCase){window.dispatchEvent(new CustomEvent('sdr-open-case',{detail:{id:b.dataset.learningCase}}));return;}
    if(b.dataset.learningService){serviceId=b.dataset.learningService;Onboarding.redraw();focus('#lp-service-detail');return;}
    if(b.dataset.learningVariant!==undefined){variantIndex=Number(b.dataset.learningVariant);contrastResult=null;requestGeneration++;Onboarding.redraw();window.scrollTo({top:0,behavior:'instant'});return;}
    const action=b.dataset.learning;if(!action)return;if(action==='map-top'){focus('.lp-services button[aria-pressed="true"]');return;}
    if(action==='diagnostic-back'){diagnosticIndex=Math.max(0,diagnosticIndex-1);saveDraft();Onboarding.redraw();return;}
    if(action==='contrast-retry'){contrastResult=null;Onboarding.redraw();return;}
    Onboarding.openLearning(action,{familyId:b.dataset.family,variantId:b.dataset.variant,serviceId:b.dataset.service});
  });
  document.addEventListener('change',e=>{if(e.target.closest('#lp-diagnostic-form')){answers[diagnosticIndex]=Number(e.target.value);saveDraft();}});
  document.addEventListener('submit',async e=>{
    const form=e.target;if(!form.matches('#lp-diagnostic-form,#lp-contrast-form'))return;e.preventDefault();
    const generation=requestGeneration,button=form.querySelector('button[type="submit"]'),out=form.querySelector('.ob-inline-status'),choice=Number(new FormData(form).get('choice'));
    if(form.id==='lp-diagnostic-form'){
      answers[diagnosticIndex]=choice;saveDraft();
      if(diagnosticIndex<DIAGNOSTIC.length-1){diagnosticIndex++;saveDraft();Onboarding.redraw();window.scrollTo({top:0,behavior:'instant'});return;}
    }
    button.disabled=true;out.textContent=preview()?'Comparing your preview decision…':'Saving to your training record…';
    try{
      let result;
      if(form.id==='lp-diagnostic-form'){
        const choices=answers.slice();const attemptKey='diagnostic:'+choices.join(',');
        if(preview()){const d=diagnosticScore(choices);result={learning:{...(record.learning||{}),diagnostic:{first:record.learning?.diagnostic?.first||d,latest:d}}};}
        else result=await Training.api('/api/onboarding/diagnostic',{method:'POST',body:JSON.stringify({id:submissionId(attemptKey),choices})});
        if(generation!==requestGeneration||!Onboarding.learningActive)return;
        pendingIds.delete(attemptKey);diagnosticDone=true;feature='diagnostic-results';
        try{localStorage.removeItem(localKey());}catch{}
      }else{
        const f=COMPARISONS.find(f=>f.id===familyId),v=f.variants[variantIndex],attemptKey='contrast:'+f.id+':'+v.id+':'+choice;
        if(preview())result={learning:{...(record.learning||{}),comparisons:{...(record.learning?.comparisons||{}),[f.id+':'+v.id]:{familyId:f.id,variantId:v.id,unitId:f.unitId,choice,aligned:choice===v.answer,at:Date.now(),firstChoice:record.learning?.comparisons?.[f.id+':'+v.id]?.firstChoice??choice}}}};
        else result=await Training.api('/api/onboarding/contrast',{method:'POST',body:JSON.stringify({id:submissionId(attemptKey),familyId:f.id,variantId:v.id,choice})});
        if(generation!==requestGeneration||!Onboarding.learningActive)return;
        pendingIds.delete(attemptKey);contrastResult={choice};
      }
      Onboarding.update(result,preview()?'Preview comparison only. Sign in to submit this work.':'Saved to your training record.');
      focus(form.id==='lp-contrast-form'?'#lp-feedback':'.lp-panel h1');
    }catch(err){out.textContent=err.message+' Your answers remain available; try again.';button.disabled=false;}
  });
  return {start,screen,home,serviceMap,teachback,bundleLinks,lessonExample,adminEvidence,icon};
})();
