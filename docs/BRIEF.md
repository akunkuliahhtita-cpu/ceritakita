# CODEX BUILD BRIEF: CeritaKita (Mental Health & Well-being)

> Letakkan file ini di root repo sebagai `AGENTS.md` (atau tempel sebagai prompt utama).
> Taruh 2 gambar referensi di `/design-reference/`: `ui-reference.jpg` (layout yoga) dan `logo.jpg` (logo CeritaKita). **Lihat kedua gambar itu sebelum menulis UI apa pun.**

---

## 0. Aturan Kerja untuk Agent

1. Kerjakan **per fase** (lihat bagian 14). Setelah tiap fase: jalankan `pnpm lint && pnpm typecheck && pnpm build`, perbaiki semua error, lalu commit.
2. Jangan menghasilkan desain generik "AI slop". UI **wajib meniru struktur, bentuk, spacing, dan nuansa referensi** (bagian 3), dengan warna dari logo (bagian 2).
3. Semua teks UI dalam **Bahasa Indonesia** (santai, hangat, tidak menggurui).
4. TypeScript strict. Tidak ada `any` tanpa alasan. Validasi semua input dengan **Zod** (client + server).
5. Jangan hardcode secret. Semua lewat env (bagian 12). Sediakan `.env.example`.
6. Mobile-first, responsif, dan lolos Lighthouse ≥ 90 (Performance, Accessibility, SEO).
7. Sediakan `seed` data demo agar semua halaman langsung terlihat penuh saat dijalankan.
8. Tulis `README.md` berisi setup lokal, setup Supabase, deploy Vercel, dan cara membuat admin pertama.

---

## 1. Ringkasan Produk

**CeritaKita**: platform kesehatan mental & well-being untuk pengguna Indonesia. Tempat aman untuk bercerita tanpa takut di-judge.

### Fitur Utama (User)
1. **Ruang Cerita Anonim**: posting cerita/perasaan secara anonim; pembaca bisa memberi reaksi (peluk, semangat, aku juga) dan komentar suportif. Identitas penulis tidak pernah tampil ke user lain.
2. **Mood Tracker Harian**: catat mood (skala 1–5 + emoji + tag perasaan + catatan singkat), grafik mingguan/bulanan, deteksi pola sederhana (hari terbaik/terberat, tag terbanyak).
3. **Journaling (Diary Digital)**: tulis jurnal privat (judul, isi, mood opsional, tag), pencarian, dan kalender. Hanya pemilik yang bisa baca.
4. **Konten Edukasi**: artikel, tips, dan video. **Video diambil dari link YouTube** yang dimasukkan admin (embed dengan `youtube-nocookie.com`, thumbnail & judul bisa auto-diambil dari ID video).

### Model Bisnis (Revenue Streams)
1. **Freemium**: gratis untuk fitur inti; fitur lanjutan (konsultasi ahli, insight mendalam, rekomendasi personal) hanya Premium.
2. **Subscription**: paket Bulanan & Tahunan untuk akses penuh (emotional tracker lanjutan, konten premium, personalisasi).
3. **Sponsored Content & Partnership**: slot konten sponsor dari brand relevan (wellness, edukasi, self-care), diberi label jelas "Disponsori", dikelola dari admin.

---

## 2. Design Tokens (Ambil dari Logo)

Logo: gradasi **oranye → pink/magenta → ungu**, teks ungu tua, latar putih hangat.

```css
:root {
  /* Brand (dari logo) */
  --orange-400: #F9A03F;
  --orange-500: #F7893B;
  --pink-500:   #EC4F8B;
  --magenta-600:#C93A8E;
  --purple-600: #8E2F9C;
  --purple-800: #5E1F73;   /* teks judul / wordmark */
  --purple-900: #3F1450;

  /* Gradient utama (logo) */
  --grad-brand: linear-gradient(135deg, #F9A03F 0%, #EC4F8B 45%, #8E2F9C 100%);
  --grad-soft:  linear-gradient(180deg, #FFF1E6 0%, #FDE7F3 50%, #F1E4FA 100%);

  /* Surface pastel (pengganti lavender di referensi) */
  --bg:          #FBF8FD;
  --surface:     #FFFFFF;
  --tint-lilac:  #F1E7FA;  /* seperti section "What our client say" */
  --tint-pink:   #FDE6F1;
  --tint-peach:  #FFEBDD;
  --tint-sage:   #E4F1EC;  /* chip aksen netral seperti di referensi */

  --text:        #2A1236;
  --text-muted:  #7A6A86;
  --border:      #EADFF2;
  --success: #2E9E6B; --danger: #D64545; --warning: #E8A33B;

  --radius-sm: 14px; --radius-md: 24px; --radius-lg: 36px; --radius-xl: 56px;
  --shadow-soft: 0 12px 40px -12px rgba(142,47,156,.25);
}
```

