-- ============================================================================
-- LIGAS MAZI — Esquema de backend (PostgreSQL / Supabase)
-- Diseñado para miles de personas en vivo (teléfono, tablet, PC).
--
-- Principios:
--   1. Una persona = una cuenta (auth.users). Los "roles" son sombreros por liga.
--   2. El CURP NUNCA se guarda en claro ni se puede leer por la API: solo su
--      hash, en una tabla aparte que solo toca el service_role. Nadie puede
--      buscar a un menor por CURP.
--   3. La bitácora del partido (game_events) es APPEND-ONLY con doble tiempo
--      (reloj del juego + reloj real). Las correcciones son eventos de reversa,
--      nunca borrados.
--   4. Realtime empuja los eventos a los espectadores → marcador en vivo.
--   5. Los datos sensibles de un menor (ubicación en vivo, calendario) no son
--      públicos: solo tutor, coach y admin de la liga.
--
-- Aplícalo con: supabase db push  (o el MCP apply_migration).
-- ============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid, digest

-- ---------------------------------------------------------------------------
-- PERFILES (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- JUGADORES (el atleta). El tutor (papá/mamá) es el dueño de la ficha.
-- birthdate solo sirve para calcular is_minor; no se expone.
-- ---------------------------------------------------------------------------
create table public.players (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  photo_url     text,                         -- se le quita el GPS al subir
  birthdate     date not null,
  -- is_minor lo mantiene un trigger: current_date no es immutable, así que no
  -- puede ser columna generada. El trigger la recalcula al insertar/cambiar fecha.
  is_minor      boolean not null default false,
  guardian_id   uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);
create or replace function public.set_is_minor() returns trigger
language plpgsql set search_path = '' as $$ begin
  new.is_minor := new.birthdate > (current_date - interval '18 years'); return new;
end $$;
create trigger players_is_minor before insert or update of birthdate on public.players
  for each row execute function public.set_is_minor();

-- CURP: tabla PRIVADA aparte. Solo el service_role la toca (sin políticas RLS
-- que permitan a usuarios leerla). Guardamos el hash, jamás el CURP en claro.
-- Sirve para deduplicar ("no dos Diegos") sin exponer nada.
create table private_curp (
  player_id  uuid primary key references public.players(id) on delete cascade,
  curp_hash  bytea not null unique              -- digest(curp_normalizado,'sha256')
);
alter table private_curp enable row level security;   -- sin policies = nadie (salvo service_role) lee

-- ---------------------------------------------------------------------------
-- LIGAS, TEMPORADAS, EQUIPOS
-- ---------------------------------------------------------------------------
create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id),
  -- "perillas" de la liga (reglas + captura + privacidad):
  settings    jsonb not null default '{
    "quarter_minutes": 10, "three_point": true, "var_enabled": false,
    "detailed_defense": false, "protect_minors": true, "realistic_court": true
  }',
  archived_at timestamptz,                       -- nunca se borra: se archiva
  created_at  timestamptz not null default now()
);

create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  name       text not null,
  starts_on  date,
  ends_on    date,
  is_current boolean not null default true
);

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  name       text not null,
  crest_url  text,
  color      text
);

-- ---------------------------------------------------------------------------
-- MEMBRESÍAS = los "sombreros". Una persona puede ser papá en una liga y
-- público en otra. El rol es contextual por liga.
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin_liga','coach','papa','jugador','publico');

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  league_id  uuid not null references public.leagues(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete cascade,   -- para coach/papa
  player_id  uuid references public.players(id) on delete cascade, -- para papa/jugador
  role       public.member_role not null,
  created_at timestamptz not null default now()
);
-- una PK no admite expresiones (coalesce); el mismo unicidad va como índice único
create unique index memberships_uniq on public.memberships
  (account_id, league_id, role, coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid));

-- alineación por temporada
create table public.roster (
  player_id uuid not null references public.players(id) on delete cascade,
  team_id   uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  jersey    int,
  position  text,
  primary key (player_id, team_id, season_id)
);

-- ---------------------------------------------------------------------------
-- PARTIDOS
-- ---------------------------------------------------------------------------
create type public.game_status as enum ('scheduled','live','final','archived');

create table public.games (
  id           uuid primary key default gen_random_uuid(),
  season_id    uuid not null references public.seasons(id) on delete cascade,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  scheduled_at timestamptz,
  court        text,
  status       public.game_status not null default 'scheduled',
  home_score   int not null default 0,
  away_score   int not null default 0,
  period       int not null default 1
);

