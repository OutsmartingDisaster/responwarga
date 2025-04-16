peta menggunakan leafletjs dengan dark theme https://dev.to/deepakdevanand/leaflet-map-dark-theme-5ej0
Rancangan Aplikasi Peta Interaktif Bantuan Darurat Indonesia
Aplikasi ini dirancang untuk membantu tanggap darurat di Indonesia dengan menyediakan platform untuk melaporkan kejadian darurat, menawarkan bantuan, dan mengelola data oleh admin serta responder. Aplikasi ini akan mobile-friendly, dengan antarmuka pengguna (UI) yang modern dan sederhana, pengalaman pengguna (UX) yang intuitif, serta dukungan dark mode secara default.
1. Teknologi Stack
1. Server-Side Rendering (SSR) dengan Next.js
Deskripsi: Next.js adalah framework berbasis React yang mendukung Server-Side Rendering (SSR). Ini memungkinkan halaman dirender di server sebelum dikirim ke pengguna, sehingga mempercepat waktu muat dan mengurangi beban pada perangkat klien.
Alasan Pemilihan: 
Cocok untuk aplikasi web yang perlu diakses di jaringan lambat karena konten sudah dirender sebelumnya.
Mendukung Progressive Web App (PWA) secara bawaan, yang memungkinkan aplikasi bekerja offline atau di kondisi jaringan buruk melalui caching.
Fitur seperti optimasi gambar dan caching bawaan membantu menghemat bandwidth.
2. Database: Supabase (PostgreSQL)
Deskripsi: Supabase menyediakan database PostgreSQL yang skalabel dan efisien sebagai bagian dari layanan backend-as-a-service (BaaS).
Alasan Pemilihan: 
Anda telah memilih Supabase, dan PostgreSQL-nya ringan serta mendukung operasi real-time melalui langganan (subscription).
Cocok untuk aplikasi dengan koneksi terbatas karena SDK-nya ringan dan hanya mengambil data yang diperlukan.
3. Storage: Supabase Storage
Deskripsi: Supabase Storage adalah solusi penyimpanan file yang terintegrasi, memungkinkan Anda menyimpan dan mengelola file seperti gambar atau dokumen dengan aman.
Alasan Pemilihan: 
Integrasi langsung dengan Supabase Auth dan Database membuatnya mudah digunakan.
Mendukung akses file yang efisien, yang penting untuk mengurangi penggunaan data di jaringan lambat.
4. Autentikasi: Supabase Auth
Deskripsi: Supabase Auth menyediakan sistem autentikasi yang mendukung login melalui email, OAuth (seperti Google atau GitHub), dan metode lainnya.
Alasan Pemilihan: 
Terintegrasi penuh dengan Supabase Database dan Storage, sehingga Anda tidak perlu setup tambahan.
Ringan dan cepat, cocok untuk aplikasi yang diakses di kondisi low bandwidth.
5. API: REST API dari Supabase
Deskripsi: Supabase secara default menyediakan REST API untuk berinteraksi dengan database dan storage.
Alasan Pemilihan: 
Sederhana dan langsung bisa digunakan tanpa konfigurasi tambahan.
Jika Anda membutuhkan efisiensi lebih (opsional), Anda bisa menambahkan GraphQL untuk meminta hanya data yang dibutuhkan, meskipun ini memerlukan setup tambahan.
6. Optimasi untuk Low Bandwidth
Untuk memastikan aplikasi tetap responsif di jaringan lambat, beberapa teknik berikut akan diterapkan dengan stack ini:
Service Workers dan PWA: 
Menggunakan Next.js untuk mengimplementasikan PWA, memungkinkan caching aset dan data sehingga aplikasi bisa diakses offline atau di jaringan buruk.
Compression dan Minification: 
Next.js secara otomatis mendukung kompresi (misalnya Gzip) dan minifikasi untuk file CSS, JavaScript, dan gambar, mengurangi ukuran data yang dikirim ke pengguna.
Lazy Loading dan Code Splitting: 
Fitur bawaan Next.js ini memastikan hanya komponen atau data yang dibutuhkan yang dimuat, mengoptimalkan penggunaan bandwidth.
Ringkasan Teknologi Stack
Berikut adalah ringkasan stack yang direkomendasikan:
Framework Server: Next.js (dengan SSR dan PWA)
Database: Supabase (PostgreSQL)
Storage: Supabase Storage
Autentikasi: Supabase Auth
API: REST API dari Supabase (GraphQL opsional)
Optimasi: Service Workers, compression, minification, lazy loading, code splitting
Dark Mode: Aplikasi akan menggunakan tema dark mode secara default untuk seluruh elemen, termasuk peta yang disesuaikan dengan gaya gelap untuk mengurangi ketegangan mata dan menghemat baterai perangkat seluler.
2. Desain UI dan UX
Mobile-First: Dioptimalkan untuk perangkat seluler dengan tata letak responsif.
Dark Mode: Seluruh aplikasi, termasuk peta, header, form, dan elemen UI lainnya, akan menggunakan skema warna gelap secara default. Pengguna dapat beralih ke mode terang melalui pengaturan jika diinginkan.
Header:
Judul Aplikasi: "Peta Bantuan Darurat Indonesia" (font besar, tebal, warna kontras dengan latar gelap).
Banner Pinned: Dapat diatur oleh admin, berisi informasi penting atau pengumuman (contoh: "Peringatan Banjir di Jakarta - Evakuasi Segera!"). Banner ini ditempatkan di bawah judul dalam header.
Tombol Filter: Di pojok kiri atas, memungkinkan pengguna menyortir laporan dan kontribusi berdasarkan kriteria tertentu.
Navbar Bawah:
Peta: Kembali ke halaman peta.
Info Terbaru: Menampilkan tweet terbaru dari akun Twitter relevan dan prakiraan cuaca dari lokasi pengguna.
Panggilan SOS: Tombol untuk panggilan darurat ke nomor 112.
Lainnya: Akses ke pengaturan atau fitur tambahan.
3. Fitur Pelaporan Kejadian Darurat
Form Pelaporan: Mengambang di atas peta, mencakup:
Nama lengkap
Nomor telepon
Email
Alamat (dengan izin berbagi lokasi dan parsing ke koordinat)
Foto (dari kamera atau galeri)
Deskripsi detail kejadian
Jenis bantuan yang dibutuhkan: Evakuasi, Makanan & Air, Medis, Lainnya, Tidak ada bantuan yang dibutuhkan
Kotak centang persetujuan: "Saya menyatakan bahwa laporan ini adalah nyata dan saya bertanggung jawab atas kebenarannya di hadapan hukum."
Visualisasi pada Peta: Setiap laporan memiliki ID unik dan ditampilkan pada peta dengan ID laporan, foto, dan deskripsi kejadian dalam tema dark mode.
Manajemen oleh Admin: Admin dan responder dapat mengedit status laporan (Perlu Verifikasi, Aktif, Selesai) dari backend. Admin juga dapat menambahkan kejadian secara manual.
4. Fitur Kontribusi Bantuan
Form Kontribusi: Ditempatkan di bawah form pelaporan, mencakup:
Nama lengkap
Nomor telepon
Email
Alamat (dengan izin berbagi lokasi dan parsing ke koordinat)
Foto (dari kamera atau galeri)
Deskripsi detail kontribusi, dengan opsi seperti:
Shelter: Kapasitas orang, fasilitas yang tersedia (makanan/air, obat-obatan, pakaian kering, listrik, internet, dll.)
Makanan/Air Saja: Jumlah yang tersedia
Obat-obatan Saja: Jenis dan jumlah yang tersedia
Pakaian Kering: Jenis dan jumlah yang tersedia
Desain UX: Pengguna memilih jenis kontribusi dari daftar opsi, dan form menyesuaikan field yang relevan berdasarkan pilihan, dengan tampilan dark mode.
5. Backend dan Akses Admin
Manajemen Laporan dan Kontribusi: Admin dan responder dapat mengedit laporan serta kontribusi dari halaman backend masing-masing.
Manajemen Pengguna: Admin dapat mengelola akses dan peran pengguna (responder, kontributor).
Spreadsheet Kejadian: Admin dapat membuat spreadsheet untuk kejadian, diurutkan berdasarkan area, yang hanya dapat diakses oleh admin dan responder.
Pengaturan Banner Pinned: Admin dapat mengatur banner pinned dari backend, termasuk mengunggah gambar, memasukkan teks, dan menentukan durasi tampilan.
Pengaturan Akun Twitter: Admin dapat mengatur akun Twitter yang ditampilkan di "Info Terbaru".
6. Login/Register
Hanya untuk Responder dan Kontributor: UI sederhana untuk login/register dengan field:
Nama lengkap
Nomor telepon
Email
Kata sandi
Verifikasi: Melalui email atau nomor telepon dengan kode OTP untuk memastikan keaslian pengguna.
7. Fitur Tambahan
Integrasi Cuaca Real-Time: Menampilkan prakiraan cuaca dari lokasi pengguna pada halaman "Info Terbaru".
Integrasi Media Sosial: Menampilkan tweet terbaru dari akun Twitter relevan dan memungkinkan pengguna berbagi laporan atau kontribusi ke media sosial.
Notifikasi Darurat: Pengguna dapat menerima notifikasi push untuk kejadian darurat di area mereka.
8. Dark Mode
Default Aktif: Aplikasi akan menggunakan dark mode secara default untuk seluruh tampilan, termasuk peta, header, form, dan elemen UI lainnya.
Pengaturan Tema: Pengguna dapat mengganti tema ke mode terang dari pengaturan jika diinginkan.
