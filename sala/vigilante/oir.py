#!/usr/bin/env python3
"""
EL VIGILANTE DE LA SALA · que un mensaje no se quede sin contestar
──────────────────────────────────────────────────────────────────────────────
Lo pidió Carlos con la queja exacta: «me fui un rato y volví, escribí, y ya no
me respondiste — eso es justo lo que no quiero que pase».

Y tenía razón, con una causa concreta: `/esperar` es una llamada colgada, así
que sólo escucha MIENTRAS el agente está dentro de un turno. En cuanto el turno
termina, la sala sigue viva y del lado del agente ya no hay nadie oyendo. El
mensaje no se pierde —queda en el hilo— pero nadie lo lee hasta que a alguien
se le ocurre asomarse. Para quien escribió, eso se siente idéntico a que lo
ignoren.

Esto tapa ese hueco: se cuelga de `/esperar` en un ciclo y escupe UNA LÍNEA por
cada mensaje que no sea mío. Cada línea despierta al agente. Cuando no hay
nada, no imprime nada — así el silencio significa silencio de verdad.

    python3 sala/vigilante/oir.py GRUPAZ claude-de-carlos [--desde e10]

⚠ POR QUÉ LLAMA A `curl` EN VEZ DE USAR `urllib`, que sería lo natural:
   en el contenedor donde corre el agente, la salida a internet pasa por un
   proxy que le contesta **403 a urllib** y deja pasar a curl. No es el
   certificado —se probó con SSL_CERT_FILE apuntando al bundle del proxy y
   sigue en 403—. Se descubrió porque el vigilante escrito con urllib se quedó
   callado doce segundos sin imprimir nada y sin quejarse: exactamente la falla
   que vino a arreglar. curl está en todos lados, así que no se pierde nada.

Sin dependencias fuera de la biblioteca estándar y curl.
"""
import json, os, subprocess, sys, time

UNA = False
SERVIDOR = os.environ.get('MAZI_SERVIDOR') or 'https://sala.palomazi9111.workers.dev'
LLAVE = os.environ.get('MAZI_LLAVE', '')


def _curl(args, segundos):
    """⚠ LA LLAVE VA POR CABECERA Y NUNCA POR LA URL. `?llave=` funciona —el
    servidor la acepta— pero acaba en el historial del shell y en cualquier
    registro del proxy, y estos repos son públicos."""
    if LLAVE:
        args = args + ['-H', f'X-Llave: {LLAVE}']
    r = subprocess.run(['curl', '-sS', '-m', str(segundos)] + args,
                       capture_output=True, text=True, timeout=segundos + 15)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or 'curl falló').strip()[:200])
    try:
        d = json.loads(r.stdout)
    except ValueError:
        raise RuntimeError(f'no contestó JSON: {r.stdout[:200]!r}')
    return d


def traer(url, segundos):
    """⚠ AQUÍ ESTABA EL BUG QUE REPORTÓ CARLOS: «no los espera pasivamente».

    Esto revisaba el código de salida de curl y nada más. Pero curl sale con 0
    cuando el servidor contesta **401**, y el cuerpo entonces es
    `{"error":"Llave que no reconozco."}` — JSON válido, sin `eventos`. El
    ciclo de abajo leía `eventos` vacío, no imprimía nada, no dormía, y volvía a
    preguntar. O sea: desde que se pusieron las LLAVES, el vigilante estaba
    haciendo un ciclo cerrado contra el servidor y desde afuera se veía IDÉNTICO
    a que no hubiera mensajes. El silencio significaba «no hay nada» y en
    realidad significaba «no me dejan pasar».

    Por eso un `error` en el cuerpo revienta igual que un fallo de red: la única
    forma de que el silencio siga significando silencio es que todo lo demás
    haga ruido."""
    d = _curl([url], segundos)
    if isinstance(d, dict) and d.get('error'):
        raise RuntimeError(d['error'])
    return d


def avisar_que_contesto(sala, yo):
    """«Está escribiendo…» en la mesa, desde que recojo el mensaje.

    Recoger un mensaje ES comprometerse a contestarlo, y contestar me toma
    minutos. Sin esto, quien escribió ve la sala igual de quieta que si nadie lo
    hubiera oído — que es la otra mitad de la queja de Carlos. Si falla, se
    calla: no poder avisar no es razón para no leer el mensaje."""
    try:
        _curl([f'{SERVIDOR}/api/sala/{sala}/escribiendo',
               '-X', 'POST', '-H', 'content-type: application/json',
               '-d', json.dumps({'de': yo, 'si': True})], 20)
    except Exception:
        pass

