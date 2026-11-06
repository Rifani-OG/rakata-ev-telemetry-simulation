# RAKATA TD12 — target 3:45

Ekstrak seluruh ZIP, lalu buka `RAKATA_TD10_Trainer.html` (nama lama dipertahankan agar launcher tetap kompatibel). Untuk gamepad, jalankan `MULAI_WINDOWS.bat` dengan Python 3 terpasang, kemudian gunakan Chrome/Edge.

1. Default: Sport Jabar, model TD12, profil 3 throttle Lap 3.
2. Pilih **Simulasi profil TD12** lalu Mulai untuk menjalankan profil pada model hasil kalibrasi.
3. Pilih **Replay lapangan TD12 / arsip TD10** untuk memutar ketiga lap asli. Ketiganya valid lapangan berdasarkan konfirmasi driver dan batas 225 detik.
4. Pilih **Manual** untuk latihan keyboard/gamepad; hasil valid 1× masuk leaderboard lokal. Finish Sport Jabar TD12 adalah melewati 1.440 m, tidak harus berhenti. Maksimum model tetap 35,3 km/jam; keluar jalan membatalkan rekor. Bantuan rem finish tetap tersedia sebagai opsi.
5. Link **model TD10 lama** mengembalikan model/strategi lama. UNEJ per-lap dan attempt 6 lap tetap tersedia dengan aturan sebelumnya (4:10 per lap, 25 menit attempt, stop 3 detik di titik 9). Data Sport Jabar tidak otomatis dianggap validasi UNEJ.

## Kalibrasi aktual

Model manual dan demonstrasi memakai parameter traksi, perlambatan spasial, kecepatan tanpa beban, dan skala daya yang dipasang ulang terhadap TD12. Model bebas mengintegrasikan percepatan dan daya; tidak menyalin speed/Wh rekaman. Model berbasis 141 kg, rasio 1:11, tegangan sumber 54 V. Tidak diubah menjadi 52 V.

Profil 3 throttle Lap 3 pada model: sekitar **217,137 s; 6,530 Wh; 220,53 km/kWh pada 1.440 m**, finish bergerak sekitar 12,87 km/jam. Ini prediksi kalibrasi, bukan hasil test drive tambahan. Profil Lap 1/2 juga tersedia; fase gas kecil tetap disimpan, tidak dipaksa menjadi tiga.

Waktu acuan menggunakan `millis` perangkat. Lap 1/2/3: 222,271 / 218,266 / 216,845 detik. Waktu HTML asli: 223,578 / 217,260 / 210,588 detik. Seluruhnya di bawah 225 detik. Perbedaan berasal dari timestamp penerimaan dan gap. Lap 3 berakhir pada 9,78 km/jam; tidak dibuatkan ekor berhenti palsu.

Uji leave-one-lap-out melatih dua lap dan menguji lap ketiga: RMSE speed 1,91 / 1,96 / 3,94 km/jam; galat energi pada akhir durasi rekaman −0,093 / −0,076 / −0,262 Wh. Uji tersebut masih dari sesi yang sama, bukan validasi independen. Sampel hilang tidak direkonstruksi sebagai pengukuran; input terakhir ditahan selama gap. Jarak GPS diubah skala ke 1.440 m untuk peta.

`TD12_TRAINING_REPORT.json` berisi hasil rinci. `TD12_source.html` menyimpan sumber. Ulangi training dengan `node train-td12.cjs`, kemudian `python build_offline.py`; pengujian `node test-td12.cjs`. Jangan jalankan ulang `migrate-td12.cjs` (integrasi satu kali).

UI, replay TD10, kemudi auto/full, keyboard/gamepad, countdown/pause/reset, bantuan rem, grafik, peta throttle, ekspor CSV TD10/detail, panduan HTML/SVG, backup rekor dan leaderboard lokal dipertahankan. Leaderboard belum online. Pengujian yang dilakukan adalah model numerik, batas validitas, sintaks dan kelengkapan aset; controller fisik belum diuji.
