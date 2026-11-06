// One-time mechanical integration of the extension into the V3 source.
const fs=require('fs'),p=require('path');const root=__dirname;
function edit(file,fn){const name=p.join(root,file);fs.writeFileSync(name,fn(fs.readFileSync(name,'utf8')));}
edit('index.html',s=>s.replace('<script src="app.js">','<script src="td12-data.js"></script><script src="td12-runtime.js"></script><script src="app.js">').replaceAll('3:40','3:45'));
edit('app.js',s=>s.replace("TL=UNEJ?'4:10':'3:40'","TL=UNEJ?'4:10':(window.TD12_ACTIVE?'3:45':'3:40'),FINISH_MAX=window.TD12_ACTIVE?35.3:3")
 .replace("'rakata.v4.1.'","(window.TD12_ACTIVE?'rakata.td12.v1.':'rakata.v4.1.')")
 .replace("'rakata.driver.leaderboard.v1'","'rakata.driver.leaderboard.'+(window.TD12_ACTIVE?'td12.v1':'v1')")
 .replaceAll('x.rows.at(-1)[2]<=3','x.rows.at(-1)[2]<=FINISH_MAX')
 .replaceAll('st.v*3.6<=3','st.v*3.6<=FINISH_MAX')
 .replaceAll("true,+$('rate').value,LIMIT)","true,+$('rate').value,LIMIT,FINISH_MAX)")
 .replaceAll('finish_speed:st.v*3.6,','finish_speed:st.v*3.6,finish_limit:FINISH_MAX,')
 .replace("$('lap-select').value='4'","$('lap-select').value=window.TD12_ACTIVE?'0':'4'")
 .replaceAll("e.target.type==='file'","e.target.type==='file'||e.target.tagName==='INPUT'&&e.target.type==='text'")
 .replaceAll("'Rekomendasi TD10'","(window.TD12_ACTIVE?'Acuan model TD12':'Rekomendasi TD10')")
 .replaceAll("'Replay TD10'","'Replay lapangan'")
 .replaceAll('input throttle berasal dari TD10.','input throttle berasal dari lap yang dipilih.')
 .replaceAll('finish ≤3 km/jam','finish ≤${FINISH_MAX} km/jam')
 .replaceAll("≤3 km/jam, ≤'+TL","≤'+FINISH_MAX+' km/jam, ≤'+TL")
 .replace("'V akhir ≤3 km/jam.'","'Finish melintas '+f(st.v*3.6)+' km/jam.'")
 .replace("meta.quality==='strict'?'memenuhi ambang sensor':'boundary logger'","meta.field_valid?'valid lapangan (konfirmasi pengguna)':meta.quality==='strict'?'memenuhi ambang sensor':'boundary logger'")
 .replace("l.quality==='strict'?'Ambang sensor':'Boundary log'","l.field_valid?'Valid lapangan':l.quality==='strict'?'Ambang sensor':'Boundary log'")
 .replace("$('driver-name').value=localStorage.getItem('rakata.driver.name')||'';","try{$('driver-name').value=localStorage.getItem('rakata.driver.name')||'';}catch{}")
 );
edit('driving.js',s=>s.replace('targetTime=220){','targetTime=220,finishLimit=3){').replace('st.v*3.6<=3&&','st.v*3.6<=finishLimit&&'));
edit('training.js',s=>s.replace('man.finish_speed>3','man.finish_speed>(man.finish_limit||3)'));
console.log('TD12 integrated; legacy engine and UNEJ attempt files preserved.');
