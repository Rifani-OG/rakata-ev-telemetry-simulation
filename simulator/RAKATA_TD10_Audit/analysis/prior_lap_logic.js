
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

function getLapInfoHTML(lap,colorClass) {
    if (!lap) return '<div class="lap-info-grid"><div class="row">Tidak ada data</div></div>';
    const eff=lap.kmPerKwh>0 ? lap.kmPerKwh.toFixed(2) : '—';
    const title=lap.lapCounter==='All' ? 'All Data' : `Lap #${lap.lapCounter}`;
    const quality=lap.endQuality==='boundary' ? ' • END dari boundary log' : '';

    let html=`
        <div class="cmp-lap-title" style="color:${colorClass||'var(--accent)'}">${title} — <span style="color:var(--text);font-weight:600;">${lap.lapTime||'--:--'}${quality}</span></div>
        <div class="lap-info-grid">
            <div class="row"><span>Total Distance</span><strong>${(lap.lapDistance||0).toFixed(3)} km</strong></div>
            <div class="row"><span>Total Energy</span><strong>${(lap.lapEnergy||0).toFixed(3)} Wh</strong></div>
            <div class="row"><span>Efficiency</span><strong class="highlight">${eff} km/kWh</strong></div>
            <div class="row"><span>Max Speed</span><strong style="color:var(--accent)">${(lap.maxSpeed||0).toFixed(1)} km/h</strong></div>
            <div class="row"><span>Max Current</span><strong style="color:var(--red)">${(lap.maxCurrent||0).toFixed(2)} A</strong></div>
            <div class="row"><span>Max Power</span><strong>${(lap.maxPower||0).toFixed(0)} W</strong></div>
            <div class="row"><span>Gliding Distance</span><strong style="color:var(--blue)">${(lap.glideDistance||0).toFixed(3)} km</strong></div>
            <div class="row"><span>Idle Current</span><strong>${state.thresholds.idleCurrent.toFixed(3)} A</strong></div>
        </div>`;

    if (lap.phases) {
        let th=`<div class="phase-col"><div class="phase-header" style="color:var(--amber)">THROTTLING PHASE</div>`;
        lap.phases.throttle.forEach((p,n)=>{
            th+=`<div class="phase-card"><div class="phase-card-title" style="color:var(--amber)">THROTTLE ${n+1}</div>
                <div class="phase-card-body">
                    <span>Energy: <strong>${p.energy.toFixed(4)} Wh</strong></span>
                    <span>Time: <strong>${(p.durationMs/1000).toFixed(1)} s</strong></span>
                    <span>Dist: <strong>${(p.distance*1000).toFixed(1)} m</strong></span>
                </div></div>`;
        });
        th+=lap.phases.throttle.length?'':`<div class="phase-card-body">Tidak ada data</div>`;
        th+='</div>';

        let gl=`<div class="phase-col"><div class="phase-header" style="color:var(--blue)">GLIDING PHASE</div>`;
        lap.phases.glide.forEach((p,n)=>{
            gl+=`<div class="phase-card"><div class="phase-card-title" style="color:var(--blue)">GLIDING ${n+1}</div>
                <div class="phase-card-body">
                    <span>Energy: <strong>${p.energy.toFixed(4)} Wh</strong></span>
                    <span>Time: <strong>${(p.durationMs/1000).toFixed(1)} s</strong></span>
                    <span>Dist: <strong>${(p.distance*1000).toFixed(1)} m</strong></span>
                </div></div>`;
        });
        gl+=lap.phases.glide.length?'':`<div class="phase-card-body">Tidak ada data</div>`;
        gl+='</div>';
        html+=`<div class="phase-list">${th}${gl}</div>`;
    }
    return html;
}

function getVisibleBounds() {
    if (state.currentLapIdx>=0 && state.laps[state.currentLapIdx]) {
        const l=state.laps[state.currentLapIdx];
        return [l.startIdx,l.endIdx];
    }
    return [0,Math.max(0,state.telemetry.length-1)];
}

function getVisibleData() {
    const [a,b]=getVisibleBounds();
    return state.telemetry.slice(a,b+1);
}