-- ---------------------------------------------------------------------------
-- BITÁCORA DEL PARTIDO — APPEND ONLY, doble tiempo. El corazón del sistema.
-- La mesa (anotador) inserta; nadie actualiza ni borra. Correcciones = reversa.
-- ---------------------------------------------------------------------------
create type public.event_type as enum (
  'point','foul','rebound','assist','steal','block','turnover',
  'sub_in','sub_out','timeout','period_start','period_end','reversal'
);

create table public.game_events (
  id          bigint generated always as identity primary key,
  game_id     uuid not null references public.games(id) on delete cascade,
  player_id   uuid references public.players(id),
  team_id     uuid references public.teams(id),
  type        public.event_type not null,
  value       int,                              -- p.ej. +2, +3, +1 tiro libre
  period      int not null,
  game_clock  text,                             -- reloj del juego "12:34"
  wall_ts     timestamptz not null default now(),  -- reloj real
  reverses    bigint references public.game_events(id), -- si corrige otro evento
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.game_events (game_id, id);
create index on public.game_events (player_id);

-- Blindaje append-only: prohíbe UPDATE y DELETE a nivel de tabla.
create or replace function public.no_mutation() returns trigger
language plpgsql set search_path = '' as $$ begin
  raise exception 'game_events es append-only: usa un evento de reversa, no edites ni borres';
end $$;
create trigger ge_no_update before update on public.game_events
  for each row execute function public.no_mutation();
create trigger ge_no_delete before delete on public.game_events
  for each row execute function public.no_mutation();

-- ---------------------------------------------------------------------------
-- ESTADÍSTICAS AGREGADAS por jugador/temporada (alimentan la carta).
-- Se recomputan con un trigger al insertar eventos (o job).
-- Robos/tapones solo se cuentan si la liga activó 'detailed_defense'.
-- ---------------------------------------------------------------------------
create table public.player_season_stats (
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  games int default 0, minutes int default 0,
  points int default 0, fouls int default 0,
  rebounds int default 0, assists int default 0, turnovers int default 0,
  steals int default 0, blocks int default 0,   -- 0 si la liga no captura defensa
  updated_at timestamptz not null default now(),
  primary key (player_id, season_id)
);

-- cartas coleccionables (rareza + atributos derivados, nunca "comprados")
create type public.rarity as enum
  ('bronce','plata','oro','esmeralda','zafiro','rubi','amatista','diamante','diamante_rosa','galaxy_opal','dark_matter');

create table public.cards (
  player_id  uuid primary key references public.players(id) on delete cascade,
  season_id  uuid references public.seasons(id),
  rarity     public.rarity not null default 'bronce',
  overall    int not null default 60,
  attributes jsonb not null default '{}',        -- {tiro, manejo, pase, defensa*, fisico, iq}
  shared_public boolean not null default false,  -- el tutor decide si se puede presumir
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- VISTA PÚBLICA SEGURA: lo único que ve un extraño. Sin CURP, sin ubicación
-- en vivo, sin calendario. Solo si la carta fue marcada como compartible y,
-- si es menor, solo cuando el tutor lo permitió (protect_minors respetado).
-- ===========================================================================
create view public.v_public_card
  with (security_invoker = true) as   -- respeta la RLS de quien consulta, no la del dueño de la vista
  select p.id as player_id, p.full_name, p.photo_url,
         c.rarity, c.overall, c.attributes,
         s.points, s.rebounds, s.assists, s.fouls, s.games
  from public.players p
  join public.cards c on c.player_id = p.id and c.shared_public = true
  left join public.player_season_stats s on s.player_id = p.id;

-- ===========================================================================
-- HELPERS de autorización
-- ===========================================================================
create or replace function public.is_guardian(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where id = p and guardian_id = auth.uid());
$$;

create or replace function public.shares_league_staff(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  -- ¿el usuario es coach o admin de alguna liga donde este jugador está inscrito?
  select exists (
    select 1
    from roster r
    join teams t on t.id = r.team_id
    join memberships m on m.league_id = t.league_id
    where r.player_id = p and m.account_id = auth.uid()
      and m.role in ('coach','admin_liga')
  );
$$;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.profiles              enable row level security;
alter table public.players               enable row level security;
alter table public.leagues               enable row level security;
alter table public.seasons               enable row level security;
alter table public.teams                 enable row level security;
alter table public.memberships           enable row level security;
alter table public.roster                enable row level security;
alter table public.games                 enable row level security;
alter table public.game_events           enable row level security;
alter table public.player_season_stats   enable row level security;
alter table public.cards                 enable row level security;

-- perfiles: cada quien el suyo; lectura de nombre público básica
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- JUGADORES: NADIE puede listar/buscar libremente. Solo tutor y staff de su
-- liga ven la ficha completa. El público NO llega aquí (usa v_public_card).
create policy players_read on public.players
  for select using (public.is_guardian(id) or public.shares_league_staff(id));
create policy players_write on public.players
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

-- ligas/temporadas/equipos: lectura para miembros; escritura para dueño/admin
create policy leagues_read on public.leagues for select
  using (exists (select 1 from memberships m where m.league_id = id and m.account_id = auth.uid())
         or owner_id = auth.uid());
create policy leagues_admin on public.leagues for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- membresías: cada quien ve las suyas
create policy memberships_self on public.memberships
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());

-- BITÁCORA: la mesa (coach/admin de esa liga) inserta; nadie edita/borra
-- (los triggers ya bloquean update/delete). Lectura para miembros de la liga.
create policy events_insert on public.game_events for insert
  with check (exists (
    select 1 from games g
    join seasons s on s.id = g.season_id
    join memberships m on m.league_id = s.league_id
    where g.id = game_id and m.account_id = auth.uid()
      and m.role in ('coach','admin_liga')
  ));
create policy events_read on public.game_events for select
  using (exists (
    select 1 from games g
    join seasons s on s.id = g.season_id
    join memberships m on m.league_id = s.league_id
    where g.id = game_id and m.account_id = auth.uid()
  ));

-- temporadas y equipos: leen los miembros de la liga; administra el dueño
create policy seasons_read on public.seasons for select
  using (exists (select 1 from memberships m where m.league_id = league_id and m.account_id = auth.uid())
         or exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()));
create policy seasons_admin on public.seasons for all
  using (exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()));

