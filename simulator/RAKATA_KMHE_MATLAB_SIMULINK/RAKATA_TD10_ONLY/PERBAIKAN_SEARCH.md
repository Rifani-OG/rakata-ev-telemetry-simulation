# Perbaikan Invalid zones

Penyebab: batas pencarian zona kedua memungkinkan start 440 m dan release
410 m. Pembulatan 5 m juga dapat membuat start sama dengan release. Sekarang
setiap kandidat diproyeksikan setelah pembulatan: release minimal 5 m setelah
start, tetap dalam bounds dan tidak tumpang tindih dengan zona lain.
Assertion plant tetap aktif, bukan dihapus untuk melewatkan input salah.

Jika hasil training sudah ada, salin seluruh isi `scripts` baru ke folder
`scripts` lama. Tidak perlu menghapus `results` atau melatih ulang kendaraan.
Dari folder `scripts`, jalankan:

```matlab
clear functions
rehash
run("selftest_search_zones.m")
run("search_unej.m")
run("run_unej_simulink.m")
```

Pencarian dimulai ulang dengan generator yang diperbaiki. Checkpoint lama
tidak dilanjutkan. Run Simulink membangun ulang model secara otomatis dan
membuat peta dari telemetry yang dihasilkan.

Jika ekstrak di folder baru tanpa `results/vehicle_TD10.mat`, jalankan
`run("run_td10_only.m")` terlebih dahulu.

Perubahan tambahan:
- Progress menampilkan kandidat BEST, jarak kurang dan status feasible.
- Kandidat feasible selalu diprioritaskan; antar kandidat feasible, Wh terendah menang.
- `search_history.csv` menyimpan setiap kandidat, stop, waktu, Wh dan status.
- `*_diagnosis.txt` menjelaskan attempt tidak selesai dan stall sebelum zona gas berikutnya.
- Toolbar axes disembunyikan sebelum ekspor dashboard/peta.

Interpretasi log pengguna: 1500 s, 221.3/9600 m, 0 stop dan 5.532 Wh berarti
attempt gagal, bukan strategi efisien. Zona historis pertama berakhir di 100 m,
zona kedua baru dimulai 390 m. Grade UNEJ estimasi di 221.3 m sekitar +3.93%.
Model dapat berhenti sebelum mencapai zona berikutnya. Ini menunjukkan
ketidakcocokan strategi historis dengan kombinasi model/estimasi lintasan,
bukan bukti bahwa strategi lapangan tahun lalu salah. Fitting TD10 dan
geografi tidak diubah untuk memaksakan keberhasilan target.

Verifikasi di lingkungan penyusunan: 100000 kandidat diuji dengan padanan
numerik Python; 16859 kandidat terbalik/kosong diperbaiki, seluruh hasil
memenuhi bounds, urutan dan panjang minimum. Native MATLAB belum tersedia.
`selftest_search_zones.m` menguji fungsi MATLAB aktual: kasus start 440 m /
release 410 m dan 10000 kandidat. Uji parity MATLAB-Simulink sebelumnya
telah PASS menurut log pengguna; perubahan pencarian ini perlu uji native baru.
