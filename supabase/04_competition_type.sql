-- Nosso Campeonato · separação entre campeonatos brasileiros e europeus
-- Migração não destrutiva para projetos que já executaram 02_online.sql.

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

alter table public.nc_championships
  add column if not exists competition_type text;

update public.nc_championships c
set competition_type = case
  when exists (
    select 1 from public.nc_participants p
    where p.championship_id = c.id
      and public.nc_team_competition(p.team_id) = 'europe'
  ) then 'europe'
  else 'brazil'
end
where c.competition_type is null;

alter table public.nc_championships
  alter column competition_type set default 'brazil',
  alter column competition_type set not null;

alter table public.nc_championships
  drop constraint if exists nc_championships_competition_type_check;

alter table public.nc_championships
  add constraint nc_championships_competition_type_check
  check (competition_type in ('brazil', 'europe'));

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
  if public.nc_team_competition(p_team_id) is null then raise exception 'invalid_team'; end if;

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
      'id', c.id, 'name', c.name, 'invite_code', c.invite_code,
      'competition_type', c.competition_type, 'owner_id', c.owner_id,
      'status', c.status, 'updated_at', c.updated_at
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

revoke execute on function public.nc_create_championship_v2(text, text) from public, anon;
revoke execute on function public.nc_find_championship_v2(text) from public, anon;
revoke execute on function public.nc_join_championship(text, text, text) from public, anon;
revoke execute on function public.nc_snapshot(uuid) from public, anon;
revoke execute on function public.nc_team_competition(text) from public, anon, authenticated;
revoke execute on function public.nc_generate_invite_code() from public, anon, authenticated;

grant execute on function public.nc_create_championship_v2(text, text) to authenticated;
grant execute on function public.nc_find_championship_v2(text) to authenticated;
grant execute on function public.nc_join_championship(text, text, text) to authenticated;
grant execute on function public.nc_snapshot(uuid) to authenticated;
