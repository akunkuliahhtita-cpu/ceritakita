begin;
alter table public.articles add column if not exists cover_url text;
alter table public.articles add column if not exists is_premium boolean not null default false;
alter table public.videos add column if not exists description text not null default '';
alter table public.videos add column if not exists is_premium boolean not null default false;
alter table public.videos add column if not exists sort integer not null default 0;
alter table public.videos drop constraint if exists videos_sort_range;
alter table public.videos add constraint videos_sort_range check(sort between 0 and 100000);

create or replace function public.can_read_premium_education()
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_admin() or exists(select 1 from public.profiles where id=auth.uid() and premium_until>now());
$$;
revoke all on function public.can_read_premium_education() from public;
grant execute on function public.can_read_premium_education() to anon,authenticated;
alter table public.articles enable row level security;
alter table public.videos enable row level security;
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles for select to anon,authenticated using(status='published' and published_at<=now() and (not is_premium or public.can_read_premium_education()));
drop policy if exists videos_public_read on public.videos;
create policy videos_public_read on public.videos for select to anon,authenticated using(status='published' and published_at<=now() and (not is_premium or public.can_read_premium_education()));
drop policy if exists articles_admin_manage on public.articles;
create policy articles_admin_manage on public.articles for select to authenticated using(public.is_admin());
drop policy if exists videos_admin_manage on public.videos;
create policy videos_admin_manage on public.videos for select to authenticated using(public.is_admin());
revoke insert,update,delete on public.articles,public.videos from anon,authenticated;
grant select on public.articles,public.videos to anon,authenticated;

-- Owner-executed barrier views intentionally provide public teasers. Protected fields
-- are null unless the current authenticated viewer has an active subscription/admin role.
create or replace view public.education_articles with(security_barrier=true) as
 select id,title,excerpt,category,cover_url,is_premium,published_at,
 (is_premium and not public.can_read_premium_education()) as locked,
 case when not is_premium or public.can_read_premium_education() then content else null end as content
 from public.articles where status='published' and published_at<=now();
create or replace view public.education_videos with(security_barrier=true) as
 select id,title,description,category,is_premium,sort,published_at,
 (is_premium and not public.can_read_premium_education()) as locked,
 case when not is_premium or public.can_read_premium_education() then youtube_id else null end as youtube_id
 from public.videos where status='published' and published_at<=now();
revoke all on public.education_articles,public.education_videos from anon,authenticated;
grant select on public.education_articles,public.education_videos to anon,authenticated;