function buildMapLayers() {
    thrLyrs.forEach(l=>map.removeLayer(l)); thrLyrs=[];
    if (routeLyr) { map.removeLayer(routeLyr); routeLyr=null; }
    if (carMkr) { map.removeLayer(carMkr); carMkr=null; }

    const [a,b]=getVisibleBounds();
    const pts=[];
    for (let i=a;i<=b;i++) if (gpsValid(state.telemetry[i])) pts.push({d:state.telemetry[i],idx:i});

    if (!pts.length) {
        document.getElementById('map-empty').style.display='flex';
        return;
    }
    document.getElementById('map-empty').style.display='none';

    const coords=pts.map(p=>[p.d.lat,p.d.lng]);
    if (state.layerOn.route) routeLyr=L.polyline(coords,{color:'#1a3050',weight:5,opacity:.6}).addTo(map);

    if (state.layerOn.thr) {
        let segPts=[[pts[0].d.lat,pts[0].d.lng]], bucket=Math.floor(pts[0].d.throttle/5);
        const flush=()=>{
            if (segPts.length<2) return;
            thrLyrs.push(L.polyline(segPts,{color:thrColor(bucket*5),weight:4,opacity:.92,lineCap:'round',lineJoin:'round'}).addTo(map));
        };
        for (let j=1;j<pts.length;j++) {
            const nb=Math.floor(pts[j].d.throttle/5);
            if (nb!==bucket) {
                segPts.push([pts[j].d.lat,pts[j].d.lng]); flush();
                segPts=[[pts[j-1].d.lat,pts[j-1].d.lng],[pts[j].d.lat,pts[j].d.lng]];
                bucket=nb;
            } else segPts.push([pts[j].d.lat,pts[j].d.lng]);
        }
        flush();
    }

    carMkr=L.marker(coords[0],{
        icon:L.divIcon({className:'',html:'<div class="car-dot" id="car-dot"></div>',iconSize:[14,14],iconAnchor:[7,7]}),
        zIndexOffset:2000
    }).addTo(map);
    carMkr.bindTooltip('',{permanent:true,direction:'top',offset:[0,-8],className:'telemetry-tip'});
    map.fitBounds(L.latLngBounds(coords).pad(.08));
}

function lapEnergyAt(idx) {
    if (state.currentLapIdx>=0 && state.laps[state.currentLapIdx]) {
        return energyBetween(state.telemetry,state.laps[state.currentLapIdx].startIdx,idx);
    }
    const [a]=getVisibleBounds();
    return energyBetween(state.telemetry,a,idx);
}

function lapDistanceAt(idx) {
    if (state.currentLapIdx>=0 && state.laps[state.currentLapIdx]) {
        return distanceBetween(state.telemetry,state.laps[state.currentLapIdx].startIdx,idx);
    }
    const [a]=getVisibleBounds();
    return distanceBetween(state.telemetry,a,idx);
}

function seekTo(i) {
    const data=state.telemetry;
    if (!data.length) return;
    const [lo,hi]=getVisibleBounds();
    state.ridx=Math.max(lo,Math.min(i,hi));
    const d=data[state.ridx];
    const e=lapEnergyAt(state.ridx), dst=lapDistanceAt(state.ridx);

    if (carMkr && gpsValid(d)) {
        carMkr.setLatLng([d.lat,d.lng]);
        const tip=`SPD ${d.speed.toFixed(1)} km/h<br>THR ${d.throttle.toFixed(0)}% | I ${d.current.toFixed(2)} A<br>P ${d.power.toFixed(0)} W | E ${e.toFixed(3)} Wh`;
        carMkr.setTooltipContent(tip);
    }
    const dot=document.getElementById('car-dot');
    if (dot) {
        const c=thrColor(d.throttle);
        dot.style.background=c; dot.style.boxShadow=`0 0 10px ${c}`;
    }

    $('sv-spd',d.speed.toFixed(2));
    $('sv-thr',d.throttle.toFixed(0));
    $('sv-cur',d.current.toFixed(2));
    $('sv-vlt',d.voltage.toFixed(1));
    $('sv-pwr',d.power.toFixed(1));
    $('sv-nrg',e.toFixed(4));
    $('sv-dst',dst.toFixed(3));

    $('sync-values',`SPD ${d.speed.toFixed(1)} | THR ${d.throttle.toFixed(0)}% | I ${d.current.toFixed(2)}A | P ${d.power.toFixed(0)}W | E ${e.toFixed(3)}Wh | D ${dst.toFixed(3)}km`);

    const bar=document.getElementById('tbar');
    bar.style.width=Math.max(0,Math.min(100,d.throttle))+'%';
    bar.style.background=thrColor(d.throttle);
    document.getElementById('slider').value=state.ridx;

    updateLapInfo();
    updateChartTrackers();
}

