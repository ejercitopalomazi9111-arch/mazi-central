-- ════════════════════════════════════════════════════════════════════════
-- 0001 · EL ESQUEMA
-- ────────────────────────────────────────────────────────────────────────
-- Un producto, muchos negocios: TODA tabla lleva negocio_id. Es barato ahora y
-- carísimo después, y es lo que permite vendérsela a otras empresas. La
-- barbería es el primer negocio, no el producto.
--
-- El giro vive en los datos, no en el código: las categorías traen su
-- `plantilla` de campos y los productos guardan esos campos en `campos` jsonb.
-- Una tijera tiene medida y material; una taza, capacidad. Si fueran columnas,
-- el segundo giro obligaría a tocar el esquema.
-- ════════════════════════════════════════════════════════════════════════

create type rol_t          as enum ('cliente', 'repartidor', 'admin', 'cajero');
create type estado_pedido  as enum ('recibido', 'preparando', 'en_camino', 'entregado', 'no_entregado', 'cancelado');
create type canal_t        as enum ('tienda', 'pos', 'bot', 'repartidor', 'manual');
create type motivo_mov     as enum ('venta', 'ajuste', 'apartado', 'liberar_apartado', 'devolucion', 'alta', 'importacion', 'cancelacion');
create type forma_pago_t   as enum ('efectivo', 'tarjeta', 'transferencia', 'mixto', 'pasarela');
create type momento_pago_t as enum ('antes', 'al_recibir');

-- ── Negocios ────────────────────────────────────────────────────────────
create table negocios (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nombre          text not null,
  giro            text not null,
  marca           jsonb not null default '{}',   -- logo, acento, nombre corto
  ajustes         jsonb not null default '{}',   -- envío, textos, demo, muestra…
  siguiente_folio integer not null default 1,
  creado          timestamptz not null default now()
);

-- ── Personas ────────────────────────────────────────────────────────────
create table perfiles (
  id          uuid primary key references auth.users on delete cascade,
  negocio_id  uuid not null references negocios on delete cascade,
  rol         rol_t not null default 'cliente',
  nombre      text,
  telefono    text,
  activo      boolean not null default true,
  creado      timestamptz not null default now()
);
create index on perfiles (negocio_id, rol);

-- ── Catálogo ────────────────────────────────────────────────────────────
create table categorias (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  clave       text not null,                    -- estable para enlaces: 'corte'
  nombre      text not null,
  icono       text not null default 'caja',
  orden       integer not null default 0,
  padre_id    uuid references categorias on delete set null,
  plantilla   jsonb not null default '[]',      -- [{clave, etiqueta, tipo, opciones?}]
  activo      boolean not null default true,
  unique (negocio_id, clave)
);

create table productos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references negocios on delete cascade,
  categoria_id  uuid references categorias on delete set null,
  nombre        text not null,
  marca         text not null default '',
  descripcion   text not null default '',
  precio        numeric(12,2) not null check (precio >= 0),
  precio_antes  numeric(12,2) check (precio_antes is null or precio_antes > 0),
  sku           text,
  codigo_barras text,
  campos        jsonb not null default '{}',
  fotos         text[] not null default '{}',
  activo        boolean not null default true,
  externo_id    text,                            -- de dónde vino al importarlo
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);
create index on productos (negocio_id, categoria_id) where activo;
create unique index on productos (negocio_id, codigo_barras) where codigo_barras is not null;

-- Una fila por producto. `apartado` nunca puede pasar de `cantidad`: lo que se
-- apartó descuenta, o se vende dos veces.
create table existencias (
  producto_id  uuid primary key references productos on delete cascade,
  negocio_id   uuid not null references negocios on delete cascade,
  cantidad     integer not null default 0 check (cantidad >= 0),
  apartado     integer not null default 0 check (apartado >= 0 and apartado <= cantidad),
  minimo       integer not null default 0 check (minimo >= 0),  -- avisar al bajar de aquí
  actualizado  timestamptz not null default now()
);

-- Cada +/− de inventario deja rastro: de dónde, quién y por qué.
create table movimientos (
  id           bigint generated always as identity primary key,
  negocio_id   uuid not null references negocios on delete cascade,
  producto_id  uuid not null references productos on delete cascade,
  delta        integer not null check (delta <> 0),
  motivo       motivo_mov not null,
  canal        canal_t,
  referencia   uuid,
  quien        uuid references perfiles on delete set null,
  nota         text,
  cuando       timestamptz not null default now()
);
create index on movimientos (negocio_id, producto_id, cuando desc);

