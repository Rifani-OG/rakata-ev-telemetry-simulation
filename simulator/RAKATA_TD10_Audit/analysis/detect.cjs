const fs=require('fs');

const state = {
    telemetry: [], laps: [], currentLapIdx: -1, ridx: 0,
    playing: false, timer: null, speed: 10, chartMode: 'overview',
    layerOn: { thr: true, route: true },
    thresholds: { idleCurrent: 0.18, driveCurrent: 0.25, glideCurrent: 0.28 }
};

let map, routeLyr, thrLyrs = [], carMkr;
let chart = null, chartCmpSpeed = null, chartCmpCur = null, chartCmpThr = null, chartCmpPower = null, chartCmpEnergy = null;

const CFG = {
    START_THROTTLE_PCT: 1,
    START_SPARE_MS: 1000,
    START_CONFIRM_MS: 6000,
    // Boundary data: run invalid / logger pause tidak boleh digabung ke lap berikutnya.
    HARD_GAP_MS: 5000,
    DISTANCE_RESET_KM: 0.03,
    END_NEAR_START_M: 40,
    END_SPEED_KMH: 3.0,
    END_GPS_MOVE_M: 4.0,
    END_STABLE_SAMPLES: 2,
    MIN_LAP_TIME_S: 90,
    MIN_LAP_DISTANCE_KM: 0.80,
    PHASE_MIN_SPEED_KMH: 0.5,
    GLIDE_MIN_SPEED_KMH: 2.0,
    PHASE_MIN_DURATION_MS: 450,
    PHASE_MERGE_GAP_MS: 1000
};

function initMap() {
    map = L.map('map', { zoomControl: true, preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSMap', maxZoom: 20
    }).addTo(map);
    map.setView([-7.9, 112.6], 15);
}

function thrColor(t) {
    const p = Math.max(0, Math.min(100, Number(t) || 0)) / 100;
    const stops = [[0,[34,197,94]],[.25,[132,204,22]],[.5,[234,179,8]],[.75,[249,115,22]],[1,[239,68,68]]];
    for (let i=0;i<stops.length-1;i++) {
        const [t0,c0]=stops[i], [t1,c1]=stops[i+1];
        if (p>=t0 && p<=t1) {
            const f=(p-t0)/(t1-t0);
            return `rgb(${Math.round(c0[0]+(c1[0]-c0[0])*f)},${Math.round(c0[1]+(c1[1]-c0[1])*f)},${Math.round(c0[2]+(c1[2]-c0[2])*f)})`;
        }
    }
    return '#ef4444';
}

function num(v, fallback=0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function median(arr) {
    const a = arr.filter(Number.isFinite).sort((x,y)=>x-y);
    if (!a.length) return 0;
    const m = Math.floor(a.length/2);
    return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
}

function haversineM(aLat,aLng,bLat,bLng) {
    if (![aLat,aLng,bLat,bLng].every(Number.isFinite)) return Infinity;
    const R=6371000, r=Math.PI/180;
    const p1=aLat*r, p2=bLat*r, dp=(bLat-aLat)*r, dl=(bLng-aLng)*r;
    const x=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0,1-x)));
}

function gpsValid(d) {
    return d && Number.isFinite(d.lat) && Number.isFinite(d.lng) && Math.abs(d.lat)>0.5 && Math.abs(d.lng)>0.5;
}

function isHardBoundary(tele, i) {
    if (i<=0) return false;
    const c=tele[i], p=tele[i-1];
    const dm=c.millis-p.millis;
    const dr=p.rawDistance-c.rawDistance;

    // HARD BOUNDARY:
    // 1) millis reset / tidak valid,
    // 2) jeda telemetry > 5 detik,
    // 3) distance logger di-reset, termasuk setelah run pendek/invalid.
    // Boundary ini sengaja memutus candidate lap. Candidate yang belum memenuhi
    // syarat lap valid dibuang, bukan diteruskan/digabung ke lap valid berikutnya.
    const millisReset = !Number.isFinite(dm) || dm<=0;
    const dataGap = Number.isFinite(dm) && dm>CFG.HARD_GAP_MS;
    const distanceReset = Number.isFinite(dr) && dr>CFG.DISTANCE_RESET_KM;

    return millisReset || dataGap || distanceReset;
}

