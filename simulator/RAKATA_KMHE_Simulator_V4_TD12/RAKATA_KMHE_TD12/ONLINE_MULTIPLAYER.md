# Rencana Multiplayer & Leaderboard Online

Versi ini dapat diunggah ke static hosting dan dimainkan banyak orang, tetapi leaderboard yang tersedia masih tersimpan di browser masing-masing.

Untuk leaderboard lintas perangkat, tambahkan backend HTTPS dengan tiga komponen:

1. Identitas driver: login tim atau kode driver unik.
2. Database hasil: simpan driver, track, konfigurasi kendaraan, waktu, Wh, efisiensi, checksum replay, dan waktu server.
3. API: `POST /runs` untuk submit hasil dan `GET /leaderboard?track=...` untuk ranking.

Validasi wajib dilakukan di server. Jangan menerima angka waktu/Wh langsung sebagai hasil sah. Kirim replay input throttle/kemudi, lalu jalankan ulang model deterministik di server untuk memeriksa jarak finish, batas kecepatan, stop 3 detik UNEJ, dan energi. Tambahkan rate limit serta version ID model supaya hasil dari versi simulator berbeda tidak bercampur.

Pilihan implementasi ringan: Cloudflare Pages/Workers + D1, Supabase, atau Firebase. WebSocket hanya diperlukan jika ingin melihat ghost/live race; leaderboard biasa cukup memakai REST API.
