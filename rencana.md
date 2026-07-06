# Rancangan Aplikasi Mobile MDA Mengaji (Sync dengan Skema Database)

Dokumen ini berisi cetak biru (Blueprint) dan rancangan antarmuka untuk aplikasi mobile MDA Mengaji. Rancangan ini telah diselaraskan 100% dengan skema database aktual (NeonDB/Drizzle) yang ada di Web Next.js milikmu.

---

## 1. Stack Teknologi Mobile (Rekomendasi)
- **Framework:** **Expo / React Native**. (Alasan: Menggunakan JavaScript/React, sehingga transisi dari Next.js sangat mudah).
- **Styling:** **NativeWind** (TailwindCSS versi React Native).
- **Scanner Library:** `expo-camera` atau `expo-barcode-scanner` untuk membaca QR Code dari kartu santri.
- **HTTP Client:** `axios` atau `fetch` bawaan.

---

## 2. Struktur Layar Berdasarkan Relasi Database

### A. Alur Awal (Auth Flow)
- **Splash Screen:** Menampilkan Logo MDA Masjid Nurul Huda.
- **Welcome / Login Screen:** Halaman awal dengan 2 pilihan:
  1. **"Login Guru"** ➡️ Memvalidasi `email` dan `passwordHash` dari tabel `users` (hanya untuk `role = 'teacher'`).
  2. **"Pantau Anak (Orang Tua)"** ➡️ Meminta input **SLUG** atau **NIS/ID** santri yang sesuai dengan field `slug` unik di tabel `students`.

### B. Mode Guru (Teacher Flow)
Aplikasi menampilkan *Bottom Tab Navigation* dengan akses langsung ke tabel-tabel transaksi:

1. **Beranda (Home Screen):**
   - Menampilkan total santri yang berada di bawah bimbingan guru tersebut (mengacu pada relasi `studyGroups.teacherId`).
   - Tombol jalan pintas besar: **[Mulai Scan Absen]**.
2. **Kamera Scanner (Smart Presensi Screen):**
   - Saat QR Code di-scan, aplikasi akan membaca `slug` atau `studentId`.
   - Otomatis menembak API untuk mengisi tabel `attendance` dengan parameter:
     - `studentId` = ID dari hasil scan
     - `teacherId` = ID guru yang sedang login
     - `status` = 'hadir'
     - `date` = Hari ini (defaultNow)
3. **Input Prestasi (Learning & Memorization Screen):**
   - Menampilkan daftar santri dari tabel `students` yang terikat pada `groupId` si guru.
   - Tersedia 3 Tab Inputan (Sesuai dengan desain tabelmu):
     - **Ngaji (learning_records):** Input tipe (Iqro/Al-Quran), `levelOrSurah`, `startPoint` (halaman awal), `endPoint` (halaman akhir), dan `quality` (A/B/C).
     - **Hafalan Surah (memorization_records):** Memilih `surahId` (berelasi ke `master_surahs`), `verseStart`, `verseEnd`, dan `quality`.
     - **Hafalan Doa (worship_records):** Memilih dari `master_daily_prayers` atau `master_prayer_readings`.
4. **Profil (Profile Screen):**
   - Mengambil data dari tabel `users`.

### C. Mode Orang Tua (Parent Flow)
Hanya bisa diakses dengan memasukkan kode unik anak (`students.slug`).

1. **Dashboard Anak:**
   - **Data Santri:** Menarik data dari tabel `students` (`name`, `readingLevel`, dll).
   - **Status Kehadiran:** Mengecek entri terbaru dari tabel `attendance` untuk anak tersebut.
   - **Buku Penghubung Digital:** Menarik 3 data terakhir sekaligus:
     - *Learning Records* (Ngaji Iqro/Quran)
     - *Memorization Records* (Hafalan Surah)
     - *Worship Records* (Hafalan Doa/Shalat)

---

## 3. Desain API yang Harus Dibuat di Next.js

Berdasarkan skema `lib/schema.ts`, berikut adalah *endpoint* yang harus dibangun di Vercel:

1. `POST /api/mobile/auth/login` 
   - Mengecek `users` untuk email/password. Mengembalikan *token* dan `teacherId`.
2. `GET /api/mobile/parent/student/:slug` 
   - Menarik profil anak (Join `students` dengan `studyGroups`).
3. `POST /api/mobile/teacher/scan-qr` 
   - Menerima `studentId` dan melakukan `db.insert(attendance)`.
4. `GET /api/mobile/teacher/students` 
   - Melakukan *query* `db.select().from(students).where(eq(students.groupId, ...))` untuk menampilkan murid-murid sang guru.
5. `POST /api/mobile/teacher/learning-records` 
   - Melakukan `db.insert(learningRecords)` untuk progres Iqro/Al-Quran harian.

---

## 4. Langkah Selanjutnya
1. **API Development:** Kita perlu membuat ke-5 *endpoint* API di atas di dalam folder Next.js-mu.
2. **Pembuatan Fitur Cetak QR:** Menambahkan fitur agar Admin di Web bisa mencetak kartu berisi QR Code `studentId`/`slug`.
3. **Pembangunan Mobile App:** Membangun aplikasi Expo/React Native.
