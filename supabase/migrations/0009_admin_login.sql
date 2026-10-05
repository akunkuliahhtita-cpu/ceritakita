begin;
create table if not exists public.admin_login_limits (
 ip_hash text primary key check(length(ip_hash)=64),
 window_start timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 5),
 attempted_at timestamptz[] not null default array[]::timestamptz[]
);
alter table public.admin_login_limits add column if not exists attempted_at timestamptz[] not null default array[]::timestamptz[];
alter table public.admin_login_limits enable row level security;
revoke all on public.admin_login_limits from public,anon,authenticated;
grant all on public.admin_login_limits to service_role;
create or replace function public.consume_admin_login(ip_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_limit public.admin_login_limits%rowtype; recent timestamptz[];
begin
 if ip_hash is null or ip_hash !~ '^[0-9a-f]{64}$' then return false; end if;
 delete from public.admin_login_limits where window_start<now()-interval '1 day';
 insert into public.admin_login_limits(ip_hash) values(consume_admin_login.ip_hash) on conflict do nothing;
 select l.* into current_limit from public.admin_login_limits l where l.ip_hash=consume_admin_login.ip_hash for update;
 select coalesce(array_agg(t order by t),array[]::timestamptz[]) into recent
 from unnest(current_limit.attempted_at) t where t>now()-interval '10 minutes';
 if cardinality(recent)>=5 then return false; end if;
 recent:=array_append(recent,now());
 update public.admin_login_limits l set attempts=cardinality(recent),attempted_at=recent,window_start=now() where l.ip_hash=consume_admin_login.ip_hash;
 return true;
end; $$;
revoke all on function public.consume_admin_login(text) from public,anon,authenticated;
grant execute on function public.consume_admin_login(text) to service_role;
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null,
 target text,
 meta jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public,anon,authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using(public.is_admin());
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
commit;
