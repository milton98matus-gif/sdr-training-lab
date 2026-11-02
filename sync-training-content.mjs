import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../public/lab/',import.meta.url);
function load(name){const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL(name,base),'utf8'),ctx);return JSON.parse(JSON.stringify(ctx.module.exports));}
fs.mkdirSync(new URL('../content/',import.meta.url),{recursive:true});
for(const [file,name]of [['msp-cases.js','cases'],['call-lab-data.js','calls'],['glossary.js','glossary'],['onboarding-data.js','onboarding'],['learning-path-data.js','learning-path'],['opportunity-data.js','opportunity-game']])fs.writeFileSync(new URL('../content/'+name+'.json',import.meta.url),JSON.stringify(load(file))+'\n');
const html=fs.readFileSync(new URL('index.html',base),'utf8').replace(/(src|href)="([^"#]+\.(?:css|js))"/g,'$1="/lab/$2"');
fs.writeFileSync(new URL('../app/ui-shell.ts',import.meta.url),'// Generated from public/lab/index.html by sync-training-content.mjs\nexport default '+JSON.stringify(html)+';\n');
