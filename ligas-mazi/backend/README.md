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
- [ ] Provisionar el proyecto Supabase y aplicar la migración.
- [ ] Edge Functions: alta de jugador (hash de CURP en servidor), recomputo de stats.
- [ ] Cablear `index.html` a Supabase (auth, marcador en vivo, cartas).

> Nota honesta: el prototipo `index.html` hoy funciona **solo en el front** (datos
> de ejemplo). Este backend es el plano y las migraciones para volverlo multiusuario
> real. El siguiente paso es provisionar el proyecto y cablearlo.
