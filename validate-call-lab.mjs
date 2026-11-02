import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
function load(name){const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../public/lab/'+name,import.meta.url),'utf8'),ctx);return JSON.parse(JSON.stringify(ctx.module.exports));}
const {calls}=load('call-lab-data.js');
const {ACTIONS}=load('msp-cases.js');
assert.equal(calls.length,3);
assert.equal(new Set(calls.map(c=>c.id)).size,3);
let paths=0,positions=new Set();
for(const call of calls){
 const seen=new Set(),depths=[];
 function walk(id,ancestors=[],decisions=[]){
  assert(!ancestors.includes(id),'cycle at '+call.id+':'+id);
  const node=call.nodes[id];assert(node,'missing node '+id);assert(node.line);seen.add(id);
  if(node.end){
   assert(Object.hasOwn(ACTIONS,node.outcome));assert(node.note&&node.title);
   depths.push(decisions.length);paths++;
   assert(decisions.length>0);
   return;
  }
  assert(node.stage&&node.skill);assert(node.options.length>=2);
  assert(node.options.some(o=>o.grade==='supported'),'no supported option at '+id);
  positions.add(node.options.findIndex(o=>o.grade==='supported'));
  for(const o of node.options){
   assert(o.label&&o.say&&o.coach&&o.next);
   assert(['supported','partial','gap'].includes(o.grade));
   walk(o.next,[...ancestors,id],[...decisions,o]);
  }
 }
 walk(call.start);
 assert.equal(seen.size,Object.keys(call.nodes).length,'unreachable content');
 assert.equal(call.duration,`${Math.min(...depths)}–${Math.max(...depths)} decisions`);
}
assert(positions.size>=2,'predictable answer placement');
const contract=calls.find(c=>c.id==='contract');
assert.equal(contract.nodes.email.outcome,'nurture');
assert.equal(contract.nodes.excluded.outcome,'exclude');
assert.equal(contract.nodes.breach.outcome,'exclude');
assert(contract.nodes.dnc.options.find(o=>o.next==='breach').grade==='gap');
const expansion=calls.find(c=>c.id==='expansion');
assert.equal(expansion.nodes.introduced.outcome,'route');
assert.equal(expansion.nodes.notbooked.outcome,'route');
assert.equal(calls.find(c=>c.id==='covered').nodes.booked.outcome,'book');
for(const name of ['call-lab-data.js','call-lab.js']){
 const text=fs.readFileSync(new URL('../public/lab/'+name,import.meta.url),'utf8');
 new vm.Script(text);
 assert(!/fetch\s*\(|sendBeacon|XMLHttpRequest|https?:\/\//.test(text));
 assert(!/hubspot|Rodrigo|Wil Vazquez|OSR_QA_Tracker_SAFE/.test(text));
}
const runtime=fs.readFileSync(new URL('../public/lab/call-lab.js',import.meta.url),'utf8');
assert(runtime.includes("const KEY='sdr-call-lab-preview-v1'"));
assert(!runtime.includes("setItem('sdr-lab-msp-v2'"));
assert(!runtime.includes("setItem('sdr-lab-v1'"));
console.log(`PASS: 3 call graphs, ${paths} complete paths, exact decision ranges, contact boundaries, independent local progress, syntax, and no external data flows.`);
