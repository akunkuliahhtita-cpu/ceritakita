begin;

-- Audit the live public schema, including application tables absent from old migrations.
-- Extension-owned tables are managed by their extensions and are left untouched.
do $$
declare target record;
begin
  for target in
    select ns.nspname, cls.relname
    from pg_class cls join pg_namespace ns on ns.oid=cls.relnamespace
    where ns.nspname='public' and cls.relkind in ('r','p') and not cls.relrowsecurity
      and not exists (
        select 1 from pg_depend dep
        where dep.classid='pg_class'::regclass and dep.objid=cls.oid and dep.deptype='e'
      )
  loop
    execute format('alter table %I.%I enable row level security',target.nspname,target.relname);
  end loop;
end;
$$;

-- Block direct identity access even if an earlier setup added column grants.
revoke select on public.stories,public.story_comments from public,anon,authenticated;
revoke select(author_id) on public.stories from public,anon,authenticated;
revoke select(author_id) on public.story_comments from public,anon,authenticated;

-- Recreate without CASCADE so unexpected dependent objects are not removed.
-- DROP is necessary: CREATE OR REPLACE cannot remove leaked columns from a live view.
drop view if exists public.story_feed;
drop view if exists public.story_comment_feed;
drop view if exists public.review_feed;

-- Owner-executed views are intentional: identities stay unreadable in base tables,
-- while only these explicit published projections are exposed to API roles.
create or replace view public.story_feed with(security_barrier=true) as
select s.id,coalesce(s.alias,'Teman Bercerita') as alias,s.body,
  (s.created_at at time zone 'Asia/Jakarta')::date as day,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='peluk') as peluk,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='semangat') as semangat,
  (select count(*) from public.story_reactions r where r.story_id=s.id and r.type='aku_juga') as aku_juga,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='peluk') as my_peluk,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='semangat') as my_semangat,
  exists(select 1 from public.story_reactions r where r.story_id=s.id and r.user_id=auth.uid() and r.type='aku_juga') as my_aku_juga
from public.stories s
where s.status='published' and auth.uid() is not null
order by s.created_at desc,s.id desc;

create or replace view public.story_comment_feed with(security_barrier=true) as
select recent.id,recent.story_id,recent.alias,recent.body,
  (recent.created_at at time zone 'Asia/Jakarta')::date as day
from (
  select c.id,c.story_id,c.alias,c.body,c.created_at,
    row_number() over(partition by c.story_id order by c.created_at desc,c.id desc) as position
  from public.story_comments c join public.stories s on s.id=c.story_id
  where c.status='published' and s.status='published' and auth.uid() is not null
) as recent
where recent.position<=5
order by recent.created_at desc,recent.id desc;

create or replace view public.review_feed with(security_barrier=true) as
select r.id,'Teman ' || substr(r.id::text,1,6) as name,r.rating,r.title,r.body,r.photos,r.is_featured,
  r.helpful_count,(r.created_at at time zone 'Asia/Jakarta')::date as day,
  exists(select 1 from public.review_votes v where v.review_id=r.id and v.user_id=auth.uid()) as voted
from public.reviews r
where r.status='published' and r.rating between 1 and 5
order by r.created_at desc,r.id desc;

revoke all on public.story_feed,public.story_comment_feed,public.review_feed from public,anon,authenticated;
grant select on public.story_feed,public.story_comment_feed to authenticated;
grant select on public.review_feed to anon,authenticated;

-- Enforce exact output contracts in the live database before committing.
do $$
declare contract record; actual text[];
begin
  for contract in
    select 'story_feed'::text as view_name,
      array['id','alias','body','day','peluk','semangat','aku_juga','my_peluk','my_semangat','my_aku_juga']::text[] as columns
    union all select 'story_comment_feed',array['id','story_id','alias','body','day']::text[]
    union all select 'review_feed',array['id','name','rating','title','body','photos','is_featured','helpful_count','day','voted']::text[]
  loop
    select array_agg(attr.attname::text order by attr.attnum) into actual
    from pg_attribute attr
    where attr.attrelid=to_regclass(format('public.%I',contract.view_name))
      and attr.attnum>0 and not attr.attisdropped;
    if actual is distinct from contract.columns then
      raise exception 'Kolom view % tidak sesuai kontrak publik',contract.view_name;
    end if;
  end loop;
end;
$$;

commit;
