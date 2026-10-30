/* EL RESERVADOR POR PASOS de las barberías medianas y la grande: servicio → barbero → día y hora → tus datos →
   listo. Cada página lo viste con sus propios colores (variables --rv-*); el comportamiento es el mismo. Un paso
   a la vez porque en el teléfono un formulario largo se abandona; y siempre se ve qué llevas escogido. */
import { fechaCorta, fechaLarga, hora12, pesos } from './agenda.js';

const CSS = `
/* los colores de fábrica van con especificidad cero: la página que lo usa pone los suyos en .rv y ganan aunque este estilo se cargue después */
:where(.rv){ --rv-fondo:#fff; --rv-tinta:#111; --rv-suave:#00000010; --rv-linea:#0000001f; --rv-acento:#C8102E; --rv-sobre:#fff; --rv-radio:12px }
.rv{ color:var(--rv-tinta); font:inherit }
.rv *{ box-sizing:border-box }
.rv-pasos{ display:flex; gap:6px; margin:0 0 16px; padding:0; list-style:none } .rv-pasos li{ flex:1; height:4px; border-radius:2px; background:var(--rv-linea) } .rv-pasos li.si{ background:var(--rv-acento) }
.rv h3{ margin:0 0 4px; font-size:22px; line-height:1.2 } .rv .rv-sub{ margin:0 0 16px; opacity:.7; font-size:14px }
.rv-lista{ display:grid; gap:8px }
.rv-op{ display:grid; grid-template-columns:auto minmax(0, 1fr) auto; gap:12px; align-items:center; width:100%; min-height:64px; padding:10px 14px; text-align:left; font:inherit; color:inherit; background:var(--rv-suave); border:1px solid var(--rv-linea); border-radius:var(--rv-radio); cursor:pointer }
.rv-op img{ width:48px; height:48px; border-radius:50%; object-fit:cover } .rv-op .rv-ic{ width:48px; height:48px; border-radius:50%; display:grid; place-items:center; background:var(--rv-linea); font-size:20px }
.rv-op b{ display:block } .rv-op small{ display:block; opacity:.7; font-size:13px } .rv-op .rv-precio{ font-weight:800; font-variant-numeric:tabular-nums }
.rv-op[aria-pressed="true"]{ border-color:var(--rv-acento); box-shadow:inset 0 0 0 1px var(--rv-acento) }
.rv-op:focus-visible, .rv button:focus-visible{ outline:3px solid var(--rv-acento); outline-offset:2px }
.rv-dias{ display:flex; gap:8px; overflow-x:auto; padding:2px 2px 6px; scrollbar-width:none } .rv-dias::-webkit-scrollbar{ display:none }
.rv-dia{ flex:0 0 62px; min-height:70px; display:grid; place-items:center; line-height:1.1; font:inherit; color:inherit; background:var(--rv-suave); border:1px solid var(--rv-linea); border-radius:var(--rv-radio); cursor:pointer }
.rv-dia small{ font-size:12px; opacity:.7; text-transform:capitalize } .rv-dia b{ font-size:22px } .rv-dia[aria-pressed="true"]{ background:var(--rv-acento); color:var(--rv-sobre); border-color:var(--rv-acento) }
.rv-horas{ display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:8px; margin-top:14px }
.rv-hora{ min-height:44px; font-weight:600; font-size:14px; line-height:1; font-family:inherit; font-family:inherit; color:inherit; background:var(--rv-suave); border:1px solid var(--rv-linea); border-radius:var(--rv-radio); cursor:pointer; font-variant-numeric:tabular-nums }
.rv-hora:disabled{ opacity:.3; text-decoration:line-through; cursor:not-allowed } .rv-hora[aria-pressed="true"]{ background:var(--rv-acento); color:var(--rv-sobre); border-color:var(--rv-acento) }
.rv label{ display:block; font-weight:700; font-size:14px; margin:14px 0 6px }
.rv input, .rv textarea{ width:100%; min-height:48px; padding:12px 14px; font-size:16px; font-family:inherit; font-family:inherit; color:inherit; background:var(--rv-suave); border:1px solid var(--rv-linea); border-radius:var(--rv-radio) }
.rv textarea{ min-height:80px; resize:vertical }
.rv-pie{ position:sticky; z-index:2; bottom:0; display:flex; gap:10px; align-items:center; margin-top:18px; padding:12px 0 calc(4px + env(safe-area-inset-bottom)); background:var(--rv-fondo) }
.rv-resumen{ flex:1; min-width:0; font-size:13px; line-height:1.3 } .rv-resumen b{ display:block; font-size:16px }
.rv-btn{ min-height:48px; padding:0 20px; border-radius:var(--rv-radio); border:0; font-weight:700; font-size:16px; line-height:1; font-family:inherit; font-family:inherit; cursor:pointer; background:var(--rv-acento); color:var(--rv-sobre); text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px }
.rv-btn.rv-claro{ background:var(--rv-suave); color:var(--rv-tinta); border:1px solid var(--rv-linea) } .rv-btn:disabled{ opacity:.4; cursor:not-allowed }
.rv-error{ color:var(--rv-acento); font-weight:600; font-size:14px; margin:10px 0 0 }
.rv-listo{ text-align:center; padding:8px 0 } .rv-listo .rv-palomita{ width:64px; height:64px; margin:0 auto 12px; border-radius:50%; display:grid; place-items:center; background:var(--rv-acento); color:var(--rv-sobre); font-size:30px }
.rv-ticket{ text-align:left; margin:16px 0; padding:16px; border:1px dashed var(--rv-linea); border-radius:var(--rv-radio); display:grid; gap:6px }
.rv-acciones{ display:grid; gap:10px }
.rv-vacio{ opacity:.7; font-size:14px; padding:12px 0 }
`;

