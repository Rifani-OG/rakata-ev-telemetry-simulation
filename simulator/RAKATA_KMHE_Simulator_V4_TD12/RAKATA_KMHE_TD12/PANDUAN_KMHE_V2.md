# Menjalankan RAKATA KMHE UNEJ Simulator V2

Buka `RAKATA_KMHE_Attempt.html` langsung di Chrome/Edge. Untuk gamepad, hasil paling konsisten diperoleh dengan menjalankan `MULAI_WINDOWS.bat`, lalu membuka alamat localhost yang muncul.

1. Pilih **Per lap** atau **Full attempt 6 lap**.
2. Pilih Manual/Demo, Auto/Full steering, Racing line/Centerline, dan Keyboard/Gamepad.
3. Gamepad: pilih Gamepad, klik **Aktifkan gamepad**, tekan trigger. Monitor mentah menunjukkan nomor tombol/axis yang berubah. Default RT/R2=7, LT/L2=6, analog kiri=axis 0. Bila trigger muncul di axes, pilih `Gas dari axis` atau `Rem dari axis` yang sesuai.
4. Keyboard: tahan Spasi/W/↑. Throttle naik 5% setiap 0,15 detik dan kembali 0% ketika dilepas. A/D atau ←/→ untuk kemudi, S/↓/B untuk rem, P untuk jeda.
5. Stop 3 detik di M9 berlaku setiap lap. Full attempt meneruskan kecepatan dan energi saat melintasi garis lap.
6. Empat kartu strategi historis dapat diedit. Klik **Terapkan zona** sebelum mulai.

Dashboard menampilkan speed, total/lap distance, throttle, Wh, arus, tegangan, daya, waktu lap/attempt, serta sisa target. Ekspor tersedia sebagai CSV TD10 kontinu, CSV ringkasan lap, dan PNG peta throttle.

## MATLAB

Ekstrak `RAKATA_KMHE_MATLAB_SIMULINK.zip`, buka foldernya di MATLAB, lalu:

1. Salin `TD7_FULL.xlsx` ke folder `data`.
2. Jalankan `run("kmhe_import_td7.m")`.
3. Jalankan `run("kmhe_optimize.m")`.
4. Untuk membuat kerangka Simulink, jalankan `run("kmhe_build_simulink.m")`.

Hasil optimasi masuk ke folder `results`. Model awal belum tervalidasi untuk UNEJ; gunakan telemetry lap UNEJ berikutnya untuk mengoreksi lookup kendaraan, kemiringan, dan batas kecepatan tikungan.
