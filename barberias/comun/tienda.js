/* LA TIENDA DE LAS BARBERÍAS (Carlos, 5 nov: «ponles más productos, la venta de productos que puedan llegar a
   tener… que digas: quiero abrir la web para ver qué productos tienen»). La comparten las tres páginas de paga;
   cada una la viste con sus variables --ti-* y le da su propio catálogo.

     const T = montarTienda(caja, { ag, clave, productos, carroBtn, envio: 49, envioGratis: 800, aviso })
     T.abrirCarro()

   Cada producto: { id, cat, nombre, nota, precio, antes?, fotos: [...], desc, uso?, variantes?: [{ nombre, precio }],
   insignia? }. El pedido se arma aquí y sale por WhatsApp: recoger en la cita o a domicilio dentro de Querétaro. */
import { pesos } from './agenda.js';
import { ico } from './iconos.js';

const CSS = `
:where(.ti){ --ti-fondo:#fff; --ti-capa:#f4f4f4; --ti-tinta:#111; --ti-suave:#666; --ti-linea:#0000001a; --ti-acento:#111; --ti-sobre:#fff; --ti-radio:16px; --ti-titulo:inherit }
.ti{ color:var(--ti-tinta) } .ti *{ box-sizing:border-box }
.ti-chips{ display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:2px 0 4px; margin:0 0 18px; position:relative } .ti-chips::-webkit-scrollbar{ display:none }
.ti-chips button{ flex-shrink:0; min-height:42px; padding:0 18px; border-radius:999px; border:1px solid var(--ti-linea); background:transparent; color:var(--ti-tinta); font:inherit; font-size:14px; cursor:pointer; transition:background .2s, color .2s }
.ti-chips button[aria-pressed="true"]{ background:var(--ti-acento); color:var(--ti-sobre); border-color:var(--ti-acento) }
.ti-grid{ display:grid; gap:14px; grid-template-columns:repeat(2, minmax(0, 1fr)) } @media (min-width:760px){ .ti-grid{ grid-template-columns:repeat(3, minmax(0, 1fr)); gap:18px } } @media (min-width:1100px){ .ti-grid{ grid-template-columns:repeat(4, minmax(0, 1fr)) } }
.ti-card{ position:relative; display:flex; flex-direction:column; min-width:0; border-radius:var(--ti-radio); background:var(--ti-capa); overflow:hidden; cursor:pointer; text-align:left; border:1px solid var(--ti-linea); padding:0; color:inherit; font:inherit; transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s }
.ti-card:hover{ transform:translateY(-4px); box-shadow:0 22px 40px -22px #000a }
.ti-foto{ position:relative; aspect-ratio:4/5; overflow:hidden; background:#0002 }
.ti-foto img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:opacity .5s, transform 1.2s cubic-bezier(.2,.8,.2,1) }
.ti-foto img + img{ opacity:0 } .ti-card:hover .ti-foto img + img{ opacity:1 } .ti-card:hover .ti-foto img{ transform:scale(1.05) }
.ti-ins{ position:absolute; z-index:1; left:10px; top:10px; padding:5px 10px; border-radius:999px; background:var(--ti-acento); color:var(--ti-sobre); font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase }
.ti-mas{ position:absolute; z-index:1; right:10px; bottom:10px; width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:var(--ti-fondo); color:var(--ti-tinta); border:0; box-shadow:0 8px 20px -8px #000; cursor:pointer }
.ti-info{ padding:12px 14px 14px; display:grid; gap:4px }
.ti-info b{ font-family:var(--ti-titulo); font-size:17px; line-height:1.2; font-weight:600 }
.ti-info small{ color:var(--ti-suave); font-size:13px; line-height:1.35 }
.ti-precio{ display:flex; align-items:baseline; gap:8px; font-weight:800; font-variant-numeric:tabular-nums; margin-top:2px } .ti-precio s{ font-weight:500; color:var(--ti-suave); font-size:13px }
dialog.ti-hoja{ border:0; padding:0; margin:0; width:100%; height:100%; max-width:none; max-height:none; background:transparent; color:var(--ti-tinta) }
dialog.ti-hoja::backdrop{ background:#000a; -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px) }
dialog.ti-hoja[open]{ display:flex; align-items:flex-end; justify-content:center }
.ti-panel{ position:relative; width:100%; max-width:620px; max-height:94svh; overflow-y:auto; overscroll-behavior:contain; background:var(--ti-fondo); border-radius:24px 24px 0 0; padding:0 0 calc(18px + env(safe-area-inset-bottom)); animation:tiSube .35s cubic-bezier(.2,.8,.2,1) }
@media (min-width:760px){ dialog.ti-hoja[open]{ align-items:center } .ti-panel{ border-radius:24px } }
@keyframes tiSube{ from{ transform:translateY(60px); opacity:0 } }
.ti-cerrar{ position:absolute; z-index:3; right:12px; top:12px; width:44px; height:44px; border-radius:50%; border:0; display:grid; place-items:center; background:#000000a0; color:#fff; cursor:pointer }
.ti-galeria{ display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; aspect-ratio:1; background:#0002 } .ti-galeria::-webkit-scrollbar{ display:none }
.ti-galeria img{ flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:center }
.ti-puntos{ display:flex; justify-content:center; gap:6px; margin-top:-26px; position:relative; z-index:2; height:20px } .ti-puntos i{ width:7px; height:7px; border-radius:50%; background:#fff8 } .ti-puntos i.si{ background:#fff; width:18px; border-radius:4px }
.ti-cuerpo{ padding:18px 20px 0 }
.ti-cuerpo h3{ margin:0; font-family:var(--ti-titulo); font-size:28px; line-height:1.1; font-weight:600 }
.ti-cuerpo .ti-precio{ font-size:22px; margin:8px 0 14px }
.ti-cuerpo p{ margin:0 0 14px; color:var(--ti-suave); line-height:1.55 }
.ti-var{ display:flex; flex-wrap:wrap; gap:8px; margin:0 0 16px } .ti-var button{ min-height:44px; padding:0 16px; border-radius:12px; border:1px solid var(--ti-linea); background:transparent; color:inherit; font:inherit; font-size:14px; cursor:pointer }
.ti-var button[aria-pressed="true"]{ border-color:var(--ti-acento); box-shadow:inset 0 0 0 1px var(--ti-acento); font-weight:700 }
.ti-uso{ border-top:1px solid var(--ti-linea); padding:14px 0; font-size:14px; color:var(--ti-suave) } .ti-uso b{ display:flex; align-items:center; gap:8px; color:var(--ti-tinta); margin-bottom:6px; font-size:15px }
.ti-pie{ position:sticky; bottom:0; display:flex; gap:10px; align-items:center; padding:14px 20px 4px; background:linear-gradient(180deg, transparent, var(--ti-fondo) 30%) }
.ti-cant{ display:flex; align-items:center; border:1px solid var(--ti-linea); border-radius:999px } .ti-cant button{ width:44px; height:48px; border:0; background:transparent; color:inherit; cursor:pointer; display:grid; place-items:center } .ti-cant span{ min-width:22px; text-align:center; font-weight:700; font-variant-numeric:tabular-nums }
.ti-btn{ flex:1; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:52px; padding:0 22px; border-radius:999px; border:0; background:var(--ti-acento); color:var(--ti-sobre); font:inherit; font-weight:800; font-size:16px; cursor:pointer; text-decoration:none; text-align:center }
.ti-btn.ti-claro{ background:transparent; color:var(--ti-tinta); border:1px solid var(--ti-linea) }
.ti-junto{ padding:6px 20px 4px } .ti-junto h4{ margin:8px 0 10px; font-size:15px } .ti-junto div{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px }
.ti-junto button{ display:grid; grid-template-columns:52px minmax(0, 1fr); gap:10px; align-items:center; padding:8px; border-radius:12px; border:1px solid var(--ti-linea); background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer } .ti-junto img{ width:52px; height:52px; border-radius:8px; object-fit:cover } .ti-junto small{ display:block; color:var(--ti-suave) }
.ti-carro{ padding:22px 20px 0 } .ti-carro h3{ margin:0 0 16px; font-family:var(--ti-titulo); font-size:28px; font-weight:600 }
.ti-it{ display:grid; grid-template-columns:64px minmax(0, 1fr) auto; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid var(--ti-linea) } .ti-it img{ width:64px; height:64px; border-radius:12px; object-fit:cover } .ti-it small{ display:block; color:var(--ti-suave); font-size:13px }
.ti-it .ti-cant button{ width:38px; height:40px }
.ti-barra{ margin:16px 0 6px; font-size:14px } .ti-barra div{ height:6px; border-radius:3px; background:var(--ti-linea); margin-top:8px; overflow:hidden } .ti-barra i{ display:block; height:100%; background:var(--ti-acento); transition:width .5s }
.ti-entrega{ display:grid; gap:8px; margin:14px 0 } .ti-entrega label{ display:flex; gap:12px; align-items:center; padding:14px; border-radius:14px; border:1px solid var(--ti-linea); cursor:pointer } .ti-entrega label:has(input:checked){ border-color:var(--ti-acento); box-shadow:inset 0 0 0 1px var(--ti-acento) }
.ti-entrega input{ accent-color:var(--ti-acento); width:20px; height:20px } .ti-entrega small{ display:block; color:var(--ti-suave) }
.ti-total{ display:flex; justify-content:space-between; align-items:baseline; font-size:20px; margin:12px 0 4px } .ti-total b{ font-size:26px; font-variant-numeric:tabular-nums }
.ti-vacio{ text-align:center; padding:30px 0 10px; color:var(--ti-suave) }
.ti-vuela{ position:fixed; z-index:200; border-radius:12px; object-fit:cover; pointer-events:none; transition:transform .7s cubic-bezier(.5,-.2,.6,1), opacity .7s }
@keyframes tiLate{ 30%{ transform:scale(1.35) } }
.ti-late{ animation:tiLate .5s }
@media (prefers-reduced-motion:reduce){ .ti-panel{ animation:none } .ti-card, .ti-foto img{ transition:none } }
`;

