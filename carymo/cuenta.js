/* cuenta.js — CREAR CUENTA Y ENTRAR A CARYMO, SIN LA LLAVE DE LA SALA
 * Carlos, 13 nov: «haz que el crearlo sea más fácil, que no requiera de la llave de la sala… que haya otra
 * manera de que se creen su usuario». Usuario y contraseña (la misma cuenta que la comunidad de INKWELL).
 * No hay correo: mandar correos pide un servicio de paga. Para recuperarla, al crearla se da un CÓDIGO de
 * recuperación que se enseña una sola vez.
 * Si este teléfono ya tenía la llave de La Sala (Carlos, Luis), al entrar se VINCULA: el usuario nuevo
 * sigue con su mismo avance de siempre. */
import { cuenta, guardarSesion, cerrarSesion, usuarioCuenta, tokenCuenta, llave, SERVIDOR } from '../sala/acceso.js';

/* QUÉ ESTUDIAS (Carlos, 14 nov: «que al crear tu cuenta te pida el dato de qué estás estudiando: kínder, primaria,
   secundaria…»). Decide el nivel con el que explica la IA (kids / secu / prepa / uni). */
export const ESCOLAR = [['kinder', 'Kínder'], ['primaria', 'Primaria'], ['secundaria', 'Secundaria'], ['prepa', 'Prepa'], ['uni', 'Universidad'], ['otro', 'Ya trabajo o estudio por mi cuenta']];
export const NIVEL_DE_ESCOLAR = { kinder: 'kids', primaria: 'kids', secundaria: 'secu', prepa: 'prepa', uni: 'uni', otro: 'uni' };

