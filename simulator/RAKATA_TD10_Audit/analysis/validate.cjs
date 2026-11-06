const fs=require('fs'),E=require('./engine.js');
const model=JSON.parse(fs.readFileSync(__dirname+'/model.json')),folds=JSON.parse(fs.readFileSync(__dirname+'/fold_models.json')),traces=JSON.parse(fs.readFileSync(__dirname+'/traces.json'));
const out=[];
for(const tr of traces){
 const m=folds[tr.lap-1],st=E.initial(m),actualEnd=tr.t.at(-1);let se=0,count=0;
 // Free rollout on measured throttle versus time. No speed/position teacher forcing.
 while(st.t<actualEnd&&!st.finished){const u=E.interp(st.t,tr.t,tr.u);E.step(st,u,.1,m,{finishAssist:false});se+=(st.v*3.6-E.interp(st.t,tr.t,tr.v))**2;count++;}
 // Timing replay: measured spatial switches, time-based launch while GPS distance is zero.
 const control=x=>x.s<10?E.interp(x.t,tr.t,tr.u):E.interp(x.s,tr.s,tr.u);
 const pred=E.simulate(m,control,{finishAssist:false,dt:.1});
 out.push({lap:tr.lap,speed_rmse:Math.sqrt(se/count),time_actual:actualEnd,time_pred:pred.t,dist_pred:pred.s,energy_actual:tr.e.at(-1),energy_pred:pred.e,finished:pred.finished});
}
fs.writeFileSync(__dirname+'/validation.json',JSON.stringify(out,null,2));console.table(out);
for(const p of [[135,1020,1180],[130,980,1170],[120,950,1160],[150,1000,1190]]){const r=E.simulate(model,E.policy(p),{dt:.1});console.log(p,{time:r.t,energy:r.e,max:r.maxV,min:r.minCruise,finished:r.finished,vend:r.v*3.6});}
