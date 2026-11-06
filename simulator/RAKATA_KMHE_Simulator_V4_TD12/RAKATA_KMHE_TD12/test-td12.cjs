const assert=require('assert'),fs=require('fs'),vm=require('vm');global.window=global;
require('./data.js');const E=require('./engine.js'),G=require('./driving.js'),T=require('./training.js');require('./td12-data.js');
const d=RAKATA_TD12;
assert.equal(d.model.target_time,225);
assert.equal(d.laps.length,3);
for(const l of d.laps){assert(l.time<=225&&l.html_time<=225&&l.field_valid);assert(l.energy>0);}
function policy(p){return st=>{const t=st.t/p.scale;if(t>p.t.at(-1))return 0;let lo=0,hi=p.t.length-1;while(hi-lo>1){const k=(hi+lo)>>1;if(p.t[k]>t)hi=k;else lo=k;}return p.u[lo];};}
for(const s of d.strategies){const r=E.simulate(d.model,policy(s.p),{dt:.05,record:true,stride:4,finishAssist:false,maxTime:350,allowStall:true});assert(r.finished);assert(Math.abs(r.t-s.time)<1e-6);assert(Math.abs(r.e-s.energy)<1e-6);assert(G.eligible(r,'',true,1,225,35.3));assert(!G.eligible(r,'',true,2,225,35.3));assert(!G.eligible(r,'keluar jalan',true,1,225,35.3));assert(!G.eligible({...r,t:225.01},'',true,1,225,35.3));assert(!G.eligible(r,'',false,1,225,35.3));assert(!G.eligible(r,'',true,1,225,3));assert(T.atDistance(r.rows,1440));assert(!T.verdict({finished:true,finish_speed:r.v*3.6,finish_limit:35.3,max_speed:r.maxV,time:r.t,target_time:225,energy:r.e},s,true).includes('belum memenuhi syarat finish'));console.log(s.name,r.t.toFixed(3),r.e.toFixed(3),'VALID');}
for(const tr of d.traces){for(let i=1;i<tr.t.length;i++){assert(tr.t[i]>tr.t[i-1]);assert(tr.s[i]>=tr.s[i-1]);assert(tr.e[i]>=tr.e[i-1]);}assert(Math.abs(tr.s.at(-1)-1440)<1e-6);}
for(const f of fs.readdirSync(__dirname).filter(f=>f.endsWith('.js'))){new vm.Script(fs.readFileSync(__dirname+'/'+f,'utf8'),{filename:f});}
for(const name of ['index.html','attempt.html']){const html=fs.readFileSync(__dirname+'/'+name,'utf8');for(const m of html.matchAll(/(?:src|href)="([^"?#]+)"/g)){if(!/^(?:https?:|data:)/.test(m[1]))assert(fs.existsSync(__dirname+'/'+m[1]),'Missing asset '+m[1]);}}
console.log('PASS: model rollout, validity boundaries, trace monotonicity, JS syntax and local assets.');
