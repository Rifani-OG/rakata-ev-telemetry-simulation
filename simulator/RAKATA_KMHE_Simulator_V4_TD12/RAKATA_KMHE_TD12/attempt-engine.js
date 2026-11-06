(function(root){'use strict';const E=root.RakataUnejEngine,G=root.RakataDriving;
const DEFAULT_ZONES=[
 {name:'Start → sebelum T2',start:0,end:100,throttle:100,target:35},
 {name:'T6 → T7',start:390,end:455,throttle:100,target:22},
 {name:'Setelah stop → T11',start:665,end:895,throttle:100,target:35,rampUntil:760,rampThrottle:45,rampTarget:15},
 {name:'Setelah T13 → setelah T14',start:1185,end:1390,throttle:100,target:35}
];
function setup(data,useRacingLine=true){const d=JSON.parse(JSON.stringify(data)),n=d.track.s.length;
 for(let i=n-11;i<n;i++){const q=(i-(n-11))/10,w=q*q*(3-2*q);for(const k of ['lat','lng','elevation'])d.track[k][i]+=w*(data.track[k][0]-data.track[k][n-1]);}
 const center=new G.Track(d.track),offset=Array(n).fill(0);if(useRacingLine)for(let pass=0;pass<100;pass++){const next=offset.slice();for(let i=1;i<n-1;i++){const a=center.at(i*5),p=center.position((i-1)*5,offset[i-1]),q=center.position((i+1)*5,offset[i+1]);next[i]=Math.max(-1.1,Math.min(1.1,((p[0]+q[0])/2-a.p[0])*a.right[0]+((p[2]+q[2])/2-a.p[2])*a.right[2]));}offset.splice(0,n,...next);}
 const path=JSON.parse(JSON.stringify(d.track));for(let i=0;i<n;i++){const p=center.position(i*5,offset[i]);path.lat[i]=d.track.lat[0]+p[2]/111195;path.lng[i]=d.track.lng[0]+p[0]/(111195*Math.cos(d.track.lat[0]*Math.PI/180));}const racing=new G.Track(path);d.model.speed_caps=d.track.s.map(s=>Math.min(35,Math.sqrt(3/Math.max(.0001,Math.abs(racing.curvature(s))))*3.6));d.model.lat_accel=3;return {d,center,racing,offset};}
function makePolicy(model,zones=DEFAULT_ZONES){const z=zones.map(x=>({...x,latched:false}));return st=>{if(st.stopHolding)return 0;const s=st.s,v=st.v*3.6;for(const a of z){if(s<a.start||s>=a.end)continue;if(a.rampUntil&&s<a.rampUntil){if(v>=a.rampTarget)a.latched=true;return a.latched?0:Math.min(a.rampThrottle,Math.max(0,(st.t-(st.relaunchT||1))/3*a.rampThrottle));}if(v>=a.target)a.latched=true;return a.latched?0:a.throttle;}return 0;};}
class Attempt{constructor(model,laps=1,zones=DEFAULT_ZONES){this.m=model;this.laps=laps;this.zones=zones;this.st=E.initial(model);this.lap=1;this.totalT=0;this.totalE=0;this.distance=0;this.completed=[];this.finished=false;this.invalid='';this.control=makePolicy(model,zones);}
 step(u,dt,options={}){if(this.finished)return;dt=Math.min(dt,Math.max(0,this.laps*250-this.totalT));const st=this.st,t=st.t,e=st.e,s=st.s;E.step(st,u,dt,this.m,{...options,finishAssist:false,stopAssist:true});this.totalT+=st.t-t;this.totalE+=st.e-e;this.distance+=st.s-s;if(st.invalidStop){this.invalid='Melewati titik 9 tanpa stop 3 detik';this.finished=true;}if(st.finished){if(!st.stopDone){this.invalid='Stop 3 detik titik 9 belum selesai';this.finished=true;return;}this.completed.push({lap:this.lap,time:st.t,energy:st.e,exitSpeed:st.v*3.6,stop:st.stopElapsed});if(this.lap===this.laps){this.finished=true;return;}this.lap++;this.st={...E.initial(this.m),v:st.v,u:st.u,p:st.p};this.control=makePolicy(this.m,this.zones);}if(this.totalT>=this.laps*250-1e-8){this.finished=true;if(this.completed.length<this.laps)this.invalid='Batas waktu attempt habis';}}
}
const api={DEFAULT_ZONES,setup,makePolicy,Attempt};root.RakataAttempt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
