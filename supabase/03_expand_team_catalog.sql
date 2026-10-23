-- Nosso Campeonato · catálogo ampliado de clubes
-- Execute uma vez em projetos que já rodaram o arquivo 02_online.sql.

create or replace function public.nc_valid_team_id(p_team_id text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_team_id = any(array[
    'portugal','franca','inglaterra','brasil','japao',
    'athletico-pr','atletico-mg','bahia','botafogo','chapecoense','corinthians','coritiba','cruzeiro','flamengo','fluminense',
    'gremio','internacional','mirassol','palmeiras','bragantino','remo','santos','sao-paulo','vasco','vitoria',
    'america-mg','athletic-mg','atletico-go','avai','botafogo-sp','ceara','crb','criciuma','cuiaba','fortaleza',
    'goias','juventude','londrina','nautico','novorizontino','operario-pr','ponte-preta','sao-bernardo','sport','vila-nova',
    'arsenal','chelsea','liverpool','manchester-city','manchester-united','tottenham','barcelona','real-madrid','atletico-madrid',
    'milan','inter-milan','juventus','napoli','roma','atalanta','psg','marseille','monaco','bayern','dortmund','leverkusen',
    'benfica','porto','sporting','ajax','psv','celtic','rangers','galatasaray','fenerbahce'
  ]::text[]);
$$;

alter table public.nc_participants
  drop constraint if exists nc_participants_team_id_check;

alter table public.nc_participants
  add constraint nc_participants_team_id_check
  check (public.nc_valid_team_id(team_id)) not valid;

alter table public.nc_participants
  validate constraint nc_participants_team_id_check;

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
  if exists (select 1 from public.nc_participants p where p.championship_id = v_championship.id and p.user_id = v_user_id) then raise exception 'already_joined'; end if;
  if exists (select 1 from public.nc_participants p where p.championship_id = v_championship.id and p.team_id = p_team_id) then raise exception 'team_taken'; end if;
  if (select count(*) from public.nc_participants p where p.championship_id = v_championship.id) >= 32 then raise exception 'championship_full'; end if;

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

revoke execute on function public.nc_valid_team_id(text) from public, anon, authenticated;
revoke execute on function public.nc_join_championship(text, text, text) from public, anon;
grant execute on function public.nc_join_championship(text, text, text) to authenticated;
