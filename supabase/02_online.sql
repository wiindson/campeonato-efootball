-- Nosso Campeonato · modo online
-- Execute este arquivo no SQL Editor do Supabase.
-- Ele usa tabelas prefixadas com nc_ para não conflitar com estruturas anteriores.

create or replace function public.nc_valid_team_id(p_team_id text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_team_id = any(array[
    'athletico-pr','atletico-mg','bahia','botafogo','chapecoense','corinthians','coritiba','cruzeiro','flamengo','fluminense',
    'gremio','internacional','mirassol','palmeiras','bragantino','remo','santos','sao-paulo','vasco','vitoria',
    'arsenal','chelsea','liverpool','manchester-city','manchester-united','tottenham','barcelona','real-madrid','atletico-madrid',
    'milan','inter-milan','juventus','napoli','roma','atalanta','psg','marseille','monaco','bayern','dortmund','leverkusen',
    'benfica','porto','sporting','ajax','psv','celtic','rangers','galatasaray','fenerbahce'
  ]::text[]);
$$;

create or replace function public.nc_team_competition(p_team_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_team_id = any(array[
      'athletico-pr','atletico-mg','bahia','botafogo','chapecoense','corinthians','coritiba','cruzeiro','flamengo','fluminense',
      'gremio','internacional','mirassol','palmeiras','bragantino','remo','santos','sao-paulo','vasco','vitoria'
    ]::text[]) then 'brazil'
    when p_team_id = any(array[
      'arsenal','chelsea','liverpool','manchester-city','manchester-united','tottenham','barcelona','real-madrid','atletico-madrid',
      'milan','inter-milan','juventus','napoli','roma','atalanta','psg','marseille','monaco','bayern','dortmund','leverkusen',
      'benfica','porto','sporting','ajax','psv','celtic','rangers','galatasaray','fenerbahce'
    ]::text[]) then 'europe'
    else null
  end;
$$;

create table if not exists public.nc_championships (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 60),
  competition_type text not null check (competition_type in ('brazil', 'europe')),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registration' check (status in ('registration', 'drawn', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nc_participants (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.nc_championships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 32),
  team_id text not null check (public.nc_valid_team_id(team_id)),
  joined_at timestamptz not null default now(),
  unique (championship_id, user_id),
  unique (championship_id, team_id)
);

create table if not exists public.nc_matches (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.nc_championships(id) on delete cascade,
  phase text not null default 'league' check (phase in ('league', 'semifinal', 'final')),
  round_number integer not null check (round_number > 0),
  match_order integer not null check (match_order > 0),
  home_participant_id uuid not null references public.nc_participants(id) on delete cascade,
  away_participant_id uuid not null references public.nc_participants(id) on delete cascade,
  home_score integer check (home_score between 0 and 99),
  away_score integer check (away_score between 0 and 99),
  status text not null default 'scheduled' check (status in ('scheduled', 'finished')),
  updated_at timestamptz not null default now(),
  unique (championship_id, match_order),
  check (home_participant_id <> away_participant_id),
  check ((status = 'scheduled' and home_score is null and away_score is null) or
         (status = 'finished' and home_score is not null and away_score is not null))
);

create index if not exists nc_participants_championship_idx on public.nc_participants(championship_id);
create index if not exists nc_matches_championship_idx on public.nc_matches(championship_id, match_order);

alter table public.nc_championships enable row level security;
alter table public.nc_participants enable row level security;
alter table public.nc_matches enable row level security;

-- O frontend não acessa tabelas diretamente. Toda operação passa pelas funções
-- abaixo, que validam a identidade e a função do usuário.
revoke all on table public.nc_championships from anon, authenticated;
revoke all on table public.nc_participants from anon, authenticated;
revoke all on table public.nc_matches from anon, authenticated;

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

create or replace function public.nc_find_championship_v2(p_invite_code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  competition_type text,
  status text,
  participant_count bigint,
  taken_team_ids text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select c.id,
         c.name,
         c.invite_code,
         c.competition_type,
         c.status,
         count(p.id) as participant_count,
         coalesce(array_agg(p.team_id order by p.joined_at) filter (where p.id is not null), array[]::text[]) as taken_team_ids
  from public.nc_championships c
  left join public.nc_participants p on p.championship_id = c.id
  where c.invite_code = upper(trim(p_invite_code))
  group by c.id, c.name, c.invite_code, c.competition_type, c.status;
$$;

create or replace function public.nc_join_championship(
  p_invite_code text,
  p_display_name text,
  p_team_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_championship public.nc_championships%rowtype;
  v_participant_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(p_display_name)) not between 2 and 32 then raise exception 'invalid_name'; end if;
  if not public.nc_valid_team_id(p_team_id) then raise exception 'invalid_team'; end if;

  select * into v_championship
  from public.nc_championships c
  where c.invite_code = upper(trim(p_invite_code))
  for update;

  if not found then raise exception 'championship_not_found'; end if;
  if v_championship.status <> 'registration' then raise exception 'registration_closed'; end if;
  if public.nc_team_competition(p_team_id) <> v_championship.competition_type then raise exception 'team_wrong_competition'; end if;
  if exists (select 1 from public.nc_participants p where p.championship_id = v_championship.id and p.user_id = v_user_id) then raise exception 'already_joined'; end if;
  if exists (select 1 from public.nc_participants p where p.championship_id = v_championship.id and p.team_id = p_team_id) then raise exception 'team_taken'; end if;
  if (select count(*) from public.nc_participants p where p.championship_id = v_championship.id) >= (case when v_championship.competition_type = 'brazil' then 20 else 30 end) then raise exception 'championship_full'; end if;

  insert into public.nc_participants (championship_id, user_id, display_name, team_id)
  values (v_championship.id, v_user_id, trim(p_display_name), p_team_id)
  returning id into v_participant_id;

  update public.nc_championships set updated_at = now() where id = v_championship.id;
  return v_participant_id;
exception
  when unique_violation then
    if exists (select 1 from public.nc_participants p where p.championship_id = v_championship.id and p.user_id = v_user_id) then
      raise exception 'already_joined';
    end if;
    raise exception 'team_taken';
end;
$$;

create or replace function public.nc_snapshot(p_championship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then return null; end if;
  if not exists (
    select 1 from public.nc_championships c
    where c.id = p_championship_id
      and (c.owner_id = v_user_id or exists (
        select 1 from public.nc_participants p
        where p.championship_id = c.id and p.user_id = v_user_id
      ))
  ) then return null; end if;

  select jsonb_build_object(
    'championship', jsonb_build_object(
      'id', c.id, 'name', c.name, 'invite_code', c.invite_code, 'competition_type', c.competition_type,
      'owner_id', c.owner_id, 'status', c.status, 'updated_at', c.updated_at
    ),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'user_id', p.user_id, 'display_name', p.display_name,
        'team_id', p.team_id, 'joined_at', p.joined_at
      ) order by p.joined_at)
      from public.nc_participants p where p.championship_id = c.id
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'phase', m.phase, 'round_number', m.round_number,
        'match_order', m.match_order, 'home_participant_id', m.home_participant_id,
        'away_participant_id', m.away_participant_id, 'home_score', m.home_score,
        'away_score', m.away_score, 'status', m.status, 'updated_at', m.updated_at
      ) order by m.match_order)
      from public.nc_matches m where m.championship_id = c.id
    ), '[]'::jsonb)
  ) into v_result
  from public.nc_championships c
  where c.id = p_championship_id;

  return v_result;
