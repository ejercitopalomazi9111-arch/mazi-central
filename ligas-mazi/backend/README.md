# Ligas Mazi — Backend

Backend pensado para **miles de personas en vivo** desde teléfono, tablet y PC.
Stack: **Supabase** (PostgreSQL + Auth + Row Level Security + Realtime + Storage).
El front-end (`../index.html`) es la interfaz; este backend es el motor.

## Por qué Supabase
- **Postgres de verdad** con RLS: las reglas de privacidad viven en la base, no
  en el cliente. Aunque alguien manipule la app, no puede leer lo que la política
  no permite.
- **Realtime**: cuando la mesa anota un punto, se empuja a todos los que miran ese
  partido — marcador en vivo sin que la app haga *polling*.
- **Auth** email+contraseña listo: una persona = una cuenta.
- **Storage + CDN** para fotos y escudos.
- Escala con **pooler (Supavisor)** para muchísimas conexiones.

## Modelo (resumen)
- `profiles` — 1 cuenta por humano.
- `players` — el atleta; su **tutor** es el dueño. `is_minor` se calcula solo.
- `private_curp` — tabla aparte con **solo el hash** del CURP. Sin políticas de
  lectura ⇒ **nadie** (salvo el `service_role` del servidor) lo toca. Sirve para
  no duplicar jugadores, **nunca** para buscar a alguien.
- `leagues/seasons/teams/roster` — la estructura de la liga. `settings` guarda las
  perillas (reglas, `detailed_defense`, `protect_minors`, cancha realista…).
- `memberships` — los **sombreros**: rol por liga (`admin_liga`, `coach`, `papa`,
  `jugador`, `publico`). La misma persona puede ser papá en una liga y público en otra.
- `games` + `game_events` — la **bitácora append-only** con doble tiempo (reloj del
  juego + reloj real). Nadie edita ni borra; una corrección es un evento `reversal`.
- `player_season_stats` — agregados que alimentan la **carta** (no se recorre la
  bitácora en cada lectura).
- `cards` — rareza + atributos **derivados del desempeño**, jamás comprados.

## Privacidad (lo que pediste)
1. **CURP inaccesible.** No se guarda en claro; su hash vive en `private_curp`, que
   no tiene política de lectura para usuarios. No hay endpoint para buscar por CURP.
2. **Menores protegidos.** `players` no se puede listar libremente: la política
   `players_read` solo deja ver al **tutor** y al **staff de su liga** (coach/admin).
   Un extraño jamás obtiene "en qué ligas está" ni su calendario.
3. **Vista pública segura** `v_public_card`: lo único que ve alguien de fuera —
   nombre, foto, rareza y estadísticas agregadas — y **solo** si el tutor marcó la
   carta como `shared_public`. Sin CURP, sin ubicación en vivo, sin agenda.
4. **Defensa opcional.** `steals/blocks` solo se cuentan si la liga prende
   `detailed_defense`; si no, la defensa se estima y la carta lo indica.

## Cómo se conecta el front-end
```html
<!-- en index.html, cuando conectemos el backend -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js"></script>
<script>
  const sb = supabase.createClient(URL, ANON_KEY);   // anon key es pública y segura: RLS protege
  // marcador en vivo:
  sb.channel('game:'+gameId)
    .on('postgres_changes',
        { event:'INSERT', schema:'public', table:'game_events', filter:'game_id=eq.'+gameId },
        (e)=> aplicarEvento(e.new))   // suma el punto/falta al marcador en pantalla
    .subscribe();
</script>
```
La `anon key` puede ir en el cliente: **no** da acceso a nada que las políticas RLS
no permitan. Las operaciones con `service_role` (como escribir en `private_curp`)
corren en un **Edge Function** del servidor, nunca en el navegador.

## Aplicar el esquema
```bash
supabase db push               # con la CLI y supabase/migrations
# o pega schema.sql en el SQL Editor del proyecto
# o, desde este agente, con la herramienta apply_migration del MCP de Supabase
```

## Estado
- [x] Esquema + RLS + Realtime + vista pública segura (`schema.sql`).
- [x] **Proyecto Supabase provisionado y migración aplicada** (org *Mazi's Url's*,
      proyecto `ligas-mazi`, región `us-west-1`). RLS activa en todas las tablas;
      `private_curp` sin políticas (solo `service_role` lo toca, por diseño).
- [x] **`index.html` cableado al cliente** (URL + *publishable key*), **offline-first**:
      si no hay red la app sigue en `localStorage`. Un indicador muestra
      *Nube conectada* / *Modo local*.
- [x] **Login + sync cableados** (offline-first, *dormidos hasta el toggle*):
      registro/inicio de sesión con correo+contraseña en la entrada, `profiles`
      automático por trigger, y **guardado en la nube por cuenta** en `app_state`
      (la liga y el perfil sincronizan entre teléfonos de la misma cuenta;
      `saveLeague`/`saveUser` empujan con debounce; al entrar se hace *pull*).
      Todo degrada a modo local sin red. **Verificado** en degradación (0 errores).
- [ ] **Acción tuya para activarlo:** en el panel de Supabase → *Authentication →
      Sign In / Providers*, **apagar "Confirm email"** (o prender *Anonymous
      sign-in*). Es un switch del dashboard, no se puede por migración. En cuanto
      esté, el login real funciona sin más cambios de código.
- [ ] Edge Functions: alta de jugador (hash de CURP en servidor), recomputo de stats.
- [ ] Migrar el motor de competencia a las tablas normalizadas
      (leagues/seasons/teams/roster/games) + marcador en vivo por Realtime en
      `game_events` (multi-usuario real; `app_state` es el puente cross-device por ahora).

### Correcciones al aplicar el esquema
El `schema.sql` original tenía tres cosas que Postgres rechaza; ya están corregidas
aquí y en la base:
1. La PK de `memberships` usaba `coalesce(...)` (una PK no admite expresiones) →
   ahora es PK sustituta `id uuid` + **índice único** con el mismo criterio.
2. `players.is_minor` era columna generada con `current_date` (no *immutable*) →
   ahora la mantiene un **trigger** `set_is_minor`.
3. `v_public_card` quedaba como *security definer* → se creó con
   `security_invoker = true` para respetar la RLS de quien consulta.
Además se añadieron políticas de lectura/escritura para `seasons`, `teams`, `games`,
`roster` y `player_season_stats`, lectura pública de `cards` compartibles, y
`search_path` fijo en las funciones trigger.

### Configuración pública (segura en cliente)
- URL: `https://buqrhhdhzsfqrfopzmxo.supabase.co`
- Publishable key: `sb_publishable_…` (va en el cliente; la RLS protege los datos).