- **Font**: `Plus Jakarta Sans` (via `next/font`) untuk heading & body. Heading weight 500–600, besar dan lega, letter-spacing sedikit rapat.
- Tombol utama = **pill** dengan `--grad-brand` + ikon panah `→`. Tombol sekunder = pill putih/outline ungu.
- Dark mode: opsional di fase akhir (jangan mengorbankan fidelitas light mode).

---

## 3. Spesifikasi Desain (Wajib Mengikuti Referensi)

Ikuti struktur referensi **section demi section**. Gambar referensi menampilkan desktop (kiri) dan mobile (kanan).

**Karakter visual yang harus ada:**
- Latar halaman gradasi lembut (lilac → pink → peach) dengan kartu putih besar bersudut sangat bulat.
- **Bentuk organik**: foto/ilustrasi dalam masker **arch (lengkung atas)**, **blob**, dan **lingkaran**; kartu dengan radius 36–56px.
- **Floating stat cards** kecil di hero (angka + label), ada pill video "2.4K Happy Customer".
- Teks tipis, banyak whitespace, hierarki jelas.
- Ikon panah kecil ↗ di pojok kartu.
- Micro-interaction halus (hover lift, fade-up on scroll, marquee). Gunakan `framer-motion`, hormati `prefers-reduced-motion`.

### 3.1 Landing Publik (belum login)

1. **Navbar** pill melayang: logo CeritaKita (kiri) · Beranda, Fitur, Edukasi, Harga, Tentang · tombol *Masuk* / *Mulai Gratis*. Mobile: logo + hamburger.
2. **Hero**: judul besar (contoh: *"Tempat aman untuk semua ceritamu."*), tombol **Mulai Bercerita →**, blok kecil "Tentang" + *Baca selengkapnya*, **visual arch besar di tengah** (ilustrasi/foto orang tenang dengan gradasi brand + teks melingkar), dua gambar kecil berbentuk blob/lingkaran di kiri & kanan, **stat cards**: jumlah pengguna, jumlah cerita, jumlah artikel/video (angka bisa diatur admin). Pill "2.4K+ pengguna" berisi avatar.
3. **Fitur (horizontal scroll cards)**: 4 kartu tinggi bergradien pastel dengan gambar + judul + deskripsi + panah ↗: Ruang Cerita Anonim, Mood Tracker, Journaling, Edukasi.
4. **"Perjalanan menuju dirimu sendiri"**: satu gambar/video besar bermasker rounded dengan tombol play bercincin teks melingkar + kolom 3 gambar kecil bertumpuk di kanan, teks pendek + avatar group + tombol *Pelajari lebih lanjut*.
5. **Edukasi pilihan**: grid 3 kartu artikel/video terbaru (video → modal player YouTube).
6. **Harga / Premium**: 3 kartu (Gratis, Bulanan, Tahunan) dengan badge "Paling hemat" di tahunan. Nama, harga, fitur diambil dari DB (admin yang atur).
7. **"Apa kata mereka"** (testimoni): section dengan latar `--tint-lilac` bersudut sangat bulat, **carousel berjalan otomatis** (lihat 3.3).
8. **"Bergabung dengan gerakan"**: awan **tag/chip miring** bertumpuk berwarna pastel (Tenang, Berani Bercerita, Self-Aware, Tumbuh, Didengar, dll.) persis gaya referensi. Isi chip bisa diatur admin.
9. **CTA banner** gradasi ungu→magenta bersudut sangat bulat: "Siap mulai perjalananmu?" + form email + tombol **Daftar Gratis →**.
10. **Footer**: logo, menu, sosmed, link Kebijakan Privasi / Syarat, © tahun dinamis, **kotak bantuan darurat** (lihat bagian 9).

