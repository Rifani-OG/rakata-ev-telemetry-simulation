# RAKATA UNEJ — TD10 ONLY

Paket ini menggantikan baseline MATLAB sebelumnya. Ekstrak ke folder baru; buka `scripts` sebagai Current Folder MATLAB.
Sumber kendaraan tunggal sudah disertakan: `data/TD10_latest.xlsx`, salinan utuh **td10full(2).xlsx**. Tidak memakai TD7, model terdahulu, atau angka 197 km/kWh untuk fitting.

## Jalankan

```matlab
run("run_td10_only.m")
run("build_simulink_td10.m")
run("selftest_td10.m")
run("search_unej.m")
run("run_unej_simulink.m")
```

Perintah pertama mengimpor XLSX, memisahkan lap, melatih model, memvalidasi lap uji dan menggambar kandidat historis. Perintah kedua membuat **model Simulink terhubung** di results/KMHE_UNEJ_TD10_ONLY.slx. Perintah ketiga memeriksa 6 lap, 6 stop dan kesamaan hasil MATLAB–Simulink. `.slx` dibuat oleh MATLAB pengguna; tidak disertakan sebagai file yang seolah telah dikompilasi di sini.

Kebutuhan: MATLAB + Simulink untuk model blok. Pelatihan/pencarian memakai MATLAB dasar, tanpa Global Optimization atau Reinforcement Learning Toolbox. Target API R2025b. Tidak ada instalasi Python yang diperlukan pengguna.

## Pencarian throttle

```matlab
run("search_unej.m")
```

Pencarian sekarang aktif sebagai **studi eksplorasi transfer TD10 Sport Jabar ke UNEJ**, sesuai permintaan. Pada audit Python yang disertakan, model **belum lolos**: RMSE speed tertinggi 3.44 km/jam, sebagian rollout belum mencapai finish saat rekaman berakhir. Status validasi tetap diperingatkan dan disimpan. Set `C.allow_unvalidated_search=false` jika ingin menghentikan pencarian saat validasi gagal. Hasil diberi label MODEL ONLY/NOT FEASIBLE; kandidat terbaik dari pencarian terbatas bukan bukti optimum global atau validasi lapangan.

Setelah pencarian, `run("run_unej_simulink.m")` memasukkan kandidat terpilih ke model blok, menjalankan Simulink, lalu membuat peta dari **telemetri Simulink yang benar-benar dihasilkan**. Tidak lagi perlu menyalin zona secara manual. Konfigurasi, model kendaraan dan lintasan harus sama dengan saat pencarian; bila berubah, pencarian harus diulang. Keluaran `simulink_UNEJ_*_map_per_lap.png` dan `.fig` menampilkan setiap lap, throttle 0–100%, arah perjalanan, nomor marshal, start/finish serta STOP 3 s. `*_throttle_locations.csv` berisi meter mulai/lepas throttle aktual tiap lap; `*_TD10.csv` tetap tersedia.

Pelatihan kendaraan dilakukan oleh skrip MATLAB memakai TD10 saja. Pencarian memakai plant yang sama dengan blok Simulink; Simulink kemudian menjalankan kandidat hasil pencarian. Efek residual lokasi Sport Jabar dinonaktifkan di UNEJ, sementara grade UNEJ digunakan. Ini pemindahan model kendaraan, bukan melatih kendaraan dengan rekaman UNEJ yang belum tersedia.

300 kandidat default; ubah `C.search_trials` untuk memperbesar pencarian. Seed tetap 10. Kandidat terbaik diperiksa ulang pada dt 0.05 s. Hasil selalu berisi tabel zona, telemetry, dashboard PNG/FIG, dan peta throttle per lap; keluaran yang belum selesai tidak diberi label optimum. Batas 197 km/kWh bukan objective training.

## Input utama

Edit satu file `scripts/kmhe_config.m`:
- `mass_kg=141`: 71 mobil + 70 driver, input terakhir pengguna. Massa tidak diidentifikasi dari telemetry.
- `ratio=11`: rasio tetap. **Mengganti angka ini tidak mengubah kurva traction secara ajaib**; perlu data rasio baru. Model gaya sudah mencakup drivetrain aktual.
- `laps=6`, `limit_s=1500`; untuk 1 lap gunakan 1 dan 250.
- `brake_mps2=.65`: asumsi; stop dimulai dengan pengereman sebelum M9, bukan reset speed dari laju tinggi.
- `lateral_mps2=1.5`: asumsi konservatif. 3.0 hanya skenario studi, belum grip terukur.
- `corner_cap_floor_kmh=20`: acuan pengguna bahwa tikungan UNEJ bisa dilalui 20 km/jam. Batas tikungan hasil geometri estimasi tidak boleh lebih rendah dari ini. Kecepatan aktual tidak dipaksa naik ke 20; coast, launch dan stop-and-go tetap dapat di bawah 20. Ini bukan pengukuran grip maupun optimasi racing line.
- `grade_scale=1`: profil UNEJ estimasi DEM. Jangan mengubah agar hasil dipaksa sama dengan sejarah.
- `zones`: empat baris [mulai m, lepas m, throttle %, batas speed km/jam]. Tiga parameter restart setelah stop tersedia terpisah.

