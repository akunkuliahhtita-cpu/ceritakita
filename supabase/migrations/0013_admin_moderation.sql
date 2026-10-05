begin;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.stories add column if not exists admin_note text;
alter table public.story_comments add column if not exists admin_note text;
alter table public.reports add column if not exists handled_at timestamptz;
create index if not exists reports_target_status_idx on public.reports(target_type,target_id,status);

create or replace function public.current_user_suspended()
returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and suspended_at is not null); $$;
revoke all on function public.current_user_suspended() from public,anon;
grant execute on function public.current_user_suspended() to authenticated;
create or replace function public.block_suspended_write()
returns trigger language plpgsql security definer set search_path=public as $$ begin
 if public.current_user_suspended() then raise exception 'Akun ditangguhkan' using errcode='42501';end if;
 if tg_op='DELETE' then return old;else return new;end if;
end; $$;
revoke all on function public.block_suspended_write() from public,anon,authenticated;
do $$ declare tbl text;begin
 foreach tbl in array array['stories','story_comments','story_reactions','reports','reviews','review_votes','mood_entries','journal_entries','orders','profiles'] loop
 execute format('drop trigger if exists block_suspended_write on public.%I',tbl);
 execute format('create trigger block_suspended_write before insert or update or delete on public.%I for each row execute function public.block_suspended_write()',tbl);
 end loop;
end; $$;
drop policy if exists suspended_storage_guard on storage.objects;
create policy suspended_storage_guard on storage.objects as restrictive for all to authenticated using(not public.current_user_suspended()) with check(not public.current_user_suspended());

create or replace function public.admin_review_list()
returns jsonb language plpgsql security definer set search_path=public as $$ declare result jsonb;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
 select r.id,coalesce(p.display_name,'Teman CeritaKita') as name,coalesce(u.email,'Akun dihapus') as email,r.rating,r.title,r.body,r.status,r.is_featured,r.admin_note,
 (select count(*) from public.reports x where x.target_type='review' and x.target_id=r.id) as report_count,
 (select count(*) from public.reports x where x.target_type='review' and x.target_id=r.id and x.status='open') as open_reports
 from public.reviews r left join public.profiles p on p.id=r.user_id left join auth.users u on u.id=r.user_id order by r.created_at desc,r.id desc
 )t;return result;
end; $$;

create or replace function public.admin_moderate_review(target_id uuid,operation text,reason text,note text,featured boolean)
returns void language plpgsql security definer set search_path=public as $$ declare previous record;reason_label text;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if operation is null or operation not in ('hidden','removed','restore','feature','note') or note is null or char_length(note)>1000 or featured is null then raise exception 'Invalid action';end if;
 if operation in ('hidden','removed') and (reason is null or reason not in ('spam','sara','lainnya') or char_length(btrim(note))<3) then raise exception 'Reason required';end if;
 select id,status,is_featured,admin_note into previous from public.reviews where id=target_id for update;
 if previous.id is null then raise exception 'Review missing';end if;
 if operation in ('hidden','removed') then
 reason_label:=case reason when 'spam' then 'Spam' when 'sara' then 'SARA' else 'Lainnya' end;
 update public.reviews set status=operation,is_featured=false,admin_note=reason_label||': '||btrim(note) where id=target_id;
 elsif operation='restore' then update public.reviews set status='published',admin_note=null where id=target_id;
 elsif operation='feature' then
 if previous.status is distinct from 'published' then raise exception 'Only published reviews can be featured';end if;
 update public.reviews set is_featured=featured where id=target_id;
 else
 if previous.status in ('hidden','removed') and char_length(btrim(note))<3 then raise exception 'Keep the takedown reason';end if;
 update public.reviews set admin_note=nullif(btrim(note),'') where id=target_id;
 end if;
 if operation in ('hidden','removed','restore') then update public.reports set status='handled',handled_by=auth.uid(),handled_at=now() where target_type='review' and reports.target_id=admin_moderate_review.target_id and status='open';end if;
 perform public.record_admin_audit('moderation.review.'||operation,target_id::text,jsonb_build_object('before',to_jsonb(previous),'reason',reason,'note',note,'featured',featured));
end; $$;

