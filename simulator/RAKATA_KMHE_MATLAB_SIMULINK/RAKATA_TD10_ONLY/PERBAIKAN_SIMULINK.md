# Perbaikan input dan alur UNEJ

Ekstrak paket baru. Dari folder `scripts`, jalankan satu per satu:

```matlab
clear functions
rehash
run("run_td10_only.m")
run("build_simulink_td10.m")
run("selftest_td10.m")
run("search_unej.m")
run("run_unej_simulink.m")
```

Jika tetap memakai folder lama yang sudah memiliki `results/vehicle_TD10.mat`,
salin semua skrip baru sebelum menjalankan. Pelatihan ulang tidak diperlukan
untuk perubahan input ini, tetapi pencarian UNEJ harus diulang karena batas tikungan berubah.

- `Manual_input`: menahan nilai terakhir sesudah data habis; interpolasi tetap off,
  sampling mengikuti konfigurasi discrete plant. Jangan mengaktifkan interpolasi
  linear sekadar untuk menghilangkan error karena itu mengubah pola pedal.
- Plant dilatih dari TD10 Sport Jabar saja. Grade Sport Jabar dikoreksi saat fitting;
  residual posisi Sport Jabar dimatikan saat plant dijalankan pada grade UNEJ.
- Acuan batas tikungan 20 km/jam. Pemeriksaan geometri paket menemukan batas lama
  minimum 10.52 km/jam; 21 dari 321 titik cap dinaikkan. Mobil tidak diberi energi
  tambahan atau dipaksa mempertahankan speed minimum. Restart bertahap setelah M9
  memakai target 20 km/jam sebelum full throttle setelah T10.
- Enam lap, total 9600 m, maksimum 1500 s, berhenti 3 s di M9 setiap lap;
  start/finish antar lap dilewati tanpa berhenti. Mode satu lap: ubah `laps=1`
  dan `limit_s=250`, lalu ulangi pencarian.
- Pencarian memilih kandidat empat zona berdasarkan konsumsi Wh dan constraint.
  Hasil yang tidak selesai/invalid tetap diberi label NOT_FEASIBLE. Tidak ada
  jaminan optimum global atau keberhasilan target sebelum program dijalankan.
- `run_unej_simulink.m` menjalankan kandidat yang dicari dan menggunakan telemetry
  blok untuk dashboard, PNG/FIG peta per lap, CSV lokasi throttle aktual dan CSV TD10.
  Peta berwarna 0–100%, memiliki panah arah perjalanan, marker dan stop-and-go.

Keluaran peta ada di `results/simulink_UNEJ_*_map_per_lap.png`.
Lokasi gas ada di `results/simulink_UNEJ_*_throttle_locations.csv`.

Pemeriksaan paket dan geometri telah dijalankan; lintasan berorientasi searah
jarum jam. Native MATLAB/Simulink belum tersedia di lingkungan penyusunan.
Selftest yang disertakan menguji auto/manual, pelepasan throttle, input melewati
data terakhir, 6 stop, parity plant serta pemisahan residual lokasi Sport Jabar.
Model masih eksploratif karena validasi TD10 sebelumnya belum memenuhi semua
kriteria; geometri/elevasi UNEJ tetap estimasi proyek dan belum survei terbaru.

Referensi konfigurasi input:
https://www.mathworks.com/help/simulink/slref/fromworkspace.html
