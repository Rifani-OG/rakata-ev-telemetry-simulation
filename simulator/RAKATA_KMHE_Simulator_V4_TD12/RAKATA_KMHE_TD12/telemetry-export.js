(function(root){'use strict';
const HEADER='timestamp,lat,lng,speed,sat,throttle,current_mA,voltage,power,energy,distance,millis';
function toTD10(rows,track,startEpoch,withHeader=false){
 const unique=new Map();for(const r of rows){if(!r.slice(0,6).every(Number.isFinite))throw Error('Catatan sesi memuat angka tidak valid');unique.set(Math.round(r[0]*1000),r);}
 const lat0=track.raw.lat[0],lng0=track.raw.lng[0],cos=Math.cos(lat0*Math.PI/180),lines=[];
 for(const [ms,r] of [...unique.entries()].sort((a,b)=>a[0]-b[0])){const p=track.position(r[1],r[6]||0),lat=lat0+p[2]/111195,lng=lng0+p[0]/(111195*cos),voltage=54;
 // sat=0 means unavailable in this simulated session, not a measured satellite count.
 lines.push([new Date(startEpoch+ms).toISOString(),lat.toFixed(7),lng.toFixed(7),r[2].toFixed(4),0,r[3].toFixed(3),(r[5]/voltage*1000).toFixed(6),voltage.toFixed(2),r[5].toFixed(6),r[4].toFixed(7),(r[1]/1000).toFixed(7),ms].join(','));}
 return (withHeader?HEADER+'\r\n':'')+lines.join('\r\n')+'\r\n';
}
const api={HEADER,toTD10};root.RakataTelemetryExport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