function parseDataArray(dataRows) {
    if (!dataRows || !dataRows.length) throw new Error('Data kosong.');
    const firstRow=dataRows[0];
    const isHeader=firstRow.some(c=>/^(lat|latitude)$/i.test(String(c).trim()) || /^(lng|lon|longitude)$/i.test(String(c).trim()) || /^speed$/i.test(String(c).trim()));
    let rows=dataRows, mapCol={};

    if (isHeader) {
        const h=firstRow.map(x=>String(x).trim().toLowerCase().replace(/[^a-z]/g,''));
        rows=dataRows.slice(1);
        h.forEach((k,i)=>{
            if (k==='timestamp'||k==='time'||k==='datetime') mapCol.ts=i;
            else if (k==='lat'||k==='latitude') mapCol.lat=i;
            else if (k==='lng'||k==='lon'||k==='longitude') mapCol.lng=i;
            else if (k==='speed') mapCol.speed=i;
            else if (k==='sat'||k==='satellite'||k==='satellites') mapCol.sat=i;
            else if (k==='throttle') mapCol.throttle=i;
            else if (k==='currentma'||k==='current') mapCol.current=i;
            else if (k==='voltage') mapCol.voltage=i;
            else if (k==='power') mapCol.power=i;
            else if (k==='energy'||k==='wh') mapCol.energy=i;
            else if (k==='distance') mapCol.distance=i;
            else if (k==='millis'||k==='milliseconds') mapCol.millis=i;
        });
    } else {
        // Format logger RAKATA saat ini:
        // timestamp,lat,lng,speed,sat,throttle,current_mA,voltage,power,energy,distance,millis
        mapCol={ts:0,lat:1,lng:2,speed:3,sat:4,throttle:5,current:6,voltage:7,power:8,energy:9,distance:10,millis:11};
    }

    const required=['lat','lng','speed','throttle','current','voltage','power','energy','distance','millis'];
    for (const k of required) {
        if (mapCol[k]===undefined) throw new Error(`Kolom ${k} tidak ditemukan.`);
    }

    const out=[];
    for (const row of rows) {
        if (!row || row.length<3) continue;
        const lat=num(row[mapCol.lat], NaN), lng=num(row[mapCol.lng], NaN);
        const millis=num(row[mapCol.millis], NaN);
        if (!Number.isFinite(millis)) continue;
        out.push({
            timestamp: mapCol.ts!==undefined ? String(row[mapCol.ts] ?? '') : '',
            lat, lng,
            gpsValid: Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)>0.5&&Math.abs(lng)>0.5,
            speed:num(row[mapCol.speed]),
            sat:mapCol.sat!==undefined ? num(row[mapCol.sat]) : 0,
            throttle:num(row[mapCol.throttle]),
            current:num(row[mapCol.current]),
            voltage:num(row[mapCol.voltage]),
            power:num(row[mapCol.power]),
            energy:num(row[mapCol.energy]),
            rawDistance:num(row[mapCol.distance]),
            millis
        });
    }
    return out;
}

function prepareTelemetry(tele) {
    if (!tele.length) return tele;

    const maxCurrent=Math.max(...tele.map(d=>Math.abs(d.current)).filter(Number.isFinite));
    if (maxCurrent>300) tele.forEach(d=>d.current/=1000);

    let cleanEnergy=0, cleanDistance=0, gpsCum=0, cleanTime=0;
    tele[0].cleanEnergyCum=0;
    tele[0].cleanDistanceCum=0;
    tele[0].gpsCum=0;
    tele[0].cleanTimeMs=0;

    for (let i=1;i<tele.length;i++) {
        const c=tele[i], p=tele[i-1];
        const hard=isHardBoundary(tele,i);
        let de=c.energy-p.energy;
        if (!hard && Number.isFinite(de) && de>=0 && de<50) cleanEnergy+=de;

        let dr=c.rawDistance-p.rawDistance;
        if (!hard && Number.isFinite(dr) && dr>=0 && dr<0.5) cleanDistance+=dr;

        if (gpsValid(c)&&gpsValid(p)) {
            const gd=haversineM(p.lat,p.lng,c.lat,c.lng)/1000;
            // 50 m per sample is already implausible for this vehicle; reject GPS teleport.
            if (Number.isFinite(gd) && gd>=0 && gd<0.05) gpsCum+=gd;
        }

        const dt=c.millis-p.millis;
        if (!hard && Number.isFinite(dt) && dt>0) cleanTime+=dt;

        c.cleanEnergyCum=cleanEnergy;
        c.cleanDistanceCum=cleanDistance;
        c.gpsCum=gpsCum;
        c.cleanTimeMs=cleanTime;
    }

    const idleSamples=tele
        .filter(d=>d.throttle<=1 && d.speed<2 && d.current>0.02 && d.current<2)
        .map(d=>d.current);
    const idle=idleSamples.length ? median(idleSamples) : 0.18;
    const mad=idleSamples.length ? median(idleSamples.map(v=>Math.abs(v-idle))) : 0.01;

    state.thresholds.idleCurrent=idle;
    state.thresholds.driveCurrent=idle + Math.max(0.07, 6*mad);
    state.thresholds.glideCurrent=idle + Math.max(0.10, 8*mad);

    return tele;
}

