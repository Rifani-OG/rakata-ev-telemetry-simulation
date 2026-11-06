const fs=require('fs');const root=__dirname;
let s=fs.readFileSync(root+'/app.js','utf8');
s=s.replace("finish ≤${FINISH_MAX} km/jam, ≤'+TL","finish ≤'+FINISH_MAX+' km/jam, ≤'+TL");
s=s.replace("'Galat waktu uji TD10 rata-rata 7,37 s dan energi 0,22 Wh.'","(window.TD12_ACTIVE?'Kalibrasi TD12; rincian galat uji ada pada TD12_TRAINING_REPORT.json.':'Galat waktu uji TD10 rata-rata 7,37 s dan energi 0,22 Wh.')");
s=s.replace("$('strategy-select').value=index;showView", "$('strategy-select').value=window.TD12_ACTIVE?0:index;showView");
s=s.replace("'manual vs rekomendasi TD10'", "'manual vs acuan model'");
fs.writeFileSync(root+'/app.js',s);
// Keep historical texts intact under the old model; mark archives in the TD12 UI.
let r=fs.readFileSync(root+'/td12-runtime.js','utf8');
r=r.replace("const desc=", "$('try-main').textContent='Jalankan profil TD12 3 throttle';$('try-three').textContent='Jalankan profil TD12 3 throttle';document.querySelector('#manual-comparison h2').textContent='Manual vs model TD12';\n+ const desc=".replace('\n+','\n'));
fs.writeFileSync(root+'/td12-runtime.js',r);