end;
$$;

create or replace function public.nc_draw_championship(p_championship_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_championship public.nc_championships%rowtype;
  v_ids uuid[];
  v_count integer;
  v_slots integer;
  v_round integer;
  v_index integer;
  v_order integer := 0;
  v_home uuid;
  v_away uuid;
  v_last uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_championship_id::text));

  select * into v_championship from public.nc_championships c where c.id = p_championship_id for update;
  if not found then raise exception 'championship_not_found'; end if;
  if v_championship.owner_id <> v_user_id then raise exception 'owner_only'; end if;
  if v_championship.status <> 'registration' then raise exception 'draw_already_finished'; end if;

  select array_agg(p.id order by random()), count(*)::integer
  into v_ids, v_count
  from public.nc_participants p
  where p.championship_id = p_championship_id;

  if v_count < 2 then raise exception 'minimum_participants'; end if;
  if mod(v_count, 2) = 1 then v_ids := array_append(v_ids, null::uuid); end if;
  v_slots := array_length(v_ids, 1);

  for v_round in 1..(v_slots - 1) loop
    for v_index in 1..(v_slots / 2) loop
      v_home := v_ids[v_index];
      v_away := v_ids[v_slots - v_index + 1];
      if v_home is not null and v_away is not null then
        v_order := v_order + 1;
        if mod(v_round + v_index, 2) = 0 then
          insert into public.nc_matches (championship_id, round_number, match_order, home_participant_id, away_participant_id)
          values (p_championship_id, v_round, v_order, v_away, v_home);
        else
          insert into public.nc_matches (championship_id, round_number, match_order, home_participant_id, away_participant_id)
          values (p_championship_id, v_round, v_order, v_home, v_away);
        end if;
      end if;
    end loop;

    v_last := v_ids[v_slots];
    for v_index in reverse v_slots..3 loop
      v_ids[v_index] := v_ids[v_index - 1];
    end loop;
    v_ids[2] := v_last;
  end loop;

  update public.nc_championships
  set status = 'drawn', updated_at = now()
  where id = p_championship_id;

  return v_order;
end;
$$;

create or replace function public.nc_save_result(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_championship_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_home_score is null or p_away_score is null or p_home_score not between 0 and 99 or p_away_score not between 0 and 99 then raise exception 'invalid_score'; end if;

  select m.championship_id into v_championship_id
  from public.nc_matches m
  join public.nc_championships c on c.id = m.championship_id
  where m.id = p_match_id and c.owner_id = v_user_id;

  if not found then raise exception 'owner_only'; end if;

  update public.nc_matches
  set home_score = p_home_score,
      away_score = p_away_score,
      status = 'finished',
      updated_at = now()
  where id = p_match_id;

  update public.nc_championships set updated_at = now() where id = v_championship_id;
end;
$$;

revoke execute on function public.nc_create_championship_v2(text, text) from public, anon;
revoke execute on function public.nc_find_championship_v2(text) from public, anon;
revoke execute on function public.nc_join_championship(text, text, text) from public, anon;
revoke execute on function public.nc_snapshot(uuid) from public, anon;
revoke execute on function public.nc_draw_championship(uuid) from public, anon;
revoke execute on function public.nc_save_result(uuid, integer, integer) from public, anon;

grant execute on function public.nc_create_championship_v2(text, text) to authenticated;
grant execute on function public.nc_find_championship_v2(text) to authenticated;
grant execute on function public.nc_join_championship(text, text, text) to authenticated;
grant execute on function public.nc_snapshot(uuid) to authenticated;
grant execute on function public.nc_draw_championship(uuid) to authenticated;
grant execute on function public.nc_save_result(uuid, integer, integer) to authenticated;
revoke execute on function public.nc_valid_team_id(text) from public, anon, authenticated;
revoke execute on function public.nc_team_competition(text) from public, anon, authenticated;
revoke execute on function public.nc_generate_invite_code() from public, anon, authenticated;
