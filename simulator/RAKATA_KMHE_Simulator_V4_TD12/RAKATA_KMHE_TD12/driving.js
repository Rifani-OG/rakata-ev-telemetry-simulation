(function(root){'use strict';
const E=root.RakataEngine||require('./engine.js'),cl=E.clip;
function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a));}
// World axes: east +X, north +Z, elevation +Y. Positive yaw/steer is a physical right turn.
class Track{
 constructor(track){this.raw=track;this.L=track.s.at(-1);this.n=track.s.length;const lat=track.lat[0],lon=track.lng[0],c=Math.cos(lat*Math.PI/180);this.x=track.lng.map(x=>(x-lon)*111195*c);this.z=track.lat.map(x=>(x-lat)*111195);this.y=track.elevation.map(x=>x-track.elevation[0]);}
 point(s){s=cl(s,0,this.L);const a=this.raw.s;let k=0,hi=a.length-1;while(hi-k>1){const m=(k+hi)>>1;if(a[m]>s)hi=m;else k=m;}const t=(s-a[k])/(a[k+1]-a[k]);const out=[];for(const v of [this.x,this.y,this.z]){const p0=v[Math.max(0,k-1)],p1=v[k],p2=v[k+1],p3=v[Math.min(v.length-1,k+2)];out.push(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));}return out;}
 at(s){s=cl(s,0,this.L);const p=this.point(s),a=this.point(Math.max(0,s-.5)),b=this.point(Math.min(this.L,s+.5));const span=Math.min(this.L,s+.5)-Math.max(0,s-.5);const dx=b[0]-a[0],dz=b[2]-a[2],norm=Math.hypot(dx,dz)||1;return {p,heading:Math.atan2(dx,dz),right:[dz/norm,0,-dx/norm],metric:norm/span};}
 curvature(s){const a=this.at(Math.max(0,s-2)),b=this.at(Math.min(this.L,s+2));return wrap(b.heading-a.heading)/Math.max(.01,Math.min(this.L,s+2)-Math.max(0,s-2))/Math.max(.2,(a.metric+b.metric)/2);}
 position(s,lateral=0){const a=this.at(s);return a.p.map((x,i)=>x+a.right[i]*lateral);}
}
function initial(track){return {lateral:0,yaw:track.at(0).heading,steer:0,invalid:'',travel:0,maxLateral:0};}
function factors(d,st,track,config,input,dt,full){const a=track.at(st.s);if(!full){d.lateral=0;d.yaw=a.heading;d.steer=0;return 1;}const max=config.maxSteer*Math.PI/180;d.steer+=(cl(input,-1,1)*max-d.steer)*(1-Math.exp(-dt/.16));const error=wrap(d.yaw-a.heading),k=track.curvature(st.s);if(Math.abs(error)>Math.PI*.47)d.invalid='Arah kendaraan berlawanan dengan lintasan';return cl(Math.cos(error)/Math.max(.2,a.metric*(1-k*d.lateral)),.01,2);}
function advance(d,before,st,track,config,full){const dt=st.t-before.t,travel=(before.v+st.v)*.5*dt;d.travel+=travel;if(!full){d.lateral=0;d.yaw=track.at(st.s).heading;return;}const error=wrap(d.yaw-track.at(before.s).heading);d.lateral+=travel*Math.sin(error);d.yaw+=travel/config.wheelbase*Math.tan(d.steer);const newError=wrap(d.yaw-track.at(st.s).heading);const footprint=Math.abs(Math.cos(newError))*config.width/2+Math.abs(Math.sin(newError))*config.length/2;d.maxLateral=Math.max(d.maxLateral,Math.abs(d.lateral));if(Math.abs(d.lateral)+footprint>config.width*2)d.invalid='Bodi melewati batas jalan — sesi tidak sah untuk rekor';}
function eligible(st,invalid,manual,rate,targetTime=220,finishLimit=3){return manual&&!invalid&&rate===1&&st.finished&&st.t<=targetTime&&st.v*3.6<=finishLimit&&st.maxV<=35.3&&Number.isFinite(st.e)&&st.e>0;}
function shouldPromote(st,baseline,valid){return valid&&st.e<baseline.energy-1e-6;}
function padInput(p,config={gas:7,brake:6,axis:0,invert:false}){const dz=.12;let x=p.axes[config.axis]||0;x=config.invert?-x:x;return {throttle:cl(p.buttons[config.gas]?.value||0,0,1)*100,brake:cl(p.buttons[config.brake]?.value||0,0,1),steer:Math.abs(x)<=dz?0:Math.sign(x)*(Math.abs(x)-dz)/(1-dz)};}
const api={Track,initial,factors,advance,eligible,shouldPromote,padInput,wrap};root.RakataDriving=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
