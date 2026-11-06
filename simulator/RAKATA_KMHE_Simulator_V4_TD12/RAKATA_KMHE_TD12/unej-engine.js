(function(root){'use strict';const B=root.RakataEngine||require('./engine.js');
function initial(m){return {...B.initial(m),stopDone:false,stopHolding:false,stopElapsed:0,invalidStop:false,relaunchT:0};}
function idle(st,dt,m){const p2=m.idle_power+(st.p-m.idle_power)*Math.exp(-dt/m.power_tau);st.e+=(m.idle_power*dt+(st.p-m.idle_power)*m.power_tau*(1-Math.exp(-dt/m.power_tau)))/3600;st.p=p2;st.u=0;st.v=0;st.t+=dt;st.braking=true;}
function step(st,command,dt,m,options={}){
 if(!m.stop_s)return B.step(st,command,dt,m,options);
 if(st.finished||st.invalidStop)return st;
 if(st.stopHolding){const hold=Math.min(dt,3-st.stopElapsed);idle(st,hold,m);st.stopElapsed+=hold;if(st.stopElapsed>=3-1e-8){st.stopHolding=false;st.stopDone=true;st.relaunchT=st.t;}return st;}
 const stop=m.stop_s,assisted=options.stopAssist!==false;
 let brake=options.brake||0;
 // Optional corner-speed envelope; braking magnitude remains the assumed 0.43 m/s².
 if(m.speed_caps){let allowable=35/3.6;for(let s=st.s;s<=Math.min(m.length,st.s+160);s+=5){const cap=B.uniform(s,m.speed_caps,5)/3.6;allowable=Math.min(allowable,Math.sqrt(cap*cap+2*m.brake_decel*(s-st.s)));}if(st.v>allowable)brake=Math.max(brake,1);}
 if(!st.stopDone&&assisted){const temp={...m,length:stop};B.step(st,command,dt,temp,{...options,brake,finishAssist:true,finishSpeed:0});st.braking=st.braking||brake>0;if(st.finished||(stop-st.s<.05&&st.v<.08)){st.finished=false;st.s=stop;st.v=0;st.u=0;st.stopHolding=true;st.stopElapsed=0;}return st;}
 if(!st.stopDone&&!assisted&&Math.abs(st.s-stop)<=3&&st.v<.03&&command===0){st.v=0;st.stopHolding=true;return st;}
 B.step(st,command,dt,m,{...options,brake});st.braking=st.braking||brake>0;if(!st.stopDone&&st.s>stop+3)st.invalidStop=true;return st;
}
function policy(p,m){let on=true,capOn=true;return st=>{if(st.stopHolding)return 0;if(st.t<1)return 0;if(p[3]&&st.s>=p[3])return 0;if(p[4]&&m&&!st.stopDone&&st.s>=m.stop_s-p[4])return 0;if(m&&m.speed_caps&&!p[2]){let limit=35/3.6;for(let s=st.s;s<=Math.min(m.length,st.s+160);s+=5){const cap=B.uniform(s,m.speed_caps,5)/3.6;limit=Math.min(limit,Math.sqrt(cap*cap+2*m.brake_decel*(s-st.s)));}if(st.v>limit-.1)capOn=false;if(st.v<limit-.7)capOn=true;if(!capOn)return 0;}const launch=st.stopDone?st.relaunchT:1;if(st.v*3.6>=p[1])on=false;if(st.v*3.6<=p[0])on=true;return on?Math.min(100,Math.max(0,(st.t-launch)/3*100)):0;};}
function simulate(m,p,opts={}){const st=initial(m),control=typeof p==='function'?p:policy(p,m),rows=[[0,0,0,0,0,m.idle_power]];let k=0;while(!st.finished&&!st.invalidStop&&st.t<(opts.maxTime||600)){const u=control(st);step(st,u,opts.dt||.05,m,{finishAssist:true,stopAssist:true});if(opts.record&&k++%(opts.stride||2)===0)rows.push([st.t,st.s,st.v*3.6,st.braking||st.stopHolding?0:u,st.e,st.p]);}if(opts.record)rows.push([st.t,st.s,st.v*3.6,0,st.e,st.p]);return {...st,rows};}
const api={...B,initial,step,policy,simulate};root.RakataUnejEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
