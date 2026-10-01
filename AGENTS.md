<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 📑 DOKUMEN KONTEKS ARSITEKTUR & MEMORI JANGKA PANJANG

> **PETUNJUK UNTUK AGEN AI:** Dokumen ini adalah RAM Eksternal dan Memori Jangka Panjang Anda. Anda WAJIB membaca file ini di setiap awal sesi obrolan untuk memahami status proyek dan mematuhi batas token serta keamanan kerja.

---

## 🎯 1. PROFIL PROYEK & TEKNOLOGI
*   **Nama Proyek:** Dashboard Lensa Sibling
*   **Bahasa Pemrograman:** TypeScript
*   **Framework Utama:** Next.js 16 (App Router, Turbopack)
*   **Styling:** Tailwind CSS v4
*   **Database:** PostgreSQL via Supabase
*   **Auth:** Supabase Auth (email/password)
*   **File Storage:** Google Drive API (Service Account)
*   **Charts:** Recharts
*   **Drag & Drop:** @dnd-kit
*   **Icons:** Lucide React
*   **Hosting:** Vercel

---

## 🛡️ 2. ATURAN MUTLAK & BATASAN KEAMANAN (PROTOS EMAN TOKEN)
Anda wajib mematuhi aturan operasional di bawah ini demi efisiensi biaya API dan keamanan sistem:
*   **Surgical Read & Edit:** DILARANG membaca file data besar (seperti CSV, XLSX, JSON) secara utuh. Gunakan perintah pembatas seperti `head -n 5` atau subset `nrows=5` hanya untuk melihat struktur kolom.
*   **No Re-write:** Jangan menulis ulang seluruh isi file kode jika perubahan yang diperlukan hanya mencakup modifikasi satu fungsi kecil.
*   **Infinite Loop Safety:** Jika pengetesan terminal mengalami kegagalan (error) berturut-turut hingga 2 kali, segera hentikan perbaikan otomatis, tampilkan log kesalahan, dan tunggu instruksi baru dari User.

---

## 🔄 3. ALUR KERJA OPERASIONAL (METODE POAC)
Sebelum melakukan modifikasi atau menjalankan perintah apa pun di terminal JetBrains, Anda wajib mengikuti tahapan ini secara berurutan:
1.  **P (Plan):** Rumuskan rencana tertulis langkah-demi-langkah mengenai apa yang akan Anda ubah.
2.  **O (Observe):** Amati dependensi, potensi konflik kode, dan pastikan tidak merusak fungsi yang sudah ada.
3.  **A (Act):** Fase eksekusi kode/terminal. **(HANYA BOLEH DIJALANKAN SETELAH USER MEMBERIKAN "ACC")**.
4.  **C (Check):** Lakukan testing di terminal pasca-perubahan untuk validasi akhir.

---

## 💾 4. CATATAN RIWAYAT & MEMORI PROYEK (STATUS TERAKHIR)
*(Bagian ini wajib Anda perbarui secara mandiri setelah menyelesaikan fase 'Check' yang sukses)*

### 🔹 Progres yang Sudah Selesai & Berhasil:
- Inisialisasi project Next.js 16 dengan TypeScript, Tailwind CSS v4, App Router
- Instalasi dependencies: Supabase, dnd-kit, Recharts, Lucide, googleapis
- Konfigurasi credentials: Supabase URL/Key, Google Drive Service Account
- **Fase 1: Building Foundation**:
  - Core layout, sidebar navigation, auth guard, dan responsivitas mobile
  - Halaman login Supabase Auth
  - CRUD Data Referensi: Kelola Pegawai (`/kelola-pegawai`) & Kelola Faskes (`/kelola-faskes`)
  - Form Builder dasar (`/form/builder`) dengan drag & drop reorder, live preview, save & publish
  - Form Renderer (`/form`) terhubung ke data referensi dan database `form_responses`
  - Dashboard infografis (`/dashboard`) dengan KPI cards, Trend Line, Donut Chart, Bar Charts, dan data table
- **Fase 2: Advanced Field Types & Logic**:
  - Komponen `SignaturePad.tsx` berbasis HTML5 Canvas (mouse & touchscreen support, undo, clear)
  - Engine `conditional-logic.ts` (evaluasi show/hide/require berdasarkan field lain)
  - Engine `calculated-fields.ts` (safe parser dan evaluator formula aritmatika)
  - Integrasi Signature, Audio, Video, Embed, Matrix, dan Calculated Fields ke Form Builder dan Form Renderer
  - Integrasi file upload langsung ke Google Drive API (`/api/upload`)
- **Fase 3: Dashboard Polish, Export, Realtime & Vercel**:
  - Fitur Export data respons ke CSV dari Dashboard
  - Supabase Realtime channel subscription pada tabel `form_responses`
  - Konfigurasi `vercel.json` untuk deployment siap produksi
  - Validasi kompilasi akhir: `npm run build` sukses (exit code 0, 11 routes)

### 🔹 Status Terakhir / Pekerjaan yang Sedang Berjalan:
- **BERHASIL DEPLOY KE PRODUCTION**: Aplikasi aktif di Vercel Production dengan domain `https://dashboard-lensa-sibling.vercel.app` (HTTP 200 OK).
- Seluruh environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, kredensial Google Drive) telah terpasang di Vercel.
- **Fase 4: Redesign Menu & Form Kunjungan**:
  - Sidebar navigasi diubah menjadi hanya 3 item: Dashboard, Admin Setting, Logout
  - Dashboard baru menampilkan Form Kunjungan LENSA-SiBLing (dropdown pegawai/faskes, date picker, pertanyaan alur + gambar, conditional logic Sudah/Belum)
  - Halaman Admin Setting untuk kelola user (tabel user, tambah hak akses via modal)
  - Migrasi SQL `002_user_profiles.sql` untuk tabel `user_profiles` dengan RLS dan auto-create trigger
  - Build verification sukses: `npm run build` exit code 0, 12 routes

### 🔹 Langkah Tindakan Pengguna yang Tersisa:
1. Mengaktifkan Google Drive API melalui tombol **Enable** di Google Cloud Console:
   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=1007260183840
2. Menjalankan skrip `supabase/migrations/001_initial_schema.sql` di SQL Editor Supabase (jika belum).
3. **BARU**: Menjalankan skrip `supabase/migrations/002_user_profiles.sql` di SQL Editor Supabase untuk membuat tabel `user_profiles`.
4. Re-deploy ke Vercel setelah perubahan code terbaru (`git push` atau manual deploy).

---
*Terakhir Diperbarui Oleh Agen pada: 2026-10-02*

