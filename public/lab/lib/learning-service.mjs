import content from '../content/learning-path.json' with {type:'json'};
import onboarding from '../content/onboarding.json' with {type:'json'};

const {DIAGNOSTIC,COMPARISONS}=content;
const {UNITS}=onboarding;
const WEEK=7*86400000;
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};

export function evaluateDiagnostic(choices){
  if(!Array.isArray(choices)||choices.length!==DIAGNOSTIC.length||choices.some((choice,index)=>!Number.isInteger(choice)||!DIAGNOSTIC[index].options[choice]))invalid('Answer all eight starting-point questions.');
  const domains=[...new Set(DIAGNOSTIC.map(q=>q.domain))].map(name=>({name,score:0,maxScore:0}));
  const recommendations=[];
  let score=0;
  DIAGNOSTIC.forEach((q,index)=>{
    const domain=domains.find(d=>d.name===q.domain);domain.maxScore++;
    if(choices[index]===q.answer){score++;domain.score++;}
    else if(!recommendations.includes(q.unitId))recommendations.push(q.unitId);
  });
  return {choices:[...choices],score,maxScore:DIAGNOSTIC.length,domains,recommendations};
}

export function evaluateContrast({familyId,variantId,choice}){
  const family=COMPARISONS.find(f=>f.id===familyId),variant=family?.variants.find(v=>v.id===variantId);
  if(!variant||!Number.isInteger(choice)||!variant.options[choice])invalid('Choose a valid context and response.');
  return {familyId,variantId,unitId:family.unitId,choice,aligned:choice===variant.answer,action:variant.action};
}

export function learningRecord(rows,checks,now=Date.now()){
  const diagnosticRows=rows.filter(r=>r.kind==='diagnostic');
  const diagnostic=diagnosticRows.length?{first:{...evaluateDiagnostic(diagnosticRows[0].data.choices),at:diagnosticRows[0].created_at,eventId:diagnosticRows[0].event_id},latest:{...evaluateDiagnostic(diagnosticRows.at(-1).data.choices),at:diagnosticRows.at(-1).created_at,eventId:diagnosticRows.at(-1).event_id}}:null;
  const comparisons={},alignedContrastAt={};
  for(const row of rows.filter(r=>r.kind==='contrast')){
    const result=evaluateContrast(row.data),key=result.familyId+':'+result.variantId,first=comparisons[key];
    if(result.aligned)alignedContrastAt[result.unitId]=Math.max(alignedContrastAt[result.unitId]||0,row.created_at);
    comparisons[key]={...result,at:row.created_at,eventId:row.event_id,firstChoice:first?.firstChoice??result.choice,firstAligned:first?.firstAligned??result.aligned,firstAt:first?.firstAt??row.created_at};
  }
  const dueLessons=UNITS.filter(unit=>{
    const check=checks[unit.id];if(!check?.aligned)return false;
    const recentContrast=alignedContrastAt[unit.id]||0;
    return now-Math.max(check.at,recentContrast)>=WEEK;
  }).map(unit=>({id:unit.id,title:unit.title}));
  const recommendations=[],seen=new Set();
  const recommend=r=>{if(recommendations.length<3&&!seen.has(r.unitId)){recommendations.push(r);seen.add(r.unitId);}};
  for(const unit of UNITS){if(checks[unit.id]&&!checks[unit.id].aligned)recommend({kind:'lesson',unitId:unit.id,title:unit.title,reason:'Your latest lesson check needs another look. Review the example, then try again.'});}
  for(const family of COMPARISONS)for(const variant of family.variants){const c=comparisons[family.id+':'+variant.id];if(c&&!c.aligned)recommend({kind:'contrast',unitId:family.unitId,title:family.title,familyId:family.id,variantId:variant.id,reason:'Your latest response missed the context. Compare the available next step and the contact limit.'});}
  if(diagnostic)for(const unitId of diagnostic.latest.recommendations){
    const unit=UNITS.find(u=>u.id===unitId),check=checks[unitId],laterAlignedContrast=Object.values(comparisons).some(c=>c.unitId===unitId&&c.aligned&&c.at>=diagnostic.latest.at);
    if(unit&&!(check?.aligned&&check.at>=diagnostic.latest.at)&&!laterAlignedContrast)recommend({kind:'lesson',unitId,title:unit.title,reason:'Your starting-point answers suggest reviewing this topic. Required lesson checks still apply.'});
  }
  for(const unit of dueLessons)recommend({kind:'lesson',unitId:unit.id,title:unit.title,reason:'It has been at least seven days since your latest aligned practice here. Try recalling the reasoning again.'});
  const activityCount=rows.filter(r=>r.kind==='diagnostic'||r.kind==='contrast').length;
  return {diagnostic,comparisons,recommendations,dueLessons,activityCount};
}
