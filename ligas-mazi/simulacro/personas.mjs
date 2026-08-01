/* ============================================================================
   personas.mjs — LA GENTE DEL SIMULACRO
   ----------------------------------------------------------------------------
   Cerca de ochenta personas con nombre, rol, temperamento y CURP válido. No son
   "usuarios de prueba": son gente, y cada una toma decisiones que una persona
   tomaría — incluida la de enojarse.

   ── LA TERQUEDAD, Y POR QUÉ IMPORTA ──────────────────────────────────────
   Carlos corrigió algo que yo tenía mal: *"no hagas que abandonen taaan rápido
   porque puedes matar mucho diseño que ya tenemos y requeriría de más pruebas;
   la gente suele ser terca con lograr las cosas."*

   Tiene razón y cambia el modelo entero. Si la persona simulada se rinde al
   primer tropiezo, el simulacro nunca llega al segundo paso y el reporte dice
   "pantalla rota" cuando en realidad decía "pantalla confusa". Son cosas
   distintas y se arreglan distinto.

   Así que aquí nadie abandona a la primera. Cada quien insiste según su
   `terquedad`, y **cada intento fallido se anota como FRICCIÓN**. La fricción
   es el entregable: dice dónde la app se deja usar pero cuesta. Un abandono
   sólo ocurre cuando se acaba la terquedad, y eso ya es un hallazgo grave.

   ── LOS CURP ─────────────────────────────────────────────────────────────
   SINTÉTICOS, con dígito verificador calculado igual que el oficial, así que
   pasan la validación de la app. Carlos ofreció el CURP real de un menor que
   conoce; no se usa. Estos repos son públicos y con escaneo, y publicar el
   identificador oficial de un menor —con su fecha de nacimiento, su sexo y su
   estado— es irreversible. Lo que se toma de su ejemplo es la ESTRUCTURA, que
   es para lo que servía.
   ==========================================================================*/

/* ── CURP sintético ─────────────────────────────────────────────────────────
   Formato: AAAA + AAMMDD + H/M + EE + CCC + 0 + dígito.
   El último carácter es el verificador, y se calcula con el mismo algoritmo
   oficial: cada posición vale su índice en el alfabeto, se pondera por su
   lugar y se cierra a módulo 10. Sin esto la app los rechaza, y con razón. */
const ALFA = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

function digitoVerificador(c18){
  let suma = 0;
  for (let i = 0; i < 17; i++){
    const v = ALFA.indexOf(c18.charAt(i));
    suma += (v < 0 ? 0 : v) * (18 - i);
  }
  const d = 10 - (suma % 10);
  return String(d === 10 ? 0 : d);
}

const CONSONANTES = 'BCDFGHJKLMNPQRSTVWXYZ';
const ESTADOS = ['NL','QT','DF','JC','MC','GT','SP','VZ'];

/* Un CURP creíble a partir del nombre, el apellido, la fecha y el sexo.
   No pretende ser el CURP que le tocaría a esa persona en la vida real —
   pretende tener la forma correcta y pasar la validación. */
export function curpSintetico({ nombre, apellido, nacimiento, sexo, i = 0 }){
  const limpia = (s) => (s || 'X').toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
  const ap = limpia(apellido), nm = limpia(nombre);
  const vocal = (ap.slice(1).match(/[AEIOU]/) || ['X'])[0];
  const cons  = (s) => (s.slice(1).split('').find(ch => CONSONANTES.includes(ch)) || 'X');

  const [a, m, d] = nacimiento.split('-');
  const base =
      ap.charAt(0) + vocal + (ap.charAt(1) || 'X') + (nm.charAt(0) || 'X')
    + a.slice(2) + m + d
    + (sexo === 'F' ? 'M' : 'H')
    + ESTADOS[i % ESTADOS.length]
    + cons(ap) + cons(ap) + cons(nm)
    + '0';                        // homoclave: 0 para nacidos antes del 2000, A después
  const c17 = base.slice(0, 17).padEnd(17, 'X');
  return c17 + digitoVerificador(c17);
}

/* ── Los temperamentos ──────────────────────────────────────────────────────
   `terquedad` = cuántas veces vuelve a intentar antes de rendirse.
   `paciencia` = cuántos segundos aguanta buscando un control antes de que eso
                 cuente como fricción.
   `lee`       = si lee los textos de ayuda o los salta (la mayoría los salta). */
export const TEMPERAMENTOS = {
  decidido:  { terquedad: 6, paciencia: 8,  lee: true,  nota: 'Va directo, lee lo que hace falta' },
  normal:    { terquedad: 4, paciencia: 6,  lee: false, nota: 'Ni lee ni se rinde; prueba hasta que sale' },
  apurado:   { terquedad: 3, paciencia: 4,  lee: false, nota: 'Con prisa, se salta todo' },
  batallon:  { terquedad: 8, paciencia: 12, lee: false, nota: 'No se rinde ni aunque la app le pelee' },
  novato:    { terquedad: 5, paciencia: 14, lee: true,  nota: 'Primera vez con una app así; lee todo y aun así se pierde' },
};

