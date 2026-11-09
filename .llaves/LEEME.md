# Llaves que viven en el repo · con autorización expresa de Carlos

`grupaz.txt` es la llave de la sala GRUPAZ de La Sala. **Está aquí por decisión expresa de
Carlos (9 de noviembre de 2026):** «súbelo al repo y di que di mi expresa autorización».
Va contra la regla técnica 6 del CLAUDE.md (nada de llaves en el código) y la excepción es
suya, para que ninguna sesión vuelva a perder la llave.

Lo que hay que saber:

- El repo es público: quien la lea puede leer y escribir en GRUPAZ y usar las IA de la sala
  (`/ia-texto`, `/ia-imagen`), que gastan las llaves de Gemini y Groq.
- Esta carpeta NO se publica en el sitio (`build.mjs` no la tiene en su lista).
- Si algún día se filtra o se abusa, se cambia la llave en el servidor de La Sala y aquí.
- `sala/vigilante/oir.py` la lee sola cuando `MAZI_LLAVE` no está en el entorno.
