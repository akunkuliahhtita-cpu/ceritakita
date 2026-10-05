begin;

create table if not exists public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('peluk','semangat','aku_juga')),
  created_at timestamptz not null default now(),
  primary key (story_id,user_id,type)
);
create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  alias text not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  needs_moderation boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('story','comment')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','sara','kekerasan','lainnya')),
  detail text not null default '' check (char_length(detail) <= 1000),
  status text not null default 'open' check (status in ('open','handled','dismissed')),
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (target_type,target_id,reporter_id)
);
alter table public.stories add column if not exists needs_moderation boolean not null default false;
update public.stories
set alias = (array['Kupu-kupu','Awan','Bintang','Daun','Embun'])[1+floor(random()*5)::int] || ' ' || (array['Tenang','Hangat','Berani','Lembut','Ceria'])[1+floor(random()*5)::int] || ' ' || substr(gen_random_uuid()::text,1,4)
where alias is null or btrim(alias) = '';

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create index if not exists stories_author_created_idx on public.stories(author_id,created_at);
create index if not exists story_comments_story_created_idx on public.story_comments(story_id,created_at);
create index if not exists story_comments_author_created_idx on public.story_comments(author_id,created_at);
create index if not exists reports_reporter_created_idx on public.reports(reporter_id,created_at);

create table if not exists public.site_settings (key text primary key, value jsonb not null);
insert into public.site_settings(key,value) values ('crisis_help', '{"label":"Healing119.id — dukungan psikologis Kemenkes","url":"https://healing119.id","phone":"119 ekstensi 8","emergency":"119","source":"https://kesprimkom.kemkes.go.id/konten/127/151/0/cegah-bunuh-diri-dukung-kesehatan-jiwa-kenali-layanan-healing119-id"}'::jsonb) on conflict (key) do nothing;

alter table public.story_reactions enable row level security;
alter table public.story_comments enable row level security;
alter table public.reports enable row level security;
alter table public.site_settings enable row level security;

-- Identity-bearing base tables are not readable by browser roles.
revoke all on public.stories, public.story_comments from anon, authenticated;
grant insert (author_id,body) on public.stories to authenticated;
grant insert (story_id,author_id,body) on public.story_comments to authenticated;
revoke all on public.story_reactions, public.reports, public.site_settings from anon, authenticated;
grant select, delete on public.story_reactions to authenticated;
grant insert (story_id,user_id,type) on public.story_reactions to authenticated;
grant select on public.reports to authenticated;
grant insert (target_type,target_id,reporter_id,reason,detail) on public.reports to authenticated;
grant select on public.site_settings to authenticated;

-- Keep the existing profile policy from allowing users to promote their own role.
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id,display_name,avatar_url) on public.profiles to authenticated;
grant update (display_name,avatar_url) on public.profiles to authenticated;

create or replace function public.story_is_published(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.stories where id = target and status = 'published') $$;
revoke all on function public.story_is_published(uuid) from public;
grant execute on function public.story_is_published(uuid) to authenticated;

drop policy if exists write_own_story on public.stories;
create policy write_own_story on public.stories for insert to authenticated with check (author_id = auth.uid() and status in ('published','hidden'));
drop policy if exists read_own_reactions on public.story_reactions;
create policy read_own_reactions on public.story_reactions for select to authenticated using (user_id = auth.uid());
drop policy if exists react_published_story on public.story_reactions;
create policy react_published_story on public.story_reactions for insert to authenticated with check (user_id = auth.uid() and public.story_is_published(story_id));
drop policy if exists delete_own_reaction on public.story_reactions;
create policy delete_own_reaction on public.story_reactions for delete to authenticated using (user_id = auth.uid());
drop policy if exists comment_published_story on public.story_comments;
create policy comment_published_story on public.story_comments for insert to authenticated with check (author_id = auth.uid() and public.story_is_published(story_id) and status in ('published','hidden'));
drop policy if exists report_own on public.reports;
create policy report_own on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists report_insert on public.reports;
create policy report_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid() and status = 'open' and handled_by is null);
drop policy if exists crisis_help_read on public.site_settings;
create policy crisis_help_read on public.site_settings for select to authenticated using (key = 'crisis_help');

