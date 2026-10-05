begin;
alter table public.plans add column if not exists is_highlighted boolean not null default false;
alter table public.plans add column if not exists sort integer not null default 0;
alter table public.plans add column if not exists type text not null default 'subscription';
alter table public.plans enable row level security;
revoke insert,update,delete on public.plans from anon,authenticated;
grant select on public.plans to anon,authenticated;
create table if not exists public.media (
 id uuid primary key default gen_random_uuid(),path text not null unique,url text not null,
 name text not null default '',alt text not null default '',size bigint not null check(size between 1 and 5242880),
 mime text not null check(mime in ('image/jpeg','image/png','image/webp')),
 uploaded_by uuid references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),deleting boolean not null default false
);
alter table public.media add column if not exists name text not null default '';
alter table public.media add column if not exists deleting boolean not null default false;
alter table public.media enable row level security;
revoke all on public.media from public,anon,authenticated;
grant select on public.media to authenticated;
drop policy if exists media_admin_read on public.media;
create policy media_admin_read on public.media for select to authenticated using(public.is_admin());
create table if not exists public.site_settings(key text primary key,value jsonb not null);
alter table public.site_settings enable row level security;
revoke insert,update,delete on public.site_settings from anon,authenticated;
grant select on public.site_settings to anon,authenticated;
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select to anon,authenticated using(true);
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('media','media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select to anon,authenticated using(bucket_id='media');
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='media' and public.is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects for update to authenticated using(bucket_id='media' and public.is_admin()) with check(bucket_id='media' and public.is_admin());
drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects for delete to authenticated using(bucket_id='media' and public.is_admin());
create or replace function public.record_admin_audit(audit_action text,audit_target text,audit_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if length(audit_action) not between 1 and 100 or length(audit_target)>200 or audit_meta is null or jsonb_typeof(audit_meta)<>'object' or octet_length(audit_meta::text)>128000 then raise exception 'Audit tidak valid'; end if;
 insert into public.audit_logs(actor_id,action,target,meta) values(auth.uid(),audit_action,audit_target,audit_meta);
end; $$;
create or replace function public.admin_save_plan(payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare plan_id uuid; feature_list text[]; old_plan jsonb;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>20000 then raise exception 'Paket tidak valid'; end if;
 if coalesce(length(trim(payload->>'name')),0) not between 1 and 80 or coalesce(payload->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(payload->>'slug')>80 then raise exception 'Paket tidak valid'; end if;
 if coalesce(payload->>'period','') not in ('free','monthly','yearly') or coalesce(payload->>'price_idr','') !~ '^[0-9]+$' or (payload->>'price_idr')::bigint>20000 then raise exception 'Harga tidak valid'; end if;
 if ((payload->>'period')='free' and (payload->>'price_idr')::integer<>0) or ((payload->>'period')<>'free' and (payload->>'price_idr')::integer<9000) then raise exception 'Harga tidak valid'; end if;
 if jsonb_typeof(payload->'features') is distinct from 'array' or jsonb_array_length(payload->'features')>30 then raise exception 'Fitur tidak valid'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'features') f where jsonb_typeof(f)<>'string' or length(trim(f#>>'{}')) not between 1 and 200) then raise exception 'Fitur tidak valid'; end if;
 select coalesce(array_agg(trim(f)),array[]::text[]) into feature_list from jsonb_array_elements_text(payload->'features') f;
 if jsonb_typeof(payload->'is_active') is distinct from 'boolean' or jsonb_typeof(payload->'is_highlighted') is distinct from 'boolean' or coalesce(payload->>'sort','') !~ '^[0-9]{1,4}$' then raise exception 'Status tidak valid'; end if;
 if nullif(payload->>'id','') is not null then
  plan_id:=(payload->>'id')::uuid;
  select to_jsonb(p) into old_plan from public.plans p where p.id=plan_id for update;
  if old_plan is null then raise exception 'Paket tidak ditemukan'; end if;
  update public.plans set name=trim(payload->>'name'),slug=payload->>'slug',price_idr=(payload->>'price_idr')::integer,period=payload->>'period',features=feature_list,is_active=(payload->>'is_active')::boolean,is_highlighted=(payload->>'is_highlighted')::boolean,sort=(payload->>'sort')::integer where id=plan_id;
 else
  insert into public.plans(name,slug,price_idr,period,features,is_active,is_highlighted,sort) values(trim(payload->>'name'),payload->>'slug',(payload->>'price_idr')::integer,payload->>'period',feature_list,(payload->>'is_active')::boolean,(payload->>'is_highlighted')::boolean,(payload->>'sort')::integer) returning id into plan_id;
 end if;
 perform public.record_admin_audit(case when old_plan is null then 'plan.create' else 'plan.update' end,plan_id::text,jsonb_build_object('before',old_plan,'after',payload));
 return plan_id;
end; $$;
create or replace function public.admin_delete_plan(plan_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare old_plan jsonb;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 select to_jsonb(p) into old_plan from public.plans p where p.id=plan_id for update;
 if old_plan is null then raise exception 'Paket tidak ditemukan'; end if;
 if exists(select 1 from public.orders o where o.plan_id=admin_delete_plan.plan_id) then raise exception 'Paket masih dipakai pesanan. Nonaktifkan paket saja.'; end if;
 delete from public.plans p where p.id=plan_id;
 perform public.record_admin_audit('plan.delete',plan_id::text,old_plan);
end; $$;
create or replace function public.admin_list_media(query_text text default '',page_number integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if query_text is null or length(query_text)>120 or page_number is null or page_number not between 1 and 10000 then raise exception 'Pencarian tidak valid'; end if;
 return jsonb_build_object(
  'total',(select count(*) from public.media m where strpos(lower(m.name||' '||m.alt),lower(trim(query_text)))>0),
  'rows',coalesce((select jsonb_agg(to_jsonb(items) order by items.created_at desc,items.id) from (
    select m.id,m.url,m.path,m.name,m.alt,m.size,m.mime,m.created_at,m.deleting
    from public.media m where strpos(lower(m.name||' '||m.alt),lower(trim(query_text)))>0
    order by m.created_at desc,m.id limit 24 offset (page_number-1)*24
  ) items),'[]'::jsonb)
 );
end; $$;
revoke all on function public.admin_list_media(text,integer) from public,anon;
grant execute on function public.admin_list_media(text,integer) to authenticated;
create or replace function public.admin_register_media(payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare media_id uuid;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if coalesce(payload->>'path','') not like auth.uid()::text||'/%' or not exists(select 1 from storage.objects o where o.bucket_id='media' and o.name=payload->>'path') then raise exception 'File tidak valid'; end if;
 if coalesce(payload->>'url','') !~ '^https://' or (payload->>'mime') not in ('image/jpeg','image/png','image/webp') or (payload->>'size')::bigint not between 1 and 5242880 or length(coalesce(payload->>'alt',''))>300 then raise exception 'Media tidak valid'; end if;
 insert into public.media(path,url,name,alt,size,mime,uploaded_by) values(payload->>'path',payload->>'url',left(coalesce(payload->>'name',''),200),coalesce(payload->>'alt',''),(payload->>'size')::bigint,payload->>'mime',auth.uid()) returning id into media_id;
 perform public.record_admin_audit('media.upload',media_id::text,jsonb_build_object('path',payload->>'path','size',payload->'size'));
 return media_id;
end; $$;
create or replace function public.admin_update_media_alt(media_id uuid,alt_text text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if alt_text is null or length(alt_text)>300 then raise exception 'Alt maksimal 300 karakter'; end if;
 update public.media m set alt=trim(alt_text) where m.id=media_id and not m.deleting;
 if not found then raise exception 'Media tidak ditemukan'; end if;
 perform public.record_admin_audit('media.alt',media_id::text,jsonb_build_object('alt',trim(alt_text)));
end; $$;
create or replace function public.admin_media_in_use(media_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare item public.media%rowtype; tab record; used boolean;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 select * into item from public.media m where m.id=media_id;
 if item.id is null then raise exception 'Media tidak ditemukan'; end if;
 for tab in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname not in ('media','audit_logs','admin_login_limits') loop
  execute format('select exists(select 1 from public.%I t where strpos(to_jsonb(t)::text,$1)>0 or strpos(to_jsonb(t)::text,$2)>0)',tab.relname) into used using item.url,item.path;
  if used then return true; end if;
 end loop;
 return false;
end; $$;
create or replace function public.admin_prepare_media_delete(media_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare storage_path text;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ceritakita-media-references',0));
 select m.path into storage_path from public.media m where m.id=media_id for update;
 if storage_path is null then raise exception 'Media tidak ditemukan'; end if;
 if public.admin_media_in_use(media_id) then raise exception 'Gambar masih dipakai. Ganti gambar pada konten terlebih dahulu.'; end if;
 update public.media m set deleting=true where m.id=media_id;
 return storage_path;
end; $$;
create or replace function public.admin_finish_media_delete(media_id uuid,cancel_delete boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare old_media jsonb;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if cancel_delete then update public.media m set deleting=false where m.id=media_id; return; end if;
 select to_jsonb(m) into old_media from public.media m where m.id=media_id and m.deleting for update;
 if old_media is null then raise exception 'Media tidak ditemukan'; end if;
 if exists(select 1 from storage.objects o where o.bucket_id='media' and o.name=old_media->>'path') then raise exception 'File belum terhapus'; end if;
 delete from public.media m where m.id=media_id;
 perform public.record_admin_audit('media.delete',media_id::text,old_media);
end; $$;
create or replace function public.admin_save_site_settings(settings jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare image_url text; old_value jsonb;
begin
 if not public.is_admin() then raise exception 'Akses admin diperlukan'; end if;
 if settings is null or jsonb_typeof(settings)<>'object' or octet_length(settings::text)>32000 then raise exception 'Pengaturan tidak valid'; end if;
 if coalesce(length(trim(settings->>'name')),0) not between 1 and 80 or coalesce(settings->>'whatsappNumber','') !~ '^[0-9]{8,15}$' then raise exception 'Identitas atau WhatsApp tidak valid'; end if;
 if jsonb_typeof(settings->'socials') is distinct from 'array' or jsonb_typeof(settings->'chips') is distinct from 'array' or jsonb_typeof(settings->'emergencyContacts') is distinct from 'array' or jsonb_typeof(settings->'stats') is distinct from 'object' then raise exception 'Pengaturan tidak lengkap'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ceritakita-media-references',0));
 foreach image_url in array array[settings->>'logoUrl',settings->>'faviconUrl'] loop
  if image_url is null then raise exception 'Gambar tidak valid'; end if;
  if image_url not in ('/logo-mark.png','/icon.png') and not exists(select 1 from public.media m where m.url=image_url and not m.deleting) then raise exception 'Pilih gambar yang masih tersedia di library'; end if;
 end loop;
 select value into old_value from public.site_settings where key='public_settings' for update;
 insert into public.site_settings(key,value) values('public_settings',settings) on conflict(key) do update set value=excluded.value;
 perform public.record_admin_audit('settings.update','site',jsonb_build_object('before',old_value,'after',settings));
end; $$;
revoke all on function public.record_admin_audit(text,text,jsonb) from public,anon;
grant execute on function public.record_admin_audit(text,text,jsonb) to authenticated;
revoke all on function public.admin_save_plan(jsonb) from public,anon;
grant execute on function public.admin_save_plan(jsonb) to authenticated;
revoke all on function public.admin_delete_plan(uuid) from public,anon;
grant execute on function public.admin_delete_plan(uuid) to authenticated;
revoke all on function public.admin_register_media(jsonb) from public,anon;
grant execute on function public.admin_register_media(jsonb) to authenticated;
revoke all on function public.admin_update_media_alt(uuid,text) from public,anon;
grant execute on function public.admin_update_media_alt(uuid,text) to authenticated;
revoke all on function public.admin_media_in_use(uuid) from public,anon;
grant execute on function public.admin_media_in_use(uuid) to authenticated;
revoke all on function public.admin_prepare_media_delete(uuid) from public,anon;
grant execute on function public.admin_prepare_media_delete(uuid) to authenticated;
revoke all on function public.admin_finish_media_delete(uuid,boolean) from public,anon;
grant execute on function public.admin_finish_media_delete(uuid,boolean) to authenticated;
revoke all on function public.admin_save_site_settings(jsonb) from public,anon;
grant execute on function public.admin_save_site_settings(jsonb) to authenticated;
create or replace function public.create_premium_order(selected_plan uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare p record; settings record; code integer; order_id uuid; existing uuid; expiry integer;
begin
  if auth.uid() is null then raise exception 'Masuk terlebih dahulu'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ceritakita-payment-orders',0));
  perform public.expire_my_orders();
  select id into existing from public.orders where user_id=auth.uid() and plan_id=selected_plan and status in ('pending','rejected') and expires_at>now() order by created_at desc limit 1;
  if existing is not null then return existing; end if;
  if exists(select 1 from public.orders where user_id=auth.uid() and status in ('pending','awaiting_verification','rejected')) then raise exception 'Selesaikan pesanan sebelumnya dulu, ya.'; end if;
  if (select count(*) from public.orders where user_id=auth.uid() and created_at>now()-interval '1 day') >= 5 then raise exception 'Maksimal 5 pesanan per hari.'; end if;
  select id,name,slug,price_idr,period,features,is_active into p from public.plans where id=selected_plan and is_active for share;
  if p.id is null or p.period not in ('monthly','yearly') or p.price_idr is null or p.price_idr<9000 or p.price_idr>20000 then raise exception 'Paket tidak tersedia'; end if;
  select id,qris_image_url,merchant_name,instructions,expiry_minutes,unique_code_enabled,provider_label into settings from public.payment_settings where id=1 for share;
  if settings.qris_image_url is null or settings.qris_image_url !~ '^https://' then raise exception 'QRIS belum tersedia'; end if;
  expiry := greatest(1,least(coalesce(settings.expiry_minutes,60),1440));
  code := 0;
  if settings.unique_code_enabled then
    select candidate into code from generate_series(1,99) candidate
    where not exists(select 1 from public.orders where total_amount=p.price_idr+candidate and status in ('pending','awaiting_verification','rejected'))
    order by random() limit 1;
    if code is null then raise exception 'Kode pembayaran sedang penuh. Coba lagi nanti.'; end if;
  end if;
  insert into public.profiles(id,display_name) select auth.uid(),split_part(email,'@',1) from auth.users where id=auth.uid() on conflict(id) do nothing;
  insert into public.orders(user_id,plan_id,base_amount,unique_code,total_amount,status,expires_at,qris_image_url,merchant_name,instructions)
  values(auth.uid(),p.id,p.price_idr,code,p.price_idr+code,'pending',now()+make_interval(mins=>expiry),settings.qris_image_url,settings.merchant_name,settings.instructions)
  returning id into order_id;
  return order_id;
end; $$;
revoke all on function public.create_premium_order(uuid) from public;
grant execute on function public.create_premium_order(uuid) to authenticated;


commit;