function energyBetween(tele,a,b) {
    if (!tele[a]||!tele[b]||b<a) return 0;
    return Math.max(0, (tele[b].cleanEnergyCum||0)-(tele[a].cleanEnergyCum||0));
}

function distanceBetween(tele,a,b) {
    if (!tele[a]||!tele[b]||b<a) return 0;
    const raw=tele[b].rawDistance-tele[a].rawDistance;
    // Within a detected lap raw distance is preferred because it also covers short logger gaps.
    if (Number.isFinite(raw) && raw>=0 && raw<3) return raw;
    const clean=(tele[b].cleanDistanceCum||0)-(tele[a].cleanDistanceCum||0);
    if (clean>0) return clean;
    return Math.max(0,(tele[b].gpsCum||0)-(tele[a].gpsCum||0));
}

function elapsedMsBetween(tele,a,b) {
    if (!tele[a]||!tele[b]||b<a) return 0;
    const dm=tele[b].millis-tele[a].millis;
    if (Number.isFinite(dm)&&dm>=0) return dm;
    return Math.max(0,(tele[b].cleanTimeMs||0)-(tele[a].cleanTimeMs||0));
}

function gpsMovementBack(tele,i,windowMs=1000) {
    if (!gpsValid(tele[i])) return Infinity;
    let j=i, elapsed=0;
    while (j>0 && elapsed<windowMs && !isHardBoundary(tele,j)) {
        const dt=tele[j].millis-tele[j-1].millis;
        if (!Number.isFinite(dt)||dt<=0||dt>2000) break;
        elapsed+=dt;
        j--;
    }
    if (!gpsValid(tele[j])) return Infinity;
    return haversineM(tele[j].lat,tele[j].lng,tele[i].lat,tele[i].lng);
}

function backByMs(tele,i,windowMs) {
    let j=i, elapsed=0;
    while (j>0 && elapsed<windowMs && !isHardBoundary(tele,j)) {
        const dt=tele[j].millis-tele[j-1].millis;
        if (!Number.isFinite(dt)||dt<=0||dt>2000) break;
        elapsed+=dt;
        j--;
    }
    return j;
}

function forwardWindow(tele,i,windowMs) {
    const inds=[i], base=tele[i].millis;
    for (let k=i+1;k<tele.length && k<i+120;k++) {
        if (isHardBoundary(tele,k)) break;
        const dt=tele[k].millis-base;
        if (!Number.isFinite(dt)||dt<0||dt>windowMs) break;
        inds.push(k);
    }
    return inds;
}

function confirmLapStart(tele,i) {
    const inds=forwardWindow(tele,i,CFG.START_CONFIRM_MS);
    if (inds.length<5) return false;
    let maxThr=0,maxCur=0,maxSpd=0,thrCount=0;
    for (const k of inds) {
        const d=tele[k];
        maxThr=Math.max(maxThr,d.throttle);
        maxCur=Math.max(maxCur,d.current);
        maxSpd=Math.max(maxSpd,d.speed);
        if (d.throttle>CFG.START_THROTTLE_PCT) thrCount++;
    }
    const primaryThrottle=maxThr>=10 && thrCount/inds.length>=0.25;
    const currentRise=maxCur>=Math.max(state.thresholds.driveCurrent, state.thresholds.idleCurrent+0.10);
    let gpsMove=false;
    const last=tele[inds[inds.length-1]];
    if (gpsValid(tele[i])&&gpsValid(last)) gpsMove=haversineM(tele[i].lat,tele[i].lng,last.lat,last.lng)>=1.0;
    const speedRise=maxSpd>=1.5;
    return primaryThrottle && currentRise && (speedRise||gpsMove);
}