-- Only this private function resolves an anonymous content target to its author.
create or replace function public.moderation_target_author(target_kind text,target_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$ declare owner_id uuid;begin
 if target_kind='story' then select author_id into owner_id from public.stories where id=target_id;
 elsif target_kind='comment' then select author_id into owner_id from public.story_comments where id=target_id;
 else raise exception 'Invalid target';end if;
 if owner_id is null then raise exception 'Content missing';end if;return owner_id;
end; $$;
revoke all on function public.moderation_target_author(text,uuid) from public,anon,authenticated;

create or replace function public.admin_story_queue()
returns jsonb language plpgsql security definer set search_path=public as $$ declare result jsonb;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'kind',t.kind,'alias',t.alias,'body',t.body,'status',t.status,'needs_moderation',t.needs_moderation,
 'report_count',stats.report_count,'open_reports',stats.open_reports,'repeat_reporters',repeaters.n,'suspended',p.suspended_at is not null,'reports',stats.details) order by stats.open_reports desc,t.created_at desc),'[]'::jsonb) into result
 from (select id,'story'::text as kind,alias,body,status,needs_moderation,author_id,created_at from public.stories
 union all select id,'comment',alias,body,status,needs_moderation,author_id,created_at from public.story_comments)t
 left join public.profiles p on p.id=t.author_id
 cross join lateral(select count(*) as report_count,count(*) filter(where x.status='open') as open_reports,
 coalesce(jsonb_agg(jsonb_build_object('reason',x.reason,'detail',x.detail,'status',x.status) order by x.created_at desc),'[]'::jsonb) as details
 from public.reports x where x.target_type=t.kind and x.target_id=t.id)stats
 cross join lateral(select count(distinct x.reporter_id) as n from public.reports x
 left join public.stories s on x.target_type='story' and s.id=x.target_id
 left join public.story_comments c on x.target_type='comment' and c.id=x.target_id
 where coalesce(s.author_id,c.author_id)=t.author_id and x.reporter_id<>t.author_id and x.status<>'dismissed')repeaters
 where stats.report_count>0 or t.needs_moderation;
 return result;
end; $$;

create or replace function public.admin_moderate_story(target_kind text,target_id uuid,operation text,note text)
returns void language plpgsql security definer set search_path=public as $$ declare owner_id uuid;previous text;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if target_kind is null or target_kind not in ('story','comment') or operation is null or operation not in ('hidden','removed','dismiss','suspend') or note is null or char_length(btrim(note)) not between 3 and 1000 then raise exception 'Invalid action';end if;
 if target_kind='story' then select status into previous from public.stories where id=target_id for update;
 else select status into previous from public.story_comments where id=target_id for update;end if;
 owner_id:=public.moderation_target_author(target_kind,target_id);
 if operation='suspend' then
 perform 1 from public.profiles where id=owner_id and role<>'admin' for update;
 if not found then raise exception 'Cannot suspend admins';end if;
 update public.profiles set suspended_at=coalesce(suspended_at,now()),suspension_reason=btrim(note) where id=owner_id;
 elsif operation in ('hidden','removed') then
 if target_kind='story' then update public.stories set status=operation,needs_moderation=false,admin_note=btrim(note) where id=target_id;
 else update public.story_comments set status=operation,needs_moderation=false,admin_note=btrim(note) where id=target_id;end if;
 else
 -- Dismissing a false positive releases automatically-held content, never a takedown.
 if target_kind='story' then update public.stories set status=case when needs_moderation and admin_note is null and status='hidden' then 'published' else status end,needs_moderation=false where id=target_id;
 else update public.story_comments set status=case when needs_moderation and admin_note is null and status='hidden' then 'published' else status end,needs_moderation=false where id=target_id;end if;
 end if;
 if operation<>'suspend' then update public.reports set status=case when operation='dismiss' then 'dismissed' else 'handled' end,handled_by=auth.uid(),handled_at=now() where reports.target_type=target_kind and reports.target_id=admin_moderate_story.target_id and status='open';end if;
 -- The audit target is content, not the hidden author ID.
 perform public.record_admin_audit('moderation.'||target_kind||'.'||operation,target_id::text,jsonb_build_object('before_status',previous,'note',note));
end; $$;

create or replace function public.admin_reveal_story_identity(target_kind text,target_id uuid,justification text,serious_case boolean)
returns jsonb language plpgsql security definer set search_path=public as $$ declare owner_id uuid;identity jsonb;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if target_kind is null or target_kind not in ('story','comment') or serious_case is distinct from true or justification is null or char_length(btrim(justification)) not between 10 and 1000 then raise exception 'Justification required';end if;
 owner_id:=public.moderation_target_author(target_kind,target_id);
 select jsonb_build_object('name',coalesce(p.display_name,'Teman CeritaKita'),'email',coalesce(u.email,'Akun dihapus')) into identity from public.profiles p left join auth.users u on u.id=p.id where p.id=owner_id;
 perform public.record_admin_audit('moderation.identity.reveal',target_kind||':'||target_id::text,jsonb_build_object('justification',btrim(justification),'serious_case',serious_case));
 return identity;
end; $$;
revoke all on function public.admin_review_list(),public.admin_moderate_review(uuid,text,text,text,boolean),public.admin_story_queue(),public.admin_moderate_story(text,uuid,text,text),public.admin_reveal_story_identity(text,uuid,text,boolean) from public,anon;
grant execute on function public.admin_review_list(),public.admin_moderate_review(uuid,text,text,text,boolean),public.admin_story_queue(),public.admin_moderate_story(text,uuid,text,text),public.admin_reveal_story_identity(text,uuid,text,boolean) to authenticated;
commit;
