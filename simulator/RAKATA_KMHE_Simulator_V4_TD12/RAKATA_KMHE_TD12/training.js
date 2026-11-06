(function(root){'use strict';
class Pedal{
 constructor(){this.release();}
 press(armed=true){if(this.held)return this.value;this.held=true;this.armed=armed;this.value=armed?5:0;this.elapsed=0;return this.value;}
 advance(seconds,armed=true){if(!this.held)return this.value;if(!armed){this.armed=false;this.elapsed=0;return this.value=0;}if(!this.armed){this.armed=true;this.value=5;this.elapsed=0;return this.value;}this.elapsed+=seconds;const n=Math.floor((this.elapsed+1e-9)/.15);this.elapsed-=n*.15;this.value=Math.min(100,this.value+n*5);return this.value;}
 release(){this.held=false;this.armed=false;this.value=0;this.elapsed=0;return 0;}
}
// First crossing of the requested distance; time and energy share that same position.
function atDistance(rows,s){if(!rows.length)return null;if(s<=rows[0][1])return [...rows[0]];let lo=0,hi=rows.length-1;if(s>rows[hi][1])return null;while(hi-lo>1){const mid=(lo+hi)>>1;if(rows[mid][1]>=s)hi=mid;else lo=mid;}const a=rows[lo],b=rows[hi],q=b[1]>a[1]?(s-a[1])/(b[1]-a[1]):1;return a.map((v,i)=>i===3?a[3]:v+(b[i]-v)*q);}
function phases(rows){const out=[];let cur=null;for(let i=0;i<rows.length;i++){const r=rows[i],on=r[3]>0;if(on&&!cur)cur={start_m:r[1],start_s:r[0],start_speed:r[2],max_throttle:r[3],integral:0,duration:0};if(cur){cur.max_throttle=Math.max(cur.max_throttle,r[3]);if(i>0&&rows[i-1][3]>0){const dt=Math.max(0,r[0]-rows[i-1][0]);cur.integral+=rows[i-1][3]*dt;cur.duration+=dt;}if(!on||i===rows.length-1){cur.end_m=r[1];cur.end_s=r[0];cur.end_speed=r[2];cur.open=on;cur.mean_throttle=cur.duration?cur.integral/cur.duration:cur.max_throttle;out.push(cur);cur=null;}}}return out;}
function verdict(man,ref,complete){
 if(man.invalid)return man.invalid+'. Sesi ini tidak menjadi acuan rekor.';
 if(!complete)return 'Perbandingan sementara pada jarak yang sama; hasil akhir menunggu finish.';
 if(!man.finished||man.finish_speed>(man.finish_limit||3))return 'Sesi manual belum memenuhi syarat finish. Rekomendasi masih menjadi acuan.';
 if(man.max_speed>35.3)return 'Kecepatan manual keluar dari rentang utama TD10. Keunggulan model belum dapat diandalkan.';
 if(man.time>(man.target_time||220))return 'Sesi manual melewati target waktu. Periksa juga apakah kandidat pembanding lolos.';
 if(ref.time>(man.target_time||220))return 'Manual lolos batas waktu, sedangkan kandidat pembanding belum lolos. Bandingkan Wh dan validasi di lapangan.';
 const de=man.energy-ref.energy,dt=man.time-ref.time;
 if(Math.abs(de)<=.22)return `Keduanya lolos target waktu. Energi hampir setara dalam kisaran galat rata-rata model (0,22 Wh); manual ${dt<0?'lebih cepat':'lebih lambat'}.`;
 if(de<0)return 'Manual lebih hemat dalam simulasi dan tetap lolos target waktu. Uji kembali di lapangan.';
 return `Rekomendasi lebih hemat dan sama-sama lolos target waktu${dt<0?'; manual lebih cepat':''}.`;
}
const api={Pedal,atDistance,phases,verdict};if(typeof module!=='undefined')module.exports=api;root.RakataTraining=api;
})(typeof window!=='undefined'?window:globalThis);
