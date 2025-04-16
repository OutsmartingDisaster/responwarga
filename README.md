# Respon Warga

Respon Warga adalah aplikasi web yang dirancang untuk menyederhanakan koordinasi antara anggota masyarakat yang membutuhkan bantuan selama keadaan darurat dan organisasi responder yang menawarkan bantuan. Aplikasi ini menyediakan wadah berbasis data untuk mengelola respon bencana, melacak sumber daya, mencatat aktivitas, dan memvisualisasikan situasi pada peta interaktif.

ResponWarga dibuat dengan bantuan Cursor, Cline dan Roocode menggunakan GPT4.1 dan Gemini 2.5 Pro. Jadi sudah pasti kodenya berantakan!!
Bantu kami untuk bisa membuat platform ini lebih baik!

## Tujuan Proyek

Tujuan utama Respon Warga adalah menjembatani kesenjangan komunikasi selama krisis, memungkinkan alokasi sumber daya dan personel yang efisien dengan menyediakan informasi *real-time* dan kemampuan manajemen kepada organisasi responder terdaftar.

## Fitur Utama (Fokus Responder)

Aplikasi ini menyediakan dasbor khusus untuk organisasi responder terdaftar, memungkinkan mereka mengelola operasi secara efektif:

-   **Dasbor Responder (`/responder/[org-slug]/dashboard`):**
    -   **Peta Interaktif:** Memvisualisasikan laporan darurat masuk yang memerlukan perhatian.
    -   **Manajemen Respon Bencana:**
        -   Membuat upaya respon bencana baru (mis., "Banjir Jakarta Timur").
        -   Melihat dan mengelola daftar respon **Aktif** dan **Selesai**.
        -   Mengedit detail respon yang ada.
        -   Menghapus respon (dengan konfirmasi).
    -   **Tampilan Detail Respon (`/responder/[org-slug]/dashboard/responses/[responseId]`):**
        -   Melihat detail komprehensif dari respon spesifik (info, peta lokasi, status).
        -   Melihat anggota tim yang ditugaskan untuk respon tersebut.
        -   Menugaskan responder ke **Laporan Darurat** yang terkait dengan respon.
        -   Melihat dan menambahkan log terkait (Aktivitas, Inventaris, Pengiriman).
        -   Menandai respon aktif sebagai "Selesai".
    -   **Pencatatan Harian (Log Harian) (`/responder/[org-slug]/dashboard` -> Log Harian):**
        -   Antarmuka khusus untuk log operasional harian (awalnya terpisah dari respon bencana spesifik).
        -   Mencatat waktu Check-in/Check-out (Struktur tabel/*Placeholder* ada).
        -   Mencatat pembaruan Inventaris (item, jumlah).
        -   Mencatat Aktivitas yang dilakukan oleh tim.
        -   Mencatat Pengiriman yang dilakukan.
        -   Pengeditan *inline* untuk kolom log harian utama (Lokasi Pos Komando Lapangan, Catatan).
-   **Autentikasi & Otorisasi:**
    -   Login aman untuk anggota organisasi (`/masuk`).
    -   Kontrol akses berbasis peran (*role-based access control*) (Admin, Admin Organisasi, Responder) yang menentukan visibilitas fitur dan tindakan (mis., hanya admin yang dapat mengelola respon atau mengubah status).
-   **Manajemen Organisasi:**
    -   Proses *onboarding* untuk organisasi baru.
    -   Manajemen profil untuk organisasi.
    -   Kemampuan manajemen Tim/Responder (Lihat/Tambah/Kelola anggota - *Placeholder*/UI ada).

*(Catatan: Formulir pelaporan darurat dan kontribusi publik mungkin ada tetapi dikelola secara terpisah atau di bawah lingkup yang berbeda dari fitur dasbor responder utama yang dijelaskan di atas.)*

## *Tech Stack*

-   **Frontend**:
    -   *Next.js* 14 dengan *App Router*
    -   *React*
    -   *TypeScript*
    -   *Tailwind CSS*
    -   *shadcn/ui* & *Radix UI* (Terutama di komponen dasbor yang lebih baru)
    -   *React Hooks* untuk manajemen *state*
-   **Pemetaan (*Mapping*)**:
    -   *Leaflet* dengan *react-leaflet*
