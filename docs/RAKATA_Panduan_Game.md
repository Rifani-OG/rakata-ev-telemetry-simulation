# RAKATA TD10 Driver Game V3

Game latihan throttle dan kemudi dengan kamera perspektif dari belakang-atas. Jalan dan mobil berupa polygon 3D sederhana yang diproyeksikan ke Canvas. Tidak membutuhkan Unity, GPU khusus, internet saat bermain, atau paket Python tambahan.

## Menjalankan

1. Ekstrak **seluruh** RAKATA_TD10_Driver_Game_V3.zip ke satu folder.
2. Untuk keyboard saja, buka `RAKATA_TD10_Trainer.html` di Chrome atau Edge.
3. Untuk gamepad dan penyimpanan rekor yang konsisten, gunakan launcher lokal:
   - Windows: instal Python 3 bila belum tersedia, lalu klik dua kali `MULAI_WINDOWS.bat`. Alternatif: buka terminal di folder itu dan ketik `py -3 run_game.py`.
   - macOS/Linux: buka terminal di folder itu, lalu `python3 run_game.py`.
4. Browser terbuka otomatis. Jika tidak, buka **http://localhost:8765/RAKATA_TD10_Trainer.html**. Pilih Chrome/Edge bila browser bawaan berbeda. Biarkan terminal tetap terbuka; Ctrl+C untuk berhenti.
5. Pilih **Manual**, **Auto steering** atau **Full steering**, dan **1× waktu asli**. Klik Mulai latihan. Countdown 3–2–1 tidak masuk waktu lap; timer mulai setelah GO.
6. Klik area game sebelum memakai keyboard. Gunakan Ulang/Latihan baru untuk membuka kembali pilihan konfigurasi yang terkunci setelah start.

Jika Python tidak ditemukan: pasang dari https://www.python.org/downloads/ lalu buka ulang terminal. Bila port 8765 terpakai, tutup launcher lama; atau jalankan `python run_game.py 8766`. Port berbeda berarti tempat penyimpanan rekor browser berbeda. Gunakan menu cadangan rekor untuk memindahkannya.

## Kontrol

| Aksi | WASD | Arrow keys | Tambahan | Xbox / PlayStation |
|---|---|---|---|---|
| Gas | tahan W | tahan ↑ | tahan Spasi / tombol pedal layar | RT / R2, kontinu 0–100% |
| Lepas gas | lepas W | lepas ↑ | lepas Spasi | lepas RT / R2 |
| Rem | tahan S | tahan ↓ | tahan B / tombol rem layar | LT / L2, analog |
| Kemudi | A / D | ← / → | — | analog kiri |
| Jeda/lanjut | P | P | tombol Jeda/Mulai | gunakan tombol layar |

Keyboard gas naik 5% setiap 0,15 detik nyata (dimulai 5%), maksimal 100%; lepas seluruh tombol gas kembali 0%. Jika gas dan rem bersamaan, rem didahulukan. Perintah gas nol seketika; respons motor mengikuti lag model TD10. Tidak ada gigi mundur. Auto steering hanya memerlukan gas dan rem; Full steering memerlukan arah belok. Bantuan rem finish tetap bisa dipilih sebelum mulai.

Slider dan tombol 0/25/50/75/100% lama tetap tersedia di mode input Keyboard/pedal layar. Demi kenyamanan latihan, mulai dengan demo 2 throttle, kemudian Manual Auto steering, baru Full steering.

## Menyambungkan gamepad

