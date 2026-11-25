/* aperturas.mjs — arma carymo/juegos/aperturas.json desde el libro de Lichess (lichess-org/chess-openings, CC0).
 * node carymo/juegos/receta/aperturas.mjs CARPETA_CON_a.tsv…e.tsv
 * Cada renglón queda como [ECO, nombre en español, «e2e4 e7e5 …»]. Sólo se traduce la familia («Sicilian Defense» →
 * «Defensa Siciliana»); las variantes llevan nombre propio y se dejan como en los libros. */
import { readFileSync, writeFileSync } from 'node:fs';
import { pgnAUci } from '../notacion.js';

const FAMILIA = {
  'Sicilian Defense': 'Defensa Siciliana', 'Ruy Lopez': 'Apertura Española', 'French Defense': 'Defensa Francesa',
  "Queen's Gambit Declined": 'Gambito de Dama rehusado', 'Italian Game': 'Apertura Italiana', 'English Opening': 'Apertura Inglesa',
  "King's Gambit Accepted": 'Gambito de Rey aceptado', "King's Gambit Declined": 'Gambito de Rey rehusado', "King's Gambit": 'Gambito de Rey',
  "King's Indian Defense": 'Defensa India de Rey', 'Caro-Kann Defense': 'Defensa Caro-Kann', 'Nimzo-Indian Defense': 'Defensa Nimzoindia',
  "Queen's Pawn Game": 'Peón de Dama', 'Semi-Slav Defense': 'Defensa Semieslava', 'Dutch Defense': 'Defensa Holandesa',
  'Benoni Defense': 'Defensa Benoni', "Queen's Gambit Accepted": 'Gambito de Dama aceptado', 'Grünfeld Defense': 'Defensa Grünfeld',
  "Queen's Indian Defense": 'Defensa India de Dama', 'Alekhine Defense': 'Defensa Alekhine', 'Scotch Game': 'Apertura Escocesa',
  'Indian Defense': 'Defensa India', 'Slav Defense': 'Defensa Eslava', "Petrov's Defense": 'Defensa Petrov',
  'Four Knights Game': 'Cuatro Caballos', 'Zukertort Opening': 'Apertura Zukertort', 'Scandinavian Defense': 'Defensa Escandinava',
  'Philidor Defense': 'Defensa Philidor', 'Réti Opening': 'Apertura Réti', 'Nimzowitsch Defense': 'Defensa Nimzowitsch',
  'Vienna Game': 'Apertura Vienesa', "Bishop's Opening": 'Apertura de Alfil', 'Modern Defense': 'Defensa Moderna',
  "King's Pawn Game": 'Peón de Rey', 'Catalan Opening': 'Apertura Catalana', 'Pirc Defense': 'Defensa Pirc', 'Bird Opening': 'Apertura Bird',
  'Tarrasch Defense': 'Defensa Tarrasch', 'Polish Opening': 'Apertura Polaca', 'Neo-Grünfeld Defense': 'Defensa Neo-Grünfeld',
  'Bogo-Indian Defense': 'Defensa Bogoindia', "King's Indian Attack": 'Ataque Indio de Rey', 'Hungarian Opening': 'Apertura Húngara',
  'Center Game': 'Apertura del Centro', 'Latvian Gambit': 'Gambito Letón', 'Latvian Gambit Accepted': 'Gambito Letón aceptado',
  'Ponziani Opening': 'Apertura Ponziani', 'Old Indian Defense': 'Defensa India Antigua', 'Trompowsky Attack': 'Ataque Trompowsky',
  'Benko Gambit': 'Gambito Benko', 'Benko Gambit Accepted': 'Gambito Benko aceptado', 'Benko Gambit Declined': 'Gambito Benko rehusado',
  'Englund Gambit': 'Gambito Englund', 'Torre Attack': 'Ataque Torre', 'Three Knights Opening': 'Tres Caballos',
  'Danish Gambit': 'Gambito Danés', 'Danish Gambit Accepted': 'Gambito Danés aceptado', 'London System': 'Sistema Londres',
  'Elephant Gambit': 'Gambito Elefante', 'Colle System': 'Sistema Colle', 'Portuguese Opening': 'Apertura Portuguesa',
  "King's Pawn Opening": 'Apertura de Peón de Rey', "King's Knight Opening": 'Apertura de Caballo de Rey', 'Mexican Defense': 'Defensa Mexicana',
  'Hippopotamus Defense': 'Defensa Hipopótamo', 'English Defense': 'Defensa Inglesa', "Queen's Gambit": 'Gambito de Dama',
  'Evans Gambit': 'Gambito Evans', 'Two Knights Defense': 'Defensa de los Dos Caballos', 'Owen Defense': 'Defensa Owen',
  'Blackmar-Diemer Gambit': 'Gambito Blackmar-Diemer', 'Blackmar-Diemer Gambit Accepted': 'Gambito Blackmar-Diemer aceptado',
  'Blackmar-Diemer Gambit Declined': 'Gambito Blackmar-Diemer rehusado', 'Richter-Veresov Attack': 'Ataque Richter-Veresov',
};
/* lo que no está en la lista: «Amar Opening» → «Apertura Amar», «Paris Gambit» → «Gambito Paris», «Variation» → «variante» */
const VOLTEA = [[/^(.+) Opening$/, 'Apertura $1'], [/^(.+) Defense$/, 'Defensa $1'], [/^(.+) Gambit$/, 'Gambito $1'], [/^(.+) Attack$/, 'Ataque $1'], [/^(.+) Game$/, 'Partida $1'], [/^(.+) System$/, 'Sistema $1'], [/^(.+) Countergambit$/, 'Contragambito $1']];
const espanol = (t) => { for(const [r, x] of VOLTEA) if(r.test(t)) return t.replace(r, x); return t; };
const variante = (t) => t.split(',').map((x) => x.trim().replace(/ Variation$/, '').replace(/ Line$/, '').replace(/ Accepted$/, ' aceptado').replace(/ Declined$/, ' rehusado')).map(espanol).join(', ');
const carpeta = process.argv[2] || '/tmp/claude-0/aperturas';
const out = []; let malas = 0;
for(const l of 'abcde'){
  for(const r of readFileSync(`${carpeta}/${l}.tsv`, 'utf8').split('\n').slice(1)){
    if(!r.trim()) continue;
    const [eco, nombre, pgn] = r.split('\t');
    const uci = pgnAUci(pgn); if(!uci){ malas++; continue; }
    const [fam, ...resto] = nombre.split(':');
    const familia = FAMILIA[fam.trim()] || espanol(fam.trim());
    out.push([eco, [familia, ...resto.map(variante)].filter(Boolean).join(': '), uci.join(' ')]);
  }
}
writeFileSync(new URL('../aperturas.json', import.meta.url), JSON.stringify(out));
console.log(out.length, 'aperturas', malas, 'que no se pudieron leer');