export function montarReserva(caja, { ag, servicios, barberos, multi = false, foto = (b) => b.foto, alListo = () => {} }){
  if(!document.getElementById('rv-estilo')){ const st = document.createElement('style'); st.id = 'rv-estilo'; st.textContent = CSS; document.head.appendChild(st); }
  caja.classList.add('rv');
  const P = { servicios: [], barbero: undefined, dia: null, hora: null, nombre: '', tel: '', nota: '' };
  let paso = 0;
  const PASOS = ['servicio', 'barbero', 'cuando', 'datos'];
  const dur = () => P.servicios.reduce((a, s) => a + s.dur, 0), total = () => P.servicios.reduce((a, s) => a + s.precio, 0);
  const h = (t) => { const d = document.createElement('div'); d.innerHTML = t.trim(); return d.firstChild; };

  function resumen(){ if(!P.servicios.length) return '<span>Escoge un servicio</span>';
    const b = P.barbero ? barberos.find(x => x.id === P.barbero)?.nombre : P.barbero === null ? 'el que esté libre' : '';
    return `<b>${pesos(total())} · ${dur()} min</b><span>${P.servicios.map(s => s.nombre).join(' + ')}${b ? ' · ' + b : ''}${P.dia && P.hora !== null ? ' · ' + fechaCorta(P.dia).dia + ' ' + fechaCorta(P.dia).num + ', ' + hora12(P.hora) : ''}</span>`; }

  function pintar(){
    caja.innerHTML = ''; const pasos = h(`<ol class="rv-pasos" aria-label="Paso ${paso + 1} de 4">${PASOS.map((_, i) => `<li class="${i <= paso ? 'si' : ''}"></li>`).join('')}</ol>`); caja.appendChild(pasos);
    const cuerpo = document.createElement('div'); caja.appendChild(cuerpo);
    if(PASOS[paso] === 'servicio'){
      cuerpo.innerHTML = `<h3>${multi ? '¿Qué te hacemos?' : '¿Qué servicio quieres?'}</h3><p class="rv-sub">${multi ? 'Puedes escoger varios: se suman tiempo y precio.' : 'Precio y tiempo aproximados.'}</p><div class="rv-lista"></div>`;
      const L = cuerpo.querySelector('.rv-lista');
      for(const s of servicios){ const b = h(`<button type="button" class="rv-op" aria-pressed="${P.servicios.includes(s)}"><span class="rv-ic" aria-hidden="true">${s.icono || '✂️'}</span><span><b>${s.nombre}</b><small>${s.nota || ''} · ${s.dur} min</small></span><span class="rv-precio">${pesos(s.precio)}</span></button>`);
        b.onclick = () => { if(multi){ P.servicios = P.servicios.includes(s) ? P.servicios.filter(x => x !== s) : [...P.servicios, s]; } else { P.servicios = [s]; paso = P.barbero !== undefined ? 2 : 1; } P.hora = null; pintar(); }; L.appendChild(b); } }
    if(PASOS[paso] === 'barbero'){
      cuerpo.innerHTML = `<h3>¿Con quién?</h3><p class="rv-sub">Si te da igual, te toca el primero que esté libre.</p><div class="rv-lista"></div>`;
      const L = cuerpo.querySelector('.rv-lista');
      const ops = [{ id: null, nombre: 'El que esté libre', esp: 'Más horarios disponibles', icono: '⚡' }, ...barberos];
      for(const o of ops){ const b = h(`<button type="button" class="rv-op" aria-pressed="${P.barbero === o.id}">${o.id && foto(o) ? `<img src="${foto(o)}" alt="">` : `<span class="rv-ic" aria-hidden="true">${o.icono || '💈'}</span>`}<span><b>${o.nombre}</b><small>${o.esp || ''}</small></span><span aria-hidden="true">›</span></button>`);
        b.onclick = () => { P.barbero = o.id; P.hora = null; paso++; pintar(); }; L.appendChild(b); } }
    if(PASOS[paso] === 'cuando'){
      const dias = ag.dias(14); P.dia ||= dias[0];
      cuerpo.innerHTML = `<h3>¿Cuándo?</h3><p class="rv-sub">Las horas tachadas ya están ocupadas.</p><div class="rv-dias"></div><div class="rv-horas"></div>`;
      const D = cuerpo.querySelector('.rv-dias'), Hh = cuerpo.querySelector('.rv-horas');
      const hoy = new Date().toDateString();
      for(const d of dias){ const f = fechaCorta(d), b = h(`<button type="button" class="rv-dia" aria-pressed="${P.dia && d.toDateString() === P.dia.toDateString()}"><small>${d.toDateString() === hoy ? 'hoy' : f.dia}</small><b>${f.num}</b><small>${f.mes}</small></button>`);
        b.onclick = () => { P.dia = d; P.hora = null; pintar(); }; D.appendChild(b); }
      const l = ag.libres(P.dia, dur(), P.barbero || null);
      if(!l.some(x => x.libre)) Hh.outerHTML = '<p class="rv-vacio">Ese día ya no hay lugar. Prueba otro día o con otro barbero.</p>';
      for(const x of l){ const b = h(`<button type="button" class="rv-hora" ${x.libre ? '' : 'disabled'} aria-pressed="${P.hora === x.min}">${hora12(x.min)}</button>`);
        b.onclick = () => { P.hora = x.min; P.con = x.con; pintar(); }; Hh.appendChild?.(b); }
      requestAnimationFrame(() => cuerpo.querySelector('.rv-dia[aria-pressed="true"]')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })); }
    if(PASOS[paso] === 'datos'){
      cuerpo.innerHTML = `<h3>Tus datos</h3><p class="rv-sub">Sólo para avisarte si algo cambia.</p>
        <label for="rvNombre">Nombre</label><input id="rvNombre" autocomplete="name" value="${P.nombre.replace(/"/g, '&quot;')}">
        <label for="rvTel">WhatsApp</label><input id="rvTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="10 dígitos" value="${P.tel.replace(/"/g, '&quot;')}">
        <label for="rvNota">¿Algo que debamos saber? (opcional)</label><textarea id="rvNota" placeholder="Ej.: traigo foto del corte que quiero">${P.nota.replace(/</g, '&lt;')}</textarea><p class="rv-error" id="rvError" role="alert"></p>`;
      ['Nombre', 'Tel', 'Nota'].forEach(k => cuerpo.querySelector('#rv' + k).oninput = (e) => { P[k.toLowerCase()] = e.target.value; caja.querySelector('.rv-resumen').innerHTML = resumen(); }); }

    /* el pie: lo que llevas y el botón de seguir */
    const pie = h(`<div class="rv-pie">${paso > 0 ? '<button type="button" class="rv-btn rv-claro" data-a="atras" aria-label="Atrás">‹</button>' : ''}<div class="rv-resumen">${resumen()}</div>${paso === 1 ? '' : `<button type="button" class="rv-btn" data-a="sigue">${paso === 3 ? 'Reservar' : 'Seguir'}</button>`}</div>`);
    caja.appendChild(pie);
    pie.querySelector('[data-a="atras"]')?.addEventListener('click', () => { paso = paso === 2 && P.fijo ? 0 : paso - 1; pintar(); });
    const sigue = pie.querySelector('[data-a="sigue"]');
    if(sigue){ sigue.disabled = (paso === 0 && !P.servicios.length) || (paso === 2 && P.hora === null);
      sigue.onclick = () => { if(paso < 3){ paso = paso === 0 && P.barbero !== undefined ? 2 : paso + 1; pintar(); return; } confirmar(); }; }
    if(PASOS[paso] === 'servicio' && !multi) pie.querySelector('[data-a="sigue"]')?.remove();
  }

  function confirmar(){ const err = caja.querySelector('#rvError'), tel = P.tel.replace(/\D/g, '');
    if(!P.nombre.trim()){ err.textContent = 'Falta tu nombre.'; caja.querySelector('#rvNombre').focus(); return; }
    if(tel.length < 10){ err.textContent = 'Tu WhatsApp debe tener 10 dígitos.'; caja.querySelector('#rvTel').focus(); return; }
    const c = ag.reservar({ servicios: P.servicios, barbero: P.barbero || P.con?.[0], dia: P.dia, inicio: P.hora, nombre: P.nombre.trim(), tel, nota: P.nota.trim() });
    if(!P.barbero) c.barberoNombre = barberos.find(b => b.id === c.barbero)?.nombre || c.barberoNombre;
    listo(c); alListo(c); }

  function listo(c){ caja.innerHTML = `<div class="rv-listo"><div class="rv-palomita" aria-hidden="true">✓</div><h3>¡Tu lugar está apartado!</h3><p class="rv-sub">Mándanos el mensaje para confirmarlo.</p>
    <div class="rv-ticket"><b>${c.servicios.join(' + ')}</b><span>${fechaLarga(ag.diaDe(c))} · ${hora12(c.inicio)}</span><span>Con ${c.barberoNombre} · ${pesos(c.total)}</span></div>
    <div class="rv-acciones"><a class="rv-btn" href="${ag.whatsappDe(c)}" target="_blank" rel="noopener">Confirmar por WhatsApp</a><a class="rv-btn rv-claro" href="${ag.calendarioDe(c)}" download="cita-barberia.ics">Agregar a mi calendario</a><button type="button" class="rv-btn rv-claro" data-a="otra">Hacer otra reserva</button></div></div>`;
    caja.querySelector('[data-a="otra"]').onclick = () => { Object.assign(P, { servicios: [], barbero: undefined, dia: null, hora: null }); paso = 0; pintar(); }; }

  /* abrir con algo ya escogido (el botón «reservar» de un servicio o de un barbero) */
  function empezar({ servicio, barbero } = {}){ Object.assign(P, { servicios: servicio ? [servicio] : [], barbero: barbero === undefined ? undefined : barbero, fijo: barbero !== undefined, dia: null, hora: null });
    paso = servicio ? (barbero !== undefined ? 2 : 1) : 0; pintar(); }
  pintar();
  return { empezar };
}

