// Reproducible bounded calibration; no network or browser execution of the source HTML.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=__dirname,src=process.argv[2]||path.join(root,'TD12_source.html');
const h=fs.readFileSync(src,'utf8');
const raw=JSON.parse(h.match(/window.PRELOADED_DATA=(\[.*?\]);<\/script>/s)[1]);
const ctx={state:{thresholds:{}},document:{getElementById:()=>({value:'motion'})}};
vm.createContext(ctx);
// Only known pure detector functions from the supplied export; never its UI/init code.
vm.runInContext(h.slice(h.indexOf('const CFG ='),h.indexOf('function changeBoundaryMode'))+'\nthis.analyze=d=>detectLaps(prepareTelemetry(d));',ctx);
const detected=ctx.analyze(raw).filter(l=>l.candidateLap);
if(detected.length!==3)throw Error('Expected three TD12 laps; review source boundaries');
global.window=global;require('./data.js');const base=JSON.parse(JSON.stringify(RAKATA_DATA)),E=require('./engine.js');
const laps=[],traces=[];
for(const [i,l] of detected.entries()){
 const rows=raw.slice(l.startIdx,l.endIdx+1),first=rows[0],tr={lap:'TD12-'+(i+1),t:[],s:[],v:[],u:[],p:[],e:[]};
 for(const r of rows){const t=(r.millis-first.millis)/1000;if(t<0||tr.t.length&&t<=tr.t.at(-1))continue;
 tr.t.push(t);tr.s.push((r.gpsCum-first.gpsCum)*1000*1440/(l.lapDistance*1000));tr.v.push(r.speed);tr.u.push(r.throttle);tr.p.push(r.power);tr.e.push(r.cleanEnergyCum-first.cleanEnergyCum);}
 const pulses=[];let on=null;
 tr.u.forEach((u,k)=>{if(u>=1&&on===null)on=k;if(on!==null&&(u<1||k===tr.u.length-1)){if(tr.t[k]-tr.t[on]>=.45)pulses.push({start_s:tr.t[on],end_s:tr.t[k],start_m:tr.s[on],end_m:tr.s[k],v_start:tr.v[on],v_end:tr.v[k],energy:tr.e[k]-tr.e[on]});on=null;}});
 const gaps=rows.slice(1).filter((r,k)=>r.millis-rows[k].millis>1500).map((r,k)=>({millis:r.millis}));
 laps.push({lap:tr.lap,time:tr.t.at(-1),html_time:l.lapTimeMs/1000,time_with_full_spare:tr.t.at(-1),energy:l.lapEnergy,distance:l.lapDistance*1000,quality:'field-confirmed',field_valid:true,end_speed:tr.v.at(-1),max_speed:l.maxSpeed,pulses:pulses.length,phases:pulses,source_start:l.startIdx,source_end:l.endIdx,gap_count:gaps.length,note:'Valid lapangan dikonfirmasi pengguna; waktu perangkat, jarak GPS dinormalisasi untuk peta; bukan bukti berhenti penuh.'});traces.push(tr);
}
function input(tr,t){let k=0,hi=tr.t.length-1;while(hi-k>1){const m=(k+hi)>>1;if(tr.t[m]>t)hi=m;else k=m;}return t>tr.t.at(-1)?0:tr.u[k];}
// Model retains TD10 structure. Learn traction at four speed anchors and a smooth
// spatial coast correction, plus electrical scale. No measured speed is injected.
const x0=[1,1,1,1,0,0,0,0,0,0,1,35.7];
const bounds=[[.4,2.5],[.4,2.5],[.4,2.5],[.4,2.5],...Array.from({length:6},()=>[-.18,.18]),[.4,1.8],[31.5,39]];
function model(x){return {...base.model,target_time:225,traction:base.model.traction.map((v,i)=>v*E.interp(base.model.v_nodes[i],[0,12,24,38],x.slice(0,4))),coast0:base.model.coast0.map((v,i)=>v+E.interp(i*5,[0,288,576,864,1152,1440],x.slice(4,10))),power_scale:base.model.power_scale*x[10],v_noload:x[11]};}
function evaluate(x,indices,detail=false){const m=model(x),out=[];let loss=0;
 for(const ix of indices){const tr=traces[ix],st=E.initial(m),end=tr.t.at(-1),long={...m,length:10000};let sq=0,n=0;
 for(let t=0;t<end;t+=.25){E.step(st,input(tr,t),Math.min(.25,end-t),long,{finishAssist:false});if(Math.round(t*4)%4===0){const v=E.interp(t,tr.t,tr.v),s=E.interp(t,tr.t,tr.s);if(s<1380){sq+=(st.v*3.6-v)**2;loss+=(st.v*3.6-v)**2/25+(st.s-s)**2/10000;n++;}}}
 loss+=(st.s-1440)**2/500+(st.e-laps[ix].energy)**2*35;
 out.push({lap:tr.lap,speed_rmse:Math.sqrt(sq/n),distance_at_record_end:st.s,energy_at_record_end:st.e,energy_error:st.e-laps[ix].energy});}
 loss+=x.slice(4,10).reduce((a,v)=>a+v*v*30,0);return detail?out:loss;
}
function fit(indices,rounds=9){let x=x0.slice(),best=evaluate(x,indices);const steps=[.22,.22,.22,.22,.04,.04,.04,.04,.04,.04,.12,1];
 for(let pass=0;pass<rounds;pass++){for(let k=0;k<x.length;k++){for(const sign of [-1,1]){const y=x.slice();y[k]=E.clip(y[k]+sign*steps[k],...bounds[k]);const loss=evaluate(y,indices);if(loss<best){x=y;best=loss;}}}for(let k=0;k<steps.length;k++)steps[k]*=.8;}return x;}