1. Sambungkan Xbox/PS melalui USB atau Bluetooth, lalu buka game melalui launcher lokal.
2. Pilih Input **Gamepad** dan tekan sebuah tombol pada controller agar browser mengenalinya. Game harus menjadi tab aktif.
3. Buka **Kontrol gamepad & pemeriksaan input**. Saat RT/R2 ditekan, monitor gas harus berubah bertahap dari 0 ke 100; analog kiri harus kembali 0 ketika dilepas.
4. Layout standard menggunakan tombol 7 untuk RT/R2, 6 untuk LT/L2, dan axis 0 untuk analog kiri. Deadzone kemudi 12%; ada opsi balik arah.
5. Jika tertulis nonstandard, lihat nomor tombol yang berubah di monitor, ubah nomor gas/rem/axis, kemudian centang izin mapping nonstandard. Trigger pada mode ini harus terpapar sebagai tombol analog 0–1. Driver yang mengeksposnya hanya sebagai axis tidak didukung oleh pemetaan manual ini; gunakan layout standard atau keyboard.
6. Klik Mulai latihan. Trigger tidak otomatis memulai sesi. Controller putus atau tab kehilangan fokus menjeda permainan; klik Lanjutkan setelah tersambung kembali.

Dukungan bergantung browser, OS, driver, dan jenis controller; controller fisik belum diuji pada lingkungan pembuatan ini. API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API ; mapping: https://www.w3.org/TR/gamepad/ .

## Rekor menjadi target berikutnya

Target pertama adalah kandidat rekomendasi TD10 yang dipilih. Rekor baru dipromosikan hanya jika seluruh syarat berikut terpenuhi:

- Manual, 1× waktu asli; menyelesaikan 1.440 m.
- Waktu paling lama 220 detik (3:40); kecepatan finish ≤3 km/jam.
- Puncak kecepatan ≤35,3 km/jam dan bodi tetap di dalam jalan.
- Wh **lebih kecil** dari target yang sedang dikejar.

Waktu tidak harus lebih cepat dari rekor sebelumnya selama tetap ≤3:40; sasaran optimasi adalah Wh. Rekor tidak berubah di tengah lap. Sesudah finish, klik Ulang/Latihan baru untuk memakai rekor baru sebagai target. Auto dan Full mempunyai rekor terpisah; dimensi, strategi, serta bantuan finish juga memisahkan rekor. Demo/replay dan 2×/4× tidak dapat menjadi rekor.

Rekor disimpan lokal pada browser/origin yang sama. Gunakan **Cadangkan rekor (.json)** dan **Pulihkan rekor** untuk backup. Cadangan hanya diterima pada konfigurasi yang sama dan jika lebih hemat. Mode privat, menghapus data browser, berpindah file/origin, atau port bisa membuat rekor tidak tersedia. Cadangan adalah data latihan pribadi, bukan sertifikat hasil test drive.

## Membaca visual dan membawa hasil ke test drive

- Kamera belakang-atas: garis oranye di tepi kiri jalan = zona gas rekomendasi TD10; garis kuning di kanan = zona gas target sesi saat ini. Warna tersebut adalah panduan game, bukan marka jalan asli.
- Panel target menampilkan selisih waktu dan Wh **pada jarak yang sama**.
- Peta manual vs rekomendasi: pita cyan semakin terang untuk throttle besar; nomor = mulai gas; kotak putih = lepas; garis putih tipis = jalur kemudi simulasi.
- Grafik menampilkan kecepatan, delta waktu, dan delta Wh manual terhadap rekomendasi TD10. Target pribadi tidak menghapus pembanding TD10 asli.
- Tabel mencatat posisi mulai/lepas, kecepatan, throttle maksimum, dan durasi.
- **Unduh panduan test drive** menyimpan HTML berisi dua peta, hasil, koordinat, dan tabel. Buka lalu Cetak → Simpan sebagai PDF.
- Peta SVG, titik gas CSV, dan catatan sesi CSV juga tersedia. CSV sesi mencakup offset lateral, sudut roda, dan arah mobil dalam radian. Unduh sebelum mengulang.
- Pada Full steering, koordinat adalah proyeksi jalur GPS ditambah offset simulasi; bukan pembacaan GNSS baru. Titik meter/pita warna tetap mengacu station centerline.

## Data nyata, referensi desain, dan asumsi

