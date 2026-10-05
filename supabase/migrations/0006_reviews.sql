begin;

alter table public.reviews add column if not exists title text not null default '';
alter table public.reviews add column if not exists photos text[] not null default '{}';
alter table public.reviews add column if not exists helpful_count integer not null default 0;
alter table public.reviews add column if not exists admin_note text;
alter table public.reviews drop constraint if exists reviews_title_length;
alter table public.reviews add constraint reviews_title_length check(char_length(title)<=120);
alter table public.reviews drop constraint if exists reviews_photos_limit;
alter table public.reviews add constraint reviews_photos_limit check(cardinality(photos)<=3);
create table if not exists public.review_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(review_id,user_id)
);
create index if not exists reviews_status_created_idx on public.reviews(status,created_at desc);
alter table public.review_votes enable row level security;
revoke all on public.reviews,public.review_votes from anon,authenticated;
grant select on public.reviews to authenticated;
grant insert(user_id,rating,title,body) on public.reviews to authenticated;
grant update(rating,title,body) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant select,delete on public.review_votes to authenticated;
grant insert(review_id,user_id) on public.review_votes to authenticated;

drop policy if exists read_reviews on public.reviews;
create policy read_reviews on public.reviews for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists write_reviews on public.reviews;
create policy write_reviews on public.reviews for insert to authenticated with check(user_id=auth.uid());
drop policy if exists admin_reviews on public.reviews;
drop policy if exists edit_own_review on public.reviews;
create policy edit_own_review on public.reviews for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists delete_own_review on public.reviews;
create policy delete_own_review on public.reviews for delete to authenticated using(user_id=auth.uid());

create or replace function public.review_is_published(target uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.reviews where id=target and status='published') $$;
revoke all on function public.review_is_published(uuid) from public;
grant execute on function public.review_is_published(uuid) to authenticated;
drop policy if exists review_votes_own_read on public.review_votes;
create policy review_votes_own_read on public.review_votes for select to authenticated using(user_id=auth.uid());
drop policy if exists review_votes_own_insert on public.review_votes;
create policy review_votes_own_insert on public.review_votes for insert to authenticated with check(user_id=auth.uid() and public.review_is_published(review_id));
drop policy if exists review_votes_own_delete on public.review_votes;
create policy review_votes_own_delete on public.review_votes for delete to authenticated using(user_id=auth.uid());

create or replace function public.guard_review_write()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Akses ditolak'; end if;
  if new.rating is null or new.rating not between 1 and 5 or char_length(btrim(coalesce(new.title,''))) not between 1 and 120 or char_length(btrim(coalesce(new.body,''))) not between 1 and 2000 then raise exception 'Review tidak valid'; end if;
  new.title:=btrim(new.title); new.body:=btrim(new.body);
  if tg_op='UPDATE' and old.status in ('hidden','removed') then new.status:=old.status;
  else new.status:=case when (new.title || ' ' || new.body) ~* '(bangsat|bajingan|https?://|bunuh[[:space:]]+diri|menyakiti[[:space:]]+diri)' then 'pending' else 'published' end;
  end if;
  return new;
end; $$;
drop trigger if exists guard_review_write on public.reviews;
create trigger guard_review_write before insert or update of title,body,rating on public.reviews for each row execute function public.guard_review_write();

create or replace function public.update_review_helpful_count()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if tg_op='INSERT' then update public.reviews set helpful_count=helpful_count+1 where id=new.review_id; return new;
  else update public.reviews set helpful_count=greatest(0,helpful_count-1) where id=old.review_id; return old; end if;
end; $$;
drop trigger if exists update_review_helpful_count on public.review_votes;
create trigger update_review_helpful_count after insert or delete on public.review_votes for each row execute function public.update_review_helpful_count();
update public.reviews r set helpful_count=(select count(*) from public.review_votes v where v.review_id=r.id);

-- Extend the existing report infrastructure without changing story/comment rules.
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in ('story','comment','review'));
create or replace function public.guard_story_report()
returns trigger language plpgsql security definer set search_path=public
as $$ declare n integer; begin
  if auth.uid() is null or new.reporter_id<>auth.uid() then raise exception 'Akses ditolak'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select count(*) into n from public.reports where reporter_id=auth.uid() and created_at>now()-interval '1 minute';
  if n>=5 then raise exception 'Batas laporan tercapai'; end if;
  if new.target_type='story' then
    if not exists(select 1 from public.stories where id=new.target_id and (status='published' or (author_id=auth.uid() and needs_moderation))) then raise exception 'Cerita tidak tersedia'; end if;
  elsif new.target_type='comment' then
    if not exists(select 1 from public.story_comments where id=new.target_id and ((status='published' and public.story_is_published(story_id)) or (author_id=auth.uid() and needs_moderation))) then raise exception 'Komentar tidak tersedia'; end if;
  elsif new.target_type='review' then
    if not public.review_is_published(new.target_id) then raise exception 'Review tidak tersedia'; end if;
  else raise exception 'Target tidak valid'; end if;
  return new;
end; $$;

create or replace view public.review_feed with(security_barrier=true) as
select r.id,'Teman ' || substr(r.id::text,1,6) as name,r.rating,r.title,r.body,r.photos,r.is_featured,
  r.helpful_count,(r.created_at at time zone 'Asia/Jakarta')::date as day,
  exists(select 1 from public.review_votes v where v.review_id=r.id and v.user_id=auth.uid()) as voted
from public.reviews r where r.status='published' and r.rating between 1 and 5 order by r.created_at desc,r.id desc;
revoke all on public.review_feed from public,anon,authenticated;
grant select on public.review_feed to anon,authenticated;

commit;
