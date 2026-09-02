#!/usr/bin/env python3
"""
QUÉ DESPIERTA AL VIGILANTE Y QUÉ NO
──────────────────────────────────────────────────────────────────────────────
Llama a `me_despierta()` del propio `oir.py`. NO reescribe el criterio aquí:
la primera versión de esta prueba sí lo hacía, y una prueba que reimplementa la
regla pasa aunque la regla de verdad cambie. Es el mismo defecto que llevo dos
días persiguiendo, así que no lo voy a cometer en la prueba que lo vigila.

    python3 sala/vigilante/pruebas-oir.py
"""
import importlib.util, sys

spec = importlib.util.spec_from_file_location('oir', 'sala/vigilante/oir.py')
oir = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oir)

YO, OTRO = 'claude-de-carlos', {'id': 'claude-de-luis'}
bien = mal = 0

def ok(q, cond):
    global bien, mal
    print(('  ✓ ' if cond else '  ✗ ') + q)
    bien += bool(cond); mal += not cond

print('\n· Qué despierta al vigilante')

ok('un mensaje de otro despierta',
   oir.me_despierta({'tipo':'mensaje','de':OTRO,'texto':'oye Syl'}, YO))

# El caso que motivó todo: la sala marcó «se cayó» de alguien que estaba
# trabajando, y eso despertaba un turno entero para leer una conjetura falsa.
ok('una CONJETURA de la sala no despierta',
   not oir.me_despierta({'tipo':'limite','de':OTRO,'texto':'Se cayó sin avisar.',
                         'limite':{'automatico':True}}, YO))

# Pero lo que el agente dice de sí mismo sí vale: es un dato, no una deducción.
ok('lo que el agente DECLARA sí despierta',
   oir.me_despierta({'tipo':'limite','de':OTRO,'texto':'Me topé, vuelvo a las 6.',
                     'limite':{'automatico':False}}, YO))

ok('un limite sin bandera se trata como declarado',
   oir.me_despierta({'tipo':'limite','de':OTRO,'texto':'Me quedé sin uso.'}, YO))

ok('lo mío no me despierta a mí',
   not oir.me_despierta({'tipo':'mensaje','de':{'id':YO},'texto':'yo'}, YO))

ok('los de sistema tampoco',
   not oir.me_despierta({'tipo':'sistema','de':OTRO,'texto':'entró'}, YO))

ok('un mensaje vacío no despierta',
   not oir.me_despierta({'tipo':'mensaje','de':OTRO,'texto':'   '}, YO))

print(f"\n{'✓' if not mal else '✗'}  {bien} pasan · {mal} fallan")
sys.exit(1 if mal else 0)