-   **Backend & Database**:
    -   *Supabase* (*Authentication*, Database *PostgreSQL*, *Realtime Subscriptions*, *Storage*)
-   **UI/UX**:
    -   `react-hot-toast` untuk notifikasi

## Pengaturan Lokal

### Prasyarat

-   *Node.js* 18.x atau lebih tinggi
-   *npm* atau *yarn*
-   Akun *Supabase*

### Langkah 1: Clone repositori

```bash
git clone https://github.com/OutsmartingDisaster/respon-warga.git
cd respon-warga
```

### Langkah 2: Instal dependensi

```bash
npm install
# atau
yarn install
```

### Langkah 3: Siapkan *Supabase*

1.  Buat proyek baru di [*Supabase*](https://supabase.com/)
2.  Terapkan skema database yang diperlukan. Anda dapat menemukan migrasi di folder `/supabase/migrations`. Terapkan menggunakan *Supabase CLI* atau salin *SQL* ke *Supabase SQL Editor*.
3.  Siapkan autentikasi (pastikan penyedia Email diaktifkan).
4.  Konfigurasikan *Storage buckets* jika diperlukan untuk fitur seperti unggah foto.

### Langkah 4: Konfigurasikan variabel lingkungan

Buat file `.env.local` di direktori root dengan variabel berikut dari pengaturan proyek *Supabase* Anda (bagian *API*):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Langkah 5: Jalankan development server

```bash
npm run dev
# atau
yarn dev
```

Buka `http://localhost:3000` dengan *browser* Anda. Anda mungkin perlu menavigasi ke `/masuk` untuk *login* atau `/daftar` untuk mendaftarkan organisasi/pengguna tergantung pada alur yang diterapkan.

## Struktur Database

Aplikasi ini sangat bergantung pada tabel *Supabase*, termasuk:

-   `organizations`: Menyimpan detail tentang organisasi responder (nama, *slug*, dll.).
-   `profiles`: Profil pengguna yang terhubung ke `auth.users`, berisi peran (*role*) (`admin`, `org_admin`, `responder`) dan `organization_id`.
-   `disaster_responses`: Tabel utama untuk mengelola upaya respon spesifik (terhubung ke organisasi).
-   `emergency_reports`: Menyimpan laporan masuk dari publik (dapat dihubungkan ke `disaster_response_id`).
-   `team_assignments`: Menghubungkan anggota (`profiles`) ke `disaster_responses` spesifik.
-   `daily_logs`: Tabel induk untuk catatan log harian.
-   `activity_logs`, `inventory_logs`, `delivery_logs`: Tabel anak untuk entri log spesifik, berpotensi terhubung ke `daily_logs` dan/atau `disaster_responses`.
-   `responder_checkins`: (Tabel mungkin ada atau fungsionalitasnya ada di dalam `daily_logs`).

*(Lihat `/supabase/migrations` untuk definisi skema terperinci)*

## Deployment

### Deployment Frontend (*Cloudflare Pages*)

1.  *push* kode Anda ke repositori *GitHub*.
2.  Hubungkan repositori Anda ke [*Cloudflare Pages*](https://pages.cloudflare.com/).
3.  Konfigurasikan pengaturan *build*:
    -   Perintah *build*: `npm run build`
    -   Direktori output *build*: `.next`
4.  Tambahkan variabel lingkungan di pengaturan proyek *Cloudflare Pages*.
5.  *Deploy* proyek.

### Deployment Backend (*Supabase*)

Proyek *Supabase* Anda sudah di-*deploy* di *cloud*. Pastikan untuk:

1.  Menyiapkan kebijakan *Row Level Security (RLS)* yang sesuai untuk produksi.
2.  Mengkonfigurasi pengaturan *CORS* jika perlu.
3.  Menyiapkan pencadangan (*backup*) database.
4.  Memantau penggunaan agar tetap dalam batas paket Anda.

## Berkontribusi

Kontribusi sangat diterima! 
Silakan kirim *Pull Request* ke repositori [*OutsmartingDisaster/respon-warga*](https://github.com/OutsmartingDisaster/respon-warga).

## Lisensi

Proyek ini dilisensikan di bawah *MIT License* - lihat file LICENSE untuk detailnya.