export function montarTienda(caja, { ag, clave, productos, carroBtn = null, contador = null, envio = 49, envioGratis = 800, aviso = () => {}, negocio = '' }){
  if(!document.getElementById('ti-css')){ const st = document.createElement('style'); st.id = 'ti-css'; st.textContent = CSS; document.head.prepend(st); }
  const K = `barberia:${clave}:carro`;
  const leer = () => { try{ return JSON.parse(localStorage.getItem(K) || '[]'); }catch(e){ return []; } };
  let carro = leer();
  const guardar = () => { try{ localStorage.setItem(K, JSON.stringify(carro)); }catch(e){} pintarContador(); };
  const P = (id) => productos.find(p => p.id === id);
  const precioDe = (p, v) => (p.variantes && p.variantes[v] ? p.variantes[v].precio : p.precio);
  const nombreDe = (p, v) => p.nombre + (p.variantes && p.variantes[v] ? ' · ' + p.variantes[v].nombre : '');
  const cats = ['Todo', ...new Set(productos.map(p => p.cat))]; let cat = 'Todo';
  caja.classList.add('ti');
  caja.innerHTML = `<div class="ti-chips" role="group" aria-label="Categorías"></div><div class="ti-grid"></div>`;
  const chips = caja.querySelector('.ti-chips'), grid = caja.querySelector('.ti-grid');

  function pintar(){
    chips.innerHTML = cats.map(c => `<button type="button" data-cat="${c}" aria-pressed="${c === cat}">${c}</button>`).join('');
    grid.innerHTML = productos.filter(p => cat === 'Todo' || p.cat === cat).map(p => `<article class="ti-card" data-p="${p.id}" tabindex="0" role="button" aria-label="${p.nombre}, ${pesos(p.precio)}">
      <div class="ti-foto">${p.insignia ? `<span class="ti-ins">${p.insignia}</span>` : ''}<img src="${p.fotos[0]}" alt="" loading="lazy" decoding="async">${p.fotos[1] ? `<img src="${p.fotos[1]}" alt="" loading="lazy" decoding="async">` : ''}
      <button type="button" class="ti-mas" data-rapido="${p.id}" aria-label="Agregar ${p.nombre}">${ico('plus', 20)}</button></div>
      <div class="ti-info"><b>${p.nombre}</b><small>${p.nota}</small><span class="ti-precio">${p.variantes ? 'desde ' : ''}${pesos(p.precio)}${p.antes ? `<s>${pesos(p.antes)}</s>` : ''}</span></div></article>`).join('');
  }
  chips.onclick = (e) => { const b = e.target.closest('[data-cat]'); if(!b) return; cat = b.dataset.cat; pintar(); };
  grid.onclick = (e) => {
    const r = e.target.closest('[data-rapido]'); if(r){ e.stopPropagation(); const p = P(r.dataset.rapido); agregar(p, 0, 1, r.closest('.ti-card').querySelector('img')); return; }
    const c = e.target.closest('[data-p]'); if(c) ficha(P(c.dataset.p));
  };
  grid.onkeydown = (e) => { if((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-p]')){ e.preventDefault(); ficha(P(e.target.dataset.p)); } };

  /* la hoja de un producto: galería, tamaños, cantidad, cómo se usa y qué le va bien */
  const hoja = document.createElement('dialog'); hoja.className = 'ti-hoja ti'; hoja.setAttribute('aria-label', 'Producto'); document.body.appendChild(hoja);
  const hojaC = document.createElement('dialog'); hojaC.className = 'ti-hoja ti'; hojaC.setAttribute('aria-label', 'Tu pedido'); document.body.appendChild(hojaC);
  for(const d of [hoja, hojaC]) d.addEventListener('click', (e) => { if(e.target === d || e.target.closest('.ti-cerrar')) d.close(); });

  function ficha(p){
    let v = 0, n = 1;
    const junto = productos.filter(x => x.id !== p.id && (x.cat === p.cat || x.cat === 'Kits')).slice(0, 2);
    const pinta = () => {
      hoja.innerHTML = `<div class="ti-panel"><button class="ti-cerrar" aria-label="Cerrar">${ico('x', 20)}</button>
        <div class="ti-galeria">${p.fotos.map(f => `<img src="${f}" alt="${p.nombre}">`).join('')}</div>
        ${p.fotos.length > 1 ? `<div class="ti-puntos">${p.fotos.map((_, i) => `<i class="${i ? '' : 'si'}"></i>`).join('')}</div>` : ''}
        <div class="ti-cuerpo">${p.insignia ? `<span class="ti-ins" style="position:static;display:inline-block;margin-bottom:10px">${p.insignia}</span>` : ''}<h3>${p.nombre}</h3>
          <div class="ti-precio">${pesos(precioDe(p, v))}${p.antes ? `<s>${pesos(p.antes)}</s>` : ''}</div>
          ${p.variantes ? `<div class="ti-var">${p.variantes.map((x, i) => `<button type="button" data-v="${i}" aria-pressed="${i === v}">${x.nombre}</button>`).join('')}</div>` : ''}
          <p>${p.desc}</p>
          ${p.uso ? `<div class="ti-uso"><b>${ico('sparkles', 18)} Cómo se usa</b>${p.uso}</div>` : ''}
          <div class="ti-uso"><b>${ico('store', 18)} Entrega</b>Recógelo en tu cita sin costo, o te lo llevamos a domicilio en Querétaro.</div></div>
        ${junto.length ? `<div class="ti-junto"><h4>Va bien con</h4><div>${junto.map(x => `<button type="button" data-otro="${x.id}"><img src="${x.fotos[0]}" alt=""><span><b style="font-size:14px">${x.nombre}</b><small>${pesos(x.precio)}</small></span></button>`).join('')}</div></div>` : ''}
        <div class="ti-pie"><div class="ti-cant"><button type="button" data-n="-1" aria-label="Uno menos">${ico('minus', 18)}</button><span>${n}</span><button type="button" data-n="1" aria-label="Uno más">${ico('plus', 18)}</button></div>
          <button type="button" class="ti-btn" data-agregar>Agregar · ${pesos(precioDe(p, v) * n)}</button></div></div>`;
      const g = hoja.querySelector('.ti-galeria'), pts = [...hoja.querySelectorAll('.ti-puntos i')];
      if(pts.length) g.addEventListener('scroll', () => { const k = Math.round(g.scrollLeft / g.clientWidth); pts.forEach((x, i) => x.classList.toggle('si', i === k)); }, { passive: true });
    };
    hoja.onclick = (e) => {
      if(e.target === hoja || e.target.closest('.ti-cerrar')){ hoja.close(); return; }
      const bv = e.target.closest('[data-v]'); if(bv){ v = +bv.dataset.v; pinta(); return; }
      const bn = e.target.closest('[data-n]'); if(bn){ n = Math.max(1, Math.min(20, n + +bn.dataset.n)); pinta(); return; }
      const bo = e.target.closest('[data-otro]'); if(bo){ ficha(P(bo.dataset.otro)); hoja.querySelector('.ti-panel').scrollTop = 0; return; }
      if(e.target.closest('[data-agregar]')){ const img = hoja.querySelector('.ti-galeria img'); agregar(p, v, n, img); hoja.close(); }
    };
    pinta(); if(!hoja.open) hoja.showModal();
  }

  function agregar(p, v, n, img){
    const k = carro.find(x => x.id === p.id && x.v === v); if(k) k.n += n; else carro.push({ id: p.id, v, n });
    guardar(); aviso(`${nombreDe(p, v)} · en tu pedido`);
    const meta = carroBtn && carroBtn.getBoundingClientRect();
    if(img && meta && meta.width && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const r = img.getBoundingClientRect(), c = document.createElement('img'); c.src = img.currentSrc || img.src; c.className = 'ti-vuela';
      Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); document.body.appendChild(c);
      requestAnimationFrame(() => { c.style.transform = `translate(${meta.left + meta.width / 2 - r.left - r.width / 2}px, ${meta.top + meta.height / 2 - r.top - r.height / 2}px) scale(${Math.max(.08, 36 / r.width)})`; c.style.opacity = '.2'; });
      setTimeout(() => { c.remove(); carroBtn.classList.remove('ti-late'); void carroBtn.offsetWidth; carroBtn.classList.add('ti-late'); }, 720);
    }
  }

  function pintarContador(){ const n = carro.reduce((a, x) => a + x.n, 0); if(contador){ contador.textContent = n; contador.hidden = !n; } }

  let entrega = 'cita';
  function abrirCarro(){
    const pinta = () => {
      carro = carro.filter(x => P(x.id) && x.n > 0);
      const sub = carro.reduce((a, x) => a + precioDe(P(x.id), x.v) * x.n, 0), costo = entrega === 'casa' && sub < envioGratis ? envio : 0, falta = Math.max(0, envioGratis - sub);
      hojaC.innerHTML = `<div class="ti-panel"><button class="ti-cerrar" aria-label="Cerrar">${ico('x', 20)}</button><div class="ti-carro"><h3>Tu pedido</h3>
        ${!carro.length ? `<div class="ti-vacio">${ico('shopping-bag', 40)}<p>Todavía no agregas nada.<br>Lo que usamos en la silla está en la tienda.</p><button type="button" class="ti-btn ti-claro" data-ver>Ver la tienda</button></div>` : `
        ${carro.map((x, i) => { const p = P(x.id); return `<div class="ti-it"><img src="${p.fotos[0]}" alt=""><div><b>${nombreDe(p, x.v)}</b><small>${pesos(precioDe(p, x.v))} c/u</small></div>
          <div class="ti-cant"><button type="button" data-i="${i}" data-d="-1" aria-label="Uno menos">${ico(x.n === 1 ? 'trash' : 'minus', 16)}</button><span>${x.n}</span><button type="button" data-i="${i}" data-d="1" aria-label="Uno más">${ico('plus', 16)}</button></div></div>`; }).join('')}
        <div class="ti-barra">${falta ? `Te faltan <b>${pesos(falta)}</b> para el envío gratis` : `<b>Tu envío a domicilio va gratis</b>`}<div><i style="width:${Math.min(100, sub / envioGratis * 100)}%"></i></div></div>
        <div class="ti-entrega"><label><input type="radio" name="tiEnt" value="cita" ${entrega === 'cita' ? 'checked' : ''}><span><b>Lo recojo en mi cita</b><small>Te lo apartamos. Sin costo.</small></span></label>
          <label><input type="radio" name="tiEnt" value="casa" ${entrega === 'casa' ? 'checked' : ''}><span><b>A domicilio en Querétaro</b><small>${sub >= envioGratis ? 'Gratis' : pesos(envio)} · llega el mismo día o al siguiente</small></span></label></div>
        <div class="ti-total"><span>Total</span><b>${pesos(sub + costo)}</b></div>
        <p style="color:var(--ti-suave);font-size:13px;margin:0 0 14px">Se paga al recibir: efectivo, tarjeta o transferencia.</p>
        <a class="ti-btn" style="width:100%" target="_blank" rel="noopener" href="${ag.whatsappTexto(`Hola${negocio ? ', ' + negocio : ''}. Quiero pedir:\n` + carro.map(x => `- ${x.n} x ${nombreDe(P(x.id), x.v)} (${pesos(precioDe(P(x.id), x.v) * x.n)})`).join('\n') + `\nEntrega: ${entrega === 'casa' ? 'a domicilio' : 'lo recojo en mi cita'}\nTotal: ${pesos(sub + costo)}`)}">${ico('send', 18)} Pedir por WhatsApp</a>`}</div></div>`;
    };
    hojaC.onclick = (e) => {
      if(e.target === hojaC || e.target.closest('.ti-cerrar')){ hojaC.close(); return; }
      if(e.target.closest('[data-ver]')){ hojaC.close(); caja.scrollIntoView({ behavior: 'smooth' }); return; }
      const b = e.target.closest('[data-i]'); if(b){ carro[+b.dataset.i].n += +b.dataset.d; guardar(); pinta(); }
    };
    hojaC.onchange = (e) => { if(e.target.name === 'tiEnt'){ entrega = e.target.value; pinta(); } };
    pinta(); if(!hojaC.open) hojaC.showModal();
  }
  if(carroBtn) carroBtn.addEventListener('click', abrirCarro);
  pintar(); pintarContador();
  return { abrirCarro, ficha: (id) => ficha(P(id)), agregar: (id, v = 0, n = 1) => agregar(P(id), v, n) };
}
