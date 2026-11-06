# Tambahan lintasan KMHE UNEJ

Jalankan trainer seperti sebelumnya. Pilih Lintasan → KMHE UNEJ. Target 4:10, panjang station 1.600 m. Pilih konservatif (default) atau Studi target (asumsi percepatan lateral 3 m/s², belum diukur). Kedua skenario memakai rute dan DEM yang sama; skenario studi bukan hasil validasi lapangan.

Stop-and-go titik 9 sekitar 665 m. Bantuan stop aktif secara default. Mobil berhenti penuh selama 3 s, waktu dan energi tetap berjalan. Tanpa bantuan, rem sampai berhenti dengan gas nol di zona ±3 m sebelum melintas. Pelanggaran membatalkan rekor.

Panel Strategi dan Data & model berisi analisis UNEJ, koordinat dan sumber. Ekspor CSV tetap 12 kolom format TD10, berisi data SIMULASI. Parser lap lama dapat memecah sesi pada stop-and-go: bila ingin menganalisis satu lap UNEJ, gunakan station 0–1.600 m dan jangan menganggap stop di 665 m sebagai finish. Sampel saat berhenti tetap diekspor tanpa reset millis atau energi.

Koordinat adalah estimasi hasil rekonstruksi gambar/OSM; bagian 4–6, radius tikungan dan elevasi jalan perlu verifikasi. Lihat KMHE_UNEJ_Analisis.html dan PNG. CSV koordinat marshal dan profil elevasi disertakan. Fungsi Sport Jabar tetap tersedia dengan target 3:40.


Pembaruan kontrol: pilih tombol besar Sport Jabar / KMHE UNEJ di atas permainan. Setelah mulai, tekan Ulang sebelum mengganti track. Jarak lap tampil di panel kanan. Rem manual 0,65 m/s² (asumsi game); bantuan rem otomatis tetap memakai model sebelumnya. Rekor versi kontrol ini dipisahkan dari versi lama.