/* «Mis citas»: lo que este teléfono ya reservó, con cancelar */
export function pintarMisCitas(caja, ag, alCambiar = () => {}){
  const l = ag.misCitas();
  caja.innerHTML = l.length ? l.map(c => `<div class="rv-ticket"><b>${c.servicios.join(' + ')}</b><span>${fechaLarga(ag.diaDe(c))} · ${hora12(c.inicio)} · con ${c.barberoNombre}</span><span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><a class="rv-btn rv-claro" href="${ag.calendarioDe(c)}" download="cita.ics">Calendario</a><button type="button" class="rv-btn rv-claro" data-c="${c.id}">Cancelar</button></span></div>`).join('')
    : '<p class="rv-vacio">No tienes citas próximas.</p>';
  caja.classList.add('rv');
  caja.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if(b.dataset.seguro){ const c = ag.cancelar(b.dataset.c); pintarMisCitas(caja, ag, alCambiar); alCambiar(c);
    window.open(ag.whatsappTexto(`Hola, necesito cancelar mi cita del ${fechaLarga(ag.diaDe(c))} a las ${hora12(c.inicio)}. Soy ${c.nombre}.`), '_blank'); } else { b.dataset.seguro = 1; b.textContent = '¿Seguro? Toca otra vez'; } });
}
