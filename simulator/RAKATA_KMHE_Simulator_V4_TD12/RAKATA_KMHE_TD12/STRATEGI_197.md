# KMHE UNEJ — empat zona throttle dan full attempt
Buka RAKATA_KMHE_Attempt.html. Pilih Per lap atau Full attempt 6 lap. Tekan Mulai untuk countdown 3 detik. Timer total 250 atau 1500 detik; countdown tidak masuk timer. Kendaraan melewati garis lap tanpa berhenti, termasuk garis akhir sesi. Stop wajib 3 detik di T9 setiap lap. Per lap dimulai dari diam; full attempt meneruskan kecepatan, throttle internal dan daya antar lap.

Strategi acuan merupakan interpretasi gambar dan keterangan pengguna, bukan rekaman telemetry:
1. Awal sampai sebelum T2 (0–100 m): ramp 3 detik menuju 100%, lepas di 35 km/jam atau akhir zona.
2. T6–T7 (390–455 m): akselerasi hingga 22 km/jam lalu lepas. Persentase aktual tahun lalu tidak diketahui.
3. T9–T10 (665–760 m): ramp gas ringan maksimal 45%, batas 15 km/jam; setelah T10 gas penuh sampai T11 sekitar 895 m. Batas 45% dan 15 km/jam adalah parameter rekonstruksi, bukan pengukuran.
4. T13–setelah T14 (1185–1390 m): gas penuh di bawah 35 km/jam lalu meluncur.

197 km/kWh yang dilaporkan pengguna setara 8,1218 Wh/lap dan 48,7310 Wh untuk 9,6 km. Waktu 25 menit berarti rata-rata 23,04 km/jam termasuk berhenti, atau 23,32 km/jam selama bergerak bila hanya dikurangi 18 detik stop.

Model transfer TD10 dengan DEM UNEJ belum mereproduksi pola ini: uji awal berhenti karena kehabisan momentum sekitar 226 m, sebelum zona kedua. Itu menunjukkan ketidakcocokan model/geometri/kemiringan atau rekonstruksi input; bukan bukti strategi lapangan gagal atau hasil 197 salah. Energi sesi parsial tidak boleh dibandingkan sebagai efisiensi finish. Untuk kalibrasi diperlukan log tahun lalu: waktu, speed, throttle, power/energy dan posisi beserta konfigurasi mobil saat itu.

Racing line diperkirakan melalui penghalusan dalam koridor ±1,1 m. Batas lateral studi 3 m/s² belum diukur; radius lebih halus dapat mempertahankan kecepatan lebih tinggi, tetapi tidak ada kecepatan minimum paksa. Sambungan finish/start 50 m terakhir merupakan estimasi. Model belum memuat grip terukur, slip ban atau kerugian menikung; jalur ini bukan optimum lapangan yang terbukti.

CSV TD10 berisi timestamp,lat,lng,speed,sat,throttle,current_mA,voltage,power,energy,distance,millis. Jarak, energi dan millis berlanjut sepanjang attempt; GPS berulang tiap lap, tanpa reset pada stop. sat=0 dan voltage=54 V adalah metadata simulasi. Ringkasan CSV terpisah memuat waktu dan energi per lap. Peta ekspor menunjukkan lap aktif/terakhir. Rekor disimpan terpisah menurut 1/6 lap, kemudi dan jalur; hanya manual selesai dalam batas waktu, semua stop sah, Wh di bawah target yang dipromosikan. Fitur analisis/trainer sebelumnya tetap dapat dibuka dari tautan kembali.
