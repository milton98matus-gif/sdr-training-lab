import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
function load(name){const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../public/lab/'+name,import.meta.url),'utf8'),ctx);return JSON.parse(JSON.stringify(ctx.module.exports));}
const {CASES,ACTIONS,CRITERIA}=load('msp-cases.js');
const {GLOSSARY}=load('glossary.js');
for(const name of ['msp-cases.js','msp-app.js','glossary.js','legacy-cases.js'])new vm.Script(fs.readFileSync(new URL('../public/lab/'+name,import.meta.url),'utf8'));
assert.equal(CASES.length,84);assert.equal(new Set(CASES.map(c=>c.id)).size,84);
assert.deepEqual(CASES.map(c=>c.number),Array.from({length:84},(_,i)=>i+1));
assert.equal(GLOSSARY.length,75);assert.equal(new Set(GLOSSARY.map(t=>t.id)).size,GLOSSARY.length);
assert.equal(CRITERIA.length,4);assert.equal(CASES.filter(c=>c.followup).length,8);
const termIds=new Set(GLOSSARY.map(t=>t.id));
for(const c of CASES){
 assert(c.title&&c.context&&c.transcript.length&&c.lens);
 assert(c.terms.every(t=>termIds.has(t)),c.id+' glossary links');
 for(const moment of [c,...(c.followup?[c.followup]:[])]){
  assert(Object.hasOwn(ACTIONS,moment.action));assert.equal(moment.options.length,3);
  assert.equal(new Set(moment.options.map(o=>o.text)).size,3);
  assert.equal(moment.options.filter(o=>o.scores.every(s=>s===2)).length,1);
  assert(moment.options.some(o=>o.text===moment.model&&o.scores.every(s=>s===2)));
  for(const o of moment.options){assert(o.text&&o.why);assert.equal(o.scores.length,4);assert(o.scores.every(n=>Number.isInteger(n)&&n>=0&&n<=2));}
  assert(moment.evidence&&moment.limit);
 }
}
for(const t of GLOSSARY)assert(t.meaning&&t.question&&t.confusion&&t.group);
assert.equal(CASES[15].action,'continue');assert.equal(CASES[15].followup.action,'exclude');
assert.equal(CASES[32].followup.action,'nurture');assert.equal(CASES[47].action,'exclude');
assert.equal(CASES[12].action,'close');assert.equal(CASES[66].followup.action,'book');
assert.equal(CASES[74].followup.action,'recycle');
const html=fs.readFileSync(new URL('../public/lab/index.html',import.meta.url),'utf8');
assert(html.includes('lang="en"'));assert(html.includes('Created by <strong>Milton Matus</strong>'));
for(const [,path]of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert(fs.existsSync(new URL('../public/lab/'+path,import.meta.url)),path);
for(const filename of ['msp-cases.js','glossary.js','msp-app.js','index.html']){
 const text=fs.readFileSync(new URL('../public/lab/'+filename,import.meta.url),'utf8');
 assert(!/app\.hubspot\.com|Call ID \d|Rodrigo|Erik|Wil Vazquez|OSR_QA_Tracker_SAFE/.test(text),'Source-record leak: '+filename);
 assert(!/fetch\s*\(|sendBeacon|XMLHttpRequest/.test(text),'Unexpected external data flow');
}
console.log('PASS: 84 unique cases, 8 evolving calls, 75 linked glossary entries, reference scoring, boundary transitions, assets, and source-data isolation.');
