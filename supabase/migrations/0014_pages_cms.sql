begin;
create table if not exists public.pages (
 id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,
 status text not null default 'draft' check(status in ('draft','published')),
 blocks jsonb not null default '[]',published_blocks jsonb,published_title text,
 has_draft boolean not null default true,updated_at timestamptz not null default now()
);
alter table public.pages add column if not exists published_blocks jsonb;
alter table public.pages add column if not exists published_title text;
alter table public.pages add column if not exists has_draft boolean not null default true;
update public.pages set published_blocks=blocks,published_title=title,has_draft=false where status='published' and published_blocks is null;
alter table public.pages enable row level security;
revoke all on public.pages from public,anon,authenticated;
grant select on public.pages to authenticated;
-- Draft blocks must never be exposed by an older broad read policy.
do $$ declare page_policy text;begin
 for page_policy in select policyname from pg_policies where schemaname='public' and tablename='pages' loop
 execute format('drop policy if exists %I on public.pages',page_policy);
 end loop;
end; $$;
create policy pages_admin_read on public.pages for select to authenticated using(public.is_admin());
create or replace view public.page_feed with(security_barrier=true) as
 select id,slug,coalesce(published_title,title) as title,coalesce(published_blocks,'[]'::jsonb) as blocks
 from public.pages where status='published';
revoke all on public.page_feed from public,anon,authenticated;
grant select on public.page_feed to anon,authenticated;

create or replace function public.admin_save_page(page_id uuid,page_title text,page_slug text,page_blocks jsonb,publish_now boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare target uuid;previous record;block jsonb;image_url text;types text[]:=array['hero','features','gallery','video','text','pricing','testimonials','chips','cta','faq','sponsor'];
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if char_length(btrim(coalesce(page_title,''))) not between 1 and 200 or page_slug is null or publish_now is null
 or (page_slug<>'/' and (page_slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(page_slug)>180 or page_slug=any(array['admin','app','auth','masuk','kontak','review','api','ditangguhkan','_next'])))
 or jsonb_typeof(page_blocks) is distinct from 'array' or octet_length(page_blocks::text)>250000 then raise exception 'Invalid page';end if;
 if jsonb_array_length(page_blocks)>40 then raise exception 'Too many blocks';end if;
 for block in select value from jsonb_array_elements(page_blocks) loop
 if jsonb_typeof(block) is distinct from 'object' or coalesce(block->>'type','')<>all(types) or char_length(coalesce(block->>'id','')) not between 1 and 80 or jsonb_typeof(block->'items') is distinct from 'array' then raise exception 'Invalid block';end if;
 if jsonb_array_length(block->'items')>30 then raise exception 'Too many block items';end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(page_blocks))<>jsonb_array_length(page_blocks) then raise exception 'Duplicate block IDs';end if;
 perform pg_advisory_xact_lock(hashtext('ceritakita-media-references'));
 for image_url in select value #>> '{}' from (
 select value from jsonb_path_query(page_blocks,'$[*].imageUrl') as q(value)
 union all select value from jsonb_path_query(page_blocks,'$[*].secondaryImageUrl') as q(value)
 union all select value from jsonb_path_query(page_blocks,'$[*].items[*].imageUrl') as q(value)
 )images loop
 if image_url<>'' and image_url<>all(array['/images/laptop.jpg','/images/meditasi.jpg','/logo-mark.png']) and not exists(select 1 from public.media where url=image_url and not deleting) then raise exception 'Pick media from the library';end if;
 end loop;
 target:=coalesce(page_id,gen_random_uuid());
 select id,slug,status,has_draft into previous from public.pages where id=target for update;
 if page_id is not null and previous.id is null then raise exception 'Page missing';end if;
 if previous.id is not null and previous.slug<>page_slug then raise exception 'Published page slug is immutable';end if;
 if page_slug='/' and previous.id is null then raise exception 'Homepage already seeded';end if;
 insert into public.pages(id,slug,title,status,blocks,published_blocks,published_title,has_draft,updated_at)
 values(target,page_slug,btrim(page_title),case when publish_now then 'published' else 'draft' end,page_blocks,case when publish_now then page_blocks else null end,case when publish_now then btrim(page_title) else null end,not publish_now,now())
 on conflict(id) do update set title=excluded.title,blocks=excluded.blocks,
 status=case when publish_now then 'published' else pages.status end,
 published_blocks=case when publish_now then excluded.blocks else pages.published_blocks end,
 published_title=case when publish_now then excluded.title else pages.published_title end,
 has_draft=not publish_now,updated_at=now();
 perform public.record_admin_audit(case when publish_now then 'cms.publish' else 'cms.draft.save' end,page_slug,jsonb_build_object('page_id',target,'block_count',jsonb_array_length(page_blocks),'before',to_jsonb(previous)));
 return target;
end; $$;
revoke all on function public.admin_save_page(uuid,text,text,jsonb,boolean) from public,anon;
grant execute on function public.admin_save_page(uuid,text,text,jsonb,boolean) to authenticated;