create or replace function public.guard_story_content()
returns trigger language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  if auth.uid() is null or new.author_id <> auth.uid() then raise exception 'Akses ditolak'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if tg_table_name = 'stories' then
    if char_length(btrim(new.body)) not between 1 and 5000 then raise exception 'Cerita tidak valid'; end if;
    select count(*) into n from public.stories where author_id = auth.uid() and created_at > now() - interval '1 hour';
    if n >= 5 then raise exception 'Batas cerita tercapai'; end if;
  else
    select count(*) into n from public.story_comments where author_id = auth.uid() and created_at > now() - interval '1 minute';
    if n >= 5 then raise exception 'Batas komentar tercapai'; end if;
  end if;
  new.body := btrim(new.body);
  new.alias := (array['Kupu-kupu','Awan','Bintang','Daun','Embun'])[1+floor(random()*5)::int] || ' ' || (array['Tenang','Hangat','Berani','Lembut','Ceria'])[1+floor(random()*5)::int] || ' ' || substr(gen_random_uuid()::text,1,4);
  new.needs_moderation := new.body ~* '(bunuh[[:space:]]+diri|menyakiti[[:space:]]+diri|mengakhiri[[:space:]]+hidup|ingin[[:space:]]+mati|bangsat|bajingan)';
  new.status := case when new.needs_moderation then 'hidden' else 'published' end;
  return new;
end;
$$;
drop trigger if exists guard_story_insert on public.stories;
create trigger guard_story_insert before insert on public.stories for each row execute function public.guard_story_content();
drop trigger if exists guard_comment_insert on public.story_comments;
create trigger guard_comment_insert before insert on public.story_comments for each row execute function public.guard_story_content();

create or replace function public.queue_story_moderation()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.needs_moderation then
    insert into public.reports(target_type,target_id,reporter_id,reason,detail)
    values (case when tg_table_name = 'stories' then 'story' else 'comment' end, new.id, new.author_id, 'lainnya', 'Ditandai otomatis: perlu tinjauan dukungan/moderasi.')
    on conflict (target_type,target_id,reporter_id) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists queue_story_moderation on public.stories;
create trigger queue_story_moderation after insert on public.stories for each row execute function public.queue_story_moderation();
drop trigger if exists queue_comment_moderation on public.story_comments;
create trigger queue_comment_moderation after insert on public.story_comments for each row execute function public.queue_story_moderation();

create or replace function public.guard_story_report()
returns trigger language plpgsql security definer set search_path = public
as $$ declare n integer; begin
  if auth.uid() is null or new.reporter_id <> auth.uid() then raise exception 'Akses ditolak'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select count(*) into n from public.reports where reporter_id = auth.uid() and created_at > now() - interval '1 minute';
  if n >= 5 then raise exception 'Batas laporan tercapai'; end if;
  if new.target_type = 'story' then
    if not exists(select 1 from public.stories where id = new.target_id and (status = 'published' or (author_id = auth.uid() and needs_moderation))) then raise exception 'Cerita tidak tersedia'; end if;
  else
    if not exists(select 1 from public.story_comments where id = new.target_id and ((status = 'published' and public.story_is_published(story_id)) or (author_id = auth.uid() and needs_moderation))) then raise exception 'Komentar tidak tersedia'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists guard_report_insert on public.reports;
create trigger guard_report_insert before insert on public.reports for each row execute function public.guard_story_report();

-- These owner-executed views intentionally expose only anonymous published data.
create or replace view public.story_feed with (security_barrier = true) as
select s.id, coalesce(s.alias,'Teman Bercerita') as alias, s.body,
  (s.created_at at time zone 'Asia/Jakarta')::date as day,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='peluk') as peluk,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='semangat') as semangat,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='aku_juga') as aku_juga,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='peluk') as my_peluk,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='semangat') as my_semangat,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='aku_juga') as my_aku_juga
from public.stories s where s.status='published' and auth.uid() is not null
order by s.created_at desc,s.id desc;
create or replace view public.story_comment_feed with (security_barrier = true) as
select recent.id,recent.story_id,recent.alias,recent.body,
  (recent.created_at at time zone 'Asia/Jakarta')::date as day
from (
  select c.id,c.story_id,c.alias,c.body,c.created_at,
    row_number() over (partition by c.story_id order by c.created_at desc,c.id desc) as position
  from public.story_comments c join public.stories s on s.id=c.story_id
  where c.status='published' and s.status='published' and auth.uid() is not null
) as recent
where recent.position <= 5
order by recent.created_at desc,recent.id desc;
revoke all on public.story_feed, public.story_comment_feed from public, anon, authenticated;
grant select on public.story_feed, public.story_comment_feed to authenticated;

commit;