-- ── Clientes y pedidos ──────────────────────────────────────────────────
create table clientes (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references negocios on delete cascade,
  perfil_id       uuid references perfiles on delete set null,
  nombre          text not null default '',
  telefono        text,
  correo          text,
  direcciones     jsonb not null default '[]',
  pago_preferido  momento_pago_t,
  notas           text not null default '',
  creado          timestamptz not null default now(),
  unique (negocio_id, perfil_id)
);

create table cajas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  perfil_id   uuid not null references perfiles,
  abierta     timestamptz not null default now(),
  cerrada     timestamptz,
  fondo       numeric(12,2) not null default 0 check (fondo >= 0),
  esperado    numeric(12,2),
  contado     numeric(12,2),
  nota        text
);

create table pedidos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references negocios on delete cascade,
  folio          integer not null,
  cliente_id     uuid references clientes on delete set null,
  canal          canal_t not null,
  estado         estado_pedido not null default 'recibido',
  momento_pago   momento_pago_t not null default 'al_recibir',
  forma_pago     forma_pago_t,
  pagado         boolean not null default false,
  subtotal       numeric(12,2) not null default 0,
  descuento      numeric(12,2) not null default 0,
  envio          numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  direccion      jsonb,
  ventana        jsonb,                          -- {desde, hasta}
  repartidor_id  uuid references perfiles on delete set null,
  caja_id        uuid references cajas on delete set null,
  notas          text not null default '',
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now(),
  unique (negocio_id, folio)
);
create index on pedidos (negocio_id, estado, creado desc);
create index on pedidos (cliente_id, creado desc);
create index on pedidos (repartidor_id) where estado in ('preparando', 'en_camino');

create table renglones (
  id           bigint generated always as identity primary key,
  pedido_id    uuid not null references pedidos on delete cascade,
  producto_id  uuid references productos on delete set null,
  nombre       text not null,                    -- copia: el pedido no cambia si el producto sí
  precio       numeric(12,2) not null,
  cantidad     integer not null check (cantidad > 0),
  importe      numeric(12,2) not null
);
create index on renglones (pedido_id);
create index on renglones (producto_id);

create table eventos_pedido (
  id          bigint generated always as identity primary key,
  pedido_id   uuid not null references pedidos on delete cascade,
  negocio_id  uuid not null references negocios on delete cascade,
  de          estado_pedido,
  a           estado_pedido not null,
  quien       uuid references perfiles on delete set null,
  por_que     text,
  cuando      timestamptz not null default now()
);
create index on eventos_pedido (pedido_id, cuando);

-- ── Repartidores ────────────────────────────────────────────────────────
create table turnos (
  id                  uuid primary key default gen_random_uuid(),
  negocio_id          uuid not null references negocios on delete cascade,
  perfil_id           uuid not null references perfiles on delete cascade,
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  efectivo_esperado   numeric(12,2),
  efectivo_entregado  numeric(12,2),
  check (fin is null or fin >= inicio)
);
-- Un turno abierto a la vez por persona.
create unique index turno_abierto_unico on turnos (perfil_id) where fin is null;

create table pausas (
  id        bigint generated always as identity primary key,
  turno_id  uuid not null references turnos on delete cascade,
  inicio    timestamptz not null default now(),
  fin       timestamptz
);

create table ubicaciones (
  id          bigint generated always as identity primary key,
  negocio_id  uuid not null references negocios on delete cascade,
  perfil_id   uuid not null references perfiles on delete cascade,
  turno_id    uuid not null references turnos on delete cascade,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  velocidad   real,                              -- m/s
  precision   real,
  rumbo       real,
  cuando      timestamptz not null default now()
);
create index on ubicaciones (perfil_id, cuando desc);

create table rutas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  perfil_id   uuid not null references perfiles on delete cascade,
  fecha       date not null default current_date,
  paradas     jsonb not null default '[]',
  metodo      text not null default '2opt',
  creado      timestamptz not null default now()
);

create table cobros (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  pedido_id   uuid not null references pedidos on delete cascade,
  perfil_id   uuid references perfiles on delete set null,
  turno_id    uuid references turnos on delete set null,
  caja_id     uuid references cajas on delete set null,
  metodo      forma_pago_t not null,
  monto       numeric(12,2) not null check (monto >= 0),
  recibido    numeric(12,2),
  cambio      numeric(12,2),
  cuando      timestamptz not null default now()
);

