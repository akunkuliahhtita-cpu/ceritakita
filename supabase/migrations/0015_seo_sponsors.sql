begin;
create table if not exists public.seo_settings(id integer primary key default 1 check(id=1),settings jsonb not null default '{}',updated_at timestamptz not null default now());
create table if not exists public.seo_documents(path text primary key,meta jsonb not null default '{}',updated_at timestamptz not null default now());
create table if not exists public.seo_redirects(id uuid primary key default gen_random_uuid(),source text not null unique,destination text not null,active boolean not null default true,updated_at timestamptz not null default now());
create table if not exists public.sponsors(id uuid primary key default gen_random_uuid(),name text not null,logo_url text not null default '',title text not null,description text not null default '',link_url text not null,placement text not null check(placement in ('landing','dashboard','artikel')),start_at timestamptz,end_at timestamptz,is_active boolean not null default false,clicks bigint not null default 0,impressions bigint not null default 0,updated_at timestamptz not null default now());
create table if not exists public.sponsor_events(sponsor_id uuid not null references public.sponsors(id) on delete cascade,visitor_hash text not null,event_kind text not null check(event_kind in ('click','impression')),event_day date not null default current_date,primary key(sponsor_id,visitor_hash,event_kind,event_day));
create index if not exists sponsor_events_day_idx on public.sponsor_events(event_day);
create index if not exists sponsors_placement_idx on public.sponsors(placement,is_active);
alter table public.seo_settings enable row level security;
alter table public.seo_documents enable row level security;
alter table public.seo_redirects enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_events enable row level security;
revoke all on public.seo_settings,public.seo_documents,public.seo_redirects,public.sponsors,public.sponsor_events from public,anon,authenticated;
grant select on public.seo_settings,public.seo_documents,public.seo_redirects to anon,authenticated;
grant select on public.sponsors to authenticated;
drop policy if exists seo_settings_public_read on public.seo_settings;
create policy seo_settings_public_read on public.seo_settings for select to anon,authenticated using(true);
drop policy if exists seo_documents_read on public.seo_documents;
drop policy if exists seo_redirects_read on public.seo_redirects;
create policy seo_redirects_read on public.seo_redirects for select to anon,authenticated using(active or public.is_admin());
drop policy if exists sponsors_admin_read on public.sponsors;
create policy sponsors_admin_read on public.sponsors for select to authenticated using(public.is_admin());
create or replace view public.sponsor_feed with(security_barrier=true) as
select id,name,logo_url,title,description,link_url,placement,start_at,end_at,is_active from public.sponsors where is_active and (start_at is null or start_at<=now()) and (end_at is null or end_at>now());
revoke all on public.sponsor_feed from public,anon,authenticated;
grant select on public.sponsor_feed to anon,authenticated;
-- Public teasers never reveal premium article bodies or premium video IDs.
create or replace view public.seo_articles with(security_barrier=true) as
select id,slug,title,excerpt,cover_url,category,is_premium,published_at,case when not is_premium or public.can_read_premium_education() then content else null end as content from public.articles where status='published' and published_at<=now();
create or replace view public.seo_videos with(security_barrier=true) as
select id,title,description,category,is_premium,published_at,case when not is_premium or public.can_read_premium_education() then youtube_id else null end as youtube_id from public.videos where status='published' and published_at<=now();
revoke all on public.seo_articles,public.seo_videos from public,anon,authenticated;
grant select on public.seo_articles,public.seo_videos to anon,authenticated;
create policy seo_documents_read on public.seo_documents for select to anon,authenticated using(public.is_admin() or path in ('/','/kontak','/review','/masuk') or exists(select 1 from public.page_feed p where '/'||p.slug=path) or exists(select 1 from public.seo_articles a where '/artikel/'||a.slug=path));
create or replace function public.admin_save_marketing(kind text,payload jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare target uuid;path_value text;image_url text;before_value jsonb;source_value text;next_path text;visited text[];v jsonb;start_value timestamptz;end_value timestamptz;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>30000 then raise exception 'Invalid payload';end if;
 perform pg_advisory_xact_lock(hashtextextended('ceritakita-media-references',0));
 if kind='seo_global' then
  if char_length(coalesce(payload->>'titleTemplate','')) not between 1 and 150 or position('%s' in payload->>'titleTemplate')=0 or char_length(coalesce(payload->>'description',''))>500 or char_length(coalesce(payload->>'robots',''))>10000
  or coalesce(payload->>'canonicalBase','')!~'^(|https://[^/?#[:space:]]+/?$)' or coalesce(payload->>'analyticsId','')!~'^(|G-[A-Z0-9]{4,30})$' or coalesce(payload->>'googleVerification','')!~'^[-a-zA-Z0-9_]{0,200}$' or coalesce(payload->>'bingVerification','')!~'^[-a-zA-Z0-9_]{0,200}$' then raise exception 'Invalid SEO';end if;
  image_url:=coalesce(payload->>'ogImage','');select settings into before_value from public.seo_settings where id=1;
  if image_url<>'' and not exists(select 1 from public.media where url=image_url and not deleting) then raise exception 'Pick media from library';end if;
  insert into public.seo_settings(id,settings) values(1,payload) on conflict(id) do update set settings=excluded.settings,updated_at=now();path_value:='global';
 elsif kind='seo_document' then
  path_value:=payload->>'path';v:=payload->'meta';
  if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'noindex') is distinct from 'boolean' or char_length(coalesce(v->>'title',''))>200 or char_length(coalesce(v->>'description',''))>500 or char_length(coalesce(v->>'canonical',''))>2048 or coalesce(v->>'canonical','')!~'^(|https://[^[:space:]@]+)$' then raise exception 'Invalid metadata';end if;
  if not (path_value in ('/','/kontak','/review','/masuk') or exists(select 1 from public.pages where '/'||slug=path_value) or exists(select 1 from public.articles where '/artikel/'||slug=path_value)) then raise exception 'Unknown page';end if;
  image_url:=coalesce(v->>'ogImage','');if image_url<>'' and not exists(select 1 from public.media where url=image_url and not deleting) then raise exception 'Pick media from library';end if;
  select meta into before_value from public.seo_documents where path=path_value;
  insert into public.seo_documents(path,meta) values(path_value,v) on conflict(path) do update set meta=excluded.meta,updated_at=now();
 elsif kind='redirect' then
  perform pg_advisory_xact_lock(hashtextextended('ceritakita-seo-redirects',0));
  target:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());source_value:=payload->>'source';next_path:=payload->>'destination';
  if source_value is null or source_value!~'^/([a-z0-9-]+/)*[a-z0-9-]*$' or source_value='/' or source_value~'^/(app|admin|api|auth|masuk|sponsor)(/|$)' or char_length(source_value)>180 or next_path is null or char_length(next_path)>2048 or (next_path!~'^/([a-z0-9-]+/)*[a-z0-9-]*$' and next_path!~'^https://[^[:space:]@]+$') or next_path=source_value or jsonb_typeof(payload->'active') is distinct from 'boolean' then raise exception 'Invalid redirect';end if;
  visited:=array[source_value];if (payload->>'active')::boolean then
   loop
    if next_path=any(visited) then raise exception 'Redirect cycle';end if;
    visited:=array_append(visited,next_path);if array_length(visited,1)>50 then raise exception 'Redirect chain too long';end if;
    select destination into next_path from public.seo_redirects where source=next_path and active and id<>target;
    exit when next_path is null;
   end loop;
  end if;
  select to_jsonb(r) into before_value from public.seo_redirects r where id=target;
  insert into public.seo_redirects(id,source,destination,active) values(target,source_value,payload->>'destination',(payload->>'active')::boolean) on conflict(id) do update set source=excluded.source,destination=excluded.destination,active=excluded.active,updated_at=now();path_value:=source_value;
 elsif kind='redirect_delete' then
  target:=(payload->>'id')::uuid;select to_jsonb(r) into before_value from public.seo_redirects r where id=target;delete from public.seo_redirects where id=target;path_value:=target::text;
 elsif kind='sponsor' then
  target:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());start_value:=nullif(payload->>'start_at','')::timestamptz;end_value:=nullif(payload->>'end_at','')::timestamptz;
  if char_length(btrim(coalesce(payload->>'name',''))) not between 1 and 100 or char_length(btrim(coalesce(payload->>'title',''))) not between 1 and 200 or char_length(coalesce(payload->>'description',''))>2000 or coalesce(payload->>'link_url','')!~'^https://[^[:space:]@]+$' or char_length(payload->>'link_url')>2048 or coalesce(payload->>'placement','') not in ('landing','dashboard','artikel') or jsonb_typeof(payload->'is_active') is distinct from 'boolean' or (start_value is not null and end_value is not null and start_value>=end_value) then raise exception 'Invalid sponsor';end if;
  image_url:=coalesce(payload->>'logo_url','');if image_url<>'' and not exists(select 1 from public.media where url=image_url and not deleting) then raise exception 'Pick media from library';end if;
  select to_jsonb(s) into before_value from public.sponsors s where id=target;
  insert into public.sponsors(id,name,logo_url,title,description,link_url,placement,start_at,end_at,is_active) values(target,btrim(payload->>'name'),image_url,btrim(payload->>'title'),coalesce(payload->>'description',''),payload->>'link_url',payload->>'placement',start_value,end_value,(payload->>'is_active')::boolean)
  on conflict(id) do update set name=excluded.name,logo_url=excluded.logo_url,title=excluded.title,description=excluded.description,link_url=excluded.link_url,placement=excluded.placement,start_at=excluded.start_at,end_at=excluded.end_at,is_active=excluded.is_active,updated_at=now();path_value:=target::text;
 elsif kind='sponsor_delete' then
  target:=(payload->>'id')::uuid;select to_jsonb(s) into before_value from public.sponsors s where id=target;delete from public.sponsors where id=target;path_value:=target::text;
 else raise exception 'Unknown operation';end if;
 perform public.record_admin_audit(kind,path_value,jsonb_build_object('before',before_value,'after',payload));
 return coalesce(target::text,path_value);
