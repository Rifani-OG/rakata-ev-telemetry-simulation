# MATLAB/Simulink KMHE UNEJ
Mulai dari MATLAB pada folder ini. Salin `TD7_FULL.xlsx` ke `data`, lalu jalankan `run("kmhe_import_td7.m")` untuk membentuk lookup percepatan, coast, daya, dan tegangan. Jalankan `run("kmhe_optimize.m")` untuk pencarian awal empat zona throttle. Pencarian acak dan penyempurnaan lokal memakai MATLAB dasar, lalu menghasilkan CSV zona, telemetry simulasi, dan PNG di folder `results`.

Jalankan `run("kmhe_build_simulink.m")` untuk membuat kerangka `KMHE_UNEJ_Longitudinal.slx`. Kerangka ini sengaja belum disebut tervalidasi: blok `Vehicle_Physics` berikutnya perlu diisi lookup percepatan/daya dari telemetry mobil terkini. Parameter awal 141 kg, rasio 1:11, 54 V, 1.600 m, stop 3 detik di 665 m, 6 lap dan 1.500 detik.

Model MATLAB saat ini adalah baseline fisika transparan. Strategi yang dihasilkan belum boleh dipakai sebagai perintah test drive sampai divalidasi terhadap satu lap UNEJ aktual. Data yang paling penting: throttle, speed, current, voltage, power/energy, millis, GPS, status stop serta konfigurasi kendaraan.