create or replace function public.admin_save_education(content_kind text,payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare content_id uuid; before_row jsonb; after_row jsonb; scheduled timestamptz;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if content_kind not in ('articles','videos') or jsonb_typeof(payload)!='object' or octet_length(payload::text)>150000 then raise exception 'Invalid content';end if;
 if char_length(btrim(coalesce(payload->>'title',''))) not between 1 and 200
 or char_length(btrim(coalesce(payload->>'category',''))) not between 1 and 80
 or coalesce(payload->>'status','') not in ('draft','published')
 or jsonb_typeof(payload->'is_premium') is distinct from 'boolean' then raise exception 'Invalid content';end if;
 content_id:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 scheduled:=coalesce(nullif(payload->>'published_at','')::timestamptz,now());
 if content_kind='articles' then
  if coalesce(payload->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(payload->>'slug')>180
  or char_length(coalesce(payload->>'excerpt',''))>1000 or char_length(btrim(coalesce(payload->>'content',''))) not between 1 and 100000 then raise exception 'Invalid article';end if;
  perform pg_advisory_xact_lock(hashtext('ceritakita-media-references'));
  if nullif(payload->>'cover_url','') is not null and not exists(select 1 from public.media where url=payload->>'cover_url' and not deleting) then raise exception 'Pick a valid media image';end if;
  select to_jsonb(a) into before_row from public.articles a where id=content_id for update;
  if nullif(payload->>'id','') is not null and before_row is null then raise exception 'Content not found';end if;
  insert into public.articles(id,title,slug,excerpt,content,cover_url,category,is_premium,status,published_at)
  values(content_id,btrim(payload->>'title'),payload->>'slug',coalesce(payload->>'excerpt',''),payload->>'content',nullif(payload->>'cover_url',''),btrim(payload->>'category'),(payload->>'is_premium')::boolean,payload->>'status',scheduled)
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,excerpt=excluded.excerpt,content=excluded.content,cover_url=excluded.cover_url,category=excluded.category,is_premium=excluded.is_premium,status=excluded.status,published_at=excluded.published_at;
  select to_jsonb(a) into after_row from public.articles a where id=content_id;
 else
  if coalesce(payload->>'youtube_id','') !~ '^[A-Za-z0-9_-]{11}$'
  or payload->>'youtube_url' is distinct from 'https://www.youtube.com/watch?v='||(payload->>'youtube_id')
  or char_length(coalesce(payload->>'description',''))>1000
  or coalesce(payload->>'sort','') !~ '^[0-9]{1,6}$' or (payload->>'sort')::integer not between 0 and 100000 then raise exception 'Invalid video';end if;
  select to_jsonb(v) into before_row from public.videos v where id=content_id for update;
  if nullif(payload->>'id','') is not null and before_row is null then raise exception 'Content not found';end if;
  insert into public.videos(id,title,youtube_url,youtube_id,description,category,is_premium,status,sort,published_at)
  values(content_id,btrim(payload->>'title'),payload->>'youtube_url',payload->>'youtube_id',coalesce(payload->>'description',''),btrim(payload->>'category'),(payload->>'is_premium')::boolean,payload->>'status',(payload->>'sort')::integer,scheduled)
  on conflict(id) do update set title=excluded.title,youtube_url=excluded.youtube_url,youtube_id=excluded.youtube_id,description=excluded.description,category=excluded.category,is_premium=excluded.is_premium,status=excluded.status,sort=excluded.sort,published_at=excluded.published_at;
  select to_jsonb(v) into after_row from public.videos v where id=content_id;
 end if;
 -- Keep audit snapshots bounded and avoid duplicating article bodies.
 perform public.record_admin_audit('education.'||content_kind||case when before_row is null then '.create' else '.update' end,
 content_id::text,jsonb_build_object('before',before_row-'content','after',after_row-'content'));
 return content_id;
end; $$;

create or replace function public.admin_change_education(content_kind text,content_id uuid,next_status text,remove_content boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare previous jsonb;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if content_kind not in ('articles','videos') or next_status not in ('draft','published') or remove_content is null then raise exception 'Invalid content';end if;
 perform pg_advisory_xact_lock(hashtext('ceritakita-media-references'));
 if content_kind='articles' then
  select to_jsonb(a) into previous from public.articles a where id=content_id for update;
  if previous is null then raise exception 'Content not found';end if;
  if remove_content then delete from public.articles where id=content_id;
  else update public.articles set status=next_status,published_at=coalesce(published_at,now()) where id=content_id;end if;
 else
  select to_jsonb(v) into previous from public.videos v where id=content_id for update;
  if previous is null then raise exception 'Content not found';end if;
  if remove_content then delete from public.videos where id=content_id;
  else update public.videos set status=next_status,published_at=coalesce(published_at,now()) where id=content_id;end if;
 end if;
 perform public.record_admin_audit('education.'||content_kind||case when remove_content then '.delete' else '.status' end,content_id::text,jsonb_build_object('before',previous-'content','status',case when remove_content then null else next_status end));
end; $$;
revoke all on function public.admin_save_education(text,jsonb),public.admin_change_education(text,uuid,text,boolean) from public,anon;
grant execute on function public.admin_save_education(text,jsonb),public.admin_change_education(text,uuid,text,boolean) to authenticated;
commit;
