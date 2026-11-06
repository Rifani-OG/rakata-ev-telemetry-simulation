(function(root){'use strict';
// Metric world coordinates projected through a chase camera; no external assets or CDN.
class Scene{
 constructor(canvas,track){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.track=track;this.camera=null;this.heading=null;}
 reset(){this.camera=null;this.heading=null;}
 draw(st,drive,config,reference,target,command){const c=this.canvas,g=this.ctx;if(!g)return;const w=Math.max(320,c.clientWidth),h=Math.max(260,c.clientHeight),dpr=Math.min(2,root.devicePixelRatio||1);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}g.setTransform(dpr,0,0,dpr,0,0);const pos=this.track.position(st.s,drive.lateral);let yaw=drive.yaw;if(this.heading===null)this.heading=yaw;this.heading+=Math.atan2(Math.sin(yaw-this.heading),Math.cos(yaw-this.heading))*.13;yaw=this.heading;const sin=Math.sin(yaw),cos=Math.cos(yaw),desired=[pos[0]-sin*8,pos[1]+6.5,pos[2]-cos*8];if(!this.camera)this.camera=desired;this.camera=this.camera.map((v,i)=>v+(desired[i]-v)*.2);const cam=this.camera,pitch=.43,cp=Math.cos(pitch),sp=Math.sin(pitch),focal=Math.min(w,h)*1.15;
 const transform=p=>{const dx=p[0]-cam[0],dy=p[1]-cam[1],dz=p[2]-cam[2],fw=dx*sin+dz*cos;return [dx*cos-dz*sin,dy*cp+fw*sp,fw*cp-dy*sp];};const project=v=>[w/2+v[0]*focal/v[2],h*.42-v[1]*focal/v[2]];
 let faces=[];const add=(pts,color,stroke)=>{let poly=pts.map(transform),out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ina=a[2]>.4,inb=b[2]>.4;if(ina)out.push(a);if(ina!==inb){const t=(.4-a[2])/(b[2]-a[2]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}if(out.length>=3)faces.push({p:out.map(project),z:out.reduce((v,p)=>v+p[2],0)/out.length,color,stroke});};
 const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#7aa4b3');sky.addColorStop(.47,'#c8d5cf');sky.addColorStop(.48,'#54745b');sky.addColorStop(1,'#274d40');g.fillStyle=sky;g.fillRect(0,0,w,h);
 const edge=(s,lift,offset)=>{const p=this.track.position(s,offset);p[1]+=lift;return p;};const L=this.track.L,half=config.width*2;
 for(let s=Math.max(0,Math.floor((st.s-32)/3)*3);s<Math.min(L,st.s+220);s+=3){const end=Math.min(L,s+3);add([edge(s,-.08,-half-12),edge(end,-.08,-half-12),edge(end,-.08,half+12),edge(s,-.08,half+12)],'#4a6953');add([edge(s,0,-half),edge(end,0,-half),edge(end,0,half),edge(s,0,half)],Math.floor(s/3)%2?'#37464c':'#39494e');for(const sign of [-1,1])add([edge(s,.015,sign*half),edge(end,.015,sign*half),edge(end,.015,sign*(half-.09)),edge(s,.015,sign*(half-.09))],'#dbe1d4');
 if(Math.floor(s/3)%4===0)add([edge(s,.02,-.03),edge(end,.02,-.03),edge(end,.02,.03),edge(s,.02,.03)],'#879993');
 const u=reference(s);if(u>1)add([edge(s,.025,-half+.12),edge(end,.025,-half+.12),edge(end,.025,-half+.32),edge(s,.025,-half+.32)],'#ff795c');if(target&&target(s)>1)add([edge(s,.025,half-.12),edge(end,.025,half-.12),edge(end,.025,half-.32),edge(s,.025,half-.32)],'#e6ca6b');}
 for(const s of [0,L-1,...(this.track.raw.stop_s?[this.track.raw.stop_s]:[])])if(Math.abs(st.s-s)<220){for(let i=0;i<8;i++)add([edge(s,.035,-half+i*half/4),edge(Math.min(L,s+1),.035,-half+i*half/4),edge(Math.min(L,s+1),.035,-half+(i+1)*half/4),edge(s,.035,-half+(i+1)*half/4)],s===this.track.raw.stop_s?'#f7ca72':i%2?'#ecede6':'#161d25');}
 // Low-polygon pod vehicle. Width and wheelbase track the selected source dimensions.
 const cy=Math.cos(drive.yaw),sy=Math.sin(drive.yaw);const local=(x,y,z)=>[pos[0]+x*cy+z*sy,pos[1]+y,pos[2]-x*sy+z*cy];
 const box=(x0,x1,y0,y1,z0,z1,colors)=>{const v=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]].map(p=>local(...p));for(const [j,idx] of [[0,[4,5,6,7]],[1,[0,1,5,4]],[2,[1,2,6,5]],[3,[2,3,7,6]],[4,[3,0,4,7]]])add(idx.map(i=>v[i]),colors[j%colors.length]);};
 const cw=config.width,cl=config.length;for(const x of [-cw*.43,cw*.43])for(const z of [-config.wheelbase/2,config.wheelbase/2])box(x-.09,x+.09,.07,.48,z-.24,z+.24,['#151b23','#080e15']);box(-cw*.42,cw*.42,.25,.62,-cl*.42,cl*.32,['#51d5c6','#219c94','#207a78']);box(-cw*.29,cw*.29,.62,.896,-cl*.17,cl*.1,['#244455','#172c3a','#4d707c']);box(-cw*.35,cw*.35,.4,.48,-cl*.43,-cl*.42,[command>0?'#ef795d':'#af574e']);
 faces.sort((a,b)=>b.z-a.z);for(const f of faces){g.beginPath();f.p.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=f.color;g.fill();}
 g.fillStyle='#0b162bd9';g.fillRect(12,12,Math.min(w-24,390),66);g.fillStyle='#f0f6f9';g.font='bold 14px Arial';g.fillText(config.full?'FULL STEERING':'AUTO STEERING',24,35);g.font='12px Arial';g.fillStyle='#bacdd5';g.fillText('Jalan '+(config.width*4).toFixed(2)+' m · kiri: acuan · kanan: target',24,59);
 g.fillStyle='#0b162bd9';g.fillRect(12,h-57,w-24,43);g.fillStyle=drive.invalid?'#ff9a83':'#55dfd0';g.font='bold 13px Arial';g.fillText(drive.invalid||(this.track.raw.name||'SPORT JABAR')+'  /  '+Math.round(st.s)+' m  /  '+Math.round(command)+'% GAS',24,h-31);
 }
}
root.RakataScene=Scene;
})(window);
