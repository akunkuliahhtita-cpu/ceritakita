begin;
alter table public.orders add column if not exists verified_by uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists verified_at timestamptz;
alter table public.orders add column if not exists plan_period text;
alter table public.orders add column if not exists plan_name text;
update public.orders o set plan_period=p.period,plan_name=p.name from public.plans p where p.id=o.plan_id and (o.plan_period is null or o.plan_name is null);
alter table public.orders drop constraint if exists orders_plan_period_check;
alter table public.orders add constraint orders_plan_period_check check(plan_period in ('free','monthly','yearly'));
create index if not exists orders_status_expires_idx on public.orders(status,expires_at);
create or replace function public.snapshot_order_plan()
returns trigger language plpgsql security definer set search_path=public as $$ begin
 select period,name into new.plan_period,new.plan_name from public.plans where id=new.plan_id;
 return new;
end; $$;
drop trigger if exists snapshot_order_plan on public.orders;
create trigger snapshot_order_plan before insert on public.orders for each row execute function public.snapshot_order_plan();
revoke all on function public.snapshot_order_plan() from public,anon,authenticated;
alter table public.orders enable row level security;
alter table public.payment_settings enable row level security;
drop policy if exists orders_admin_update on public.orders;
revoke insert,update,delete on public.orders,public.payment_settings from anon,authenticated;
grant select on public.orders to authenticated;
grant select on public.payment_settings to anon,authenticated;

create or replace function public.admin_payment_orders(actor uuid,search_email text default '',filter_status text default '',page_number integer default 1,page_size integer default 20)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rows_json jsonb;total_count bigint;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin') then raise exception 'Admin required' using errcode='42501';end if;
 if search_email is null or char_length(search_email)>254 or filter_status is null or filter_status not in ('','pending','awaiting_verification','paid','rejected','expired') or page_number is null or page_number<1 or page_number>100000 or page_size is null or page_size not between 1 and 1000 then raise exception 'Invalid filter';end if;
 select count(*) into total_count from public.orders o left join auth.users u on u.id=o.user_id where (filter_status='' or o.status=filter_status) and strpos(lower(coalesce(u.email,'')),lower(btrim(search_email)))>0;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into rows_json from (
 select o.id,coalesce(u.email,'Akun dihapus') as email,coalesce(o.plan_name,p.name,'Paket tidak tersedia') as plan_name,o.total_amount,o.status,o.created_at,o.expires_at,o.note,(o.proof_url is not null) as has_proof,o.verified_at
 from public.orders o left join auth.users u on u.id=o.user_id left join public.plans p on p.id=o.plan_id
 where (filter_status='' or o.status=filter_status) and strpos(lower(coalesce(u.email,'')),lower(btrim(search_email)))>0
 order by o.created_at desc,o.id desc limit page_size offset (page_number-1)*page_size
 ) r;
 return jsonb_build_object('rows',rows_json,'total',total_count);
end; $$;

