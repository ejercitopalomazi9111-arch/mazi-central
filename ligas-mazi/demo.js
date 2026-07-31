/* ============================================================================
   demo.js — LA LIGA DE DEMOSTRACIÓN
   ----------------------------------------------------------------------------
   Seis equipos, cuarenta y ocho jugadores, calendario completo todos contra
   todos y media temporada ya jugada. Sirve para dos cosas que hoy no se pueden
   hacer: enseñar la app sin registrar a nadie, y probar la tabla, el bracket y
   la mesa con números de verdad en vez de con pantallas vacías.

   ── LAS TRES REGLAS QUE MANDAN AQUÍ ───────────────────────────────────────

   1. **NADIE ES REAL.** Ni los equipos, ni los jugadores, ni la liga. Los
      nombres están inventados a propósito para que no se parezcan a ninguna
      liga infantil de Querétaro. Un dato de prueba que se parece a una persona
      deja de ser un dato de prueba.

   2. **NINGUNA IMAGEN CON DUEÑO.** Carlos lo pidió con todas sus letras:
      "imágenes x nada con copyright". Las fotos salen de Wikimedia Commons con
      licencia verificada (`arte/bajar.mjs`, créditos en `arte/CREDITOS.md`), y
      las cartas llevan **balones y aros — nunca caras**. Ponerle el retrato de
      una persona real a un jugador inventado es peor que no tener foto: es
      inventarle una identidad a alguien que no dio permiso.

   3. **SE VE QUE ES DEMOSTRACIÓN Y SE BORRA DE UN TOQUE.** Todo lleva
      `demo:true`. Si esto se confundiera con una liga real, el administrador
      acabaría capturando resultados encima de equipos que no existen.

   Uso: botón "Ver una liga de demostración" en Mi liga.
   ==========================================================================*/