export function iniciarCuenta(h){
  const { hoja, cerrarHoja, esc, ico, brindis, tono, SON, $ } = h;

  async function vincular(){
    if(!llave() || !tokenCuenta()) return;
    try{ await fetch(`${SERVIDOR}/api/carymo/vincular`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-token': tokenCuenta(), 'x-llave': llave() }, body: '{}' }); }catch{}
  }

  function abrir(modo = 'crear'){
    const titulo = { crear: 'Crea tu cuenta', entrar: 'Entra a tu cuenta', recuperar: 'Recupera tu cuenta' }[modo];
    const nombre = (h.perfil().nombre && h.perfil().nombre !== 'Tú') ? h.perfil().nombre : '';
    hoja(titulo, `<form class="form-cuenta" id="fCuenta" novalidate>
      <p class="cuenta-txt">${modo === 'crear' ? 'Así se guarda tu avance en todos tus teléfonos y puedes competir con tus amigos. Es gratis.' : modo === 'entrar' ? 'Con tu usuario y tu contraseña.' : 'Con el código de recuperación que te dimos al crear tu cuenta.'}</p>
      ${modo === 'crear' ? `<label>Tu nombre<input class="campo" id="cNombre" autocomplete="given-name" value="${esc(nombre)}" placeholder="Cómo quieres que te diga" maxlength="40"></label>
      <fieldset class="escolar"><legend>¿Qué estás estudiando?</legend><div class="escolar-op">${ESCOLAR.map(([k, t]) => `<label><input type="radio" name="cEscolar" value="${k}"${(h.escolar?.() || '') === k ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>` : ''}
      <label>Usuario<input class="campo" id="cUsuario" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="sin espacios ni acentos" maxlength="20"></label>
      ${modo === 'recuperar' ? '<label>Código de recuperación<input class="campo" id="cCodigo" autocapitalize="characters" autocomplete="off" placeholder="12 letras"></label>' : ''}
      <label>${modo === 'recuperar' ? 'Contraseña nueva' : 'Contraseña'}<input class="campo" id="cClave" type="password" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}" placeholder="al menos 8 caracteres"></label>
      <p class="cuenta-error" id="cError" role="alert" hidden></p>
      <button class="bt fuerte ancho" id="cListo">${modo === 'crear' ? 'Crear mi cuenta' : modo === 'entrar' ? 'Entrar' : 'Poner contraseña nueva'}</button>
      <div class="cuenta-otras">${modo !== 'crear' ? '<button type="button" class="bt fantasma" data-modo="crear">No tengo cuenta</button>' : ''}${modo !== 'entrar' ? '<button type="button" class="bt fantasma" data-modo="entrar">Ya tengo cuenta</button>' : ''}${modo === 'entrar' ? '<button type="button" class="bt fantasma" data-modo="recuperar">Olvidé mi contraseña</button>' : ''}</div>
    </form>`, (hj) => {
      hj.addEventListener('click', (e) => { const b = e.target.closest('[data-modo]'); if(b){ e.preventDefault(); abrir(b.dataset.modo); } });
      $('#fCuenta', hj).addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuario = $('#cUsuario', hj).value.trim().toLowerCase(), clave = $('#cClave', hj).value;
        const error = (t) => { const p = $('#cError', hj); p.textContent = t; p.hidden = !t; tono(SON.mal); };
        if(!/^[a-z0-9_]{3,20}$/.test(usuario)){ error('El usuario va de 3 a 20 letras sin acentos ni espacios (puede llevar números y guion bajo).'); $('#cUsuario', hj).focus(); return; }
        if(clave.length < 8){ error('La contraseña necesita al menos 8 caracteres.'); $('#cClave', hj).focus(); return; }
        const escolar = modo === 'crear' ? hj.querySelector('[name="cEscolar"]:checked')?.value : null;
        if(modo === 'crear' && !escolar){ error('Dinos qué estás estudiando: así te explico a tu nivel.'); hj.querySelector('[name="cEscolar"]').focus(); return; }
        const b = $('#cListo', hj); b.disabled = true; b.textContent = 'Un momento…';
        try{
          let j;
          if(modo === 'crear') j = await cuenta('registro', { usuario, clave, nombre: ($('#cNombre', hj).value.trim() || usuario).slice(0, 40) });
          else if(modo === 'entrar') j = await cuenta('entrar', { usuario, clave });
          else j = await cuenta('recuperar', { usuario, clave, codigo: $('#cCodigo', hj).value });
          guardarSesion(j);
          if(escolar) h.alEscolar?.(escolar);
          await vincular();
          tono(SON.fin);
          if(j.recuperacion) mostrarCodigo(j.recuperacion, j.yo);
          else { cerrarHoja(); brindis(`¡Hola, ${j.yo ? j.yo.nombre : usuario}!`, '', 'circle-check'); }
          h.alEntrar(j.yo);
        }catch(err){ error(err.message); b.disabled = false; b.textContent = modo === 'crear' ? 'Crear mi cuenta' : modo === 'entrar' ? 'Entrar' : 'Poner contraseña nueva'; }
      });
    });
  }
  /* el código de recuperación: se enseña UNA vez */
  function mostrarCodigo(codigo, yo){
    hoja('Guarda este código', `<p class="cuenta-txt">Es la única forma de recuperar tu cuenta si se te olvida la contraseña. Tómale captura o cópialo a tus notas.</p>
      <div class="codigo-rec" id="codRec">${esc(codigo.replace(/(.{4})(?=.)/g, '$1 '))}</div>
      <button class="bt ancho" id="bCopiarRec">${ico('copy')}Copiar el código</button>
      <button class="bt fuerte ancho" id="bYaRec" style="margin-top:10px">Ya lo guardé</button>`, (hj) => {
      $('#bCopiarRec', hj).addEventListener('click', async () => { try{ await navigator.clipboard.writeText(codigo); brindis('Código copiado', '', 'copy'); }catch{ brindis('Selecciónalo y cópialo a mano', 'vino', 'copy'); } });
      $('#bYaRec', hj).addEventListener('click', () => { cerrarHoja(); brindis(`¡Bienvenido, ${yo ? yo.nombre : ''}!`, '', 'circle-check'); });
    });
  }
  async function salir(){ try{ await cuenta('salir', {}); }catch{} cerrarSesion(); h.alSalir?.(); }
  return { abrir, salir, usuario: usuarioCuenta, conCuenta: () => !!tokenCuenta() };
}