create or replace function public.admin_save_qris(actor uuid,settings jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare previous jsonb;minutes integer;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin') then raise exception 'Admin required' using errcode='42501';end if;
 if jsonb_typeof(settings) is distinct from 'object' or octet_length(settings::text)>16000
 or char_length(btrim(coalesce(settings->>'merchant_name',''))) not between 1 and 120
 or char_length(btrim(coalesce(settings->>'instructions',''))) not between 1 and 5000
 or coalesce(settings->>'expiry_minutes','') !~ '^[0-9]{1,4}$'
 or jsonb_typeof(settings->'unique_code_enabled') is distinct from 'boolean' then raise exception 'Invalid settings';end if;
 minutes:=(settings->>'expiry_minutes')::integer;if minutes not between 1 and 1440 then raise exception 'Invalid expiry';end if;
 perform pg_advisory_xact_lock(hashtext('ceritakita-media-references'));
 if not exists(select 1 from public.media where url=settings->>'qris_image_url' and not deleting) then raise exception 'Select a valid media image';end if;
 select to_jsonb(s) into previous from public.payment_settings s where id=1 for update;
 insert into public.payment_settings(id,qris_image_url,merchant_name,instructions,expiry_minutes,unique_code_enabled,provider_label)
 values(1,settings->>'qris_image_url',btrim(settings->>'merchant_name'),btrim(settings->>'instructions'),minutes,(settings->>'unique_code_enabled')::boolean,'DANA')
 on conflict(id) do update set qris_image_url=excluded.qris_image_url,merchant_name=excluded.merchant_name,instructions=excluded.instructions,expiry_minutes=excluded.expiry_minutes,unique_code_enabled=excluded.unique_code_enabled,provider_label='DANA';
 insert into public.audit_logs(actor_id,action,target,meta) values(actor,'payment.qris.update','payment_settings:1',jsonb_build_object('before',previous,'after',settings));
end; $$;

create or replace function public.admin_verify_payment(actor uuid,order_id uuid,decision text,rejection_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare payment public.orders%rowtype;active_until timestamptz;next_until timestamptz;minutes integer;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin') then raise exception 'Admin required' using errcode='42501';end if;
 if decision is null or decision not in ('paid','rejected') or rejection_reason is null or char_length(rejection_reason)>1000 or (decision='rejected' and btrim(rejection_reason)='') then raise exception 'Invalid decision';end if;
 select * into payment from public.orders where id=order_id for update;
 if payment.id is null or payment.status is distinct from 'awaiting_verification' or payment.proof_url is null
 or payment.proof_url not like payment.user_id::text||'/'||payment.id::text||'/%'
 or not exists(select 1 from storage.objects where bucket_id='proofs' and name=payment.proof_url) then raise exception 'Order is not awaiting verification';end if;
 if decision='paid' then
  if payment.plan_period is null or payment.plan_period not in ('monthly','yearly') then raise exception 'Invalid paid plan period';end if;
  select premium_until into active_until from public.profiles where id=payment.user_id for update;
  if not found then raise exception 'Profile not found';end if;
  next_until:=greatest(coalesce(active_until,now()),now())+case when payment.plan_period='yearly' then interval '1 year' else interval '1 month' end;
  update public.profiles set premium_until=next_until where id=payment.user_id;
  update public.orders set status='paid',note=null,verified_by=actor,verified_at=now() where id=payment.id;
 else
  select greatest(1,least(coalesce(expiry_minutes,60),1440)) into minutes from public.payment_settings where id=1;
  update public.orders set status='rejected',note=btrim(rejection_reason),verified_by=actor,verified_at=now(),expires_at=greatest(expires_at,now()+make_interval(mins=>coalesce(minutes,60))) where id=payment.id;
 end if;
 insert into public.audit_logs(actor_id,action,target,meta) values(actor,'payment.'||decision,payment.id::text,jsonb_build_object('before_status',payment.status,'reason',case when decision='rejected' then btrim(rejection_reason) else null end,'premium_until',next_until));
 return jsonb_build_object('user_id',payment.user_id,'plan_name',payment.plan_name,'premium_until',next_until);
end; $$;

-- Submitted proofs stay in the manual verification queue even after the payment deadline.
create or replace function public.expire_payment_orders()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
 update public.orders set status='expired' where status in ('pending','rejected') and expires_at<=now();
 get diagnostics changed=row_count;
 if changed>0 then insert into public.audit_logs(actor_id,action,target,meta) values(null,'payment.orders.expire','orders',jsonb_build_object('count',changed));end if;
 return changed;
end; $$;
revoke all on function public.admin_payment_orders(uuid,text,text,integer,integer),public.admin_save_qris(uuid,jsonb),public.admin_verify_payment(uuid,uuid,text,text),public.expire_payment_orders() from public,anon,authenticated;
grant execute on function public.admin_payment_orders(uuid,text,text,integer,integer),public.admin_save_qris(uuid,jsonb),public.admin_verify_payment(uuid,uuid,text,text),public.expire_payment_orders() to service_role;
commit;