/* ── Las categorías del torneo, tal como las dictó Carlos ──────────────────── */
export const CATEGORIAS = [
  { id:'mixta-7-9',    rama:'mixta',   min:7,  max:9,  equipos:6 },
  { id:'mixta-10-11',  rama:'mixta',   min:10, max:11, equipos:6 },
  { id:'mixta-12-13',  rama:'mixta',   min:12, max:13, equipos:6 },
  { id:'var-12-13',    rama:'varonil', min:12, max:13, equipos:8 },
  { id:'var-14-15',    rama:'varonil', min:14, max:15, equipos:6 },
  { id:'var-16-17',    rama:'varonil', min:16, max:17, equipos:6 },
  { id:'fem-12-13',    rama:'femenil', min:12, max:13, equipos:6 },
  { id:'fem-14-15',    rama:'femenil', min:14, max:15, equipos:6 },
  { id:'fem-16-17',    rama:'femenil', min:16, max:17, equipos:6 },
];

const NOMBRES_H = ['Emiliano','Santiago','Mateo','Diego','Leonardo','Sebastián','Iker','Bruno',
  'Rodrigo','Ángel','Julián','Maximiliano','Alonso','Gael','Tadeo','Bruno','Damián','Elías'];
const NOMBRES_M = ['Ximena','Renata','Valeria','Camila','Regina','Fernanda','Andrea','Paola',
  'Ivanna','Danna','Romina','Alexa','Zoe','Jimena','Aitana','Mariana'];
const APELLIDOS = ['Ramírez','Cervantes','Olvera','Rivadeneyra','Cañedo','Bustos','Zepeda',
  'Ibarra','Quiroz','Manzanares','Treviño','Escalante','Villagrán','Ordóñez','Fonseca','Alcalá',
  'Peñaloza','Berrones','Cisneros','Gaytán'];

/* Semilla fija: el mismo simulacro produce la misma gente. Sin eso, un fallo no
   se puede volver a reproducir y el reporte no sirve para arreglar nada. */
function dado(semilla){
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

let _n = 0;
const correo = (base) => base.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9]/g,'.').replace(/\.+/g,'.').replace(/^\.|\.$/g,'')
  + (++_n) + '@prueba.mazi.test';

/* ── El reparto ─────────────────────────────────────────────────────────────
   Se arma una vez y se reutiliza entre pasadas: Carlos pidió que en la segunda
   pasada la mayoría de la gente sea LA MISMA y sólo cambie lo de la liga. Por
   eso las personas viven aquí y no dentro del guion de una pasada. */