### 3.2 Landing Setelah Login (Dashboard User)

Tetap satu bahasa visual. Layout: sidebar pill/bottom-nav (mobile) + konten.

- **Salam**: "Halo, {nama panggilan} 👋 Apa kabarmu hari ini?" + **quick mood check-in** (5 emoji besar bulat).
- **Kartu ringkas**: streak hari berturut-turut, rata-rata mood 7 hari (sparkline), jurnal terakhir.
- **Shortcut** 4 kartu: Bercerita, Mood, Jurnal, Edukasi.
- **Cerita komunitas** terbaru (feed anonim) + **rekomendasi konten edukasi**.
- **Kartu Premium** (jika belum premium) dengan CTA *Upgrade*; jika premium tampilkan masa aktif.
- **Slot Sponsor** (label "Disponsori") bila ada.
- Halaman: `/app`, `/app/cerita`, `/app/mood`, `/app/jurnal`, `/app/edukasi`, `/app/premium`, `/app/review`, `/app/profil`.

### 3.3 Carousel Testimoni/Review (Wajib)

- Dua baris **marquee berjalan berlawanan arah** (baris atas kanan→kiri, baris bawah kiri→kanan), loop tanpa putus, **pause saat hover/touch**, kartu sedikit miring seperti referensi.
- Kartu: avatar, nama, bintang, kutipan, chip paket/fitur terkait, ikon kutip.
- Hanya tampilkan review berstatus `published`. Boleh admin menandai `featured` untuk dipilih tampil di landing.
- Implementasi CSS keyframes (translateX) + duplikasi track; aksesibel (tombol pause, `prefers-reduced-motion` → scroll manual).

---

## 4. Tech Stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (kustomisasi total sesuai token)**
- **Supabase** (Postgres + Auth + Storage + RLS) → cocok dengan Vercel serverless
- **Auth: login via email** (email+password dan magic link/OTP; verifikasi email wajib). Opsional Google OAuth.
- **Drizzle ORM** atau Supabase client + migration SQL di `/supabase/migrations`
- **Zod**, **react-hook-form**, **TanStack Query** (seperlunya), **Recharts** (grafik mood), **framer-motion**
- **Rich text editor admin**: Tiptap (simpan JSON + HTML tersanitasi dengan `sanitize-html`)
- **Upload gambar**: Supabase Storage (bucket `media`, publik baca; tulis hanya admin/pemilik) + kompresi & resize sisi klien (`browser-image-compression`), tampil dengan `next/image`
- **Email transaksional**: Resend (verifikasi, reset password, notifikasi pembayaran)
- **Rate limit**: Upstash Redis (atau tabel counter) untuk login, posting, review, upload bukti bayar
- Package manager: **pnpm**

---

## 5. Peran & Hak Akses

| Peran | Akses |
|---|---|
| Tamu | Landing, edukasi publik, harga, review (baca) |
| User | Semua fitur user, tulis review, bayar premium |
| Admin | Semua panel admin |
| (Opsional) Editor | CMS, artikel, SEO, tanpa akses pembayaran/QRIS |

Gunakan **RLS ketat** di semua tabel. Cek peran di server (middleware + server action), bukan hanya di UI. Admin pertama dibuat lewat env `ADMIN_EMAIL` + script `pnpm seed:admin`.

---

## 6. Skema Database (ringkas, buat migration lengkap)

