/* ══════════════════════════════════════════════════════════════════════════
   RUTAS Y SEGUIMIENTO · Bloque 8
   ──────────────────────────────────────────────────────────────────────────
   Tres miradas al mismo mapa:
     · el repartidor: sus paradas ya ordenadas para recorrer menos, y un botón
       que abre TODA la ruta en Google Maps;
     · el dueño: dónde va cada quien con turno abierto, a qué velocidad y
       hace cuánto mandó señal;
     · el cliente: dónde va su pedido y en cuánto llega, sólo mientras va en
       camino (la base no le da más: donde_va()).
   El mapa es un adorno útil, no una dependencia: si no carga, las listas y
   los botones de navegar siguen funcionando.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado } from '../nucleo/piezas.js';
import { negocio, miTurno, misEntregas, totalConEnvio, repartidoresEnTurno, pedidosNegocio, misPedidos, pedidoPorId, dondeVa } from '../nucleo/datos.js';
import { crearMapa } from '../nucleo/mapa.js';
import { ordenar, distancia, estimarMinutos, tieneLugar, tramosMaps } from '../nucleo/ruta.js';
import { rastreo, TEXTO_RASTREO } from '../nucleo/rastreo.js';
import { ESTADOS } from '../cliente/pedir.js';
import { enPausa } from '../nucleo/horas.js';

const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });
// El reloj del teléfono y el de la base nunca están idénticos: sin el tope,
// un punto recién llegado decía «hace -1 s».
const hace = (d) => { const s = Math.max(0, Math.round((Date.now() - new Date(d)) / 1000)); return s < 10 ? 'hace un momento' : s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : `desde las ${HORA.format(new Date(d))}`; };
const kmh = (ms) => ms == null ? null : Math.round(ms * 3.6);
const LIMITE_KMH = 60;
const lugarDe = (p) => tieneLugar(p.direccion) ? { lat: Number(p.direccion.lat), lng: Number(p.direccion.lng) } : null;

/* Donde está el teléfono ahora, sin esperar más de 8 s. */
const aquí = () => new Promise((ok) => {
  if(!navigator.geolocation) return ok(null);
  navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), () => ok(null), { timeout: 8000, maximumAge: 60000 });
});

function lineaRastreo(){
  return `<p class="rastreo" data-rastreo>${icono('lugar')}<span>${TEXTO_RASTREO[rastreo.estado]}</span></p>`;
}
function montarRastreo($c, turno){
  if(turno) rastreo.iniciar(turno.id);
  return rastreo.alCambiar((e) => {
    const el = $c.querySelector('[data-rastreo]'); if(!el) return;
    el.className = 'rastreo ' + e; el.querySelector('span').textContent = TEXTO_RASTREO[e];
  });
}

/* ══ MI RUTA (repartidor) ═════════════════════════════════════════════════ */