(() => {
  'use strict';

  const EQUIPOS = [
    { nm:'Coyotes de Alameda',   ini:'CA', col:'#e8b13e', col2:'#8a5a12', emblema:'rayo'  },
    { nm:'Marea Alta',           ini:'MA', col:'#35c2cf', col2:'#0f5a63', emblema:'ola'   },
    { nm:'Cantera Negra',        ini:'CN', col:'#c7cdd8', col2:'#3a4050', emblema:'roca'  },
    { nm:'Halcones del Cerro',   ini:'HC', col:'#e94a5a', col2:'#6e1620', emblema:'ala'   },
    { nm:'Titanes de Bravo',     ini:'TB', col:'#a774f0', col2:'#452470', emblema:'torre' },
    { nm:'Venados de Juriquilla',ini:'VJ', col:'#2ecf8e', col2:'#0f5a3a', emblema:'asta'  },
  ];

  /* ── EL ARTE BAJADO ──────────────────────────────────────────────────────
     Los nombres están escritos, no adivinados: si mañana falta un archivo se
     ve en esta lista en vez de salir un hueco en la pantalla. Ojo con los
     huecos de numeración (balon-3, balon-4…): son descartes documentados en
     `arte/bajar.mjs`, no un error. */
  const ARTE = {
    balon:  ['balon/balon-1.jpg', 'balon/balon-2.png', 'balon/balon-5.jpg'],
    aro:    ['aro/aro-1.jpg', 'aro/aro-2.jpg', 'aro/aro-3.jpg', 'aro/aro-4.jpg', 'aro/aro-5.jpg'],
    lugar:  ['gradas/gradas-1.jpg', 'gradas/gradas-2.jpg', 'gradas/gradas-3.jpg',
             'gradas/gradas-4.jpg'],
    escudo: ['escudo/escudo-1.png', 'escudo/escudo-3.png', 'escudo/escudo-4.png',
             'escudo/escudo-5.png', 'escudo/escudo-6.png'],
  };
  const arte = (grupo, i) => 'arte/' + ARTE[grupo][((i % ARTE[grupo].length) + ARTE[grupo].length) % ARTE[grupo].length];

  const NOMBRES = ['Emiliano','Santiago','Mateo','Diego','Leonardo','Sebastián','Iker','Bruno',
    'Rodrigo','Ángel','Julián','Maximiliano','Alonso','Gael','Ximena','Renata','Valeria',
    'Camila','Regina','Fernanda','Andrea','Paola','Ivanna','Danna'];
  const APELLIDOS = ['Ramírez','Cervantes','Olvera','MonteAlto','Rivadeneyra','Cañedo','Bustos',
    'Zepeda','Ibarra','Quiroz','Manzanares','Treviño','Escalante','Villagrán','Ordóñez','Fonseca'];
  const POSICIONES = ['Base','Escolta','Alero','Ala-pívot','Pívot'];

  /* Generador con semilla. `Math.random` daría una liga distinta cada vez, y la
     gracia de unos datos de prueba es que son los MISMOS datos: sin eso no se
     puede reproducir un bug. */
  function dado(semilla){
    let s = semilla >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ── LOS ESCUDOS ─────────────────────────────────────────────────────────
     Se componen: silueta, color del equipo, emblema e iniciales. Un SVG de
     menos de 700 bytes que viaja DENTRO del dato del equipo, así que la liga
     de demostración no depende de ningún archivo ni de ninguna red. */
  const EMBLEMAS = {
    rayo:  'M52 22 L38 52 H50 L44 78 L64 46 H52 Z',
    ola:   'M22 62 Q34 48 46 62 T70 62 T94 62 L94 74 L22 74 Z',
    roca:  'M50 20 L76 44 L66 76 H34 L24 44 Z',
    ala:   'M20 56 Q44 30 58 52 Q70 34 84 44 Q70 62 50 66 Q34 68 20 56 Z',
    torre: 'M36 30 h8 v-8 h8 v8 h8 v-8 h8 v8 h4 v46 H32 V30 Z',
    asta:  'M50 18 L58 40 L80 40 L62 54 L70 78 L50 63 L30 78 L38 54 L20 40 L42 40 Z',
  };
  function escudo(eq){
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="'+eq.col+'"/><stop offset="1" stop-color="'+eq.col2+'"/>'
      + '</linearGradient></defs>'
      + '<path d="M50 4 L92 18 V52 Q92 82 50 96 Q8 82 8 52 V18 Z" fill="url(#g)"/>'
      + '<path d="M50 11 L86 23 V52 Q86 77 50 89 Q14 77 14 52 V23 Z" fill="#0b0d12" opacity=".82"/>'
      + '<path d="'+(EMBLEMAS[eq.emblema]||EMBLEMAS.roca)+'" fill="'+eq.col+'" opacity=".95"/>'
      + '<text x="50" y="92" text-anchor="middle" font-family="system-ui,sans-serif"'
      + ' font-weight="800" font-size="13" fill="'+eq.col+'">'+eq.ini+'</text>'
      + '</svg>';
    return aDataURI(svg);
  }

  /* El SVG va en BASE64, no percent-encoded.
     `crestStyle()` compone `background-image:url(` + logo + `)` SIN comillas, y
     ahí un data-URI con caracteres escapados se rompe: el escudo salía como una
     cajita vacía. En base64 no hay carácter que pueda romper el `url()`. */
  const aDataURI = (svg) =>
    'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

  /* Avatar de respaldo: iniciales sobre un campo de color sacado del propio
     nombre, así el mismo jugador tiene siempre el mismo. Se usa en las listas
     chicas, donde una foto de cancha no se distingue de otra. */
  function avatar(nombre, colEquipo){
    let h = 0; for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
    const ini = nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<rect width="100" height="100" fill="hsl('+(h%360)+' 42% 20%)"/>'
      + '<path d="M-20 70 L40 -10 L64 -10 L4 70 Z" fill="'+colEquipo+'" opacity=".22"/>'
      + '<path d="M36 110 L96 30 L120 30 L60 110 Z" fill="'+colEquipo+'" opacity=".14"/>'
      + '<text x="50" y="62" text-anchor="middle" font-family="system-ui,sans-serif"'
      + ' font-weight="800" font-size="38" fill="#E9E4E4">'+ini+'</text>'
      + '</svg>';
    return aDataURI(svg);
  }

  /* Todos contra todos por el método del círculo: uno queda fijo y el resto
     rota. Con seis equipos salen cinco jornadas de tres partidos. */
  function calendario(ids){
    const arr = ids.slice(); const n = arr.length, mitad = n / 2, cal = [];
    for (let r = 0; r < n - 1; r++){
      for (let i = 0; i < mitad; i++){
        const local = arr[i], visita = arr[n - 1 - i];
        if (local && visita) cal.push({ jornada:r+1, home:local, away:visita, hs:null, as:null, done:false });
      }
      arr.splice(1, 0, arr.pop());
    }
    return cal;
  }

  function armar(){
    const rnd = dado(90311);
    const equipos = EQUIPOS.map((eq, i) => {
      const usados = new Set(); const jugadores = [];
      for (let j = 0; j < 8; j++){
        let nm;
        // Sin repetir dentro del equipo: dos "Diego Ibarra" en el mismo roster
        // se leen como un bug, no como una coincidencia.
        do { nm = NOMBRES[Math.floor(rnd()*NOMBRES.length)] + ' ' +
                  APELLIDOS[Math.floor(rnd()*APELLIDOS.length)]; } while (usados.has(nm));
        usados.add(nm);
        jugadores.push({
          num: String(4 + j * 3), nm,
          pos: POSICIONES[j % POSICIONES.length],
          // La imagen de la carta: un balón o un aro de verdad, alternando.
          foto: (j % 2 === 0) ? arte('balon', i + j) : arte('aro', i + j),
          avatar: avatar(nm, eq.col),
          demo: true, resp: true,
          // SIN correo y SIN CURP a propósito: un jugador de demostración no
          // debe poder vincularse a la cuenta de nadie.
        });
      }
      return {
        id: 'demo_t' + (i+1), name: eq.nm, ini: eq.ini,
        // La app pinta los escudos con una VARIABLE de tema. Con la misma para
        // los seis salían seis escudos violetas idénticos y la tabla no se
        // leía de un vistazo.
        color: ['--papa','--publico','--coach','--liga','--jugador','--mesa'][i % 6],
        // Categoría: sin ella el calendario no puede decirle al papá cuál de
        // los partidos de la jornada es el de su hij@.
        categoria: ['mixta-7-9','mixta-10-11','mixta-12-13','var-12-13','fem-12-13','var-14-15'][i % 6],
        logo: escudo(eq),
        silueta: arte('escudo', i),   // la silueta bajada, por si se quiere componer
        banner: arte('lugar', i),     // una cancha de verdad
        tinte: eq.col,
        players: jugadores, demo: true,
      };
    });

    const cal = calendario(equipos.map(t => t.id));

    /* Media temporada jugada: tres jornadas cerradas con marcadores plausibles
       de básquet infantil. Una tabla llena es lo único que prueba que la tabla
       funciona. */
    cal.forEach((m) => {
      if (m.jornada > 3) return;
      const a = 42 + Math.floor(rnd() * 26), b = 42 + Math.floor(rnd() * 26);
      m.hs = a; m.as = (a === b) ? b + 2 : b;   // sin empates: el reglamento no los contempla
      m.done = true;
      m.fecha = new Date(Date.now() - (10 - m.jornada) * 86400000).toISOString().slice(0,10);
    });

    /* LA LIGA LLEVA SUS DOS IMÁGENES, como pidió Carlos:
         · `logo`   — el escudo, que sale en listas y directorio
         · `banner` — la foto ancha de arriba
       Son dos cosas distintas y por eso son dos campos: un escudo estirado a
       banner se ve reventado, y un banner encogido a escudo no se lee. */
    return {
      name: 'Liga Demostración Mazi', demo: true,
      logo: arte('escudo', 0),
      banner: arte('lugar', 1),
      teams: equipos, calendar: cal, admins: [], link: '',
    };
  }

  /* Pisar la liga del administrador sin avisar sería destruir su trabajo, así
     que se pregunta siempre que haya algo que perder. */
  window.cargarLigaDemo = function(){
    const actual = (typeof leagueData === 'function') ? leagueData() : null;
    const hayAlgo = actual && !actual.demo &&
                    ((actual.teams||[]).length || (actual.calendar||[]).length);
    if (hayAlgo && !confirm('Esto REEMPLAZA la liga que tienes cargada (' +
        (actual.teams||[]).length + ' equipos) por la de demostración.\n\n¿Seguro?')) return;
    const d = armar();
    if (typeof saveLeague === 'function') saveLeague(d);
    if (typeof flashSaved === 'function')
      flashSaved('Liga de demostración cargada · 6 equipos, 48 jugadores, 15 partidos');
    ['buildLigaStats','buildLeagueTeams','buildCalendar','buildTabla','buildHubHome']
      .forEach(f => { try { if (typeof window[f] === 'function') window[f](); } catch(e){} });
    try { if (typeof render === 'function' && typeof curScreen !== 'undefined') render(curScreen); } catch(e){}
  };

  window.borrarLigaDemo = function(){
    const d = (typeof leagueData === 'function') ? leagueData() : null;
    if (!d || !d.demo){ if (typeof flashSaved==='function') flashSaved('No hay liga de demostración cargada'); return; }
    try { localStorage.removeItem('lm_league'); } catch(e){}
    if (typeof flashSaved === 'function') flashSaved('Liga de demostración borrada');
    try { if (typeof render === 'function' && typeof curScreen !== 'undefined') render(curScreen); } catch(e){}
  };

  window.__ligaDemo = armar;   // para inspeccionarla sin cargarla
})();