- `profiles` (id=auth.uid, display_name, avatar_url, role, is_premium_until, created_at)
- `stories` (id, author_id [**disembunyikan dari API publik**], body, tags[], status: `published|hidden|removed`, report_count, created_at)
- `story_reactions` (story_id, user_id, type), `story_comments` (id, story_id, author_id, body, status)
- `mood_entries` (id, user_id, date [unik per hari], score 1–5, emotions[], note)
- `journal_entries` (id, user_id, title, content, mood_score, tags[], created_at) — **privat via RLS**
- `articles` (id, slug, title, excerpt, content, cover_url, category, is_premium, status, published_at, seo jsonb)
- `videos` (id, title, youtube_url, youtube_id, category, is_premium, status)
- `plans` (id, name, slug, price_idr, period: `free|monthly|yearly`, features[], is_highlighted, is_active, sort)
- `orders` (id, user_id, plan_id, base_amount, unique_code, total_amount, status: `pending|awaiting_verification|paid|rejected|expired`, proof_url, note, expires_at, verified_by, verified_at)
- `payment_settings` (id, qris_image_url, merchant_name, provider_label default "DANA", instructions, order_expiry_minutes, unique_code_enabled)
- `reviews` (id, user_id, rating 1–5, title, body, photos[], status: `published|hidden|removed|pending`, is_featured, helpful_count, admin_note, created_at) — **unik 1 review per user (boleh edit)**
- `review_votes` (review_id, user_id), `reports` (id, target_type, target_id, reporter_id, reason: `spam|sara|kekerasan|lainnya`, detail, status, handled_by)
- `pages` (id, slug, title, status, blocks jsonb [array blok terurut], seo jsonb, updated_at)
- `site_settings` (key, value jsonb): nama situs, logo, favicon, kontak, sosmed, stat angka hero, chip "gerakan", teks footer, dll.
- `seo_settings` (global: title template, default description, OG image, canonical base, robots, verifikasi Google/Bing, JSON-LD organisasi)
- `sponsors` (id, name, logo_url, title, description, link_url, placement, label, start_at, end_at, is_active)
- `media` (id, url, path, alt, size, mime, uploaded_by)
- `audit_logs` (id, actor_id, action, target, meta, created_at) — catat semua aksi admin (takedown, verifikasi bayar, ganti QRIS)

---

## 7. Admin Panel (`/admin`) — Wajib Lengkap

UI admin tetap bertema brand tetapi lebih padat & fungsional. Hanya `role=admin`.

1. **Dashboard**: pengguna baru, pendapatan bulan ini, order menunggu verifikasi, laporan belum ditangani, grafik pendaftaran & pendapatan.
2. **Pages / CMS (edit halaman web)**:
   - Editor **berbasis blok** (drag & drop urutan): Hero, Fitur, Galeri, Video, Teks kaya, Harga, Testimoni, Chip "gerakan", CTA, FAQ, Sponsor.
   - Edit teks, tombol, link, gambar langsung dari panel; **preview live** + simpan draft / publish.
   - Bisa membuat halaman baru (slug kustom: Tentang, Kebijakan Privasi, dll.).
   - Landing publik dan beberapa bagian dashboard user dirender dari data ini.
3. **Media Library**: upload (drag & drop, multi-file), crop/resize dasar, alt text, cari, hapus (cek dipakai/tidak), pilih gambar dari library di semua editor.
4. **Produk / Paket Langganan**: CRUD plan (nama, harga IDR, periode, fitur, highlight, aktif/nonaktif, urutan). Dukungan produk tambahan ke depan (kolom `type`).
5. **Pembayaran & QRIS**:
   - Upload gambar **QRIS statis DANA**, nama merchant, instruksi bayar, durasi kedaluwarsa order, toggle kode unik. **Semua bisa diganti kapan saja** tanpa deploy.
   - Daftar order dengan filter status; lihat **bukti transfer**; tombol **Setujui** (set `is_premium_until` otomatis sesuai periode) / **Tolak** (+ alasan, email notifikasi ke user).
   - Export CSV.
6. **Moderasi Review** (gaya Shopee): daftar semua review + laporan; filter bintang/status; aksi **Takedown** (status `hidden`/`removed` + alasan: spam / SARA / lainnya), **Restore**, **Feature** ke landing, balas sebagai admin (opsional). Semua tercatat di audit log.
7. **Moderasi Cerita & Komentar**: antrean laporan, takedown, peringatan, blokir user. Deteksi awal kata kasar/SARA/spam (filter kata + rate limit) → otomatis masuk antrean jika terdeteksi.
8. **Konten Edukasi**: CRUD artikel (Tiptap, cover, kategori, premium/gratis, jadwal terbit) dan video (**tempel link YouTube** → validasi, ambil ID, preview, thumbnail otomatis).
9. **Sponsor & Partnership**: CRUD slot sponsor, penempatan (landing / dashboard / artikel), periode tayang, statistik klik & impresi sederhana.
10. **Panel SEO** (lihat bagian 8).
11. **Pengguna**: daftar, cari, ubah peran, beri/cabut premium manual, suspend.
12. **Pengaturan Situs**: nama, logo, favicon, warna aksen (dari token), kontak, sosmed, stat hero, chip gerakan, teks footer, nomor/kanal bantuan darurat.
13. **Audit Log**: tabel aksi admin.

