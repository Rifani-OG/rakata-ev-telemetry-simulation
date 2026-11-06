const fs=require('fs'),E=require('./engine.js');
const model=JSON.parse(fs.readFileSync(__dirname+'/model.json')),folds=JSON.parse(fs.readFileSync(__dirname+'/fold_models.json'));
let seed=20260908;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const compact=r=>({time:r.t,energy:r.e,max_speed:r.maxV,min_cruise:r.minCruise,finish_speed:r.v*3.6,finished:r.finished});
const pool=[];
for(let i=0;i<6500;i++){
 const p=i<4500?[95+rnd()*90,880+rnd()*195,1140+rnd()*90]:[90+rnd()*90,760+rnd()*250,900+rnd()*210,1160+rnd()*80,1220+rnd()*90];
 if(p.length===5&&(p[2]-p[1]<30||p[3]-p[2]<80||p[4]-p[3]<25))continue;
 const r=E.simulate(model,E.policy(p),{dt:.2});
 if(r.finished&&r.maxV<35.3&&r.minCruise>=17.8&&r.pulses===(p.length+1)/2&&r.t<=225)pool.push({p,...compact(r),pulses:r.pulses});
}
const chosen=[];
const robust=[];
for(const n of [2,3]){
 const top=pool.filter(r=>r.pulses===n&&r.time<=213).sort((a,b)=>a.energy-b.energy);
 for(const cand of top){
  const p=cand.p.map(x=>Math.round(x/5)*5);
  const full=E.simulate(model,E.policy(p),{dt:.05,record:true,stride:4});
  if(!full.finished||full.t>212||full.minCruise<17.8)continue;
  const fsims=folds.map(m=>compact(E.simulate(m,E.policy(p),{dt:.05})));
  if(fsims.every(r=>r.finished&&r.time<=213&&r.min_cruise>=17.5)){
    robust.push({p,...compact(full),pulses:n,rows:full.rows,fold_predictions:fsims});break;
  }
 }
}
for(const n of [2,3])for(const time of [210,212,215,218,220]){
 const best=pool.filter(r=>r.pulses===n&&r.time<=time).sort((a,b)=>a.energy-b.energy)[0];
 if(best&&!chosen.some(x=>JSON.stringify(x.p)===JSON.stringify(best.p)))chosen.push(best);
}
for(const cand of chosen){
 cand.p=cand.p.map(x=>Math.round(x/5)*5);
 const r=E.simulate(model,E.policy(cand.p),{dt:.05,record:true,stride:4});Object.assign(cand,compact(r));cand.rows=r.rows;
 cand.fold_predictions=folds.map(m=>compact(E.simulate(m,E.policy(cand.p),{dt:.1})));
}
const out={searched:6500,eligible:pool.length,robust,candidates:chosen};fs.writeFileSync(__dirname+'/search.json',JSON.stringify(out));console.table(robust.map(({rows,fold_predictions,...x})=>({...x,foldTmin:Math.min(...fold_predictions.map(x=>x.time)),foldTmax:Math.max(...fold_predictions.map(x=>x.time))})));
