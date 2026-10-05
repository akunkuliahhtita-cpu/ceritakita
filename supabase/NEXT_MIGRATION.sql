begin;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
create index if not exists audit_logs_action_created_idx on public.audit_logs(action,created_at desc);
create index if not exists orders_paid_verified_idx on public.orders(verified_at) where status='paid';
-- These functions accept an actor only from a verified server session. API users cannot execute them.
create or replace function public.admin_user_list(actor uuid,search_value text default '',role_filter text default '',status_filter text default '',premium_filter text default '',page_number integer default 1,page_size integer default 20)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rows_json jsonb;total_count bigint;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin' and suspended_at is null) then raise exception 'Admin required' using errcode='42501';end if;
 if search_value is null or char_length(search_value)>254 or role_filter is null or role_filter not in ('','user','editor','admin') or status_filter is null or status_filter not in ('','active','suspended') or premium_filter is null or premium_filter not in ('','premium','free') or page_number is null or page_number not between 1 and 100000 or page_size is null or page_size not between 1 and 100 then raise exception 'Invalid filter';end if;
 select count(*) into total_count from auth.users u left join public.profiles p on p.id=u.id where
 (strpos(lower(coalesce(u.email,'')||' '||coalesce(p.display_name,'')),lower(btrim(search_value)))>0)
 and (role_filter='' or coalesce(p.role,'user')=role_filter)
 and (status_filter='' or (status_filter='active' and p.suspended_at is null) or (status_filter='suspended' and p.suspended_at is not null))
 and (premium_filter='' or (premium_filter='premium' and p.premium_until>now()) or (premium_filter='free' and (p.premium_until is null or p.premium_until<=now())));
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into rows_json from (
 select u.id,coalesce(u.email,'Tanpa email') as email,coalesce(nullif(p.display_name,''),split_part(u.email,'@',1),'Teman CeritaKita') as name,coalesce(p.role,'user') as role,p.premium_until,u.created_at,p.suspended_at,p.suspension_reason
 from auth.users u left join public.profiles p on p.id=u.id where
 (strpos(lower(coalesce(u.email,'')||' '||coalesce(p.display_name,'')),lower(btrim(search_value)))>0)
 and (role_filter='' or coalesce(p.role,'user')=role_filter)
 and (status_filter='' or (status_filter='active' and p.suspended_at is null) or (status_filter='suspended' and p.suspended_at is not null))
 and (premium_filter='' or (premium_filter='premium' and p.premium_until>now()) or (premium_filter='free' and (p.premium_until is null or p.premium_until<=now())))
 order by u.created_at desc,u.id desc limit page_size offset (page_number-1)*page_size
 )r;
 return jsonb_build_object('rows',rows_json,'total',total_count);