function $(id,v) {
    const e=document.getElementById(id);
    if (e) e.textContent=v;
}

function updateLapInfo() {
    let lap=(state.currentLapIdx>=0&&state.laps[state.currentLapIdx]) ? state.laps[state.currentLapIdx] : null;
    if (!lap && state.telemetry.length) {
        lap=createLapStats(state.telemetry,0,state.telemetry.length-1,'All',{endQuality:'all'});
    }
    document.getElementById('lap-info-single').innerHTML=getLapInfoHTML(lap,'var(--accent)');
}

function updateLapSelector() {
    const sel=document.getElementById('lap-sel');
    sel.innerHTML='<option value="-1">⊗ All Data</option>';
    const cmpA=document.getElementById('cmp-a'), cmpB=document.getElementById('cmp-b');
    const oldA=cmpA.value, oldB=cmpB.value;
    cmpA.innerHTML=''; cmpB.innerHTML='';

    state.laps.forEach((l,i)=>{
        const mark=l.endQuality==='boundary'?'*':'';
        const txt=`Lap #${l.lapCounter}${mark} (${l.lapTime})`;
        sel.appendChild(new Option(txt,i));
        cmpA.appendChild(new Option(txt,i));
        cmpB.appendChild(new Option(txt,i));
    });

    sel.value=state.currentLapIdx;
    if (state.laps.length) {
        cmpA.value=(oldA!==''&&state.laps[+oldA])?oldA:0;
        cmpB.value=(oldB!==''&&state.laps[+oldB])?oldB:(state.laps.length>1?1:0);
    }

    document.getElementById('hdr-lap-badge').textContent=`Lap: ${state.laps.length}`;
}

function goToLap(idx) {
    if (idx<-1||idx>=state.laps.length) return;
    state.currentLapIdx=idx;
    if (state.playing) togglePlay();

    const [a,b]=getVisibleBounds();
    const slider=document.getElementById('slider');
    slider.min=a; slider.max=b; slider.value=a;

    buildMapLayers();
    buildChart();
    updateLapSelector();
    seekTo(a);
}

function togglePlay() {
    if (state.playing) {
        state.playing=false; clearInterval(state.timer);
        document.getElementById('btn-play').textContent='▶';
        return;
    }
    const [b,e]=getVisibleBounds();
    if (state.ridx>=e||state.ridx<b) state.ridx=b;
    state.playing=true;
    document.getElementById('btn-play').textContent='⏸';

    const tick=Math.max(16,Math.round(80/state.speed));
    const step=Math.max(1,Math.round(state.speed*tick/100));
    state.timer=setInterval(()=>{
        const next=state.ridx+step;
        if (next>=e) { togglePlay(); seekTo(e); return; }
        seekTo(next);
    },tick);
}

function resetReplay() {
    if (state.playing) togglePlay();
    seekTo(getVisibleBounds()[0]);
}
function setSpeed(v) { state.speed=v; if (state.playing) { togglePlay(); togglePlay(); } }
function onSlider(v) { if (state.playing) togglePlay(); seekTo(v); }
function toggleLayer(k,b) { state.layerOn[k]=!state.layerOn[k]; b.classList.toggle('on',state.layerOn[k]); buildMapLayers(); seekTo(state.ridx); }
function showUpload() { document.getElementById('ovl').classList.add('show'); }
function hideUpload() { document.getElementById('ovl').classList.remove('show'); }

function toggleChartView() {
    const app=document.getElementById('app'), btn=document.getElementById('btn-toggle-chart');
    app.classList.toggle('hide-chart');
    btn.innerHTML=app.classList.contains('hide-chart')?'📊 Tampilkan Grafik':'📊 Sembunyikan Grafik';
    setTimeout(()=>{ if (map) map.invalidateSize(); },350);
}

