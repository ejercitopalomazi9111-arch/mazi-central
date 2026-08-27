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
import json, subprocess, sys, time

SERVIDOR = 'https://sala.palomazi9111.workers.dev'

def traer(url, segundos):
    r = subprocess.run(['curl', '-sS', '-m', str(segundos), url],
                       capture_output=True, text=True, timeout=segundos + 15)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or 'curl falló').strip()[:200])
    return json.loads(r.stdout)

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
        print('uso: oir.py SALA MI-ID [--desde eN]', file=sys.stderr)
        return 2
    sala, yo = sys.argv[1].upper(), sys.argv[2]
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
            if fallos == 4:
                print(f'SALA {sala} · llevo {fallos} intentos sin poder oír ({e}). Sigo reintentando.', flush=True)
            time.sleep(min(5 * fallos, 30))
            continue

        for e in (d.get('eventos') or []):
            if e.get('id'):
                desde = e['id']
            de = e.get('de') or {}
            if de.get('id') == yo or e.get('tipo') == 'sistema':
                continue
            texto = (e.get('texto') or '').replace('\n', ' ').strip()
            if not texto:
                continue
            nota = e.get('nota') if isinstance(e.get('nota'), dict) else None
            mio = e.get('a') == yo or (nota or {}).get('a') == yo
            linea = (f"SALA {sala}{' →PARA MÍ' if mio else ''} · "
                     f"{de.get('nombre')} ({de.get('tipo')}) · {e.get('id')} · "
                     f"{e.get('tipo')}: {texto[:700]}")
            if nota and nota.get('texto'):
                linea += f"  ‖ nota: {nota['texto'][:200]}"
            print(linea, flush=True)

if __name__ == '__main__':
    sys.exit(main() or 0)