def me_despierta(e, yo):
    """¿Este evento merece despertarme? Es una FUNCIÓN y no cuatro `continue`
    sueltos dentro del ciclo a propósito: así la prueba puede llamar a ESTO y
    no a una copia del criterio escrita en otro archivo. Una prueba que
    reimplementa la regla pasa aunque la regla de verdad cambie — que es
    exactamente el defecto que llevo dos días persiguiendo."""
    de = e.get('de') or {}
    if de.get('id') == yo or e.get('tipo') == 'sistema':
        return False

    # ── LO QUE DEDUJO LA SALA NO ES UN MENSAJE ────────────────────────────
    # Un evento `limite` con `automatico` puesto no lo escribió nadie: lo
    # supuso el servidor porque alguien lleva rato sin dar señales.
    # Despertarme por eso cuesta un turno entero para leer una conjetura sobre
    # un tercero, y encima suele ser falsa — a mí me marcó «se cayó» dos veces
    # mientras trabajaba, y al otro agente una.
    #
    # Lo que un agente DECLARA sí pasa: «me topé, vuelvo a tal hora» es
    # información que él da de sí mismo. La diferencia está en la bandera, no
    # en el tipo.
    lim = e.get('limite') if isinstance(e.get('limite'), dict) else None
    if e.get('tipo') == 'limite' and lim and lim.get('automatico'):
        return False

    return bool((e.get('texto') or '').strip())


def ultimo_id(sala):
    """De dónde arrancar si nadie lo dijo: el final del hilo, para no volver a
    escupir como nuevo todo lo que ya se dijo."""
    try:
        h = traer(f'{SERVIDOR}/api/sala/{sala}/hilo', 30).get('hilo') or []
        return h[-1].get('id', '') if h else ''
    except Exception:
        return ''

def main():
    if len(sys.argv) < 3:
        print('uso: oir.py SALA MI-ID [--desde eN] [--una]', file=sys.stderr)
        return 2
    sala, yo = sys.argv[1].upper(), sys.argv[2]
    global UNA
    UNA = '--una' in sys.argv
    desde = ''
    if '--desde' in sys.argv:
        desde = sys.argv[sys.argv.index('--desde') + 1]
    if not desde:
        desde = ultimo_id(sala)

    fallos = 0
    while True:
        try:
            d = traer(f'{SERVIDOR}/api/sala/{sala}/esperar?de={yo}&desde={desde}', 75)
            fallos = 0
        except Exception as e:
            fallos += 1
            # Se avisa UNA vez, cuando la racha ya no parece un tropezón. Callarse
            # del todo sería lo peor: aquí el silencio ya significa «no hay nada».
            # Se avisa al PRIMER fallo y luego cada cuatro. Antes avisaba sólo
            # al cuarto, y con una llave mala eso son tres intentos —hasta un
            # minuto— en los que el vigilante se ve igual que uno sano.
            if fallos == 1 or fallos % 4 == 0:
                print(f'SALA {sala} · no puedo oír ({e}). Van {fallos}; sigo reintentando.', flush=True)
            time.sleep(min(5 * fallos, 30))
            continue

        for e in (d.get('eventos') or []):
            if e.get('id'):
                desde = e['id']
            de = e.get('de') or {}
            if not me_despierta(e, yo):
                continue
            texto = (e.get('texto') or '').replace('\n', ' ').strip()
            nota = e.get('nota') if isinstance(e.get('nota'), dict) else None
            mio = e.get('a') == yo or (nota or {}).get('a') == yo
            linea = (f"SALA {sala}{' →PARA MÍ' if mio else ''} · "
                     f"{de.get('nombre')} ({de.get('tipo')}) · {e.get('id')} · "
                     f"{e.get('tipo')}: {texto[:700]}")
            if nota and nota.get('texto'):
                linea += f"  ‖ nota: {nota['texto'][:200]}"
            print(linea, flush=True)
            avisar_que_contesto(sala, yo)
            # ── EL TIMBRE ────────────────────────────────────────────────
            # Con `--una` el vigilante SE MUERE al entregar el primer
            # mensaje, y eso es a propósito: el arnés que me corre me
            # despierta cuando un proceso de fondo TERMINA, no cuando
            # imprime. Un ciclo eterno en segundo plano nunca me avisa de
            # nada — se queda oyendo para él solo. Salir es el timbre.
            #
            # Es la diferencia entre un reloj y un timbre: revisar cada hora
            # deja al otro esperando hasta 59 minutos y ya nos pasó que se
            # perdieran mensajes por eso. Esto llega en el segundo.
            if UNA:
                return 0

if __name__ == '__main__':
    sys.exit(main() or 0)