function setMode(m,el) {
    state.chartMode=m;
    document.querySelectorAll('.ch-tab').forEach(t=>t.classList.remove('on'));
    el.classList.add('on');

    const isCompare=m==='compare';
    document.getElementById('cmp-ctrl').style.display=isCompare?'flex':'none';
    document.getElementById('ch-single').style.display=isCompare?'none':'block';
    document.getElementById('ch-compare').style.display=isCompare?'flex':'none';
    document.getElementById('side-single-view').style.display=isCompare?'none':'flex';
    document.getElementById('side-compare-view').style.display=isCompare?'grid':'none';

    if (isCompare && state.currentLapIdx<0 && state.laps.length) {
        state.currentLapIdx=parseInt(document.getElementById('cmp-a').value)||0;
        const [a,b]=getVisibleBounds();
        const s=document.getElementById('slider'); s.min=a; s.max=b;
        buildMapLayers(); updateLapSelector(); state.ridx=a;
    }
    buildChart();
    seekTo(state.ridx);
}

function onCompareChange() {
    const a=parseInt(document.getElementById('cmp-a').value);
    const b=parseInt(document.getElementById('cmp-b').value);
    if (state.chartMode==='compare' && state.currentLapIdx!==a && state.currentLapIdx!==b && state.laps[a]) {
        state.currentLapIdx=a;
        const [lo,hi]=getVisibleBounds();
        const s=document.getElementById('slider'); s.min=lo; s.max=hi; state.ridx=lo;
        buildMapLayers(); updateLapSelector();
    }
    buildChart(); seekTo(state.ridx);
}

const syncTrackerPlugin={
    id:'syncTracker',
    afterDatasetsDraw(c) {
        if (!c.$trackerResolver) return;
        const tr=c.$trackerResolver();
        if (!tr || !Number.isFinite(tr.x) || !c.scales.x) return;
        const x=c.scales.x.getPixelForValue(tr.x);
        if (!Number.isFinite(x)||x<c.chartArea.left||x>c.chartArea.right) return;
        const ctx=c.ctx;
        ctx.save();
        ctx.strokeStyle='rgba(255,255,255,.75)';
        ctx.lineWidth=1;
        ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(x,c.chartArea.top); ctx.lineTo(x,c.chartArea.bottom); ctx.stroke();
        ctx.setLineDash([]);
        for (const p of (tr.points||[])) {
            const ys=c.scales[p.axis||'yL'];
            if (!ys||!Number.isFinite(p.y)) continue;
            const y=ys.getPixelForValue(p.y);
            if (!Number.isFinite(y)||y<c.chartArea.top||y>c.chartArea.bottom) continue;
            ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2);
            ctx.fillStyle=p.color||'#fff'; ctx.fill();
            ctx.strokeStyle='#07090f'; ctx.lineWidth=1; ctx.stroke();
        }
        ctx.restore();
    }
};
Chart.register(syncTrackerPlugin);

function sampledIndices(a,b,maxPoints=3000) {
    const len=Math.max(0,b-a+1), step=Math.max(1,Math.floor(len/maxPoints));
    const out=[];
    for (let i=a;i<=b;i+=step) out.push(i);
    if (out[out.length-1]!==b) out.push(b);
    return out;
}