function makeStartReference(tele,start,trigger) {
    const pts=[];
    for (let i=start;i<=trigger;i++) if (gpsValid(tele[i])) pts.push(tele[i]);
    if (!pts.length) return null;
    return {lat:median(pts.map(p=>p.lat)), lng:median(pts.map(p=>p.lng))};
}

function classifyPhase(tele,i,startIdx) {
    const d=tele[i];
    if (!d) return null;

    const driveCurrent=state.thresholds.driveCurrent;
    const glideCurrent=state.thresholds.glideCurrent;

    let j=i, recentMax=d.throttle, elapsed=0;
    while (j>startIdx && elapsed<1000 && !isHardBoundary(tele,j)) {
        recentMax=Math.max(recentMax,tele[j-1].throttle);
        const dt=tele[j].millis-tele[j-1].millis;
        if (!Number.isFinite(dt)||dt<=0||dt>2000) break;
        elapsed+=dt; j--;
    }
    const releasing=d.throttle<=2 || (recentMax-d.throttle)>=Math.max(3,recentMax*0.08);

    if (d.throttle>1 && d.current>driveCurrent && d.speed>CFG.PHASE_MIN_SPEED_KMH) return 'throttle';
    if (d.speed>CFG.GLIDE_MIN_SPEED_KMH && d.current<=glideCurrent && releasing) return 'glide';
    return null;
}

function buildPhases(tele,start,end) {
    const raw=[];
    let type=null, s=null;

    const closePhase=(e)=>{
        if (!type||s===null||e<s) return;
        raw.push({type,startIdx:s,endIdx:e});
        type=null; s=null;
    };

    for (let i=start;i<=end;i++) {
        const cls=classifyPhase(tele,i,start);
        if (cls===type) continue;
        if (type) closePhase(i-1);
        if (cls) { type=cls; s=i; }
    }
    if (type) closePhase(end);

    const enriched=raw.map(p=>({
        ...p,
        durationMs:elapsedMsBetween(tele,p.startIdx,p.endIdx),
        distance:distanceBetween(tele,p.startIdx,p.endIdx),
        energy:energyBetween(tele,p.startIdx,p.endIdx)
    })).filter(p=>p.durationMs>=CFG.PHASE_MIN_DURATION_MS);

    // Merge same phase separated only by a very short neutral/noise gap.
    const merged=[];
    for (const p of enriched) {
        const prev=merged[merged.length-1];
        if (prev && prev.type===p.type && elapsedMsBetween(tele,prev.endIdx,p.startIdx)<=CFG.PHASE_MERGE_GAP_MS) {
            prev.endIdx=p.endIdx;
            prev.durationMs=elapsedMsBetween(tele,prev.startIdx,prev.endIdx);
            prev.distance=distanceBetween(tele,prev.startIdx,prev.endIdx);
            prev.energy=energyBetween(tele,prev.startIdx,prev.endIdx);
        } else merged.push({...p});
    }

    return {
        throttle:merged.filter(p=>p.type==='throttle'),
        glide:merged.filter(p=>p.type==='glide')
    };
}

function createLapStats(tele,start,end,counter,meta={}) {
    const phases=buildPhases(tele,start,end);
    let maxSpeed=0,maxCurrent=0,maxPower=0;
    for (let i=start;i<=end;i++) {
        maxSpeed=Math.max(maxSpeed,tele[i].speed);
        maxCurrent=Math.max(maxCurrent,tele[i].current);
        maxPower=Math.max(maxPower,tele[i].power);
    }
    const lapEnergy=energyBetween(tele,start,end);
    const lapDistance=distanceBetween(tele,start,end);
    const lapTimeMs=elapsedMsBetween(tele,start,end);
    const sec=lapTimeMs/1000;
    const lapTime=lapTimeMs>0 ? `${Math.floor(sec/60)}:${(sec%60).toFixed(1).padStart(4,'0')}` : '--';
    const throttleEnergy=phases.throttle.reduce((a,p)=>a+p.energy,0);
    const glideDistance=phases.glide.reduce((a,p)=>a+p.distance,0);
    const glideEnergy=phases.glide.reduce((a,p)=>a+p.energy,0);
    const kmPerKwh=lapEnergy>0 ? lapDistance/(lapEnergy/1000) : 0;

    return {
        lapCounter:counter, lapTime, lapTimeMs, lapEnergy, lapDistance, kmPerKwh,
        throttleEnergy, glideDistance, glideEnergy, phases,
        maxSpeed,maxCurrent,maxPower,startIdx:start,endIdx:end,
        startTriggerIdx:meta.startTriggerIdx ?? start,
        endQuality:meta.endQuality || 'strict'
    };
}

