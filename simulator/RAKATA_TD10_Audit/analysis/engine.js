(function(root){
'use strict';
function clip(v,a,b){return Math.min(b,Math.max(a,v));}
function interp(x,xs,ys){if(x<=xs[0])return ys[0];if(x>=xs[xs.length-1])return ys[ys.length-1];let lo=0,hi=xs.length-1;while(hi-lo>1){const k=(lo+hi)>>1;if(xs[k]>x)hi=k;else lo=k;}return ys[lo]+(ys[hi]-ys[lo])*(x-xs[lo])/(xs[hi]-xs[lo]);}
function uniform(x,arr,dx){const z=clip(x/dx,0,arr.length-1),i=Math.min(arr.length-2,Math.floor(z));return arr[i]+(arr[i+1]-arr[i])*(z-i);}
function initial(model){return {t:0,s:0,v:0,u:0,p:model.idle_power,e:0,finished:false,braking:false,pulses:0,wasOn:false,maxV:0};}
function rates(model,s,v,u){
 const coast=uniform(s,model.coast0,5)-model.drag_v2*v*v;
 const z=Math.pow(clip(v*3.6/model.v_noload,0,.999),model.partial_exponent);
 const q=clip((u-z)/(1-z),0,1);
 return {a:coast+interp(v*3.6,model.v_nodes,model.traction)*q,
    p:model.idle_power+(interp(v*3.6,model.v_nodes,model.power_full)-model.idle_power)*Math.pow(q,model.power_exponent||1)*(model.power_scale||1),
    coast,q};
}
function step(st,command,dt,model,options={}){
 if(st.finished)return st;
 let cmd=clip(command/100,0,1);let brake=clip(options.brake||0,0,1);
 const remain=Math.max(.05,model.length-st.s),vf=2.5/3.6;
 const stopping=(st.v*st.v-vf*vf)/(2*model.brake_decel);
 st.braking=!!(options.finishAssist&&remain<=Math.max(1,stopping));
 if(st.braking||brake>0)cmd=0;
 st.u+=(cmd-st.u)*(1-Math.exp(-dt/model.throttle_tau));
 if(st.braking||brake>0)st.u=0;
 let r=rates(model,st.s,st.v,st.u),a=r.a;
 if(st.braking)a=Math.min(a,(vf*vf-st.v*st.v)/(2*remain));
 if(brake>0)a=Math.min(a,-model.brake_decel*brake);
 if(st.v<=0&&a<0)a=0;
 let v2=Math.max(0,st.v+a*dt);let ds=(st.v+v2)*.5*dt;
 let fraction=1;
 if(st.s+ds>=model.length&&ds>0){fraction=(model.length-st.s)/ds;dt*=fraction;v2=Math.max(0,st.v+a*dt);ds=model.length-st.s;st.finished=true;}
 const p2=st.p+(Math.max(model.idle_power,r.p)-st.p)*(1-Math.exp(-dt/model.power_tau));
 st.e+=(st.p+p2)*.5*dt/3600;st.p=p2;st.v=v2;st.s+=ds;st.t+=dt;
 st.maxV=Math.max(st.maxV,st.v*3.6);
 const on=cmd>.1;if(on&&!st.wasOn)st.pulses++;st.wasOn=on;
 return st;
}
function policy(parameters){
 let stage=0;
 return function(st){
  if(st.t<1)return 0;
  const ramp=clip((st.t-1)/3,0,1)*100;
  if(stage===0){if(st.s>=parameters[0]||st.v*3.6>=34.9)stage=1;else return ramp;}
  for(let i=1;i<parameters.length;i+=2){
   if(stage<=i&&st.s>=parameters[i])stage=i+1;
   if(stage===i+1){if(st.s>=parameters[i+1]||st.v*3.6>=34.9)stage=i+2;else return 100;}
  }
  return 0;
 };
}
function simulate(model,control,opts={}){
 const st=initial(model),rows=[];const dt=opts.dt||.1;let low=99;
 for(let k=0;k<Math.ceil((opts.maxTime||420)/dt)&&!st.finished;k++){
   const u=control(st);if(opts.record&&k%(opts.stride||2)===0)rows.push([st.t,st.s,st.v*3.6,u,st.e,st.p]);
   step(st,u,dt,model,{finishAssist:opts.finishAssist!==false});
   if(st.s>300&&st.s<1280)low=Math.min(low,st.v*3.6);
   if(st.t>60&&st.v<.03&&u<1&&!opts.allowStall)break;
 }
 if(opts.record)rows.push([st.t,st.s,st.v*3.6,0,st.e,st.p]);
 return {...st,minCruise:low,rows};
}
const api={clip,interp,uniform,initial,rates,step,policy,simulate};
if(typeof module!=='undefined')module.exports=api;root.RakataEngine=api;
})(typeof window!=='undefined'?window:globalThis);