end;$$;
create or replace function public.admin_change_user(actor uuid,target_user uuid,operation text,new_role text default 'user',active_until timestamptz default null,note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare previous public.profiles%rowtype;next_value jsonb;
begin
 -- Serialize role changes so two admins cannot demote each other simultaneously.
 perform pg_advisory_xact_lock(hashtextextended('ceritakita-admin-users',0));
 if not exists(select 1 from public.profiles where id=actor and role='admin' and suspended_at is null) then raise exception 'Admin required' using errcode='42501';end if;
 if target_user is null or operation is null or operation not in ('role','premium_grant','premium_revoke','suspend','activate') or new_role is null or new_role not in ('user','editor','admin') or note is null or char_length(note)>1000 then raise exception 'Invalid operation';end if;
 if actor=target_user and operation='role' and new_role<>'admin' then raise exception 'Self demotion forbidden';end if;
 if actor=target_user and operation='suspend' then raise exception 'Self suspension forbidden';end if;
 if operation='premium_grant' and (active_until is null or active_until<=now()) then raise exception 'Future premium date required';end if;
 if operation='suspend' and char_length(btrim(note))<3 then raise exception 'Suspension reason required';end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'User missing';end if;
 insert into public.profiles(id,display_name) select id,split_part(email,'@',1) from auth.users where id=target_user on conflict(id) do nothing;
 select * into previous from public.profiles where id=target_user for update;
 if operation='role' then update public.profiles set role=new_role where id=target_user;
 elsif operation='premium_grant' then update public.profiles set premium_until=active_until where id=target_user;
 elsif operation='premium_revoke' then update public.profiles set premium_until=null where id=target_user;
 elsif operation='suspend' then update public.profiles set suspended_at=now(),suspension_reason=btrim(note) where id=target_user;
 else update public.profiles set suspended_at=null,suspension_reason=null where id=target_user;end if;
 select jsonb_build_object('role',role,'premium_until',premium_until,'suspended_at',suspended_at) into next_value from public.profiles where id=target_user;
 insert into public.audit_logs(actor_id,action,target,meta) values(actor,'user.'||operation,target_user::text,jsonb_build_object('before',jsonb_build_object('role',previous.role,'premium_until',previous.premium_until,'suspended_at',previous.suspended_at),'after',next_value,'note',btrim(note)));
end;$$;
create or replace function public.admin_audit_list(actor uuid,search_value text default '',action_filter text default '',start_date date default null,end_date date default null,page_number integer default 1,page_size integer default 20)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rows_json jsonb;total_count bigint;actions_json jsonb;start_time timestamptz;end_time timestamptz;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin' and suspended_at is null) then raise exception 'Admin required' using errcode='42501';end if;
 if search_value is null or char_length(search_value)>254 or action_filter is null or char_length(action_filter)>100 or (start_date is not null and end_date is not null and start_date>end_date) or page_number is null or page_number not between 1 and 100000 or page_size is null or page_size not between 1 and 100 then raise exception 'Invalid filter';end if;
 start_time:=start_date::timestamp at time zone 'Asia/Jakarta';end_time:=(end_date+1)::timestamp at time zone 'Asia/Jakarta';
 select count(*) into total_count from public.audit_logs a left join public.profiles p on p.id=a.actor_id left join auth.users u on u.id=a.actor_id where
 (action_filter='' or a.action=action_filter) and (start_time is null or a.created_at>=start_time) and (end_time is null or a.created_at<end_time)
 and strpos(lower(coalesce(p.display_name,'')||' '||coalesce(u.email,'')||' '||a.action||' '||coalesce(a.target,'')),lower(btrim(search_value)))>0;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into rows_json from (
 select a.id,a.created_at,coalesce(nullif(p.display_name,''),u.email,'Admin dihapus') as admin,coalesce(u.email,'') as email,a.action,a.target
 from public.audit_logs a left join public.profiles p on p.id=a.actor_id left join auth.users u on u.id=a.actor_id where
 (action_filter='' or a.action=action_filter) and (start_time is null or a.created_at>=start_time) and (end_time is null or a.created_at<end_time)
 and strpos(lower(coalesce(p.display_name,'')||' '||coalesce(u.email,'')||' '||a.action||' '||coalesce(a.target,'')),lower(btrim(search_value)))>0
 order by a.created_at desc,a.id desc limit page_size offset (page_number-1)*page_size
 )r;
 select coalesce(jsonb_agg(action),'[]'::jsonb) into actions_json from (select distinct action from public.audit_logs order by action limit 200)t;
 return jsonb_build_object('rows',rows_json,'total',total_count,'actions',actions_json);
end;$$;
create or replace function public.admin_dashboard_metrics(actor uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare today date:=(now() at time zone 'Asia/Jakarta')::date;month_start timestamptz;first_day timestamptz;days_json jsonb;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin' and suspended_at is null) then raise exception 'Admin required' using errcode='42501';end if;
 month_start:=date_trunc('month',now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';first_day:=(today-29)::timestamp at time zone 'Asia/Jakarta';
 with registrations as(select (created_at at time zone 'Asia/Jakarta')::date as day,count(*) as value from auth.users where created_at>=first_day and created_at<=now() group by 1),
 revenue as(select (verified_at at time zone 'Asia/Jakarta')::date as day,sum(total_amount) as value from public.orders where status='paid' and verified_at>=first_day and verified_at<=now() group by 1)
 select jsonb_agg(jsonb_build_object('day',d.day::date,'registrations',coalesce(u.value,0),'revenue',coalesce(r.value,0)) order by d.day) into days_json from generate_series(today-29,today,interval '1 day') as d(day) left join registrations u on u.day=d.day::date left join revenue r on r.day=d.day::date;
 return jsonb_build_object(
 'new_users',(select count(*) from auth.users where created_at>=now()-interval '7 days' and created_at<=now()),
 'monthly_revenue',(select coalesce(sum(total_amount),0) from public.orders where status='paid' and verified_at>=month_start and verified_at<=now()),
 'awaiting_orders',(select count(*) from public.orders where status='awaiting_verification'),
 'open_reports',(select count(*) from public.reports where status='open'),
 'unknown_payment_dates',(select count(*) from public.orders where status='paid' and verified_at is null),
 'days',coalesce(days_json,'[]'::jsonb));
end;$$;
revoke all on function public.admin_user_list(uuid,text,text,text,text,integer,integer),public.admin_change_user(uuid,uuid,text,text,timestamptz,text),public.admin_audit_list(uuid,text,text,date,date,integer,integer),public.admin_dashboard_metrics(uuid) from public,anon,authenticated;
grant execute on function public.admin_user_list(uuid,text,text,text,text,integer,integer),public.admin_change_user(uuid,uuid,text,text,timestamptz,text),public.admin_audit_list(uuid,text,text,date,date,integer,integer),public.admin_dashboard_metrics(uuid) to service_role;
commit;
