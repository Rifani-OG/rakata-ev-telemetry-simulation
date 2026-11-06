/* TD12 extension. Old TD10/UNEJ engines and replay assets stay available. */
(()=>{'use strict';
 const q=new URLSearchParams(location.search),active=q.get('track')!=='unej'&&q.get('dataset')!=='td10';
 window.TD12_ACTIVE=active;
 if(!active)return;
 const old=window.RAKATA_DATA,d=window.RAKATA_TD12,E=window.RakataEngine;
 d.laps=d.laps.concat(old.laps);d.traces=d.traces.concat(old.traces);
 d.strategies.sort((a,b)=>Number(b.pulses===3)-Number(a.pulses===3)||a.energy-b.energy);
 window.RAKATA_DATA=d;
 const policy=E.policy;E.policy=function(p,...args){if(!p?.td12)return policy(p,...args);return st=>{const t=st.t/p.scale;if(t>p.t.at(-1))return 0;let lo=0,hi=p.t.length-1;while(hi-lo>1){const k=(hi+lo)>>1;if(p.t[k]>t)hi=k;else lo=k;}return p.u[lo];};};
 const $=id=>document.getElementById(id);
 $('strategy-select').replaceChildren(...d.strategies.map((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.name+' · '+s.pulses+' fase gas';return o;}));
 $('assist').checked=false;
 $('mode').querySelector('[value="replay"]').textContent='Replay lapangan TD12 / arsip TD10';
 $('mode').querySelector('[value="demo"]').textContent='Simulasi profil TD12 (model bebas)';
 $('track-caption').textContent='Sport Jabar · 1.440 m · TD12 · target 3:45 · finish melintas · 54 V';
 $('try-main').textContent='Jalankan profil TD12 3 throttle';$('try-three').textContent='Jalankan profil TD12 3 throttle';document.querySelector('#manual-comparison h2').textContent='Manual vs model TD12';
 const desc='TD12: 3 lap valid lapangan (konfirmasi driver). Timer memakai millis perangkat; GPS dinormalisasi ke 1.440 m. Kalibrasi bukan replay: kecepatan dan Wh diintegrasikan oleh model. Gap input ditahan sampai sampel berikutnya; akurasi lebih rendah pada gap dan throttle menengah. UNEJ belum dikalibrasi TD12.';
 document.querySelector('.model-note>p').textContent=desc;
 const summary=document.createElement('section');summary.className='panel';
 summary.innerHTML='<h2>TD12 · Acuan lapangan valid</h2><p>Target 3:45 · finish melintas · 54 V. Replay tidak dihitung sebagai skor pemain.</p><div class="table-scroll"><table><thead><tr><th>Lap</th><th>Waktu perangkat</th><th>Waktu HTML</th><th>Wh</th><th>km/kWh GPS</th><th>Status</th></tr></thead><tbody>'+d.laps.slice(0,3).map(l=>'<tr><td>'+l.lap+'</td><td>'+l.time.toFixed(3)+' s</td><td>'+l.html_time.toFixed(3)+' s</td><td>'+l.energy.toFixed(3)+'</td><td>'+(l.distance/l.energy).toFixed(2)+'</td><td>Valid lapangan · gap '+l.gap_count+'</td></tr>').join('')+'</tbody></table></div><p>'+desc+'</p><a href="?dataset=td10">Buka model TD10 lama</a> · <a href="TD12_TRAINING_REPORT.json" download>Hasil kalibrasi & uji leave-one-lap-out</a>';
 document.querySelector('.target-panel').after(summary);
 const evidence=document.createElement('section');evidence.className='panel';evidence.innerHTML='<h2>Kalibrasi TD12 aktif</h2><p>'+desc+'</p><p>Uji leave-one-lap-out: RMSE kecepatan '+d.validation.heldout.map(r=>r.speed_rmse.toFixed(2)).join(' / ')+' km/jam. Galat energi pada akhir durasi rekaman '+d.validation.heldout.map(r=>r.energy_error.toFixed(3)).join(' / ')+' Wh. Ini bukan galat energi pada finish simulasi.</p><p>Dokumentasi TD10 di bawah merupakan arsip model lama, bukan hasil validasi TD12.</p>';
 $('view-evidence').prepend(evidence);
 const strategy=document.createElement('section');strategy.className='panel';strategy.innerHTML='<h2>Profil TD12 · 3 throttle</h2><p>Pilih “Simulasi profil TD12” untuk menjalankan model, atau “Replay lapangan” untuk memutar data asli. Peta dan ekspor titik gas memakai profil pilihan saat ini.</p><p>Uraian strategi TD10 di bawah disimpan sebagai arsip; gunakan pilihan TD12 di tab DRIVE untuk model aktif.</p>';$('view-strategy').prepend(strategy);
 // All diagnostic graphs below the driving surface, never on top of controls.
 const mini=document.querySelector('.mini-map');document.querySelector('.below-game').after(mini);
})();
