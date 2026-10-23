-- Nosso Campeonato · endurecimento de segurança
-- Execute após 04_competition_type.sql em projetos existentes.

create or replace function public.nc_generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1),
    ''
  )
  from generate_series(1, 6);
$$;

create or replace function public.nc_create_championship_v2(p_name text, p_competition_type text)
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(p_name)) not between 3 and 60 then raise exception 'invalid_name'; end if;
  if p_competition_type not in ('brazil', 'europe') then raise exception 'invalid_competition'; end if;

  loop
    v_code := public.nc_generate_invite_code();
    exit when not exists (select 1 from public.nc_championships c where c.invite_code = v_code);
  end loop;

  insert into public.nc_championships as c (name, competition_type, invite_code, owner_id)
  values (trim(p_name), p_competition_type, v_code, v_user_id)
  returning c.id into v_id;

  return query select v_id, v_code;
end;
$$;

create table if not exists public.nc_rpc_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action)
);

alter table public.nc_rpc_rate_limits enable row level security;
revoke all on table public.nc_rpc_rate_limits from public, anon, authenticated;

create or replace function public.nc_consume_rate_limit(
  p_action text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_limit < 1 or p_window <= interval '0 seconds' then raise exception 'invalid_rate_limit'; end if;

  insert into public.nc_rpc_rate_limits as limits (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, now(), 1)
  on conflict (user_id, action) do update
  set window_started_at = case
        when limits.window_started_at <= now() - p_window then now()
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at <= now() - p_window then 1
        else limits.request_count + 1
      end
  where limits.window_started_at <= now() - p_window
     or limits.request_count < p_limit
  returning true into v_allowed;

  if not coalesce(v_allowed, false) then raise exception 'rate_limit_exceeded'; end if;
end;
$$;

create or replace function public.nc_create_championship_secure(p_name text, p_competition_type text)
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.nc_consume_rate_limit('create_championship', 5, interval '1 hour');
  return query select * from public.nc_create_championship_v2(p_name, p_competition_type);
end;
$$;

create or replace function public.nc_find_championship_secure(p_invite_code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  competition_type text,
  status text,
  participant_count bigint,
  taken_team_ids text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_invite_code !~ '^[A-Za-z0-9]{6}$' then raise exception 'championship_not_found'; end if;
  perform public.nc_consume_rate_limit('find_championship', 12, interval '1 minute');
  return query select * from public.nc_find_championship_v2(p_invite_code);
end;
$$;

create or replace function public.nc_join_championship_secure(
  p_invite_code text,
  p_display_name text,
  p_team_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.nc_consume_rate_limit('join_championship', 10, interval '5 minutes');
  return public.nc_join_championship(p_invite_code, p_display_name, p_team_id);
end;
$$;

-- Remove endpoints legados e impede que os endpoints internos sejam chamados pelo navegador.
drop function if exists public.nc_create_championship(text);
drop function if exists public.nc_find_championship(text);

revoke execute on function public.nc_generate_invite_code() from public, anon, authenticated;
revoke execute on function public.nc_consume_rate_limit(text, integer, interval) from public, anon, authenticated;
revoke execute on function public.nc_create_championship_v2(text, text) from public, anon, authenticated;
revoke execute on function public.nc_find_championship_v2(text) from public, anon, authenticated;
revoke execute on function public.nc_join_championship(text, text, text) from public, anon, authenticated;

revoke execute on function public.nc_create_championship_secure(text, text) from public, anon;
revoke execute on function public.nc_find_championship_secure(text) from public, anon;
revoke execute on function public.nc_join_championship_secure(text, text, text) from public, anon;

grant execute on function public.nc_create_championship_secure(text, text) to authenticated;
grant execute on function public.nc_find_championship_secure(text) to authenticated;
grant execute on function public.nc_join_championship_secure(text, text, text) to authenticated;