function detectLaps(tele) {
    if (!tele||tele.length<10) return [];
    const laps=[];
    let i=0, counter=1;

    while (i<tele.length) {
        const crossing=tele[i].throttle>CFG.START_THROTTLE_PCT &&
            (i===0 || tele[i-1].throttle<=CFG.START_THROTTLE_PCT || isHardBoundary(tele,i));

        if (!crossing || !confirmLapStart(tele,i)) { i++; continue; }

        const trigger=i;
        const start=backByMs(tele,trigger,CFG.START_SPARE_MS);
        const ref=makeStartReference(tele,start,trigger);
        let strictEnd=null, stable=0, firstStable=null;
        let boundaryEnd=null;

        for (let k=trigger+1;k<tele.length;k++) {
            if (isHardBoundary(tele,k)) { boundaryEnd=k-1; break; }
            boundaryEnd=k;

            const t=elapsedMsBetween(tele,start,k)/1000;
            const dist=distanceBetween(tele,start,k);
            const near=ref && gpsValid(tele[k]) ? haversineM(ref.lat,ref.lng,tele[k].lat,tele[k].lng) : Infinity;
            const gpsStill=gpsMovementBack(tele,k,1000)<=CFG.END_GPS_MOVE_M;

            const endCond=
                t>=CFG.MIN_LAP_TIME_S &&
                dist>=CFG.MIN_LAP_DISTANCE_KM &&
                tele[k].throttle<=1 &&
                tele[k].speed<=CFG.END_SPEED_KMH &&
                tele[k].current<=state.thresholds.glideCurrent &&
                near<=CFG.END_NEAR_START_M &&
                gpsStill;

            if (endCond) {
                if (stable===0) firstStable=k;
                stable++;
            } else {
                stable=0; firstStable=null;
            }

            if (stable>=CFG.END_STABLE_SAMPLES) {
                strictEnd=firstStable;
                break;
            }
        }

        let end=strictEnd, endQuality='strict';

        // If recording/reset happens just before the car fully stops, keep a completed
        // closed-loop lap only when distance + start-area + electrical idle still agree.
        if (end===null && boundaryEnd!==null && boundaryEnd>start) {
            const dist=distanceBetween(tele,start,boundaryEnd);
            const near=ref && gpsValid(tele[boundaryEnd]) ? haversineM(ref.lat,ref.lng,tele[boundaryEnd].lat,tele[boundaryEnd].lng) : Infinity;
            const electricallyIdle=tele[boundaryEnd].throttle<=1 && tele[boundaryEnd].current<=state.thresholds.glideCurrent;
            if (dist>=1.10 && dist<=1.80 && near<=60 && electricallyIdle) {
                end=boundaryEnd;
                endQuality='boundary';
            }
        }

        if (end!==null) {
            laps.push(createLapStats(tele,start,end,counter,{startTriggerIdx:trigger,endQuality}));
            counter++;
            i=end+1;
        } else {
            // INVALID / INCOMPLETE RUN:
            // jangan pernah digabung ke lap valid berikutnya. Buang seluruh candidate
            // sampai hard boundary, lalu mulai pencarian lap baru dari data sesudahnya.
            if (boundaryEnd!==null && boundaryEnd>i) i=boundaryEnd+1;
            else i++;
        }
    }
    return laps;
}


const tele=prepareTelemetry(JSON.parse(fs.readFileSync(__dirname+'/raw.json','utf8')));const laps=detectLaps(tele);fs.writeFileSync(__dirname+'/detected.json',JSON.stringify({thresholds:state.thresholds,laps},null,2));console.log(JSON.stringify({count:laps.length,thresholds:state.thresholds}));