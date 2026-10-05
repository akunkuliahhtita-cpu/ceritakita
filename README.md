# CeritaKita
1. `pnpm install` (atau npm install)
2. Salin `.env.example` ke `.env.local`, isi kunci Supabase.
3. Terapkan migration mengikuti langkah di bawah.
4. `pnpm dev` lalu buka http://localhost:3000
5. Taruh gambar referensi di `design-reference/`, buka folder ini di Codex. Ia akan membaca `AGENTS.md` dan melanjutkan fase berikutnya.
6. Deploy: push ke GitHub, import ke Vercel, isi env yang sama.


## Menerapkan migration Supabase

Untuk project baru, buka Supabase Dashboard → SQL Editor, tempel seluruh isi `supabase/ALL_IN_ONE.sql`, lalu jalankan sekali. File ini menggabungkan migration 0001 dan 0002.

Untuk project yang sudah menjalankan 0001, tempel hanya `supabase/migrations/0002_profile_trigger.sql`. Migration 0002 aman dijalankan ulang: profil lama dipertahankan, pengguna yang belum punya profil diisi, dan pengguna baru mendapatkan profil otomatis.

Jika Supabase CLI sudah terpasang, jalankan dari root repo:

```sh
supabase link
supabase db push
```

Pilih project tujuan saat proses link. Jika 0001 sebelumnya diterapkan melalui SQL Editor, pastikan riwayat migration CLI sudah sesuai sebelum `db push`; jangan menjalankan ALL_IN_ONE lagi pada project yang sudah memiliki tabel.