end;$$;
revoke all on function public.admin_save_marketing(text,jsonb) from public,anon;
grant execute on function public.admin_save_marketing(text,jsonb) to authenticated;
create or replace function public.record_sponsor_event(sponsor_uuid uuid,visitor_hash_value text,event_type text,event_placement text)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted integer;
begin
 if visitor_hash_value is null or event_type is null or event_placement is null or visitor_hash_value!~'^[a-f0-9]{64}$' or event_type not in ('click','impression') or event_placement not in ('landing','dashboard','artikel') then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(visitor_hash_value,0));
 if not exists(select 1 from public.sponsors where id=sponsor_uuid and placement=event_placement and is_active and (start_at is null or start_at<=now()) and (end_at is null or end_at>now())) then return false;end if;
 if (select count(*) from public.sponsor_events where visitor_hash=visitor_hash_value and event_day=current_date)>=100 then return false;end if;
 insert into public.sponsor_events(sponsor_id,visitor_hash,event_kind) values(sponsor_uuid,visitor_hash_value,event_type) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted>0 then update public.sponsors set clicks=clicks+case when event_type='click' then 1 else 0 end,impressions=impressions+case when event_type='impression' then 1 else 0 end where id=sponsor_uuid;end if;
 delete from public.sponsor_events where event_day<current_date-30;
 return inserted>0;
end;$$;
revoke all on function public.record_sponsor_event(uuid,text,text,text) from public;
grant execute on function public.record_sponsor_event(uuid,text,text,text) to anon,authenticated;
insert into public.seo_settings(id,settings) values(1,'{"titleTemplate":"%s | CeritaKita","description":"Tempat aman untuk bercerita, mencatat mood, menulis jurnal, dan belajar kesehatan mental.","ogImage":"","canonicalBase":"","googleVerification":"","bingVerification":"","analyticsId":"","robots":"User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /auth\n"}') on conflict(id) do nothing;
commit;