export function armarReparto({ semilla = 9111, categorias = CATEGORIAS } = {}){
  const rnd = dado(semilla);
  const elige = (a) => a[Math.floor(rnd() * a.length)];
  const temp = () => elige(['decidido','normal','normal','apurado','batallon','novato']);
  _n = 0;

  const personas = [];
  const añoBase = new Date().getFullYear();

  const nueva = (p) => { personas.push(p); return p; };

  // 1 · Quien organiza la liga.
  const admin = nueva({
    id:'liga-1', rol:'liga', nombre:'Rubén Alcalá', temperamento:'decidido',
    email: correo('ruben.alcala'), pass:'liga1234',
  });

  // 2 · Los equipos, con su dueño y su coach. El dueño y el coach pueden ser la
  //     misma persona: en las ligas infantiles casi siempre lo son.
  const equipos = [];
  categorias.forEach((cat, ci) => {
    for (let e = 0; e < cat.equipos; e++){
      const apeq = elige(APELLIDOS);
      const nombreEq = ['Coyotes','Marea','Cantera','Halcones','Titanes','Venados','Lobos','Águilas'][e]
        + ' ' + ['de Alameda','Alta','Negra','del Cerro','de Bravo','de Juriquilla','del Norte','del Río'][e];

      const dueñoEsCoach = rnd() < 0.6;
      const dueño = nueva({
        id:`dueno-${cat.id}-${e}`, rol:'coach', nombre:`${elige(NOMBRES_H)} ${apeq}`,
        temperamento: temp(), email: correo('dueno.'+apeq), pass:'equipo1234',
        equipo: `${cat.id}-${e}`,
      });
      const coach = dueñoEsCoach ? dueño : nueva({
        id:`coach-${cat.id}-${e}`, rol:'coach', nombre:`${elige(NOMBRES_H)} ${elige(APELLIDOS)}`,
        temperamento: temp(), email: correo('coach'), pass:'coach1234',
        equipo: `${cat.id}-${e}`,
      });

      equipos.push({
        id:`${cat.id}-${e}`, categoria: cat.id, nombre: nombreEq,
        dueño: dueño.id, coach: coach.id, jugadores: [],
        // "Primera vez" es del EQUIPO, no de la app: se mide contra su historia
        // COMPLETA, no contra la liga en curso. Carlos lo corrigió expresamente.
        historial: { ligas: 0, partidos: 0 },
      });
    }
  });

  // 3 · Los jugadores y sus papás. Algunos papás traen varios hijos, y no todos
  //     los hijos van al mismo equipo — que es lo que pasa en la vida real y lo
  //     que rompe las apps que suponen un hijo por cuenta.
  const papas = [];
  equipos.forEach((eq) => {
    const cat = categorias.find(c => c.id === eq.categoria);
    const cuantos = 6 + Math.floor(rnd() * 3);           // 6 a 8 por equipo
    for (let j = 0; j < cuantos; j++){
      const sexo = cat.rama === 'femenil' ? 'F' : (cat.rama === 'varonil' ? 'M'
                    : (rnd() < 0.5 ? 'F' : 'M'));
      const nombre = sexo === 'F' ? elige(NOMBRES_M) : elige(NOMBRES_H);
      const apellido = elige(APELLIDOS);
      const edad = cat.min + Math.floor(rnd() * (cat.max - cat.min + 1));
      const nac = `${añoBase - edad}-0${1 + Math.floor(rnd()*9)}-1${Math.floor(rnd()*9)}`;

      /* ¿Se registra el niño o lo registra el papá?
         Carlos: "algunos niños son más independientes o sus papás
         irresponsables". A los de 7 a 11 los mete el papá casi siempre; de 14
         para arriba, casi siempre se meten solos. En medio, está repartido. */
      const seRegistraSolo = edad >= 14 ? rnd() < 0.85 : (edad >= 12 ? rnd() < 0.5 : rnd() < 0.1);

      const jugador = nueva({
        id:`jug-${eq.id}-${j}`, rol:'jugador', nombre:`${nombre} ${apellido}`,
        temperamento: temp(), email: correo(nombre+'.'+apellido), pass:'jugador1234',
        equipo: eq.id, edad, sexo, nacimiento: nac,
        curp: curpSintetico({ nombre, apellido, nacimiento: nac, sexo, i: personas.length }),
        seRegistraSolo,
      });
      eq.jugadores.push(jugador.id);

      if (!seRegistraSolo){
        // ¿Ya existe un papá con cupo? Así salen los papás con varios hijos.
        const conCupo = papas.filter(p => p.hijos.length < 3 && rnd() < 0.35);
        const papa = conCupo.length ? elige(conCupo) : nueva({
          id:`papa-${personas.length}`, rol:'papa',
          nombre:`${elige(rnd()<0.5?NOMBRES_M:NOMBRES_H)} ${apellido}`,
          temperamento: temp(), email: correo('papa.'+apellido), pass:'papa1234',
          hijos: [],
        });
        if (!papa.hijos) papa.hijos = [];
        papa.hijos.push(jugador.id);
        jugador.papa = papa.id;
        if (!papas.includes(papa)) papas.push(papa);
      }
    }
  });

  // 4 · La mesa. Gente de la liga que anota los partidos.
  for (let i = 0; i < 4; i++){
    nueva({ id:`mesa-${i}`, rol:'mesa', nombre:`${elige(NOMBRES_H)} ${elige(APELLIDOS)}`,
      temperamento: temp(), email: correo('mesa'), pass:'mesa1234' });
  }

  // 5 · Los visitantes. Llegan por anuncio o por redes, no conocen a nadie, y
  //     son los que más rápido se aburren — así que son los que más dicen si la
  //     app entretiene o no.
  for (let i = 0; i < 10; i++){
    nueva({ id:`visita-${i}`, rol:'publico', nombre:`${elige(rnd()<0.5?NOMBRES_M:NOMBRES_H)} ${elige(APELLIDOS)}`,
      temperamento: temp(), email: correo('visita'), pass:'visita1234',
      llegaPor: elige(['anuncio','instagram','whatsapp','un amigo']) });
  }

  return { personas, equipos, papas, categorias, admin };
}

/* ── El rol todos contra todos, con el formato que dictó Carlos ─────────────
   Una jornada por semana, un partido por equipo por jornada. Método del
   círculo: el primero se queda fijo y el resto rota. */
export function jornadas(ids){
  const arr = ids.slice();
  if (arr.length % 2) arr.push(null);                   // descansa uno
  const n = arr.length, mitad = n / 2, out = [];
  for (let r = 0; r < n - 1; r++){
    const j = [];
    for (let i = 0; i < mitad; i++){
      const local = arr[i], visita = arr[n - 1 - i];
      if (local && visita) j.push({ local, visita });
    }
    out.push(j);
    arr.splice(1, 0, arr.pop());
  }
  return out;
}
