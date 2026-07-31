/* ============================================================================
   cuentas-local.js — VARIAS CUENTAS EN EL MISMO TELÉFONO, SIN NUBE
   ----------------------------------------------------------------------------
   POR QUÉ EXISTE. La app guardaba UNA sola cuenta en el teléfono, así que en
   modo local pasaba esto:

     te registras → cierras sesión → intentas entrar → "Sin conexión a la nube
     para iniciar sesión ahora"

   O sea que **cerrar sesión te dejaba fuera de tu propia cuenta**. Y no es un
   caso raro de laboratorio: es el primer recorrido que hace cualquiera cuando
   le enseñas la app a otro, y es exactamente lo que pidió Carlos que se
   simulara ("se registren, luego cierren sesión y vuelvan a iniciar sesión").

   Tampoco se podía probar la app de verdad: la liga, el dueño de equipo, el
   jugador, el papá, la mesa y el visitante son SEIS cuentas, y el simulacro
   necesita cambiar entre ellas.

   QUÉ HACE. Un llavero en `localStorage`: correo → { contraseña, perfil }.
   Registrarse guarda una copia; iniciar sesión la recupera; cerrar sesión sólo
   suelta la sesión actual y deja el llavero intacto.

   ── LO QUE ESTO NO ES ────────────────────────────────────────────────────
   **No es seguridad.** Las contraseñas quedan en el teléfono y quien tenga el
   aparato desbloqueado las puede leer. Da exactamente la misma protección que
   tenía antes —ninguna— y se dice aquí con todas sus letras para que nadie lo
   confunda: la cuenta de verdad es la de la nube, y cuando hay nube manda ella.
   Esto es el modo sin conexión, y su trabajo es no perderte tu trabajo.
   ==========================================================================*/

(() => {
  'use strict';

  const LLAVE = 'lm_cuentas_local';

  const leer = () => { try { return JSON.parse(localStorage.getItem(LLAVE) || '{}'); } catch (e) { return {}; } };
  const escribir = (m) => { try { localStorage.setItem(LLAVE, JSON.stringify(m)); } catch (e) {} };
  const norm = (c) => String(c || '').trim().toLowerCase();

  /* Guarda (o actualiza) la cuenta con el estado que tenga AHORA. Se llama al
     registrarse y también al cerrar sesión, para que lo último que hiciste no
     se quede fuera del llavero. */
  window.guardarCuentaLocal = function(email, pass){
    const c = norm(email); if (!c) return;
    const m = leer();
    const antes = m[c] || {};
    m[c] = {
      pass: pass || antes.pass || '',
      // Se guarda una FOTO del estado, no una referencia: si se guardara la
      // referencia, entrar con otra cuenta la pisaría.
      user:  (()=>{ try { return JSON.parse(localStorage.getItem('lm_user')   || 'null'); } catch(e){ return null; } })(),
      liga:  (()=>{ try { return JSON.parse(localStorage.getItem('lm_league') || 'null'); } catch(e){ return null; } })(),
      cuando: Date.now(),
    };
    escribir(m);
  };

  window.hayCuentaLocal = function(email){ return !!leer()[norm(email)]; };

  /* Recupera la cuenta. Devuelve true si entró, false si no existe o la
     contraseña no coincide. */
  window.entrarCuentaLocal = function(email, pass){
    const c = norm(email); const m = leer(); const g = m[c];
    if (!g) return false;
    if (g.pass && pass && g.pass !== pass) return false;
    try {
      if (g.user) localStorage.setItem('lm_user', JSON.stringify(g.user));
      // La liga sólo se restaura si esta cuenta traía una: si no, se deja la
      // que haya, porque el jugador y el papá LEEN la liga del administrador.
      if (g.liga) localStorage.setItem('lm_league', JSON.stringify(g.liga));
    } catch (e) { return false; }
    return true;
  };

  window.cuentasLocales = function(){
    return Object.keys(leer()).map(c => ({ email: c, nombre: (leer()[c].user || {}).name || c }));
  };
})();