Di Simulink, blok **Auto_or_manual** memilih policy atau **Manual_input**. Default auto. Input manual memakai matriks `manual_input` di Model Workspace: [waktu, throttle %, rem 0..1]. Plot dashboard/scope mengeluarkan speed, jarak, throttle, Wh, A, V, lap, hold elapsed, done, invalid dan stop count. Simulasi memakai mode Normal, tanpa klaim dukungan code generation/hardware-in-the-loop.

Perbaikan input: `Interpolate=off`, `OutputAfterFinalValue=Holding final value`, sample time mengikuti `KMHE_CFG.dt`. Throttle tetap bertangga, nilai terakhir ditahan setelah akhir data. Akhiri matriks manual dengan throttle 0 jika ingin gas dilepas. Ini menyelesaikan error ekstrapolasi saat build; konfigurasi mengikuti https://www.mathworks.com/help/simulink/slref/fromworkspace.html. Selftest mencakup auto, manual step/release dan run melewati akhir data manual.

## Yang telah benar-benar diuji

Python `verification/audit_train.py` telah membaca XLSX ini, melatih model dari lap 1,4,5,7,8,10,13 dan menguji lap 3,6,12,15. Split dibuat per lap, bukan acak per baris. Segmen 2,9,11,14 dibuang dari fitting karena reset/jeda >0.5 s. Hasil angka/grafik ada di results. `model_python.json` dan `model_pretrained.mat` adalah hasil yang benar-benar dijalankan; MATLAB melatih ulang dan menulis `vehicle_TD10.mat`.

Metode optimisasi numerik MATLAB (bounded coordinate descent) dan Python (bounded least squares SciPy) dapat menghasilkan selisih kecil. Semua angka dalam HTML laporan berlabel audit Python. Tidak ada MATLAB/Simulink runtime di lingkungan pembuatan, jadi kompilasi native dan selftest belum dijalankan di sini.

**Batas model:** launch 0 km/jam lemah teridentifikasi; koefisien traction di node itu mencapai batas. Throttle menengah terbatas. V konstan 54, sat konstan 1; tidak ada battery sag/SOC/grip/brake sensor/motor RPM. Crr, CdA dan efisiensi motor tidak dipaksakan dari angka asumsi lama. Percepatan dikoreksi grade Sport Jabar saat fitting; residual posisi Sport Jabar dimatikan di UNEJ. Geometri dan elevasi UNEJ tetap data estimasi proyek, bukan hasil survei test drive baru.

**Koreksi lintasan berulang:** profil UNEJ lama mempunyai elevasi akhir sekitar 4,3 m lebih rendah dari awal, serta garis start dan finish terpisah. Memakai grade mentah enam kali memberi keuntungan gravitasi palsu. Fungsi kmhe_track membuang grade rata-rata sehingga integral grade satu lap nol, dan menghubungkan geometri 50 m terakhir secara halus ke start. Ini asumsi penutupan model yang eksplisit; bukan survei baru. Plot menunjukkan DEM asli dan koreksi. Perlu GPS centerline tertutup dan elevasi lapangan sebelum menganggap hasil waktu tikungan akurat.

## Keluaran

- `TD10_Audit_Validation.html`: laporan mandiri dengan grafik tertanam.
- `TD10_Validation.png`, `TD10_Input_Audit.png`: grafik dari audit yang dijalankan.
- `lap_audit.csv`, `validation_python.csv`: keputusan lap dan galat dengan sumber baris.
- `validation_matlab.csv`: dibuat saat MATLAB selesai.
- `historical_candidate*`: simulasi awal setelah pelatihan.
- `candidate_*`: hasil pencarian, status kelayakan eksplisit.
- `*_TD10.csv`: 12 kolom tanpa header, current mA, distance km, millis kontinu. GPS simulasi dan sat=0.

Referensi metode: https://www.mathworks.com/help/ident/ug/definition-simulation-and-prediction.html
API Simulink: https://www.mathworks.com/help/simulink/sfg/writing-level-2-matlab-s-functions.html

SHA-256 XLSX: `312d8cc02e2f9d8fb8f6aa89ea92ac57753f1f610f67d16026ed6fa9bdd7ef31`.