---

## 8. Panel SEO (Admin)

- **Global**: title template (`%s | CeritaKita`), default meta description, default OG image, nama situs, Twitter card, canonical base URL, verifikasi Search Console/Bing, Google Analytics/Plausible ID.
- **Per halaman / artikel**: meta title, description, slug, canonical, OG image, `noindex`, **preview hasil Google & kartu share sosial**, indikator panjang karakter, skor SEO sederhana (judul, deskripsi, heading, alt gambar).
- **Teknis**: `sitemap.xml` dinamis (halaman + artikel), `robots.txt` yang bisa diedit dari admin, **JSON-LD** (Organization, WebSite, Article, VideoObject, FAQPage), redirect manager (301), halaman 404 kustom.
- Gunakan `generateMetadata` Next.js yang membaca dari DB. `/app/*` dan `/admin/*` otomatis `noindex`.

---

## 9. Keamanan, Privasi, & Etika (Penting untuk Mental Health)

- **Anonimitas nyata**: `author_id` tidak pernah dikirim ke klien lain; nama samaran acak (mis. "Kupu-kupu Tenang") per cerita; jangan tampilkan waktu presisi yang bisa mengidentifikasi.
- **Disclaimer jelas**: CeritaKita bukan pengganti tenaga profesional/layanan darurat.
- **Deteksi kata krisis** (mis. bunuh diri, menyakiti diri) pada cerita/jurnal/komentar → tampilkan kartu bantuan lembut dengan kontak layanan darurat & hotline kesehatan jiwa Indonesia, dan tandai untuk moderasi (tanpa menyalahkan user). Kontak hotline **disimpan di `site_settings`** supaya admin bisa memperbarui; **verifikasi nomor terbaru sebelum rilis**.
- Jurnal & mood bersifat privat (RLS). Sediakan **ekspor data** dan **hapus akun** (hapus semua data terkait).
- Halaman **Kebijakan Privasi** & **Syarat Penggunaan** (template awal, tandai agar ditinjau ahli hukum, mengacu UU PDP).
- Sanitasi semua HTML, CSP header, CSRF aman via server actions, validasi MIME & ukuran upload (gambar ≤ 5 MB), rate limit, honeypot pada form publik.
- Review/cerita yang melanggar (spam/SARA/kekerasan) → laporan oleh user + takedown admin.

---

## 10. Alur Pembayaran QRIS Statis (DANA)

1. User pilih paket di `/app/premium` → sistem membuat `order` (status `pending`).
2. Total = harga + **kode unik 3 digit** (jika aktif) agar mudah dicocokkan, contoh Rp 49.123.
3. Tampilkan **gambar QRIS dari `payment_settings`**, nominal tepat (tombol salin), hitung mundur kedaluwarsa, dan instruksi (bisa diedit admin).
4. User bayar via aplikasi apa pun yang mendukung QRIS → **upload bukti pembayaran** (gambar) → status `awaiting_verification`.
5. Admin dapat notifikasi (email + badge) → cek bukti & mutasi DANA → **Setujui** → premium aktif otomatis + email konfirmasi. **Tolak** → user diberi alasan dan bisa unggah ulang.
6. Order kedaluwarsa otomatis (Vercel Cron) jika tidak dibayar.
7. Catatan: QRIS statis **tidak punya konfirmasi otomatis**; verifikasi manual adalah desain yang disengaja. Buat arsitektur `PaymentProvider` agar nanti mudah diganti ke payment gateway (Midtrans/Xendit) tanpa menulis ulang UI.

---

## 11. Sistem Review (Gaya Shopee)

- Halaman `/review` (publik baca) & `/app/review` (tulis): **ringkasan rating** (rata-rata besar + bar distribusi 5★–1★), **filter** (bintang, dengan foto, terbaru, paling membantu), tombol **"Membantu"** (vote), tombol **Laporkan** (spam / SARA / lainnya).
- User bisa **melihat, mengedit, dan menghapus review miliknya sendiri**, lengkap dengan status (Tayang / Disembunyikan admin + alasan).
- Upload foto review (maks 3 gambar), validasi & kompres.
- Review baru tayang langsung dengan filter otomatis; yang terdeteksi mencurigakan masuk `pending`. Admin bisa takedown kapan saja (bagian 7.6).
- Landing mengambil review `published` + `featured` untuk carousel (3.3).

