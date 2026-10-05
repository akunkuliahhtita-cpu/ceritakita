begin;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  excerpt text not null default '',
  content text not null,
  category text not null check (char_length(btrim(category)) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  youtube_url text not null,
  youtube_id text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);
create index if not exists articles_status_published_idx on public.articles(status,published_at desc);
create index if not exists videos_status_published_idx on public.videos(status,published_at desc);

create or replace function public.set_youtube_video_id()
returns trigger language plpgsql set search_path = public
as $$ declare extracted text; begin
  extracted := substring(new.youtube_url from '^https://youtu\.be/([A-Za-z0-9_-]{11})(?:[?&#/]|$)');
  if extracted is null then
    extracted := substring(new.youtube_url from '^https://(?:www\.|m\.)?youtube\.com/(?:embed/|shorts/|live/)([A-Za-z0-9_-]{11})(?:[?&#/]|$)');
  end if;
  if extracted is null and new.youtube_url ~ '^https://(?:www\.|m\.)?youtube\.com/watch\?' then
    extracted := substring(new.youtube_url from '[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)');
  end if;
  if extracted is null then raise exception 'Link YouTube tidak valid'; end if;
  new.youtube_id := extracted;
  return new;
end; $$;
drop trigger if exists set_youtube_video_id on public.videos;
create trigger set_youtube_video_id before insert or update on public.videos for each row execute function public.set_youtube_video_id();

alter table public.articles enable row level security;
alter table public.videos enable row level security;
revoke all on public.articles,public.videos from anon,authenticated;
grant select on public.articles,public.videos to anon,authenticated;
grant insert,update,delete on public.articles,public.videos to authenticated;

drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles for select to anon,authenticated using (status='published' and published_at <= now());
drop policy if exists articles_admin_manage on public.articles;
create policy articles_admin_manage on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists videos_public_read on public.videos;
create policy videos_public_read on public.videos for select to anon,authenticated using (status='published' and published_at <= now());
drop policy if exists videos_admin_manage on public.videos;
create policy videos_admin_manage on public.videos for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.articles(slug,title,excerpt,content,category,status,published_at) values
('memberi-nama-pada-perasaan','Memberi nama pada perasaan','Mulai mengenali apa yang sedang hadir, tanpa harus buru-buru mengubahnya.',
$article$Kadang kita hanya bisa bilang, “Aku sedang tidak baik.” Kamu boleh mulai dari sana. Coba berhenti sejenak dan tanyakan pada diri sendiri: apakah ada lelah, sedih, kecewa, atau rasa lain yang muncul?

Tidak ada jawaban yang harus sempurna. Jika sulit menemukan kata, tulis apa yang terjadi hari ini dan bagaimana rasanya bagimu. Kamu juga boleh memilih lebih dari satu perasaan.

Catatan kecil ini bisa menjadi awal percakapan dengan dirimu. Jika perasaan terasa terlalu berat untuk dihadapi sendiri, berbicaralah dengan orang tepercaya atau tenaga profesional.$article$,
'Kenali Diri','published',now()),
('jurnal-tiga-kalimat','Jurnal pertama, cukup tiga kalimat','Tidak perlu tulisan panjang untuk memberi ruang pada ceritamu.',
$article$Halaman kosong kadang membuat kita bingung harus mulai dari mana. Coba tulis tiga kalimat sederhana: “Hari ini aku mengalami…”, “Aku merasa…”, dan “Besok aku ingin memberi diriku…”.

Kamu bisa menulis tentang hal biasa: perjalanan pulang, percakapan singkat, atau waktu istirahat. Jurnal tidak harus berisi sesuatu yang besar dan tidak perlu dibaca orang lain.

Kalau belum ingin menulis, tidak apa-apa. Simpan pertanyaannya dan kembali saat kamu merasa siap. Ritmemu boleh berbeda setiap hari.$article$,
'Journaling','published',now()),
('jeda-kecil-hari-padat','Memberi ruang untuk jeda kecil','Satu pilihan sederhana untuk menemani hari yang terasa penuh.',
$article$Di hari yang padat, kamu boleh mencari jeda yang terasa masuk akal untukmu. Mungkin meletakkan ponsel sebentar, duduk di tempat yang nyaman, atau menikmati minuman tanpa mengerjakan hal lain.

Tanyakan pada diri sendiri: “Apa yang aku butuhkan sekarang?” Jawabannya bisa sesederhana makan, beristirahat, atau menghubungi teman. Tidak semua kebutuhan harus diselesaikan sekaligus.

Jeda bukan tuntutan baru. Pilih yang cocok dengan situasimu, dan tinggalkan yang tidak membantu.$article$,
'Self-care','published',now())
on conflict (slug) do nothing;

-- Video asli TED; judul UI Indonesia, bahasa video Inggris.
insert into public.videos(title,youtube_url,category,status,published_at) values
('Memahami stres bersama Kelly McGonigal · TED','https://www.youtube.com/watch?v=RcGyVTAoXEU','Kenali Diri','published',now()),
('Mengapa kita tidur? Russell Foster · TED','https://www.youtube.com/watch?v=LWULB9Aoopc','Self-care','published',now())
on conflict (youtube_id) do nothing;

commit;