async function miRuta(){
  const [n, turno, entregas] = await Promise.all([negocio(), miTurno(), misEntregas()]);
  if(!turno) return { html: estado({ icono: 'ruta', titulo: 'Abre tu turno para ver tu ruta', botones: `<a class="boton principal" href="${enlace('/r')}">Ir a hoy</a>` }) };
  const pendientes = entregas.filter((p) => !p.direccion?.recoge);
  if(!pendientes.length) return { html: estado({ icono: 'ruta', titulo: 'No tienes entregas a domicilio', texto: 'Cuando te asignen una, aquí sale la ruta ya ordenada.', botones: `<a class="boton principal" href="${enlace('/r')}">Ir a hoy</a>` }) + lineaRastreo(),
    alMontar: ($c) => montarRastreo($c, turno) };
  const tienda = tieneLugar(n.ajustes?.tienda) ? n.ajustes.tienda : null;

  return {
    html: `${lineaRastreo()}
      <div class="ruta-cabeza" id="ruta-cabeza"><p class="nota">Calculando la mejor ruta…</p></div>
      <div class="mapa" id="mapa" role="img" aria-label="Mapa de la ruta"></div>
      <ol class="paradas" id="ruta-lista"></ol>`,
    async alMontar($c){
      const quitar = montarRastreo($c, turno);
      const origen = rastreo.ultimo || await aquí() || tienda;
      const paradas = pendientes.map((p) => ({ ...lugarDe(p), id: p.id, p }));
      const r = ordenar(origen, paradas);
      const paraMaps = r.orden.filter(tieneLugar);
      const tramos = tramosMaps(origen, paraMaps);
      const $cab = $c.querySelector('#ruta-cabeza'); if(!$cab) return quitar;
      $cab.innerHTML = `<div class="cifras">
          <div class="cifra-caja"><span class="valor">${r.orden.length}</span><span class="etq">paradas</span></div>
          <div class="cifra-caja"><span class="valor">${r.km ? `${(r.km * 1.35).toFixed(1)}<small> km</small>` : '—'}</span><span class="etq">aprox. por calle</span></div>
          <div class="cifra-caja"><span class="valor">${r.minutos ? `${Math.floor(r.minutos / 60) ? `${Math.floor(r.minutos / 60)}<small> h</small> ` : ''}${r.minutos % 60}<small> min</small>` : '—'}</span><span class="etq">con las entregas</span></div>
        </div>
        ${tramos.length === 1 ? `<a class="boton principal grande ancho" href="${esc(tramos[0].url)}" target="_blank" rel="noopener" data-tramo="1">${icono('ruta')}Abrir la ruta en Google Maps</a>`
          : tramos.length ? `<p class="nota">Google Maps en el teléfono acepta pocas paradas por viaje: la ruta va en ${tramos.length} tramos. Al terminar uno, abre el siguiente.</p>
          <div class="tramos">${tramos.map((t, k) => `<a class="boton ${k ? 'secundario' : 'principal'} grande ancho" href="${esc(t.url)}" target="_blank" rel="noopener" data-tramo="${k + 1}">${icono('ruta')}Tramo ${k + 1} · ${t.desde === t.hasta ? `parada ${t.desde}` : `paradas ${t.desde} a ${t.hasta}`}</a>`).join('')}</div>` : ''}
        ${!origen ? `<p class="nota">No supe dónde estás: la ruta empieza en la primera parada.</p>` : ''}
        ${r.sinLugar.length ? `<p class="aviso-linea">${icono('alerta')}<span>${plural(r.sinLugar.length, 'parada no tiene', 'paradas no tienen')} ubicación en el mapa: van al final. Revisa la dirección.</span></p>` : ''}`;
      $c.querySelector('#ruta-lista').innerHTML = r.orden.map((x, i) => `<li><a class="parada-tarjeta" href="${enlace('/r/parada/:id', { id: x.p.id })}">
        <span class="numero">${i + 1}</span>
        <span class="texto"><strong>${esc(x.p.cliente?.nombre || 'Cliente')}</strong><small>${esc([x.p.direccion?.calle, x.p.direccion?.colonia].filter(Boolean).join(', '))}</small>
          <small>${x.p.pagado ? 'ya pagado' : `cobrar ${pesos(totalConEnvio(x.p))}`}${tieneLugar(x) ? '' : ' · sin ubicación'}</small></span>
        <span class="chip ${ESTADOS[x.p.estado].clase}">${ESTADOS[x.p.estado].texto}</span></a></li>`).join('');
      let mapa;
      try{
        mapa = await crearMapa($c.querySelector('#mapa'), { centro: origen || paraMaps[0] || undefined, mosaicos: n.ajustes?.mapa?.mosaicos });
        if(origen) mapa.marcador(origen, { texto: '●', clase: 'yo', titulo: 'Tú' });
        paraMaps.forEach((x) => mapa.marcador(x, { texto: String(r.orden.indexOf(x) + 1), titulo: x.p.cliente?.nombre }));
        mapa.linea([origen, ...paraMaps].filter(Boolean));
        mapa.encuadrar([origen, ...paraMaps].filter(Boolean));
      }catch(e){ if(e.message !== 'pantalla cerrada') console.error(e); $c.querySelector('#mapa')?.classList.add('sin-mapa'); }
      return () => { quitar(); mapa?.destruir(); };
    },
  };
}