const fitted=fit([0,1,2],15),m=model(fitted),training=evaluate(fitted,[0,1,2],true);
const heldout=traces.map((_,i)=>evaluate(fit([0,1,2].filter(j=>j!==i),9),[i],true)[0]);
// Search bounded timing variants of each observed throttle schedule. This is a
// model candidate, separate from field replay and never labelled measured.
function control(schedule,scale=1){return st=>input(schedule,st.t/scale);}
const strategies=[];
for(let i=0;i<3;i++){let best=null;for(let scale=.8;scale<=1.251;scale+=.025){const r=E.simulate(m,control(traces[i],scale),{record:true,dt:.05,stride:4,finishAssist:false,maxTime:350,allowStall:true});const valid=r.finished&&r.t<=225&&r.maxV<=35.3;const score=(valid?0:1000)+Math.abs(r.t-220)*.01+r.e;if(!best||score<best.score)best={score,r,scale,valid};}
 const b=best;strategies.push({name:'TD12 Lap '+(i+1)+' · simulasi kalibrasi',p:{td12:true,t:traces[i].t,u:traces[i].u,scale:b.scale},time:b.r.t,energy:b.r.e,max_speed:b.r.maxV,finish_speed:b.r.v*3.6,finished:b.r.finished,pulses:laps[i].pulses,rows:b.r.rows,valid:b.valid,source_lap:i+1});}
strategies.sort((a,b)=>Number(b.valid)-Number(a.valid)||a.energy-b.energy);
const report={source:path.basename(src),voltage:54,target:225,clock:'millis perangkat; waktu HTML disimpan terpisah',fit:fitted,training,heldout,laps,strategies:strategies.map(({rows,p,...s})=>({...s,timing_scale:p.scale})),limits:['Tiga lap dari sesi sama, bukan validasi independen lapangan.','Gap tidak menjadi pengamatan percepatan; input ditahan sampai sampel berikutnya pada rollout.','Model tidak mengidentifikasi Crr/CdA secara terpisah.','UNEJ tetap model transfer lama; kalibrasi TD12 hanya Sport Jabar.','Replay lapangan tidak masuk leaderboard pemain.']};
fs.writeFileSync(path.join(root,'td12-data.js'),'window.RAKATA_TD12='+JSON.stringify({model:m,track:base.track,laps,traces,strategies,validation:report,meta:{source:'TD12',target:225}})+';\n');
fs.writeFileSync(path.join(root,'TD12_TRAINING_REPORT.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({laps:report.laps.map(l=>({lap:l.lap,time:l.time,html_time:l.html_time,energy:l.energy,pulses:l.pulses})),training,heldout,strategies:report.strategies},null,2));