| Komponen | Dipakai | Status |
|---|---|---|
| Massa mobil + driver | 71 + 70 = 141 kg | konfigurasi proyek TD10 |
| Rasio | tetap 1:11 | konfigurasi TD10 |
| Percepatan, gliding, daya, Wh | model dari 15 lap td10full.xlsx | hasil pembelajaran; model longitudinal lama dipertahankan |
| Rute Sport Jabar | centerline GPS; station 0–1.440 m | jejak proyek yang dicocokkan dengan TD10 |
| Elevasi | profil Google Earth sekitar 684–688 m | estimasi profil, bukan survei RTK |
| Wheelbase | 1.370 mm | tabel 3.12 laporan desain; belum ukur ulang |
| Lebar default | 1.008,95 mm dibulatkan 1,009 m | Gambar 3.1 desain lama KMHE 2025, bukan konfirmasi dimensi TD10 |
| Jalan game | 4 × lebar mobil; default 4,036 m | permintaan pengguna, bukan hasil survei jalan |
| Panjang bodi | 2,8 m | asumsi visual dan batas bodi game |
| Batas kemudi / respons | 25° / 0,16 s | asumsi kinematik game; bukan hasil identifikasi steering TD10 |
| Rem finish | perlambatan sekitar 0,43 m/s² | asumsi diinformasikan ekor lap; tidak ada sensor rem |

Sumber dimensi: **V4 DRAF LAPDES URBAN KMHE 2026_260613_165609.pdf**, gambar 3.1 halaman PDF 21 dan tabel 3.12. Dokumen juga memuat kebutuhan lebar 1.200–1.300 mm yang berbeda dari gambar lama. Ukur lebar aktual terluar kendaraan dan wheelbase lalu ubah kolom game; jangan menganggap salah satu dimensi lama sudah terkonfirmasi untuk mobil sekarang.

**Lebar nyata kawasan:** tesis Kharisma Muliati Putri (ITB; diinput 22 Juli 2021) melaporkan jalur utama **>6 m** dan jalur sekunder **3–4 m**. Sumber tidak memetakan seluruh segmen TD10 atau memastikan kondisi September 2026. Karena itu game tidak mengklaim lebar seragam tersebut sebagai ukuran aktual lintasan.
https://digilib.itb.ac.id/gdl/view_data/perancangan-ruang-terbuka-hijau-pada-sarana-olahraga-dengan-pendekatan-pengaruh-karakteristik-pohon-terhadap-kenyamanan-termal-studi-kasus-sentra-pembinaan-olahraga-terpadu-sport-jabar-arcamanik/?per_page=77&rows=86

Model Full steering adalah sepeda kinematik; posisi mengikuti proyeksi rute. Panjang geometris GPS sekitar 1.428 m sementara station telemetry dinormalisasi 1.440 m. Koreksi metric dan jalur yang berbeda dapat mengubah waktu Full steering meski throttle sama. Karena itu rekor Auto/Full dipisahkan dan pembanding TD10 pada Full bersifat indikatif. Tidak ada grip/slip/scrub ban atau energi tambahan akibat steering yang teridentifikasi; game tidak membuktikan racing line atau teknik steering paling hemat di lapangan. Keluar jalan atau menghadap berlawanan menghentikan sesi untuk mencegah shortcut menjadi rekor.

Validasi model sebelumnya: median RMSE kecepatan 1,59 km/jam, rata-rata galat waktu 7,37 s pada 14/15 replay yang selesai, galat energi 0,22 Wh. Throttle parsial menetap lebih tidak pasti. Selisih kecil Wh tetap bisa menjadi skor game, tetapi belum membuktikan peningkatan efisiensi nyata. Profil tanjakan tidak ditambahkan dua kali ke model.

## Hasil pemeriksaan versi ini

Pemeriksaan logika otomatis lulus: model Auto masih 211,558 s dan 7,348449 Wh untuk kandidat utama; arah kemudi dan deteksi tepi jalan; mapping trigger dan deadzone; syarat promosi rekor; ramp +5% dan keadaan sebelum GO; serta satu driver sintetis dapat menyelesaikan full route tanpa keluar jalan. Pemeriksaan sintaks JavaScript dan paket offline juga dilakukan. Tidak dilakukan pengujian visual browser atau pengujian controller fisik. Driver sintetis bukan hasil training manual baru dan bukan rekomendasi TD10 baru.