function formatElapsedIdx(idx,startIdx) {
    const ms=elapsedMsBetween(state.telemetry,startIdx,Math.round(idx));
    const s=Math.max(0,ms/1000), m=Math.floor(s/60);
    return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

function baseScales(startIdx) {
    return {
        x:{
            type:'linear',
            ticks:{color:'#2a4060',font:{size:9},maxRotation:0,callback:(v)=>formatElapsedIdx(v,startIdx)},
            grid:{color:'#0d1620'},
            title:{display:true,text:'Lap Time',color:'#4e6685',font:{size:10}}
        },
        yDrive:{type:'linear',position:'left',ticks:{color:'#2a4060',font:{size:9}},grid:{color:'#0d1620'},title:{display:true,text:'Speed / Current / Voltage',color:'#4e6685',font:{size:9}}},
        yPct:{type:'linear',position:'right',min:0,max:100,display:false,grid:{drawOnChartArea:false}},
        yPower:{type:'linear',position:'right',ticks:{color:'#2a4060',font:{size:9}},grid:{drawOnChartArea:false},title:{display:true,text:'Power (W)',color:'#4e6685',font:{size:9}}},
        yEnergy:{type:'linear',position:'left',display:false,grid:{drawOnChartArea:false}}
    };
}

function buildStandardChart() {
    const [a,b]=getVisibleBounds();
    if (b<a) return;
    const inds=sampledIndices(a,b,3000);
    const mode=state.chartMode;
    const sets=[];

    const ds=(label,axis,color,fn)=>({
        label,yAxisID:axis,data:inds.map(i=>({x:i,y:fn(i)})),
        borderColor:color,borderWidth:1.5,pointRadius:0,tension:0
    });

    if (mode==='overview') {
        sets.push(ds('Speed','yDrive','#00d4a8',i=>state.telemetry[i].speed));
        sets.push(ds('Current','yDrive','#f04060',i=>state.telemetry[i].current));
        sets.push(ds('Throttle','yPct','#f5a623',i=>state.telemetry[i].throttle));
        sets.push(ds('Power','yPower','#a37af4',i=>state.telemetry[i].power));
        sets.push(ds('Energy','yEnergy','#3b91f7',i=>energyBetween(state.telemetry,a,i)));
    } else {
        sets.push(ds('Current','yDrive','#3b91f7',i=>state.telemetry[i].current));
        sets.push(ds('Voltage','yDrive','#a37af4',i=>state.telemetry[i].voltage));
        sets.push(ds('Power','yPower','#f04060',i=>state.telemetry[i].power));
        sets.push(ds('Energy','yEnergy','#00d4a8',i=>energyBetween(state.telemetry,a,i)));
    }

    chart=new Chart(document.getElementById('ch'),{
        type:'line',data:{datasets:sets},
        options:{
            animation:false,responsive:true,maintainAspectRatio:false,parsing:false,
            interaction:{mode:'nearest',intersect:false},
            plugins:{legend:{labels:{color:'#4e6685',font:{size:10}},position:'top'}},
            scales:baseScales(a)
        }
    });

    chart.$trackerResolver=()=>{
        const i=state.ridx;
        if (i<a||i>b) return null;
        const d=state.telemetry[i], e=energyBetween(state.telemetry,a,i);
        const pts=mode==='overview' ? [
            {y:d.speed,axis:'yDrive',color:'#00d4a8'},
            {y:d.current,axis:'yDrive',color:'#f04060'},
            {y:d.throttle,axis:'yPct',color:'#f5a623'},
            {y:d.power,axis:'yPower',color:'#a37af4'},
            {y:e,axis:'yEnergy',color:'#3b91f7'}
        ] : [
            {y:d.current,axis:'yDrive',color:'#3b91f7'},
            {y:d.voltage,axis:'yDrive',color:'#a37af4'},
            {y:d.power,axis:'yPower',color:'#f04060'},
            {y:e,axis:'yEnergy',color:'#00d4a8'}
        ];
        return {x:i,points:pts};
    };
}

function relativeDistance(lap,idx) {
    return distanceBetween(state.telemetry,lap.startIdx,Math.max(lap.startIdx,Math.min(idx,lap.endIdx)));
}

function nearestIndexAtDistance(lap,target) {
    let lo=lap.startIdx, hi=lap.endIdx;
    while (lo<hi) {
        const mid=Math.floor((lo+hi)/2);
        if (relativeDistance(lap,mid)<target) lo=mid+1;
        else hi=mid;
    }
    if (lo>lap.startIdx) {
        const a=relativeDistance(lap,lo-1), b=relativeDistance(lap,lo);
        if (Math.abs(a-target)<Math.abs(b-target)) return lo-1;
    }
    return lo;
}

function compareDataset(lap,label,color,dashed,fn) {
    const inds=sampledIndices(lap.startIdx,lap.endIdx,1200);
    return {
        label,data:inds.map(i=>({x:relativeDistance(lap,i),y:fn(i,lap)})),
        borderColor:color,borderWidth:1.5,borderDash:dashed?[5,4]:undefined,
        pointRadius:0,tension:0,parsing:false
    };
}

function renderCompareChart(canvasId,title,yTitle,lapA,lapB,fn) {
    const sets=[
        compareDataset(lapA,`Lap #${lapA.lapCounter}`,'#00d4a8',false,fn),
        compareDataset(lapB,`Lap #${lapB.lapCounter}`,'#007a61',true,fn)
    ];
    const c=new Chart(document.getElementById(canvasId),{
        type:'line',data:{datasets:sets},
        options:{
            animation:false,responsive:true,maintainAspectRatio:false,parsing:false,
            interaction:{mode:'nearest',intersect:false},
            plugins:{
                title:{display:true,text:title,color:'#ccd6e8',font:{size:11},padding:{top:2,bottom:2}},
                legend:{labels:{color:'#4e6685',font:{size:9},boxWidth:12},position:'top'}
            },
            scales:{
                x:{type:'linear',ticks:{color:'#2a4060',font:{size:9}},grid:{color:'#0d1620'},title:{display:true,text:'Distance (km)',color:'#4e6685',font:{size:10}}},
                yL:{type:'linear',position:'left',ticks:{color:'#2a4060',font:{size:9}},grid:{color:'#0d1620'},title:{display:true,text:yTitle,color:'#4e6685',font:{size:10}}}
            }
        }
    });
    c.$trackerResolver=()=>{
        const activeLap=(state.currentLapIdx>=0&&state.laps[state.currentLapIdx])?state.laps[state.currentLapIdx]:lapA;
        if (state.ridx<activeLap.startIdx||state.ridx>activeLap.endIdx) return null;
        const x=relativeDistance(activeLap,state.ridx);
        const ia=nearestIndexAtDistance(lapA,x), ib=nearestIndexAtDistance(lapB,x);
        return {
            x,
            points:[
                {y:fn(ia,lapA),axis:'yL',color:'#00d4a8'},
                {y:fn(ib,lapB),axis:'yL',color:'#007a61'}
            ]
        };
    };
    return c;
}

function destroyCharts() {
    [chart,chartCmpSpeed,chartCmpCur,chartCmpThr,chartCmpPower,chartCmpEnergy].forEach(c=>{if(c)c.destroy();});
    chart=chartCmpSpeed=chartCmpCur=chartCmpThr=chartCmpPower=chartCmpEnergy=null;
}

function buildChart() {
    destroyCharts();
    const notice=document.getElementById('ch-notice');
    notice.classList.remove('show');

    if (!state.telemetry.length) { notice.classList.add('show'); return; }

    if (state.chartMode!=='compare') {
        buildStandardChart();
        return;
    }

    const ia=parseInt(document.getElementById('cmp-a').value);
    const ib=parseInt(document.getElementById('cmp-b').value);
    if (!state.laps[ia]||!state.laps[ib]) { notice.classList.add('show'); return; }

    const A=state.laps[ia], B=state.laps[ib];
    chartCmpSpeed=renderCompareChart('ch-cmp-speed','SPEED COMPARISON','Speed (km/h)',A,B,(i)=>state.telemetry[i].speed);
    chartCmpCur=renderCompareChart('ch-cmp-cur','CURRENT COMPARISON','Current (A)',A,B,(i)=>state.telemetry[i].current);
    chartCmpThr=renderCompareChart('ch-cmp-thr','THROTTLE COMPARISON','Throttle (%)',A,B,(i)=>state.telemetry[i].throttle);
    chartCmpPower=renderCompareChart('ch-cmp-power','POWER COMPARISON','Power (W)',A,B,(i)=>state.telemetry[i].power);
    chartCmpEnergy=renderCompareChart('ch-cmp-energy','ENERGY COMPARISON','Energy Used (Wh)',A,B,(i,lap)=>energyBetween(state.telemetry,lap.startIdx,i));

    document.getElementById('lap-info-a').innerHTML=getLapInfoHTML(A,'#00d4a8');
    document.getElementById('lap-info-b').innerHTML=getLapInfoHTML(B,'#007a61');
}

function updateChartTrackers() {
    [chart,chartCmpSpeed,chartCmpCur,chartCmpThr,chartCmpPower,chartCmpEnergy].forEach(c=>{
        if (c) c.update('none');
    });
}

function exportWeb() {
    if (!state.telemetry.length) return alert('Tidak ada data yang bisa diekspor!');
    const doc=document.implementation.createHTMLDocument('Telemetry Standalone');
    doc.documentElement.innerHTML=document.documentElement.innerHTML;

    const mapWrap=doc.getElementById('map-wrap');
    if (mapWrap) mapWrap.innerHTML=`
        <div id="map"></div>
        <div id="map-ctrl">
            <button class="m-btn on" id="btn-thr" onclick="toggleLayer('thr',this)">Throttle</button>
            <button class="m-btn on" id="btn-route" onclick="toggleLayer('route',this)">Route</button>
        </div>
        <div id="leg"><div class="leg-title">Throttle</div><div class="leg-bar"></div><div class="leg-labels"><span>0%</span><span>100%</span></div></div>
        <div id="map-empty" style="display:none;"></div>`;

    const chArea=doc.getElementById('ch-area');
    if (chArea) chArea.innerHTML=`
        <div id="ch-single" style="width:100%;height:200px;position:relative;"><canvas id="ch"></canvas></div>
        <div id="ch-compare" style="display:none;width:100%;flex-direction:column;gap:16px;">
            <div class="ch-cmp-box"><canvas id="ch-cmp-speed"></canvas></div>
            <div class="ch-cmp-box"><canvas id="ch-cmp-cur"></canvas></div>
            <div class="ch-cmp-box"><canvas id="ch-cmp-thr"></canvas></div>
            <div class="ch-cmp-box"><canvas id="ch-cmp-power"></canvas></div>
            <div class="ch-cmp-box"><canvas id="ch-cmp-energy"></canvas></div>
        </div>
        <div id="ch-notice"><strong>⚠ Invalid / No Lap Data</strong></div>`;

    const bu=doc.getElementById('btn-upload'); if (bu) bu.style.display='none';
    const be=doc.getElementById('btn-export'); if (be) be.style.display='none';

    const dataScript=doc.createElement('script');
    dataScript.textContent=`window.PRELOADED_DATA=${JSON.stringify(state.telemetry)};`;
    doc.head.appendChild(dataScript);

    const blob=new Blob(['<!DOCTYPE html>\n<html lang="id">\n'+doc.documentElement.innerHTML+'\n</html>'],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=`Telemetry_Web_${Date.now()}.html`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function loadFiles(files) {
    let dataRows=null;
    for (const f of files) {
        if (f.name.toLowerCase().endsWith('.xlsx')) {
            const b=await f.arrayBuffer(), w=XLSX.read(b,{type:'array'});
            const r=XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{header:1});
            if (r.length) dataRows=(r[0].length===1&&typeof r[0][0]==='string'&&r[0][0].includes(',')) ? r.map(x=>x[0].split(',')) : r;
        } else if (f.name.toLowerCase().endsWith('.csv')) {
            const p=Papa.parse(await f.text(),{header:false,skipEmptyLines:true});
            if (p.data.length) dataRows=p.data;
        }
        if (dataRows) break;
    }
    if (!dataRows) return alert('File kosong / format tidak sesuai.');

    try {
        const tele=prepareTelemetry(parseDataArray(dataRows));
        state.telemetry=tele;
        state.laps=detectLaps(tele);

        document.getElementById('hdr-status').textContent=
            `${tele.length.toLocaleString()} samples • ${state.laps.length} lap • idle ${state.thresholds.idleCurrent.toFixed(3)} A`;
        document.getElementById('hdr-pts').textContent=`${tele.length.toLocaleString()} pts`;
        document.getElementById('btn-export').style.display='inline-block';

        updateLapSelector();
        goToLap(-1);
        hideUpload();
    } catch (err) {
        console.error(err);
        alert('Error: '+err.message);
    }
}

initMap();

if (window.PRELOADED_DATA) {
    state.telemetry=prepareTelemetry(window.PRELOADED_DATA);
    state.laps=detectLaps(state.telemetry);
    document.getElementById('btn-upload').style.display='none';
    document.getElementById('btn-export').style.display='none';
    document.getElementById('hdr-status').textContent=
        `${state.telemetry.length.toLocaleString()} samples • ${state.laps.length} lap • idle ${state.thresholds.idleCurrent.toFixed(3)} A`;
    updateLapSelector();
    goToLap(-1);
} else {
    setTimeout(showUpload,400);
}

window.prevLap=()=>goToLap(Math.max(-1,state.currentLapIdx-1));
window.nextLap=()=>goToLap(Math.min(state.laps.length-1,state.currentLapIdx+1));
window.resetLapView=()=>goToLap(-1);
window.onCompareChange=onCompareChange;
