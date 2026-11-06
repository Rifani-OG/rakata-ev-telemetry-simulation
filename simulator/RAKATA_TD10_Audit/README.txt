RAKATA TD10 - PAKET AUDIT

Untuk latihan, buka RAKATA_TD10_Trainer.html dari berkas terpisah. Tidak perlu Python, Node, atau internet. Pilih Manual atau Demonstrasi; Replay adalah rekaman TD10.

Paket ini untuk memeriksa dasar analisis, bukan syarat memainkan game.
- lap_audit.csv: waktu, energi, spare awal, kualitas finish dan indeks sumber.
- training_samples.csv: data resampling yang dipakai model.
- strategy_2pulse.csv / strategy_3pulse.csv: hasil simulasi terpilih.
- analysis/: parameter, model leave-one-lap-out, validasi dan kode.
- sources/Rakata/: sumber asli yang diperlukan untuk reproduksi.

Reproduksi perhitungan: dari folder paket yang diekstrak, jalankan:
python analysis/rebuild.py

Memerlukan Python dengan numpy, pandas, scipy, matplotlib, openpyxl; serta Node.js untuk mesin simulasi yang sama dengan game. Versi lingkungan asal dicatat di provenance.json. Perintah menghasilkan model dan hasil pencarian ulang; tidak mengubah otomatis HTML final yang sudah dibagikan.

Konfigurasi: massa 141 kg, rasio 1:11; 1.440 m, target 220 s, spare awal 1 s. Keputusan puncak throttle 34,9 km/jam. Bantuan finish memakai asumsi perlambatan 0,43 m/s2; bukan gaya rem terukur.

Batas penting: 12 lap boundary dan 3 strict; lima catatan di bawah 220 s semuanya boundary. Galat waktu rata-rata 7,37 s untuk 14 replay yang selesai; satu replay gagal finish. Prediksi bukan jaminan lapangan.