---

## 12. Environment Variables (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_EMAIL=
CRON_SECRET=
```

---

## 13. Deploy ke Vercel

1. Push ke GitHub → import di Vercel (framework Next.js, pnpm).
2. Isi semua env di Project Settings; tambahkan domain di Supabase Auth → URL Configuration (Site URL & Redirect URLs, termasuk preview).
3. Jalankan migration Supabase + seed, buat bucket Storage `media` dengan policy yang benar.
4. `vercel.json`: cron harian untuk expire order (`/api/cron/expire-orders`, dilindungi `CRON_SECRET`).
5. Pastikan `next.config.ts` mengizinkan domain gambar Supabase di `images.remotePatterns` dan memasang security headers.
6. Tulis checklist go-live di README (domain, SMTP/Resend terverifikasi, Search Console, uji alur bayar end-to-end).

---

## 14. Fase Pengerjaan

1. **Fondasi**: setup Next.js, Tailwind + token bagian 2, font, komponen dasar (Button pill, Card, Chip, Blob/Arch mask, Navbar, Footer), Supabase + migration + RLS, auth email.
2. **Landing publik** sesuai 3.1 (data awal dari seed), carousel 3.3, responsif desktop & mobile persis referensi.
3. **Dashboard user** (3.2): mood tracker, jurnal, cerita anonim, edukasi (YouTube embed).
4. **Premium & QRIS** (bagian 10) + halaman harga.
5. **Review** (bagian 11) + laporan.
6. **Admin panel** (bagian 7): CMS blok, media library, plans, pembayaran/QRIS, moderasi, konten, sponsor, pengguna, pengaturan, audit log.
7. **Panel SEO** (bagian 8) + sitemap/robots/JSON-LD.
8. **Keamanan & etika** (bagian 9), polesan animasi, aksesibilitas, performa.
9. **Testing & deploy**: unit test (Zod schema, util), e2e Playwright (daftar → mood → jurnal → beli premium → admin setujui → review → takedown), deploy Vercel.

---

## 15. Kriteria Selesai (Acceptance Checklist)

- [ ] Tampilan landing publik **sangat mirip struktur & bentuk referensi** (arch hero, blob, kartu fitur scroll, section lilac testimoni, awan chip, CTA banner, mobile layout), berwarna sesuai logo
- [ ] Landing berbeda untuk tamu dan setelah login
- [ ] Login/daftar via email dengan verifikasi; proteksi route
- [ ] Cerita anonim, mood tracker + grafik, jurnal privat, edukasi dengan embed YouTube berfungsi
- [ ] Carousel review dua arah, berjalan otomatis, pause saat hover
- [ ] Review ala Shopee: rating, filter, foto, vote, lapor; user bisa cek review sendiri; admin takedown/restore
- [ ] Admin bisa: upload gambar, edit halaman via blok, kelola paket/produk, ganti QRIS DANA & nominal/instruksi, verifikasi pembayaran, moderasi, kelola SEO
- [ ] Pembayaran QRIS statis end-to-end hingga premium aktif otomatis
- [ ] Sitemap, robots, meta & OG dinamis, JSON-LD
- [ ] RLS teruji: user tidak bisa membaca data user lain; non-admin tidak bisa masuk `/admin`
- [ ] Lint, typecheck, build, e2e lulus; Lighthouse ≥ 90; sukses deploy di Vercel

---

## Tambahan: Halaman Kontak (sudah ada di scaffold)

- Route `/kontak`: tombol & form yang membuka WhatsApp (`wa.me`) ke **+62 857-4229-4415** dengan pesan terisi otomatis (nama, topik, pesan). Tombol melayang "Butuh bantuan?" muncul di semua halaman (`components/WhatsAppFab.tsx`).
- Nomor dibaca dari `lib/site.ts` (env `NEXT_PUBLIC_WHATSAPP_NUMBER`). **TODO fase admin:** pindahkan nomor WhatsApp, jam layanan, dan teks sapaan ke `site_settings` supaya admin bisa mengubahnya dari Pengaturan Situs.
- Tambahkan link Kontak di navbar dashboard user (`/app`) dan sembunyikan tombol melayang di halaman `/admin`.
