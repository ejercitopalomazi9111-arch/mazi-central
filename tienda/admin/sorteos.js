/* ══════════════════════════════════════════════════════════════════════════
   SORTEOS · Bloque 11, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   Un sorteo por mes: «compra $X en el mes y entras a la rifa de …».
   Lo que tiene que ser cierto:
     · no se activa sin permiso de Gobernación y fecha del aviso a PROFECO —
       lo exige la BASE (constraint sorteo_legal), no sólo esta pantalla;
     · quién entra sale de sus compras reales del mes, sin lo cancelado;
     · el ganador sale al azar de verdad, y el acta lleva la huella de la
       lista con la que se sorteó.
   Las cuentas viven en nucleo/sorteo.js (16 pruebas).
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, hoja, numero } from '../nucleo/piezas.js';
import { negocio, sorteos, guardarSorteo, clientesNegocio } from '../nucleo/datos.js';
import { participantes, huella, elegir } from '../nucleo/sorteo.js';

const MES = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const nombreMes = (m) => MES.format(new Date(String(m).slice(0, 7) + '-15T12:00'));
const Mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const esteMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const telLimpio = (t) => String(t || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');

function formulario(s){
  s = s || {};   // «nuevo» llega como null, y un valor por omisión sólo cubre undefined
  return `<form data-sorteo novalidate>
    <label class="campo" for="s-nombre"><span class="etiqueta-campo">Nombre</span>
      <input id="s-nombre" maxlength="80" value="${esc(s.nombre || '')}" placeholder="Sorteo de septiembre"></label>
    <label class="campo" for="s-premio"><span class="etiqueta-campo">Premio</span>
      <input id="s-premio" maxlength="120" value="${esc(s.premio || '')}" placeholder="Un producto de tu tienda"></label>
    <label class="campo" for="s-minimo"><span class="etiqueta-campo">Compra mínima en el mes</span>
      <input id="s-minimo" inputmode="decimal" value="${s.minimo_mensual ?? ''}" placeholder="1500"><span class="ayuda">Quien compre esto o más dentro del mes, entra.</span></label>
    <label class="campo" for="s-mes"><span class="etiqueta-campo">Mes</span>
      <input id="s-mes" type="month" value="${esc(String(s.mes || esteMes()).slice(0, 7))}"></label>
    <h3>Lo legal</h3>
    <p class="nota">Un sorteo ligado a una compra necesita permiso de la Secretaría de Gobernación y avisar a PROFECO. Sin esos dos datos se puede guardar, pero <b>no se puede activar</b>: la base de datos lo impide.</p>
    <label class="campo" for="s-permiso"><span class="etiqueta-campo">Número de permiso de Gobernación</span>
      <input id="s-permiso" maxlength="60" value="${esc(s.permiso_segob || '')}" autocomplete="off"></label>
    <label class="campo" for="s-profeco"><span class="etiqueta-campo">Fecha del aviso a PROFECO</span>
      <input id="s-profeco" type="date" value="${esc(s.aviso_profeco || '')}"></label>
    <label class="interruptor"><input type="checkbox" id="s-activo"${s.activo ? ' checked' : ''}>
      <span><strong>Activo</strong><small>Los clientes lo ven en la tienda y ven cuánto les falta.</small></span></label>
    <button type="submit" class="boton principal ancho">${icono('listo')}Guardar</button>
  </form>`;
}

function hojaSorteo(s, { aviso, recargar }){
  const h = hoja({ titulo: s?.id ? 'Editar sorteo' : 'Nuevo sorteo', cuerpo: formulario(s) });
  const f = h.querySelector('[data-sorteo]');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => f.querySelector('#' + id).value.trim();
    const minimo = numero(v('s-minimo'));
    const malos = [];
    if(!v('s-nombre')) malos.push('el nombre');
    if(!v('s-premio')) malos.push('el premio');
    if(!(minimo > 0)) malos.push('la compra mínima');
    const activo = f.querySelector('#s-activo').checked;
    if(activo && (!v('s-permiso') || !v('s-profeco'))) malos.push('el permiso y el aviso a PROFECO para activarlo');
    if(malos.length){ aviso(`Falta ${malos.join(', ').replace(/, ([^,]*)$/, ' y $1')}`, 'mal'); return; }
    const b = e.submitter; b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{
      await guardarSorteo(s?.id, { nombre: v('s-nombre'), premio: v('s-premio'), minimo_mensual: minimo, mes: v('s-mes') + '-01',
        permiso_segob: v('s-permiso') || null, aviso_profeco: v('s-profeco') || null, activo });
      aviso('Sorteo guardado'); h.close(); recargar();
    }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
  });
}

function hojaActa(s, dentro, n){
  const i = elegir(dentro.length), g = dentro[i];
  const cuando = new Date();
  const acta = [`ACTA DEL SORTEO «${s.nombre}» · ${n.marca?.nombre_corto || n.nombre}`,
    `Mes: ${nombreMes(s.mes)} · Premio: ${s.premio}`, `Permiso de Gobernación: ${s.permiso_segob}`,
    `Fecha y hora: ${cuando.toLocaleString('es-MX')}`, `Participantes: ${dentro.length} · Huella de la lista: ${huella(dentro.map((c) => c.id))}`,
    `Ganador: ${g.nombre || 'Sin nombre'}${g.telefono ? ` (tel. termina en ${telLimpio(g.telefono).slice(-4)})` : ''}`].join('\n');
  const h = hoja({ titulo: 'Resultado del sorteo', cuerpo: `
    <div class="ganador"><span class="etq">Ganó</span><strong>${esc(g.nombre || 'Sin nombre')}</strong>
      <small>${esc(pesos(g.avance.gasto))} de compras en ${esc(nombreMes(s.mes))}</small></div>
    <pre class="acta">${esc(acta)}</pre>
    <p class="nota">Salió al azar entre ${plural(dentro.length, 'participante', 'participantes')}. La huella identifica la lista exacta: si alguien la cambia, cambia la huella. Guarda el acta: esta pantalla no la guarda por ti.</p>
    <div class="botones"><button class="boton principal" data-copiar>${icono('lista')}Copiar el acta</button></div>` });
  h.querySelector('[data-copiar]').addEventListener('click', async (e) => {
    try{ await navigator.clipboard.writeText(acta); e.target.closest('button').textContent = 'Copiada'; }catch(err){ console.error(err); }
  });
}

async function sorteosAdmin(){
  const [lista, clientes, n] = await Promise.all([sorteos(), clientesNegocio().catch(() => []), negocio()]);
  const actual = lista.find((s) => String(s.mes).slice(0, 7) === esteMes().slice(0, 7));
  const pasados = lista.filter((s) => s !== actual);
  const p = actual ? participantes(clientes, actual) : null;

  const tarjetaActual = actual ? `<section class="tarjeta bloque-form sorteo-actual">
      <div class="sorteo-cabeza"><div><p class="etq">${esc(Mayus(nombreMes(actual.mes)))}</p><h2>${esc(actual.nombre)}</h2></div>
        ${actual.activo ? '<span class="chip bien">Activo</span>' : `<span class="chip ojo">Sin activar</span>`}</div>
      <p>Premio: <b>${esc(actual.premio)}</b> · entra quien compre <b>${pesos(actual.minimo_mensual)}</b> o más en el mes.</p>
      ${actual.activo ? `<p class="nota">Permiso de Gobernación ${esc(actual.permiso_segob)} · aviso a PROFECO del ${esc(actual.aviso_profeco)}.</p>`
        : `<p class="aviso-linea">${icono('alerta')}<span>Los clientes todavía no lo ven. Para activarlo faltan el permiso de Gobernación y la fecha del aviso a PROFECO.</span></p>`}
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${p.dentro.length}</span><span class="etq">ya entraron</span></div>
        <div class="cifra-caja"><span class="valor ${p.cerca.length ? 'ojo' : ''}">${p.cerca.length}</span><span class="etq">les falta poco</span></div>
      </div>
      <div class="botones">
        <button class="boton secundario" data-editar="${actual.id}">${icono('editar')}Editar</button>
        ${actual.activo && p.dentro.length ? `<button class="boton principal" data-sortear>${icono('sorteo')}Sortear ahora</button>` : ''}
      </div>
    </section>
    ${p.cerca.length ? `<section class="seccion"><header><h2>Les falta poco</h2></header>
      <p class="nota">Les falta 25 % o menos. Un mensaje a tiempo los hace volver.</p>
      <ul class="lista">${p.cerca.map((c) => { const t = telLimpio(c.telefono);
        const msg = `Hola ${(c.nombre || '').split(' ')[0]}, te faltan ${pesos(c.avance.falta)} en compras este mes para entrar al sorteo de ${actual.premio}. — ${n.marca?.nombre_corto || n.nombre}`;
        return `<li><div class="fila"><span class="texto"><strong>${esc(c.nombre || 'Sin nombre')}</strong><small>lleva ${pesos(c.avance.gasto)} · le faltan ${pesos(c.avance.falta)}</small></span>
          ${actual.activo && t.length === 10 ? `<a class="boton secundario" href="https://wa.me/52${t}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${icono('conversaciones')}<span>Avisarle</span></a>` : ''}</div></li>`; }).join('')}</ul></section>` : ''}
    <section class="seccion"><header><h2>Ya entraron</h2></header>
      ${p.dentro.length ? `<ul class="lista">${p.dentro.map((c) => `<li class="fila"><span class="texto"><strong>${esc(c.nombre || 'Sin nombre')}</strong></span><span class="precio-fila">${pesos(c.avance.gasto)}</span></li>`).join('')}</ul>`
        : `<p class="vacio-linea">${icono('sorteo')}<span>Nadie llega todavía al mínimo este mes.</span></p>`}
    </section>`
    : estado({ icono: 'sorteo', titulo: 'No hay sorteo este mes', texto: 'Crea uno: «compra $X en el mes y entras». Se puede preparar sin permiso; para activarlo hace falta el de Gobernación.',
        botones: `<button class="boton principal" data-nuevo>${icono('agregar')}Nuevo sorteo</button>` });

  return {
    html: `${tarjetaActual}
      ${pasados.length ? `<section class="seccion"><header><h2>Otros meses</h2>${actual ? `<button class="boton secundario" data-nuevo>${icono('agregar')}Nuevo</button>` : ''}</header>
        <ul class="lista">${pasados.map((s) => `<li><button class="fila" data-editar="${s.id}"><span class="texto"><strong>${esc(s.nombre)}</strong>
          <small>${esc(nombreMes(s.mes))} · ${esc(s.premio)} · mínimo ${pesos(s.minimo_mensual)}</small></span>
          <span class="chip ${s.activo ? 'bien' : ''}">${s.activo ? 'Activo' : 'Sin activar'}</span></button></li>`).join('')}</ul></section>` : ''}`,
    alMontar($c, ctx){
      $c.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.matches('[data-nuevo]')) hojaSorteo(null, ctx);
        if(b.dataset.editar) hojaSorteo(lista.find((s) => s.id === b.dataset.editar), ctx);
        if(b.matches('[data-sortear]') && confirm(`¿Sortear entre ${plural(p.dentro.length, 'participante', 'participantes')}? Hazlo frente a testigos: cada vez que se toca sale un resultado nuevo.`)) hojaActa(actual, p.dentro, n);
      });
    },
  };
}

export const PANTALLAS = { sorteosAdmin };
