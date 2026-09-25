// ════════════════════════════════════════════════════════════════════════
// ENTRAR · sesión de invitado o de demo, sin mandar correo
// ────────────────────────────────────────────────────────────────────────
// Por qué existe: en el proyecto `tienda` la entrada anónima de Supabase está
// apagada y el correo exige confirmación, y esos interruptores sólo se mueven
// desde el panel. Carlos pidió que el cliente navegue y compre SIN muro de
// sesión, así que esta función hace lo mismo que la entrada anónima, bajo
// nuestro control:
//
//   · tipo 'invitado' — cualquiera. Crea un usuario confirmado con un correo que
//     no existe (dominio .invalid, reservado: nunca se entrega) y devuelve un
//     token de un solo uso. El navegador lo canjea por una sesión. El cliente
//     se identifica de verdad al pagar (mi_cliente), no antes.
//   · tipo 'demo' — «ver como» cliente / repartidor / admin / cajero. SÓLO en un
//     negocio con ajustes.demo = true. En un negocio real se niega, y es lo que
//     impide que alguien se haga admin de una tienda de verdad.
//
// La llave maestra la inyecta Supabase en la función. Nunca pasa por el repo.
// verify_jwt va apagado porque quien llama todavía no tiene sesión — para eso
// llama —, y la función hace sus propias revisiones.
// ════════════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const ROLES = ['cliente', 'repartidor', 'admin', 'cajero'] as const;
const NOMBRE_DEMO: Record<string, string> = {
  cliente: 'Cliente de prueba', repartidor: 'Repartidor de prueba',
  admin: 'Admin de prueba', cajero: 'Caja de prueba',
};

const cabeceras = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const responde = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cabeceras });
  if (req.method !== 'POST') return responde({ error: 'solo_post' }, 405);

  let pide: { tipo?: string; negocio?: string; rol?: string };
  try { pide = await req.json(); } catch { return responde({ error: 'json_invalido' }, 400); }

  const tipo = pide.tipo;
  const slug = String(pide.negocio || '');
  if (tipo !== 'invitado' && tipo !== 'demo') return responde({ error: 'tipo_invalido' }, 400);
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return responde({ error: 'negocio_invalido' }, 400);

  const maestro = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: negocio } = await maestro.from('negocios').select('id, ajustes').eq('slug', slug).maybeSingle();
  if (!negocio) return responde({ error: 'negocio_no_existe' }, 404);

  let correo: string;
  let rol: string;
  if (tipo === 'demo') {
    if (negocio.ajustes?.demo !== true) return responde({ error: 'no_es_demo' }, 403);
    rol = String(pide.rol || '');
    if (!ROLES.includes(rol as typeof ROLES[number])) return responde({ error: 'rol_invalido' }, 400);
    correo = `demo-${rol}@${slug}.tienda.invalid`;
  } else {
    rol = 'cliente';
    correo = `invitado-${crypto.randomUUID()}@${slug}.tienda.invalid`;
  }

  // ¿Ya existe? (sólo pasa con las cuentas de demo, que se reutilizan)
  const { data: yaEsta } = await maestro.from('cuentas_servicio').select('correo').eq('correo', correo).maybeSingle();
  if (!yaEsta) {
    const { data: creado, error } = await maestro.auth.admin.createUser({
      email: correo,
      email_confirm: true,
      // Contraseña al azar que nadie conoce: la entrada es SIEMPRE por token.
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { tipo, negocio: slug },
    });
    if (error || !creado.user) return responde({ error: 'no_se_pudo_crear', detalle: error?.message }, 500);
    const id = creado.user.id;
    const { error: e2 } = await maestro.from('perfiles').insert({
      id, negocio_id: negocio.id, rol,
      nombre: tipo === 'demo' ? NOMBRE_DEMO[rol] : null,
    });
    if (e2) return responde({ error: 'no_se_pudo_perfil', detalle: e2.message }, 500);
    await maestro.from('cuentas_servicio').insert({ correo, negocio_id: negocio.id, tipo, rol });
  }

  // Token de un solo uso. `generateLink` NO manda correo: sólo lo arma.
  const { data: enlace, error: e3 } = await maestro.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (e3 || !enlace?.properties?.hashed_token) return responde({ error: 'no_se_pudo_entrar', detalle: e3?.message }, 500);

  return responde({ token_hash: enlace.properties.hashed_token, rol });
});