/* ══ REPARTIDORES EN VIVO (dueño) ═════════════════════════════════════════ */

async function repartidoresVivo(){
  const n = await negocio();
  const [gente, enCamino] = await Promise.all([repartidoresEnTurno(), pedidosNegocio({ estados: ['en_camino', 'preparando'] })]);
  const tienda = tieneLugar(n.ajustes?.tienda) ? n.ajustes.tienda : null;

  const fila = (g) => {
    const u = g.puntos[0], v = kmh(u?.velocidad), suyos = enCamino.filter((p) => p.repartidor_id === g.perfil_id);
    const viejo = u && Date.now() - new Date(u.cuando) > 5 * 60000;
    return `<li class="fila rep-fila">
      <span class="circulo-chico">${icono('camion')}</span>
      <span class="texto"><strong>${esc(g.quien?.nombre || 'Repartidor')}</strong>
        <small>${enPausa(g) ? 'en pausa · ' : ''}turno desde las ${HORA.format(new Date(g.inicio))} · ${plural(suyos.length, 'pedido', 'pedidos')} ${suyos.length ? `(${suyos.map((p) => '#' + p.folio).join(', ')})` : ''}</small>
        <small>${u ? `última señal ${hace(u.cuando)}` : 'todavía sin señal de GPS'}</small></span>
      <span class="lado">${v != null ? `<span class="chip ${v > LIMITE_KMH ? 'mal' : ''}">${v > LIMITE_KMH ? icono('alerta') : ''}${v} km/h</span>` : ''}
        ${viejo ? '<span class="chip ojo">Sin señal reciente</span>' : ''}</span>
    </li>`;
  };

  return {
    html: `<p class="nota">Sólo aparece quien tiene el turno abierto. Al cerrar el turno, deja de compartir su ubicación.</p>
      <div class="mapa" id="mapa" role="img" aria-label="Mapa de los repartidores"></div>
      <ul class="lista" id="gente">${gente.length ? gente.map(fila).join('') : `<li class="fila"><span class="texto"><strong>Nadie en turno</strong><small>Cuando un repartidor abra su turno, aparece aquí.</small></span></li>`}</ul>`,
    async alMontar($c, { recargar }){
      let mapa;
      try{
        const puntos = gente.map((g) => g.puntos[0]).filter(Boolean);
        const destinos = enCamino.map(lugarDe).filter(Boolean);
        mapa = await crearMapa($c.querySelector('#mapa'), { centro: puntos[0] || tienda || undefined, mosaicos: n.ajustes?.mapa?.mosaicos });
        if(tienda) mapa.marcador(tienda, { texto: '★', clase: 'tienda', titulo: 'La tienda' });
        gente.forEach((g) => g.puntos[0] && mapa.marcador(g.puntos[0], { texto: (g.quien?.nombre || 'R')[0], clase: 'rep', titulo: g.quien?.nombre,
          globo: `<b>${esc(g.quien?.nombre || '')}</b><br>${kmh(g.puntos[0].velocidad) ?? '—'} km/h · ${hace(g.puntos[0].cuando)}` }));
        enCamino.forEach((p) => { const l = lugarDe(p); if(l) mapa.marcador(l, { texto: '#', clase: 'destino', titulo: `#${p.folio} ${p.cliente?.nombre || ''}` }); });
        mapa.encuadrar([...puntos, ...destinos, tienda].filter(Boolean));
      }catch(e){ if(e.message !== 'pantalla cerrada') console.error(e); $c.querySelector('#mapa')?.classList.add('sin-mapa'); }
      const reloj = setInterval(() => { if(document.visibilityState === 'visible') recargar(); }, 30000);
      return () => { clearInterval(reloj); mapa?.destruir(); };
    },
  };
}

/* ══ SEGUIMIENTO (cliente) ════════════════════════════════════════════════ */