-- ── Promociones ─────────────────────────────────────────────────────────
create table descuentos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  nombre      text not null,
  tipo        text not null check (tipo in ('porcentaje', 'monto')),
  valor       numeric(12,2) not null check (valor > 0),
  alcance     jsonb not null default '{"todo": true}',  -- {todo} | {categorias:[]} | {productos:[]}
  codigo      text,                                      -- cupón; null = automático
  canales     canal_t[] not null default '{tienda,pos,bot}',
  inicio      timestamptz not null default now(),
  fin         timestamptz,
  activo      boolean not null default true,
  check (tipo <> 'porcentaje' or valor <= 100),
  check (fin is null or fin > inicio)
);

create table apartados (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references negocios on delete cascade,
  cliente_id    uuid not null references clientes on delete cascade,
  total         numeric(12,2) not null check (total >= 0),
  abonado       numeric(12,2) not null default 0 check (abonado >= 0),
  fecha_limite  date not null,
  estado        text not null default 'abierto' check (estado in ('abierto', 'liquidado', 'vencido', 'cancelado')),
  pedido_id     uuid references pedidos on delete set null,
  creado        timestamptz not null default now()
);
create table apartado_renglones (
  apartado_id  uuid not null references apartados on delete cascade,
  producto_id  uuid not null references productos,
  cantidad     integer not null check (cantidad > 0),
  precio       numeric(12,2) not null,
  primary key (apartado_id, producto_id)
);
create table abonos (
  id           bigint generated always as identity primary key,
  apartado_id  uuid not null references apartados on delete cascade,
  monto        numeric(12,2) not null check (monto > 0),
  metodo       forma_pago_t not null,
  quien        uuid references perfiles on delete set null,
  cuando       timestamptz not null default now()
);

-- En México un sorteo por compra necesita permiso de Gobernación y aviso a
-- PROFECO por lo menos 3 días hábiles antes. La base NO deja activar uno sin
-- las dos cosas: el error no se puede cometer por descuido.
create table sorteos (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references negocios on delete cascade,
  nombre          text not null,
  premio          text not null,
  minimo_mensual  numeric(12,2) not null check (minimo_mensual > 0),
  mes             date not null,                 -- primer día del mes
  permiso_segob   text,
  aviso_profeco   date,
  activo          boolean not null default false,
  constraint sorteo_legal check (
    not activo or (coalesce(length(trim(permiso_segob)), 0) > 0 and aviso_profeco is not null)
  )
);

-- ── Conversaciones, redes, recompra, notificaciones ─────────────────────
create table conversaciones (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  canal       text not null,                     -- whatsapp, simulador, instagram…
  externo     text not null,                     -- teléfono o id del otro lado
  cliente_id  uuid references clientes on delete set null,
  estado      text not null default 'bot' check (estado in ('bot', 'persona', 'cerrada')),
  tomada_por  uuid references perfiles on delete set null,
  actualizado timestamptz not null default now(),
  unique (negocio_id, canal, externo)
);
create table mensajes (
  id               bigint generated always as identity primary key,
  conversacion_id  uuid not null references conversaciones on delete cascade,
  negocio_id       uuid not null references negocios on delete cascade,
  rol              text not null check (rol in ('cliente', 'bot', 'persona')),
  texto            text not null,
  meta             jsonb not null default '{}',
  cuando           timestamptz not null default now()
);
create index on mensajes (conversacion_id, cuando);

create table publicaciones (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  red         text not null,
  contenido   jsonb not null default '{}',
  programada  timestamptz,
  estado      text not null default 'borrador' check (estado in ('borrador', 'programada', 'publicada')),
  metricas    jsonb not null default '{}',
  creado      timestamptz not null default now()
);

create table avisos_recompra (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references negocios on delete cascade,
  cliente_id      uuid not null references clientes on delete cascade,
  producto_id     uuid references productos on delete cascade,
  fecha_estimada  date not null,
  base            jsonb not null,                -- EN QUÉ se basa: sin esto, el aviso se ignora
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'descartado', 'comprado')),
  creado          timestamptz not null default now()
);

create table suscripciones_push (
  id          bigint generated always as identity primary key,
  negocio_id  uuid not null references negocios on delete cascade,
  perfil_id   uuid not null references perfiles on delete cascade,
  endpoint    text not null unique,
  llaves      jsonb not null,
  creado      timestamptz not null default now()
);

-- Lo que sólo ve el servidor. RLS encendido y SIN políticas: nadie la lee desde
-- el navegador, ni siquiera un admin. La usa la función `entrar`.
create table cuentas_servicio (
  correo      text primary key,
  negocio_id  uuid not null references negocios on delete cascade,
  tipo        text not null check (tipo in ('invitado', 'demo')),
  rol         rol_t not null,
  creado      timestamptz not null default now()
);