insert into public.pages(slug,title,status,blocks,published_blocks,published_title,has_draft) values('/', 'Beranda','published', $cmsseed$[
  {
    "id": "home-hero",
    "type": "hero",
    "title": "Tempat aman untuk semua ceritamu.",
    "eyebrow": "RUANG UNTUK MENJADI DIRIMU",
    "text": "",
    "buttonText": "Mulai Bercerita",
    "buttonHref": "/masuk",
    "imageUrl": "/images/meditasi.jpg",
    "imageAlt": "Perempuan menikmati waktu tenang di antara tanaman",
    "secondaryImageUrl": "/images/laptop.jpg",
    "visualLabel": "BERCERITA · BERTUMBUH · BERSAMA",
    "aboutTitle": "Setiap rasa punya cerita.",
    "aboutText": "Kadang, kita hanya butuh tempat untuk didengar. Mulai dari apa pun yang sedang kamu rasakan.",
    "aboutLabel": "Tentang {{site}}",
    "aboutButtonText": "Kenali {{site}}",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-features",
    "type": "features",
    "title": "",
    "eyebrow": "",
    "text": "",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [
      {
        "title": "Ruang Cerita Anonim",
        "text": "Ada ruang untuk setiap rasa. Ceritakan tanpa takut dihakimi.",
        "label": "Ceritamu berarti",
        "symbol": "♡",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Mood Tracker",
        "text": "Kenali perasaanmu, satu hari kecil dalam satu waktu.",
        "label": "Apa kabarmu?",
        "symbol": "☀",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Journaling",
        "text": "Tuangkan isi kepala. Temukan ruang tenang untuk dirimu.",
        "label": "Catatan untuk diri",
        "symbol": "✎",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Konten Edukasi",
        "text": "Belajar memahami diri lewat bacaan dan video ringan.",
        "label": "Tumbuh bersama",
        "symbol": "✿",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      }
    ],
    "useSiteChips": false
  },
  {
    "id": "home-pricing",
    "type": "pricing",
    "title": "Ruang tumbuh untuk setiap cerita",
    "eyebrow": "SESUAI LANGKAHMU",
    "text": "",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-testimonials",
    "type": "testimonials",
    "title": "Apa kata mereka",
    "eyebrow": "CERITA DARI TEMAN KITA",
    "text": "Setiap perjalanan berbeda. Kamu boleh berjalan dengan ritmemu sendiri.",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-chips",
    "type": "chips",
    "title": "Bergabung dengan gerakan",
    "eyebrow": "",
    "text": "Langkah kecilmu berarti. Mari tumbuh bersama.",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": true
  },
  {
    "id": "home-cta",
    "type": "cta",
    "title": "Siap mulai\n perjalananmu?",
    "eyebrow": "",
    "text": "Ada tempat untuk ceritamu di sini.",
    "buttonText": "Daftar Gratis",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  }
]$cmsseed$::jsonb,$cmsseed$[
  {
    "id": "home-hero",
    "type": "hero",
    "title": "Tempat aman untuk semua ceritamu.",
    "eyebrow": "RUANG UNTUK MENJADI DIRIMU",
    "text": "",
    "buttonText": "Mulai Bercerita",
    "buttonHref": "/masuk",
    "imageUrl": "/images/meditasi.jpg",
    "imageAlt": "Perempuan menikmati waktu tenang di antara tanaman",
    "secondaryImageUrl": "/images/laptop.jpg",
    "visualLabel": "BERCERITA · BERTUMBUH · BERSAMA",
    "aboutTitle": "Setiap rasa punya cerita.",
    "aboutText": "Kadang, kita hanya butuh tempat untuk didengar. Mulai dari apa pun yang sedang kamu rasakan.",
    "aboutLabel": "Tentang {{site}}",
    "aboutButtonText": "Kenali {{site}}",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-features",
    "type": "features",
    "title": "",
    "eyebrow": "",
    "text": "",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [
      {
        "title": "Ruang Cerita Anonim",
        "text": "Ada ruang untuk setiap rasa. Ceritakan tanpa takut dihakimi.",
        "label": "Ceritamu berarti",
        "symbol": "♡",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Mood Tracker",
        "text": "Kenali perasaanmu, satu hari kecil dalam satu waktu.",
        "label": "Apa kabarmu?",
        "symbol": "☀",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Journaling",
        "text": "Tuangkan isi kepala. Temukan ruang tenang untuk dirimu.",
        "label": "Catatan untuk diri",
        "symbol": "✎",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      },
      {
        "title": "Konten Edukasi",
        "text": "Belajar memahami diri lewat bacaan dan video ringan.",
        "label": "Tumbuh bersama",
        "symbol": "✿",
        "imageUrl": "",
        "imageAlt": "",
        "href": "/masuk"
      }
    ],
    "useSiteChips": false
  },
  {
    "id": "home-pricing",
    "type": "pricing",
    "title": "Ruang tumbuh untuk setiap cerita",
    "eyebrow": "SESUAI LANGKAHMU",
    "text": "",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-testimonials",
    "type": "testimonials",
    "title": "Apa kata mereka",
    "eyebrow": "CERITA DARI TEMAN KITA",
    "text": "Setiap perjalanan berbeda. Kamu boleh berjalan dengan ritmemu sendiri.",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  },
  {
    "id": "home-chips",
    "type": "chips",
    "title": "Bergabung dengan gerakan",
    "eyebrow": "",
    "text": "Langkah kecilmu berarti. Mari tumbuh bersama.",
    "buttonText": "",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": true
  },
  {
    "id": "home-cta",
    "type": "cta",
    "title": "Siap mulai\n perjalananmu?",
    "eyebrow": "",
    "text": "Ada tempat untuk ceritamu di sini.",
    "buttonText": "Daftar Gratis",
    "buttonHref": "/masuk",
    "imageUrl": "",
    "imageAlt": "",
    "secondaryImageUrl": "",
    "visualLabel": "",
    "aboutTitle": "",
    "aboutText": "",
    "aboutLabel": "",
    "aboutButtonText": "",
    "aboutButtonHref": "#fitur",
    "youtubeUrl": "",
    "html": "",
    "items": [],
    "useSiteChips": false
  }
]$cmsseed$::jsonb,'Beranda',false) on conflict(slug) do nothing;
commit;