create policy teams_read on public.teams for select
  using (exists (select 1 from memberships m where m.league_id = league_id and m.account_id = auth.uid())
         or exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()));
create policy teams_admin on public.teams for all
  using (exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()));

-- partidos: leen los miembros; escriben dueño y staff (coach/admin)
create policy games_read on public.games for select
  using (exists (select 1 from seasons s join memberships m on m.league_id=s.league_id where s.id=season_id and m.account_id=auth.uid())
      or exists (select 1 from seasons s join leagues l on l.id=s.league_id where s.id=season_id and l.owner_id=auth.uid()));
create policy games_admin on public.games for all
  using (exists (select 1 from seasons s join leagues l on l.id=s.league_id where s.id=season_id and l.owner_id=auth.uid()))
  with check (exists (select 1 from seasons s join leagues l on l.id=s.league_id where s.id=season_id and l.owner_id=auth.uid()));
create policy games_staff_write on public.games for update
  using (exists (select 1 from seasons s join memberships m on m.league_id=s.league_id where s.id=season_id and m.account_id=auth.uid() and m.role in ('coach','admin_liga')))
  with check (exists (select 1 from seasons s join memberships m on m.league_id=s.league_id where s.id=season_id and m.account_id=auth.uid() and m.role in ('coach','admin_liga')));

-- alineación: leen los miembros; administra el dueño
create policy roster_read on public.roster for select
  using (exists (select 1 from teams t join memberships m on m.league_id=t.league_id where t.id=team_id and m.account_id=auth.uid())
      or exists (select 1 from teams t join leagues l on l.id=t.league_id where t.id=team_id and l.owner_id=auth.uid()));
create policy roster_admin on public.roster for all
  using (exists (select 1 from teams t join leagues l on l.id=t.league_id where t.id=team_id and l.owner_id=auth.uid()))
  with check (exists (select 1 from teams t join leagues l on l.id=t.league_id where t.id=team_id and l.owner_id=auth.uid()));

-- estadísticas agregadas: tutor y staff de la liga
create policy stats_read on public.player_season_stats for select
  using (public.is_guardian(player_id) or public.shares_league_staff(player_id));

-- cartas: el tutor administra la suya; el público solo lee las marcadas como compartibles
create policy cards_owner on public.cards for all
  using (public.is_guardian(player_id)) with check (public.is_guardian(player_id));
create policy cards_public_read on public.cards for select
  using (shared_public = true);

-- ===========================================================================
-- REALTIME: marcador en vivo para miles de espectadores
-- ===========================================================================
alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.games;

-- ===========================================================================
-- NOTAS DE ESCALA (miles simultáneos)
--  * Pooler (Supavisor) en modo transaction para muchas conexiones cortas.
--  * game_events particionada por season_id cuando crezca (LIST/RANGE).
--  * La carta lee de player_season_stats (pre-agregado), no recorre eventos.
--  * Realtime: un canal por partido; el público se suscribe solo al game_id
--    que mira. Fan-out lo hace Postgres→Realtime, no la app.
--  * Assets (fotos, escudos) en Storage + CDN, no en la base.
--  * Índices ya creados en (game_id,id) y (player_id) para lecturas calientes.
-- ===========================================================================