async function seguimiento({ params }){
  let p;
  if(params.id === 'demo') p = (await misPedidos())[0];
  else p = await pedidoPorId(params.id).catch(() => null);
  if(!p) return { html: estado({ icono: 'parada', titulo: 'No encontramos ese pedido', texto: 'Aquí ves por dónde va tu pedido cuando sale a entregarse.', botones: `<a class="boton principal" href="${enlace('/pedidos')}">Mis pedidos</a>` }) };
  const n = await negocio();
  const destinoL = lugarDe(p);
  const pasos = ['recibido', 'preparando', 'en_camino', 'entregado'], i = pasos.indexOf(p.estado);

  return {
    titulo: `Pedido #${p.folio}`,
    html: `<div class="seguimiento">
      <p class="chip ${ESTADOS[p.estado].clase}">${icono(ESTADOS[p.estado].icono)}${ESTADOS[p.estado].texto}</p>
      <h2 id="seg-titulo">${esc(ESTADOS[p.estado].dice)}</h2>
      ${i >= 0 ? `<ol class="pasos-pedido">${pasos.map((s, k) => `<li class="${k < i ? 'hecho' : k === i ? 'ahora' : ''}"><span class="punto">${icono(k < i ? 'listo' : ESTADOS[s].icono)}</span><span>${ESTADOS[s].texto}</span></li>`).join('')}</ol>` : ''}
      <div id="seg-vivo"></div>
      ${p.estado === 'en_camino' ? '<div class="mapa" id="mapa" role="img" aria-label="Dónde va tu pedido"></div>' : ''}
      <p class="nota">${p.direccion?.recoge ? 'Pasas a recoger a la tienda.' : `Va a: ${esc([p.direccion?.calle, p.direccion?.colonia].filter(Boolean).join(', '))}`}</p>
      <a class="boton secundario" href="${enlace('/pedidos')}">${icono('pedidos')}Mis pedidos</a>
    </div>`,
    async alMontar($c, { recargar }){
      if(p.estado !== 'en_camino'){
        const r = ['recibido', 'preparando'].includes(p.estado) ? setInterval(() => { if(document.visibilityState === 'visible') recargar(); }, 30000) : null;
        return () => clearInterval(r);
      }
      let mapa, pinRep;
      try{
        mapa = await crearMapa($c.querySelector('#mapa'), { centro: destinoL || undefined, mosaicos: n.ajustes?.mapa?.mosaicos });
        if(destinoL) mapa.marcador(destinoL, { texto: '⌂', clase: 'destino', titulo: 'Tu dirección' });
      }catch(e){ if(e.message !== 'pantalla cerrada') console.error(e); $c.querySelector('#mapa')?.classList.add('sin-mapa'); }
      const vivo = async () => {
        const $v = $c.querySelector('#seg-vivo'); if(!$v) return;
        let d;
        try{ d = await dondeVa(p.id); }catch(e){ console.error(e); return; }
        if(!d){ recargar(); return; }                      // ya no va en camino: cambió el estado
        if(!tieneLugar(d)){ $v.innerHTML = `<p class="nota">${esc(d.repartidor || 'El repartidor')} ya salió. En cuanto su teléfono mande señal, aquí lo ves en el mapa.</p>`; return; }
        const km = destinoL ? distancia(d, destinoL) : null;
        const min = km != null ? Math.max(2, estimarMinutos(km, 0)) : null;
        $v.innerHTML = `<p class="llega">${min != null ? `Llega en unos <strong>${min} min</strong>` : 'Va en camino'}</p>
          <p class="nota">${esc(d.repartidor || 'Tu repartidor')} · ${km != null ? `${(km * 1.35).toFixed(1)} km aprox.` : ''} · señal ${hace(d.cuando)}</p>`;
        if(mapa){
          if(pinRep) pinRep.mover(d); else pinRep = mapa.marcador(d, { texto: '➜', clase: 'rep', titulo: d.repartidor });
          mapa.encuadrar([d, destinoL].filter(Boolean));
        }
      };
      vivo();
      const reloj = setInterval(() => { if(document.visibilityState === 'visible') vivo(); }, 20000);
      return () => { clearInterval(reloj); mapa?.destruir(); };
    },
  };
}

export const PANTALLAS = { miRuta, repartidoresVivo, seguimiento };
